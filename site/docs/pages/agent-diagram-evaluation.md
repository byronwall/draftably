# Agent diagram comparison

Three identical prompts, five native formats, fifteen actual first-pass outputs. Inspect the drawings, source and limitations together.

## What this compares

Independent agent contexts attempted a workflow, grouped architecture and cyclic state machine in Mermaid, Draftably, D2, Graphviz DOT and raw SVG. The exact task prompt was shared; only the format and short syntax reference changed. Each had one response, a 200-line limit and no render feedback.

This is a small controlled-prompt case study. Nine cells were generated before a maintenance interruption and six afterward. The backend model ID and configuration continuity were unavailable, so this is not a verified same-model benchmark. There are no cost or speed rankings.

[Read the full report](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/REPORT.md), [protocol](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/PROTOCOL.md), [exact prompts](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tasks.json) and [replay instructions](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/README.md).

## Main observations

All fifteen sources rendered, but rendering success did not guarantee task compliance: D2’s requested titles were absent in all three initial images. The grouped architecture exposed routing and label-placement problems in several formats. Draftably had the shortest source in each task, while raw SVG gave direct geometry control with more source bytes. These are observations from three samples per format, not an overall ranking.

## Measured first-pass results

15 of 15 native rendering attempts produced an SVG. Source audits and visual judgments are separate: successful rendering does not establish readable labels, clear arrows or correct visible group membership.

| Task                          | Format       | Render  | Source lines | Source bytes |
| ----------------------------- | ------------ | ------- | -----------: | -----------: |
| Order approval workflow       | Mermaid      | success |           32 |         1154 |
| Order approval workflow       | Draftably    | success |           21 |          728 |
| Order approval workflow       | D2           | success |           59 |         1142 |
| Order approval workflow       | Graphviz DOT | success |           34 |         1379 |
| Order approval workflow       | Raw SVG      | success |           49 |         2308 |
| Checkout service architecture | Mermaid      | success |           35 |         1367 |
| Checkout service architecture | Draftably    | success |           21 |          807 |
| Checkout service architecture | D2           | success |           93 |         1733 |
| Checkout service architecture | Graphviz DOT | success |           80 |         1734 |
| Checkout service architecture | Raw SVG      | success |           57 |         3519 |
| Publishing state machine      | Mermaid      | success |           32 |          758 |
| Publishing state machine      | Draftably    | success |           16 |          585 |
| Publishing state machine      | D2           | success |           34 |          759 |
| Publishing state machine      | Graphviz DOT | success |           53 |         1308 |
| Publishing state machine      | Raw SVG      | success |           42 |         2017 |

After one optional repair response per cell, 14/15 rendered. Architecture/Mermaid regressed from a successful initial drawing to a native parse error; that failed response is preserved. Eight sources changed and seven were retained. Each image below links its separate after-response result or diagnostic.

Source size describes verbosity, not quality or measured editing effort. All numbers above come from the committed sources and actual renderer outcomes.

## Workflow task

### Mermaid

![Order approval workflow: actual initial Mermaid output](/evaluations/agent-diagrams/workflow-mermaid.svg)

**Image review:** All nine nodes and both rejection branches are readable. Oversized payment diamond and generous vertical spacing make the drawing tall; no node/text collision observed.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/workflow/mermaid/initial.mmd) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/workflow/mermaid/render.json)

**One repair response:** changed. Reduce rank spacing and node padding to address the tall layout and oversized decision diamond while preserving exact labels, all ten directed edges, and existing high-contrast styling.

**After-response review:** Spacing is slightly reduced but the drawing remains tall. Labels, branch directions and arrowheads remain readable; no new collision observed.

[View the result after the repair response](/evaluations/agent-diagrams/workflow-mermaid-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/workflow/mermaid/repaired.mmd) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/workflow/mermaid/render.json)

### Draftably

![Order approval workflow: actual initial Draftably output](/evaluations/agent-diagrams/workflow-draftably.svg)

**Image review:** Clear labeled branches, compact decision diamonds and distinct cancellation path. Pack-to-Ship bends back toward the central column, but arrows remain traceable.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/workflow/draftably/initial.draft) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/workflow/draftably/render.json)

**One repair response:** unchanged. Successful render and supplied feedback rate every quality dimension clear; all exact task nodes and directed labeled edges are preserved. The noted Pack-to-Ship bend remains traceable and does not justify an untested layout change.

