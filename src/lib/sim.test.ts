import { describe, it, expect } from "vitest";
import { launch, sell, START_BANK } from "./sim";

const base = { bank: START_BANK, positions: [], realized: 0 };
const t = { name: "A", symbol: "A", image: null };

describe("simulação", () => {
  it("começa com 5 SOL virtuais e desconta o dev buy", () => {
    expect(launch(base, t, 0.2).bank).toBeCloseTo(4.8);
  });
  it("não deixa investir mais que a banca", () => {
    expect(launch(base, t, 6).positions.length).toBe(0);
  });
  it("vender 100% a 3x devolve 0.6 SOL e lucro 0.4", () => {
    const s = launch(base, t, 0.2);
    s.positions[0]!.mult = 3;
    const r = sell(s, s.positions[0]!.id, 100);
    expect(r.bank).toBeCloseTo(5.4);
    expect(r.realized).toBeCloseTo(0.4);
    expect(r.positions.length).toBe(0);
  });
});
