import h7Logo from "@/assets/h7_logo.png.asset.json";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Keypair, LAMPORTS_PER_SOL, VersionedTransaction } from "@solana/web3.js";
import { BarChart3, Globe, LineChart, RefreshCw, Search, Send, X } from "lucide-react";
import { Positions } from "./Positions";
import { ChartPanel } from "./ChartPanel";
import { savePosition } from "@/lib/positions";
import { buildCreateTx, getTrending, uploadMetadata, type TrendingToken } from "@/lib/pump.functions";

export const fmtUsd = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`;

const ago = (ts: number | null) => {
  if (!ts) return "—";
  const s = Math.max(0, (Date.now() - ts) / 1000);
  return s < 60 ? `${s | 0}s` : s < 3600 ? `${(s / 60) | 0}m` : s < 86400 ? `${(s / 3600) | 0}h` : `${(s / 86400) | 0}d`;
};

type Filter = "all" | "pump.fun" | "dexscreener";
type Tab = "market" | "positions";

function useSolPrice() {
  return useQuery({
    queryKey: ["sol-usd"],
    refetchInterval: 60000,
    queryFn: async () => {
      const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      const j = await r.json();
      return Number(j?.solana?.usd ?? 0) || null;
    },
  });
}

export function App() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [copying, setCopying] = useState<TrendingToken | null>(null);
  const [chart, setChart] = useState<{ mint: string; symbol: string } | null>(null);
  const [tab, setTab] = useState<Tab>("market");
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const solPrice = useSolPrice().data ?? null;

  useEffect(() => {
    if (!publicKey) { setBalance(null); return undefined; }
    let on = true;
    const load = () => connection.getBalance(publicKey).then((b) => on && setBalance(b / LAMPORTS_PER_SOL)).catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => { on = false; clearInterval(id); };
  }, [publicKey, connection]);

  const { data, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["trending"],
    queryFn: () => getTrending(),
    refetchInterval: 15000,
  });

  const list = useMemo(
    () => (data ?? []).filter((t) => (filter === "all" || t.source === filter) && (!q || `${t.name} ${t.symbol}`.toLowerCase().includes(q.toLowerCase()))),
    [data, filter, q],
  );

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`h-10 border-b-2 px-3 text-xs font-medium transition-colors ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-panel">
        <div key={dataUpdatedAt} className="refresh-bar h-px bg-primary/70" />
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-3 px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <img src={h7Logo.url} alt="H7 CRYPTO" className="h-8 w-8 shrink-0 rounded object-cover" />
            <span className="text-sm font-semibold tracking-wide">H7 CRYPTO</span>
            <span className="hidden items-center gap-1.5 border-l border-border pl-3 text-[11px] text-muted-foreground sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" /> Solana Mainnet
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right md:block">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">SOL/USD</div>
              <div className="num text-xs">{solPrice ? solPrice.toFixed(2) : "—"}</div>
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo</div>
              <div className="num text-xs">
                {balance !== null ? `${balance.toFixed(3)} SOL` : "—"}
                {balance !== null && solPrice ? <span className="text-muted-foreground"> · ${(balance * solPrice).toFixed(2)}</span> : null}
              </div>
            </div>
            <WalletMultiButton />
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-1 sm:px-2">
          <nav className="flex">{tabBtn("market", "Mercado")}{tabBtn("positions", "Minhas moedas")}</nav>
          <div className="flex items-center gap-2 pr-3 text-[11px] text-muted-foreground sm:hidden">
            <span className="num">{balance !== null ? `${balance.toFixed(3)} SOL` : ""}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-4">
        {tab === "positions" ? (
          <Positions onChart={setChart} />
        ) : (
          <section className="overflow-hidden rounded-md border border-border bg-panel">
            <div className="flex flex-col gap-2 border-b border-border p-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1">
                {(["all", "pump.fun", "dexscreener"] as Filter[]).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`h-7 rounded px-2.5 text-xs ${filter === f ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {f === "all" ? "Todos" : f === "pump.fun" ? "Pump.fun" : "DexScreener"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar símbolo"
                    className="h-7 w-full border border-border bg-background pl-7 pr-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
                </div>
                <button onClick={() => refetch()} aria-label="Atualizar" className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground">
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr_1fr_0.8fr_0.6fr_auto] gap-3 border-b border-border px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground md:grid">
              <span>Ativo</span><span className="text-right">Market cap</span><span className="text-right">Volume 24h</span><span className="text-right">Var. 24h</span><span className="text-right">Idade</span><span className="w-[148px]" />
            </div>

            <div className="divide-y divide-border">
              {list.map((t) => (
                <div key={`${t.source}-${t.mint}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 hover:bg-card md:grid-cols-[minmax(0,2.2fr)_1fr_1fr_0.8fr_0.6fr_auto]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <img src={t.image || "/favicon.png"} alt="" className="h-7 w-7 shrink-0 rounded-full bg-secondary object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/favicon.png"; }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{t.symbol}</span>
                        <span className="text-[10px] text-muted-foreground">{t.source === "pump.fun" ? "PUMP" : "DEX"}</span>
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">{t.name}</div>
                      <div className="num mt-0.5 text-[11px] text-muted-foreground md:hidden">
                        {fmtUsd(t.marketCap)} · <span className={t.change >= 0 ? "text-positive" : "text-destructive"}>{t.change >= 0 ? "+" : ""}{t.change.toFixed(1)}%</span> · {ago(t.createdAt)}
                      </div>
                    </div>
                  </div>
                  <span className="num hidden text-right text-xs md:block">{fmtUsd(t.marketCap)}</span>
                  <span className="num hidden text-right text-xs text-muted-foreground md:block">{t.volume24h ? fmtUsd(t.volume24h) : "—"}</span>
                  <span className={`num hidden text-right text-xs md:block ${t.change >= 0 ? "text-positive" : "text-destructive"}`}>{t.change >= 0 ? "+" : ""}{t.change.toFixed(2)}%</span>
                  <span className="num hidden text-right text-xs text-muted-foreground md:block">{ago(t.createdAt)}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setChart({ mint: t.mint, symbol: t.symbol })} aria-label="Ver gráfico"
                      className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground">
                      <LineChart className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setCopying(t)} className="h-7 rounded bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                      Copiar e lançar
                    </button>
                  </div>
                </div>
              ))}
              {!list.length && (
                <div className="flex flex-col items-center gap-2 py-16 text-xs text-muted-foreground">
                  <BarChart3 className="h-5 w-5" /> {isFetching ? "Carregando mercado…" : "Nenhum ativo encontrado"}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {copying && <LaunchModal token={copying} onClose={() => setCopying(null)} onSuccess={() => { setCopying(null); setTab("positions"); }} />}
      {chart && <ChartPanel {...chart} onClose={() => setChart(null)} />}
    </div>
  );
}

