import { describe, expect, it, vi } from "vitest";
import { PublicKey, type Connection } from "@solana/web3.js";
import { importedPosition, parseMint, readImportBalance } from "./import-position";

const mint = new PublicKey("So11111111111111111111111111111111111111112");
const coin = { name: "Test", symbol: "TEST", image: null };

describe("imported positions", () => {
  it("accepts a complete CA and rejects invalid addresses", () => {
    expect(parseMint(` ${mint.toBase58()} `).toBase58()).toBe(mint.toBase58());
    expect(() => parseMint("not-a-mint")).toThrow("Endereço inválido");
  });
  it("does not invent an investment for an imported position", () => {
    expect(importedPosition(mint.toBase58(), "owner", coin, "")).toMatchObject({ investedSol: 0, costBasisKnown: false, owner: "owner" });
    expect(importedPosition(mint.toBase58(), "owner", coin, "1.5")).toMatchObject({ investedSol: 1.5, costBasisKnown: true });
    expect(() => importedPosition(mint.toBase58(), "owner", coin, "-1")).toThrow();
  });
  it("reads the sum of tokens belonging to the connected wallet", async () => {
    const getParsedTokenAccountsByOwner = vi.fn().mockResolvedValue({ value: [
      { account: { data: { parsed: { info: { tokenAmount: { uiAmountString: "12.5" } } } } } },
      { account: { data: { parsed: { info: { tokenAmount: { uiAmountString: "7" } } } } } },
    ] });
    const connection = {
      getParsedAccountInfo: vi.fn().mockResolvedValue({ value: { owner: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), data: { parsed: { type: "mint" } } } }),
      getParsedTokenAccountsByOwner,
    } as unknown as Connection;
    expect(await readImportBalance(connection, mint, mint)).toBe(19.5);
    expect(getParsedTokenAccountsByOwner).toHaveBeenCalledWith(mint, { mint });
  });
  it("rejects a wallet address instead of treating it as a token", async () => {
    const connection = { getParsedAccountInfo: vi.fn().mockResolvedValue({ value: { owner: new PublicKey("11111111111111111111111111111111"), data: {} } }) } as unknown as Connection;
    await expect(readImportBalance(connection, mint, mint)).rejects.toThrow("não corresponde a uma moeda");
  });
});