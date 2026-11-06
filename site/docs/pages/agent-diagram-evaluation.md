# Agent diagram comparison

We asked one model, `claude-opus-5-5`, to draw the same three diagrams in Mermaid, Draftably, D2,
Graphviz DOT and raw SVG. Each task was given in plain words. It was run three ways:

- **Bare:** the task and the name of the format, in one reply with no tools.
- **Reference:** the same, plus about 35 lines condensed from that format's own docs.
- **With CLI and docs:** an agent session in an empty folder with that format's own command-line
  tool and its docs. For Draftably, that is the `draftably` CLI and its agent skill. The agent can
  check and render its file and look at the image. Each session has at most 30 turns.

The first two arms show what a model writes cold. The third is how people use these tools with an
agent. Every cell is one sample, and each source was drawn by that format's own renderer. A failure
is shown as the error it produced.

## Results

|                   | Mermaid | Draftably  | D2     | Graphviz DOT | Raw SVG |
| ----------------- | ------- | ---------- | ------ | ------------ | ------- |
| Bare prompt       | 3 of 3  | **0 of 3** | 3 of 3 | 3 of 3       | 3 of 3  |
| With reference    | 3 of 3  | **3 of 3** | 3 of 3 | 3 of 3       | 3 of 3  |
| With CLI and docs | 3 of 3  | **3 of 3** | 3 of 3 | 3 of 3       | 3 of 3  |

With the CLI and docs, the agents used these turns and tool calls per cell:

|             | Mermaid   | Draftably   | D2         | Graphviz DOT | Raw SVG    |
| ----------- | --------- | ----------- | ---------- | ------------ | ---------- |
| Turns       | 4 / 4 / 4 | 12 / 8 / 10 | 5 / 12 / 5 | 9 / 4 / 4    | 5 / 10 / 8 |
| CLI calls   | 1 / 1 / 1 | 5 / 4 / 4   | 1 / 5 / 1  | 3 / 1 / 1    | 2 / 4 / 3  |
| Image views | 1 / 1 / 1 | 2 / 1 / 2   | 1 / 2 / 1  | 2 / 1 / 1    | 1 / 3 / 2  |

Each entry is workflow / architecture / state machine. The 15 sessions cost $2.14 in all.

## Two runs

The bare arm ran once, on November 3, 2026. The reference and CLI arms ran twice, for all five
formats each time. This page shows the second run. Between the runs, Draftably changed in ways that
help any diagram, not these three tasks:

- `check` warns when a drawing is wider than 2:1 and wider than 960px, and says how much it shrinks
  in a page column. It suggests `fit=slide` on the root layout line.
- `vary` ranks a drawing that wide for `--fit slide` when no `--fit` is given.
- A layout line ignores a setting it does not take, with a warning that names the right one. A
  second layout line for one scope replaces the first, with a warning.
- The agent skill says that most diagrams are read in a 700–1000px column, and that readable text
  matters more than one avoided crossing. The Draftably reference was rebuilt from it at 38 lines,
  as long as the longest other reference.

In the first run, Draftably rendered 1 of 3 with the reference. Both failures came from one strict
`layout` line: `gap=` on an engine line, and a second `layout root` line. With the CLI it rendered
3 of 3, but the architecture and state machine were 2.6:1 and 3.4:1. The agent saw the aspect
warning, called it a slide concern, and kept the wide layout because it had no crossings.

## Where Draftably wins and loses

**With CLI and docs, 3 of 3.** Every agent read the skill, ran `draftably check --fit slide`, tried
`vary`, and kept a page-shaped drawing: the architecture is 917×603 and the state machine 539×632,
against 1177×448 and 1258×372 in the first run. No `check` warning is left in any of the three.
Draftably took more turns than the others (8 to 12) because it spent them on shape. The
architecture is one of the two clearest drawings in its task, and the state machine is close
behind Mermaid's.

**Reference, 3 of 3.** The architecture rendered as three clear groups at full size. Two problems
are left, and no CLI was there to catch them:

- The workflow draws one line through two decision boxes. `check` reports it, but this arm has no
  `check`.
- The state machine is still 3.6:1. The model wrote `direction=right fit=slide`, and a stated
  direction overrides `fit=`. The skill says to leave `direction=` out with `fit=`, but the
  38-line reference does not.

**Bare, 0 of 3.** The model does not know Draftably. In all three cells it said so and asked for the
syntax. In two cells it also wrote the diagram in Mermaid. This is the cost of a format that is not
in the training data, and the reason the skill and the CLI matter.

