# Agent diagram comparison: method and replay

The findings and images are on the docs page:
[site/docs/pages/agent-diagram-evaluation.md](../../../site/docs/pages/agent-diagram-evaluation.md).

## What is here

| File                                               | Content                                                                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `tasks.json`                                       | Three tasks. `prompt` is the plain-words task. `score` lists the nodes, edges and groups a correct drawing has; the model never sees it. |
| `prompt.txt`                                       | The one prompt template. `{{REFERENCE}}` is empty in the bare arm.                                                                       |
| `bare/`, `reference/`                              | The 30 sources, as returned by the model. Only Markdown fences were removed.                                                             |
| `prompt-tooled.txt`, `tooled/`                     | The tooled arm's prompt template and its 15 sources: the file each agent saved, unchanged.                                               |
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

## The tooled arm

`scripts/diagram-compare/tooled.mjs` runs one agent session per task and format. Each session
starts in an empty temporary folder with Bash, Read, Write, Edit, Glob and Grep. Bash may run only
that format's CLI and `ls`. There is no web access, no MCP server and no user or project setting.
Each session has at most 30 turns, $3 and 15 minutes.

| Format    | CLI on PATH                                               | Docs in the folder                                                                                                                                                     |
| --------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draftably | `draftably` (this repository; `open` and `serve` are off) | The agent skill, from `draftably skill install`                                                                                                                        |
| Mermaid   | `mmdc` (@mermaid-js/mermaid-cli 11)                       | `flowchart.md`, `stateDiagram.md` from mermaid-js/mermaid `packages/mermaid/src/docs/syntax/` at `ea53556f`                                                            |
| D2        | `d2` 0.9.0                                                | `hello-world`, `shapes`, `connections`, `containers`, `style`, `text`, `layouts` from terrastruct/d2-docs `docs/tour/` at `5530a5ec`                                   |
| DOT       | `dot` (Graphviz 16.1.0)                                   | graphviz.org `doc/info/lang.html` and `doc/info/shapes.html` as plain text, with the site navigation cut, fetched on November 3, 2026                                  |
| Raw SVG   | `svg2png in.svg out.png` (`rsvg-convert`)                 | `getting_started`, `positions`, `basic_shapes`, `paths`, `fills_and_strokes`, `texts` from mdn/content `files/en-us/web/svg/tutorials/svg_from_scratch/` at `35b1d907` |

The third-party docs are not in this repository. Download them into one folder per format, then
run:

```sh
MMDC=path/to/mmdc pnpm eval:diagrams:tooled path/to/docs
```

Name cells such as `state/draftably` after the folder to run only those. The script writes the
transcripts to `tmp/diagram-tooled/` and updates the tooled rows in `results.json`. Then run
`pnpm eval:diagrams:replay tmp/diagram-render --publish` to render them.
