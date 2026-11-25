# MCP server

`https://api.draftably.dev/mcp` is a remote MCP server (Streamable HTTP). An agent connects to it
and draws diagrams with nothing installed. It takes the same key as the [REST API](#rest-api). Make
one on the [account page](https://api.draftably.dev/account): sign in with your email.

To have the agent write `.draft` files on your machine instead, install the
[agent skill](#agent-skill). That runs locally and costs nothing.

## Connect

In Claude Code:

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

## Tools

| Tool               | What it does                                                                                                                                  | Cost                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `render_diagram`   | Draws the diagram. A PNG comes back as an image the agent can see; an SVG comes back as text. It also returns a free URL that draws it again. | PNG 2 credits, SVG 1 |
| `validate_diagram` | Checks the source and returns errors and warnings with line numbers.                                                                          | Free                 |
| `convert_mermaid`  | Turns a Mermaid flowchart, sequence, gantt or timeline into Draftably source.                                                                 | Free                 |
| `image_url`        | Returns a [hosted render URL](#hosted-render-urls) for Markdown or an `<img>` tag. Nothing is drawn yet.                                      | Free                 |
| `language_guide`   | Returns the language guide, the same text as the agent skill.                                                                                 | Free                 |

A render that the server drew before comes from the cache and costs nothing. Each account gets
1,000 free credits a month; see [Pricing](https://draftably.dev/pricing) for credit packs.
