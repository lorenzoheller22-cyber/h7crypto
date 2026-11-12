import { useEffect, useState } from "react";
import type { TrendingToken } from "@/lib/pump.functions";
import { launch, loadSim, saveSim, sell, tick, START_BANK, type SimPos, type SimState } from "@/lib/sim";

export function Simulator({ tokens }: { tokens: TrendingToken[] }) {
  const [s, setS] = useState<SimState>({ bank: START_BANK, positions: [], realized: 0 });
  const [buy, setBuy] = useState(0.2);
  useEffect(() => { setS(loadSim()); }, []);
  useEffect(() => { saveSim(s); }, [s]);
  useEffect(() => {
    const id = setInterval(() => setS((x) => ({ ...x, positions: x.positions.map((p) => tick(p)) })), 1500);
    return () => clearInterval(id);
  }, []);

  const open = s.positions.reduce((a, p) => a + p.invested * p.mult, 0);
  const inv = s.positions.reduce((a, p) => a + p.invested, 0);
  const total = s.bank + open;
  const gain = total - START_BANK;

  return (
    <div>
      <div className="mb-4 border border-primary/50 bg-primary/10 p-3 text-xs text-primary">
        🧪 MODO SIMULAÇÃO — SOL fictício. Os compradores e preços são simulados e não preveem o resultado real.
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <Stat l="Banca livre" v={`${s.bank.toFixed(3)} SOL`} />
        <Stat l="Em posições" v={`${open.toFixed(3)} SOL`} />
        <Stat l="Lucro aberto" v={`${(open - inv >= 0 ? "+" : "")}${(open - inv).toFixed(3)} SOL`} good={open - inv >= 0} />
        <Stat l="Resultado total" v={`${gain >= 0 ? "+" : ""}${gain.toFixed(3)} SOL`} good={gain >= 0} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Dev Buy:</span>
        {[0.2, 0.5, 1].map((v) => (
          <button key={v} onClick={() => setBuy(v)} className={`border px-2 py-1 ${buy === v ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{v} SOL</button>
        ))}
        <button onClick={() => confirm("Zerar simulação?") && setS({ bank: START_BANK, positions: [], realized: 0 })} className="ml-auto border border-border px-2 py-1 hover:border-destructive">↺ Zerar</button>
      </div>

      {s.positions.length > 0 && <div className="mb-6 space-y-3">{s.positions.map((p) => <Row key={p.id} p={p} onSell={(pct) => setS((x) => sell(x, p.id, pct))} />)}</div>}

      <h2 className="mb-2 text-sm font-bold">Escolha uma moeda para copiar (teste)</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {tokens.slice(0, 18).map((t) => (
          <div key={t.mint} className="flex items-center gap-2 border border-border bg-card p-2 text-xs">
            {t.image ? <img src={t.image} alt="" className="h-9 w-9 object-cover" /> : <div className="h-9 w-9 bg-muted" />}
            <div className="min-w-0 flex-1 truncate"><b className="text-primary">${t.symbol}</b> {t.name}</div>
            <button disabled={buy > s.bank} onClick={() => setS((x) => launch(x, t, buy))} className="bg-primary px-2 py-1 font-bold text-primary-foreground disabled:opacity-40">COPY</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ l, v, good }: { l: string; v: string; good?: boolean }) {
  return (
    <div className="border border-border bg-card p-3">
      <div className="uppercase text-muted-foreground">{l}</div>
      <div className={`mt-1 font-bold ${good === undefined ? "" : good ? "text-primary" : "text-destructive"}`}>{v}</div>
    </div>
  );
}

function Row({ p, onSell }: { p: SimPos; onSell: (pct: number) => void }) {
  const [pct, setPct] = useState(50);
  const value = p.invested * p.mult;
  const diff = value - p.invested;
  const max = Math.max(...p.history), min = Math.min(...p.history);
  const pts = p.history.map((m, i) => `${(i / Math.max(1, p.history.length - 1)) * 100},${30 - ((m - min) / (max - min || 1)) * 30}`).join(" ");
  const secs = Math.floor((Date.now() - p.createdAt) / 1000);
  return (
    <div className="border border-border bg-card p-3 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        {p.image ? <img src={p.image} alt="" className="h-10 w-10 object-cover" /> : <div className="h-10 w-10 bg-muted" />}
        <div className="min-w-0 flex-1"><b className="text-primary">${p.symbol}</b> {p.name}<div className="text-muted-foreground">há {secs}s · {p.mult.toFixed(2)}x</div></div>
        <svg viewBox="0 0 100 30" className="h-8 w-28" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={diff >= 0 ? "var(--primary)" : "var(--destructive)"} strokeWidth="1.5" /></svg>
        <div className="text-right">
          <div className="text-muted-foreground">Investido {p.invested.toFixed(3)} · Valor {value.toFixed(3)}</div>
          <b className={diff >= 0 ? "text-primary" : "text-destructive"}>{diff >= 0 ? "+" : ""}{diff.toFixed(3)} SOL ({((p.mult - 1) * 100).toFixed(0)}%)</b>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {[25, 50, 75, 100].map((v) => (
          <button key={v} onClick={() => setPct(v)} className={`border px-2 py-1 ${pct === v ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{v}%</button>
        ))}
        <span className="text-muted-foreground">≈ {(value * pct / 100).toFixed(3)} SOL</span>
        <button onClick={() => onSell(100)} className="ml-auto bg-destructive px-3 py-1 font-bold text-destructive-foreground">🚨 DUMP ALL</button>
        <button onClick={() => onSell(pct)} className="bg-primary px-3 py-1 font-bold text-primary-foreground">RESGATAR {pct}%</button>
      </div>
    </div>
  );
}
