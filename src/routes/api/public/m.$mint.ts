import { createFileRoute } from "@tanstack/react-router";

// Serves token metadata JSON (Metaplex format) for launched coins, derived from the copied coin.
export const Route = createFileRoute("/api/public/m/$mint")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const mint = params.mint.replace(/[^1-9A-HJ-NP-Za-km-z]/g, "").slice(0, 50);
        const q = new URL(request.url).searchParams;
        let pair: any = null;
        try {
          const r = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`, { headers: { accept: "application/json" } });
          const arr = (await r.json()) as any[];
          pair = Array.isArray(arr) ? arr.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] : null;
        } catch {}
        const info = pair?.info ?? {};
        const socials: any[] = info.socials ?? [];
        const find = (t: string) => socials.find((s) => s.type === t)?.url ?? "";
        const body = {
          name: (q.get("n") ?? pair?.baseToken?.name ?? "Token").slice(0, 32),
          symbol: (q.get("s") ?? pair?.baseToken?.symbol ?? "TKN").slice(0, 10),
          description: "",
          image: info.imageUrl ?? "",
          showName: true,
          createdOn: "https://pump.fun",
          twitter: find("twitter"),
          telegram: find("telegram"),
          website: info.websites?.[0]?.url ?? "",
        };
        return Response.json(body, { headers: { "cache-control": "public, max-age=31536000, immutable", "access-control-allow-origin": "*" } });
      },
    },
  },
});
