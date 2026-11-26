# Observability

The `draftably-api` Worker sends three things to Cloudflare. Open them at **Workers & Pages →
draftably-api → Observability**, or at **Observability** in the account sidebar.

- **Logs.** Cloudflare writes one invocation log per request. The Worker adds one wide event per
  request (below).
- **Traces.** Cloudflare makes spans for the request, D1, the cache, `fetch` and the rate limits.
  The Worker adds its own spans for each step (below).
- **Issues.** Cloudflare groups uncaught exceptions, failed invocations, 5xx answers and
  `console.error` lines.

`wrangler.jsonc` turns all three on, keeps every request (`head_sampling_rate: 1`), and holds the
note on when to lower the rate. `site/wrangler.jsonc` does the same for `draftably-site`, which
has only the invocation logs and automatic spans.

## The wide event

`src/index.ts` logs one JSON object per request with `console.log`. Code deeper in the request adds
fields with `note()` from [`src/obs.ts`](../src/obs.ts). In the Query builder, each field is a
top-level key: filter on `event = request` to see only these lines.

| Field                                      | Values                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `route`                                    | `image`, `share`, `rest`, `mcp`, `oauth` (`/authorize`, `/oauth/*`, `/.well-known/*`), `account`, `login`, `webhook`, `health`, `other`                                                                                                                                                                         |
| `method`, `status`                         | the request method and the answer's status; `500` for an uncaught error                                                                                                                                                                                                                                         |
| `path`                                     | the route template (`/v1/render`, `/account/keys/:id/revoke`); none for `image`, which includes `/d/{id}` (its path holds the diagram source or a short link's id); `/link` for `share`; for an unknown path, its first segment when it is a plain name, such as `/wp-login.php` or `/admin/*`, else `/<other>` |
| `version`, `build`                         | the Draftably runtime version, and the Worker version ID of the deploy                                                                                                                                                                                                                                          |
| `ip`                                       | the first 12 hex characters of the client IP's SHA-256. It groups one address's requests; it is not anonymous, since IPv4 is small enough to search                                                                                                                                                             |
| `country`                                  | Cloudflare's country code for the client                                                                                                                                                                                                                                                                        |
| `payer`                                    | `anonymous`, `key`, `session` or `app` (an OAuth-connected app on `/mcp`)                                                                                                                                                                                                                                       |
| `account`, `key`                           | the account ID and the key ID (`dft_<key>.…`), when known                                                                                                                                                                                                                                                       |
| `cache`                                    | `hit` or `miss`                                                                                                                                                                                                                                                                                                 |
| `format`, `source_type`, `scheme`, `scale` | `svg` or `png`; `draftably` or `mermaid`; the options                                                                                                                                                                                                                                                           |
| `source_bytes`, `out_bytes`, `pixels`      | the source size, the image size, and the PNG pixel count                                                                                                                                                                                                                                                        |
| `credits_spent`, `credits_left`            | the credits this render took, and the balance after it (or the balance that was too low, on a 402)                                                                                                                                                                                                              |
| `credits_bought`                           | the credits a Stripe purchase added                                                                                                                                                                                                                                                                             |
| `rate_limit`                               | the limiter that refused the request: `anon` (per address), `key` (per key), `account` (per account, for an OAuth app on `/mcp`), `login` (sign-in emails per address), `login_email` (links one email may hold)                                                                                                |
| `mcp_tool`, `mcp_calls`                    | the tool called (`unknown` for a name the server lacks) and the count. A batch joins names with commas; MCP dropped batches in its 2025-06 spec, so they are rare                                                                                                                                               |
| `login`                                    | `form`, `bad_email`, `capped`, `sent`, `send_failed`, `link_shown`, `link_dead`, `signed_in`                                                                                                                                                                                                                    |
| `webhook`, `stripe_event`                  | `off`, `bad_signature`, `too_large`, `ignored`, `not_ours`, `unmatched`, `fulfilled`, `duplicate`; and the Stripe event type                                                                                                                                                                                    |
| `error_code`, `error`                      | `ERR_SOURCE`, `ERR_AUTH`, `ERR_LIMIT_BURST`, `ERR_LIMIT_BALANCE`, `ERR_NOT_FOUND`, `ERR_EMAIL`, `ERR_TOOL` (an MCP tool answered with an error), `ERR_INTERNAL` (uncaught), or `HTTP_<status>` for any other 4xx or 5xx; and the message, masked as below, 300 characters at most                               |

The event never holds an email, a key secret, a session or sign-in token, or a raw IP. A source
error's message can quote a line of the diagram; email addresses, API keys, IP addresses and long
token-like runs in it show as `<email>`, `<key>`, `<ip>` and `<token>`. The Worker sets
`redact_query_string`, so Cloudflare's own logs and spans drop query strings: a sign-in link's
token is in its query. Cloudflare's invocation log is its own record: it keeps request headers,
including the client IP (`x-real-ip`), and shows an image path as `/png/REDACTED`.

## The spans

An unexpected throw is recorded on its span as an exception, and Workers Issues groups it. An
expected one (a bad diagram, a refused key, a limit) only sets the span's `refused` attribute, so a
user's mistake never opens an Issue.

Span durations count waiting on I/O only. Workers stops its clock while code runs, so a CPU step
such as `render.svg` or `png.rasterize` shows about 0 ms however long it took. Spans show the order
of the steps, what each read and wrote, and how long D1, the cache, the rate limiter and email
took. For time spent computing, use `$workers.cpuTimeMs` and `$workers.wallTimeMs` on the
invocation log (one per request).

| Span                                                    | Attributes                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `decode`                                                | `segment_bytes`, `source_bytes`                                                                  |
| `render`                                                | `format`, `paid`, `cache_hit`: one per render, from GET, REST or MCP                             |
| `cache.lookup`, `cache.put`                             | `format`, `cache_hit`, `out_bytes`                                                               |
| `source.detect`                                         | `given`, `source_type`                                                                           |
| `mermaid.import`                                        | `source_bytes`, `cold` (the first Mermaid call in the isolate also loads the parser), `warnings` |
| `render.svg`                                            | `source_bytes`, `scheme`, `svg_bytes`                                                            |
| `png.pixels`, `png.strip`, `png.rasterize`, `png.embed` | `scale`, `cold` (resvg's first load), `png_bytes`                                                |
| `credits.balance`, `credits.spend`                      | `credits`                                                                                        |
| `auth.key`                                              | `found`                                                                                          |
| `login.email`                                           |                                                                                                  |
| `stripe.signature`, `stripe.fulfil`                     | `body_bytes`, `valid`, `credits`                                                                 |
| `mcp.<tool>`                                            | `tool`                                                                                           |

## Questions and the queries that answer them

All queries are in **Observability → Query builder** unless they say otherwise. Open it from
**Workers & Pages → draftably-api → Observability**, so it is limited to this Worker. From the
account-level Observability page, add Filter `$workers.scriptName = draftably-api` to every query,
or `draftably-site` counts too. Set the time range
at the top right. "Filter" means a row in the Filter section; "Group by" and "Visualize" are the
other sections. Star a query to keep it.

**Is it up? What is the error rate?**
Count from the invocation logs, which have one row per request, even for a request Cloudflare cut
off at the CPU limit before the Worker logged its event. Visualize `Count`, Filter
`$workers.outcome exists`, Group by `$workers.outcome` and `$workers.event.response.status`. A
failure is an outcome other than `ok` (`exceededCpu`, `exception`) or a status of 500 or more. The
Worker's **Metrics** tab shows requests, errors and CPU time with no query. For a probe,
`GET /health` answers `{ok, version}`.

**Requests by route and by status.**
Visualize `Count`, Filter `event = request`, Group by `route` and `status`.

**Render latency p50/p95 by format, and the cache hit rate.**
Latency comes from the invocation logs (not the spans, above). In the Query builder, Visualize
`P50` and `P95` of `$workers.cpuTimeMs` and `$workers.wallTimeMs`, Filter
`$workers.event.request.method = GET` and `$workers.event.request.url` matches regex
`^https?://[^/]+/(draftably/)?png/[^/]+$` (then `svg`). Cloudflare shows an image path as `/png/REDACTED`, which still
matches. For REST and MCP, Filter method `POST` and the URL on regex `^https?://[^/]+/v1/render$` or
`^https?://[^/]+/mcp$`: those don't split by format.
Hit rate: Visualize `Count`, Filter `event = request` and `cache exists`, Group by `format` and
`cache`.

**Which diagrams fail to render, and why? Mermaid import failures.**
Visualize `Count`, Filter `event = request` and `error_code = ERR_SOURCE`, Group by `route`,
`path`, `mcp_tool`, `source_type` and `error`. Failed renders are the rows with `route = image`,
`path = /v1/render` or `mcp_tool = render_diagram`; the rest are `/v1/validate`, `/v1/convert` and
the MCP validate and convert tools. For Mermaid only, add Filter `source_type = mermaid`. To see a
failure's steps, open the matching event's trace from the event's details, and look at its
`mermaid.import` or `render.svg` span.

**Who uses it: accounts and keys by request count and credits spent.**
Visualize `Count` and `Sum` of `credits_spent`, Filter `event = request` and `account exists`,
Group by `account` and `key`, Order by the sum. The account ID maps to an email in D1:
`wrangler d1 execute draftably-service --remote --command "SELECT email FROM accounts WHERE id = '<id>'"`.

**Who is near or out of credits; 402s.**
Out: Visualize `Count`, Filter `event = request` and `error_code = ERR_LIMIT_BALANCE`, Group by
`account`. That is a 402 over GET and REST, and an error result (status 200) over MCP. Near empty:
Visualize `Min` of `credits_left`, Filter `credits_left < 100`, Group by `account`. A render that
lost a race for the last credits records the balance read after its failed debit.

**Rate-limit hits by limiter. Bot or scanner noise.**
Limits: Visualize `Count`, Filter `rate_limit exists`, Group by `rate_limit`. Scanners: Visualize
`Count`, Filter `event = request` and `status = 404`, Group by `ip` and `path`, Order by count. The
same `ip` on one limit again and again is one address.

**Sign-in emails sent vs failed, and links used vs expired.**
Visualize `Count`, Filter `route = login` and `login exists`, Group by `login`. `sent` against
`send_failed` and `capped`; `signed_in` against `link_dead` (used or expired). A failed send is
also an Issue.

**Stripe webhooks received, fulfilled, ignored or rejected.**
Visualize `Count`, Filter `route = webhook`, Group by `webhook` and `stripe_event`. An `unmatched`
purchase also logs its Checkout session ID with `console.error`, so it shows as an Issue; credit
it by hand.

**MCP tool calls by tool.**
Visualize `Count`, Filter `route = mcp` and `mcp_tool exists`, Group by `mcp_tool` and `status`.
A tool that answered with an error has `error_code`.

**A slow request: which step was slow?**
Find it: in the Query builder, on the invocation logs, Order by `$workers.cpuTimeMs` (or
`wallTimeMs`) descending. Open its trace from the event. The waterfall shows the steps in order:
`decode`, `render` (`cache.lookup`, `source.detect`, `mermaid.import`, `render.svg`, the `png.*`
steps, `credits.spend`), then `cache.put`. A long I/O span (D1, cache, email) is the wait. High CPU
time with short I/O spans means the drawing itself: read `source_bytes`, `pixels` and `scale` on
the request's wide event, and `cold = true` on `mermaid.import` or `png.rasterize` (a new isolate
loading the parser or resvg).

**Which deploy did an error start in?**
Visualize `Count`, Filter `event = request` and `status >= 500` (or `error_code exists`), Group by
`build`. `wrangler deployments list` (in `packages/service`) maps a version ID to its deploy time.
An Issue also shows its first and last seen times and the versions it occurred in.

## The dev loop: `pnpm o11y`

`pnpm o11y` (in [`scripts/o11y.ts`](../../../scripts/o11y.ts)) asks the Observability API the
questions above and prints one brief: the last 24 hours against the 7 days before, the open Issues
with a stack frame, version and trace ID, errors by code and by build, latency, cache, usage,
limits, sign-ins and webhooks. It ends with at most three **Actions**, new failures first.

1. Run `pnpm o11y` (each morning, or after a deploy). `--hours 6` for a shorter window; `--json`
   for an agent; `--keys` lists the indexed field names when a query comes back empty.
2. Take the first action: open its trace, reproduce it locally, fix it, and deploy. The Issues table
   marks each issue `new`, `open`, `not on live build` (likely fixed: resolve it once the route has
   had traffic) or `scanner` (Cloudflare's own flag for probes such as `/.env`; nothing to fix).
3. On the next run, read **By build**: the error should stop on the new build. With little traffic,
   wait for more before calling it fixed.

Each run saves `tmp/o11y/<time>.json`, so trends outlive Cloudflare's 7-day retention.

It needs its own token: Wrangler's login has no observability scope. Make one at **My Profile → API
Tokens → Create Token → Custom**, with Account → **Workers Observability: Edit** (the query
endpoint asks for edit, even to read) on this account. Save it:

```sh
mkdir -p ~/.config/draftably && pbpaste > ~/.config/draftably/o11y-token
```

or set `CF_O11Y_TOKEN`. Don't put it in `CLOUDFLARE_API_TOKEN`: Wrangler would use it to deploy.

## Alerts

Workers Issues sends a notice when a new issue opens or an old one comes back. In **Observability
→ Issues → Automations**, add an automation and pick the destination: a webhook (for example a
Slack or Discord incoming webhook URL) or another listed service. For email, add a **Monitor**
(Observability → Monitors) on a saved query, such as `status >= 500` over 5 minutes, and choose
email as its destination.

## Send traces to another tool later

Not needed now. To send logs or traces to an OTLP endpoint (Honeycomb, Grafana, Axiom):

1. Add a destination in **Observability → Destinations**: its name, type (traces or logs), OTLP
   endpoint and headers (for example the API key).
2. Name it in `wrangler.jsonc`, then deploy:

   ```jsonc
   "traces": { "enabled": true, "destinations": ["honeycomb-traces"], "persist": true },
   ```

   `persist: true` keeps the copy in the Cloudflare dashboard too. Only JSON OTLP is supported.

## Cost

On Workers Paid, logs and traces share 50 GB of ingestion and 10 GB-month of storage a month
(from December 2026), kept for 7 days. A request now writes about 3 KB of logs and spans, so
about 15 M requests a month fit. When the dashboard's usage page nears the limit, lower
`head_sampling_rate` under `logs` and `traces` (for example to `0.1`). Issues are free in the
open beta.