Draftably's workflow agents also renamed "Start" to "Order start" or "Order received". The meaning
holds, but the label is not the one the task implies.

## The other four formats

Mermaid, D2, DOT and raw SVG rendered in every cell, in every arm and run. The reference changes
little for them: the model already knows these formats well. Mermaid, D2 and DOT added a "Customer"
node to the architecture that the task did not ask for, in every arm. D2's drawings have the
smallest text and the most crossings in every arm.

One sample per cell varies. Mermaid's architecture with the CLI was a clear top-down drawing in the
first run and a wide strip with tiny text in the second. Its reference state machine moved from
top-down to a wide strip too.

Raw SVG produced the most consistent drawings, because the model places every box itself. It also
wrote the longest sources.

## Workflow task

**Reads best: Graphviz DOT and raw SVG**, in every arm. Both keep large text and clear yes/no branches. With the CLI, Draftably is close: a clean top-down flow with colored decisions and a legend, but taller, so its text is smaller. Draftably's reference drawing runs a line through two decision boxes. Mermaid is clear but tall, and D2 shrinks the text the most.

### Bare prompt

**Mermaid** · 14 lines · [source](/evaluations/agent-diagrams/source/bare/workflow/mermaid.mmd.txt)

![Mermaid, bare prompt: Order approval workflow](/evaluations/agent-diagrams/bare-workflow-mermaid.svg)

**Draftably** · [source](/evaluations/agent-diagrams/source/bare/workflow/draftably.draft.txt) · did not render: `Line 1: Unknown statement I'm.`

**D2** · 26 lines · [source](/evaluations/agent-diagrams/source/bare/workflow/d2.d2.txt)

![D2, bare prompt: Order approval workflow](/evaluations/agent-diagrams/bare-workflow-d2.svg)

**Graphviz DOT** · 29 lines · [source](/evaluations/agent-diagrams/source/bare/workflow/dot.dot.txt)

![Graphviz DOT, bare prompt: Order approval workflow](/evaluations/agent-diagrams/bare-workflow-dot.svg)

**Raw SVG** · 52 lines · [source](/evaluations/agent-diagrams/source/bare/workflow/svg.svg.txt)

![Raw SVG, bare prompt: Order approval workflow](/evaluations/agent-diagrams/bare-workflow-svg.svg)

### With reference

**Mermaid** · 14 lines · [source](/evaluations/agent-diagrams/source/reference/workflow/mermaid.mmd.txt)

![Mermaid, with reference: Order approval workflow](/evaluations/agent-diagrams/reference-workflow-mermaid.svg)

**Draftably** · 24 lines · [source](/evaluations/agent-diagrams/source/reference/workflow/draftably.draft.txt)

![Draftably, with reference: Order approval workflow](/evaluations/agent-diagrams/reference-workflow-draftably.svg)

**D2** · 23 lines · [source](/evaluations/agent-diagrams/source/reference/workflow/d2.d2.txt)

![D2, with reference: Order approval workflow](/evaluations/agent-diagrams/reference-workflow-d2.svg)

**Graphviz DOT** · 26 lines · [source](/evaluations/agent-diagrams/source/reference/workflow/dot.dot.txt)

![Graphviz DOT, with reference: Order approval workflow](/evaluations/agent-diagrams/reference-workflow-dot.svg)

**Raw SVG** · 42 lines · [source](/evaluations/agent-diagrams/source/reference/workflow/svg.svg.txt)

![Raw SVG, with reference: Order approval workflow](/evaluations/agent-diagrams/reference-workflow-svg.svg)

### With CLI and docs

**Mermaid** · 14 lines · 4 turns, 1 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/workflow/mermaid.mmd.txt)

![Mermaid, with cli and docs: Order approval workflow](/evaluations/agent-diagrams/tooled-workflow-mermaid.svg)

**Draftably** · 28 lines · 12 turns, 5 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/workflow/draftably.draft.txt)

![Draftably, with cli and docs: Order approval workflow](/evaluations/agent-diagrams/tooled-workflow-draftably.svg)

**D2** · 29 lines · 5 turns, 1 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/workflow/d2.d2.txt)

![D2, with cli and docs: Order approval workflow](/evaluations/agent-diagrams/tooled-workflow-d2.svg)

**Graphviz DOT** · 28 lines · 9 turns, 3 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/workflow/dot.dot.txt)

![Graphviz DOT, with cli and docs: Order approval workflow](/evaluations/agent-diagrams/tooled-workflow-dot.svg)

