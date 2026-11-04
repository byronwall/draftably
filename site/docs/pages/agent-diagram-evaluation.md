# Agent diagram comparison

We asked one model, `claude-opus-5-5`, to draw the same three diagrams in Mermaid, Draftably, D2,
Graphviz DOT and raw SVG, on November 3, 2026. Each task was given in plain words. It was run three
ways:

- **Bare:** the task and the name of the format, in one reply with no tools.
- **Reference:** the same, plus about 35 lines condensed from that format's own docs.
- **With CLI and docs:** an agent session in an empty folder with that format's own command-line
  tool and its docs. For Draftably, that is the `draftably` CLI and its agent skill. The agent can
  check and render its file and look at the image. Each session has at most 30 turns.

The first two arms show what a model writes cold. The third is how people use these tools with an
agent. Every cell was run once, and each source was drawn by that format's own renderer. A failure
is shown as the error it produced.

## Results

|                   | Mermaid | Draftably  | D2     | Graphviz DOT | Raw SVG |
| ----------------- | ------- | ---------- | ------ | ------------ | ------- |
| Bare              | 3 of 3  | **0 of 3** | 3 of 3 | 3 of 3       | 3 of 3  |
| Reference         | 3 of 3  | **1 of 3** | 3 of 3 | 3 of 3       | 3 of 3  |
| With CLI and docs | 3 of 3  | **3 of 3** | 3 of 3 | 3 of 3       | 3 of 3  |

With the CLI and docs, the agents used these turns and tool calls per cell:

|             | Mermaid    | Draftably | D2        | Graphviz DOT | Raw SVG    |
| ----------- | ---------- | --------- | --------- | ------------ | ---------- |
| Turns       | 4 / 12 / 4 | 6 / 7 / 7 | 5 / 7 / 8 | 9 / 15 / 4   | 5 / 10 / 8 |
| CLI calls   | 1 / 4 / 1  | 1 / 3 / 3 | 1 / 2 / 2 | 3 / 5 / 1    | 2 / 4 / 3  |
| Image views | 1 / 3 / 1  | 1 / 1 / 1 | 1 / 1 / 2 | 2 / 4 / 1    | 1 / 3 / 2  |

Each entry is workflow / architecture / state machine. The 15 sessions cost $2.17 in all.

## Where Draftably won and lost

**With CLI and docs, 3 of 3.** In each cell the agent read `SKILL.md`, wrote the file and ran
`draftably check`. Every file was valid on its first check. It needed 1 to 3 CLI calls, no more than
the other formats. The workflow and the architecture have titles, subtitles and a legend, and the
workflow is one of the clearest drawings in that task.

What still loses: the architecture and the state machine come out wide. `draftably check` warned
about this both times (aspect 2.82 and 3.38) and suggested `draftably vary --fit slide`. For the
architecture, the agent ran `vary` and applied a variant, but the result is still wide. For the state
machine, it looked at the variants and kept its first layout. At page width, both have smaller text
than the Mermaid and raw SVG drawings. The CLI found the problem, but the agent did not fix it.

**Bare, 0 of 3.** The model does not know Draftably. In all three cells it said so and asked for the
syntax. In two cells it also wrote the diagram in Mermaid. This is the cost of a format that is not
in the training data, and the reason the skill and the CLI matter.

**Reference, 1 of 3.** With the reference, the model wrote valid nodes, groups and edges every time.
Each failure came from one `layout` line:

- Workflow: `layout root engine=layered direction=right gap=48`. `gap` belongs to `flow`, `row` and
  `column` layouts, not to engines. Error: `Unknown layout attribute: gap`.
- Architecture: `layout root engine=compound-flow` and then `layout root flow gap=48`. Error:
  `Duplicate declaration: layout:root`.

Both are reasonable guesses from the reference, which lists `gap=` and `engine=` on separate lines
without saying they do not mix. Mermaid, D2 and DOT accept extra or unknown style settings and
still draw. Draftably rejects the whole file for one bad layout option. With the CLI, `check`
catches this kind of error before the agent stops.

## The other four formats

Mermaid, D2, DOT and raw SVG rendered in every cell, in all three arms. The reference changed little:
the model already knows these formats well. The CLI helped most where the first draft was weak. The
Mermaid architecture went from a wide strip with tiny text to a clear top-down drawing after 4 CLI
calls and 3 image views. D2 stayed the weakest in every arm: its text is the smallest and its lines
cross the most.

Raw SVG produced the most consistent drawings, because the model places every box itself. It also
wrote the longest sources: 47 to 76 lines, against 14 to 36 for Mermaid.

## Workflow task

**Reads best: Graphviz DOT and raw SVG.** Both keep large text and clear yes/no branches. Raw SVG puts "Cancel order" to the side, so the main path runs straight down. With the CLI, Draftably joins them: a clean top-down flow with colored decisions and a legend, but smaller text. Mermaid is clear but tall, with small text. D2 shrinks the text the most. Draftably did not render without the CLI.

