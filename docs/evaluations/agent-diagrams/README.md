# Agent diagram comparison: method and replay

The findings and images are on the docs page:
[site/docs/pages/agent-diagram-evaluation.md](../../../site/docs/pages/agent-diagram-evaluation.md).

## What is here

| File                                               | Content                                                                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `tasks.json`                                       | Three tasks. `prompt` is the plain-words task. `score` lists the nodes, edges and groups a correct drawing has; the model never sees it. |
| `prompt.txt`                                       | The one prompt template. `{{REFERENCE}}` is empty in the bare arm.                                                                       |
| `bare/`, `reference/`                              | The 30 sources, as returned by the model. Only Markdown fences were removed.                                                             |
| `results.json`                                     | Per cell: model, lines, bytes, render status, renderer, image name or error.                                                             |
| `../../../scripts/diagram-compare/references/`     | The five references used by the reference arm.                                                                                           |
| `../../../site/public/evaluations/agent-diagrams/` | The rendered SVGs, one per source that rendered.                                                                                         |

## Replay the renders

You need Node 22, pnpm, Graphviz `dot` and Chromium (`pnpm exec playwright-core install chromium`).

```sh
pnpm install --frozen-lockfile
pnpm cli:build
pnpm eval:diagrams:replay tmp/diagram-replay
```

This renders every source in `results.json` into `tmp/diagram-replay/<arm>/<task>/<format>/`. It
does not call a model. Add `--publish` to copy the SVGs into the site and update `results.json`.

## Generate again

```sh
pnpm eval:diagrams:generate claude-opus-5-5
```

This sends all 30 prompts to `claude -p` with no tools, settings or MCP servers, from an empty
temporary folder, five at a time. It replaces the sources and `results.json`. The run on November 3,
2026 cost about $0.79.
