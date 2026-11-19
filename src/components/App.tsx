import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Keypair, LAMPORTS_PER_SOL, VersionedTransaction } from "@solana/web3.js";
import { ArrowUpRight, BarChart3, Copy, Globe, Layers, LineChart, Plus, RefreshCw, Search, Send, TrendingUp, X, Zap } from "lucide-react";
import { Positions } from "./Positions";
import { ChartPanel } from "./ChartPanel";
import { savePosition } from "@/lib/positions";
import { SERVICE_FEE_SOL, buildFeeTx, type LaunchKind } from "@/lib/fees";
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
  const [copying, setCopying] = useState<{ token: TrendingToken; kind: LaunchKind } | null>(null);
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-xl">
        <div key={dataUpdatedAt} className="refresh-bar absolute inset-x-0 top-0 h-px bg-primary/60" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Terminal Solana</div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-wider">H7 CRYPTO</span>
                <span className="rounded-full border border-border px-1.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Pro</span>
              </div>
            </div>
          </div>
          <WalletMultiButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 py-4">
        <section className="rounded-2xl border border-border bg-panel p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Saldo disponível</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-positive" /> Solana Mainnet
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="num text-3xl font-semibold tracking-tight md:text-4xl">{balance !== null ? `${balance.toFixed(3)} SOL` : "— SOL"}</span>
                {balance !== null && solPrice ? <span className="num text-sm text-muted-foreground">≈ ${(balance * solPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {publicKey ? `Carteira ${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}` : "Conecte sua Phantom para lançar e gerenciar tokens"}
                {solPrice ? <span className="num"> · SOL ${solPrice.toFixed(2)}</span> : null}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button onClick={() => setCopying({ kind: "own", token: { mint: "", name: "", symbol: "", image: null, description: "", source: "pump.fun" } as unknown as TrendingToken })}
                className="col-span-2 flex h-10 items-center justify-center gap-1.5 rounded-xl border border-primary bg-primary/15 text-xs font-semibold text-foreground hover:bg-primary/25 sm:col-span-4">
                <Plus className="h-3.5 w-3.5" /> Criar moeda própria <span className="num text-muted-foreground">· taxa {SERVICE_FEE_SOL.own} SOL</span>
              </button>
              {([
                { label: "Copiar meme", icon: Zap, on: () => setTab("market"), active: tab === "market" },
                { label: "Minhas moedas", icon: Layers, on: () => setTab("positions"), active: tab === "positions" },
              ] as const).map(({ label, icon: I, on, active }) => (
                <button key={label} onClick={on}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/60 text-foreground hover:bg-secondary"}`}>
                  <I className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
              <a href="https://dexscreener.com/solana" target="_blank" rel="noreferrer"
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/60 text-xs font-semibold hover:bg-secondary">
                <TrendingUp className="h-3.5 w-3.5" /> DexScreener <ArrowUpRight className="h-3 w-3 opacity-60" />
              </a>
              <button onClick={() => refetch()} disabled={isFetching}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/60 text-xs font-semibold hover:bg-secondary">
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
              </button>
            </div>
          </div>
        </section>

        {tab === "positions" ? (
          <Positions onChart={setChart} />
        ) : (
          <section className="space-y-3">
            <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar memecoin por nome ou ticker"
                  className="h-10 w-full rounded-xl border border-border bg-panel pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-border bg-panel p-1 text-xs">
                {(["all", "pump.fun", "dexscreener"] as Filter[]).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`rounded-lg px-3 py-1.5 font-medium ${filter === f ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {f === "all" ? "Todos" : f === "pump.fun" ? "Pump.fun" : "DexScreener"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {list.map((t) => (
                <div key={`${t.source}-${t.mint}`} className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-panel p-4 transition-colors hover:border-muted-foreground/40">
                  <div className="flex items-start gap-3">
                    <img src={t.image || "/favicon.png"} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-border bg-secondary object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/favicon.png"; }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="truncate text-sm font-semibold">{t.name}</h4>
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{t.source === "pump.fun" ? "Pump.fun" : "DexScreener"}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span className="font-medium text-muted-foreground">${t.symbol}</span>
                        <span className="text-muted-foreground">· {ago(t.createdAt)}</span>
                        {t.change ? <span className={`num ${t.change >= 0 ? "text-positive" : "text-destructive"}`}>{t.change >= 0 ? "+" : ""}{t.change.toFixed(1)}%</span> : null}
                      </div>
                      <div className="num mt-1.5 flex items-center gap-3 text-xs">
                        <span>{fmtUsd(t.marketCap)} MC</span>
                        {t.volume24h ? <span className="text-muted-foreground">{fmtUsd(t.volume24h)} Vol</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                    <button onClick={() => setChart({ mint: t.mint, symbol: t.symbol })} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <LineChart className="h-3.5 w-3.5" /> Ver gráfico
                    </button>
                    <button onClick={() => setCopying({ token: t, kind: "copy" })} className="flex h-8 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                      <Copy className="h-3.5 w-3.5" /> Copiar e lançar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {!list.length && (
              <div className="flex flex-col items-center gap-2 py-16 text-xs text-muted-foreground">
                <BarChart3 className="h-5 w-5" /> {isFetching ? "Carregando mercado…" : "Nenhum ativo encontrado"}
              </div>
            )}
          </section>
        )}
      </main>
      {copying && <LaunchModal token={copying.token} kind={copying.kind} onClose={() => setCopying(null)} onSuccess={() => { setCopying(null); setTab("positions"); }} />}
      {chart && <ChartPanel {...chart} onClose={() => setChart(null)} />}
    </div>
  );
}

const field = "h-8 w-full border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

function LaunchModal({ token, kind, onClose, onSuccess }: { token: TrendingToken; kind: LaunchKind; onClose: () => void; onSuccess: () => void }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [name, setName] = useState(token.name);
  const [symbol, setSymbol] = useState(token.symbol);
  const [desc, setDesc] = useState(token.description || "");
  const [devBuy, setDevBuy] = useState("0.2");
  const [twitter, setTwitter] = useState(token.twitter || "");
  const [telegram, setTelegram] = useState(token.telegram || "");
  const [website, setWebsite] = useState(token.website || "");
  const [imageUrl, setImageUrl] = useState(token.image || "");
  const fee = SERVICE_FEE_SOL[kind];
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
    if (!name.trim() || !symbol.trim() || !imageUrl.trim()) { alert("Preencha nome, símbolo e link da imagem."); return; }
    setBusy(true);
    try {
      const mintKeypair = Keypair.generate();
      setStatus("Enviando imagem e metadados");
      const { uri } = await uploadMetadata({ data: {
        name, symbol, description: desc, imageUrl: imageUrl.trim() || undefined,
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
      const feeTx = await buildFeeTx(connection, wallet.publicKey, kind);
      // Uma única aprovação na carteira; a taxa só é enviada depois que o lançamento é confirmado.
      const [signed, signedFee] = wallet.signAllTransactions
        ? ((await wallet.signAllTransactions([tx, feeTx] as any)) as [VersionedTransaction, typeof feeTx])
        : [await wallet.signTransaction(tx), await wallet.signTransaction(feeTx)];
      setStatus("Enviando para a rede");
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
      await connection.confirmTransaction(sig, "confirmed");
      setStatus("Pagando taxa do serviço");
      await connection.sendRawTransaction(signedFee.serialize(), { skipPreflight: false, maxRetries: 3 });
      savePosition({ mint: mintKeypair.publicKey.toBase58(), owner: wallet.publicKey.toBase58(), name, symbol, image: imageUrl.trim() || null, investedSol: devBuyNum, createdAt: Date.now(), sig });
      setStatus("Lançamento confirmado");
      setTimeout(onSuccess, 1200);
    } catch (e: any) {
      alert(`Erro no lançamento: ${e?.message || e}`);
      setBusy(false); setStatus("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-background/80 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl border border-border bg-panel sm:rounded-2xl">
        <div className="flex h-11 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            {imageUrl && <img src={imageUrl} alt="" className="h-6 w-6 rounded-full object-cover" />}
            <span className="text-sm font-semibold">{kind === "own" ? "Criar moeda própria" : "Copiar moeda em alta"}</span>
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
          <label className="block space-y-1"><span className="text-[11px] text-muted-foreground">Link da imagem</span>
            <input className={field} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…/imagem.png" /></label>
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
            <div className="space-y-1 rounded border border-border bg-background p-2.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Compra inicial</span><span className="num">{devBuyNum} SOL</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taxa do serviço H7</span><span className="num">{fee} SOL</span></div>
              <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>Total aproximado</span><span className="num">{(devBuyNum + fee).toFixed(3)} SOL</span></div>
              <p className="text-[10px] text-muted-foreground">Mais taxas da rede Solana. A taxa só é cobrada se o lançamento for confirmado.</p>
            </div>
            {status && <p className="text-center text-xs text-muted-foreground">{status}…</p>}
            <button onClick={handleLaunch} disabled={busy}
              className="h-11 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {busy ? "Processando" : <>Lançar por <span className="num">{(devBuyNum + fee).toFixed(3)}</span> SOL</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
