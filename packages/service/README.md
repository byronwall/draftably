# Draftably render service

One Cloudflare Worker: GET image URLs, a keyed REST API, an MCP server with OAuth, and the account
page. Design and plan:
[docs/intent/render-service](../../docs/intent/render-service/README.md).

## Diagrams

The `.draft` files in [docs/](docs) show how the service works. Open them with
`pnpm draftably open packages/service/docs`.

- [1-architecture](docs/1-architecture.draft): the routes, the shared render path, and the
  Cloudflare and outside services they use. Its states show the free, keyed and purchase paths.
- [2-render-flow](docs/2-render-flow.draft): the cache, rate limit and credit checks for one render.
- [3-draw-pipeline](docs/3-draw-pipeline.draft): how `draw()` turns Draftably or Mermaid into SVG
  or PNG.
- [4-data-model](docs/4-data-model.draft): the D1 tables.
- [5-buy-credits](docs/5-buy-credits.draft): sign-in, Stripe Checkout and the webhook.
- [6-domains](docs/6-domains.draft): how DNS sends `draftably.dev` to GitHub Pages and
  `api.draftably.dev` to the Worker, and which records the Cloudflare move needs.

## Work on it

```sh
pnpm service:dev        # wrangler dev on http://localhost:8787
pnpm prove:service      # every .draft and Mermaid input in the repo, PNG pixels, credits, API
```

Sign-in sends a one-use link by email through Cloudflare Email Service (the `EMAIL` binding).
Locally, `wrangler dev` sends nothing: it writes each email to a file and logs the file's path, so
open the link from there. The proof reads the link the same way.

## Watch it in production

Workers Logs, Traces and Issues are on. [docs/observability.md](docs/observability.md) lists the
log fields, the spans, and the dashboard query for each production question.

## Short links

`GET /link?code=<source>` (plain text, percent-encoded) or `GET /link/{encoded}` (the same
segment and options as `/png/{encoded}`) stores the source and answers with text that lists the
`png`, `svg` and `edit` short URLs
(`?format=json` for JSON). It works over GET because web agents such as ChatGPT can only GET.
The id is the first 12 base32 characters of the SHA-256 of the source and its type, so the same
source always gets the same link and no new row. A source that doesn't draw gets 400 with the
first error and its line. `POST /v1/share {"code", "type"?}` does the same for sources too big
for a URL; it needs no key, and a keyed call records the account.

The agent flow: write the source, open `/link?code=<source>`, and copy the returned `markdown`
line (it falls back to SVG when a PNG would be too large) or the `edit` URL. Percent-encode the whole `?code=` value: a raw `#` ends the URL, `&` starts a new parameter and
`+` reads as a space, so write them as `%23`, `%26` and `%2B`. A failed source that has no `#` gets that hint in its error. Base64url or `pako:` in the
path is the compact form. `/png?code=` and `/png/{encoded}` also work and need no storage. A
source gives the same cache entry and the same id whichever way it comes; both at once is a 400.

`/d/{id}.png` and `.svg` draw through the same `render()` as the long URLs (the same cache, the
same free per-address limit). `/d/{id}.draft` returns the Draftably source; `draftably.dev/d/{id}`
reads it and opens the playground. New links are limited to 30 a minute per address
(`LINK_LIMIT`); a link that exists is free. The table keeps a hash of the IP, never the IP.

To delete a share after an abuse report (its edge-cached images expire within a day):

```sh
pnpm exec wrangler d1 execute draftably-service --remote --command "DELETE FROM shares WHERE id = '<id>'"
```

## Connect over MCP

The server is at `https://api.draftably.dev/mcp` (Streamable HTTP). Chat apps sign in with OAuth:
you get an emailed sign-in link, then press Allow. Clients that send a header use an API key from
`/account` instead. Both spend the same account's credits.

- **ChatGPT** (Plus, Pro, Business or Enterprise): Settings → Apps & Connectors → Advanced
  settings, turn on Developer mode. Then Create: name it Draftably, URL
  `https://api.draftably.dev/mcp`, authentication OAuth. Sign in and press Allow.
- **claude.ai and Claude Desktop**: Settings → Connectors → Add custom connector, URL
  `https://api.draftably.dev/mcp`. Press Connect, sign in and press Allow.
- **Claude Code**:

  ```sh
  claude mcp add --transport http draftably https://api.draftably.dev/mcp \
    --header "Authorization: Bearer dft_..."
  ```

- **Codex**: put the key in `DRAFTABLY_API_KEY`, then

  ```sh
  codex mcp add draftably --url https://api.draftably.dev/mcp --bearer-token-env-var DRAFTABLY_API_KEY
  ```

  That writes `bearer_token_env_var = "DRAFTABLY_API_KEY"` under `[mcp_servers.draftably]` in
  `~/.codex/config.toml`.

- **Cursor** (`~/.cursor/mcp.json`) and other clients that take a JSON block:

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

Connected apps show on `/account`, where you can disconnect them.

### How OAuth works here

`@cloudflare/workers-oauth-provider` wraps the Worker (`src/oauth.ts`). It publishes the metadata
(`/.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-authorization-server`),
registers clients (DCR at `/oauth/register`, or a Client ID Metadata Document as ChatGPT sends),
and runs `/oauth/token` (PKCE S256, refresh, revocation). It keeps clients, grants and tokens in
the `OAUTH_KV` namespace, and tokens only as hashes. A grant lives 30 days from its last refresh.

`/authorize` is ours: with no session cookie it asks for an email and sends a sign-in link that
returns to the same authorization; with one it shows the consent page. A `401` from `/mcp` carries
`WWW-Authenticate: Bearer resource_metadata="…"`, which is how a client finds the flow. An API key
on `/mcp` is checked as an external token, so it works unchanged.

Tools: `render_diagram` (PNG as an image, or SVG; 2 or 1 credits), `validate_diagram`,
`convert_mermaid`, `image_url`, `share_diagram` (a short link) and `language_guide` (the agent
skill), all free but the first.

## Hosting

The service runs at `https://api.draftably.dev` as the `draftably-api` Worker on a custom domain.
Cloudflare runs the `draftably.dev` zone. The first deploy was on 2026-11-25:

- D1 database `draftably-service`, with its id in `wrangler.jsonc`.
- KV namespace `draftably-oauth` (binding `OAUTH_KV`) for OAuth clients, grants and tokens.
- `draftably.dev` is onboarded as an Email Service sending domain. Sign-in mail comes from
  `vars.EMAIL_FROM` (`login@draftably.dev`). Email Service is in beta, and a new account starts
  with a small daily quota.
- Paid credits are off until `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set with
  `pnpm exec wrangler secret put`.

## Later deploys

Merge to main. The `Deploy the API to Cloudflare` workflow (`.github/workflows/deploy-api.yml`) runs on
every push to main that changes `packages/`. It applies new files in `migrations/` to D1, then runs
`pnpm service:deploy`. Run the workflow by hand to redeploy. The `CLOUDFLARE_API_TOKEN` secret needs
Workers Scripts Edit and D1 Edit.

To deploy from a laptop, run step 2, then `pnpm service:deploy`, from a checkout of main.

Short links' `edit` URLs (`draftably.dev/d/{id}`) are served by the site Worker. The API workflow does
not deploy the site: run the `Deploy the site to Cloudflare` workflow (or `pnpm site:deploy`) when a
change touches `site/`.
