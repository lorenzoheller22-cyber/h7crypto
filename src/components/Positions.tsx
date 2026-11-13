import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { buildSellTx, getCoinsInfo } from "@/lib/pump.functions";
import { loadPositions, pnl, removePosition, type Position } from "@/lib/positions";

export function Positions() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [all, setAll] = useState<Position[]>([]);
  useEffect(() => {
    const r = () => setAll(loadPositions());
    r(); window.addEventListener("positions-changed", r);
    return () => window.removeEventListener("positions-changed", r);
  }, []);
  const mine = publicKey ? all.filter((p) => p.owner === publicKey.toBase58()) : [];
  const mints = mine.map((p) => p.mint);

  const info = useQuery({
    queryKey: ["coins", mints], enabled: mints.length > 0,
    queryFn: () => getCoinsInfo({ data: { mints } }), refetchInterval: 20000,
  });
  const bal = useQuery({
    queryKey: ["balances", publicKey?.toBase58(), mints], enabled: !!publicKey && mints.length > 0,
    refetchInterval: 20000,
    queryFn: async () => {
      if (!publicKey) return {};
      const out: Record<string, number> = {};
      await Promise.all(mints.map(async (m) => {
        try {
          const r = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: new PublicKey(m) });
          out[m] = r.value.reduce((s, a) => s + Number(a.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0);
        } catch { out[m] = 0; }
      }));
      return out;
    },
  });

  const refresh = () => { info.refetch(); bal.refetch(); };
  const rows = mine.map((p) => {
    const c = info.data?.[p.mint];
    const tokens = bal.data?.[p.mint] ?? 0;
    const value = c ? tokens * c.priceSol : 0;
    return { p, c, tokens, value, ...pnl(value, p.investedSol) };
  });
  const totInv = rows.reduce((s, r) => s + r.p.investedSol, 0);
  const totVal = rows.reduce((s, r) => s + r.value, 0);
  const tot = pnl(totVal, totInv);
  const loading = info.isFetching || bal.isFetching;

  if (!publicKey) return (
    <div className="flex flex-col items-center gap-3 border border-border bg-card p-8 text-sm text-muted-foreground">
      Conecte sua carteira para ver suas moedas criadas.<WalletMultiButton />
    </div>
  );

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <Stat label="Moedas" v={String(mine.length)} />
        <Stat label="Investido" v={`${totInv.toFixed(3)} SOL`} />
        <Stat label="Valor atual" v={`${totVal.toFixed(3)} SOL`} />
        <Stat label="Lucro" v={`${tot.diff >= 0 ? "+" : ""}${tot.diff.toFixed(3)} SOL (${tot.pct.toFixed(0)}%)`} good={tot.diff >= 0} />
      </div>
      <div className="mb-3 flex justify-end">
        <Button variant="ghost" onClick={refresh} className="border border-border px-3 py-1.5 text-xs hover:border-primary">
          <span className={loading ? "inline-block animate-spin" : ""}>↻</span> Atualizar
        </Button>
      </div>
      {mine.length === 0 ? (
        <p className="border border-border bg-card p-6 text-sm text-muted-foreground">Nenhuma moeda criada com esta carteira ainda. Use COPY &amp; LAUNCH no feed.</p>
      ) : (
        <div className="space-y-3">{rows.map((r) => <Row key={r.p.mint} {...r} />)}</div>
      )}
    </div>
  );
}

function Stat({ label, v, good }: { label: string; v: string; good?: boolean }) {
  return (
    <div className="border border-border bg-card p-3">
      <div className="text-muted-foreground uppercase">{label}</div>
      <div className={`mt-1 font-bold ${good === undefined ? "" : good ? "text-primary" : "text-destructive"}`}>{v}</div>
    </div>
  );
}