**After-response review:** Source retained byte-for-byte. Repaired-run contact sheet shows the same layout; initial review applies. Clear labeled branches, compact decision diamonds and distinct cancellation path. Pack-to-Ship bends back toward the central column, but arrows remain traceable.

[View the result after the repair response](/evaluations/agent-diagrams/workflow-draftably-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/workflow/draftably/repaired.draft) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/workflow/draftably/render.json)

### D2

![Order approval workflow: actual initial D2 output](/evaluations/agent-diagrams/workflow-d2.svg)

**Image review:** Nine nodes and four branch labels are visible with clear arrows. The requested diagram title is absent in the rendered image despite the source root label; large vertical gaps increase height.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/workflow/d2/initial.d2) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/workflow/d2/render.json)

**One repair response:** changed. Replace the invisible root label with a native, unconnected text title positioned at top-center. Preserve all nine workflow nodes, ten edges, branch labels and the otherwise clear styling and layout.

**After-response review:** The requested title is now visible above Start. Flow remains traceable; tall spacing is substantially unchanged.

[View the result after the repair response](/evaluations/agent-diagrams/workflow-d2-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/workflow/d2/repaired.d2) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/workflow/d2/render.json)

### Graphviz DOT

![Order approval workflow: actual initial Graphviz DOT output](/evaluations/agent-diagrams/workflow-dot.svg)

**Image review:** Readable nodes, differentiated decisions and terminals, and separated rejection branches. Wide shallow diamonds and a diagonal Reserve-to-Stock edge are cosmetic rather than semantic defects.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/workflow/dot/initial.dot) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/workflow/dot/render.json)

**One repair response:** unchanged. Rendering succeeded and all five supplied readability/layout scores are clear. Feedback identifies only cosmetic diamond proportions and a diagonal edge; retaining the source avoids unnecessary layout risk while preserving exact task semantics.

**After-response review:** Source retained byte-for-byte. Repaired-run contact sheet shows the same layout; initial review applies. Readable nodes, differentiated decisions and terminals, and separated rejection branches. Wide shallow diamonds and a diagonal Reserve-to-Stock edge are cosmetic rather than semantic defects.

[View the result after the repair response](/evaluations/agent-diagrams/workflow-dot-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/workflow/dot/repaired.dot) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/workflow/dot/render.json)

### Raw SVG

![Order approval workflow: actual initial Raw SVG output](/evaluations/agent-diagrams/workflow-svg.svg)

**Image review:** Straight success spine and separate right-side cancellation paths. Labels and arrowheads are clear; fixed geometry uses extra right-side space but remains orderly.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/workflow/svg/initial.svg) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/workflow/svg/render.json)

**One repair response:** unchanged. Supplied feedback rates every criterion clear, confirms readable labels and arrowheads, and reports successful rendering. The initial source preserves all required nodes, directed edges, and labels; extra right-side space is orderly and does not warrant a repair.

**After-response review:** Source retained byte-for-byte. Repaired-run contact sheet shows the same layout; initial review applies. Straight success spine and separate right-side cancellation paths. Labels and arrowheads are clear; fixed geometry uses extra right-side space but remains orderly.

[View the result after the repair response](/evaluations/agent-diagrams/workflow-svg-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/workflow/svg/repaired.svg) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/workflow/svg/render.json)

## Architecture task

### Mermaid

![Checkout service architecture: actual initial Mermaid output](/evaluations/agent-diagrams/architecture-mermaid.svg)

**Image review:** All three groups and their members are visible. Several closely spaced bends between Services and Data require careful tracing of publish, consume and update; labels remain readable.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/architecture/mermaid/initial.mmd) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/architecture/mermaid/render.json)

**One repair response:** changed. Preserved the clear layout and all exact semantics; distinguished publish, consume, and update using restrained high-contrast edge colors and heavier strokes to help trace the closely spaced bends identified in feedback.

**After-response review:** Repair failed to parse at linkStyle color syntax on line 33. No rendered image exists; visual dimensions are unscored. Preserve the successful original and failed repair separately.

The repaired source failed to render; the failure is preserved. [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/architecture/mermaid/repaired.mmd) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/architecture/mermaid/render.json)

### Draftably

![Checkout service architecture: actual initial Draftably output](/evaluations/agent-diagrams/architecture-draftably.svg)

**Image review:** Clear group boundaries and title. The request path and Worker update path cross in the gap between the service columns; the interrupted line helps but requires tracing. Consume takes a long lower return route.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/architecture/draftably/initial.draft) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/architecture/draftably/render.json)