### Bare prompt

**Mermaid** · 14 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/workflow/mermaid.mmd)

![Mermaid, bare: Order approval workflow](/evaluations/agent-diagrams/bare-workflow-mermaid.svg)

**Draftably** · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/workflow/draftably.draft) · did not render: `Line 1: Unknown statement I'm.`

**D2** · 26 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/workflow/d2.d2)

![D2, bare: Order approval workflow](/evaluations/agent-diagrams/bare-workflow-d2.svg)

**Graphviz DOT** · 29 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/workflow/dot.dot)

![Graphviz DOT, bare: Order approval workflow](/evaluations/agent-diagrams/bare-workflow-dot.svg)

**Raw SVG** · 52 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/workflow/svg.svg)

![Raw SVG, bare: Order approval workflow](/evaluations/agent-diagrams/bare-workflow-svg.svg)

### With reference

**Mermaid** · 14 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/workflow/mermaid.mmd)

![Mermaid, reference: Order approval workflow](/evaluations/agent-diagrams/reference-workflow-mermaid.svg)

**Draftably** · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/workflow/draftably.draft) · did not render: `Line 24: Unknown layout attribute: gap.`

**D2** · 23 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/workflow/d2.d2)

![D2, reference: Order approval workflow](/evaluations/agent-diagrams/reference-workflow-d2.svg)

**Graphviz DOT** · 26 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/workflow/dot.dot)

![Graphviz DOT, reference: Order approval workflow](/evaluations/agent-diagrams/reference-workflow-dot.svg)

**Raw SVG** · 49 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/workflow/svg.svg)

![Raw SVG, reference: Order approval workflow](/evaluations/agent-diagrams/reference-workflow-svg.svg)

### With CLI and docs

**Mermaid** · 14 lines · 4 turns, 1 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/workflow/mermaid.mmd)

![Mermaid, with CLI and docs: Order approval workflow](/evaluations/agent-diagrams/tooled-workflow-mermaid.svg)

**Draftably** · 29 lines · 6 turns, 1 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/workflow/draftably.draft)

![Draftably, with CLI and docs: Order approval workflow](/evaluations/agent-diagrams/tooled-workflow-draftably.svg)

**D2** · 26 lines · 5 turns, 1 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/workflow/d2.d2)

![D2, with CLI and docs: Order approval workflow](/evaluations/agent-diagrams/tooled-workflow-d2.svg)

**Graphviz DOT** · 28 lines · 9 turns, 3 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/workflow/dot.dot)

![Graphviz DOT, with CLI and docs: Order approval workflow](/evaluations/agent-diagrams/tooled-workflow-dot.svg)

**Raw SVG** · 68 lines · 5 turns, 2 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/workflow/svg.svg)

![Raw SVG, with CLI and docs: Order approval workflow](/evaluations/agent-diagrams/tooled-workflow-svg.svg)

## Architecture task

**Reads best: raw SVG.** It is the only drawing where the three groups read as columns and every label is legible at page width. DOT is second: compact and grouped, but the worker loop curves under the data group. Mermaid and D2 lay the diagram out very wide, so the text is tiny. D2 also crosses lines through the services group. Mermaid, D2 and DOT added a "Customer" node that the task did not ask for, in every arm. With the CLI, Mermaid redrew top-down and became the most legible drawing, but it still has that extra node. Draftably, with the CLI, is correct and grouped, but wide, so its text is small at page width. Without the CLI it did not render.

### Bare prompt

**Mermaid** · 33 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/architecture/mermaid.mmd)

![Mermaid, bare: Checkout service architecture](/evaluations/agent-diagrams/bare-architecture-mermaid.svg)

**Draftably** · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/architecture/draftably.draft) · did not render: `Line 1: Unknown statement I'm.`

**D2** · 39 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/architecture/d2.d2)

![D2, bare: Checkout service architecture](/evaluations/agent-diagrams/bare-architecture-d2.svg)

**Graphviz DOT** · 51 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/architecture/dot.dot)

![Graphviz DOT, bare: Checkout service architecture](/evaluations/agent-diagrams/bare-architecture-dot.svg)

**Raw SVG** · 72 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/architecture/svg.svg)

![Raw SVG, bare: Checkout service architecture](/evaluations/agent-diagrams/bare-architecture-svg.svg)

### With reference

**Mermaid** · 36 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/architecture/mermaid.mmd)

![Mermaid, reference: Checkout service architecture](/evaluations/agent-diagrams/reference-architecture-mermaid.svg)

**Draftably** · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/architecture/draftably.draft) · did not render: `Line 27: Duplicate declaration: layout:root. Edit the existing line instead.`

**D2** · 35 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/architecture/d2.d2)

![D2, reference: Checkout service architecture](/evaluations/agent-diagrams/reference-architecture-d2.svg)

**Graphviz DOT** · 45 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/architecture/dot.dot)

