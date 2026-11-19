<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Client builds resolve `buffer`/`node:buffer` to the npm `buffer` package via a plugin in vite.config.ts — production otherwise stubs it empty and Solana libs crash on load.

- Keep the trading-terminal shell (header tabs Mercado / Minhas moedas) in the client App; colors come only from global CSS tokens (incl. positive, warning, panel) so all views stay consistent.
- Token image/metadata for launches are stored in the private Cloud bucket `token-metadata` and served via /api/public/meta/$id and /api/public/img/$id on the published domain — pump.fun's /api/ipfs blocks servers and public buckets are disallowed.
- Imported positions validate the mint and read wallet balances before saving locally; unknown cost basis suppresses PnL and profit alerts to avoid treating current holdings as profit.
- The app is public (no password gate); revenue comes from a client-built SOL transfer to the owner fee wallet in src/lib/fees.ts, signed together with the launch and sent only after the launch confirms so users never pay for failed launches.
