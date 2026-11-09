import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const WalletShell = lazy(() => import("@/components/WalletShell"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CopyTrend — Copie tokens em alta e lance na Pump.fun" },
      { name: "description", content: "Feed ao vivo de tokens trending da Solana e Pump.fun. Copie em 1 clique e faça deploy com dev buy." },
      { property: "og:title", content: "CopyTrend — Copy Trending Coins na Pump.fun" },
      { property: "og:description", content: "Copie tokens em alta e lance na Pump.fun com dev buy e prioridade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return <div className="flex min-h-screen items-center justify-center font-mono text-primary animate-pulse">&gt; booting terminal...</div>;
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
