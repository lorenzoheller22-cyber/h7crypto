import { createServerFn } from "@tanstack/react-start";

export type TrendingToken = {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  description: string;
  marketCap: number;
  volume24h: number;
  change: number;
  createdAt: number | null;
  source: "pump.fun" | "dexscreener";
  twitter?: string;
  telegram?: string;
  website?: string;
};

const UA = { "user-agent": "Mozilla/5.0", accept: "application/json" };

async function fromPump(): Promise<TrendingToken[]> {
  try {
    const r = await fetch(
      "https://frontend-api-v3.pump.fun/coins/currently-live?offset=0&limit=40&sort=market_cap&order=DESC&includeNsfw=false",
      { headers: UA },
    );
    if (!r.ok) return [];
    const j = (await r.json()) as any[];
    return (Array.isArray(j) ? j : []).map((c) => ({
      mint: c.mint,
      name: c.name,
      symbol: c.symbol,
      image: c.image_uri ?? null,
      description: c.description ?? "",
      marketCap: Number(c.usd_market_cap ?? 0),
      volume24h: Number(c.volume ?? 0),
      change: 0,
      createdAt: c.created_timestamp ?? null,
      source: "pump.fun" as const,
      twitter: c.twitter ?? undefined,
      telegram: c.telegram ?? undefined,
      website: c.website ?? undefined,
    }));
  } catch {
    return [];
  }
}

async function fromDex(): Promise<TrendingToken[]> {
  try {
    const b = await fetch("https://api.dexscreener.com/token-boosts/top/v1", { headers: UA });
    const boosts = ((await b.json()) as any[]).filter((x) => x.chainId === "solana").slice(0, 30);
    if (!boosts.length) return [];
    const addrs = boosts.map((x) => x.tokenAddress).join(",");
    const p = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${addrs}`, { headers: UA });
    const pairs = (await p.json()) as any[];
    const best = new Map<string, any>();
    for (const pr of pairs) {
      const k = pr.baseToken?.address;
      if (!k) continue;
      if (!best.has(k) || (pr.liquidity?.usd ?? 0) > (best.get(k).liquidity?.usd ?? 0)) best.set(k, pr);
    }
    return boosts
      .map((bt) => {
        const pr = best.get(bt.tokenAddress);
        if (!pr) return null;
        const socials = (pr.info?.socials ?? []) as any[];
        return {
          mint: bt.tokenAddress,
          name: pr.baseToken.name,
          symbol: pr.baseToken.symbol,
          image: pr.info?.imageUrl ?? bt.icon ?? null,
          description: bt.description ?? "",
          marketCap: Number(pr.marketCap ?? pr.fdv ?? 0),
          volume24h: Number(pr.volume?.h24 ?? 0),
          change: Number(pr.priceChange?.h24 ?? 0),
          createdAt: pr.pairCreatedAt ?? null,
          source: "dexscreener" as const,
          twitter: socials.find((s) => s.type === "twitter")?.url,
          telegram: socials.find((s) => s.type === "telegram")?.url,
          website: pr.info?.websites?.[0]?.url,
        } satisfies TrendingToken;
      })
      .filter(Boolean) as TrendingToken[];
  } catch {
    return [];
  }
}

export const getTrending = createServerFn({ method: "GET" }).handler(async () => {
  const [a, b] = await Promise.all([fromPump(), fromDex()]);
  const seen = new Set<string>();
  return [...a, ...b].filter((t) => t.mint && !seen.has(t.mint) && seen.add(t.mint));
});

export const getPlatformConfig = createServerFn({ method: "GET" }).handler(async () => ({
  feeWallet: process.env["PLATFORM_FEE_WALLET"] ?? "",
  feeSol: Number(process.env["PLATFORM_FEE_SOL"] ?? "0.05"),
}));

export const uploadMetadata = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      name: string;
      symbol: string;
      description: string;
      imageUrl?: string | undefined;
      imageBase64?: string;
      imageType?: string;
      twitter?: string | undefined;
      telegram?: string | undefined;
      website?: string | undefined;
    }) => d,
  )
  .handler(async ({ data }) => {
    let blob: Blob;
    if (data.imageBase64) {
      const bin = Uint8Array.from(atob(data.imageBase64), (c) => c.charCodeAt(0));
      blob = new Blob([bin], { type: data.imageType || "image/png" });
    } else if (data.imageUrl) {
      const r = await fetch(data.imageUrl, { headers: { "user-agent": "Mozilla/5.0" } });
      if (!r.ok) throw new Error("Não foi possível baixar a imagem original");
      blob = await r.blob();
    } else throw new Error("Imagem obrigatória");
    if (blob.size > 4_500_000) throw new Error("Imagem muito grande (máx. 4,5 MB)");
    const contentType = blob.type && blob.type.startsWith("image/") ? blob.type : "image/png";

    // Store image + metadata JSON in our own storage and serve them from public URLs
    // (pump.fun's old /api/ipfs endpoint is blocked for servers).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = crypto.randomUUID().replace(/-/g, "");
    const base = (process.env["PUBLIC_SITE_URL"] || "https://h7crypto.lovable.app").replace(/\/$/, "");
    const bucket = supabaseAdmin.storage.from("token-metadata");

    const img = await bucket.upload(`${id}/image`, blob, { contentType, upsert: false });
    if (img.error) throw new Error(`Falha ao salvar a imagem: ${img.error.message}`);

    const metadata = {
      name: data.name,
      symbol: data.symbol,
      description: data.description,
      image: `${base}/api/public/img/${id}`,
      showName: true,
      createdOn: "https://pump.fun",
      twitter: data.twitter ?? "",
      telegram: data.telegram ?? "",
      website: data.website ?? "",
    };
    const meta = await bucket.upload(
      `${id}/metadata.json`,
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
      { contentType: "application/json", upsert: false },
    );
    if (meta.error) throw new Error(`Falha ao salvar os metadados: ${meta.error.message}`);

    return { uri: `${base}/api/public/meta/${id}`, name: data.name, symbol: data.symbol };
  });

export const buildCreateTx = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { publicKey: string; mint: string; name: string; symbol: string; uri: string; devBuySol: number; priorityFee: number; slippage: number }) => d,
  )
  .handler(async ({ data }) => {
    const r = await fetch("https://pumpportal.fun/api/trade-local", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicKey: data.publicKey,
        action: "create",
        tokenMetadata: { name: data.name, symbol: data.symbol, uri: data.uri },
        mint: data.mint,
        denominatedInSol: "true",
        amount: data.devBuySol,
        slippage: data.slippage,
        priorityFee: data.priorityFee,
        pool: "pump",
      }),
    });
    if (!r.ok) throw new Error(`PumpPortal: ${r.status} ${await r.text()}`);
    const buf = new Uint8Array(await r.arrayBuffer());
    let s = "";
    for (const b of buf) s += String.fromCharCode(b);
    return { tx: btoa(s) };
  });

export const getCoinsInfo = createServerFn({ method: "POST" })
  .inputValidator((d: { mints: string[] }) => ({ mints: d.mints.slice(0, 50) }))
  .handler(async ({ data }) => {
    const out: Record<string, { name: string; symbol: string; image: string | null; priceSol: number; marketCap: number; progress: number; complete: boolean; lastTradeMs: number }> = {};
    await Promise.all(
      data.mints.map(async (m) => {
        try {
          const r = await fetch(`https://frontend-api-v3.pump.fun/coins/${m}`, { headers: UA });
          if (!r.ok) return;
          const c = (await r.json()) as any;
          const vs = Number(c.virtual_sol_reserves ?? 0), vt = Number(c.virtual_token_reserves ?? 0);
          const real = Number(c.real_token_reserves ?? 0);
          out[m] = {
            name: c.name, symbol: c.symbol, image: c.image_uri ?? null,
            // reserves: SOL in lamports (9 dec), tokens with 6 dec
            priceSol: vt ? (vs / 1e9) / (vt / 1e6) : 0,
            marketCap: Number(c.usd_market_cap ?? 0),
            progress: c.complete ? 100 : Math.max(0, Math.min(100, 100 - (real / 793100000e6) * 100)),
            complete: !!c.complete,
            lastTradeMs: Number(c.last_trade_timestamp ?? c.created_timestamp ?? 0),
          };
        } catch { /* ignore */ }
      }),
    );
    return out;
  });

