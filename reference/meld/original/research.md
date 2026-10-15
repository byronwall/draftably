# Diagrams as intent, not just coordinates

## Research and a working prototype

**Research checked: September 28, 2026.** This report distinguishes documented capabilities of existing projects, my design recommendations, and what the accompanying original prototype actually implements. The comparison is a documentation/source review, not an executed comparative benchmark of the competing products.

## 1. The recommendation

Build a small, declarative **view-and-layout-intent language over a typed diagram model**, with replaceable layout backends. Do not make an automatic layout engine the authoring contract. Do not make an edit log the diagram's primary source. And do not interpret a user's drag as a decision to abandon automatic layout forever.

The useful middle ground is a constraint hierarchy: strong defaults; a few stable ordering/relative/alignment preferences; explicit soft preservation anchors when content changes; occasional hard pins; and a generated exact-layout checkpoint when an approved result must be replayed. Keep these layers distinct enough that a user or agent can remove one refinement without resetting the diagram.

For a production implementation, my first backend candidates would be **ELK/elkjs for directed compound graphs** and **D2/TALA for architecture-oriented orthogonal compositions**. These are candidates for a controlled evaluation, not interchangeable solvers. ELK documents compound graphs, cross-hierarchy edges, ports, and multiple routing styles. TALA now explicitly supports mixtures of positioned and automatically arranged nodes. [16][17][7]

The closest language inspiration in the requested list is **Reladraw**, the project referred to as “Rella Draw.” Its authoring vocabulary puts relative relationships and nested objects ahead of a choice between global automation and exact coordinates. Its current documentation calls the project early-stage and the syntax unstable, so I would borrow and test the ideas rather than assume the whole required editor workflow already exists. [9][10][11]

There is an important qualification: before committing to a new public language, run the desired workflow against **D2 + TALA + an intent/view layer** and **LikeC4 + a refinement layer**. Both already solve meaningful parts of this problem. Owning the view/intent semantics does not require owning every model syntax, router, or graph-layout algorithm.

## 2. What the existing approaches offer

The table's final column is an engineering assessment: what I would borrow, and what still needs a requirement-specific test. It is not a claim that an undocumented feature is impossible.

| Approach | Documented strengths relevant here | What I would borrow or test |
|---|---|---|
| **Mermaid** | Compact notation; subgraphs, direction and link-length hints; several layouts; collapsible subgraphs in current flowchart docs. [1][2] | Good source ergonomics and embedding. Test durable layout editing separately from rendering/interaction features. |
| **D2 + TALA/ELK/Dagre** | Nested containers, several engines, grid compositions, engine-specific relative positioning/locks; an AST manipulation API. [3][4][5][6] | The strongest near-term reuse candidate. Verify intent portability, input-version pinning, and stability after edits. |
| **Reladraw** | Relative node placement, hierarchical identities/containers, explicit edges, text-to-SVG workflow. [9][10] | A close match for readable spatial intent. Test incremental changes, constraint cycles, viewport policy, and edit round-tripping. |
| **Structurizr** | Architecture model and multiple views; compiled JSON carries editor layout in addition to the authored DSL. [12] | Separate semantic source from generated geometry without treating the geometry as the whole model. |
| **LikeC4** | Model-based views; manual-layout drift validation; Draw.io round-trip layout/waypoint data in source comment blocks. [13][14][15] | A serious model/view and persistence baseline, not “auto-layout only.” Test whether hints survive edits as relationships rather than final coordinates. |
| **Graphviz/DOT** | Directed ranks, clusters, ordering and routing controls; `pin`/`pos` are engine-specific. [21][22] | Rich layout vocabulary and a clear warning that a common syntax does not imply common backend capabilities. |
| **PlantUML** | Multiple layout engines and domain-specific diagram notations, with grouping and hidden-link/layout controls. [23] | Specialized notations deserve specialized algorithms; avoid forcing every diagram into one graph grammar. |
| **Pikchr** | Compact PIC-like relative drawing markup producing diagrams for technical documentation. [24] | A good example of concise authored geometry, but not by itself the proposed semantic editor architecture. |
| **Bluefish** | Composable relations that can share children and only partially constrain layout. [25] | The best conceptual antidote to treating a layout as one tree of rigid coordinates. |
| **Penrose** | Domain/content/style separation, geometric constraints/objectives, and experimental interactivity. [26][27][30] | A useful conceptual model for intent versus optimization. Evaluate complexity before adopting it for routine architecture diagrams. |
| **WebCoLa** | Constraint-based layout, grouping, alignment/separation, and staged layout iteration. [19] | A reference for soft/hard relationships and interactive constraint refinement. |
| **yFiles PartialLayout** | Moving selected/new elements while leaving designated fixed elements unchanged. [20] | A concrete behavioral benchmark for partial layout, independent of the source format chosen. |

