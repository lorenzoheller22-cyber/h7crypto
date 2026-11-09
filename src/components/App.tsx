import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js";
import { buildCreateTx, getPlatformConfig, getTrending, uploadMetadata, type TrendingToken } from "@/lib/pump.functions";

const fmtUsd = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`;
const ago = (ts: number | null) => {
  if (!ts) return "—";
  const s = Math.max(0, (Date.now() - ts) / 1000);
  return s < 60 ? `${s | 0}s` : s < 3600 ? `${(s / 60) | 0}m` : s < 86400 ? `${(s / 3600) | 0}h` : `${(s / 86400) | 0}d`;
};

type Filter = "all" | "pump.fun" | "dexscreener";

export function App() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [copying, setCopying] = useState<TrendingToken | null>(null);
  const { data, isFetching, dataUpdatedAt } = useQuery({
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

  return (
    <div className="min-h-screen font-mono">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-primary text-xl">▲</span>
            <span className="font-bold tracking-tight">copytrend<span className="text-primary">.fun</span></span>
            <span className="hidden sm:inline text-xs text-muted-foreground">// copy trending coins → pump.fun</span>
          </div>
          <WalletMultiButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <section className="mb-6">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Copie o que está <span className="text-primary glow">pumpando</span>.<br />Lance em 1 clique.
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Feed ao vivo da Solana &amp; Pump.fun. Clique em COPY, ajuste o dev buy e faça deploy com compradores esperando.
          </p>
        </section>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          {(["all", "pump.fun", "dexscreener"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`border px-3 py-1.5 uppercase ${filter === f ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {f}
            </button>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="> buscar ticker..."
            className="ml-auto w-48 border border-border bg-card px-3 py-1.5 outline-none focus:border-primary" />
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className={`h-2 w-2 rounded-full bg-primary ${isFetching ? "animate-ping" : ""}`} />
            LIVE {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : ""}
          </span>
        </div>

        {!data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-36 animate-pulse border border-border bg-card" />)}
          </div>
        ) : list.length === 0 ? (
          <p className="text-muted-foreground">Nenhum token encontrado.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => <TokenCard key={t.mint} t={t} onCopy={() => setCopying(t)} />)}
          </div>
        )}
      </main>
      {copying && <LaunchModal token={copying} onClose={() => setCopying(null)} />}
    </div>
  );
}

