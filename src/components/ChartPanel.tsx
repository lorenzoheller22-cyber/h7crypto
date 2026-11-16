import { X, ExternalLink } from "lucide-react";

export function ChartPanel({ mint, symbol, onClose }: { mint: string; symbol: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 sm:items-center sm:p-6" onClick={onClose}>
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-md border border-border bg-panel sm:h-[78vh] sm:rounded-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-10 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-foreground">{symbol}/SOL</span>
            <span className="num text-muted-foreground">{mint.slice(0, 4)}…{mint.slice(-4)}</span>
          </div>
          <div className="flex items-center gap-1">
            <a href={`https://dexscreener.com/solana/${mint}`} target="_blank" rel="noreferrer" className="flex h-7 items-center gap-1 rounded px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">
              DexScreener <ExternalLink className="h-3 w-3" />
            </a>
            <button onClick={onClose} aria-label="Fechar gráfico" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <iframe
          title={`Gráfico ${symbol}`}
          src={`https://dexscreener.com/solana/${mint}?embed=1&loadChartSettings=0&trades=0&tabs=0&info=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=usd&interval=1`}
          className="h-full w-full flex-1 border-0"
        />
      </div>
    </div>
  );
}