### Mermaid: update the baseline, but keep the actual requirement

The current Mermaid layout documentation says ELK is bundled and is the default from **Mermaid 12**, replacing Dagre for several graph-like diagram types. Flowchart documentation also describes **collapsible subgraphs from 11.17.0**. It still documents a caveat where a subgraph's internal direction is ignored when its nodes connect outside that subgraph. A comparison that simply says “Mermaid has no interactivity or hints” would now be misleading. [1][2]

The requirement in this brief is different: an editor should translate visual refinement into persistent, intelligible intent, then combine that intent with later automatic/local layout. Changing a default engine or adding collapse does not, on its own, establish that complete authoring contract. That is the distinction to evaluate rather than comparing only the attractiveness of one initial screenshot.

### D2: the most consequential recent development

D2's positioning documentation distinguishes general placement controls from engine-specific capabilities. TALA supports positioning relative to another object and fixed top/left coordinates, while the engine comparison and grid documentation describe additional differences in container sizing, direction, and routing. These restrictions belong to the D2 integration/capability matrix; they should not be generalized into claims about what ELK can do outside D2. [3][4][5]

The **September 7, 2026 TALA announcement** matters particularly here. TALA is now open source under MPL-2.0 and bundled with D2 0.9.0. The announcement explicitly demonstrates hybrid positioned/automatic diagrams. It also states that TALA evaluates multiple seeds, is reproducible with the same seeds and input, and can nevertheless produce a substantially different diagram after a node is added. This is almost an exact illustration of the brief's distinction between repeatability and stability under edits. [7]

D2's Oracle API is also relevant: manipulating an AST is a better source-round-trip foundation than treating a diagram as an SVG that must be reverse-engineered after each drag. The project announced a nonprofit transition in September, together with reduced maintainer time, which is a dependency-maintenance consideration for a new production commitment. [6][8]

My assessment is not that D2 lacks manual control. It has meaningful control already. The open question is whether the required view policy, local refinement semantics, stable incremental behavior, and editing interface should be implemented as an extension around it or as a separate intent compiler with D2 as one import/backend option.

### Reladraw, LikeC4, and the difference between persisted coordinates and persisted intent

Reladraw's relative vocabulary gives an agent a way to say that one object belongs beside or below another without choosing every coordinate. Its documented syntax includes nested/hierarchical structure and edge endpoint controls. I did not find a documented end-to-end guarantee covering adaptive static views, local editor refinement, and cross-runtime exact replay in the reviewed material. That is a remaining evaluation task, not a negative benchmark result. [9][10]

LikeC4 already has more relevant persistence machinery than a casual comparison would suggest: its CLI validates outdated manual layout, and Draw.io export can use source comment blocks containing layout and edge waypoints. The Draw.io documentation is explicit about which information is exported and which higher-level view rules are not carried into the interchange representation. [14][15]

My design inference is that **round-tripping a final position is necessary but not sufficient** for the desired experience. “This box is at x=430” and “this box stays beside the payments service” represent different future-edit behavior. A system can support both without making the second a disguised hard coordinate.

## 3. The representation should have four layers

### Layer A: the semantic model

Store stable identities, labels, object kinds, semantic relationships, and containment. Renaming a label must not break an edge or recreate a node. Give relationships explicit identities too: aggregate edges need provenance, and a label/router tweak must not accidentally target a different parallel edge.

Distinguish **semantic containment** from **visual grouping** in a full design. A service belongs to one subsystem, but it can appear in an overview, a deployment slice, and an inset explanation. Those view instances should point back to the same semantic ID. This matters for the notes about combining several diagrams and showing multiple levels at once.

