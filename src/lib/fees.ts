import { PublicKey, SystemProgram, Transaction, type Connection } from "@solana/web3.js";

/** Carteira que recebe as taxas do H7 CRYPTO. */
export const FEE_WALLET = "DB2MjqPEfPmUFBXuZj7FaTBoWk7qtSMHX8kbFWVPM5su";

export type LaunchKind = "copy" | "own";

/** Taxa do serviço em SOL por tipo de lançamento. */
export const SERVICE_FEE_SOL: Record<LaunchKind, number> = { copy: 0.35, own: 0.2 };

export const feeLamports = (kind: LaunchKind) => Math.round(SERVICE_FEE_SOL[kind] * 1e9);

export async function buildFeeTx(connection: Connection, payer: PublicKey, kind: LaunchKind) {
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: payer, toPubkey: new PublicKey(FEE_WALLET), lamports: feeLamports(kind) }),
  );
  tx.feePayer = payer;
  tx.recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;
  return tx;
}