**One repair response:** unchanged. Retained exact semantics and the layout rated clear for readability, overlap, grouping and compactness. The reported crossing and long consume return are usable; the supplied native syntax exposes no explicit routing controls, so an unverified orientation change offers no demonstrated improvement.

**After-response review:** Source retained byte-for-byte. Repaired-run contact sheet shows the same layout; initial review applies. Clear group boundaries and title. The request path and Worker update path cross in the gap between the service columns; the interrupted line helps but requires tracing. Consume takes a long lower return route.

[View the result after the repair response](/evaluations/agent-diagrams/architecture-draftably-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/architecture/draftably/repaired.draft) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/architecture/draftably/render.json)

### D2

![Checkout service architecture: actual initial D2 output](/evaluations/agent-diagrams/architecture-d2.svg)

**Image review:** Requested title is absent. At 960px diagram width node and edge text is noticeably small. The consume label lies on the Data group lower border, reducing readability. Services spans a broad mostly empty horizontal region.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/architecture/d2/initial.d2) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/architecture/d2/render.json)

**One repair response:** changed. Use a labeled enclosing canvas so the title is visible; switch to vertical flow to reduce extreme width and enlarge node/group type for documentation readability. Preserve every required node, group membership and directed labeled edge.

**After-response review:** Visible title and larger text improve task compliance/readability. Vertical layout is very tall; consume still intersects a group boundary and read/write runs close to the lower Services border. Improvement is partial.

[View the result after the repair response](/evaluations/agent-diagrams/architecture-d2-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/architecture/d2/repaired.d2) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/architecture/d2/render.json)

### Graphviz DOT

![Checkout service architecture: actual initial Graphviz DOT output](/evaluations/agent-diagrams/architecture-dot.svg)

**Image review:** Readable title, group labels and all nodes. Consume bends under the groups and crosses read/write and update routes; arrows are identifiable but the crossing cluster costs tracing effort.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/architecture/dot/initial.dot) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/architecture/dot/render.json)

**One repair response:** unchanged. Retain the readable, semantically complete diagram. Feedback identifies a usable consume-route crossing, but all other criteria are clear; without a permitted verification render, speculative routing changes could introduce worse crossings or layout regressions.

**After-response review:** Source retained byte-for-byte. Repaired-run contact sheet shows the same layout; initial review applies. Readable title, group labels and all nodes. Consume bends under the groups and crosses read/write and update routes; arrows are identifiable but the crossing cluster costs tracing effort.

[View the result after the repair response](/evaluations/agent-diagrams/architecture-dot-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/architecture/dot/repaired.dot) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/architecture/dot/render.json)

### Raw SVG

![Checkout service architecture: actual initial Raw SVG output](/evaluations/agent-diagrams/architecture-svg.svg)

**Image review:** Group membership, nodes and arrows are readable. The validate token label floats substantially above its associated bent edge. Tall Client and Services containers leave large empty lower areas.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/architecture/svg/initial.svg) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/architecture/svg/render.json)

**One repair response:** changed. Moved validate token beside a shorter gateway-to-auth route; shortened the Client enclosure and raised the worker/queue row to reduce unused vertical space while retaining all nodes, groups and directed labeled edges.

**After-response review:** Validate token now sits directly beside its horizontal edge, and shorter group boxes reduce empty space. All required domain relationships remain traceable.

[View the result after the repair response](/evaluations/agent-diagrams/architecture-svg-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/architecture/svg/repaired.svg) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/architecture/svg/render.json)

## State-machine task

### Mermaid

![Publishing state machine: actual initial Mermaid output](/evaluations/agent-diagrams/state-mermaid.svg)

**Image review:** Readable compact horizontal layout with eight transition labels. Three return arrows converge tightly at Draft, making revise, withdraw and restore endpoints harder to distinguish.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/state/mermaid/initial.mmd) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/state/mermaid/render.json)

**One repair response:** changed. Changed to top-down layout so the three return arrows approach the wider horizontal boundary of Draft rather than crowding its short side; adjusted spacing to keep the vertical diagram compact while separating branches. All exact nodes and transitions are preserved.

**After-response review:** Top-to-bottom arrangement separates three return endpoints at Draft. Arrows are clearer than the initial tight convergence, at the cost of a much taller diagram.

