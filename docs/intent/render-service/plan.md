# Hosted render service: plan

Design: [README.md](README.md). Each slice ships alone and is usable when it lands. Each slice
names the check that proves it, at the scope the product works on.

| Slice | What lands                                   | Status  |
| ----: | -------------------------------------------- | ------- |
|     0 | Spikes: SVG, PNG and Mermaid in `workerd`    | done    |
|     1 | GET SVG on `workers.dev`                     | built   |
|     2 | GET PNG                                      | built   |
|     3 | Mermaid input                                | built   |
|     4 | Domain, accounts, keys, REST API, free grant | planned |
|     5 | MCP server                                   | planned |
|     6 | Paid credits through Stripe                  | planned |
|     7 | OAuth for MCP connectors                     | later   |

## Before slice 1 (Byron)

- Done 2026-11-24: the account is on Workers Paid (dashboard, Workers plans page).
- Decide when to move `draftably.dev` DNS to Cloudflare. Slices 1 to 3 do not need it.

## Slice 1: GET SVG

- Add `packages/service` (private) with a Worker, `wrangler.jsonc` and `pnpm service:dev` /
  `pnpm service:deploy`.
- Routes: `GET /svg/{encoded}` and the Kroki alias `GET /draftably/svg/{encoded}`. Decode `pako:`
  and plain base64url. Options: `scheme`.
- Edge cache with `caches.default`, keyed by runtime version, source hash and options.
- Runtime limits, `cpu_ms` 5,000, IP rate limit, error image with HTTP 400.
- A tiny encoder in the CLI: `draftably url <file>` prints the GET URL. Agents and docs need one
  way to make the URL, and it should not be hand-rolled in each.

**Proof.** A script (`scripts/prove-service.ts`) starts `wrangler dev --local`, requests every
`examples/*.draft` and every `tests/fixtures/*.draft` through its GET URL, and compares each body
byte for byte with `renderSvg` from `@draftably/runtime`. It reports the count: all files, not a
sample. It also asks twice for one URL and checks the second answer is a cache hit (`CF-Cache-Status`
on the deployed Worker).

**Done:** the Worker is live on `workers.dev`, the proof passes on every example, and
`draftably url` round-trips.

## Slice 2: GET PNG

- Move `rasterFamilies` and the face list into a Node-free module that the CLI and the Worker both
  import.
- `GET /png/{encoded}` with `scale`. Render with `@resvg/resvg-wasm` and the four TTFs
  from `src/cli/fonts`, loaded once per isolate.
- Embed the source in the PNG the same way the CLI does (`embedPngSource`), so `draftably open`
  reads a downloaded PNG back.
- Pixel cap of 16 M.

**Proof.** The proof script renders each example as PNG through the Worker and through
`draftably --png`, and compares pixels. The pass rule is zero differing pixels; if wasm and native
resvg differ in anti-aliasing, record the largest difference per file and set the bar from it. It
also checks the PNG carries the source.

**Done:** every example's Worker PNG matches the CLI PNG, and a 16 M-pixel request fails cleanly
instead of crashing the isolate.

## Slice 3: Mermaid input

- Detect Mermaid with `src/import/detect.ts`; `?type=` overrides it.
- Import with `mermaid-facade` and `mermaid-importer` on a `linkedom` document, with `fetch`
  stubbed as the CLI import worker does.
- Measure Worker startup. If it is over about 400 ms, move Mermaid import to a second Worker
  behind a service binding.

**Proof.** For every Mermaid input in `tests/import-mermaid.test.ts` and the Mermaid examples in
`docs/`, the Worker's result equals `draftably import` (same draft text, same diagnostics). Report
the count, and list each family (flowchart, sequence, timeline) separately.

**Done:** Mermaid GET URLs draw, and the importer results agree with the CLI on every input.

## Slice 4: domain, accounts, keys, REST API

- Move the zone and bind `api.draftably.dev`.
- D1 database with `accounts`, `keys` and `ledger` (design in README). Migrations in
  `packages/service/migrations`.
- GitHub sign-in, the account page, key create and revoke.
- `POST /v1/render`, `/v1/validate`, `/v1/convert`, `GET /v1/balance`. Free monthly grant of
  1,000 credits. The spend runs as one statement before the render; a failed render refunds.
- A key on a GET URL spends credits and skips the IP limit.

**Proof.** A test against local D1 fires 50 parallel renders at an account with 20 credits. Exactly
20 succeed, the balance ends at 0, and the ledger sums to the balance. A second test checks that
`/v1/render` and the GET URL return the same bytes for the same input.

**Done:** Byron signs in, makes a key, and renders from `curl` on `api.draftably.dev`.

## Slice 5: MCP server

- `/mcp` with `createMcpHandler`, stateless. Tools: `render_diagram`, `validate_diagram`,
  `convert_mermaid`, `language_guide`.
- Auth by the slice 4 bearer key. `render_diagram` spends the same credits through the same code
  as `/v1/render`.
- Docs: a `claude mcp add --transport http` line and a JSON config block for other clients, in
  `docs/integrations/`.

**Proof.** Claude Code, connected to the local Worker, writes a diagram from a one-line prompt:
it calls `language_guide`, then `render_diagram`, and gets an image. Record the transcript. A test
checks that the MCP render and `/v1/render` return the same bytes.

**Done:** the MCP server works from Claude Code against `api.draftably.dev`.

## Slice 6: paid credits

- Stripe Checkout for credit packs. `POST /stripe/webhook` checks the signature and adds a
  `purchase` ledger row, once per Checkout session ID.
- The account page shows bought and grant credits apart.

**Proof.** In Stripe test mode, a purchase adds the credits once, even when Stripe sends the
webhook twice.

**Done:** a test-mode purchase raises the balance, and renders spend grant credits before bought
credits.

## Slice 7 (later): OAuth for MCP

`@cloudflare/workers-oauth-provider` with GitHub as the upstream sign-in, mapped to the same
account row, so the server works as a claude.ai custom connector.

## Retire

When slice 6 lands, move the lasting facts (routes, limits, credit rules, deploy steps) into
`docs/ARCHITECTURE.md` and a `docs/SERVICE.md`, and remove this folder.
