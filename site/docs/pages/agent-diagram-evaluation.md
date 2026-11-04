# Agent diagram comparison

We asked one model to draw the same three diagrams in Mermaid, Draftably, D2, Graphviz DOT and raw
SVG. Every request ran in a fresh `claude -p` process with no tools and no project files. The model
was `claude-opus-5-5`, on November 3, 2026.

Each request was run twice:

- **Bare:** the task in plain words and the name of the format.
- **Reference:** the same, plus about 35 lines condensed from that format's own docs.

There was one attempt per cell, with no repair round. Each source was drawn by that format's own
renderer. A failure is shown as the error it produced.

## Results

|           | Mermaid | Draftably  | D2     | Graphviz DOT | Raw SVG |
| --------- | ------- | ---------- | ------ | ------------ | ------- |
| Bare      | 3 of 3  | **0 of 3** | 3 of 3 | 3 of 3       | 3 of 3  |
| Reference | 3 of 3  | **1 of 3** | 3 of 3 | 3 of 3       | 3 of 3  |

## Where Draftably lost

**Bare, 0 of 3.** The model does not know Draftably. In all three cells it said so and asked for the
syntax. In two cells it also wrote the diagram in Mermaid. This is the expected result for a new
format, and it is the main cost of a format that is not in the training data.

**Reference, 1 of 3.** With the reference, the model wrote valid nodes, groups and edges every time.
Each failure came from one `layout` line:

- Workflow: `layout root engine=layered direction=right gap=48`. `gap` belongs to `flow`, `row` and
  `column` layouts, not to engines. Error: `Unknown layout attribute: gap`.
- Architecture: `layout root engine=compound-flow` and then `layout root flow gap=48`. Error:
  `Duplicate declaration: layout:root`.

Both are reasonable guesses from the reference, which lists `gap=` and `engine=` on separate lines
without saying they do not mix. Mermaid, D2 and DOT accept extra or unknown style settings and
still draw. Draftably rejects the whole file for one bad layout option. The state machine, which
used one valid `layout` line, rendered as a compact, readable chain.

## The other four formats

Mermaid, D2, DOT and raw SVG rendered in every cell, in both arms. The reference changed little:
the bare and reference drawings for the same format look almost the same. The model already knows
these formats well.

Raw SVG produced the most consistent drawings, because the model places every box itself. It also
wrote the longest sources: 47 to 72 lines, against 14 to 36 for Mermaid.

## Workflow task

**Reads best: Graphviz DOT and raw SVG.** Both keep large text and clear yes/no branches. Raw SVG puts "Cancel order" to the side, so the main path runs straight down. Mermaid is clear but tall, with small text. D2 shrinks the text the most. Draftably did not render in either arm.

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

## Architecture task

**Reads best: raw SVG.** It is the only drawing where the three groups read as columns and every label is legible at page width. DOT is second: compact and grouped, but the worker loop curves under the data group. Mermaid and D2 lay the diagram out very wide, so the text is tiny. D2 also crosses lines through the services group. Mermaid, D2 and DOT added a "Customer" node that the task did not ask for. Draftably did not render in either arm.

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

## State-machine task

**Reads best: Mermaid.** Its state diagram has the largest text and keeps every return path apart. Raw SVG is second. Draftably, with the reference, drew a clean, compact chain with colored states, but its labels are small and two return edges run close together. DOT crowds its labels, and D2 tangles the return edges.

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

## Limits

This is three small diagrams and one sample per cell, from one model. The verdicts are one
reviewer's reading of the images. The prompts, references, sources and the replay steps are in
[docs/evaluations/agent-diagrams](https://github.com/byronwall/draftably/tree/main/docs/evaluations/agent-diagrams).
