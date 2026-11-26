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

| Field                                      | Values                                                                                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `route`                                    | `image`, `rest`, `mcp`, `account`, `login`, `webhook`, `health`, `other`                                                                                                |
| `method`, `status`                         | the request method and the answer's status; `500` for an uncaught error                                                                                                 |
| `path`                                     | the path, except for `image` (its path holds the diagram source); 200 characters at most                                                                                |
| `ms`                                       | the time to the answer. Workers' clock moves only on I/O, so CPU work after the last I/O is not counted. Use `$workers.wallTimeMs` and `$workers.cpuTimeMs` for latency |
| `version`, `build`                         | the Draftably runtime version, and the Worker version ID of the deploy                                                                                                  |
| `ip`                                       | the first 12 hex characters of the client IP's SHA-256. It groups one address's requests; it is not anonymous, since IPv4 is small enough to search                     |
| `country`                                  | Cloudflare's country code for the client                                                                                                                                |
| `payer`                                    | `anonymous`, `key` or `session`                                                                                                                                         |
| `account`, `key`                           | the account ID and the key ID (`dft_<key>.…`), when known                                                                                                               |
| `cache`                                    | `hit` or `miss`                                                                                                                                                         |
| `format`, `source_type`, `scheme`, `scale` | `svg` or `png`; `draftably` or `mermaid`; the options                                                                                                                   |
| `source_bytes`, `out_bytes`, `pixels`      | the source size, the image size, and the PNG pixel count                                                                                                                |
| `credits_spent`, `credits_left`            | the credits this render took, and the balance after it (or the balance that was too low, on a 402)                                                                      |
| `credits_bought`                           | the credits a Stripe purchase added                                                                                                                                     |
| `rate_limit`                               | `anon`, `key` or `login`: the limiter that refused the request                                                                                                          |
| `mcp_tool`                                 | the MCP tool called; empty for MCP protocol calls such as `initialize`                                                                                                  |
| `login`                                    | `form`, `bad_email`, `capped`, `sent`, `send_failed`, `link_shown`, `link_dead`, `signed_in`                                                                            |
| `webhook`, `stripe_event`                  | `off`, `bad_signature`, `too_large`, `ignored`, `not_ours`, `unmatched`, `fulfilled`, `duplicate`; and the Stripe event type                                            |
| `error_code`, `error`                      | `ERR_SOURCE`, `ERR_AUTH`, `ERR_LIMIT_BURST`, `ERR_LIMIT_BALANCE`, `ERR_NOT_FOUND`, `ERR_EMAIL` or `ERR_INTERNAL`; and the message, 300 characters at most               |

The event never holds an email, a key secret, a session or sign-in token, or a raw IP. A source
error's message can quote a line of the diagram.

## The spans

Each span records an exception and an `error` status when its step throws.

| Span                                                    | Attributes                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `decode`                                                | `segment_bytes`, `source_bytes`                                                                  |
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

All queries are in **Observability → Query builder** unless they say otherwise. Set the time range
at the top right. "Filter" means a row in the Filter section; "Group by" and "Visualize" are the
other sections. Star a query to keep it.

**Is it up? What is the error rate?**
Visualize `Count`, Filter `event = request`, Group by `status`. Or use the Worker's **Metrics**
tab, which shows requests, errors and CPU time with no query. For a probe, `GET /health` answers
`{ok, version}`.

**Requests by route and by status.**
Visualize `Count`, Filter `event = request`, Group by `route` and `status`.

**Render latency p50/p95 by format, and the cache hit rate.**
Latency: in the Traces tab, filter on the root span's `url.full` containing `/png/` or `/svg/`
and read the duration column. Or in the Query builder, Visualize `P50` and `P95` of
`$workers.wallTimeMs` (and of `$workers.cpuTimeMs`) on the invocation logs, Filter
`$workers.event.request.url` includes `/png/` (then `/svg/`). Hit rate: Visualize `Count`, Filter
`event = request` and `cache exists`, Group by `format` and `cache`.

**Which diagrams fail to render, and why? Mermaid import failures.**
Visualize `Count`, Filter `event = request` and `error_code = ERR_SOURCE`, Group by `source_type`
and `error`. Mermaid only: add Filter `source_type = mermaid`. In Traces, filter on span name
`mermaid.import` with status error to see the exception.

**Who uses it: accounts and keys by request count and credits spent.**
Visualize `Count` and `Sum` of `credits_spent`, Filter `event = request` and `account exists`,
Group by `account` and `key`, Order by the sum. The account ID maps to an email in D1:
`wrangler d1 execute draftably-service --remote --command "SELECT email FROM accounts WHERE id = '<id>'"`.

**Who is near or out of credits; 402s.**
402s: Visualize `Count`, Filter `event = request` and `status = 402`, Group by `account`. Near
empty: Visualize `Min` of `credits_left`, Filter `credits_left < 100`, Group by `account`.

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
In **Traces**, sort by duration, open a trace, and read the waterfall: `decode`, `cache.lookup`,
`source.detect`, `mermaid.import`, `render.svg`, the `png.*` steps, `credits.spend`, then
`cache.put`. The root span holds `cpu_time_ms` and `wall_time_ms`. A slow `mermaid.import` or
`png.rasterize` with `cold = true` is a new isolate loading the parser or resvg.

**Which deploy did an error start in?**
Visualize `Count`, Filter `event = request` and `status >= 500` (or `error_code exists`), Group by
`build`. `wrangler deployments list` (in `packages/service`) maps a version ID to its deploy time.
An Issue also shows its first and last seen times and the versions it occurred in.

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
