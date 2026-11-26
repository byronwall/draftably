# REST API

The REST API at `https://api.draftably.dev/v1/` draws, checks and converts diagrams. The bodies
follow the Mermaid API (`{code, format}`), so an agent that knows one knows the other.

Every call needs a key. Make one on the [account page](https://api.draftably.dev/account): sign in
with your email. Send it as a header:

```text
Authorization: Bearer dft_...
```

## Render

```sh
curl https://api.draftably.dev/v1/render \
  -H "Authorization: Bearer dft_..." \
  -d '{"code": "node a\nnode b\nedge e a -> b", "format": "svg"}'
```

The body is JSON:

| Field    | Values                                   | Default  |
| -------- | ---------------------------------------- | -------- |
| `code`   | Draftably or Mermaid source, up to 64 KB | required |
| `format` | `svg`, `png`                             | `svg`    |
| `type`   | `draftably`, `mermaid`                   | guessed  |
| `scheme` | `light`, `dark`                          | `light`  |
| `scale`  | `1`, `2`, `3`, `4` (PNG only)            | `2`      |

The response is the image. Its headers say more:

- `X-Draftably-Url`: a [hosted render URL](#hosted-render-urls) that draws the same image for free.
- `X-Draftably-Cache`: `hit` or `miss`.
- `X-Draftably-Credits-Left`: the balance after a miss.

An SVG costs 1 credit and a PNG 2. A cache hit is free.

## Validate

`POST /v1/validate` with `{"code": "...", "type"?}` checks the source without drawing it. It is
free.

```json
{
  "valid": false,
  "type": "draftably",
  "diagnostics": [{ "severity": "error", "message": "…", "line": 3 }]
}
```

## Convert

`POST /v1/convert` with `{"code": "...", "from": "mermaid"}` returns Draftably source. It is free.

```json
{ "draft": "node api \"API\"\n…", "warnings": [] }
```

## Balance

`GET /v1/balance` returns `{grant, bought, resetsAt}`: the monthly credits left, the bought credits
left, and when the monthly credits reset. The monthly credits are spent first. Bought credits never
expire.

## Errors

Every error has one shape:

```json
{ "error": { "code": "ERR_SOURCE", "message": "line 3: Unknown statement web.", "line": 3 } }
```

| Code                | Status | Meaning                                                     |
| ------------------- | ------ | ----------------------------------------------------------- |
| `ERR_AUTH`          | 401    | No key, or a wrong or revoked key.                          |
| `ERR_SOURCE`        | 400    | The source or an option is bad, or the body is over 256 KB. |
| `ERR_LIMIT_BALANCE` | 402    | Out of credits. Buy more on the account page.               |
| `ERR_LIMIT_BURST`   | 429    | Too many calls this minute for this key.                    |