[View the result after the repair response](/evaluations/agent-diagrams/state-mermaid-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/state/mermaid/repaired.mmd) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/state/mermaid/render.json)

### Draftably

![Publishing state machine: actual initial Draftably output](/evaluations/agent-diagrams/state-draftably.svg)

**Image review:** All six states and eight labeled transitions are clear. Separate top and bottom return tracks keep the cycles traceable; no node/text collision observed.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/state/draftably/initial.draft) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/state/draftably/render.json)

**One repair response:** unchanged. The supplied feedback rates all five dimensions clear, confirms the title and all six states and eight labeled transitions, and reports no collision. The successful initial source preserves the exact task semantics, so no repair is warranted.

**After-response review:** Source retained byte-for-byte. Repaired-run contact sheet shows the same layout; initial review applies. All six states and eight labeled transitions are clear. Separate top and bottom return tracks keep the cycles traceable; no node/text collision observed.

[View the result after the repair response](/evaluations/agent-diagrams/state-draftably-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/state/draftably/repaired.draft) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/state/draftably/render.json)

### D2

![Publishing state machine: actual initial D2 output](/evaluations/agent-diagrams/state-d2.svg)

**Image review:** Requested title is absent. Text is clear, but the revise and withdraw return curves cross the approval/restore region. The top-to-bottom composition is tall with a large open center.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/state/d2/initial.d2) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/state/d2/render.json)

**One repair response:** changed. Replace the invisible root label with a native text title annotation; switch to left-to-right flow and declare the main progression first to address the tall composition. Distinguish return transitions with restrained dashed styling while preserving all state and transition labels and directions.

**After-response review:** Title is now visible and horizontal arrangement is compact. Dashed return edges distinguish cycles, but withdraw still crosses approve and the broad layout makes text smaller at 960px than the initial vertical version.

[View the result after the repair response](/evaluations/agent-diagrams/state-d2-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/state/d2/repaired.d2) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/state/d2/render.json)

### Graphviz DOT

![Publishing state machine: actual initial Graphviz DOT output](/evaluations/agent-diagrams/state-dot.svg)

**Image review:** All states and labels are readable. The revise curve crosses request edits and approve around the upper middle. Long curved return edges add width and whitespace.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/state/dot/initial.dot) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/state/dot/render.json)

**One repair response:** changed. Removed forced compass ports on return edges so Graphviz can route revise around the left branch instead of crossing the forward transitions. Reduced node and rank spacing and removed the unnecessary restore minimum length to address excess whitespace while preserving every state and labeled directed transition.

**After-response review:** Revise is rerouted closer to Approved and the forward spine. It no longer makes the same broad crossing near request edits, but its proximity to Approved/approve still makes tracing awkward; all labels remain readable.

[View the result after the repair response](/evaluations/agent-diagrams/state-dot-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/state/dot/repaired.dot) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/state/dot/render.json)

### Raw SVG

![Publishing state machine: actual initial Raw SVG output](/evaluations/agent-diagrams/state-svg.svg)

**Image review:** Clear horizontal publication spine with Changes requested below it; distinct upper withdraw and lower restore routes. Exact labels and arrowheads are visible without overlapping nodes.

[Native source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/state/svg/initial.svg) · [Renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41554667774/state/svg/render.json)

**One repair response:** unchanged. Supplied feedback rates all five criteria clear and confirms exact labels, distinct return routes, and no node overlap; successful native SVG rendering supplies no reason to alter the source.

**After-response review:** Source retained byte-for-byte. Repaired-run contact sheet shows the same layout; initial review applies. Clear horizontal publication spine with Changes requested below it; distinct upper withdraw and lower restore routes. Exact labels and arrowheads are visible without overlapping nodes.

[View the result after the repair response](/evaluations/agent-diagrams/state-svg-repaired.svg) · [Repaired source](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/cells/state/svg/repaired.svg) · [Repair renderer record](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/runs/41568855771/state/svg/render.json)

## Reading the comparison

The drawings above are the captured first pass, not manually improved examples. Read the full report for image-review scores and concrete defects. Native formats expose different editing surfaces: graph languages express nodes and relations, while raw SVG gives direct geometry control and requires coordinate maintenance. Those are source-level observations, not measured editing times.

Three tasks do not cover sequence diagrams, large graphs, accessibility, interactive editing or every layout engine. Curated syntax references, non-blinded agent review, one sample per cell and browser/font differences limit generalization. A syntax or layout defect in this setup is not proof a format cannot handle the task.