The prototype deliberately uses one containment tree and multiple named views, not a general multi-instance canvas. That keeps the experiment inspectable while leaving a clear route to more sophisticated composition.

### Layer B: the view contract

A view answers a communication question, selects content, and declares the output conditions. It should know the target dimensions, whether pan/zoom or disclosure are available, a readability floor, a connection budget, and which details are allowed to be summarized.

The minimum useful prototype is a named view with `mode`, `width`, `height`, `detail`, `edges`, `focus`, and `collapse`. A production format should replace the coarse mode flag with explicit capabilities such as pan, zoom, disclosure, hover, keyboard navigation, animation, and links. A browser embedded in a tiny noninteractive card is not equivalent to a full browser canvas.

Do not conflate the world extent, viewport, and editor preview scale. A 480 × 320 render can be previewed at 90% on one screen and 140% on another without changing its layout contract. Conversely, changing its actual viewport can justify a different composition or level of detail.

### Layer C: layout intent

Each scope owns a base recipe: flow, row, column, grid, radial, or later a specialized notation. The parent arranges the completed child groups; each child controls its internal arrangement. Preferences refine the recipe rather than replace the semantic model.

The useful primitives are ordering, center/edge alignment, relative side and minimum gap, preferred local position, fresh-base offset, hard pin, size preference, and reserved container space. In a production system, include ports, label docking, and routing waypoints as distinct constraints—not fake semantic edges inserted merely to force layout.

A hint also needs a scope, strength, and provenance. “Agent inferred this from a drag” should be distinguishable from “the user explicitly required this separation.” An editor should make both easy to inspect and remove. A backend that cannot honor a required hint must report that fact rather than silently treating it as a weak suggestion.

### Layer D: generated layout checkpoints

An approved scene can be captured exactly. This is generated data keyed by the effective model, view, intent, engine build, and measurement policy. It can live in a generated DSL section or a versioned sidecar included in the project manifest. It must not become an undisclosed dependency.

The checkpoint is an exact-replay mechanism, not the default answer to future edits. On an incompatible input change, either invalidate it or explicitly promote selected positions to weak preservation anchors. Reinterpreting an old absolute layout as suitable for a changed graph without telling the author is precisely the failure mode to avoid.

Structurizr's source/compiled-layout split is a useful precedent for separating these responsibilities, even though the proposed constraint semantics go further. [12]

## 4. Viewport awareness means choosing a representation

Shrinking a complete graph is not the same as making it communicate at a smaller size. A static renderer should first decide which representation is appropriate, then lay it out, then check the result.

My recommended sequence is: select the relevant semantic scope; choose group detail levels; collapse or summarize eligible structures; aggregate boundary connections with provenance; choose a suitable root/internal recipe; measure and solve; then verify actual text sizes and bounds. When the result still violates the contract, report the conflict or produce another named view rather than quietly making essential labels microscopic.

The user should control which information is optional. A low-priority diagnostic connection may be omitted in a briefing; an edge needed to explain the main transaction may not. All omissions should remain inspectable, and an exported artifact should disclose summarized counts or include a companion textual outline.

For a 480 × 320 static card, the prototype uses a two-column root grid and collapses the architecture to summarized groups. It is not merely the desktop SVG scaled down. The interactive version retains the internal objects and supports group disclosure, drag, pan, and zoom. Adaptive decisions are visible in the source/view configuration and scene metadata.

There is no reason to demand that the same topology be shown identically in every medium. Several purposeful views can be more truthful than one overloaded figure. For composite/inset diagrams, a future view-instance layer should define which copies of semantic objects are connected and where connections cross panel boundaries. That composition feature is not implemented in this prototype.

A subtle determinism issue arises with zoom-triggered disclosure: hysteresis depends on the prior zoom state. Keep it as an editor presentation policy, or serialize the active disclosure state as an explicit view input. Do not let an undocumented history-dependent state change the exported static result.

## 5. Iterative layout: preserve intent, not every pixel

### A drag should become the weakest useful constraint