![Graphviz DOT, reference: Checkout service architecture](/evaluations/agent-diagrams/reference-architecture-dot.svg)

**Raw SVG** · 60 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/architecture/svg.svg)

![Raw SVG, reference: Checkout service architecture](/evaluations/agent-diagrams/reference-architecture-svg.svg)

### With CLI and docs

**Mermaid** · 35 lines · 12 turns, 4 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/architecture/mermaid.mmd)

![Mermaid, with CLI and docs: Checkout service architecture](/evaluations/agent-diagrams/tooled-architecture-mermaid.svg)

**Draftably** · 34 lines · 7 turns, 3 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/architecture/draftably.draft)

![Draftably, with CLI and docs: Checkout service architecture](/evaluations/agent-diagrams/tooled-architecture-draftably.svg)

**D2** · 47 lines · 7 turns, 2 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/architecture/d2.d2)

![D2, with CLI and docs: Checkout service architecture](/evaluations/agent-diagrams/tooled-architecture-d2.svg)

**Graphviz DOT** · 61 lines · 15 turns, 5 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/architecture/dot.dot)

![Graphviz DOT, with CLI and docs: Checkout service architecture](/evaluations/agent-diagrams/tooled-architecture-dot.svg)

**Raw SVG** · 76 lines · 10 turns, 4 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/architecture/svg.svg)

![Raw SVG, with CLI and docs: Checkout service architecture](/evaluations/agent-diagrams/tooled-architecture-svg.svg)

## State-machine task

**Reads best: Mermaid.** Its state diagram has the largest text and keeps every return path apart. Raw SVG is second. Draftably, with the reference and with the CLI, drew a clean, compact chain, but it lays out left to right, so its labels are small and two return edges run close together. DOT crowds its labels, and D2 tangles the return edges.

### Bare prompt

**Mermaid** · 16 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/state/mermaid.mmd)

![Mermaid, bare: Publishing state machine](/evaluations/agent-diagrams/bare-state-mermaid.svg)

**Draftably** · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/state/draftably.draft) · did not render: `Line 1: Unknown statement I'm.`

**D2** · 29 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/state/d2.d2)

![D2, bare: Publishing state machine](/evaluations/agent-diagrams/bare-state-d2.svg)

**Graphviz DOT** · 26 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/state/dot.dot)

![Graphviz DOT, bare: Publishing state machine](/evaluations/agent-diagrams/bare-state-dot.svg)

**Raw SVG** · 47 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/bare/state/svg.svg)

![Raw SVG, bare: Publishing state machine](/evaluations/agent-diagrams/bare-state-svg.svg)

### With reference

**Mermaid** · 20 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/state/mermaid.mmd)

![Mermaid, reference: Publishing state machine](/evaluations/agent-diagrams/reference-state-mermaid.svg)

**Draftably** · 19 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/state/draftably.draft)

![Draftably, reference: Publishing state machine](/evaluations/agent-diagrams/reference-state-draftably.svg)

**D2** · 21 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/state/d2.d2)

![D2, reference: Publishing state machine](/evaluations/agent-diagrams/reference-state-d2.svg)

**Graphviz DOT** · 24 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/state/dot.dot)

![Graphviz DOT, reference: Publishing state machine](/evaluations/agent-diagrams/reference-state-dot.svg)

**Raw SVG** · 58 lines · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/reference/state/svg.svg)

![Raw SVG, reference: Publishing state machine](/evaluations/agent-diagrams/reference-state-svg.svg)

### With CLI and docs

**Mermaid** · 20 lines · 4 turns, 1 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/state/mermaid.mmd)

![Mermaid, with CLI and docs: Publishing state machine](/evaluations/agent-diagrams/tooled-state-mermaid.svg)

**Draftably** · 20 lines · 7 turns, 3 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/state/draftably.draft)

![Draftably, with CLI and docs: Publishing state machine](/evaluations/agent-diagrams/tooled-state-draftably.svg)

**D2** · 32 lines · 8 turns, 2 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/state/d2.d2)

![D2, with CLI and docs: Publishing state machine](/evaluations/agent-diagrams/tooled-state-d2.svg)

**Graphviz DOT** · 31 lines · 4 turns, 1 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/state/dot.dot)

![Graphviz DOT, with CLI and docs: Publishing state machine](/evaluations/agent-diagrams/tooled-state-dot.svg)

**Raw SVG** · 68 lines · 8 turns, 3 CLI calls · [source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tooled/state/svg.svg)

![Raw SVG, with CLI and docs: Publishing state machine](/evaluations/agent-diagrams/tooled-state-svg.svg)

## Limits

This is three small diagrams and one sample per cell, from one model. In the CLI arm, each format had different docs, and Draftably's skill was written for agents while the other formats' docs were not. The verdicts are one
reviewer's reading of the images. The prompts, references, sources and the replay steps are in
[docs/evaluations/agent-diagrams](https://github.com/byronwall/draftably/tree/main/docs/evaluations/agent-diagrams).
