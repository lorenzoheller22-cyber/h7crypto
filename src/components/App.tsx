import h7Logo from "@/assets/h7_logo.png.asset.json";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  ChevronRight, 
  Copy, 
  Layers, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Wallet, 
  X, 
  Zap,
  Globe,
  Send,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js";
import { Positions } from "./Positions";
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
type Tab = "trending" | "coins";

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
    () =>
      (data ?? []).filter(
        (t) =>
          (filter === "all" || t.source === filter) &&
          (!q || `${t.name} ${t.symbol}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [data, filter, q],
  );

  const solPrice = 180; // Preço de referência aproximado em USD
  const balanceUsd = balance !== null ? balance * solPrice : null;

  return (
    <div className="min-h-screen bg-[#0d0b1a] text-slate-100 flex flex-col font-sans selection:bg-violet-500/30 selection:text-violet-200">
      {/* Top Header Fintech / Street Aesthetic */}
      <header className="sticky top-0 z-30 border-b border-violet-950/40 bg-[#0d0b1a]/90 backdrop-blur-xl px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Logo H7 & User Badge */}
          <div className="flex items-center gap-3">
            <div className="relative flex shrink-0 items-center justify-center">
              <img src={h7Logo.url} alt="H7 CRYPTO" className="w-11 h-11 shrink-0 rounded-xl object-cover border border-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.35)]" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0d0b1a]" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">Olá,</span>
                <span className="text-xs font-bold text-slate-200">Lorenzo</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-violet-400">
                  H7 CRYPTO
                </span>
                <span className="text-[9px] px-1.5 py-0.2 font-semibold uppercase tracking-widest bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-full">
                  PRO
                </span>
              </div>
            </div>
          </div>

          {/* Right Wallet Action */}
          <div className="flex items-center gap-2">
            <TrustButton />
            <div className="[&_.wallet-adapter-button]:!h-9 [&_.wallet-adapter-button]:!px-3 [&_.wallet-adapter-button]:!text-xs [&_.wallet-adapter-button]:!font-semibold [&_.wallet-adapter-button]:!rounded-xl [&_.wallet-adapter-button]:!bg-violet-500/10 [&_.wallet-adapter-button]:!border [&_.wallet-adapter-button]:!border-violet-500/40 [&_.wallet-adapter-button]:hover:!bg-violet-500/20">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 space-y-4">
        {/* Hero Card: Saldo & Status da Conta */}
        <section className="relative overflow-hidden rounded-2xl border border-violet-900/30 bg-gradient-to-br from-[#160f2e]/80 via-[#1e1338]/90 to-[#07090e] p-5 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Saldo Disponível</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Solana Mainnet
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                  {balance !== null ? `${balance.toFixed(3)} SOL` : "— SOL"}
                </span>
                {balanceUsd !== null && (
                  <span className="text-sm font-semibold text-slate-400">
                    ≈ ${balanceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-1">
                {publicKey ? `Carteira: ${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : "Conecte sua Phantom para lançar e gerenciar tokens"}
              </p>
            </div>

            {/* Ações Rápidas em Pílula */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                size="sm"
                variant={tab === "trending" ? "default" : "outline"}
                onClick={() => setTab("trending")}
                className={`rounded-xl text-xs font-semibold h-10 ${tab === "trending" ? "bg-violet-500 hover:bg-violet-400 text-[#0b0818] font-bold shadow-lg shadow-violet-500/20" : "border-purple-900/40 bg-[#160f2e]/60 text-slate-300 hover:bg-purple-900/40"}`}
              >
                <Zap className="w-3.5 h-3.5 mr-1.5 text-violet-400" />
                Copiar Meme
              </Button>

              <Button
                size="sm"
                variant={tab === "coins" ? "default" : "outline"}
                onClick={() => setTab("coins")}
                className={`rounded-xl text-xs font-semibold h-10 ${tab === "coins" ? "bg-violet-500 hover:bg-violet-400 text-[#0b0818] font-bold shadow-lg shadow-violet-500/20" : "border-purple-900/40 bg-[#160f2e]/60 text-slate-300 hover:bg-purple-900/40"}`}
              >
                <Layers className="w-3.5 h-3.5 mr-1.5 text-violet-400" />
                Minhas Moedas
              </Button>

              <Button
                asChild
                size="sm"
                variant="outline"
                className="rounded-xl text-xs font-semibold h-10 border-purple-900/40 bg-[#160f2e]/60 text-slate-300 hover:bg-purple-900/40"
              >
                <a href="https://dexscreener.com/solana" target="_blank" rel="noreferrer">
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-violet-400" />
                  DexScreener
                  <ArrowUpRight className="w-3 h-3 ml-1 opacity-60" />
                </a>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded-xl text-xs font-semibold h-10 border-purple-900/40 bg-[#160f2e]/60 text-slate-300 hover:bg-purple-900/40"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-violet-400 ${isFetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </section>

        {/* View Switcher: Minhas Moedas ou Feed de Trending */}
        {tab === "coins" ? (
          <Positions />
        ) : (
          <section className="space-y-3">
            {/* Filtros e Busca */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar memecoin em alta por nome ou ticker..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#160f2e]/80 border border-purple-900/40 text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#160f2e]/80 border border-purple-900/40 text-xs">
                {(["all", "pump.fun", "dexscreener"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${filter === f ? "bg-violet-500 text-[#0b0818] font-bold" : "text-slate-400 hover:text-white"}`}
                  >
                    {f === "all" ? "Todos" : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Moedas em Alta */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((t) => (
                <div
                  key={`${t.source}-${t.mint}`}
                  className="group relative rounded-2xl border border-purple-900/40/80 bg-[#160f2e]/50 hover:bg-[#160f2e]/90 hover:border-violet-500/40 p-4 transition-all duration-200 flex flex-col justify-between gap-3 shadow-lg hover:shadow-violet-500/5"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={t.image || "/favicon.ico"}
                      alt={t.name}
                      className="w-12 h-12 rounded-xl object-cover border border-purple-900/40 bg-[#0b0818] shrink-0 group-hover:scale-105 transition-transform"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/favicon.ico"; }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-white text-sm truncate">{t.name}</h4>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-900/40 text-slate-400">
                          {t.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-semibold text-violet-400">${t.symbol}</span>
                        <span className="text-[11px] text-slate-500">• {ago(t.createdAt ?? Date.now())}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        <span className="text-slate-300 font-semibold">{fmtUsd(t.marketCap)} MC</span>
                        {t.volume24h ? <span className="text-slate-500 font-medium">{fmtUsd(t.volume24h)} Vol</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-900/40/60 flex items-center justify-between gap-2">
                    <a
                      href={t.source === "pump.fun" ? `https://pump.fun/${t.mint}` : `https://dexscreener.com/solana/${t.mint}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-400 hover:text-violet-400 flex items-center gap-1 transition-colors"
                    >
                      Ver Gráfico <ExternalLink className="w-3 h-3" />
                    </a>

                    <Button
                      size="sm"
                      onClick={() => setCopying(t)}
                      className="rounded-xl h-8 px-3 text-xs bg-violet-500 hover:bg-violet-400 text-[#0b0818] font-bold shadow-md shadow-violet-500/20"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      COPIAR & LANÇAR
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modal Turbinado de Cópia & Lançamento com Sniper Score */}
      {copying && (
        <LaunchModal
          token={copying}
          onClose={() => setCopying(null)}
          onSuccess={() => {
            setCopying(null);
            setTab("coins");
          }}
        />
      )}
    </div>
  );
}

// Modal Component com Radar de Metadados, Sniper Score e Selos de Confiança
function LaunchModal({
  token,
  onClose,
  onSuccess,
}: {
  token: TrendingToken;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [name, setName] = useState(token.name);
  const [symbol, setSymbol] = useState(token.symbol);
  const [desc, setDesc] = useState(token.description || `H7 Edition of ${token.name}`);
  const [devBuy, setDevBuy] = useState("0.2");
  const [twitter, setTwitter] = useState(token.twitter || "");
  const [telegram, setTelegram] = useState(token.telegram || "");
  const [website, setWebsite] = useState(token.website || "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  // Cálculo Dinâmico do Sniper Score (0 a 100%)
  const devBuyNum = parseFloat(devBuy) || 0;
  const score = useMemo(() => {
    let s = 40; // Base do token
    if (devBuyNum >= 0.1 && devBuyNum <= 0.6) s += 25; // Dev buy na zona de ouro
    else if (devBuyNum > 0.6 && devBuyNum <= 1.0) s += 10;
    if (twitter.trim()) s += 15;
    if (telegram.trim()) s += 10;
    if (website.trim()) s += 10;
    return Math.min(100, s);
  }, [devBuyNum, twitter, telegram, website]);

  const handleLaunch = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert("Por favor, conecte sua carteira primeiro.");
      return;
    }
    setBusy(true);
    setStatus("Preparando metadados...");
    try {
      const cfg = await getPlatformConfig();
      const mintKeypair = Keypair.generate();

      setStatus("Subindo imagem e metadados...");
      const { uri: metadataUri } = await uploadMetadata({
        data: {
          name,
          symbol,
          description: desc,
          imageUrl: token.image ?? undefined,
          twitter: twitter.trim() || undefined,
          telegram: telegram.trim() || undefined,
          website: website.trim() || undefined,
        },
      });

      setStatus("Construindo transação do contrato Pump.fun...");
      const { tx: b64 } = await buildCreateTx({
        data: {
          publicKey: wallet.publicKey.toBase58(),
          mint: mintKeypair.publicKey.toBase58(),
          name,
          symbol,
          uri: metadataUri,
          devBuySol: devBuyNum,
          priorityFee: 0.0005,
          slippage: 15,
        },
      });

      setStatus("Aguardando assinatura da carteira Phantom...");
      const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const tx = VersionedTransaction.deserialize(raw);
      tx.sign([mintKeypair]);

      const signed = await wallet.signTransaction(tx);
      setStatus("Enviando para a Solana Mainnet...");
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      savePosition({
        mint: mintKeypair.publicKey.toBase58(),
        owner: wallet.publicKey.toBase58(),
        name,
        symbol,
        image: token.image,
        investedSol: devBuyNum,
        createdAt: Date.now(),
        sig,
      });

      setStatus("Lançamento concluído com sucesso!");
      setTimeout(() => onSuccess(), 1500);
    } catch (e: any) {
      alert(`Erro no lançamento: ${e?.message || e}`);
      setBusy(false);
      setStatus("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-violet-500/40 bg-[#0a0f1d] p-6 shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Lançar Cópia Turbinada</h3>
              <p className="text-xs text-slate-400">Pump.fun Bonding Curve Direta</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-purple-900/40">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Radar de Atratividade / Sniper Score */}
        <div className="rounded-2xl border border-violet-500/20 bg-[#160f2e]/80 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Radar de Snipers & Atratividade
            </span>
            <span className={`text-sm font-extrabold px-2 py-0.5 rounded-full ${score >= 80 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : score >= 50 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
              {score}% {score >= 80 ? "🟢 EXCELENTE" : score >= 50 ? "🟡 MODERADO" : "🔴 BAIXO"}
            </span>
          </div>

          <div className="w-full bg-[#0b0818] h-2 rounded-full overflow-hidden border border-purple-900/40">
            <div
              className={`h-full transition-all duration-300 ${score >= 80 ? "bg-gradient-to-r from-emerald-500 to-violet-400" : score >= 50 ? "bg-amber-400" : "bg-red-500"}`}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {score >= 80 ? "Condições ideais! Metadados completos e compra inicial calibrada atraem bots de compra." : "Preencha as redes e mantenha Dev Buy entre 0.1 e 0.5 SOL para atingir 90%+."}
          </p>
        </div>

        {/* Campos de Nome e Ticker */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Nome da Moeda</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#0b0818] border border-purple-900/40 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Ticker / Símbolo</label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full h-10 px-3 rounded-xl bg-[#0b0818] border border-purple-900/40 text-sm text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Dev Buy Calibrada */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-300">Sua Compra Inicial (Dev Buy)</label>
            <span className="text-[11px] text-violet-400 font-semibold">Recomendado: 0.2 SOL</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {["0.1", "0.2", "0.5", "1.0"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setDevBuy(v)}
                className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${devBuy === v ? "bg-violet-500 text-[#0b0818] border-violet-400" : "bg-[#0b0818] border-purple-900/40 text-slate-300 hover:border-slate-700"}`}
              >
                {v} SOL
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.05"
            value={devBuy}
            onChange={(e) => setDevBuy(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-[#0b0818] border border-purple-900/40 text-sm text-white focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Tríplice Coroa de Redes Sociais */}
        <div className="space-y-2 pt-1 border-t border-purple-900/40">
          <span className="text-xs font-bold text-slate-300 block">Metadados de Confiança (Tríplice Coroa)</span>
          <div className="space-y-1.5 text-xs">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">X</span>
              <input
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://x.com/seu_token"
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#0b0818] border border-purple-900/40 text-white focus:border-violet-500 text-xs"
              />
            </div>
            <div className="relative">
              <Send className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="https://t.me/seu_canal"
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#0b0818] border border-purple-900/40 text-white focus:border-violet-500 text-xs"
              />
            </div>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://seusite.com"
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#0b0818] border border-purple-900/40 text-white focus:border-violet-500 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Selos de Segurança Automáticos */}
        <div className="grid grid-cols-3 gap-2 py-2 border-t border-purple-900/40 text-center">
          <div className="p-2 rounded-xl bg-[#0b0818] border border-purple-900/40">
            <span className="text-[10px] text-slate-400 block font-medium">Mint Authority</span>
            <span className="text-xs font-bold text-emerald-400">🛡️ Revogado</span>
          </div>
          <div className="p-2 rounded-xl bg-[#0b0818] border border-purple-900/40">
            <span className="text-[10px] text-slate-400 block font-medium">Freeze Authority</span>
            <span className="text-xs font-bold text-emerald-400">❄️ Revogado</span>
          </div>
          <div className="p-2 rounded-xl bg-[#0b0818] border border-purple-900/40">
            <span className="text-[10px] text-slate-400 block font-medium">Metadata</span>
            <span className="text-xs font-bold text-violet-400">🔒 Travado</span>
          </div>
        </div>

        {/* Botão de Disparo */}
        <div className="space-y-2 pt-2">
          {status && <p className="text-xs text-center font-medium text-violet-400 animate-pulse">{status}</p>}
          <Button
            onClick={handleLaunch}
            disabled={busy}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-400 hover:opacity-90 text-[#0b0818] font-black text-sm tracking-wider uppercase shadow-xl shadow-violet-500/25"
          >
            {busy ? "PROCESSANDO LANÇAMENTO..." : `LANÇAR NA PUMP.FUN COM ${devBuyNum} SOL`}
          </Button>
        </div>
      </div>
    </div>
  );
}