**Raw SVG** · 75 lines · 5 turns, 2 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/workflow/svg.svg.txt)

![Raw SVG, with cli and docs: Order approval workflow](/evaluations/agent-diagrams/tooled-workflow-svg.svg)

## Architecture task

**Reads best: Draftably and raw SVG.** With the reference and with the CLI, Draftably draws the three groups as stacked bands with large text and no extra nodes. Raw SVG lays them out as columns. DOT is compact and grouped, but small. Mermaid, D2 and DOT add a "Customer" node, and Mermaid and D2 come out as wide strips with tiny text in this run.

### Bare prompt

**Mermaid** · 33 lines · [source](/evaluations/agent-diagrams/source/bare/architecture/mermaid.mmd.txt)

![Mermaid, bare prompt: Checkout service architecture](/evaluations/agent-diagrams/bare-architecture-mermaid.svg)

**Draftably** · [source](/evaluations/agent-diagrams/source/bare/architecture/draftably.draft.txt) · did not render: `Line 1: Unknown statement I'm.`

**D2** · 39 lines · [source](/evaluations/agent-diagrams/source/bare/architecture/d2.d2.txt)

![D2, bare prompt: Checkout service architecture](/evaluations/agent-diagrams/bare-architecture-d2.svg)

**Graphviz DOT** · 51 lines · [source](/evaluations/agent-diagrams/source/bare/architecture/dot.dot.txt)

![Graphviz DOT, bare prompt: Checkout service architecture](/evaluations/agent-diagrams/bare-architecture-dot.svg)

**Raw SVG** · 72 lines · [source](/evaluations/agent-diagrams/source/bare/architecture/svg.svg.txt)

![Raw SVG, bare prompt: Checkout service architecture](/evaluations/agent-diagrams/bare-architecture-svg.svg)

### With reference

**Mermaid** · 36 lines · [source](/evaluations/agent-diagrams/source/reference/architecture/mermaid.mmd.txt)

![Mermaid, with reference: Checkout service architecture](/evaluations/agent-diagrams/reference-architecture-mermaid.svg)

**Draftably** · 26 lines · [source](/evaluations/agent-diagrams/source/reference/architecture/draftably.draft.txt)

![Draftably, with reference: Checkout service architecture](/evaluations/agent-diagrams/reference-architecture-draftably.svg)

**D2** · 36 lines · [source](/evaluations/agent-diagrams/source/reference/architecture/d2.d2.txt)

![D2, with reference: Checkout service architecture](/evaluations/agent-diagrams/reference-architecture-d2.svg)

**Graphviz DOT** · 45 lines · [source](/evaluations/agent-diagrams/source/reference/architecture/dot.dot.txt)

![Graphviz DOT, with reference: Checkout service architecture](/evaluations/agent-diagrams/reference-architecture-dot.svg)

**Raw SVG** · 47 lines · [source](/evaluations/agent-diagrams/source/reference/architecture/svg.svg.txt)

![Raw SVG, with reference: Checkout service architecture](/evaluations/agent-diagrams/reference-architecture-svg.svg)

### With CLI and docs

**Mermaid** · 33 lines · 4 turns, 1 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/architecture/mermaid.mmd.txt)

![Mermaid, with cli and docs: Checkout service architecture](/evaluations/agent-diagrams/tooled-architecture-mermaid.svg)

**Draftably** · 33 lines · 8 turns, 4 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/architecture/draftably.draft.txt)

![Draftably, with cli and docs: Checkout service architecture](/evaluations/agent-diagrams/tooled-architecture-draftably.svg)

**D2** · 53 lines · 12 turns, 5 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/architecture/d2.d2.txt)

![D2, with cli and docs: Checkout service architecture](/evaluations/agent-diagrams/tooled-architecture-d2.svg)

**Graphviz DOT** · 43 lines · 4 turns, 1 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/architecture/dot.dot.txt)

![Graphviz DOT, with cli and docs: Checkout service architecture](/evaluations/agent-diagrams/tooled-architecture-dot.svg)

**Raw SVG** · 86 lines · 10 turns, 4 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/architecture/svg.svg.txt)

![Raw SVG, with cli and docs: Checkout service architecture](/evaluations/agent-diagrams/tooled-architecture-svg.svg)

## State-machine task

**Reads best: Mermaid and Draftably with the CLI.** Both draw top-down with large text and keep every return path apart. Raw SVG is next, and it is the clearest drawing in the reference arm, where Mermaid and Draftably both came out wide. DOT crowds its labels, and D2 tangles the return edges.