function Row({ p, c, tokens, value, diff, pct }: { p: Position; c: any; tokens: number; value: number; diff: number; pct: number }) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [percent, setPercent] = useState(50);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string; sig?: string } | null>(null);

  async function sell(force?: number) {
    if (!publicKey || !signTransaction || tokens <= 0) return;
    const pctToSell = force ?? percent;
    const dump = pctToSell === 100 && force === 100;
    setBusy(true); setMsg(null);
    try {
      const { tx } = await buildSellTx({ data: { publicKey: publicKey.toBase58(), mint: p.mint, percent: pctToSell, priorityFee: dump ? 0.005 : 0.0005, slippage: dump ? 25 : 15 } });
      const vtx = VersionedTransaction.deserialize(Uint8Array.from(atob(tx), (ch) => ch.charCodeAt(0)));
      const signed = await signTransaction(vtx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true, maxRetries: 3 });
      await connection.confirmTransaction(sig, "confirmed");
      setMsg({ ok: true, t: `Vendido ${pctToSell}% — SOL enviado para sua carteira`, sig });
    } catch (e: any) { setMsg({ ok: false, t: e?.message ?? String(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="border border-border bg-card p-3 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        {p.image ? <img src={p.image} alt="" className="h-12 w-12 border border-border object-cover" /> : <div className="h-12 w-12 bg-muted" />}
        <div className="min-w-0 flex-1">
          <div className="font-bold text-primary">${p.symbol} <span className="font-normal text-foreground">{p.name}</span></div>
          <div className="text-muted-foreground">Criada {new Date(p.createdAt).toLocaleString()} · {c ? (c.complete ? "Migrada p/ Raydium" : `Curva ${c.progress.toFixed(0)}%`) : "carregando..."}</div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-right md:grid-cols-4">
          <span className="text-muted-foreground">Investido<br /><b className="text-foreground">{p.investedSol.toFixed(3)}</b></span>
          <span className="text-muted-foreground">Valor<br /><b className="text-foreground">{value.toFixed(3)}</b></span>
          <span className="text-muted-foreground">Lucro<br /><b className={diff >= 0 ? "text-primary" : "text-destructive"}>{diff >= 0 ? "+" : ""}{diff.toFixed(3)} ({pct.toFixed(0)}%)</b></span>
          <span className="text-muted-foreground">Tokens<br /><b className="text-foreground">{tokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b></span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">Resgatar:</span>
        {[25, 50, 75, 100].map((v) => (
          <Button variant="ghost" key={v} onClick={() => setPercent(v)} className={`border px-2 py-1 ${percent === v ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{v}%</Button>
        ))}
        <input type="range" min={1} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} className="w-28 accent-[var(--primary)]" />
        <b className="w-10 text-primary">{percent}%</b>
        <span className="text-muted-foreground">≈ {(value * percent / 100).toFixed(3)} SOL</span>
        <Button variant="ghost" disabled={busy || tokens <= 0} onClick={() => sell(100)} className="ml-auto bg-destructive px-3 py-1.5 font-bold text-destructive-foreground disabled:opacity-50">🚨 DUMP ALL</Button>
        <Button variant="ghost" disabled={busy || tokens <= 0} onClick={() => sell()} className=" bg-primary px-3 py-1.5 font-bold text-primary-foreground disabled:opacity-50">
          {busy ? "VENDENDO..." : tokens <= 0 ? "SEM SALDO" : `RESGATAR ${percent}%`}
        </Button>
        <a href={`https://pump.fun/coin/${p.mint}`} target="_blank" rel="noreferrer" className="border border-border px-2 py-1.5 hover:border-primary">pump</a>
        <a href={`https://dexscreener.com/solana/${p.mint}`} target="_blank" rel="noreferrer" className="border border-border px-2 py-1.5 hover:border-primary">dex</a>
        <Button variant="ghost" onClick={() => confirm("Remover da lista?") && removePosition(p.mint)} className="text-muted-foreground hover:text-destructive">[x]</Button>
      </div>
      {msg && <p className={`mt-2 break-all ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.ok ? "✓" : "ERRO:"} {msg.t} {msg.sig && <a className="underline" href={`https://solscan.io/tx/${msg.sig}`} target="_blank" rel="noreferrer">solscan ↗</a>}</p>}
    </div>
  );
}
