import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ChartNoAxesCombined, ChevronRight, Copy, FlaskConical, House, Layers, RefreshCw, Search, Wallet, X, Zap } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js";
import { Positions } from "./Positions";
import { Simulator } from "./Simulator";
import { TrustButton } from "./TrustButton";
import { savePosition } from "@/lib/positions";
import { buildCreateTx, getPlatformConfig, getTrending, uploadMetadata, type TrendingToken } from "@/lib/pump.functions";

const fmtUsd = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`;
const ago = (ts: number | null) => {
  if (!ts) return "—";
  const s = Math.max(0, (Date.now() - ts) / 1000);
  return s < 60 ? `${s | 0}s` : s < 3600 ? `${(s / 60) | 0}m` : s < 86400 ? `${(s / 3600) | 0}h` : `${(s / 86400) | 0}d`;
};

type Filter = "all" | "pump.fun" | "dexscreener";
type Tab = "trending" | "coins" | "sim";

export function App() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [copying, setCopying] = useState<TrendingToken | null>(null);
  const [tab, setTab] = useState<Tab>("trending");
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    if (!publicKey) { setBalance(null); return undefined; }
    let on = true;
    const load = () => connection.getBalance(publicKey).then((b) => on && setBalance(b / LAMPORTS_PER_SOL)).catch(() => {});
    load(); const id = setInterval(load, 15000);
    return () => { on = false; clearInterval(id); };
  }, [publicKey, connection]);
  const { data, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["trending"],
    queryFn: () => getTrending(),
    refetchInterval: 15000,
  });
  const list = useMemo(
    () =>
      (data ?? []).filter(
        (t) =>
          (filter === "all" || t.source === filter) &&
          (!q || `${t.name} ${t.symbol}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [data, filter, q],
  );

  const nav = [
    { key: "trending" as Tab, label: "Descobrir", icon: House },
    { key: "coins" as Tab, label: "Minhas moedas", icon: Layers },
    { key: "sim" as Tab, label: "Simulação", icon: FlaskConical },
  ];
  return (
    <div className="app-shell min-h-screen">
      <aside className="desktop-sidebar">
        <a href="/" className="brand"><span className="brand-mark"><Zap /></span>HELLER<span className="text-primary">.</span></a>
        <div className="sidebar-caption">SEU ESPAÇO NA SOLANA</div>
        <nav className="space-y-2">
          {nav.map(({ key, label, icon: Icon }) => <Button key={key} variant="ghost" onClick={() => setTab(key)} className={`sidebar-link ${tab === key ? "is-active" : ""}`}><Icon />{label}{tab === key && <ChevronRight className="ml-auto" />}</Button>)}
        </nav>
        <div className="mt-auto border-t border-border pt-5"><div className="flex items-center gap-3"><span className="profile-avatar">LH</span><div><div className="text-sm font-semibold">Lorenzo Heller</div><div className="mt-1 text-xs text-muted-foreground">{publicKey ? "Carteira conectada" : "Carteira desconectada"}</div></div></div></div>
      </aside>
      <div className="workspace">
        <header className="app-header">
          <a href="/" className="brand md:hidden"><span className="brand-mark"><Zap /></span>HELLER<span className="text-primary">.</span></a>
          <div className="hidden md:block"><span className="text-sm text-muted-foreground">Bem-vindo de volta,</span><div className="font-semibold">Lorenzo Heller <span className="text-primary">↗</span></div></div>
          <div className="header-wallet"><TrustButton />{publicKey && <WalletMultiButton />}</div>
        </header>
        <main className="main-content">
          <section className="balance-section">
            <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4" />Saldo da carteira</span><span className="network-badge"><span />Solana Mainnet</span></div>
            <div className="mt-4 flex items-baseline gap-3"><span className="balance-value">{balance === null ? "—" : balance.toFixed(3)}</span><span className="text-lg text-muted-foreground">SOL</span></div>
            <div className="mt-2 text-xs text-muted-foreground">{publicKey ? `${publicKey.toBase58().slice(0, 6)}…${publicKey.toBase58().slice(-5)}` : "Phantom · Sua carteira, seu controle"}</div>
            <div className="quick-actions">
              {[{ label: "Explorar", icon: Search, target: "trending" as Tab }, { label: "Lançamentos", icon: ArrowUpRight, target: "coins" as Tab }, { label: "Minha carteira", icon: Wallet, target: "coins" as Tab }, { label: "Simular", icon: FlaskConical, target: "sim" as Tab }].map(({ label, icon: Icon, target }) => <div key={label} className="quick-action"><Button variant="secondary" size="icon" title={label} aria-label={label} onClick={() => setTab(target)}><Icon /></Button><span>{label}</span></div>)}
            </div>
          </section>
          {tab === "coins" ? <><div className="section-heading"><div><span className="section-eyebrow">SEU PORTFÓLIO</span><h1>Minhas moedas</h1></div><Layers className="text-primary" /></div><Positions /></> : tab === "sim" ? <><div className="section-heading"><div><span className="section-eyebrow">SEM SOL REAL</span><h1>Simulação</h1></div><FlaskConical className="text-primary" /></div><Simulator tokens={data ?? []} /></> : <>
            <section className="section-heading"><div><span className="section-eyebrow">DESCUBRA O PRÓXIMO MOVIMENTO</span><h1>Moedas em alta<span className="text-primary">.</span></h1></div><Button variant="ghost" size="icon" title="Atualizar moedas" aria-label="Atualizar moedas" onClick={() => void refetch()}><RefreshCw className={isFetching ? "animate-spin" : ""} /></Button></section>
            <div className="market-summary"><ChartNoAxesCombined className="h-4 w-4 text-primary" /><span>Solana & Pump.fun</span><span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground"><span className="live-dot" />{data ? `${data.length} tokens` : "Atualizando"}</span></div>
            <div className="feed-toolbar">
              <div className="filter-tabs">{(["all", "pump.fun", "dexscreener"] as Filter[]).map((f) => <Button variant="ghost" size="sm" key={f} onClick={() => setFilter(f)} className={filter === f ? "is-active" : ""}>{f === "all" ? "Todas" : f === "pump.fun" ? "Pump.fun" : "DexScreener"}</Button>)}</div>
              <label className="search-field"><Search className="h-4 w-4" /><input aria-label="Buscar moedas" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar moeda..." /></label>
            </div>
            {!data ? <div className="token-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-card" />)}</div> : list.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma moeda encontrada.</div> : <div className="token-grid">{list.map((t) => <TokenCard key={t.mint} t={t} onCopy={() => setCopying(t)} />)}</div>}
            <div className="feed-footer"><span className="live-dot" />{dataUpdatedAt ? `Atualizado ${new Date(dataUpdatedAt).toLocaleTimeString("pt-BR")}` : "Conectando ao mercado"}<span className="ml-auto">Pump.fun · Solana</span></div>
          </>}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">{nav.map(({ key, label, icon: Icon }) => <Button key={key} variant="ghost" onClick={() => setTab(key)} className={tab === key ? "is-active" : ""}><Icon /><span>{label}</span></Button>)}<Button variant="default" size="icon" className="bottom-launch" title="Explorar moedas para copiar" aria-label="Explorar moedas para copiar" onClick={() => setTab("trending")}><Copy /></Button></nav>
      {copying && <LaunchModal token={copying} onClose={() => setCopying(null)} onDone={() => { setCopying(null); setTab("coins"); }} />}
    </div>
  );
}