When a user drops Payments beside Orders, possible interpretations include a preferred right-of relationship, a matching row alignment, an updated sibling order, a soft offset from automatic placement, or a hard coordinate. These should be explicit alternatives in the editor, not an all-or-nothing conversion to manual mode.

The prototype exposes three drag modes. **Relative** infers a sibling relationship, gap, and cross-axis offset. **Soft offset** stores a delta against the newly computed base. **Pin** stores exact parent-content-local coordinates. Users can inspect the resulting statement immediately.

Intent inference cannot be perfect. A dragged box might be intended to align with a remote object rather than its nearest sibling. A production editor should preview the interpretation and offer a small correction menu. The important invariant is that the committed interpretation is readable, editable source.

### Soft stays make preservation explicit

A previous position can be a preference without becoming a permanent lock. Conceptually, add a displacement cost for selected existing objects to the layout objective:

```text
minimize:
    layout-quality cost
  + edge/label-routing cost
  + Σ weight(i) × distance(position(i), explicit-anchor(i))²
  + soft-constraint penalties

subject to:
    required containment, pins, separations, and alignments
```

This is a proposed architecture, not the exact objective optimized by the prototype. The prototype uses a bounded deterministic projection heuristic with explicit weighted stays. A general production system needs a more carefully integrated discrete/continuous strategy.

Cassowary is relevant for incremental linear equalities/inequalities and strength hierarchies; WebCoLa is relevant for constrained graph layout and grouping. Neither fact means a linear solver alone will choose the correct graph ranks, decide which side of an overlap to use, or route complex edges. Those remain separate decisions. [28][19]

### Local layout needs a boundary contract

“Reflow this group” should first preserve its externally relevant interface: group identity, boundary connections, relevant port sides, and chosen outside anchors. Recompute the internal region, update the group's bounds, and propagate only necessary changes to ancestors. Finally reroute affected boundary edges.

There is an unavoidable tradeoff. You cannot always simultaneously preserve every old coordinate, insert arbitrary new content, prevent all overlap, keep all content visible, and remain inside a fixed small viewport. A useful editor makes the conflict and permitted relaxation order explicit: consume reserved space; rearrange the local region; grow its container; relax nearby stays; then change the view representation or request more room.

The yFiles partial-layout example provides a concrete comparison point: it identifies movable versus fixed elements and lays out new/partial components relative to the existing scene. That demonstrates the desired interaction class, although it does not choose a DSL or solve this brief's complete viewport/source contract. [20]

The prototype's scoped reflow is intentionally more modest: it edits the local constraint set, adds outside stays, and recompiles the whole graph. It is behaviorally scoped, not a performance-optimized incremental dependency engine.

## 6. Where an append-only log belongs

An edit log is valuable for undo, provenance, collaboration, and explaining how a layout was refined. It is a poor sole interchange format for the current diagram.

Compare a history of “move right 20,” “move left 8,” “rerun layout,” and “move down 12” with the final statement that an object should be right of its sibling with a 32-pixel gap. The first requires a replay environment and all earlier state; the second describes current intent directly.

My recommendation is a hybrid: maintain a materialized declarative document as the rendering authority, plus a separate operation log for authoring. Compact the log against snapshots. Store semantic operations with stable operation IDs and preconditions, such as add node, set label, replace hint, change view budget, or checkpoint layout. Avoid replaying raw pointer events or repeated imperative movement deltas as the semantic truth.

A log does not automatically solve concurrent edits. Two agents can still assign incompatible parents, create conflicting pins, or refer to a deleted object. Collaboration needs conflict policies and validation at the model/constraint level in addition to any text CRDT or event ordering scheme.

The prototype includes bounded local source-state history and undo/redo. It does not pretend to implement a durable append-only audit log or distributed collaboration. A fresh renderer uses the exported DSL alone; the history is unnecessary for reproducing geometry.

## 7. Determinism is a separate acceptance criterion

There are four distinct properties:

| Property | What it actually promises |
|---|---|
| **Repeatability** | The same complete input produces the same geometry. |
| **Edit stability** | A small model change causes acceptably local movement. |
| **Responsiveness** | Different viewport/capability inputs yield an appropriate representation. |
| **Pixel identity** | Font shaping, rasterization, antialiasing, and rendering environment match. |

