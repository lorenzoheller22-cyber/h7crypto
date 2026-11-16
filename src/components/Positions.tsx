import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { buildBuyTx, buildSellTx, getCoinsInfo } from "@/lib/pump.functions";
import { alertState, loadAlerts, loadPositions, pnl, removePosition, saveAlerts, shillText, type Alerts, type Position } from "@/lib/positions";
import { Bell, Copy, ExternalLink, LineChart, RefreshCw, Share2, Trash2 } from "lucide-react";

const BUMPS = [0.005, 0.01, 0.02];

export function Positions({ onChart }: { onChart: (c: { mint: string; symbol: string }) => void }) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [all, setAll] = useState<Position[]>([]);
  const [alerts, setAlerts] = useState<Record<string, Alerts>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<{ mint: string; panel: "alerts" | "share" } | null>(null);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    const r = () => setAll(loadPositions());
    r(); setAlerts(loadAlerts());
    window.addEventListener("positions-changed", r);
    return () => window.removeEventListener("positions-changed", r);
  }, []);

  const mine = publicKey ? all.filter((p) => p.owner === publicKey.toBase58()) : [];
  const mints = mine.map((p) => p.mint);

  const info = useQuery({ queryKey: ["coins", mints], enabled: mints.length > 0, queryFn: () => getCoinsInfo({ data: { mints } }), refetchInterval: 15000 });
  const bal = useQuery({
    queryKey: ["balances", publicKey?.toBase58(), mints],
    enabled: !!publicKey && mints.length > 0,
    refetchInterval: 15000,
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

  const send = async (key: string, label: string, build: () => Promise<{ tx: string }>) => {
    if (!publicKey || !signTransaction) { alert("Conecte sua carteira primeiro."); return; }
    setBusy(key); setMsg("");
    try {
      const { tx: b64 } = await build();
      const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      setMsg(`${label} enviada · ${sig.slice(0, 8)}…`);
      setTimeout(refresh, 2500);
    } catch (e: any) {
      setMsg(`Falha: ${e?.message || e}`);
    } finally { setBusy(null); }
  };
  const sell = (mint: string, percent: number) => send(`${mint}-s${percent}`, `Venda ${percent}%`, () =>
    buildSellTx({ data: { publicKey: publicKey!.toBase58(), mint, percent, priorityFee: 0.005, slippage: 15 } }));
  const buy = (mint: string, sol: number) => send(`${mint}-b${sol}`, `Compra ${sol} SOL`, () =>
    buildBuyTx({ data: { publicKey: publicKey!.toBase58(), mint, solAmount: sol, priorityFee: 0.0005, slippage: 15 } }));

  const setAlert = (mint: string, a: Alerts) => { saveAlerts(mint, a); setAlerts(loadAlerts()); };

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-panel px-4 py-14 text-center">
        <p className="text-sm font-medium">Conecte a carteira para ver suas posições</p>
        <p className="max-w-sm text-xs text-muted-foreground">PnL em tempo real, compras rápidas, alertas de alvo e saídas parciais.</p>
        <WalletMultiButton />
      </div>
    );
  }
  if (mine.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-panel px-4 py-14 text-center">
        <p className="text-sm font-medium">Nenhuma moeda lançada nesta carteira</p>
        <p className="mt-1 text-xs text-muted-foreground">No Mercado, escolha um ativo e use "Copiar e lançar".</p>
      </div>
    );
  }

  const rows = mine.map((p) => {
    const c = info.data?.[p.mint];
    const tokens = bal.data?.[p.mint] ?? 0;
    const value = c ? tokens * c.priceSol : 0;
    const { diff, pct } = pnl(value, p.investedSol);
    return { p, c, tokens, value, diff, pct, hit: c ? alertState(pct, alerts[p.mint]) : null };
  });
  const totalInv = rows.reduce((s, r) => s + r.p.investedSol, 0);
  const totalVal = rows.reduce((s, r) => s + r.value, 0);
  const tot = pnl(totalVal, totalInv);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-border bg-panel">
        {[["Investido", `${totalInv.toFixed(3)} SOL`, ""], ["Valor atual", `${totalVal.toFixed(3)} SOL`, ""],
          ["PnL", `${tot.diff >= 0 ? "+" : ""}${tot.diff.toFixed(3)} (${tot.pct.toFixed(1)}%)`, tot.diff >= 0 ? "text-positive" : "text-destructive"]].map(([l, v, cl], i) => (
          <div key={l} className={`p-3 ${i ? "border-l border-border" : ""}`}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
            <div className={`num mt-1 text-xs sm:text-sm ${cl}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{msg}</span>
        <button onClick={refresh} className="flex h-7 items-center gap-1.5 rounded border border-border px-2.5 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className={`h-3 w-3 ${info.isFetching ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </div>

      {rows.map(({ p, c, tokens, diff, pct, hit }) => {
        const up = diff >= 0;
        const progress = c?.progress ?? 0;
        const a = alerts[p.mint] ?? {};
        const isOpen = (k: "alerts" | "share") => open?.mint === p.mint && open.panel === k;
        const toggle = (k: "alerts" | "share") => setOpen(isOpen(k) ? null : { mint: p.mint, panel: k });
        const text = shillText(p);
        return (
          <div key={p.mint} className={`overflow-hidden rounded-2xl border bg-panel ${hit === "tp" ? "border-positive" : hit === "sl" ? "border-destructive" : "border-border"}`}>
            {hit && (
              <div className={`alert-blink flex items-center justify-between px-3 py-1.5 text-xs font-medium ${hit === "tp" ? "bg-positive/15 text-positive" : "bg-destructive/15 text-destructive"}`}>
                <span>{hit === "tp" ? `Alvo de lucro atingido (+${a.tp}%)` : `Stop atingido (-${Math.abs(a.sl ?? 0)}%)`}</span>
                <button onClick={() => sell(p.mint, 100)} className="underline">Vender 100%</button>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <img src={p.image || "/favicon.png"} alt="" className="h-8 w-8 shrink-0 rounded-full bg-secondary object-cover" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="text-sm font-semibold">{p.symbol}</span>
                    {c?.complete && <span className="rounded bg-primary/15 px-1.5 text-[10px] text-primary">Graduado</span>}</div>
                  <div className="num truncate text-[11px] text-muted-foreground">{p.mint.slice(0, 4)}…{p.mint.slice(-4)} · MC ${c ? Math.round(c.marketCap).toLocaleString("en-US") : "—"}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`num text-sm ${up ? "text-positive" : "text-destructive"}`}>{up ? "+" : ""}{diff.toFixed(4)} SOL</div>
                <div className={`num text-[11px] ${up ? "text-positive" : "text-destructive"}`}>{up ? "+" : ""}{pct.toFixed(2)}%</div>
              </div>
            </div>

            <div className="px-3 pb-3">
              <div className="mb-1 flex justify-between text-[10px] text-muted-foreground"><span>Curva de bonding</span><span className="num">{progress.toFixed(1)}%</span></div>
              <div className="h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${Math.min(100, progress)}%` }} /></div>
              <div className="num mt-1.5 text-[11px] text-muted-foreground">Posição: {tokens.toLocaleString("en-US", { maximumFractionDigits: 0 })} · Investido {p.investedSol} SOL</div>
            </div>

            <div className="grid grid-cols-1 gap-px border-t border-border bg-border sm:grid-cols-2">
              <div className="bg-panel p-3">
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Comprar</div>
                <div className="flex gap-1.5">
                  {BUMPS.map((s) => (
                    <button key={s} onClick={() => buy(p.mint, s)} disabled={!!busy}
                      className="num h-8 flex-1 rounded bg-positive/15 text-xs text-positive hover:bg-positive/25 disabled:opacity-40">
                      {busy === `${p.mint}-b${s}` ? "…" : `${s}`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-panel p-3">
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Vender</div>
                <div className="flex gap-1.5">
                  {[25, 50, 75, 100].map((s) => (
                    <button key={s} onClick={() => sell(p.mint, s)} disabled={!!busy || tokens <= 0}
                      className={`num h-8 flex-1 rounded text-xs disabled:opacity-40 ${s === 100 ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-destructive/15 text-destructive hover:bg-destructive/25"}`}>
                      {busy === `${p.mint}-s${s}` ? "…" : `${s}%`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 border-t border-border px-2 py-1.5">
              {[
                { icon: LineChart, label: "Gráfico", on: () => onChart({ mint: p.mint, symbol: p.symbol }), active: false },
                { icon: Bell, label: "Alertas", on: () => toggle("alerts"), active: isOpen("alerts") || !!(a.tp || a.sl) },
                { icon: Share2, label: "Divulgar", on: () => toggle("share"), active: isOpen("share") },
              ].map(({ icon: I, label, on, active }) => (
                <button key={label} onClick={on} className={`flex h-7 items-center gap-1.5 rounded px-2 text-xs hover:bg-secondary ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <I className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
              <a href={`https://pump.fun/${p.mint}`} target="_blank" rel="noreferrer" className="ml-auto flex h-7 items-center gap-1 rounded px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">Pump.fun <ExternalLink className="h-3 w-3" /></a>
              <button onClick={() => confirm("Remover esta moeda do painel?") && removePosition(p.mint)} aria-label="Remover" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>

            {isOpen("alerts") && (
              <div className="grid grid-cols-2 gap-3 border-t border-border bg-background p-3">
                {([["tp", "Alvo de lucro (+%)"], ["sl", "Stop (-%)"]] as const).map(([k, l]) => (
                  <label key={k} className="space-y-1"><span className="text-[11px] text-muted-foreground">{l}</span>
                    <input type="number" min={0} placeholder="—" defaultValue={a[k] ?? ""}
                      onChange={(e) => setAlert(p.mint, { ...a, [k]: e.target.value === "" ? undefined : Math.abs(Number(e.target.value)) })}
                      className="num h-8 w-full border border-border bg-panel px-2.5 text-xs focus:border-primary focus:outline-none" /></label>
                ))}
              </div>
            )}

            {isOpen("share") && (
              <div className="space-y-2 border-t border-border bg-background p-3">
                <pre className="num whitespace-pre-wrap break-all rounded border border-border bg-panel p-2.5 text-[11px] text-foreground">{text}</pre>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => { navigator.clipboard.writeText(text); setMsg("Texto copiado"); }} className="flex h-7 items-center gap-1.5 rounded border border-border px-2.5 text-xs hover:bg-secondary"><Copy className="h-3 w-3" /> Copiar</button>
                  <a href={`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="flex h-7 items-center rounded border border-border px-2.5 text-xs hover:bg-secondary">Postar no X</a>
                  <a href={`https://t.me/share/url?url=${encodeURIComponent(`https://pump.fun/${p.mint}`)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="flex h-7 items-center rounded border border-border px-2.5 text-xs hover:bg-secondary">Telegram</a>
                  <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="flex h-7 items-center rounded border border-border px-2.5 text-xs hover:bg-secondary">WhatsApp</a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
