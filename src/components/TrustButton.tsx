import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

/** Phantom-only connect: in Phantom's browser/extension connects directly; on mobile browsers opens the Phantom app with this site. */
export function TrustButton() {
  const { wallets, select, connect, connected, connecting, wallet } = useWallet();
  const [pending, setPending] = useState(false);
  const phantom = wallets.find((w) => /phantom/i.test(w.adapter.name));

  useEffect(() => {
    if (pending && wallet && /phantom/i.test(wallet.adapter.name)) {
      setPending(false);
      connect().catch(() => {});
    }
  }, [pending, wallet, connect]);

  if (connected) return null;
  const onClick = () => {
    const injected = phantom && phantom.readyState === "Installed";
    if (injected) {
      select(phantom.adapter.name);
      setPending(true);
      return;
    }
    const mobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (mobile) {
      const url = encodeURIComponent(window.location.href);
      const ref = encodeURIComponent(window.location.origin);
      window.location.href = `https://phantom.app/ul/browse/${url}?ref=${ref}`;
    } else {
      window.open("https://phantom.app/download", "_blank");
    }
  };
  return (
    <Button variant="ghost" onClick={onClick} disabled={connecting} className="border border-primary bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/20 disabled:opacity-50">
      {connecting ? "Conectando..." : "👻 Conectar Phantom"}
    </Button>
  );
}
