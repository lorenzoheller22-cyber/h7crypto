import { createFileRoute } from "@tanstack/react-router";

// Public token metadata JSON (read by pump.fun, wallets and explorers).
export const Route = createFileRoute("/api/public/meta/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id.replace(/[^a-f0-9]/gi, "").slice(0, 64);
        if (!id) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("token-metadata").download(`${id}/metadata.json`);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(await data.text(), {
          headers: {
            "content-type": "application/json",
            "cache-control": "public, max-age=31536000, immutable",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