const field = "h-8 w-full border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

function LaunchModal({ token, onClose, onSuccess }: { token: TrendingToken; onClose: () => void; onSuccess: () => void }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [name, setName] = useState(token.name);
  const [symbol, setSymbol] = useState(token.symbol);
  const [desc, setDesc] = useState(token.description || "");
  const [devBuy, setDevBuy] = useState("0.2");
  const [twitter, setTwitter] = useState(token.twitter || "");
  const [telegram, setTelegram] = useState(token.telegram || "");
  const [website, setWebsite] = useState(token.website || "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const devBuyNum = parseFloat(devBuy) || 0;
  const score = useMemo(() => {
    let s = 40;
    if (devBuyNum >= 0.1 && devBuyNum <= 0.6) s += 25;
    else if (devBuyNum > 0.6 && devBuyNum <= 1.0) s += 10;
    if (twitter.trim()) s += 15;
    if (telegram.trim()) s += 10;
    if (website.trim()) s += 10;
    return Math.min(100, s);
  }, [devBuyNum, twitter, telegram, website]);
  const scoreColor = score >= 80 ? "bg-positive" : score >= 50 ? "bg-warning" : "bg-destructive";
  const scoreText = score >= 80 ? "text-positive" : score >= 50 ? "text-warning" : "text-destructive";

  const handleLaunch = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) { alert("Conecte sua carteira primeiro."); return; }
    setBusy(true);
    try {
      const mintKeypair = Keypair.generate();
      setStatus("Enviando imagem e metadados");
      const { uri } = await uploadMetadata({ data: {
        name, symbol, description: desc, imageUrl: token.image ?? undefined,
        twitter: twitter.trim() || undefined, telegram: telegram.trim() || undefined, website: website.trim() || undefined,
      } });
      setStatus("Montando transação");
      const { tx: b64 } = await buildCreateTx({ data: {
        publicKey: wallet.publicKey.toBase58(), mint: mintKeypair.publicKey.toBase58(),
        name, symbol, uri, devBuySol: devBuyNum, priorityFee: 0.0005, slippage: 15,
      } });
      setStatus("Aguardando assinatura na carteira");
      const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
      tx.sign([mintKeypair]);
      const signed = await wallet.signTransaction(tx);
      setStatus("Enviando para a rede");
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
      savePosition({ mint: mintKeypair.publicKey.toBase58(), owner: wallet.publicKey.toBase58(), name, symbol, image: token.image, investedSol: devBuyNum, createdAt: Date.now(), sig });
      setStatus("Lançamento confirmado");
      setTimeout(onSuccess, 1200);
    } catch (e: any) {
      alert(`Erro no lançamento: ${e?.message || e}`);
      setBusy(false); setStatus("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-background/80 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-md border border-border bg-panel sm:rounded-md">
        <div className="flex h-11 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            {token.image && <img src={token.image} alt="" className="h-6 w-6 rounded-full object-cover" />}
            <span className="text-sm font-semibold">Novo lançamento</span>
            <span className="text-xs text-muted-foreground">Pump.fun</span>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Índice de atratividade</span>
              <span className={`num font-semibold ${scoreText}`}>{score}/100</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-secondary"><div className={`h-full ${scoreColor} transition-all`} style={{ width: `${score}%` }} /></div>
            <p className="mt-2 text-[11px] text-muted-foreground">Estimativa baseada em redes preenchidas e compra inicial entre 0,1 e 0,6 SOL. Não garante compradores.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-[11px] text-muted-foreground">Nome</span><input className={field} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="space-y-1"><span className="text-[11px] text-muted-foreground">Símbolo</span><input className={field} value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} /></label>
          </div>
          <label className="block space-y-1"><span className="text-[11px] text-muted-foreground">Descrição</span>
            <textarea rows={2} className={`${field} h-auto py-2`} value={desc} onChange={(e) => setDesc(e.target.value)} /></label>

          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground">Compra inicial (SOL)</span>
            <div className="flex gap-1.5">
              {["0.1", "0.2", "0.5", "1.0"].map((v) => (
                <button key={v} type="button" onClick={() => setDevBuy(v)}
                  className={`num h-8 flex-1 rounded border text-xs ${devBuy === v ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>{v}</button>
              ))}
              <input type="number" step="0.05" value={devBuy} onChange={(e) => setDevBuy(e.target.value)} className={`${field} num w-20`} />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] text-muted-foreground">Redes</span>
            {[
              { v: twitter, s: setTwitter, ph: "https://x.com/…", icon: <span className="text-[11px] font-semibold">X</span> },
              { v: telegram, s: setTelegram, ph: "https://t.me/…", icon: <Send className="h-3 w-3" /> },
              { v: website, s: setWebsite, ph: "https://…", icon: <Globe className="h-3 w-3" /> },
            ].map((r, i) => (
              <div key={i} className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">{r.icon}</span>
                <input value={r.v} onChange={(e) => r.s(e.target.value)} placeholder={r.ph} className={`${field} pl-7`} />
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            {status && <p className="text-center text-xs text-muted-foreground">{status}…</p>}
            <button onClick={handleLaunch} disabled={busy}
              className="h-10 w-full rounded bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {busy ? "Processando" : <>Lançar com <span className="num">{devBuyNum}</span> SOL</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
