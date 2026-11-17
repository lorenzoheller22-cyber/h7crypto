import { describe, it, expect } from "vitest";
import { shouldBump, budgetLeftUsd } from "./autobump";

const base = { nowMs: 100_000, spentSol: 0, solUsd: 150, budgetUsd: 2 };
describe("auto bump", () => {
  it("bumps when the coin is quiet for 45s", () => {
    expect(shouldBump({ ...base, lastTradeMs: 100_000 - 45_000 })).toBe(true);
  });
  it("does not bump while trades are recent", () => {
    expect(shouldBump({ ...base, lastTradeMs: 100_000 - 10_000 })).toBe(false);
  });
  it("never spends more than 2 dollars", () => {
    expect(budgetLeftUsd(0, 150, 10)).toBe(2);
    expect(shouldBump({ ...base, lastTradeMs: 0, spentSol: 0.0129 })).toBe(false);
  });
});
