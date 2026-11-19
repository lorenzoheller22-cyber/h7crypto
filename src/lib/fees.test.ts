import { describe, expect, it } from "vitest";
import { FEE_WALLET, feeLamports } from "./fees";

describe("taxas do serviço", () => {
  it("copiar moeda em alta custa 0.35 SOL", () => expect(feeLamports("copy")).toBe(350_000_000));
  it("criar moeda própria custa 0.2 SOL", () => expect(feeLamports("own")).toBe(200_000_000));
  it("taxas vão para a carteira do dono", () => expect(FEE_WALLET).toBe("DB2MjqPEfPmUFBXuZj7FaTBoWk7qtSMHX8kbFWVPM5su"));
});
