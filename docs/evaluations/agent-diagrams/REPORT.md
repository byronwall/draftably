# Agent diagrams: three shared tasks across five native formats

## What was measured

Fifteen independent agent contexts produced one initial source each: three tasks multiplied by
Mermaid, Draftably, D2, Graphviz DOT and raw SVG. The three tasks are an order approval workflow,
a grouped checkout architecture and a publishing state machine with return paths. Every task's
exact semantic requirements and prose are in [tasks.json](tasks.json). Initial generation had no
renderer feedback, no competitor output, one response and at most 200 source lines.

All **15 of 15** initial native sources rendered successfully in the canonical
[CI run](https://github.com/byronwall/draftably/actions/runs/41554667774). All fifteen individual
captures and three contact sheets succeeded. These are actual renderer results, not manually
reconstructed drawings. Nine earlier local Draftably/D2/DOT renders are retained separately;
all published comparison images use the single CI environment.

The manual source audit found all exact required nodes, directed edges, edge labels and group
memberships, with no extra/duplicate semantic nodes or edges in all fifteen sources. This is an
agent judgment of the source, **not proof of visible semantic fidelity**. In raw SVG, labels and
paths were manually associated by coordinates; source structure is weaker evidence there than
an explicit graph-language edge declaration.

## Evidence and reproduction

- [Protocol frozen before generation](PROTOCOL.md); [execution deviations](EXECUTION.md).
- [Machine-readable results](results.json), including initial source hashes and sizes.
- [Source-semantic audit](source-audit.json), with individual SVG path traces.
- [Captured environment and provenance](runs/41554667774/provenance.json).
- [Renderer records and actual SVGs](runs/41554667774/).
- [Reproduction instructions](README.md) and [native adapter code](../../../scripts/diagram-compare/).

The canonical run used Node 24.22.1, Mermaid 12.2.0, D2 npm 0.1.34, Graphviz 2.43.0 and Chromium
156.0.8078.4. Draftably uses repository source, not a conversion through another format. Raw SVG
loads directly. The artifact includes original-resolution PNGs and separate images displayed at
960 CSS pixels; the committed contact sheets aid comparison but do not replace full-size review.

## What the initial images show

- **Workflow:** all five drawings communicate the success and cancellation branches. Mermaid
  and D2 are tall with generous spacing; Draftably, DOT and SVG are compact and traceable.
- **Architecture:** grouping is present in all formats, but routing matters. Draftably's request
  and update paths cross; D2's consume label touches group geometry and its small text suffers
  at display scale; SVG's validate-token label is detached from the intended path. DOT's native
  cluster layout and Mermaid's grouped flowchart have their own bends and crossings described
  in the per-image notes.
- **State machine:** return paths stress edge separation. DOT's revise path crosses the central
  request/approval region; other formats use different arrangements of forward and return
  transitions. See the individual notes rather than inferring quality from aspect ratio alone.
- **Visible titles:** D2's root label exists in all three sources but is absent from the actual
  drawings. A visible-title check was added during image review as task compliance, separately
  from the five preregistered visual dimensions. It is not retroactively counted as a planned
  visual-score dimension.

These are non-blinded agent judgments after inspecting all fifteen display-width images and all
three contact sheets, with native detail checks for architecture. Scores are ordinal: 0 means
material failure, 1 usable with visible issues, 2 clear. No total score is calculated.

| Task         | Format    | Text | Node/text overlap | Edge clarity | Group/layout | Compactness | Title visible |
| ------------ | --------- | ---: | ----------------: | -----------: | -----------: | ----------: | ------------- |
| workflow     | mermaid   |    2 |                 2 |            2 |            2 |           1 | yes           |
| workflow     | draftably |    2 |                 2 |            2 |            2 |           2 | yes           |
| workflow     | d2        |    2 |                 2 |            2 |            2 |           1 | no            |
| workflow     | dot       |    2 |                 2 |            2 |            2 |           2 | yes           |
| workflow     | svg       |    2 |                 2 |            2 |            2 |           2 | yes           |
| architecture | mermaid   |    2 |                 2 |            1 |            2 |           2 | yes           |
| architecture | draftably |    2 |                 2 |            1 |            2 |           2 | yes           |
| architecture | d2        |    1 |                 1 |            1 |            2 |           1 | no            |
| architecture | dot       |    2 |                 2 |            1 |            2 |           2 | yes           |
| architecture | svg       |    2 |                 2 |            1 |            2 |           1 | yes           |
| state        | mermaid   |    2 |                 2 |            1 |            2 |           2 | yes           |
| state        | draftably |    2 |                 2 |            2 |            2 |           2 | yes           |
| state        | d2        |    2 |                 2 |            1 |            1 |           1 | no            |
| state        | dot       |    2 |                 2 |            1 |            2 |           1 | yes           |
| state        | svg       |    2 |                 2 |            2 |            2 |           2 | yes           |

[Detailed per-image notes and evidence pointers](visual-review.json).

## Source verbosity

Source sizes count the unmodified agent responses, including whitespace and styling. They do
not measure quality, token consumption, inference cost, editing time or maintenance effort.

| Task         | Format       | Lines | Bytes | Native render |
| ------------ | ------------ | ----: | ----: | ------------- |
| workflow     | Mermaid      |    32 |  1154 | success       |
| workflow     | Draftably    |    21 |   728 | success       |
| workflow     | D2           |    59 |  1142 | success       |
| workflow     | Graphviz DOT |    34 |  1379 | success       |
| workflow     | Raw SVG      |    49 |  2308 | success       |
| architecture | Mermaid      |    35 |  1367 | success       |
| architecture | Draftably    |    21 |   807 | success       |
| architecture | D2           |    93 |  1733 | success       |
| architecture | Graphviz DOT |    80 |  1734 | success       |
| architecture | Raw SVG      |    57 |  3519 | success       |
| state        | Mermaid      |    32 |   758 | success       |
| state        | Draftably    |    16 |   585 | success       |
| state        | D2           |    34 |   759 | success       |
| state        | Graphviz DOT |    53 |  1308 | success       |
| state        | Raw SVG      |    42 |  2017 | success       |

Draftably produced the fewest source lines and bytes on each task in this run. Raw SVG used the
most bytes. This describes these responses, not intrinsic format complexity: the generators
chose different amounts of styling and whitespace. D2 architecture used 93 lines while raw SVG
used 57, illustrating why line count alone is not an editing-effort score.

## Editing surfaces, observed from native source

- **Mermaid:** explicit named nodes and labeled edges; flowchart syntax carries structure while
  layout is delegated to its renderer. Theme and flowchart settings add control without explicit
  coordinates. This study does not test Mermaid's other diagram families.
- **Draftably:** concise node/group/edge declarations and one layout recipe. The source preserves
  relationships separately from geometry. This run did not measure the interactive editor,
  alternative engines or manual drag refinements.
- **D2:** nested containers express membership directly; native styles and direction settings are
  visible in source. This run used the default native layout, not every D2 layout option.
- **Graphviz DOT:** graph, subgraph and edge attributes express the graph and presentation in one
  source. Cluster membership is explicit. Rank and spline choices are generator decisions, not
  a search across layouts.
- **Raw SVG:** the agent owns all node geometry, paths, arrowheads and label positions. That gives
  direct visual control but requires coordinated coordinate edits when structure changes. No
  edit task was timed, so the report does not assign a measured maintenance penalty.

## Scope and confounds

This is a controlled-prompt case study, not a verified same-model benchmark. Nine cells were
generated before maintenance recovery and six afterward. Each used a fresh agent context with
the same handoff design; exact backend model/configuration continuity could not be verified.
Model ID, seed, temperature, token usage and cost are unavailable.

The curated references contain 325 bytes for D2, 418 for DOT, 423 for Draftably, 377 for Mermaid
and 710 for SVG. They differ by syntax and are not exhaustive language documentation. Familiarity
and reference design can influence the outcome. The evaluator knows which format made each
image. One sample per task/format gives no variance estimate or statistical significance.

The selected tasks are small directed diagrams. They do not cover sequence notation, dense
production architectures, accessibility, collaboration, interactive editing, import/export
fidelity or runtime performance. Adapter wall times include different startup work and are
preserved only as execution evidence; they are not ranked. No overall format winner follows
from successful rendering or source compactness.
