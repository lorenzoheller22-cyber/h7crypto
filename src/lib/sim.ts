/** Paper-trading simulation: virtual SOL bank, no real transactions. */
export type SimPos = { id: string; name: string; symbol: string; image: string | null; invested: number; mult: number; createdAt: number; history: number[] };
export type SimState = { bank: number; positions: SimPos[]; realized: number };

export const START_BANK = 5;
const KEY = "heller.sim";

export function loadSim(): SimState {
  try { const s = JSON.parse(localStorage.getItem(KEY) || ""); if (s && typeof s.bank === "number") return s; } catch { /* empty */ }
  return { bank: START_BANK, positions: [], realized: 0 };
}
export function saveSim(s: SimState) { localStorage.setItem(KEY, JSON.stringify(s)); }

export function launch(s: SimState, t: { name: string; symbol: string; image: string | null }, sol: number): SimState {
  if (sol <= 0 || sol > s.bank) return s;
  const p: SimPos = { id: `${Date.now()}`, ...t, invested: sol, mult: 1, createdAt: Date.now(), history: [1] };
  return { ...s, bank: s.bank - sol, positions: [p, ...s.positions] };
}

/** One market tick: early buyers push up, later dumps more likely. */
export function tick(p: SimPos, rnd = Math.random): SimPos {
  const age = (Date.now() - p.createdAt) / 1000;
  const drift = age < 30 ? 0.04 : age < 120 ? 0.005 : -0.015;
  let m = p.mult * (1 + drift + (rnd() - 0.5) * 0.18);
  if (rnd() < 0.01) m *= 0.4; // rug/dump event
  m = Math.max(0.02, m);
  return { ...p, mult: m, history: [...p.history.slice(-59), m] };
}

/** Sell a percent of a position; returns new state and SOL received. */
export function sell(s: SimState, id: string, percent: number): SimState {
  const p = s.positions.find((x) => x.id === id);
  if (!p) return s;
  const f = Math.min(100, Math.max(0, percent)) / 100;
  const got = p.invested * p.mult * f;
  const cost = p.invested * f;
  const rest = { ...p, invested: p.invested - cost };
  return {
    bank: s.bank + got,
    realized: s.realized + (got - cost),
    positions: f >= 1 ? s.positions.filter((x) => x.id !== id) : s.positions.map((x) => (x.id === id ? rest : x)),
  };
}