function TokenCard({ t, onCopy }: { t: TrendingToken; onCopy: () => void }) {
  return (
    <article className="token-card">
      <div className="flex items-center gap-3">
        {t.image ? <img src={t.image} alt={t.symbol} loading="lazy" className="token-image" /> : <div className="token-image token-fallback">{t.symbol.slice(0, 2)}</div>}
        <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold">{t.name}</h2><div className="mt-1 text-xs text-muted-foreground">${t.symbol} <span className="mx-1">·</span> {ago(t.createdAt)}</div></div>
        <span className={`change-badge ${t.change >= 0 ? "positive" : "negative"}`}>{t.change >= 0 ? "+" : ""}{t.change.toFixed(1)}%</span>
      </div>
      <div className="token-metrics"><div><span>Market cap</span><strong>{fmtUsd(t.marketCap)}</strong></div><div><span>Volume 24h</span><strong>{fmtUsd(t.volume24h)}</strong></div><div className="text-right"><span>Origem</span><strong>{t.source === "pump.fun" ? "Pump.fun" : "DexScreener"}</strong></div></div>
      <div className="flex items-center gap-2 border-t border-border pt-3"><Button onClick={onCopy} className="copy-cta flex-1"><Copy />Copiar moeda<ArrowUpRight className="ml-auto" /></Button><Button asChild variant="ghost" size="icon" title="Ver na Pump.fun"><a href={`https://pump.fun/coin/${t.mint}`} target="_blank" rel="noreferrer" aria-label={`Ver ${t.symbol} na Pump.fun`}><Zap /></a></Button><Button asChild variant="ghost" size="icon" title="Ver no DexScreener"><a href={`https://dexscreener.com/solana/${t.mint}`} target="_blank" rel="noreferrer" aria-label={`Ver ${t.symbol} no DexScreener`}><ChartNoAxesCombined /></a></Button></div>
    </article>
  );
}