The TALA announcement directly illustrates why the first two are different: fixed input/seeds can be reproducible while adding a node changes the winning layout substantially. [7]

A reproducible production build should pin the engine/version, source ordering rules, random seeds, option defaults, font/measurement policy, viewport/capabilities, and any anchor state used for stabilization. Fix iteration budgets rather than stopping at a wall-clock deadline, make tie-breaking explicit, and normalize output geometry. Cache and test the full effective input, not just the semantic nodes and edges.

A small but important ELK detail: its documented random-seed value **0** invokes time-based initialization. “Set the seed to zero” is therefore not a valid generic determinism recipe for that option. A pinned nonzero seed and explicit model ordering belong in the backend-specific policy. A seed alone still does not establish cross-version or cross-platform pixel identity. [18]

The prototype uses no random numbers, clocks, DOM text measurement, or previous-frame state in the geometry computation. It rounds coordinates to 1/16 pixel. Checkpoints use SHA-256 input keys. Its verification command compares complete canonical geometry strings, not merely matching eight-character debug fingerprints. Tests also compare Node and Chromium outputs for every included example/view.

This is evidence of repeatability for the tested implementation and inputs, not a proof that any future engine, arbitrary Unicode font, or operating system will paint identical pixels. The source uses system fonts, and measurement is a fixed character-budget approximation.

## 8. What is in the downloadable experiment

The standalone `meld-diagram-lab.html` is approximately 103 KB before compression and includes its CSS, parser, original layout code, renderer, editor, and examples. It is vanilla JavaScript with no runtime dependencies or network requests. It is not a wrapper around a competing engine and should not be mistaken for a mature graph-drawing package.

The three examples are a checkout architecture, the proposed compiler pipeline, and a constraint playground. The live editor supports nested groups, five layouts, source-backed dragging, ordering/alignment hints, scoped reflow, incremental insertion with stays, focus/collapse, fixed-size static views, SVG export, source/project import/export, checkpoints, diagnostics, and geometry verification.

The DSL makes ordinary diagrams small while keeping generated preservation data explicit. For example:

```text
diagram "A small system" version=1

group workers "Services"
node orders "Orders" in=workers
node payments "Payments" in=workers
node store "Database" kind=database
edge charge orders -> payments "authorize"
edge save orders -> store "persist"

layout root flow direction=auto gap=48
layout workers row gap=32
near payments orders side=right gap=32 view=explore

view explore "Explore" mode=interactive width=1000 height=640
view card "Summary" mode=static width=480 height=320 detail=auto
```

The prototype's source mutations preserve node declaration order when renaming. This matters because stable identifiers alone would not prevent accidental layout churn if a “rename” implementation removed a declaration and re-appended it elsewhere in an order-sensitive model.

### Verified versus intentionally incomplete

The delivered run passes **45 core tests and 26 browser integration tests**. These include real pointer dragging, fresh-process repeatability, cross-runtime geometry equality for all samples, nested bounds, hard-pin conflicts, collapse/edge provenance, view changes, exact-checkpoint idempotence/invalidation, source/export round-trips, invalid-input recovery, escaping, and a narrow-screen application layout. Full reports and test sources are included.

The managed Chromium in this environment blocks `file://` navigation, so browser tests injected the self-contained document with `set_content`. Native file opening in an unmanaged browser and other browsers were not verified. This is a test-environment limitation, not a hidden server dependency in the artifact.

Warm Node compile measurements for the small examples were on the order of a few milliseconds. A separate synthetic grouped-chain test measured medians of about **13.6 ms for 25 nodes**, **15.3 ms for 50**, and **80.7 ms for 100**, with 24/49/99 edges respectively. These are this prototype's local measurements, not competitor comparisons or performance guarantees; DOM painting is excluded. Adaptive static rendering can cost more because it evaluates multiple candidate summaries.

The significant missing pieces are a production layout/router backend, true incremental invalidation and Worker scheduling, arbitrary cross-container constraints, custom shapes and notation-specific algorithms, manual edge/label geometry, multi-panel view instances, robust font shaping/measurement, a structured collaborative patch service, and comprehensive accessibility interaction design. The current solver and router are bounded heuristics. Diagnostics do not prove that a better solution is impossible.

