export type Position = { mint: string; name: string; symbol: string; image: string | null; investedSol: number; costBasisKnown?: boolean; createdAt: number; owner: string; sig: string };

const KEY = "copytrend.positions";

export function loadPositions(): Position[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function savePosition(p: Position) {
  const all = loadPositions().filter((x) => x.mint !== p.mint);
  localStorage.setItem(KEY, JSON.stringify([p, ...all]));
  window.dispatchEvent(new Event("positions-changed"));
}
export function removePosition(mint: string) {
  localStorage.setItem(KEY, JSON.stringify(loadPositions().filter((x) => x.mint !== mint)));
  window.dispatchEvent(new Event("positions-changed"));
}

/** PnL in SOL given current value and amount invested. */
export function pnl(currentSol: number, investedSol: number) {
  const diff = currentSol - investedSol;
  return { diff, pct: investedSol > 0 ? (diff / investedSol) * 100 : 0 };
}

export type Alerts = { tp?: number; sl?: number };
const AKEY = "h7.alerts";
export function loadAlerts(): Record<string, Alerts> {
  try { return JSON.parse(localStorage.getItem(AKEY) || "{}"); } catch { return {}; }
}
export function saveAlerts(mint: string, a: Alerts) {
  const all = loadAlerts(); all[mint] = a;
  localStorage.setItem(AKEY, JSON.stringify(all));
}
/** Which alert (if any) is hit at the given PnL %. */
export function alertState(pct: number, a: Alerts | undefined): "tp" | "sl" | null {
  if (!a) return null;
  if (a.tp != null && pct >= a.tp) return "tp";
  if (a.sl != null && pct <= -Math.abs(a.sl)) return "sl";
  return null;
}

export function shillText(p: { name: string; symbol: string; mint: string }) {
  return `$${p.symbol} (${p.name}) is live on Pump.fun.\n\nCA: ${p.mint}\nhttps://pump.fun/${p.mint}`;
}
