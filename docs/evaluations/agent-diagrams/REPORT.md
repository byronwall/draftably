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

## One repair response: rendering can regress

Each of the fifteen cells received one isolated response with its own source, diagnostic and
image-review note. Eight changed the source and seven retained it. All remained within the
200-line limit. The evaluator made no edits to the returned diagrams and allowed no second
repair attempt.

**Initial rendering: 15/15. After the repair response: 14/15.** The repaired architecture/Mermaid
source failed native parsing on its new link-style color declaration (line 33). The complete
error and rejected source are preserved. Its initial drawing still renders; the published
initial gallery does not silently replace or hide either result. Source-semantic review found
all requested graph relationships in the repaired text, but that does not make invalid syntax
renderable.

The other fourteen returned sources rendered and were captured successfully in
[the repaired run](https://github.com/byronwall/draftably/actions/runs/41568855771). Both canonical
runs used the same reported Node, Mermaid, D2, Graphviz and Chromium versions. The changed source
was manually reassessed; seven byte-identical retentions inherit the initial source audit.
D2's two standalone title text objects and one transparent title wrapper are recorded as
presentation additions, separately from required domain nodes/groups.

| Task         | Format    | Response  | Initial render | After response | Final source lines | Final source bytes |
| ------------ | --------- | --------- | -------------- | -------------- | -----------------: | -----------------: |
| workflow     | mermaid   | changed   | success        | success        |                 32 |               1168 |
| workflow     | draftably | unchanged | success        | success        |                 21 |                728 |
| workflow     | d2        | changed   | success        | success        |                 67 |               1253 |
| workflow     | dot       | unchanged | success        | success        |                 34 |               1379 |
| workflow     | svg       | unchanged | success        | success        |                 49 |               2308 |
| architecture | mermaid   | changed   | success        | failed         |                 39 |               1557 |
| architecture | draftably | unchanged | success        | success        |                 21 |                807 |
| architecture | d2        | changed   | success        | success        |                108 |               2215 |
| architecture | dot       | unchanged | success        | success        |                 80 |               1734 |
| architecture | svg       | changed   | success        | success        |                 57 |               3514 |
| state        | mermaid   | changed   | success        | success        |                 32 |                758 |
| state        | draftably | unchanged | success        | success        |                 16 |                585 |
| state        | d2        | changed   | success        | success        |                 48 |               1011 |
| state        | dot       | changed   | success        | success        |                 53 |               1286 |
| state        | svg       | unchanged | success        | success        |                 42 |               2017 |

[Repaired source audit](repair-source-audit.json), [exact feedback and repair responses](cells/),
and [second-run provenance](runs/41568855771/provenance.json) make the intervention inspectable.
These are paired case observations, not a claim that feedback generally helps or harms a format.

## What changed visibly after feedback

- **D2 titles:** all three previously missing titles are now visible. Architecture text is larger,
  but the vertical drawing remains tall and some edge labels still sit against group boundaries.
  The state layout became compact and horizontal, with smaller text at the same display width
  and a remaining withdraw/approve crossing.
- **Raw SVG architecture:** the detached validate-token label now sits beside its intended edge;
  shorter groups reduce unused space. This is a clear improvement in this pair of outputs.
- **Mermaid state machine:** the return endpoints at Draft are easier to distinguish, at the cost
  of a taller drawing. Workflow spacing reduced slightly without changing its compactness score.
- **Graphviz state machine:** revise takes a different route but remains awkward to trace near
  Approved/approve. The ordinal scores do not show a clear overall improvement.
- **Mermaid architecture:** no image could be scored because the repair introduced a parse error.
  Render validation is a necessary part of an agent loop, even after a successful first pass.
- **Seven retentions:** the agents chose not to risk an unverified change. Sources are byte-equal;
  repaired contact sheets were checked and the initial judgments are explicitly carried forward.

The evaluator inspected all seven changed successful drawings individually at 960 CSS pixels,
plus all repaired contact sheets. The failed cell is unscored, rather than assigned invented
visual measurements. There is no summed score.

| Task         | Format    | Text | Node/text overlap | Edge clarity | Group/layout | Compactness | Title visible |
| ------------ | --------- | ---: | ----------------: | -----------: | -----------: | ----------: | ------------- |
| workflow     | mermaid   |    2 |                 2 |            2 |            2 |           1 | yes           |
| workflow     | draftably |    2 |                 2 |            2 |            2 |           2 | yes           |
| workflow     | d2        |    2 |                 2 |            2 |            2 |           1 | yes           |
| workflow     | dot       |    2 |                 2 |            2 |            2 |           2 | yes           |
| workflow     | svg       |    2 |                 2 |            2 |            2 |           2 | yes           |
| architecture | mermaid   |    — |                 — |            — |            — |           — | not rendered  |
| architecture | draftably |    2 |                 2 |            1 |            2 |           2 | yes           |
| architecture | d2        |    2 |                 1 |            1 |            2 |           1 | yes           |
| architecture | dot       |    2 |                 2 |            1 |            2 |           2 | yes           |
| architecture | svg       |    2 |                 2 |            2 |            2 |           2 | yes           |
| state        | mermaid   |    2 |                 2 |            2 |            2 |           1 | yes           |
| state        | draftably |    2 |                 2 |            2 |            2 |           2 | yes           |
| state        | d2        |    1 |                 2 |            1 |            2 |           2 | yes           |
| state        | dot       |    2 |                 2 |            1 |            2 |           1 | yes           |
| state        | svg       |    2 |                 2 |            2 |            2 |           2 | yes           |

[Full repaired-image judgments](repair-visual-review.json) retain concrete notes and artifact
pointers for every cell.

## Inspect the paired contact sheets

These sheets are navigation aids. Use the docs gallery or full-resolution SVGs for close reading.
The repaired architecture sheet has four drawings because the Mermaid repair failed.

| Task          | Initial                                                  | After one response                                                                                                                 |
| ------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Workflow      | [Initial sheet](runs/41554667774/workflow-sheet.png)     | [After-response sheet in captured artifact](https://github.com/byronwall/draftably/actions/runs/41568855771/artifacts/13200276793) |
| Architecture  | [Initial sheet](runs/41554667774/architecture-sheet.png) | [After-response sheet in captured artifact](https://github.com/byronwall/draftably/actions/runs/41568855771/artifacts/13200276793) |
| State machine | [Initial sheet](runs/41554667774/state-sheet.png)        | [After-response sheet in captured artifact](https://github.com/byronwall/draftably/actions/runs/41568855771/artifacts/13200276793) |

## Practical conclusion

For these tasks, preserving graph meaning was easier than producing consistently clear layout.
All formats expressed the requested source relationships; differences appeared in title behavior,
arrow routing, label placement, whitespace and how much geometry the agent had to write.
Draftably's sources were concise and its workflow/state outputs were clear, while its architecture
still needed tracing across a crossing. Raw SVG offered direct placement and a successful local
label repair, with more source bytes and coordinate responsibilities. Mermaid, D2 and DOT each
produced usable initial diagrams while exposing different layout or feedback risks.

Choose the native editing model that fits the workflow, then validate the actual drawing. For an
agent integration, keep the first pass, render every returned revision, and inspect labels and
edge directions before accepting it. This study supports that small verification loop; it does
not justify a universal format winner or autonomous acceptance of a repair.

## Replaying failures honestly

The repaired run failed because the architecture/Mermaid source failed native parsing. That
original run and failure remain unchanged. Local replay returns a nonzero exit status for the
failed diagram and preserves its diagnostic. The suite does not convert a known failure into a
success, regenerate that cell or select only favorable images.

The site proof separately follows the landing-page link, loads all fifteen original images and
checks desktop/mobile document overflow. Initial and repaired native outcomes remain separately
visible in the docs.

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
