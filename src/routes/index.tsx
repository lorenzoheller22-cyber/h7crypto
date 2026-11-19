import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// Polyfills must finish before any Solana module evaluates (bundlers may hoist imports).
const WalletShell = lazy(() => import("@/lib/polyfills").then(() => import("@/components/WalletShell")));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "H7 CRYPTO — Moedas em alta na Solana" },
      { name: "description", content: "Feed ao vivo de tokens trending da Solana e Pump.fun. Copie em 1 clique e faça deploy com dev buy." },
      { property: "og:title", content: "H7 CRYPTO — Moedas em alta na Solana" },
      { property: "og:description", content: "Copie tokens em alta e lance na Pump.fun com dev buy e prioridade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return <div className="flex min-h-screen items-center justify-center text-primary animate-pulse">&gt; booting terminal...</div>;
}

function Index() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <WalletShell />
      </Suspense>
    </ClientOnly>
  );
}
