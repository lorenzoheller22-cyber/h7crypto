import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { buildSellTx, getCoinsInfo } from "@/lib/pump.functions";
import { loadPositions, pnl, removePosition, type Position } from "@/lib/positions";
import { 
  ExternalLink, 
  Flame, 
  Layers, 
  RefreshCw, 
  Rocket, 
  Trash2, 
  TrendingUp, 
  Zap 
} from "lucide-react";

export function Positions() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [all, setAll] = useState<Position[]>([]);
  const [sellingMint, setSellingMint] = useState<string | null>(null);

  useEffect(() => {
    const r = () => setAll(loadPositions());
    r();
    window.addEventListener("positions-changed", r);
    return () => window.removeEventListener("positions-changed", r);
  }, []);

  const mine = publicKey ? all.filter((p) => p.owner === publicKey.toBase58()) : [];
  const mints = mine.map((p) => p.mint);

  const info = useQuery({
    queryKey: ["coins", mints],
    enabled: mints.length > 0,
    queryFn: () => getCoinsInfo({ data: { mints } }),
    refetchInterval: 15000,
  });

  const bal = useQuery({
    queryKey: ["balances", publicKey?.toBase58(), mints],
    enabled: !!publicKey && mints.length > 0,
    refetchInterval: 15000,
    queryFn: async () => {
      if (!publicKey) return {};
      const out: Record<string, number> = {};
      await Promise.all(
        mints.map(async (m) => {
          try {
            const r = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: new PublicKey(m) });
            out[m] = r.value.reduce((s, a) => s + Number(a.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0);
          } catch {
            out[m] = 0;
          }
        }),
      );
      return out;
    },
  });

  const refresh = () => {
    info.refetch();
    bal.refetch();
  };

  const rows = mine.map((p) => {
    const c = info.data?.[p.mint];
    const tokens = bal.data?.[p.mint] ?? 0;
    const value = c ? tokens * c.priceSol : 0;
    const { diff, pct } = pnl(value, p.investedSol);
    return { p, c, tokens, value, diff, pct };
  });

  const handleSellPercent = async (mint: string, percent: number) => {
    if (!publicKey || !signTransaction) {
      alert("Conecte sua carteira primeiro.");
      return;
    }
    setSellingMint(mint);
    try {
      const { tx: b64 } = await buildSellTx({
        data: {
          publicKey: publicKey.toBase58(),
          mint,
          percent,
          priorityFee: 0.005,
          slippage: 15,
        },
      });

      const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const tx = VersionedTransaction.deserialize(raw);
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });

      alert(`Ordem de venda (${percent}%) enviada com sucesso! Tx: ${sig.slice(0, 8)}...`);
      setTimeout(() => refresh(), 2000);
    } catch (e: any) {
      alert(`Falha na venda: ${e?.message || e}`);
    } finally {
      setSellingMint(null);
    }
  };

  if (!publicKey) {
    return (
      <div className="rounded-3xl border border-purple-900/30 bg-[#120b24]/80 p-8 text-center space-y-3">
        <Layers className="w-10 h-10 text-purple-400 mx-auto opacity-80" />
        <h3 className="font-bold text-white text-base">Conecte sua carteira para ver seus tokens</h3>
        <p className="text-xs text-purple-300/60 max-w-sm mx-auto">
          Gerencie suas posições, dê PUMP de impulso ou execute saídas rápidas e DUMP ALL.
        </p>
        <div className="inline-block [&_.wallet-adapter-button]:!rounded-xl [&_.wallet-adapter-button]:!bg-purple-600 [&_.wallet-adapter-button]:!text-white [&_.wallet-adapter-button]:!font-bold">
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  if (mine.length === 0) {
    return (
      <div className="rounded-3xl border border-purple-900/30 bg-[#120b24]/80 p-8 text-center space-y-3">
        <Rocket className="w-10 h-10 text-purple-400 mx-auto opacity-80" />
        <h3 className="font-bold text-white text-base">Nenhum token lançado nesta carteira</h3>
        <p className="text-xs text-purple-300/60 max-w-sm mx-auto">
          Vá na aba "Descobrir", escolha uma memecoin em alta e clique em "COPIAR & LANÇAR".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Minhas Memecoins Lançadas</h2>
          <p className="text-xs text-purple-300/60">Controle de liquidez, impulso PUMP e saídas rápidas</p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} className="rounded-2xl h-9 text-xs border-purple-900/40 bg-[#130d24] text-purple-200 hover:bg-purple-900/30">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-purple-300" /> Atualizar PnL
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rows.map(({ p, c, tokens, diff, pct }) => {
          const isProfitable = diff >= 0;
          const progress = c?.progress ?? 0;

          return (
            <div
              key={p.mint}
              className="rounded-3xl border border-purple-900/40 bg-gradient-to-b from-[#160f2d] to-[#0e091d] p-5 shadow-xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <img
                    src={p.image || "/favicon.ico"}
                    alt={p.name}
                    className="w-13 h-13 rounded-2xl object-cover border border-purple-500/30 bg-purple-950 shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-white text-base">{p.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-purple-400">${p.symbol}</span>
                      <span className="text-[11px] text-purple-300/50 font-mono">
                        {p.mint.slice(0, 4)}...{p.mint.slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-base font-black ${isProfitable ? "text-emerald-400" : "text-rose-400"}`}>
                    {isProfitable ? "+" : ""}{diff.toFixed(3)} SOL
                  </span>
                  <div className={`text-xs font-bold ${isProfitable ? "text-emerald-500" : "text-rose-500"}`}>
                    {isProfitable ? "+" : ""}{pct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Barra de Progresso da Bonding Curve (Até 85k / Raydium) */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#0b0818] border border-purple-900/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-300/70 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Progresso da Bonding Curve
                  </span>
                  <span className="font-bold text-white">{progress.toFixed(1)}% {c?.complete ? "🎓 GRADUADO!" : ""}</span>
                </div>
                <div className="w-full bg-[#120b24] h-2.5 rounded-full overflow-hidden border border-purple-950">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-purple-300/50">
                  <span>0k (Início)</span>
                  <span>Meta: $85k (Pool Raydium)</span>
                </div>
              </div>

              {/* Botões de PUMP e DUMP */}
              <div className="space-y-2 pt-2 border-t border-purple-900/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    asChild
                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:opacity-90 text-slate-950 font-black text-xs uppercase shadow-lg shadow-orange-500/20 border-none"
                  >
                    <a href={`https://pump.fun/${p.mint}`} target="_blank" rel="noreferrer">
                      <Flame className="w-4 h-4 mr-1.5 fill-current" />
                      🚀 IMPULSO PUMP (SUBIR AO TOPO)
                    </a>
                  </Button>

                  <Button
                    onClick={() => handleSellPercent(p.mint, 100)}
                    disabled={sellingMint === p.mint || tokens <= 0}
                    className="w-full h-11 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase shadow-lg shadow-rose-600/20 border-none"
                  >
                    🚨 DUMP ALL (RESGATAR 100% SOL)
                  </Button>
                </div>

                {/* Vendas Parciais DCA (25%, 50%, 75%) */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[25, 50, 75].map((percent) => (
                    <Button
                      key={percent}
                      size="sm"
                      variant="outline"
                      onClick={() => handleSellPercent(p.mint, percent)}
                      disabled={sellingMint === p.mint || tokens <= 0}
                      className="rounded-xl h-9 text-[11px] font-bold border-purple-900/40 bg-[#0b0818] hover:bg-purple-900/30 text-purple-200"
                    >
                      Vender {percent}%
                    </Button>
                  ))}

                  <button
                    onClick={() => {
                      if (confirm("Remover este token da sua lista de monitoramento?")) {
                        removePosition(p.mint);
                      }
                    }}
                    className="rounded-xl h-9 flex items-center justify-center text-purple-400/60 hover:text-rose-400 hover:bg-[#0b0818] border border-purple-900/40 text-xs transition-colors"
                    title="Remover do painel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Links Rápidos DexScreener & Photon */}
              <div className="flex items-center justify-between pt-2 border-t border-purple-900/30 text-xs text-purple-300/60">
                <span>Hold: {tokens.toLocaleString()} tokens</span>
                <div className="flex items-center gap-3.5">
                  <a
                    href={`https://dexscreener.com/solana/${p.mint}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-purple-300 flex items-center gap-1 transition-colors"
                  >
                    DexScreener <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={`https://photon-sol.tinyastro.io/en/lp/${p.mint}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-purple-300 flex items-center gap-1 transition-colors"
                  >
                    Photon <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
