import { Keypair } from "@solana/web3.js";

/** Rules for continuous auto-bump. */
export const AUTO_BUMP = {
  solPerBump: 0.001,      // tiny buy, a few cents
  feeSol: 0.0001,         // priority fee per bump
  idleSeconds: 45,        // bump only when nobody traded for this long
  checkMs: 15000,
  defaultBudgetUsd: 2,
  maxBudgetUsd: 2,
};

/** SOL that counts against the budget for one bump. */
export const bumpCostSol = () => AUTO_BUMP.solPerBump + AUTO_BUMP.feeSol;

export function budgetLeftUsd(spentSol: number, solUsd: number, budgetUsd: number) {
  const cap = Math.min(budgetUsd, AUTO_BUMP.maxBudgetUsd);
  return Math.max(0, cap - spentSol * solUsd);
}

/** Bump when the coin went quiet and the next bump still fits in the budget. */
export function shouldBump(o: { lastTradeMs: number; nowMs: number; spentSol: number; solUsd: number; budgetUsd: number; complete?: boolean }) {
  if (o.complete || !(o.solUsd > 0)) return false;
  if (budgetLeftUsd(o.spentSol, o.solUsd, o.budgetUsd) < bumpCostSol() * o.solUsd) return false;
  return o.nowMs - o.lastTradeMs >= AUTO_BUMP.idleSeconds * 1000;
}

const KEY = "h7-bump-wallet";
export function getBumpWallet(): Keypair {
  const raw = localStorage.getItem(KEY);
  if (raw) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  const k = Keypair.generate();
  localStorage.setItem(KEY, JSON.stringify(Array.from(k.secretKey)));
  return k;
}

const SPENT = "h7-bump-spent";
export const loadSpent = (mint: string): number => Number(JSON.parse(localStorage.getItem(SPENT) || "{}")[mint] ?? 0);
export const addSpent = (mint: string, sol: number) => {
  const all = JSON.parse(localStorage.getItem(SPENT) || "{}");
  all[mint] = Number(all[mint] ?? 0) + sol;
  localStorage.setItem(SPENT, JSON.stringify(all));
  return all[mint] as number;
};
export const resetSpent = (mint: string) => {
  const all = JSON.parse(localStorage.getItem(SPENT) || "{}");
  delete all[mint];
  localStorage.setItem(SPENT, JSON.stringify(all));
};
