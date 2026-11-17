import { useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { buildBuyTx, buildSellTx, getCoinsInfo } from "@/lib/pump.functions";
import { AUTO_BUMP, addSpent, budgetLeftUsd, bumpCostSol, getBumpWallet, loadSpent, resetSpent, shouldBump } from "@/lib/autobump";

const decode = (b64: string) => VersionedTransaction.deserialize(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

export function AutoBump({ mint }: { mint: string }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [on, setOn] = useState(false);
  const [budget, setBudget] = useState(AUTO_BUMP.defaultBudgetUsd);
  const [spent, setSpent] = useState(0);
  const [log, setLog] = useState("");
  const [wallet, setWallet] = useState<ReturnType<typeof getBumpWallet> | null>(null);
  const running = useRef(false);

  useEffect(() => { setWallet(getBumpWallet()); setSpent(loadSpent(mint)); }, [mint]);

  const solUsd = useQuery({
    queryKey: ["sol-usd"], refetchInterval: 60000,
    queryFn: async () => (await (await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd")).json()).solana.usd as number,
  });
  const bal = useQuery({
    queryKey: ["bump-wallet-bal", wallet?.publicKey.toBase58()], enabled: !!wallet, refetchInterval: 15000,
    queryFn: async () => (await connection.getBalance(wallet!.publicKey)) / LAMPORTS_PER_SOL,
  });

  useEffect(() => {
    if (!on || !wallet) return;
    const tick = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const price = solUsd.data ?? 0;
        const info = (await getCoinsInfo({ data: { mints: [mint] } }))[mint];
        if (!info) return;
        const now = Date.now();
        if (budgetLeftUsd(loadSpent(mint), price, budget) < bumpCostSol() * price) { setOn(false); setLog("Orçamento esgotado. Bump parado."); return; }
        if (!shouldBump({ lastTradeMs: info.lastTradeMs, nowMs: now, spentSol: loadSpent(mint), solUsd: price, budgetUsd: budget, complete: info.complete })) {
          setLog(`Moeda ativa · próxima checagem em ${AUTO_BUMP.checkMs / 1000}s`); return;
        }
        if ((bal.data ?? 0) < bumpCostSol() + 0.003) { setOn(false); setLog("Carteira de bump sem saldo. Deposite e ative de novo."); return; }
        const { tx } = await buildBuyTx({ data: { publicKey: wallet.publicKey.toBase58(), mint, solAmount: AUTO_BUMP.solPerBump, priorityFee: AUTO_BUMP.feeSol, slippage: 25 } });
        const t = decode(tx); t.sign([wallet]);
        const sig = await connection.sendRawTransaction(t.serialize());
        setSpent(addSpent(mint, bumpCostSol()));
        setLog(`Bump enviado · ${sig.slice(0, 8)}…`);
        bal.refetch();
      } catch (e: any) { setLog(`Falha: ${e?.message || e}`); } finally { running.current = false; }
    };
    tick();
    const id = setInterval(tick, AUTO_BUMP.checkMs);
    return () => clearInterval(id);
  }, [on, wallet, mint, budget, solUsd.data, bal.data]);

  const fund = async (sol: number) => {
    if (!publicKey || !wallet) return;
    try {
      const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: wallet.publicKey, lamports: Math.round(sol * LAMPORTS_PER_SOL) }));
      const sig = await sendTransaction(tx, connection);
      setLog(`Depósito enviado · ${sig.slice(0, 8)}…`); setTimeout(() => bal.refetch(), 3000);
    } catch (e: any) { setLog(`Falha: ${e?.message || e}`); }
  };
  const recover = async () => {
    if (!publicKey || !wallet) return;
    setOn(false);
    try {
      try {
        const { tx } = await buildSellTx({ data: { publicKey: wallet.publicKey.toBase58(), mint, percent: 100, priorityFee: AUTO_BUMP.feeSol, slippage: 25 } });
        const t = decode(tx); t.sign([wallet]); await connection.sendRawTransaction(t.serialize());
        await new Promise((r) => setTimeout(r, 4000));
      } catch { /* no tokens */ }
      const lamports = await connection.getBalance(wallet.publicKey) - 5000;
      if (lamports > 0) {
        const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: publicKey, lamports }));
        const sig = await connection.sendTransaction(tx, [wallet]);
        setLog(`SOL devolvido · ${sig.slice(0, 8)}…`);
      } else setLog("Tokens vendidos.");
      setTimeout(() => bal.refetch(), 3000);
    } catch (e: any) { setLog(`Falha: ${e?.message || e}`); }
  };

  const price = solUsd.data ?? 0;
  const spentUsd = spent * price;
  return (
    <div className="space-y-2 border-t border-border bg-background p-3 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Bump contínuo</div>
          <div className="text-[11px] text-muted-foreground">Compra {AUTO_BUMP.solPerBump} SOL sempre que a moeda fica {AUTO_BUMP.idleSeconds}s sem negociação.</div>
        </div>
        <button onClick={() => setOn(!on)} className={`h-7 rounded px-3 font-medium ${on ? "bg-positive text-background" : "bg-primary text-primary-foreground"}`}>{on ? "Ligado" : "Ligar"}</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1"><span className="text-[11px] text-muted-foreground">Limite (US$)</span>
          <input type="number" min={0.1} max={AUTO_BUMP.maxBudgetUsd} step={0.1} value={budget} onChange={(e) => setBudget(Math.min(AUTO_BUMP.maxBudgetUsd, Math.max(0, Number(e.target.value))))}
            className="num h-8 w-full border border-border bg-panel px-2 focus:border-primary focus:outline-none" /></label>
        <div className="space-y-1"><span className="text-[11px] text-muted-foreground">Gasto</span>
          <div className="num flex h-8 items-center">US$ {spentUsd.toFixed(2)} / {budget.toFixed(2)}</div></div>
        <div className="space-y-1"><span className="text-[11px] text-muted-foreground">Carteira de bump</span>
          <div className="num flex h-8 items-center">{(bal.data ?? 0).toFixed(4)} SOL</div></div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => fund(0.02)} className="h-7 rounded border border-border px-2.5 hover:bg-secondary">Depositar 0.02 SOL</button>
        <button onClick={recover} className="h-7 rounded border border-border px-2.5 hover:bg-secondary">Vender e devolver tudo</button>
        <button onClick={() => { resetSpent(mint); setSpent(0); }} className="h-7 rounded border border-border px-2.5 text-muted-foreground hover:bg-secondary">Zerar gasto</button>
      </div>
      <p className="text-[11px] text-muted-foreground">Os bumps saem de uma carteira separada guardada neste navegador, para não pedir aprovação na Phantom a cada compra. Deixe pouco SOL nela. Só roda com o app aberto. {wallet && <span className="num">Endereço: {wallet.publicKey.toBase58().slice(0, 6)}…</span>}</p>
      {log && <p className="num text-[11px] text-muted-foreground">{log}</p>}
    </div>
  );
}
