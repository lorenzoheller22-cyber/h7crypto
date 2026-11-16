import { createFileRoute } from "@tanstack/react-router";

// Public token image referenced by the metadata JSON.
export const Route = createFileRoute("/api/public/img/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id.replace(/[^a-f0-9]/gi, "").slice(0, 64);
        if (!id) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("token-metadata").download(`${id}/image`);
        if (error || !data) return new Response("Not found", { status: 404 });
        const type = data.type && data.type.startsWith("image/") ? data.type : "image/png";
        return new Response(await data.arrayBuffer(), {
          headers: {
            "content-type": type,
            "cache-control": "public, max-age=31536000, immutable",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
