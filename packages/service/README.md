# Draftably render service

One Cloudflare Worker: GET image URLs, a keyed REST API, and the account page. Design and plan:
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
3. Add `draftably.dev` to Cloudflare and move its nameservers there. Copy the GitHub Pages
   records first, so the landing page keeps working.
4. Onboard `draftably.dev` as a sending domain in Email Service (dashboard → Compute → Email
   Service → Email Sending). It adds the SPF and DKIM records. Sign-in mail comes from
   `vars.EMAIL_FROM` (`login@draftably.dev`). Email Service is in beta, and a new account starts
   with a small daily quota.
5. Add the route to `wrangler.jsonc`:
   `"routes": [{ "pattern": "api.draftably.dev", "custom_domain": true }]`.
6. `pnpm service:deploy`, then `pnpm prove:service --base https://api.draftably.dev`.

Sign-in does not work before step 4, because Email Service sends only from an onboarded domain.

## Later deploys

Run `pnpm service:deploy`. For a schema change, add a numbered file in `migrations/` and run step 2
before you deploy.