type Step = { label: string; state: "idle" | "run" | "ok" | "err" };

function LaunchModal({ token, onClose, onDone }: { token: TrendingToken; onClose: () => void; onDone: () => void }) {
  const { connection } = useConnection();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const cfg = useQuery({ queryKey: ["cfg"], queryFn: () => getPlatformConfig() });
  const [f, setF] = useState({
    name: token.name, symbol: token.symbol.toUpperCase().slice(0, 10),
    description: token.description || `${token.name} — the next ${token.symbol}. Community driven.`,
    twitter: token.twitter ?? "", telegram: token.telegram ?? "", website: token.website ?? "",
    devBuy: 0.2, priority: 0.002, slippage: 10,
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(token.image);
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ mint: string; sig: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!file) return undefined; const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);

  const fee = cfg.data?.feeWallet ? cfg.data.feeSol : 0;
  const total = fee + f.devBuy + f.priority + 0.02;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: typeof f[k] === "number" ? Number(e.target.value) : e.target.value });
  const mark = (i: number, state: Step["state"]) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, state } : x)));

  async function launch() {
    if (!publicKey || !signTransaction) return;
    setBusy(true); setError(null); setResult(null);
    const labels = [fee ? `Taxa da plataforma (${fee} SOL)` : "Taxa da plataforma (desativada)", "Upload de metadata → IPFS", "Montando transação de criação", "Assinar & enviar", "Confirmando on-chain"];
    setSteps(labels.map((label) => ({ label, state: "idle" })));
    let i = 0;
    try {
      mark(i, "run");
      if (fee && cfg.data?.feeWallet) {
        const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: new PublicKey(cfg.data.feeWallet), lamports: Math.round(fee * LAMPORTS_PER_SOL) }));
        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, "confirmed");
      }
      mark(i++, "ok"); mark(i, "run");
      let imageBase64: string | undefined;
      if (file) {
        const b = new Uint8Array(await file.arrayBuffer()); let s = ""; for (const x of b) s += String.fromCharCode(x); imageBase64 = btoa(s);
      }
      let meta: { uri: string; name: string; symbol: string };
      try {
        meta = await uploadMetadata({ data: { name: f.name, symbol: f.symbol, description: f.description, ...(token.image ? { imageUrl: token.image } : {}), ...(imageBase64 ? { imageBase64, imageType: file?.type ?? "image/png" } : {}), twitter: f.twitter, telegram: f.telegram, website: f.website } });
      } catch {
        const uri = `${window.location.origin}/api/public/m/${token.mint}?n=${encodeURIComponent(f.name.slice(0, 32))}&s=${encodeURIComponent(f.symbol.slice(0, 10))}`;
        meta = { uri, name: f.name, symbol: f.symbol };
      }
      mark(i++, "ok"); mark(i, "run");
      const mint = Keypair.generate();
      const { tx } = await buildCreateTx({ data: { publicKey: publicKey.toBase58(), mint: mint.publicKey.toBase58(), name: meta.name, symbol: meta.symbol, uri: meta.uri, devBuySol: f.devBuy, priorityFee: f.priority, slippage: f.slippage } });
      const vtx = VersionedTransaction.deserialize(Uint8Array.from(atob(tx), (c) => c.charCodeAt(0)));
      vtx.sign([mint]);
      mark(i++, "ok"); mark(i, "run");
      const sig = await sendTransaction(vtx, connection, { skipPreflight: true, maxRetries: 3 });
      mark(i++, "ok"); mark(i, "run");
      await connection.confirmTransaction(sig, "confirmed");
      mark(i, "ok");
      setResult({ mint: mint.publicKey.toBase58(), sig });
      savePosition({ mint: mint.publicKey.toBase58(), name: meta.name, symbol: meta.symbol, image: token.image, investedSol: f.devBuy, createdAt: Date.now(), owner: publicKey.toBase58(), sig });
    } catch (e: any) {
      mark(i, "err"); setError(e?.message ?? String(e));
    } finally { setBusy(false); }
  }

  const inp = "w-full border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={() => !busy && onClose()}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-primary/50 bg-card p-5 shadow-[var(--shadow-glow)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Criar moeda · <span className="text-muted-foreground">${token.symbol}</span></h2>
          <Button variant="ghost" onClick={onClose} disabled={busy} aria-label="Fechar lançamento" className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></Button>
        </div>

        {result ? (
          <div className="space-y-3">
            <p className="text-primary text-lg font-bold">✓ TOKEN LANÇADO</p>
            <p className="break-all text-xs text-muted-foreground">Mint: {result.mint}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <a className="bg-primary px-3 py-2 font-bold text-primary-foreground" href={`https://pump.fun/coin/${result.mint}`} target="_blank" rel="noreferrer">Ver no Pump.fun ↗</a>
              <a className="border border-border px-3 py-2 hover:border-primary" href={`https://dexscreener.com/solana/${result.mint}`} target="_blank" rel="noreferrer">DexScreener ↗</a>
              <a className="border border-border px-3 py-2 hover:border-primary" href={`https://solscan.io/tx/${result.sig}`} target="_blank" rel="noreferrer">Solscan ↗</a>
              <Button variant="ghost" onClick={onDone} className="w-full bg-primary px-3 py-2 font-bold text-primary-foreground">💧 Ir para Minhas Moedas (vender / DUMP ALL)</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[120px_1fr]">
              <label className="cursor-pointer">
                {preview ? <img src={preview} alt="" className="h-28 w-28 object-cover border border-border" /> : <div className="h-28 w-28 bg-muted" />}
                <span className="mt-1 block text-[10px] text-muted-foreground">trocar imagem</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="col-span-1">Nome<input className={inp} value={f.name} onChange={set("name")} maxLength={32} /></label>
                <label>Ticker<input className={inp} value={f.symbol} onChange={set("symbol")} maxLength={10} /></label>
                <label className="col-span-2">Descrição<textarea className={inp} rows={2} value={f.description} onChange={set("description")} /></label>
                <label>X / Twitter<input className={inp} value={f.twitter} onChange={set("twitter")} /></label>
                <label>Telegram<input className={inp} value={f.telegram} onChange={set("telegram")} /></label>
                <label className="col-span-2">Website<input className={inp} value={f.website} onChange={set("website")} /></label>
              </div>
            </div>

            <div className="mt-4 border border-border p-3 text-xs">
              <div className="mb-2 flex justify-between"><span>DEV BUY (SOL)</span><b className="text-primary">{f.devBuy} SOL</b></div>
              <input type="range" min={0} max={5} step={0.05} value={f.devBuy} onChange={set("devBuy")} className="w-full accent-[var(--primary)]" />
              <div className="mt-1 flex gap-1">{[0.2, 0.5, 1, 2].map((v) => (
                <Button variant="ghost" key={v} onClick={() => setF({ ...f, devBuy: v })} className={`border px-2 py-0.5 ${f.devBuy === v ? "border-primary text-primary" : "border-border"}`}>{v}</Button>))}
              </div>
              <div className="mt-3 mb-1">PRIORIDADE</div>
              <div className="flex gap-1">{[["Normal", 0.0001], ["Rápida", 0.0005], ["Turbo", 0.002], ["Degen", 0.005]].map(([l, v]) => (
                <Button variant="ghost" key={l} onClick={() => setF({ ...f, priority: v as number })} className={`flex-1 border px-2 py-1 ${f.priority === v ? "border-primary text-primary bg-primary/10" : "border-border"}`}>{l} <span className="text-muted-foreground">{v}</span></Button>))}
              </div>
              <label className="mt-3 block">Slippage %<input className={inp} type="number" value={f.slippage} onChange={set("slippage")} /></label>
            </div>

            <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Taxa da plataforma</span><span>{fee} SOL</span></div>
              <div className="flex justify-between"><span>Dev buy</span><span>{f.devBuy} SOL</span></div>
              <div className="flex justify-between"><span>Prioridade + rede (≈)</span><span>{(f.priority + 0.02).toFixed(4)} SOL</span></div>
              <div className="flex justify-between font-bold text-foreground"><span>Total estimado</span><span>{total.toFixed(4)} SOL</span></div>
            </div>

            {steps.length > 0 && (
              <ul className="mt-3 space-y-1 border border-border bg-background p-2 text-xs">
                {steps.map((s, k) => (
                  <li key={k} className={s.state === "ok" ? "text-primary" : s.state === "err" ? "text-destructive" : s.state === "run" ? "text-foreground animate-pulse" : "text-muted-foreground"}>
                    [{s.state === "ok" ? "✓" : s.state === "err" ? "✗" : s.state === "run" ? "…" : " "}] {s.label}
                  </li>))}
              </ul>
            )}
            {error && <p className="mt-2 break-all text-xs text-destructive">ERRO: {error}</p>}

            <div className="mt-4">
              {publicKey ? (
                <Button variant="ghost" disabled={busy || !f.name || !f.symbol} onClick={launch} className="w-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50 hover:brightness-110">
                  {busy ? "LANÇANDO..." : `🚀 DEPLOY NA PUMP.FUN (${total.toFixed(3)} SOL)`}
                </Button>
              ) : (
                <div className="flex flex-col items-center gap-2"><span className="text-xs text-muted-foreground">Conecte sua Phantom para lançar</span><TrustButton /></div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