### Bare prompt

**Mermaid** · 16 lines · [source](/evaluations/agent-diagrams/source/bare/state/mermaid.mmd.txt)

![Mermaid, bare prompt: Publishing state machine](/evaluations/agent-diagrams/bare-state-mermaid.svg)

**Draftably** · [source](/evaluations/agent-diagrams/source/bare/state/draftably.draft.txt) · did not render: `Line 1: Unknown statement I'm.`

**D2** · 29 lines · [source](/evaluations/agent-diagrams/source/bare/state/d2.d2.txt)

![D2, bare prompt: Publishing state machine](/evaluations/agent-diagrams/bare-state-d2.svg)

**Graphviz DOT** · 26 lines · [source](/evaluations/agent-diagrams/source/bare/state/dot.dot.txt)

![Graphviz DOT, bare prompt: Publishing state machine](/evaluations/agent-diagrams/bare-state-dot.svg)

**Raw SVG** · 47 lines · [source](/evaluations/agent-diagrams/source/bare/state/svg.svg.txt)

![Raw SVG, bare prompt: Publishing state machine](/evaluations/agent-diagrams/bare-state-svg.svg)

### With reference

**Mermaid** · 21 lines · [source](/evaluations/agent-diagrams/source/reference/state/mermaid.mmd.txt)

![Mermaid, with reference: Publishing state machine](/evaluations/agent-diagrams/reference-state-mermaid.svg)

**Draftably** · 19 lines · [source](/evaluations/agent-diagrams/source/reference/state/draftably.draft.txt)

![Draftably, with reference: Publishing state machine](/evaluations/agent-diagrams/reference-state-draftably.svg)

**D2** · 21 lines · [source](/evaluations/agent-diagrams/source/reference/state/d2.d2.txt)

![D2, with reference: Publishing state machine](/evaluations/agent-diagrams/reference-state-d2.svg)

**Graphviz DOT** · 24 lines · [source](/evaluations/agent-diagrams/source/reference/state/dot.dot.txt)

![Graphviz DOT, with reference: Publishing state machine](/evaluations/agent-diagrams/reference-state-dot.svg)

**Raw SVG** · 52 lines · [source](/evaluations/agent-diagrams/source/reference/state/svg.svg.txt)

![Raw SVG, with reference: Publishing state machine](/evaluations/agent-diagrams/reference-state-svg.svg)

### With CLI and docs

**Mermaid** · 20 lines · 4 turns, 1 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/state/mermaid.mmd.txt)

![Mermaid, with cli and docs: Publishing state machine](/evaluations/agent-diagrams/tooled-state-mermaid.svg)

**Draftably** · 20 lines · 10 turns, 4 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/state/draftably.draft.txt)

![Draftably, with cli and docs: Publishing state machine](/evaluations/agent-diagrams/tooled-state-draftably.svg)

**D2** · 33 lines · 5 turns, 1 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/state/d2.d2.txt)

![D2, with cli and docs: Publishing state machine](/evaluations/agent-diagrams/tooled-state-d2.svg)

**Graphviz DOT** · 28 lines · 4 turns, 1 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/state/dot.dot.txt)

![Graphviz DOT, with cli and docs: Publishing state machine](/evaluations/agent-diagrams/tooled-state-dot.svg)

**Raw SVG** · 68 lines · 8 turns, 3 CLI calls · [source](/evaluations/agent-diagrams/source/tooled/state/svg.svg.txt)

![Raw SVG, with cli and docs: Publishing state machine](/evaluations/agent-diagrams/tooled-state-svg.svg)

## Limits

This is three small diagrams and one sample per cell, from one model. The verdicts are one
reviewer's reading of the images. In the CLI arm, each format had different docs: Draftably's
skill was written for agents, and the other formats' docs were not. Draftably changed between the
two runs; the other formats did not.

Read the [full report](/evaluations/agent-diagrams/report.txt),
[study setup](/evaluations/agent-diagrams/study-setup.txt),
[initial prompt](/evaluations/agent-diagrams/prompt.txt) and
[CLI prompt](/evaluations/agent-diagrams/prompt-tooled.txt) on this site.
The source links above contain all 45 initial responses.

The separate repair study reports 15/15 initial renders and 14/15 after one feedback response.
Eight agents changed their source and seven retained it. These paired samples do not establish
that feedback generally helps or harms a format.