## 9. The next implementation step I would choose

Keep the prototype's separation of model, view, intent, and checkpoints. Replace its weakest algorithms before expanding the grammar substantially.

First, define a backend capability contract: compound groups, ports, hard locks, input ordering, partial layout, deterministic seed policy, and routing support. Try ELK and TALA on the same small corpus. Elkjs is a layout library rather than a ready-made editor and documents Worker integration; the application still owns source persistence, projections, and edit semantics. A separate router such as libavoid is worth evaluating when layout post-processing changes positions or group boundaries. [17][16][7][29]

Second, introduce a measured scene IR with explicit ports, group boundary interfaces, text metrics, and versioned style/measurement policy. Cache by scope and propagate invalidation through ancestors and cross-boundary edges. A post-layout constraint pass must trigger rerouting; otherwise the supposedly improved node positions can invalidate the original engine's edge geometry.

Third, evaluate the authoring loop, not just a gallery of initial images. For every backend, test adding a sibling, inserting a rank, renaming to a longer label, nesting a group, dragging then adding content, collapsing a group with many external edges, resizing to a small static viewport, local reflow next to pinned neighbors, contradictory constraints, and reopening the source in a clean process. Score movement, overlap, crossings, readable text, source-diff size, and compile/interaction latency separately.

Only then stabilize a public syntax or choose to expose the intent layer as an extension to an existing DSL. The durable product advantage is not inventing another spelling of “node A points to node B.” It is making **layout refinement understandable, portable, repeatable, and resilient to the next edit**.

## Sources

The linked references are primary project documentation, repositories, author announcements, or research papers. Access date: September 28, 2026. Tool capabilities change; the findings above are intentionally time-stamped.

