# Hosted render URLs

`draftably.dev/api` draws a diagram from a URL. The URL holds the source, so it works in Markdown,
an `<img>` tag or an agent's reply. No account and no key are needed.

```sh
draftably url architecture.draft
draftably url architecture.draft --png
```

The CLI prints a URL like `https://draftably.dev/api/svg/pako:eJw1zE0K…`. Put it anywhere an image
goes:

```md
![Architecture](https://draftably.dev/api/svg/pako:eJw1zE0K…)
```

## Links without the CLI

`/link` takes the source as plain text, checks it, stores it, and returns short links. Anyone with
a short link can read the stored source. Use it when you have no CLI, for example from an agent in
a chat:

```sh
curl --data-binary @architecture.draft https://draftably.dev/api/link
```

```text
png: https://draftably.dev/api/d/<id>.png
svg: https://draftably.dev/api/d/<id>.svg
edit: https://draftably.dev/d/<id>
markdown: ![Diagram](https://draftably.dev/api/d/<id>.png)
```

Add `?format=json` for `{id, png, svg, edit, diagnostics}`. Warnings on a source that draws come
after the links. `GET /link?code=<percent-encoded source>` gives the same answer. A source that
doesn't draw gets `400` and no links; the error names the line and quotes its text. It takes the
same `?type=`, `?scheme=` and `?scale=` options as the image URLs.

To edit a diagram from a long image URL, change `/svg/` or `/png/` to `/edit/`. The service sends
you to the editor with the source loaded.

## The URL

```text
GET /api/svg/{encoded}   an SVG
GET /api/png/{encoded}   a PNG with the source embedded, so it opens again in the editor
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
[account page](https://draftably.dev/account): sign in with your email. Each account gets
1,000 free credits a month. Credit packs that add more go on sale soon. See [Pricing](https://draftably.dev/pricing).

## What the server keeps

The URL sends the source to Draftably's server. The server keeps the images it draws in a cache.
A short link (`/link` or `/v1/share`) stores the source itself, and anyone with the link can read
it at `/d/{id}.draft`.
For an account, it stores your email, your credit balance and a hash of each API key, never the key
itself. To keep a diagram off the server, use `draftably inspect plan.draft --svg` and host the file
yourself.

The [REST API](#rest-api) and the [MCP server](#mcp) use the same keys and credits.
