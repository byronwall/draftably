# Draftably render service

One Cloudflare Worker: GET image URLs, a keyed REST API, and the account page. Design and plan:
[docs/intent/render-service](../../docs/intent/render-service/README.md).

## Work on it

```sh
pnpm service:dev        # wrangler dev on http://localhost:8787
pnpm prove:service      # every .draft and Mermaid input in the repo, PNG pixels, credits, API
```

For sign-in locally, put the GitHub OAuth app's secret in `packages/service/.dev.vars`
(`GITHUB_CLIENT_SECRET=...`) and its client ID in `vars` in `wrangler.jsonc`. The proof needs
neither; it seeds a local D1 with two fixture accounts.

## Connect an MCP client

The server is at `/mcp` (Streamable HTTP) and takes the same key as the REST API.

```sh
claude mcp add --transport http draftably https://api.draftably.dev/mcp \
  --header "Authorization: Bearer dft_..."
```

Other clients take a JSON block like this:

```json
{
  "mcpServers": {
    "draftably": {
      "type": "http",
      "url": "https://api.draftably.dev/mcp",
      "headers": { "Authorization": "Bearer dft_..." }
    }
  }
}
```

Tools: `render_diagram` (PNG as an image, or SVG; 2 or 1 credits), `validate_diagram`,
`convert_mermaid`, `image_url` and `language_guide` (the agent skill), all free but the first.

## First deploy

Run these once, from `packages/service`:

1. `pnpm exec wrangler d1 create draftably-service`, then put the printed `database_id` into
   `wrangler.jsonc`.
2. `pnpm exec wrangler d1 migrations apply DB --remote`.
3. Make a GitHub OAuth app (GitHub → Settings → Developer settings → OAuth Apps). Homepage
   `https://api.draftably.dev`, callback `https://api.draftably.dev/auth/github/callback`. Put its
   client ID in `vars.GITHUB_CLIENT_ID`, then `pnpm exec wrangler secret put GITHUB_CLIENT_SECRET`.
4. Add `draftably.dev` to Cloudflare and move its nameservers there. Copy the GitHub Pages
   records first, so the landing page keeps working.
5. Add the route to `wrangler.jsonc`:
   `"routes": [{ "pattern": "api.draftably.dev", "custom_domain": true }]`.
6. `pnpm service:deploy`, then `pnpm prove:service --base https://api.draftably.dev`.

Before step 4 the Worker still runs on `draftably-api.<account>.workers.dev`; set the OAuth
callback to that host until then.

## Later deploys

Run `pnpm service:deploy`. For a schema change, add a numbered file in `migrations/` and run step 2
before you deploy.
