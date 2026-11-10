import "@/lib/polyfills";
import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { TrustWalletAdapter } from "@solana/wallet-adapter-trust";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { App } from "./App";

export const RPC = import.meta.env['VITE_SOLANA_RPC'] || "https://api.mainnet-beta.solana.com";

export default function WalletShell(_: { children?: ReactNode }) {
  const wallets = useMemo(() => [new TrustWalletAdapter(), new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
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