<p id="ref-1"><span class="ref-number">[1]</span> <a href="https://mermaid.js.org/config/layouts.html" target="_blank" rel="noopener noreferrer">Mermaid: layout engines</a></p>
<p id="ref-2"><span class="ref-number">[2]</span> <a href="https://mermaid.js.org/syntax/flowchart.html" target="_blank" rel="noopener noreferrer">Mermaid: flowchart syntax, subgraphs and collapse</a></p>
<p id="ref-3"><span class="ref-number">[3]</span> <a href="https://d2lang.com/tour/layouts/" target="_blank" rel="noopener noreferrer">D2: layout engine comparison</a></p>
<p id="ref-4"><span class="ref-number">[4]</span> <a href="https://d2lang.com/tour/positions/" target="_blank" rel="noopener noreferrer">D2: positions</a></p>
<p id="ref-5"><span class="ref-number">[5]</span> <a href="https://d2lang.com/tour/grid-diagrams/" target="_blank" rel="noopener noreferrer">D2: grid diagrams</a></p>
<p id="ref-6"><span class="ref-number">[6]</span> <a href="https://d2lang.com/tour/api/" target="_blank" rel="noopener noreferrer">D2: Oracle / API</a></p>
<p id="ref-7"><span class="ref-number">[7]</span> <a href="https://d2lang.com/blog/tala-is-open-source/" target="_blank" rel="noopener noreferrer">D2 author announcement: TALA is open-source, September 7, 2026</a></p>
<p id="ref-8"><span class="ref-number">[8]</span> <a href="https://d2lang.com/blog/" target="_blank" rel="noopener noreferrer">D2 blog: nonprofit transition, September 5, 2026</a></p>
<p id="ref-9"><span class="ref-number">[9]</span> <a href="https://github.com/reladraw/reladraw" target="_blank" rel="noopener noreferrer">Reladraw repository and README</a></p>
<p id="ref-10"><span class="ref-number">[10]</span> <a href="https://raw.githubusercontent.com/reladraw/reladraw/main/SYNTAX.md" target="_blank" rel="noopener noreferrer">Reladraw syntax reference</a></p>
<p id="ref-11"><span class="ref-number">[11]</span> <a href="https://news.ycombinator.com/item?id=49858513" target="_blank" rel="noopener noreferrer">Reladraw: Hacker News discussion</a></p>
<p id="ref-12"><span class="ref-number">[12]</span> <a href="https://docs.structurizr.com/workspaces/file-types" target="_blank" rel="noopener noreferrer">Structurizr: DSL and compiled JSON file types</a></p>
<p id="ref-13"><span class="ref-number">[13]</span> <a href="https://likec4.dev/dsl/views/" target="_blank" rel="noopener noreferrer">LikeC4: model-based views</a></p>
<p id="ref-14"><span class="ref-number">[14]</span> <a href="https://likec4.dev/tooling/drawio/" target="_blank" rel="noopener noreferrer">LikeC4: Draw.io round-trip integration</a></p>
<p id="ref-15"><span class="ref-number">[15]</span> <a href="https://likec4.dev/tooling/cli/" target="_blank" rel="noopener noreferrer">LikeC4: CLI and layout-drift validation</a></p>
<p id="ref-16"><span class="ref-number">[16]</span> <a href="https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html" target="_blank" rel="noopener noreferrer">ELK: layered layout reference</a></p>
<p id="ref-17"><span class="ref-number">[17]</span> <a href="https://github.com/kieler/elkjs" target="_blank" rel="noopener noreferrer">elkjs: JavaScript layout library, limitations and Worker integration</a></p>
<p id="ref-18"><span class="ref-number">[18]</span> <a href="https://eclipse.dev/elk/reference/options/org-eclipse-elk-randomSeed.html" target="_blank" rel="noopener noreferrer">ELK: randomSeed option</a></p>
<p id="ref-19"><span class="ref-number">[19]</span> <a href="https://ialab.it.monash.edu/webcola/" target="_blank" rel="noopener noreferrer">WebCoLa: constraint-based graph layout</a></p>
<p id="ref-20"><span class="ref-number">[20]</span> <a href="https://www.yfiles.com/demos/layout/partial/" target="_blank" rel="noopener noreferrer">yFiles: Partial Layout demonstration and description</a></p>
<p id="ref-21"><span class="ref-number">[21]</span> <a href="https://graphviz.org/docs/layouts/dot/" target="_blank" rel="noopener noreferrer">Graphviz: dot layout and controls</a></p>
<p id="ref-22"><span class="ref-number">[22]</span> <a href="https://graphviz.org/docs/attrs/pin/" target="_blank" rel="noopener noreferrer">Graphviz: engine-specific pin attribute</a></p>
<p id="ref-23"><span class="ref-number">[23]</span> <a href="https://plantuml.com/layout-engines" target="_blank" rel="noopener noreferrer">PlantUML: layout engines and controls</a></p>
<p id="ref-24"><span class="ref-number">[24]</span> <a href="https://pikchr.org/home/doc/trunk/homepage.md" target="_blank" rel="noopener noreferrer">Pikchr: documentation and purpose</a></p>
<p id="ref-25"><span class="ref-number">[25]</span> <a href="https://bluefishjs.org/learn/what-is-bluefish.html" target="_blank" rel="noopener noreferrer">Bluefish: relations and partial layout specification</a></p>
<p id="ref-26"><span class="ref-number">[26]</span> <a href="https://penrose.cs.cmu.edu/docs/ref/style/overview" target="_blank" rel="noopener noreferrer">Penrose: Style language and separation of concerns</a></p>
<p id="ref-27"><span class="ref-number">[27]</span> <a href="https://penrose.cs.cmu.edu/docs/ref/constraints" target="_blank" rel="noopener noreferrer">Penrose: constraints and objectives</a></p>
<p id="ref-28"><span class="ref-number">[28]</span> <a href="https://constraints.cs.washington.edu/solvers/cassowary-tochi.pdf" target="_blank" rel="noopener noreferrer">Badros, Borning and Stuckey: Cassowary constraint solving (paper)</a></p>
<p id="ref-29"><span class="ref-number">[29]</span> <a href="https://www.adaptagrams.org/documentation/libavoid.html" target="_blank" rel="noopener noreferrer">Adaptagrams: libavoid routing overview</a></p>
<p id="ref-30"><span class="ref-number">[30]</span> <a href="https://penrose.cs.cmu.edu/docs/ref/Interactivity" target="_blank" rel="noopener noreferrer">Penrose: experimental interactivity</a></p>