export const buildSellTx = createServerFn({ method: "POST" })
  .inputValidator((d: { publicKey: string; mint: string; percent: number; priorityFee: number; slippage: number }) => d)
  .handler(async ({ data }) => {
    const pct = Math.max(1, Math.min(100, Math.round(data.percent)));
    const r = await fetch("https://pumpportal.fun/api/trade-local", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicKey: data.publicKey, action: "sell", mint: data.mint,
        denominatedInSol: "false", amount: `${pct}%`,
        slippage: data.slippage, priorityFee: data.priorityFee, pool: "auto",
      }),
    });
    if (!r.ok) throw new Error(`PumpPortal: ${r.status} ${await r.text()}`);
    const buf = new Uint8Array(await r.arrayBuffer());
    let s = "";
    for (const b of buf) s += String.fromCharCode(b);
    return { tx: btoa(s) };
  });

export const buildBuyTx = createServerFn({ method: "POST" })
  .inputValidator((d: { publicKey: string; mint: string; solAmount: number; priorityFee: number; slippage: number }) => {
    const sol = Number(d.solAmount);
    if (!(sol > 0 && sol <= 5)) throw new Error("Valor de compra inválido");
    return { ...d, solAmount: sol };
  })
  .handler(async ({ data }) => {
    const r = await fetch("https://pumpportal.fun/api/trade-local", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicKey: data.publicKey, action: "buy", mint: data.mint,
        denominatedInSol: "true", amount: data.solAmount,
        slippage: data.slippage, priorityFee: data.priorityFee, pool: "auto",
      }),
    });
    if (!r.ok) throw new Error(`PumpPortal: ${r.status} ${await r.text()}`);
    const buf = new Uint8Array(await r.arrayBuffer());
    let s = "";
    for (const b of buf) s += String.fromCharCode(b);
    return { tx: btoa(s) };
  });
