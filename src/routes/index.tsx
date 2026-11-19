import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Copy, Rocket, ShieldCheck, Zap } from "lucide-react";
import { getTrending } from "@/lib/pump.functions";
import { SERVICE_FEE_SOL } from "@/lib/fees";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "H7 CRYPTO — Lance sua memecoin em segundos" },
      { name: "description", content: "Crie ou copie memecoins na Pump.fun em 1 clique, com Phantom, DexScreener, Raydium e Solscan integrados." },
      { property: "og:title", content: "H7 CRYPTO — Lance sua memecoin em segundos" },
      { property: "og:description", content: "Terminal Solana para lançar memecoins em 1 clique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const APPS = [
  { name: "Phantom", role: "Carteira", domain: "phantom.app" },
  { name: "Pump.fun", role: "Lançamento", domain: "pump.fun" },
  { name: "DexScreener", role: "Gráficos", domain: "dexscreener.com" },
  { name: "Raydium", role: "Liquidez", domain: "raydium.io" },
  { name: "Solscan", role: "Explorador", domain: "solscan.io" },
  { name: "Jito", role: "Velocidade", domain: "jito.wtf" },
];

const fmt = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`);

function Landing() {
  const { data } = useQuery({ queryKey: ["trending"], queryFn: () => getTrending(), refetchInterval: 15000 });
  const tick = (data ?? []).slice(0, 14);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,var(--primary)_0%,transparent_65%)] opacity-25" />

      {tick.length > 0 && (
        <div className="relative border-b border-border bg-panel/80 py-2 text-xs">
          <div className="landing-marquee flex w-max gap-6 whitespace-nowrap">
            {[...tick, ...tick].map((t, i) => (
              <span key={i} className="num flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                <span className="font-semibold">${t.symbol}</span>
                <span className="text-muted-foreground">{fmt(t.marketCap)}</span>
                {t.change ? <span className={t.change >= 0 ? "text-positive" : "text-destructive"}>{t.change >= 0 ? "+" : ""}{t.change.toFixed(0)}%</span> : null}
              </span>
            ))}
          </div>
        </div>
      )}

      <main className="relative mx-auto max-w-3xl px-5 pb-16 pt-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 text-[11px] text-muted-foreground">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" /><span className="relative h-2 w-2 rounded-full bg-positive" /></span>
          Solana Mainnet · ao vivo
        </span>
        <h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">H7 CRYPTO</h1>
        <p className="mt-4 text-2xl font-bold leading-tight md:text-3xl">
          Sua memecoin no ar em <span className="text-primary">10 segundos.</span>
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Crie do zero ou copie o que está bombando agora. Uma aprovação na Phantom e sua moeda já está na Pump.fun.
        </p>

        <Link to="/terminal" className="landing-cta group mt-8 inline-flex h-14 items-center gap-2 rounded-2xl bg-primary px-8 text-base font-bold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95">
          <Rocket className="h-5 w-5" /> Lançar minha moeda agora <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
        <p className="mt-3 text-[11px] text-muted-foreground">A taxa só é cobrada se o lançamento for confirmado.</p>

        <div className="mt-10 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
          <Link to="/terminal" className="rounded-2xl border border-primary/50 bg-panel p-5 transition-colors hover:border-primary">
            <Rocket className="h-6 w-6 text-primary" />
            <div className="mt-3 font-bold">Criar moeda própria</div>
            <div className="mt-1 text-xs text-muted-foreground">Seu nome, sua imagem, suas redes.</div>
            <div className="num mt-3 text-xs font-semibold">{SERVICE_FEE_SOL.own} SOL</div>
          </Link>
          <Link to="/terminal" className="rounded-2xl border border-border bg-panel p-5 transition-colors hover:border-primary">
            <Copy className="h-6 w-6 text-positive" />
            <div className="mt-3 font-bold">Copiar moeda em alta</div>
            <div className="mt-1 text-xs text-muted-foreground">Pegue a onda do que está subindo agora.</div>
            <div className="num mt-3 text-xs font-semibold">{SERVICE_FEE_SOL.copy} SOL</div>
          </Link>
        </div>

        <div className="mt-12">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Integrado com</div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {APPS.map((a) => (
              <div key={a.name} className="flex items-center gap-3 rounded-xl border border-border bg-panel px-3 py-2.5 text-left">
                <img src={`https://www.google.com/s2/favicons?domain=${a.domain}&sz=64`} alt="" className="h-8 w-8 rounded-lg bg-secondary" />
                <div><div className="text-sm font-semibold">{a.name}</div><div className="text-[11px] text-muted-foreground">{a.role}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> 1 aprovação na carteira</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Sem custódia de fundos</span>
        </div>
        <p className="mx-auto mt-8 max-w-md text-[10px] text-muted-foreground">Memecoins são de alto risco. Nada garante compradores ou lucro; lance apenas com valores que pode perder.</p>
      </main>
    </div>
  );
}
