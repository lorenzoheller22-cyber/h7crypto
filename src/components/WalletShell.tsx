import { Buffer } from "buffer";
if (typeof globalThis.Buffer === "undefined") (globalThis as any).Buffer = Buffer;
import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { App } from "./App";

export const RPC = import.meta.env.VITE_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

export default function WalletShell(_: { children?: ReactNode }) {
  // Phantom & Solflare register via Wallet Standard automatically.
  const wallets = useMemo(() => [], []);
  return (
    <ConnectionProvider endpoint={RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