function TokenCard({ t, onCopy }: { t: TrendingToken; onCopy: () => void }) {
  return (
    <div className="group border border-border bg-card p-3 transition hover:border-primary/60">
      <div className="flex gap-3">
        {t.image ? <img src={t.image} alt={t.symbol} loading="lazy" className="h-16 w-16 shrink-0 object-cover border border-border" />
          : <div className="h-16 w-16 shrink-0 bg-muted" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold text-primary">${t.symbol}</span>
            <span className="text-[10px] uppercase text-muted-foreground border border-border px-1">{t.source}</span>
          </div>
          <div className="truncate text-sm">{t.name}</div>
          <div className="mt-1 grid grid-cols-2 gap-x-2 text-xs text-muted-foreground">
            <span>MC <b className="text-foreground">{fmtUsd(t.marketCap)}</b></span>
            <span>VOL <b className="text-foreground">{fmtUsd(t.volume24h)}</b></span>
            <span>AGE <b className="text-foreground">{ago(t.createdAt)}</b></span>
            <span>24h <b className={t.change >= 0 ? "text-primary" : "text-destructive"}>{t.change >= 0 ? "+" : ""}{t.change.toFixed(1)}%</b></span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2 text-xs">
        <button onClick={onCopy} className="flex-1 bg-primary py-2 font-bold text-primary-foreground hover:brightness-110">⧉ COPY &amp; LAUNCH</button>
        <a href={`https://pump.fun/coin/${t.mint}`} target="_blank" rel="noreferrer" className="border border-border px-2 py-2 hover:border-primary">pump</a>
        <a href={`https://dexscreener.com/solana/${t.mint}`} target="_blank" rel="noreferrer" className="border border-border px-2 py-2 hover:border-primary">dex</a>
      </div>
    </div>
  );
}

type Step = { label: string; state: "idle" | "run" | "ok" | "err" };

function LaunchModal({ token, onClose }: { token: TrendingToken; onClose: () => void }) {
  const { connection } = useConnection();
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const cfg = useQuery({ queryKey: ["cfg"], queryFn: () => getPlatformConfig() });
  const [f, setF] = useState({
    name: token.name, symbol: token.symbol.toUpperCase().slice(0, 10),
    description: token.description || `${token.name} — the next ${token.symbol}. Community driven.`,
    twitter: token.twitter ?? "", telegram: token.telegram ?? "", website: token.website ?? "",
    devBuy: 0.5, priority: 0.0005, slippage: 10,
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(token.image);
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ mint: string; sig: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (file) { const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); } }, [file]);

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
      const meta = await uploadMetadata({ data: { name: f.name, symbol: f.symbol, description: f.description, imageUrl: token.image ?? undefined, imageBase64, imageType: file?.type, twitter: f.twitter, telegram: f.telegram, website: f.website } });
      mark(i++, "ok"); mark(i, "run");
      const mint = Keypair.generate();
      const { tx } = await buildCreateTx({ data: { publicKey: publicKey.toBase58(), mint: mint.publicKey.toBase58(), name: meta.name, symbol: meta.symbol, uri: meta.uri, devBuySol: f.devBuy, priorityFee: f.priority, slippage: f.slippage } });
      const vtx = VersionedTransaction.deserialize(Uint8Array.from(atob(tx), (c) => c.charCodeAt(0)));
      vtx.sign([mint]);
      mark(i++, "ok"); mark(i, "run");
      const signed = await signTransaction(vtx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true, maxRetries: 3 });
      mark(i++, "ok"); mark(i, "run");
      await connection.confirmTransaction(sig, "confirmed");
      mark(i, "ok");
      setResult({ mint: mint.publicKey.toBase58(), sig });
    } catch (e: any) {
      mark(i, "err"); setError(e?.message ?? String(e));
    } finally { setBusy(false); }
  }

  const inp = "w-full border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={() => !busy && onClose()}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-primary/50 bg-card p-5 font-mono shadow-[var(--shadow-glow)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold"><span className="text-primary">&gt;</span> copy_launch <span className="text-muted-foreground">${token.symbol}</span></h2>
          <button onClick={onClose} disabled={busy} className="text-muted-foreground hover:text-foreground">[x]</button>
        </div>

        {result ? (
          <div className="space-y-3">
            <p className="text-primary text-lg font-bold">✓ TOKEN LANÇADO</p>
            <p className="break-all text-xs text-muted-foreground">Mint: {result.mint}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <a className="bg-primary px-3 py-2 font-bold text-primary-foreground" href={`https://pump.fun/coin/${result.mint}`} target="_blank" rel="noreferrer">Ver no Pump.fun ↗</a>
              <a className="border border-border px-3 py-2 hover:border-primary" href={`https://dexscreener.com/solana/${result.mint}`} target="_blank" rel="noreferrer">DexScreener ↗</a>
              <a className="border border-border px-3 py-2 hover:border-primary" href={`https://solscan.io/tx/${result.sig}`} target="_blank" rel="noreferrer">Solscan ↗</a>
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
              <div className="mt-1 flex gap-1">{[0, 0.25, 0.5, 1, 2].map((v) => (
                <button key={v} onClick={() => setF({ ...f, devBuy: v })} className={`border px-2 py-0.5 ${f.devBuy === v ? "border-primary text-primary" : "border-border"}`}>{v}</button>))}
              </div>
              <div className="mt-3 mb-1">PRIORIDADE</div>
              <div className="flex gap-1">{[["Normal", 0.0001], ["Rápida", 0.0005], ["Turbo", 0.002], ["Degen", 0.005]].map(([l, v]) => (
                <button key={l} onClick={() => setF({ ...f, priority: v as number })} className={`flex-1 border px-2 py-1 ${f.priority === v ? "border-primary text-primary bg-primary/10" : "border-border"}`}>{l} <span className="text-muted-foreground">{v}</span></button>))}
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
                <button disabled={busy || !f.name || !f.symbol} onClick={launch} className="w-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50 hover:brightness-110">
                  {busy ? "LANÇANDO..." : `🚀 DEPLOY NA PUMP.FUN (${total.toFixed(3)} SOL)`}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-2"><span className="text-xs text-muted-foreground">Conecte sua carteira para lançar</span><WalletMultiButton /></div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
