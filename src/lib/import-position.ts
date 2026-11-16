import { PublicKey, type Connection } from "@solana/web3.js";
import type { Position } from "./positions";

const TOKEN_PROGRAMS = new Set([
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
]);

export function parseMint(address: string) {
  try {
    return new PublicKey(address.trim());
  } catch {
    throw new Error("Endereço inválido. Cole o CA completo da moeda na Solana.");
  }
}

export async function readImportBalance(connection: Connection, owner: PublicKey, mint: PublicKey) {
  const account = await connection.getParsedAccountInfo(mint);
  const value = account.value;
  if (!value || !TOKEN_PROGRAMS.has(value.owner.toBase58()) || !("parsed" in value.data) || value.data.parsed.type !== "mint") {
    throw new Error("Esse endereço não corresponde a uma moeda na Solana.");
  }
  const accounts = await connection.getParsedTokenAccountsByOwner(owner, { mint });
  return accounts.value.reduce((sum, item) => sum + Number(item.account.data.parsed.info.tokenAmount.uiAmountString ?? item.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0);
}

export function importedPosition(
  mint: string,
  owner: string,
  coin: { name: string; symbol: string; image: string | null },
  cost: string,
): Position {
  const known = cost.trim() !== "";
  const investedSol = known ? Number(cost) : 0;
  if (!Number.isFinite(investedSol) || investedSol < 0) throw new Error("Informe um custo válido em SOL ou deixe em branco.");
  return { mint, owner, ...coin, investedSol, costBasisKnown: known, createdAt: Date.now(), sig: "" };
}