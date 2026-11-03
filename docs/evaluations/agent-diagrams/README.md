# Three tasks, five native diagram formats

This evaluation compares actual agent-authored diagrams for an order workflow, grouped service
architecture and cyclic publishing state machine. Each task was attempted once in Mermaid,
Draftably, D2, Graphviz DOT and raw SVG. The task text is identical across formats; the format
name and short syntax reference differ.

**Status:** All fifteen initial sources rendered successfully in the canonical CI run, with
actual images and visual review preserved. One optional repair response per cell is being
measured separately; initial outputs are never replaced.

## Evidence

- [Preregistered protocol](PROTOCOL.md), committed before generation.
- [Exact task prompts and required semantics](tasks.json).
- [Format references](../../../scripts/diagram-compare/references/).
- [Initial sources, generation prompts, notes and renderer logs](cells/).
- `results.json`: source hashes, sizes, renderer outcomes and repair decisions.
- `source-audit.json`: manual agent review of source semantics, separate from visible quality.
- `visual-review.json`: initial image-based agent judgments, with concrete observations.
- `repair-source-audit.json`: source-semantic reassessment of the eight changed responses and hash-linked retention of the other seven.
- `REPORT.md`: findings, per-task comparison and limitations.

Initial source and rendered evidence are immutable. Formatting tools exclude the cell directory.
A changed render belongs in a separate output directory; repairs, if made, never replace an initial.

## Reproduce

Use Node >=22.21, the repository's pnpm version, Graphviz `dot`, and Chromium. Install the
repository dependencies with `pnpm install --frozen-lockfile`; Mermaid and D2 are lockfile pinned.
Install Chromium with `pnpm exec playwright-core install chromium`; set `CHROMIUM_PATH` to use a different executable. The captured Graphviz/browser
versions are in each attempt's metadata. Different installed system versions may change output.

```sh
pnpm cli:build
pnpm eval:diagrams:verify
pnpm eval:diagrams:replay tmp/diagram-replay-initial initial
pnpm eval:diagrams:replay tmp/diagram-replay-repaired repaired
```

The replay command runs native renderers on the committed source. It does **not** invoke a model,
regenerate source, score a drawing or silently replace the recorded attempt. Use a new destination
each time. The renderer refuses to overwrite an existing `render.json`.

For a new generation study, copy the tasks, references and generation template to a new run
folder first. `pnpm eval:diagrams:prepare` expands the 15 original handoffs; it does not invoke a
model. Give each handoff to a fresh agent context with no history, no competitor output, no render
feedback, the same backend configuration and the same response budget. Preserve the returned
native source and notes, then render it. The original platform did not expose a verifiable model
ID, sampling parameters, token usage or inference cost, so exact model replay is unavailable.

`pnpm eval:diagrams:collect docs/evaluations/agent-diagrams/runs/41554667774 <repaired-run-directory>` rebuilds the machine-readable manifest from the original attempt
files. Do not use it to bless edited originals; review changes against the committed hashes.

## Execution details

A maintenance interruption divided generation into two batches: nine cells before recovery,
six afterward. Each used a fresh native agent context. Exact backend/configuration continuity
across recovery cannot be verified, so this is a controlled-prompt case study, not a proven
same-model benchmark.

New Chromium processes were blocked by the execution sandbox (`socket: Operation not permitted`).
All fifteen sources were then rendered and captured in the canonical GitHub Actions run 41554667774. The unused local fallback server was removed after network isolation prevented it
from reaching the browser. See EXECUTION.md for exact environment and publication provenance.

D2 uses its native WASM Node API, Graphviz the system `dot -Tsvg`, Draftably its repository CLI.
Raw SVG is authored directly rather than translated from another format. Browser adapter timing
and shell adapter timing have different boundaries and are not compared. Font-cache warnings
from Graphviz are preserved. No token counts, price estimates or human-review claims are made.

## Scope

Three small diagrams and one sample per cell cannot establish broad superiority. The supplied
syntax references are curated and can affect results. The evaluator knows each format. Source
line counts measure verbosity, not quality or editing time. Semantic checks are manual agent
judgments, not a general parser or proof. Published results remain in a draft PR until reviewed;
this work does not deploy the site.
