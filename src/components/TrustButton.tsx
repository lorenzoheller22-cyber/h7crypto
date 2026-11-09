import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

/** Connects Trust Wallet: extension directly, or on mobile opens this site inside Trust's browser. */
export function TrustButton() {
  const { wallets, select, connect, connected, wallet } = useWallet();
  const [pending, setPending] = useState(false);
  const trust = wallets.find((w) => /trust/i.test(w.adapter.name));

  useEffect(() => {
    if (pending && wallet && /trust/i.test(wallet.adapter.name)) {
      setPending(false);
      connect().catch(() => {});
    }
  }, [pending, wallet, connect]);

  if (connected) return null;
  const onClick = () => {
    if (trust) { select(trust.adapter.name); setPending(true); return; }
    const mobile = /android|iphone|ipad/i.test(navigator.userAgent);
    if (mobile) {
      window.location.href = `https://link.trustwallet.com/open_url?coin_id=501&url=${encodeURIComponent(window.location.href)}`;
    } else {
      window.open("https://trustwallet.com/browser-extension", "_blank");
    }
  };
  return (
    <button onClick={onClick} className="border border-primary px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10">
      🛡 Trust Wallet
    </button>
  );
}
