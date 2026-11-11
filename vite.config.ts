// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createRequire } from "node:module";

// Absolute path to the npm `buffer` polyfill package.
const bufferPath = createRequire(import.meta.url).resolve("buffer/");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      {
        // Solana libraries import "buffer" (rewritten to "node:buffer"), which the production
        // client build replaces with an empty stub -> "undefined is not an object (r.from)".
        // Force the browser bundle to use the real npm `buffer` package.
        name: "browser-buffer-polyfill",
        enforce: "pre",
        applyToEnvironment: (env) => env.name === "client",
        resolveId(id) {
          if (id === "buffer" || id === "buffer/" || id === "node:buffer") return bufferPath;
        },
      },
    ],
  },
});
