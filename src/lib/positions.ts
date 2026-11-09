export type Position = { mint: string; name: string; symbol: string; image: string | null; investedSol: number; createdAt: number; owner: string; sig: string };

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
