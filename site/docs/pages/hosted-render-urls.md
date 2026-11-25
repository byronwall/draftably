# Hosted render URLs

`api.draftably.dev` draws a diagram from a URL. The URL holds the source, so it works in Markdown,
an `<img>` tag or an agent's reply. No account and no key are needed.

```sh
draftably url architecture.draft
draftably url architecture.draft --png
```

The CLI prints a URL like `https://api.draftably.dev/svg/pako:eJw1zE0K…`. Put it anywhere an image
goes:

```md
![Architecture](https://api.draftably.dev/svg/pako:eJw1zE0K…)
```

## The URL

```text
GET /svg/{encoded}   an SVG
GET /png/{encoded}   a PNG with the source embedded, so it opens again in the editor
```

`{encoded}` is `pako:` followed by the base64url of the zlib-deflated source, as mermaid.ink writes
it. Plain base64url of the source works too. The source can be up to 64 KB.

The source is Draftably or Mermaid (flowchart, sequence, gantt and timeline). The server guesses
which one it is.

| Option     | Values                        | Default |
| ---------- | ----------------------------- | ------- |
| `?type=`   | `draftably`, `mermaid`        | guessed |
| `?scheme=` | `light`, `dark`               | `light` |
| `?scale=`  | `1`, `2`, `3`, `4` (PNG only) | `2`     |

A bad source or option comes back as an image that shows the error, so a broken diagram is visible
where it is used.

## Limits and cost

Without a key, each address gets 60 new drawings a minute. An image the server drew before comes
from the cache and does not count.

Send an API key (`Authorization: Bearer dft_...`) to skip the address limit. A keyed request spends
credits: an SVG costs 1 and a PNG 2. A cache hit is free. Make a key on the
[account page](https://api.draftably.dev/account): sign in with your email. Each account gets
1,000 free credits a month, and credit packs add more. See [Pricing](https://draftably.dev/pricing).

## What the server keeps

The URL sends the source to Draftably's server. The server keeps the images it draws in a cache.
For an account, it stores your email, your credit balance and a hash of each API key, never the key
itself. To keep a diagram off the server, use `draftably inspect plan.draft --svg` and host the file
yourself.

The [REST API](#rest-api) and the [MCP server](#mcp) use the same keys and credits.
