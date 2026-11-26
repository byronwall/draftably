# Hosted render service: design

Status: planned (2026-11-24). Nothing is built or deployed. Task: TASK-0080. Build order:
[plan.md](plan.md).

## Goal

One Cloudflare Worker at `api.draftably.dev` gives agents and people three ways to get a diagram:

1. **GET image URLs.** The URL holds the source. The response is SVG or PNG. No key is needed.
   This matches mermaid.ink and Kroki, which agents already know how to build.
2. **A REST API with keys.** `POST /v1/render` and `POST /v1/validate`, in the same shape as the
   Mermaid API (`api.mermaid.ai`), so an agent that knows one knows the other.
3. **A remote MCP server** at `/mcp`. Tools render, validate, convert Mermaid, and return the
   language guide. It uses the same keys as the REST API.

All three start free. Keyed calls spend credits from day one, with a free monthly grant, so a paid
tier is only "sell more credits". The input is the Draftably DSL or Mermaid text.

## Answer: does the $5 plan cover it?

Yes. The Workers Paid plan ($5 a month) runs all of it in one Worker, with no Container.

A local spike (see [Evidence](#evidence)) ran `@draftably/runtime` and `@resvg/resvg-wasm` in
`workerd`, the Workers runtime. It drew `examples/kubernetes-cluster.draft` as SVG and as a
2956 × 2462 PNG with the bundled fonts. A second spike parsed a Mermaid flowchart into a Draftably
graph in `workerd`, with `linkedom` in place of JSDOM.

Monthly cost estimate. It assumes about 150 ms of CPU for each render that misses the cache, and
about 1 ms for a cache hit. The warm renders of the 36 examples took p50 11 ms and p90 377 ms in
Node, and PNG adds about 150 to 300 ms.

| Usage (renders that miss the cache) | CPU ms              | Requests     | D1 writes | Monthly bill |
| ----------------------------------- | ------------------- | ------------ | --------- | ------------ |
| 10,000 (hobby)                      | 1.5 M (in plan)     | in plan      | in plan   | **$5**       |
| 200,000                             | 30 M (plan limit)   | in plan      | in plan   | **$5**       |
| 1,000,000                           | 150 M (120 M over)  | in plan      | in plan   | **≈ $7.40**  |
| 10,000,000                          | 1.5 B (1.47 B over) | 10 M (limit) | in plan   | **≈ $35**    |

Prices used (Cloudflare docs, read 2026-11-24): 10 M requests and 30 M CPU ms in the plan, then
$0.30 per million requests and $0.02 per million CPU ms. D1 has 50 M row writes and 25 B row reads
in the plan. Cache hits cost a request but almost no CPU, so a popular image costs almost nothing.

Stripe fees will be larger than Cloudflare's. One credit pack sale of $5 costs about $0.45 in fees.
The same $5 buys about 1.6 M uncached renders of Cloudflare CPU.

What the $5 plan does not cover: the `draftably.dev` DNS zone must be on Cloudflare for a custom
domain. That is free (see [Domain](#domain)). The dashboard showed on 2026-11-24 that the
account is on Workers Paid and has no domains yet; its one Worker is `context-recorder-cloud`.

## Domain

`draftably.dev` uses Namecheap DNS (`dns1.registrar-servers.com`) today, and the landing page is
on GitHub Pages. A Worker custom domain (`api.draftably.dev`) needs the zone on Cloudflare.

- Move the nameservers to Cloudflare on the free zone plan. Copy the four GitHub Pages `A` records
  and any `CNAME` and mail records first.
- The landing page can stay on GitHub Pages. Moving it to Cloudflare is optional and not part of
  this work.
- Until the zone moves, the Worker runs on `draftably-api.<account>.workers.dev`. The first two
  slices can ship there. Edge caching is confirmed only for custom domains, so slice 1 also
  checks cache hits on `workers.dev`.

## Interfaces

### GET image URLs

```
GET /svg/{encoded}[?options]
GET /png/{encoded}[?options]
```

- `{encoded}` is `pako:` + base64url of the zlib-deflated UTF-8 source (the mermaid.ink form), or
  plain base64url of the source. Kroki's deflate + base64url decodes the same way.
- The source language is detected (`src/import/detect.ts`). `?type=mermaid` or `?type=draftably`
  overrides it.
- Options: `scheme=light|dark`, `scale=1|2|3|4` (PNG only, default 2). No `bg` option: the
  diagram draws its own paper, so a background color would need a change in the renderer.
- A Kroki-style alias costs one route and lets Kroki clients work: `GET /{type}/{format}/{encoded}`.
- URLs over about 8 KB are rejected with a pointer to `POST /v1/render`.
- No key and no credits. Each IP has a rate limit (start at 60 renders a minute, cache hits not
  counted). A key in `Authorization` lifts the limit and spends credits. There is no `?key=`: a URL
  pasted into public Markdown would leak it.
- A bad source returns a small SVG or PNG that shows the first diagnostic, with HTTP 400. An image
  tag then shows the error instead of a broken icon.

Response headers: `Cache-Control: public, max-age=31536000, immutable`, an `ETag` from the hash of
(runtime version, source, options), and `X-Draftably-Version`. The URL holds the full input, so the
output changes only when the runtime changes; the cache key includes the runtime version.

### REST API

```
POST /v1/render     {"code": "...", "format": "svg"|"png", "type"?, "scheme"?, "scale"?}
POST /v1/validate   {"code": "...", "type"?}       → {valid, diagnostics[], summary}
POST /v1/convert    {"code": "...", "from": "mermaid"} → {draft, diagnostics[]}
GET  /v1/balance                                     → {credits, grant, resetsAt}
```

- `code` and `format` match the Mermaid API body, on purpose.
- Auth: `Authorization: Bearer dft_<id>.<secret>`. The database keeps only a SHA-256 of the
  secret.
- Errors use one JSON shape: `{error: {code, message, line?, column?}}`. Codes: `ERR_SOURCE`
  (400), `ERR_LIMIT_BURST` (429), `ERR_LIMIT_BALANCE` (402), `ERR_AUTH` (401).
- `render` also returns `X-Draftably-Url`, the GET URL for the same image, so an agent can embed
  it.

### MCP server

`/mcp`, Streamable HTTP, made with the MCP SDK's `WebStandardStreamableHTTPServerTransport` in
stateless mode: one server per request, so it needs no Durable Object and none of the `agents`
SDK's dependencies. Tools:

| Tool               | Input                     | Output                                                    | Credits |
| ------------------ | ------------------------- | --------------------------------------------------------- | ------: |
| `render_diagram`   | `code`, `format`, options | image content (PNG) or SVG text, plus the GET URL         |  1 or 2 |
| `validate_diagram` | `code`                    | diagnostics with line and column                          |       0 |
| `convert_mermaid`  | Mermaid `code`            | Draftably source and diagnostics                          |       0 |
| `language_guide`   | none                      | `skills/draftably/SKILL.md`, so the agent writes good DSL |       0 |

Auth: the same bearer key, sent as an `Authorization` header in the client's MCP config. OAuth (for
claude.ai custom connectors) is a later slice; it uses `@cloudflare/workers-oauth-provider` with
the same email sign-in and maps a sign-in to the same account row.

### Account page

`/login` takes an email address and sends a one-use sign-in link through Cloudflare Email Service
(the Worker's `send_email` binding; no other account or key). The link is good for 15 minutes.
It opens a page with one "Sign in" button, because mail scanners fetch GET links; only the POST
spends the token. The form always says "check your email", so it does not tell which addresses
have accounts. A rate limit per IP, and a cap of 5 links per address in 15 minutes (counted in
D1), stop it from flooding an inbox. The verify page names the address, so a person who opens
someone else's link sees whose account it is. After sign-in the page shows the credit balance
and lets the user create and revoke keys. There is no other sign-in and no outside identity
provider. If Email Service fails us, Resend is the fallback: the send call becomes one `fetch`
with a secret.

## Credits

- 1 credit renders one SVG. A PNG costs 2. Validate, convert, the guide and balance are free.
  Cache hits are free.
- Each account gets a free grant of 1,000 credits a month. The grant does not roll over. Bought
  credits do not expire.
- Anonymous GET URLs spend no credits; the IP rate limit holds them in check.
- Later: credit packs through Stripe Checkout (for example $5 for 25,000). A Stripe webhook adds
  the credits. Stripe stays the record of payments; D1 stays the record of balances.

### Data (one D1 database)

```sql
accounts     (id, email UNIQUE, grant_left, grant_month, bought, created_at)
login_tokens (hash, email, expires_at, used_at)  -- emailed sign-in links
keys     (id, account_id, hash, label, created_at, last_used_at, revoked_at)
ledger   (id, account_id, delta, reason, ref, created_at)  -- render, purchase
```

A spend is one statement, so two parallel calls cannot overdraw:

```sql
UPDATE accounts
SET grant_left = max(grant_left - ?1, 0),
    bought = bought - max(?1 - grant_left, 0)
WHERE id = ?2 AND grant_left + bought >= ?1
RETURNING grant_left, bought;
```

No row back means `ERR_LIMIT_BALANCE`. The Worker checks the balance, draws, and only then runs
the spend, so a render that fails or is cut off at the CPU limit costs nothing and there is no
refund path. Parallel renders can all pass the check; the guarded spend lets through only what the
balance covers. The ledger row is written in the same `batch()`. The grant reset only moves
`grant_month` forward, so a slow request from last month can't reset this month's grant.

GET image URLs, `/v1/render` and the MCP tool share one cache keyed by the source's hash, the
format, the checked options and the runtime version, so a cached image is free on all three.

## Decisions

### Decision 1: where PNG is drawn

Scale: 10 is best.

| Approach                                           | PNG matches CLI fonts | Cold first image | Fits 128 MB / bundle limits | Main tradeoff                                                                                                       |
| -------------------------------------------------- | --------------------: | ---------------: | --------------------------: | ------------------------------------------------------------------------------------------------------------------- |
| A. Worker only, `@resvg/resvg-wasm` + bundled TTFs |                     9 |                9 |                           7 | Proven in the spike. Large PNGs need a pixel cap to stay under 128 MB.                                              |
| B. Worker + Container running the CLI (`resvg-js`) |                    10 |                3 |                          10 | Same binary as the CLI. Cold starts of 1–3 s, and an always-on 1 GiB instance costs about $6 a month over the plan. |
| C. Worker + Browser Rendering screenshot           |                     6 |                2 |                          10 | Chrome text differs from resvg, and the plan has only 10 browser hours.                                             |

- **Choice:** A. Keep B as the escape for PDF only, if PDF is ever wanted.
- **Why:** the spike showed the same resvg engine and fonts in a Worker. A cold start of seconds
  breaks the "an image tag just works" goal.
- **Watch:** a pixel cap. 2956 × 2462 is 29 MB of RGBA. Cap the output at 16 M pixels (64 MB) and
  return `ERR_SOURCE` with the size above that.

### Decision 2: where keys, usage and credits live

| Approach                              | Overdraw under parallel calls | Read the balance and history in one place | Stripe top-up path        | Main tradeoff                                                               |
| ------------------------------------- | ----------------------------: | ----------------------------------------: | ------------------------- | --------------------------------------------------------------------------- |
| A. D1: accounts, keys, ledger         |     10 (one `UPDATE … WHERE`) |                                        10 | webhook adds a ledger row | One write per keyed render; 50 M writes are in the plan.                    |
| B. KV for keys and balances           |       2 (no atomic decrement) |                                         4 | webhook writes KV         | Eventual consistency lets parallel calls spend twice.                       |
| C. One Durable Object per account     |                            10 |                3 (no cross-account query) | webhook calls the DO      | Strong per account, but reports and admin need a second store.              |
| D. Stripe usage meters as the balance |                3 (meters lag) |                                         6 | native                    | Needs a check before each render anyway; free users need a Stripe customer. |

- **Choice:** A, with Stripe Checkout and a webhook for top-ups.
- **Why:** SQLite gives an atomic spend in one statement. One database holds keys, balances and
  history, so the account page is one query.
- **Watch:** D1 is in one region. A keyed render pays one round trip to it (tens of ms from far
  away). Anonymous GETs never touch D1.

## Limits and abuse

- Source: 64 KB, through the runtime's `limits` (`maxSourceBytes`, `maxObjects`, `maxEdges`).
- CPU: set `limits.cpu_ms` to 5,000. The slowest example takes 633 ms.
- PNG: 16 M pixels, `scale` 1 to 4.
- Rate limits: the Workers Rate Limiting binding, keyed by IP for anonymous calls and by key for
  keyed calls.
- Links in diagrams use the runtime's `safe` link policy. `src=` code files are not available on
  the service; a diagram that names one gets a diagnostic.
- No outbound fetch in the render path (the CLI import worker already stubs `fetch`).

## Code layout

- `packages/service/`: a private workspace package, never published. It depends on
  `@draftably/runtime` through the workspace and holds the Worker, `wrangler.jsonc`, the D1
  migrations and the account page.
- `rasterFamilies` and the font list move out of `src/cli/raster-fonts.ts` into a module with no
  Node imports. The CLI and the Worker then rename fonts the same way.
- Deploy: `pnpm service:deploy` (runs `wrangler deploy`) from Byron's machine. A GitHub Action can
  come later.

## Evidence

Spikes ran on 2026-11-24 in `wrangler dev --local` (wrangler 4.167.0). They used no Cloudflare
resources.

- **SVG + PNG in workerd.** Worker imports `packages/runtime/dist/index.js`, `@resvg/resvg-wasm`
  2.6.2 and the four TTFs from `src/cli/fonts`. Bundle: 3.3 MB, 1.3 MB gzipped.
  `kubernetes-cluster.draft` drew as an 86,727-byte SVG and a 2956 × 2462 PNG with correct
  Inter text. The spike skipped `rasterFamilies`; serif and mono text need it.
- **Mermaid in workerd.** Worker imports `src/import/mermaid-facade.ts`,
  `src/import/mermaid-importer.ts`, `mermaid` 12.2.0 and `linkedom` with `nodejs_compat`. A
  four-node flowchart imported with status `ready` and no diagnostics. Bundle: 13.5 MB, 2.5 MB
  gzipped. Sequence and timeline imports were not tried.
- **Render time.** `renderSvg` from the runtime bundle in Node, 36 files in `examples/`, second
  pass: p50 11 ms, p90 377 ms, max 633 ms (`observability-stack.draft`).

## Findings while building

- The Cache API stores only 200 answers, so error images are drawn again each time; the IP rate
  limit counts them.
- The runtime ignores a file's own `config link-base=`. The service passes it on as the link
  `baseUrl` when it is an http(s) address, so links match the CLI. Relative links under a local
  base, and `src=` code files, have nothing to point at on a hosted image; those few files draw
  without the link arrow or the code text.

- linkedom keeps a `<template>`'s text on the element, not in `content`, so imported labels came
  out blank until `makePlainLabel` fell back to the element's text.
- The importer refuses Mermaid frontmatter (`---` / `title:` / `---`), and so does the service.
  Agents often write it; 9 of the repo's 15 `.mmd` files have it.
- With Mermaid the bundle is 16.5 MB, 3.7 MB gzipped. Locally the first request to a new
  isolate took 16 ms and the first Mermaid PNG 160 ms, so Mermaid stays in the one Worker.

- A Mermaid gantt chart can depend on today's date (dates without a year) and on the time zone
  (the Worker runs in UTC; the CLI uses the machine's zone). Its image is cached for a day, not a
  year.

## Open questions

- Prices for credit packs. The numbers above are placeholders.
