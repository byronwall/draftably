# Draftably capability strategy

**Decision.** Build on Draftably’s existing source/editor loop: first make semantic comparisons faithful to every supported content field, then add reusable relationship endpoints and typed field rows, deepen the existing sequence layout, and make notes and a small symbol vocabulary portable in `.draft`. Explore named structural views only after those foundations have a clear source and geometry contract. Keep full BPMN, broad UML conformance, scheduling, and an application framework out of the next build cycle. The best opportunity is to help a person and an agent explain and review changing software systems with readable source and predictable drawings. The evidence does not justify copying the largest competitor’s entire syntax catalog.

**Status:** Strategy research and proposals only. No application implementation, dependency installation for Draftably, repository integration, commit or push was performed.

**Baseline:** `2995a98eef31803fa8669a7ada5c8f8892486bb7`, obtained from the supplied `source-packet.txt`. **External verification:** 2026-10-28 UTC, corresponding to the mission’s 2026-10-27 date in America/Indianapolis. Individual source records retain their observed date. Documentation is a point-in-time observation, not a promise about later releases.

## How to use this research

- Read the baseline findings and ranked decision first. The matrices answer coverage questions; their counts do not determine product priority.
- `diagram-types.csv` and `features.csv` are normalized tables: one tool–capability judgment per record. They include scope, rationale, evidence keys, direct source URLs and dates. They contain all 15 alternatives plus Draftably.
- `capability-bets.md` expands the five bets into competitor examples, current `.draft` approximations, clearly unimplemented syntax proposals, dependencies, smallest slices, proof cases and Design questions.
- Evidence keys beginning `DR-` refer to exact packet paths and symbols. Other keys resolve to current primary sources in the source index. Code and tests outrank old plans.
- **Fact** means directly supported by the reviewed source or implementation. **Inference** means the evaluation of how a primitive could serve a job, or its likely implementation consequences. **Proposal** means future behavior that does not exist in this baseline.

## Navigation

- [Access and method](#1-access-review-scope-and-method)
- [Verified Draftably baseline](#2-what-draftably-actually-supports)
- [The 15 alternatives](#3-the-15-alternatives-and-why-they-belong)
- [Diagram-type matrix](#4-diagram-type-matrix)
- [Feature matrix and frequencies](#5-feature-matrix-and-commonality)
- [What coverage means](#6-what-the-coverage-means-for-draftably)
- [Ranked bets](#7-ranked-capability-bets)
- [Build / Explore / Defer / Avoid](#8-dispositions-for-the-wider-opportunity-set)
- [Uncertainty and Design questions](#9-uncertainty-risks-and-open-design-questions)
- [Source index](#10-source-index)
- [Files read and handoff](#11-files-read-and-final-handoff)

## 1. Access, review scope and method

### Access result

The supplied packet was sufficient for the core review. Its 77 path-delimited files were extracted unchanged and read, including the complete supplied parser, compiler, comparison logic, source translator, model/routing files, CLI/export paths, file-session code, all 25 examples, all eight supplied test files and the requested intent documents. The preparation branch was not needed to establish the baseline. The public repository’s current head was not substituted for the supplied commit.

This is a full review of the **supplied review surface**, not a claim to have read every file in the repository. Some referenced renderer components, layout-engine internals, server modules, font assets, packaging scripts and additional test suites were not in the packet. Their existence and intended checks are described by the supplied architecture/check documents; their runtime behavior was not independently executed here. The packet is not a complete runnable checkout. No Draftably tests, browser performance benchmarks or cross-platform render comparisons were run. Test assertions were inspected as evidence of intended and covered behavior. Competitor snippets are complete small examples with prerequisites, reviewed against current primary syntax/API documentation, but were not executed. [DR-01](#dr-01), [DR-13](#dr-13)

### Selection and comparison method

The mission’s suggested set was retained exactly: Mermaid, PlantUML, Graphviz, D2, Structurizr DSL, mingrammer/diagrams, nomnoml, React Flow, JointJS, GoJS, bpmn-js, Cytoscape.js, AntV X6, AntV G6 and yFiles. No replacement was necessary. Together they expose three different decisions: which notations a language should express, which primitives an editor should make easy, and how much domain modeling a toolkit takes responsibility for.

The selection uses dated repository observations, official integrations and ecosystem evidence. Stars are approximate observations of attention, not user counts, revenue, quality, or a universal rank. A GitHub mirror can understate an older project’s reach. Proprietary yFiles and GoJS cannot be compared fairly by open repository stars. Package downloads would also mix applications, build systems and transitive use, so no fabricated cross-tool adoption league table is offered.

ELK and Dagre appear as supporting layout engines. They are not additional alternatives and do not inflate the denominator. Hosted products, paid editions and companion packages do not count as extra tools either. They are called out where they change a capability boundary.

### Support legend and scoring discipline

| Code | Meaning and boundary |
| --- | --- |
| **N** | Native in the evaluated scope: a dedicated notation/model, or a shipped built-in capability for that row. It does not imply complete standards conformance. A paid product’s base can be N when its commercial boundary is explicit. |
| **P** | Partial support or a generic approximation. The record states what exists and what remains missing. A graph of state names is P for statecharts, even when it is useful. |
| **C** | Custom programming/application assembly required. An official demo proves feasibility, not a built-in domain notation, parser or complete editor. |
| **E** | A named extension, companion package, or commercial edition supplies the capability beyond the evaluated base. Generic converter libraries requiring an application pipeline remain C. This code does not by itself mean paid. |
| **U** | Unavailable within the evaluated product/grammar, supported by explicit scope or an exhaustive model/syntax boundary. It does not mean impossible to implement elsewhere. |
| **?** | Current evidence is insufficient. A failed search or missing documentation page does not become U. |

For example, a toolkit’s native node/link creation can be N for an editing feature while its ER demo remains C. A basic generic directed graph can be N for dependency graphs without having a dependency extractor. Architecture, C4, UML, ER and BPMN are evaluated for their specific notation/model boundary, not merely their ability to draw rectangles.

The matrix defaults to each product’s stated base. Draftably defaults to the `.draft`-backed workflow. Its standalone browser model is broader, and those differences are made explicit rather than credited to the source language. `editor_roundtrip` always names the canonical format: saving graph JSON is useful, but differs from preserving a readable DSL and comments. Likewise, an orthogonal-looking connector is not necessarily obstacle-aware routing, and repeatable output is not the same as stable placement after an edit.

## 2. What Draftably actually supports

### Native families already shipped

- **Flow and dependency diagrams.** Stable-ID nodes, nested groups, labeled directed edges, cycles, decisions and automatic layout form the core. Source recipes include flow, row and column, with additional engine choices. Generic software architecture is a first-order communication job, even though its domain roles remain labels. [DR-02](#dr-02), [DR-03](#dr-03), [DR-17](#dr-17)
- **Basic sequence diagrams.** `layout root sequence` gives participant placement, lifelines, message order from source edge order, self messages, top-level participant bands and labeled `phase` bands. The compiler has an actual sequence geometry path, not a gallery mockup. Advanced interactions remain incomplete: no activation intervals, combined `alt/loop/par` fragments, creation/destruction or attached notes. [DR-04](#dr-04)
- **Swim lanes.** `layout root lanes` establishes ownership bands and ranks shared across lanes. Direction changes band orientation; the implementation maintains equal-length lanes. This is genuine lane support. It is not BPMN pools, executable processes, a BPMN metamodel or XML interchange. [DR-05](#dr-05)
- **Cell structures and packet/file layouts.** Touching cell groups, columns, spans, bit/byte units, wrapping, rulers and variable-length byte regions have dedicated compiler geometry and tests. The TCP header and PNG examples show real notation-level support. These do not parse binaries or validate network protocol semantics. [DR-06](#dr-06)
- **Semantic review outputs.** Source marks `+`, `-`, `~`, `.` and a comparison command exist. A `compare` declaration produces aligned before/after exports using common geometry and routes. Named emphasis states produce related views without moving the layout. Neither capability should be described as missing. [DR-07](#dr-07), [DR-08](#dr-08), [DR-09](#dr-09)

### Useful approximations that should remain honestly named

| User job | Existing support and its limit |
| --- | --- |
| Explain a database schema | Cell groups and links to field IDs are useful. Field names/types are separate text cells; there is no entity/attribute/key model, crow’s-foot vocabulary or multiplicity validation. The billing example is not a full ER DSL. [DR-06](#dr-06) |
| Explain an order lifecycle | Pills, diamonds and labeled edges depict states. The `state` statement controls emphasis, not behavioral state-machine semantics. Initial/final/history states and guarded transition semantics are absent. [DR-02](#dr-02), [DR-17](#dr-17) |
| Draw C4, cloud or deployment views | Nested groups and labels represent people, services, environments and boundaries. There are no typed C4 views, provider symbol catalogs in `.draft`, or UML deployment semantics. Examples named AWS/Kubernetes do not change that boundary. [DR-02](#dr-02), [DR-17](#dr-17) |
| Show a class or record | Cells can form compartments. Visibility, attributes/methods, inheritance, composition and association multiplicity are not modeled. [DR-02](#dr-02), [DR-06](#dr-06) |
| Add explanatory prose | A text node plus layout hints is possible. It has no attached-note anchor, note leader or sequencing semantics. A source comment is not a visible annotation. [DR-02](#dr-02), [DR-04](#dr-04) |
| Present variants of one system | Emphasis states select focus while retaining context. Structural inclusion/exclusion and independent named views are absent; the parser explicitly rejects `view`. [DR-02](#dr-02), [DR-09](#dr-09) |

Ordinary configuration of existing primitives receives the same treatment in a DSL and a programmatic API: a bounded architecture, lifecycle or annotation sketch is P. C requires additional domain logic, custom rendering/layout, behavior or an application pipeline. A toolkit’s complete ER editor can be C while its native table primitives provide a P-level schema drawing. The code does not reward a DSL merely for being textual.

### Language and model limits that matter for strategy

`DslShape` deliberately excludes the editor’s `icon` and `image` shape kinds. The source vocabulary is `box`, `pill`, `circle`, `diamond`, `text`, and `marker`. `translateEdit` rejects unsupported image/icon insertion, custom edge waypoints and label positioning rather than pretending those edits were saved. Standalone image support therefore does not close the portable source-content gap. [DR-02](#dr-02), [DR-10](#dr-10), [DR-11](#dr-11), [DR-12](#dr-12)

The edge grammar accepts `->`; `kind=async` maps to a dashed line. It does not distinguish a return from an asynchronous call semantically. `from` and `to` choose sides, not named ports. Cell IDs are legitimate edge endpoints, with special attachment behavior for interior cells. That provides a valuable implementation base for field connections, but does not provide a general semantic port model. [DR-02](#dr-02), [DR-10](#dr-10)

Several plausible-looking attributes are not domain semantics. In `parseModel`, node `kind` and priority/edge importance are validated without becoming a retained typed domain model; detail is not a rendered rich body. A future design must not silently assume these are already a persistent taxonomy. Choose explicit retained metadata and document migration before using it for validation or comparisons. [DR-02](#dr-02)

The source has forward references, stable identifiers, comments, formatting and structural limits: 300,000 characters, 500 combined nodes/groups, 1,200 edges and 12 nesting levels. These are parser bounds, not measured performance capacities. There are no source includes, reusable definitions, loops, data bindings or a general expression language. Agents and scripts can generate `.draft`, which is different from embedding a programming language inside it. [DR-02](#dr-02), [DR-14](#dr-14)

### Layout, routing and editing are product strengths

The compiler uses shared measurement and a fixed render context to make source, CLI and browser geometry agree. Ten named engine recipes are accepted in source; the editor’s repair operation is not misrepresented as a replayable cold recipe. `near`, `nudge`, `stay`, `pin`, `size`, `order` and `align` let automatic layout coexist with human intent. Engine choices are recipes; path-dependent improvements are persisted as arrangements. The source translator preserves comments, anchors surrounding content, reports movement outside an edit and supports local reflow. [DR-02](#dr-02), [DR-03](#dr-03), [DR-11](#dr-11)

That is a richer authoring contract than “run a layout algorithm.” It is still bounded. A cold recipe can reorganize the graph after a structural edit. Stays are soft and may relax; pins can force conflicts. Sequence/lane layouts restrict manual refinements. Automatic orthogonal routing and group channels are heuristics, with diagnostics for remaining overlaps, routes through nodes/titles and label conflicts. Nothing reviewed proves global optimality or a universal latency promise. [DR-03](#dr-03), [DR-10](#dr-10), [DR-13](#dr-13)

The file-session boundary is also consequential: disk source is authoritative, valid external edits update the view, invalid source retains the last valid drawing, stale writes have explicit conflict handling, and an external revision resets source undo history. Temporary camera, selection and collapse state do not become hidden authored layout requirements. These details are worth protecting as the language gains richer content. [DR-11](#dr-11), [DR-12](#dr-12)

### Comparison fidelity is the most important discovered weakness

The existing feature is real, but its automatic classification is narrower than its apparent promise. `objectKey` in `src/dsl/compare.ts` compares only label, parent, color, shade and shape. `edgeKey` compares source, target, label, dashed state and attachment sides. Changes to `href`, `count`, `frame`, `fold`, `span`, object type and edge layout participation are not part of those equality keys. Phase/state membership, ordering and other statements also lack an explicit semantic delta model. This is a source-code finding, not a speculation from missing documentation. [DR-07](#dr-07)

There is a second, independent issue: retaining the old label through `was` does not preserve arbitrary old field values. Simply adding `span` to the equality key would mark a change but would not by itself make the before panel show the old span. Comparison requires both **change detection** and **version-faithful rendering**. Moved nodes and retargeted edges get old/new copies. Moved groups are explicitly different: `compareDetailed` returns a warning list because both panels place them under the new parent. A before panel can therefore be visually aligned yet historically inaccurate. [DR-07](#dr-07), [DR-08](#dr-08)

The recommended first slice is a capability-specific diff policy, diagnostics for unsupported differences, and regression fixtures for already supported fields. Do not start by inventing a new diff language. A later slice must decide how a review export carries two values or two source versions while maintaining common positions for unchanged content. This foundation becomes more valuable when keys, cardinalities, notes or views are introduced.

Keep three capabilities distinct in documentation: **semantic comparison** classifies model changes, **aligned panels** render versions in a common frame, and **layout comparison** previews alternative algorithms/settings. All three exist in some form, and they have different completeness guarantees. CLI `compare --svg` alone does not imply a two-panel layout; the `compare` source declaration is the export control. `--states` and `compare` are explicitly incompatible in the reviewed CLI. [DR-07](#dr-07), [DR-08](#dr-08), [DR-11](#dr-11)

### Export, interchange and accessibility

PNG/SVG exports can carry source, with an explicit opt-out. Extraction and several CLI commands can consume the embedded source. SVG is native; PNG has a browser-binary prerequisite. Own-format JSON and editable SVG metadata are supported. Arbitrary SVG is not a semantic import path, and there is no native PDF export in the supplied implementation. Converting an exported SVG elsewhere is an external workflow, not native PDF support. [DR-08](#dr-08), [DR-12](#dr-12)

Source-bearing images are valuable but not unique across the comparison set: PlantUML and nomnoml also document source preservation in output. Draftably’s stronger claim is the combination of source recovery, shared geometry, visual edits that return to readable source, local constraints and review outputs. Avoid a uniqueness claim based on one feature. See the export/source rows and the relevant primary sources in the profiles.

There is positive accessibility groundwork: meaningful SVG titles, contrast-aware themes, non-color change cues and documented keyboard actions. The supplied checks explicitly state that a full accessibility audit was not performed. No WCAG conformance, comprehensive screen-reader support or complete keyboard equivalence is claimed here. Accessibility should be a delivery condition for new notes/ports/views, with observable behavior, rather than a marketing checkbox. [DR-08](#dr-08), [DR-09](#dr-09), [DR-13](#dr-13)

### Material conflicts between old plans and the baseline

| Historical claim or implication | Evidence-led resolution |
| --- | --- |
| The comparison gap analysis describes missing change marks, comparison outputs, headings, PNG or link/count metadata | The current parser, CLI, status renderer and tests implement those capabilities. The gap is completeness and fidelity. [DR-02](#dr-02), [DR-07](#dr-07), [DR-08](#dr-08), [DR-12](#dr-12), [DR-16](#dr-16) |
| Earlier structure plans reject sequence groups | Current code supports top-level participant bands and phase bands. Nested participant containers remain restricted. [DR-04](#dr-04), [DR-15](#dr-15) |
| Primitive milestones still read as planned | Cells, spans, byte/bit units and variable regions are implemented. Image-rich cells are not established by the packet. [DR-06](#dr-06), [DR-15](#dr-15) |
| An old plan proposes `status=` or per-panel rerouting | Shipped source uses mark prefixes and shared comparison routes. Proposed syntax must start from the implementation. [DR-07](#dr-07), [DR-08](#dr-08), [DR-16](#dr-16) |
| The early DSL plan defers layout Compare/Timeline/Brush persistence | The later layout plan and `layout-edits.ts`/translator implement recipes and arrangements. [DR-11](#dr-11), [DR-16](#dr-16) |
| An earlier comparison says Mermaid has no native lanes | Current Mermaid documentation has a dedicated swimlane syntax. Draftably’s native lanes remain useful but are not an exclusive category advantage. See MER sources below. |

Prior exclusions from a one-night implementation are not permanent product bans. Conversely, a plan mentioning an image initiative or a future view does not prove it shipped. The primitive intent references existing rich-node work; Codex should inspect that branch/PR before creating overlapping work. The reviewed packet does not establish its current integration status. [DR-15](#dr-15), [DR-16](#dr-16)

## 3. The 15 alternatives and why they belong

The profiles below distinguish a tool’s core, companion packages and paid boundaries. Each selection proxy was observed on the verification date. Feature counts later in this report use the codes in the CSVs, not broad vendor claims.


### Categories and selection proxies

Six alternatives have a dedicated text language (including DOT and Structurizr DSL); three are primarily programmable graph/diagram libraries; six are editor/modeling toolkits. The panel groupings below keep tables narrow. A category describes the evaluated product interface, not a capability score.

### Text languages: broad and compact notation

#### Mermaid

**Evaluated scope:** Current open-source full Mermaid library (official docs report 12.2.0), official CLI; excludes Mermaid Chart commercial visual editor.

**Edition/license boundary:** MIT core. Official CLI is a separate free package. Mermaid Chart services/visual authoring are a distinct product layer and are not credited to the core.

Mermaid is the broadest lightweight documentation DSL in this subset: its current catalog reaches far beyond flowcharts into sequence, state, class, ER, requirements, packet, journey, schedules and architecture. Its strongest lesson for Draftably is notation depth delivered through short, recognizable declarations. ER keys and cardinalities and sequence fragments express information that generic labeled boxes do not capture. Current documentation also changes older comparisons: swimlanes are first-class, flowchart groups can collapse with boundary-edge redirection, and ELK is now bundled and default for several families. Architecture-beta and experimental C4 syntax should not be confused with a reusable typed architecture repository. The open-source library remains source-to-render tooling; graphical source mutation, multiplayer and hosted services belong to other layers. Native accessible descriptions are a useful low-cost workflow benchmark. Its breadth alone is a poor roadmap for a personal project: every added family carries a grammar, measurement and rendering surface. The useful benchmark is expressive clarity with consistent behavior across families.

**Selection evidence:** Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC): official GitHub repository displayed approximately 90.9k stars (rounded UI count). Official docs and CLI demonstrate an active renderer, browser API and automation ecosystem. This is a selection proxy, not a universal market rank. [MER-17](#mer-17), [MER-16](#mer-16)

Primary evidence: [MER-01: Mermaid introduction / current family catalog](https://mermaid.js.org/intro/); [MER-02: Flowcharts syntax](https://mermaid.js.org/syntax/flowchart.html); [MER-03: Sequence diagrams](https://mermaid.js.org/syntax/sequenceDiagram.html); [MER-09: Swimlanes diagrams](https://mermaid.js.org/syntax/swimlanes.html); [MER-14: Layouts](https://mermaid.js.org/config/layouts.html).

#### PlantUML

**Evaluated scope:** Current official JVM PlantUML documentation/core and bundled standard library; experimental/removed families flagged; no third-party IDE credited.

**Edition/license boundary:** Open-source with multiple licensed builds; ordinary GPL distribution and alternative license variants. Bundled libraries carry their own notices. No paid tier needed for the credited language families.

PlantUML provides the richest notation-depth reference here: sequence controls, UML classifiers and relationships, statecharts, activity control flow, ER variants, timing, deployment and network syntax. Its standard library adds practical C4 and vendor assets without making every asset a new compiler primitive. Source-bearing images are also established: the CLI documents PNG/SVG source extraction, so that capability alone cannot differentiate Draftably. The more useful contrast is text rendering versus Draftably's coordinated local editor and geometry refinement. Current-source review prevents two mistakes: packetdiag shipped in February 2026, while chronology remains documented even though the changelog says it was temporarily removed. The latter is treated as uncertain, with Gantt offering only a timeline approximation. Its broad preprocessor is powerful but not an appropriate template for turning a small readable DSL into a general programming language. Layout features vary across Graphviz, Smetana, ELK and specialized engines, so syntax availability does not prove equal output quality.

**Selection evidence:** Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC): official GitHub repository displayed approximately 13.4k stars, with current 2026 release notes and a bundled ecosystem of C4/cloud libraries. Stars are a reach proxy; mature integrations matter more than direct comparison with JavaScript toolkit counts. [PUML-23](#puml-23), [PUML-16](#puml-16), [PUML-08](#puml-08)

Primary evidence: [PUML-01: PlantUML overview](https://plantuml.com/); [PUML-02: Sequence syntax](https://plantuml.com/sequence-diagram); [PUML-03: Class syntax](https://plantuml.com/class-diagram); [PUML-16: Changes](https://plantuml.com/changes); [PUML-10: Command line](https://plantuml.com/command-line).

#### nomnoml

**Evaluated scope:** MIT nomnoml library, CLI and client-side text editor; repository package 1.7.0.

**Edition/license boundary:** MIT; no paid boundary in evaluated implementation. Graphre is its layout dependency.

nomnoml is a deliberately small class-oriented DSL and useful counterweight to broad catalog competitors. Its readable compartments, inheritance/composition/aggregation markers and compact nested drawings show how much notation value a modest language can supply. Table and note classifiers are native, while state-like shapes or architecture packages do not establish statechart or C4 semantics. The documented browser application is a text editor with live preview and local storage, not a visual model editor. Node/compartment data attributes let application authors build interaction but should not be counted as built-in editing. An easy-to-miss strength is source text embedded in SVG desc, recorded in the official changelog; PNG source embedding was not established. Its smaller reach and older latest listed release make it a language-design reference rather than a popularity leader. Draftably can borrow concise compartments and relationship vocabulary without copying an entire UML suite or assuming its own richer layout/editor workflow is already commoditized.

**Selection evidence:** Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC): official GitHub displayed approximately 2.8k stars. Repository package is 1.7.0 and latest listed changelog entry is December 14, 2024. Retained as the compact UML DSL reference proposed by the brief; no claim that it outranks more active projects. [NOM-02](#nom-02), [NOM-03](#nom-03), [NOM-05](#nom-05)

Primary evidence: [NOM-01: nomnoml syntax and web application](https://nomnoml.com/); [NOM-02: Repository and library/CLI README](https://github.com/skanaar/nomnoml); [NOM-03: Package manifest](https://github.com/skanaar/nomnoml/blob/master/package.json); [NOM-05: Changelog](https://github.com/skanaar/nomnoml/blob/master/changelog.md).

### Text languages: graphs and architecture models

#### Graphviz

**Evaluated scope:** DOT language, Graphviz command-line tools/layout engines and documented output plugins; no external domain-specific DSL credited.

**Edition/license boundary:** Open-source EPL 2.0; rendering formats depend on installed build/plugins, not generally commercial editions.

Graphviz belongs in the set as an enduring graph-language and layout benchmark, not as a competitor with native support for every diagram its users can draw. DOT specifies attributed graphs. Records and HTML-like tables can approximate class/schema structures, with named ports and composable endpoint glyphs supplying much of the visual vocabulary. They do not create PK/FK or state-machine semantics. Its explicit ranks, pins, layouts and structured outputs are valuable references for deterministic tooling and compiler boundaries. The routing documentation is unusually candid: orthogonal routing does not handle ports or, in dot, edge labels, so a checkmark for both ports and routing must not imply their combination is flawless. Selective drawing layers and graph-processing tools are real features, while synchronized semantic comparisons and a visual editor that rewrites canonical DOT are application work. Draftably should learn from the small core and addressable structures without exposing the entire layout engine attribute surface.

**Selection evidence:** Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC): current PlantUML docs still identify Graphviz as the default layout engine, providing direct ecosystem reach evidence. Graphviz official arrow grammar page was modified October 2, 2026. No GitHub-mirror star number is used as a misleading popularity rank for this GitLab-hosted project. [GV-15](#gv-15), [GV-04](#gv-04), [GV-01](#gv-01)

Primary evidence: [GV-01: Graphviz overview](https://graphviz.org/); [GV-02: DOT grammar](https://graphviz.org/doc/info/lang.html); [GV-03: Node shapes](https://graphviz.org/doc/info/shapes.html).

#### D2

**Evaluated scope:** Open-source D2 0.9.0/current documentation, bundled Dagre/ELK/TALA and CLI; proposed future D2 Studio excluded.

**Edition/license boundary:** MPL-2.0. TALA became open-source and bundled in v0.9.0 in September 2026: no separate license key or paid plugin. Old paid-TALA comparisons are stale.

D2 is the closest strategic language comparator: architecture-oriented, local, declarative, composable and agent-friendly. Its shared building blocks enable UML compartments, SQL rows, sequence diagrams, icons and rich labels without wholly isolated mini-languages. Imports, reusable classes, suspend/unsuspend filters, and layers/scenarios/steps are particularly instructive for managing multiple explanations of one model. Their presence does not establish semantic before/after matching or stable aligned panel geometry. There is an important current change: TALA is now open source and bundled, so pinning and architecture-oriented routing must no longer be presented as a paid advantage. Fixed seeds make identical inputs reproducible, while small edits can still rearrange the diagram; determinism and incremental stability are different claims. SQL field connections also depend on engine choice. D2's current non-profit direction overlaps Draftably's local-agent focus, making source/editor integration, repairable geometry and comparison workflows a stronger differentiation than merely being offline. Its competitive pressure is strongest on practical architecture authoring and source reuse.

**Selection evidence:** Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC): approximately 25.7k stars displayed by official d2lang/d2 repository; official VS Code/Vim/Obsidian integrations and current 0.9.0 release. September 2026 non-profit/TALA announcements materially change the competitive boundary. [D2-23](#d2-23), [D2-24](#d2-24), [D2-25](#d2-25), [D2-26](#d2-26)

Primary evidence: [D2-01: D2 overview](https://d2lang.com/tour/intro/); [D2-02: Sequence diagrams](https://d2lang.com/tour/sequence-diagrams/); [D2-03: SQL tables](https://d2lang.com/tour/sql-tables/); [D2-24: D2 v0.9.0 release](https://d2lang.com/releases/0.9.0/); [D2-25: TALA open source announcement](https://d2lang.com/blog/tala-is-open-source/); [D2-26: D2 non-profit announcement](https://d2lang.com/blog/d2-non-profit/).

#### Structurizr DSL

**Evaluated scope:** Current consolidated Structurizr DSL + free local tooling and browser renderer; server collaboration excluded; exports are separately qualified.

**Edition/license boundary:** Current consolidated repository is Apache-2.0. local and export commands are free/open source; hosted/team server service boundaries are outside this comparison. Legacy Lite/Java repositories are archived, not the current product.

Structurizr is the strongest architecture-model comparison in this group: people, software systems, containers, components, deployment instances, and relationships form one model from which named views select content. Its relevance to Draftably is consistency and reuse across views, not maximum diagram-family breadth. Filtered views operate on tags; dynamic views sequence relationship instances; deployment views connect software abstractions to infrastructure. It provides architecture-specific inspections as well as parsing. The browser diagram editor changes layout, not semantic model contents, and saves layout into a companion JSON workspace. Consequently, it does not match Draftably’s editable source round trip. Dynamic views are interaction graphs; PlantUML export can render them as sequence diagrams, but this is not native comprehensive sequence notation. Current consolidated local tooling succeeds Lite, whose archived repository should not be mistaken for project abandonment. Export format parity is explicitly limited, and direct PNG/SVG command export currently carries a preview/build-from-source caveat. For Draftably, adopt the underlying idea of one named object with multiple explicit projections only after stable identifiers and semantic comparison are trustworthy. Avoid importing the entire C4 governance stack.

**Selection evidence:** Fetched 2026-10-27: current structurizr/structurizr repository displayed 505 stars and identifies itself as the C4 model reference implementation; DSL README cites appearance on ThoughtWorks Tech Radar. Stars are depressed by recent repository consolidation and are not comparable to older projects. Sources STR-02, STR-14.

Primary evidence: [STR-01: Structurizr DSL language reference](https://docs.structurizr.com/dsl/language); [STR-02: Current consolidated Structurizr repository](https://github.com/structurizr/structurizr); [STR-03: local command](https://docs.structurizr.com/local); [STR-04: Local workflow](https://docs.structurizr.com/local/workflow); [STR-07: Filtered views cookbook](https://docs.structurizr.com/dsl/cookbook/filtered-view/).

### Programmable diagram and graph libraries

#### mingrammer/diagrams

**Evaluated scope:** Python diagrams package and official browser playground; Graphviz is its renderer; downstream generators are selection evidence, not native package capabilities.

**Edition/license boundary:** MIT package. Provider icon rights are distinct from the package license. Graphviz required for installed workflow; browser playground uses Pyodide/Graphviz WASM.

Diagrams optimizes a specific job: sketching infrastructure with recognizable cloud and software service icons from executable Python. Nodes, edges and nested clusters are direct APIs; bundled provider catalogs greatly reduce visual setup. Its C4 package supplies concrete C4-styled classes, but it does not provide Structurizr’s shared architecture model and derived views. Python functions, loops and data access support generation, at the cost of an executable source environment rather than a constrained declarative file. The official playground now runs the real package locally in the browser via Pyodide and Graphviz WASM, with code completion and exports, so describing the project as CLI-only would be stale. It remains source-to-image, with no established visual changes back into Python. Graphviz attributes offer broad rendering escape hatches; they should not be confused with built-in ER, sequence or BPMN semantics. Current source contains named themes, explicit format/direction validation and randomly generated IDs by default. Those IDs and full rerendering make portable identity and edit stability a different problem from Draftably’s. Its main lesson is inexpensive, domain-recognizable visual vocabulary, especially icons and C4-style metadata, while keeping Draftably’s deterministic declarative boundary.

**Selection evidence:** Fetched 2026-10-27: official repository displayed 42.8k stars. README documents Apache Airflow usage and downstream cloud/Kubernetes generators; these are ecosystem reach proxies, not measured active users. Source DIAG-01.

Primary evidence: [DIAG-01: Diagrams repository](https://github.com/mingrammer/diagrams); [DIAG-02: Diagram API guide](https://diagrams.mingrammer.com/docs/guides/diagram); [DIAG-03: Nodes guide](https://diagrams.mingrammer.com/docs/guides/node).

#### Cytoscape.js

**Evaluated scope:** Current Cytoscape.js core reference; named extensions separated.

**Edition/license boundary:** MIT core and first-party extensions; third-party extension licenses/maintenance must be assessed separately. The inspected cytoscape-svg extension is GPL-3.0; it does not inherit the core MIT license.

Cytoscape.js is a graph analysis and visualization library with a serializable node/edge model, selectors, stylesheets, compound nodes and graph algorithms. It is particularly useful as a comparator for data exploration, filtering and graph queries. A hierarchy or dependency network is a direct use of its graph model; an ER model, sequence diagram or C4 architecture view needs a custom application and conventions. The presence of an SBGN stylesheet or other gallery example does not turn every diagram family into native notation. Core image export is raster-oriented; SVG, richer editing and undo are available through extensions. The extension ecosystem matters as much as the base feature checklist: the inspected expand-collapse package explicitly says it is no longer maintained. Its strength also explains a strategic boundary for Draftably. Borrow effective view/filtering and compound-graph ideas, but do not trade a readable local diagram language for a general graph-analytics framework unless an actual task requires graph analysis.

**Selection evidence:** Observed 2026-10-27: official GitHub displays approximately 11.3k stars; the official reference lists use across technical/research products and includes published research citations. This is an ecosystem signal, not evidence of suitability for every diagram family. [CY-01](#cy-01), [CY-02](#cy-02)

Primary evidence: [CY-01: Cytoscape.js repository](https://github.com/cytoscape/cytoscape.js); [CY-02: Cytoscape.js reference](https://js.cytoscape.org/); [CY-03: fCoSE extension](https://github.com/iVis-at-Bilkent/cytoscape.js-fcose).

#### AntV G6

**Evaluated scope:** Current G6 5.1.1 documentation, core including built-in behaviors/plugins; renderer add-ons identified.

**Edition/license boundary:** MIT; optional SVG/WebGL/WASM/GPU packages are separate integrations, not paid editions.

G6 focuses on relational visualization and exploration. Native tree layouts, graph layouts, combos, keyed ports, collapse behavior, themes and history make it a strong comparison for managing diagram complexity. Its built-in mind-map layout is real support for a tree presentation, but it does not imply a ready general-purpose mind-map authoring product. Most software-engineering notations remain custom models and renderers. A particularly easy classification mistake is the Timebar plugin: it filters and plays temporal graph data, but it is not a Gantt scheduler or a source-level timeline language. Current exports also need care. The high-level API enumerates PNG, JPEG and WebP, while SVG requires the optional renderer/export plumbing. Browser rendering and image portability are therefore different claims. Draftably should learn from explicit state/view transformations, semantic port identifiers and collapsed-group behavior, while retaining deterministic source and CLI outputs instead of chasing visualization-framework breadth.

**Selection evidence:** Observed 2026-10-27: official GitHub displays approximately 12.4k stars; current docs advertise 5.1.1 and preserve earlier-version routes. The official site presents a wider AntV/Graphin ecosystem. [G6-01](#g6-01), [G6-02](#g6-02)

Primary evidence: [G6-01: G6 repository](https://github.com/antvis/G6); [G6-02: Documentation and built-in taxonomy](https://g6.antv.antgroup.com/en/docs/manual/); [G6-03: Layout overview](https://g6.antv.antgroup.com/en/manual/layout/overview).

### Interactive diagram toolkits

#### React Flow (xyflow)

**Evaluated scope:** MIT @xyflow/react core/current v12 documentation. Optional Pro examples and copy-in React Flow UI components are separately qualified; Svelte Flow is not counted as another alternative.

**Edition/license boundary:** Core is MIT. Pro sells support and licensed example/template source, not a different closed-source runtime. Advanced recipes can also be independently implemented.

React Flow is an application-building foundation, not a multi-notation diagram compiler. It supplies draggable/selectable nodes, handles, edges, groups, viewport controls and accessibility machinery. Custom nodes are React components, so complex interactive cards are easy to build, while their semantics, export behavior and layout remain application responsibilities. Its official documentation explicitly says the library has no layout engine; Dagre, ELK and other engines are integrations. Likewise, the official image example relies on html-to-image, and undo/redo and expand/collapse are Pro example implementations rather than native domain features. React Flow UI now includes a copy-in database schema node, but that is a visual component, not a validated ER model. Strong built-in keyboard behavior and ARIA configuration are a useful comparison for Draftably. The app can serialize node/edge/viewport state, but it does not rewrite application React source after visual edits. Its popularity demonstrates demand for embedded node editors; it is not evidence that Draftably should change frameworks. Preserve SolidJS and learn from handle identity, keyboard interaction and accessible descriptions rather than adopting an incompatible runtime.

**Selection evidence:** Fetched 2026-10-27: xyflow monorepo displayed 38.8k stars (shared React/Svelte ecosystem; not React-only). Official Pro page names production use including Stripe and LinkedIn. Sources RF-01 and RF-02.

Primary evidence: [RF-01: xyflow repository](https://github.com/xyflow/xyflow); [RF-02: React Flow Pro](https://reactflow.dev/pro); [RF-03: Layouting overview](https://reactflow.dev/learn/layouting/layouting).

#### JointJS

**Evaluated scope:** Current v4.3 @joint/core base; separately shipped open-source layout packages and commercial JointJS+ plugins identified with E. Sample apps are custom implementations.

**Edition/license boundary:** Core MPL-2.0; JointJS+ commercial. DirectedGraph and MSAGL layout packages are open source. Record/BPMN shapes, image export, CommandManager and Validator are Plus boundaries.

JointJS offers a mature SVG-based diagram application model with native ports, nested embedding, link labels, geometry and obstacle-avoiding Manhattan routing. Its distinction from React Flow is a richer diagram-specific object and routing layer, while the application still owns domain semantics. Paid JointJS+ adds explicit BPMN shapes, BPMN XML import/export, record shapes and many editor/export plugins. Generic JSON serialization is available in core. Automatic layout requires an additional package; DirectedGraph and MSAGL are open-source options, while other layouts are Plus offerings. A material evidence conflict matters: the repository README broadly advertises ready-to-use UML, FSA and other shapes, but version 4 release notes explicitly removed several legacy domain shape sets from core and moved them into custom demos. Current API/edition documentation therefore controls these classifications. Its extensive gallery is evidence of extensibility and reach, not native support for every pictured notation. Draftably can learn from semantic port identity, records and explicit plugin boundaries, while retaining its constrained DSL and shared rendering path. Rich toolkit features do not eliminate the work of designing portable source, deterministic layout or meaningful change comparisons.

**Selection evidence:** Fetched 2026-10-27: official repository displayed 5.4k stars and current docs advertise 180+ demo applications. These indicate longevity/ecosystem breadth, not active users or a universal popularity ranking. JJS-01/JJS-02.

Primary evidence: [JJS-01: JointJS repository](https://github.com/clientIO/joint); [JJS-02: Introduction and edition boundary](https://docs.jointjs.com/); [JJS-03: Version 4 release notes](https://docs.jointjs.com/learn/release-notes/4.0.0/); [JJS-04: Standard shapes API](https://docs.jointjs.com/api/shapes/standard/).

#### GoJS

**Evaluated scope:** GoJS 4.x core JavaScript/TypeScript library, built-in models/layouts/editor primitives; official examples and extensions are separately labeled custom.

**Edition/license boundary:** Proprietary, not open source despite public GitHub distribution. Current deployment guide permits personal non-commercial use free since September 2026; use for or by an organization, including schools/nonprofits, requires commercial licensing. Native codes refer to the licensed base, not a free OSS edition.

GoJS offers an integrated editor foundation: graph and tree models, templates, layouts, port connections, obstacle-aware routing, table panels, transactions, undo, export and interaction are built into the library. Those are native toolkit capabilities. Its numerous sequence, ER, BPMN, swimlane and statechart examples are applications built with templates, custom tools and domain rules; their existence does not establish a complete native domain metamodel. GoJS is therefore a strong reference for the cost and detail of editor behavior, but a weak reason to inflate Draftably’s diagram-family checklist. Model JSON can retain user-edited geometry and data, while two-way binding connects visual edits to the model; neither rewrites the JavaScript program. Accessibility is more substantial than a canvas-only stereotype suggests: focus navigation, virtual-pointer keyboard control and generic screen-reader announcements exist, with domain descriptions still requiring application choices. The current licensing policy adds free personal non-commercial use, but organizational use remains commercial and the library remains proprietary. For Draftably, its most transferable ideas are explicit port identity, table-aware geometry, transactional edits and robust focus behavior; importing its broad custom application surface would conflict with a small deterministic language.

**Selection evidence:** Fetched 2026-10-27: NorthwoodsSoftware/GoJS repository displayed 8.5k stars. The official sample catalog demonstrates broad maintained application examples; this establishes ecosystem breadth, not native notation or measured active users. Source GO-01.

Primary evidence: [GO-01: GoJS public distribution repository](https://github.com/NorthwoodsSoftware/GoJS); [GO-02: Deployment and licensing](https://gojs.net/latest/learn/deployment); [GO-03: Core features](https://gojs.net/latest/learn/features).

### Modeling and graph editor toolkits

#### bpmn-js

**Evaluated scope:** bpmn-js v18 browser Modeler; extensions labeled separately; current repository changelog reviewed.

**Edition/license boundary:** Source-available/free bpmn.io license with visible attribution watermark; many auxiliary packages MIT. Camunda hosted/product features excluded.

bpmn-js is a purpose-built BPMN 2.0 modeler, not a general diagram DSL. The model behind its shapes is the BPMN metamodel, serialized as BPMN XML, and editing rules constrain operations. Its palette, lanes, subprocesses, annotations, message/sequence flows, undo and SVG export therefore represent genuine domain support. This is the strongest comparator for the difference between a swimlane picture and a process model. It is also a caution against claiming that all domain depth must ship in one core: semantic diffing, additional lint rules and automatic layout are separate bpmn-io packages. A consumer still assembles the application and its execution environment. There is no basis for attributing Camunda process execution or collaboration to bpmn-js itself. The v18 accessibility work makes the canvas focusable and scopes shortcuts appropriately; it does not establish universal screen-reader compliance. For Draftably, borrow typed relationship validation and deliberate annotation behavior, while avoiding a full BPMN execution/import commitment until there is a concrete user job.

**Selection evidence:** Observed 2026-10-27: official GitHub displays approximately 9.7k stars. The official v18 announcement describes use in Camunda Modeler and its web counterpart. Repository changelog and website version banner disagree; compare v18 capabilities, not an asserted latest npm version. [BPMN-01](#bpmn-01), [BPMN-08](#bpmn-08), [BPMN-10](#bpmn-10)

Primary evidence: [BPMN-01: bpmn-js repository](https://github.com/bpmn-io/bpmn-js); [BPMN-02: bpmn-js walkthrough](https://bpmn.io/toolkit/bpmn-js/walkthrough/); [BPMN-03: bpmn.io license](https://bpmn.io/license/).

#### AntV X6

**Evaluated scope:** Current X6 3.x docs and core @antv/x6, including bundled opt-in standard plugins; layout engine separate.

**Edition/license boundary:** MIT; framework shape adapters and external layout integrations are distinct packages, not paid editions.

X6 is an SVG/HTML graph editing engine with useful low-level primitives for building domain editors. Its ports have identifiers, port groups, placements and labels; routers include orthogonal, obstacle-avoiding Manhattan and metro options. These are substantive shared capabilities even though an ER or UML editor still needs custom shapes and a domain model. The current 3.x boundary matters: common history, export, keyboard, selection and related plugins have moved into the main package, so calling them paid or separately installed capabilities would be stale. They remain opt-in modules. Conversely, the group documentation implements expand/collapse through a custom Group class and event handlers, so it should not receive native folding credit. JSON persistence stores graph cells and geometry; it is not a round trip to the JavaScript that constructed them. The main lessons for Draftably are named connection semantics, portable renderer assets and precise fallback behavior, not a rewrite onto an application-construction toolkit.

**Selection evidence:** Observed 2026-10-27: official GitHub displays approximately 6.7k stars. Current official documentation offers 3.x alongside archived 2.x/1.x, with a concrete migration guide. These are maturity/reach proxies rather than an adoption census. [X6-01](#x6-01), [X6-03](#x6-03)

Primary evidence: [X6-01: X6 repository](https://github.com/antvis/X6); [X6-02: Introduction](https://x6.antv.antgroup.com/en/tutorial/about/); [X6-03: Upgrade to 3.x](https://x6.antv.antgroup.com/en/tutorial/update/).

#### yFiles

**Evaluated scope:** yFiles for HTML 3.x Complete commercial SDK (view+layout); reference demos treated as custom code.

**Edition/license boundary:** Commercial developer/distribution license; N means native in paid Complete base, not free. VSDX export is separate add-on; PDF requires external libraries.

yFiles is the depth benchmark for a programmable diagram SDK: ports, rich labels, table structures, nested groups, graph builders, folding, filters and incremental layout all have dedicated APIs. These features are native to the evaluated commercial Complete SDK. They are not an argument for marking every gallery diagram as native domain support. The official UML demo explicitly uses custom node and label-editing implementations, and the BPMN showcase is an application assembled from example code. A particularly useful design lesson is folding: yFiles distinguishes a complete master graph from a view graph and projects edges through collapsed groups. Draftably can adopt that separation without adopting the SDK. Another is that portable output is a layered feature: SVG is direct, PNG is built on browser rasterization, PDF uses svg2pdf/jsPDF, and VSDX has a separate add-on. Its paid licensing and broad application-framework scope reduce fit for a small local DSL project, while its primitive and layout designs remain valuable research references.

**Selection evidence:** Observed 2026-10-27: vendor references identify named organizations including Honda Research Institute, Sanofi, ABB and ATLAS.ti; support resources advertise over 300 demos. These vendor-reported reach proxies are used instead of a misleading public-star comparison for a proprietary SDK. [YF-04](#yf-04), [YF-18](#yf-18)

Primary evidence: [YF-01: yFiles commercial SDK scope](https://www.yworks.com/faq?id=100006); [YF-02: yFiles features](https://docs.yworks.com/yfiles-html/dguide/features/); [YF-03: Licensing](https://docs.yfiles.com/yfiles-html/dguide/licensing/).

### Current-source corrections that affect decisions

- Mermaid now has [native swimlanes](https://mermaid.js.org/syntax/swimlanes.html), source-declared [collapsed flowchart groups](https://mermaid.js.org/syntax/flowchart.html), and [bundled/default ELK from v12](https://mermaid.js.org/config/layouts.html).
- D2 [0.9.0](https://d2lang.com/releases/0.9.0/) bundles open-source TALA. The [September 2026 announcement](https://d2lang.com/blog/tala-is-open-source/) supersedes older paid-engine comparisons. Its [nonprofit transition](https://d2lang.com/blog/d2-non-profit/) is a maintenance-context fact, not a prediction of abandonment.
- GoJS remains proprietary but [permits personal noncommercial use under its September 2026 policy](https://gojs.net/latest/learn/deployment). Organizational use is a different license boundary.
- JointJS [v4 removed several legacy domain sets from core](https://docs.jointjs.com/learn/release-notes/4.0.0/); current custom demos do not inherit the old ready-to-use claim. X6 [3.x bundles common standard plugins](https://x6.antv.antgroup.com/en/tutorial/update/), which changes its export/history classification.
- PlantUML [release notes](https://plantuml.com/changes) introduce packetdiag but conflict with the still-online chronology page. Timeline coverage remains qualified. Structurizr [local](https://docs.structurizr.com/local) supersedes archived Lite, and its [direct image export path](https://docs.structurizr.com/export/png-and-svg) carries a preview/build boundary.

These details were checked because stale edition/version assumptions would change the gap analysis. They are not reasons to adopt another runtime.

## 4. Diagram-type matrix

Each cell contains the support code and one compact primary evidence key. Full rationales and all evidence keys/URLs are in the corresponding CSV. N/P/C/E/U/? are defined above. Draftably is repeated for convenient comparison; it remains one tool. Codes measure the stated scope, not perfection or visual quality.

### Text languages: broad and compact notation

| Capability | Draftably | Mermaid | PlantUML | nomnoml |
| --- | --- | --- | --- | --- |
| Flowcharts / generic directed processes | N [DR-02](#dr-02) | N [MER-02](#mer-02) | N [PUML-06](#puml-06) | N [NOM-01](#nom-01) |
| UML activity notation | P [DR-02](#dr-02) | P [MER-02](#mer-02) | N [PUML-06](#puml-06) | P [NOM-01](#nom-01) |
| Sequence: participants, ordered messages | N [DR-04](#dr-04) | N [MER-03](#mer-03) | N [PUML-02](#puml-02) | U [NOM-01](#nom-01) |
| Sequence: fragments, activation, notes | P [DR-04](#dr-04) | N [MER-03](#mer-03) | N [PUML-02](#puml-02) | U [NOM-01](#nom-01) |
| State machines / statecharts | P [DR-02](#dr-02) | N [MER-05](#mer-05) | N [PUML-14](#puml-14) | P [NOM-01](#nom-01) |
| Class / object UML | P [DR-02](#dr-02) | N [MER-06](#mer-06) | N [PUML-03](#puml-03) | N [NOM-01](#nom-01) |
| ER / schema diagrams | P [DR-06](#dr-06) | N [MER-04](#mer-04) | N [PUML-04](#puml-04) | P [NOM-01](#nom-01) |
| ER: keys, typed fields, cardinality | P [DR-02](#dr-02) | N [MER-04](#mer-04) | N [PUML-04](#puml-04) | P [NOM-01](#nom-01) |
| Software architecture | P [DR-02](#dr-02) | N [MER-07](#mer-07) | N [PUML-07](#puml-07) | P [NOM-02](#nom-02) |
| C4 model and views | P [DR-02](#dr-02) | P [MER-08](#mer-08) | P [PUML-08](#puml-08) | P [NOM-01](#nom-01) |
| Cloud / network architecture | P [DR-02](#dr-02) | N [MER-07](#mer-07) | N [PUML-27](#puml-27) | P [NOM-01](#nom-01) |
| Swim lanes | N [DR-05](#dr-05) | N [MER-09](#mer-09) | N [PUML-06](#puml-06) | P [NOM-01](#nom-01) |
| BPMN 2.0 notation and model | P [DR-02](#dr-02) | P [MER-02](#mer-02) | P [PUML-25](#puml-25) | U [NOM-01](#nom-01) |
| Trees / hierarchies | N [DR-02](#dr-02) | N [MER-22](#mer-22) | N [PUML-01](#puml-01) | P [NOM-02](#nom-02) |
| Mind maps | P [DR-02](#dr-02) | N [MER-22](#mer-22) | N [PUML-20](#puml-20) | P [NOM-02](#nom-02) |
| Chronological timelines | U [DR-02](#dr-02) | N [MER-18](#mer-18) | P [PUML-18](#puml-18) | U [NOM-01](#nom-01) |
| Gantt / project schedules | U [DR-02](#dr-02) | N [MER-19](#mer-19) | N [PUML-19](#puml-19) | U [NOM-01](#nom-01) |
| User journeys | P [DR-02](#dr-02) | N [MER-20](#mer-20) | P [PUML-06](#puml-06) | P [NOM-02](#nom-02) |
| Requirements diagrams | P [DR-02](#dr-02) | N [MER-21](#mer-21) | P [PUML-03](#puml-03) | P [NOM-02](#nom-02) |
| Packet / bit-field diagrams | N [DR-06](#dr-06) | N [MER-10](#mer-10) | N [PUML-16](#puml-16) | U [NOM-01](#nom-01) |
| Byte / file-layout diagrams | N [DR-06](#dr-06) | P [MER-10](#mer-10) | P [PUML-17](#puml-17) | U [NOM-01](#nom-01) |
| UML component / deployment | P [DR-02](#dr-02) | P [MER-08](#mer-08) | N [PUML-07](#puml-07) | P [NOM-01](#nom-01) |
| Dependency / relationship graphs | N [DR-02](#dr-02) | N [MER-02](#mer-02) | N [PUML-03](#puml-03) | N [NOM-02](#nom-02) |
| Timing / waveform diagrams | U [DR-02](#dr-02) | U [MER-01](#mer-01) | N [PUML-22](#puml-22) | U [NOM-01](#nom-01) |
| Git / branching history | P [DR-02](#dr-02) | N [MER-25](#mer-25) | ? [PUML-01](#puml-01) | P [NOM-02](#nom-02) |
| Sankey / weighted-flow diagrams | U [DR-02](#dr-02) | N [MER-23](#mer-23) | ? [PUML-01](#puml-01) | U [NOM-01](#nom-01) |
| Kanban boards | P [DR-02](#dr-02) | N [MER-24](#mer-24) | ? [PUML-01](#puml-01) | P [NOM-02](#nom-02) |
| Wireframes / UI mockups | P [DR-02](#dr-02) | P [MER-01](#mer-01) | N [PUML-21](#puml-21) | P [NOM-02](#nom-02) |

### Text languages: graphs and architecture models

| Capability | Draftably | Graphviz | D2 | Structurizr |
| --- | --- | --- | --- | --- |
| Flowcharts / generic directed processes | N [DR-02](#dr-02) | N [GV-02](#gv-02) | N [D2-05](#d2-05) | P [STR-01](#str-01) |
| UML activity notation | P [DR-02](#dr-02) | P [GV-02](#gv-02) | P [D2-05](#d2-05) | U [STR-01](#str-01) |
| Sequence: participants, ordered messages | N [DR-04](#dr-04) | C [GV-02](#gv-02) | N [D2-02](#d2-02) | P [STR-08](#str-08) |
| Sequence: fragments, activation, notes | P [DR-04](#dr-04) | C [GV-02](#gv-02) | P [D2-02](#d2-02) | P [STR-08](#str-08) |
| State machines / statecharts | P [DR-02](#dr-02) | P [GV-02](#gv-02) | P [D2-05](#d2-05) | U [STR-01](#str-01) |
| Class / object UML | P [DR-02](#dr-02) | P [GV-03](#gv-03) | N [D2-04](#d2-04) | U [STR-01](#str-01) |
| ER / schema diagrams | P [DR-06](#dr-06) | P [GV-03](#gv-03) | N [D2-03](#d2-03) | U [STR-01](#str-01) |
| ER: keys, typed fields, cardinality | P [DR-02](#dr-02) | P [GV-03](#gv-03) | N [D2-03](#d2-03) | U [STR-01](#str-01) |
| Software architecture | P [DR-02](#dr-02) | P [GV-02](#gv-02) | P [D2-09](#d2-09) | N [STR-01](#str-01) |
| C4 model and views | P [DR-02](#dr-02) | P [GV-02](#gv-02) | P [D2-27](#d2-27) | N [STR-01](#str-01) |
| Cloud / network architecture | P [DR-02](#dr-02) | P [GV-02](#gv-02) | P [D2-06](#d2-06) | N [STR-09](#str-09) |
| Swim lanes | N [DR-05](#dr-05) | P [GV-02](#gv-02) | P [D2-22](#d2-22) | U [STR-01](#str-01) |
| BPMN 2.0 notation and model | P [DR-02](#dr-02) | C [GV-02](#gv-02) | C [D2-05](#d2-05) | U [STR-01](#str-01) |
| Trees / hierarchies | N [DR-02](#dr-02) | N [GV-05](#gv-05) | P [D2-10](#d2-10) | P [STR-01](#str-01) |
| Mind maps | P [DR-02](#dr-02) | P [GV-05](#gv-05) | P [D2-05](#d2-05) | U [STR-01](#str-01) |
| Chronological timelines | U [DR-02](#dr-02) | C [GV-02](#gv-02) | P [D2-22](#d2-22) | U [STR-01](#str-01) |
| Gantt / project schedules | U [DR-02](#dr-02) | C [GV-02](#gv-02) | C [D2-21](#d2-21) | U [STR-01](#str-01) |
| User journeys | P [DR-02](#dr-02) | C [GV-02](#gv-02) | P [D2-22](#d2-22) | U [STR-01](#str-01) |
| Requirements diagrams | P [DR-02](#dr-02) | P [GV-02](#gv-02) | P [D2-17](#d2-17) | U [STR-01](#str-01) |
| Packet / bit-field diagrams | N [DR-06](#dr-06) | C [GV-03](#gv-03) | C [D2-22](#d2-22) | U [STR-01](#str-01) |
| Byte / file-layout diagrams | N [DR-06](#dr-06) | C [GV-03](#gv-03) | C [D2-22](#d2-22) | U [STR-01](#str-01) |
| UML component / deployment | P [DR-02](#dr-02) | P [GV-02](#gv-02) | P [D2-05](#d2-05) | P [STR-01](#str-01) |
| Dependency / relationship graphs | N [DR-02](#dr-02) | N [GV-02](#gv-02) | N [D2-08](#d2-08) | N [STR-01](#str-01) |
| Timing / waveform diagrams | U [DR-02](#dr-02) | C [GV-02](#gv-02) | C [D2-21](#d2-21) | U [STR-01](#str-01) |
| Git / branching history | P [DR-02](#dr-02) | P [GV-02](#gv-02) | P [D2-08](#d2-08) | U [STR-01](#str-01) |
| Sankey / weighted-flow diagrams | U [DR-02](#dr-02) | C [GV-02](#gv-02) | C [D2-08](#d2-08) | U [STR-01](#str-01) |
| Kanban boards | P [DR-02](#dr-02) | P [GV-02](#gv-02) | P [D2-22](#d2-22) | U [STR-01](#str-01) |
| Wireframes / UI mockups | P [DR-02](#dr-02) | P [GV-03](#gv-03) | P [D2-05](#d2-05) | U [STR-01](#str-01) |

### Programmable diagram and graph libraries

| Capability | Draftably | Diagrams | Cytoscape | G6 |
| --- | --- | --- | --- | --- |
| Flowcharts / generic directed processes | N [DR-02](#dr-02) | P [DIAG-02](#diag-02) | N [CY-02](#cy-02) | N [G6-03](#g6-03) |
| UML activity notation | P [DR-02](#dr-02) | P [DIAG-02](#diag-02) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |
| Sequence: participants, ordered messages | N [DR-04](#dr-04) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| Sequence: fragments, activation, notes | P [DR-04](#dr-04) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| State machines / statecharts | P [DR-02](#dr-02) | P [DIAG-02](#diag-02) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |
| Class / object UML | P [DR-02](#dr-02) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| ER / schema diagrams | P [DR-06](#dr-06) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| ER: keys, typed fields, cardinality | P [DR-02](#dr-02) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| Software architecture | P [DR-02](#dr-02) | N [DIAG-01](#diag-01) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |
| C4 model and views | P [DR-02](#dr-02) | P [DIAG-07](#diag-07) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |
| Cloud / network architecture | P [DR-02](#dr-02) | N [DIAG-01](#diag-01) | P [CY-02](#cy-02) | P [G6-04](#g6-04) |
| Swim lanes | N [DR-05](#dr-05) | P [DIAG-04](#diag-04) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| BPMN 2.0 notation and model | P [DR-02](#dr-02) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| Trees / hierarchies | N [DR-02](#dr-02) | P [DIAG-02](#diag-02) | N [CY-02](#cy-02) | N [G6-03](#g6-03) |
| Mind maps | P [DR-02](#dr-02) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | N [G6-03](#g6-03) |
| Chronological timelines | U [DR-02](#dr-02) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | P [G6-08](#g6-08) |
| Gantt / project schedules | U [DR-02](#dr-02) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| User journeys | P [DR-02](#dr-02) | P [DIAG-02](#diag-02) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |
| Requirements diagrams | P [DR-02](#dr-02) | P [DIAG-02](#diag-02) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |
| Packet / bit-field diagrams | N [DR-06](#dr-06) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| Byte / file-layout diagrams | N [DR-06](#dr-06) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| UML component / deployment | P [DR-02](#dr-02) | P [DIAG-03](#diag-03) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |
| Dependency / relationship graphs | N [DR-02](#dr-02) | N [DIAG-03](#diag-03) | N [CY-02](#cy-02) | N [G6-03](#g6-03) |
| Timing / waveform diagrams | U [DR-02](#dr-02) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| Git / branching history | P [DR-02](#dr-02) | P [DIAG-02](#diag-02) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |
| Sankey / weighted-flow diagrams | U [DR-02](#dr-02) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| Kanban boards | P [DR-02](#dr-02) | P [DIAG-02](#diag-02) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |
| Wireframes / UI mockups | P [DR-02](#dr-02) | P [DIAG-02](#diag-02) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |

### Interactive diagram toolkits

| Capability | Draftably | React Flow | JointJS | GoJS |
| --- | --- | --- | --- | --- |
| Flowcharts / generic directed processes | N [DR-02](#dr-02) | P [RF-04](#rf-04) | N [JJS-04](#jjs-04) | N [GO-03](#go-03) |
| UML activity notation | P [DR-02](#dr-02) | P [RF-04](#rf-04) | P [JJS-19](#jjs-19) | P [GO-03](#go-03) |
| Sequence: participants, ordered messages | N [DR-04](#dr-04) | C [RF-04](#rf-04) | C [JJS-19](#jjs-19) | C [GO-13](#go-13) |
| Sequence: fragments, activation, notes | P [DR-04](#dr-04) | C [RF-04](#rf-04) | C [JJS-19](#jjs-19) | C [GO-13](#go-13) |
| State machines / statecharts | P [DR-02](#dr-02) | P [RF-04](#rf-04) | P [JJS-04](#jjs-04) | P [GO-15](#go-15) |
| Class / object UML | P [DR-02](#dr-02) | C [RF-04](#rf-04) | C [JJS-03](#jjs-03) | P [GO-18](#go-18) |
| ER / schema diagrams | P [DR-06](#dr-06) | C [RF-15](#rf-15) | C [JJS-03](#jjs-03) | P [GO-18](#go-18) |
| ER: keys, typed fields, cardinality | P [DR-02](#dr-02) | C [RF-15](#rf-15) | C [JJS-09](#jjs-09) | P [GO-18](#go-18) |
| Software architecture | P [DR-02](#dr-02) | P [RF-04](#rf-04) | P [JJS-19](#jjs-19) | P [GO-03](#go-03) |
| C4 model and views | P [DR-02](#dr-02) | P [RF-04](#rf-04) | P [JJS-19](#jjs-19) | P [GO-03](#go-03) |
| Cloud / network architecture | P [DR-02](#dr-02) | P [RF-04](#rf-04) | P [JJS-19](#jjs-19) | P [GO-03](#go-03) |
| Swim lanes | N [DR-05](#dr-05) | C [RF-06](#rf-06) | E [JJS-10](#jjs-10) | C [GO-17](#go-17) |
| BPMN 2.0 notation and model | P [DR-02](#dr-02) | C [RF-04](#rf-04) | E [JJS-10](#jjs-10) | C [GO-16](#go-16) |
| Trees / hierarchies | N [DR-02](#dr-02) | C [RF-03](#rf-03) | E [JJS-08](#jjs-08) | N [GO-05](#go-05) |
| Mind maps | P [DR-02](#dr-02) | C [RF-04](#rf-04) | C [JJS-19](#jjs-19) | C [GO-03](#go-03) |
| Chronological timelines | U [DR-02](#dr-02) | C [RF-04](#rf-04) | C [JJS-19](#jjs-19) | C [GO-03](#go-03) |
| Gantt / project schedules | U [DR-02](#dr-02) | C [RF-04](#rf-04) | C [JJS-19](#jjs-19) | C [GO-03](#go-03) |
| User journeys | P [DR-02](#dr-02) | P [RF-04](#rf-04) | P [JJS-19](#jjs-19) | P [GO-03](#go-03) |
| Requirements diagrams | P [DR-02](#dr-02) | P [RF-04](#rf-04) | P [JJS-19](#jjs-19) | P [GO-03](#go-03) |
| Packet / bit-field diagrams | N [DR-06](#dr-06) | C [RF-04](#rf-04) | C [JJS-19](#jjs-19) | C [GO-03](#go-03) |
| Byte / file-layout diagrams | N [DR-06](#dr-06) | C [RF-04](#rf-04) | C [JJS-19](#jjs-19) | C [GO-03](#go-03) |
| UML component / deployment | P [DR-02](#dr-02) | P [RF-04](#rf-04) | P [JJS-19](#jjs-19) | P [GO-03](#go-03) |
| Dependency / relationship graphs | N [DR-02](#dr-02) | N [RF-17](#rf-17) | N [JJS-15](#jjs-15) | N [GO-05](#go-05) |
| Timing / waveform diagrams | U [DR-02](#dr-02) | C [RF-04](#rf-04) | C [JJS-19](#jjs-19) | C [GO-03](#go-03) |
| Git / branching history | P [DR-02](#dr-02) | P [RF-04](#rf-04) | P [JJS-19](#jjs-19) | P [GO-03](#go-03) |
| Sankey / weighted-flow diagrams | U [DR-02](#dr-02) | C [RF-04](#rf-04) | C [JJS-19](#jjs-19) | C [GO-03](#go-03) |
| Kanban boards | P [DR-02](#dr-02) | P [RF-04](#rf-04) | P [JJS-19](#jjs-19) | P [GO-03](#go-03) |
| Wireframes / UI mockups | P [DR-02](#dr-02) | P [RF-04](#rf-04) | P [JJS-19](#jjs-19) | P [GO-03](#go-03) |

### Modeling and graph editor toolkits

| Capability | Draftably | bpmn-js | X6 | yFiles |
| --- | --- | --- | --- | --- |
| Flowcharts / generic directed processes | N [DR-02](#dr-02) | P [BPMN-02](#bpmn-02) | N [X6-02](#x6-02) | N [YF-02](#yf-02) |
| UML activity notation | P [DR-02](#dr-02) | P [BPMN-02](#bpmn-02) | P [X6-02](#x6-02) | P [YF-02](#yf-02) |
| Sequence: participants, ordered messages | N [DR-04](#dr-04) | U [BPMN-02](#bpmn-02) | C [X6-02](#x6-02) | C [YF-01](#yf-01) |
| Sequence: fragments, activation, notes | P [DR-04](#dr-04) | U [BPMN-02](#bpmn-02) | C [X6-02](#x6-02) | C [YF-01](#yf-01) |
| State machines / statecharts | P [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | P [X6-02](#x6-02) | P [YF-02](#yf-02) |
| Class / object UML | P [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | C [X6-02](#x6-02) | P [YF-07](#yf-07) |
| ER / schema diagrams | P [DR-06](#dr-06) | U [BPMN-02](#bpmn-02) | C [X6-02](#x6-02) | P [YF-07](#yf-07) |
| ER: keys, typed fields, cardinality | P [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | C [X6-04](#x6-04) | P [YF-07](#yf-07) |
| Software architecture | P [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | P [X6-04](#x6-04) | P [YF-02](#yf-02) |
| C4 model and views | P [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | P [X6-02](#x6-02) | P [YF-02](#yf-02) |
| Cloud / network architecture | P [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | P [X6-02](#x6-02) | P [YF-02](#yf-02) |
| Swim lanes | N [DR-05](#dr-05) | N [BPMN-10](#bpmn-10) | C [X6-02](#x6-02) | P [YF-07](#yf-07) |
| BPMN 2.0 notation and model | P [DR-02](#dr-02) | N [BPMN-02](#bpmn-02) | C [X6-02](#x6-02) | P [YF-13](#yf-13) |
| Trees / hierarchies | N [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | C [X6-14](#x6-14) | N [YF-02](#yf-02) |
| Mind maps | P [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | C [X6-02](#x6-02) | C [YF-01](#yf-01) |
| Chronological timelines | U [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | C [X6-02](#x6-02) | C [YF-01](#yf-01) |
| Gantt / project schedules | U [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | C [X6-02](#x6-02) | C [YF-01](#yf-01) |
| User journeys | P [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | P [X6-02](#x6-02) | P [YF-02](#yf-02) |
| Requirements diagrams | P [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | P [X6-02](#x6-02) | P [YF-02](#yf-02) |
| Packet / bit-field diagrams | N [DR-06](#dr-06) | U [BPMN-02](#bpmn-02) | C [X6-02](#x6-02) | C [YF-01](#yf-01) |
| Byte / file-layout diagrams | N [DR-06](#dr-06) | U [BPMN-02](#bpmn-02) | C [X6-02](#x6-02) | C [YF-01](#yf-01) |
| UML component / deployment | P [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | P [X6-02](#x6-02) | P [YF-02](#yf-02) |
| Dependency / relationship graphs | N [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | N [X6-02](#x6-02) | N [YF-02](#yf-02) |
| Timing / waveform diagrams | U [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | C [X6-02](#x6-02) | C [YF-01](#yf-01) |
| Git / branching history | P [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | P [X6-02](#x6-02) | P [YF-02](#yf-02) |
| Sankey / weighted-flow diagrams | U [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | C [X6-02](#x6-02) | C [YF-01](#yf-01) |
| Kanban boards | P [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | P [X6-02](#x6-02) | P [YF-02](#yf-02) |
| Wireframes / UI mockups | P [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | P [X6-02](#x6-02) | P [YF-02](#yf-02) |


### Family interpretation notes

- Native basic sequence does not imply advanced fragments/activation. D2’s spans and groups are partial relative to typed control fragments; Structurizr dynamic graphs are a different presentation.
- Native compartments/field ports may be family-scoped. Mermaid class/ER compartments and D2 SQL row endpoints receive N for those exact capabilities; Draftably cell nodes remain P for general semantic ports.
- Lifecycle, activity, requirements, journey, C4-like and Git-like sketches receive P where ordinary graph primitives suffice. That does not claim their domain model or standard notation is implemented.
- The generic flowchart row credits native geometric process-graph construction; UML activity and BPMN have separate rows. Dependency graphs do not require automatic extraction or layout to be N.
- Diagram time means chronological time. Draftably’s layout Timeline and G6’s temporal Timebar are not Gantt scheduling.
- Additional current catalogs include use-case, event-modeling and other specialized Mermaid families. The matrix already extends the brief with timing, Git, Sankey, Kanban and wireframes. Catalog presence is recorded as breadth context, not a proposal to chase every new family.

## 5. Feature matrix and commonality

Each cell contains the support code and one compact primary evidence key. Full rationales and all evidence keys/URLs are in the corresponding CSV. N/P/C/E/U/? are defined above. Draftably is repeated for convenient comparison; it remains one tool. Codes measure the stated scope, not perfection or visual quality.

### Text languages: broad and compact notation

| Capability | Draftably | Mermaid | PlantUML | nomnoml |
| --- | --- | --- | --- | --- |
| Dedicated diagram text DSL | N [DR-02](#dr-02) | N [MER-01](#mer-01) | N [PUML-01](#puml-01) | N [NOM-01](#nom-01) |
| Built-in shape vocabulary | N [DR-02](#dr-02) | N [MER-02](#mer-02) | N [PUML-03](#puml-03) | N [NOM-01](#nom-01) |
| Icon assets / catalogs | U [DR-02](#dr-02) | N [MER-02](#mer-02) | N [PUML-08](#puml-08) | U [NOM-01](#nom-01) |
| Images in diagrams | U [DR-02](#dr-02) | N [MER-02](#mer-02) | N [PUML-12](#puml-12) | U [NOM-01](#nom-01) |
| Rich / formatted labels | P [DR-02](#dr-02) | N [MER-02](#mer-02) | N [PUML-12](#puml-12) | P [NOM-02](#nom-02) |
| Attached notes / annotations | P [DR-02](#dr-02) | N [MER-03](#mer-03) | N [PUML-02](#puml-02) | N [NOM-01](#nom-01) |
| Mathematical label notation | U [DR-02](#dr-02) | P [MER-12](#mer-12) | N [PUML-13](#puml-13) | U [NOM-01](#nom-01) |
| Arrowhead / endpoint vocabulary | P [DR-02](#dr-02) | N [MER-02](#mer-02) | N [PUML-02](#puml-02) | N [NOM-01](#nom-01) |
| Relationship multiplicity / cardinality | P [DR-02](#dr-02) | N [MER-04](#mer-04) | N [PUML-03](#puml-03) | P [NOM-01](#nom-01) |
| Named / semantic connection ports | P [DR-02](#dr-02) | P [MER-07](#mer-07) | N [PUML-07](#puml-07) | U [NOM-01](#nom-01) |
| Nested containers / groups | N [DR-02](#dr-02) | N [MER-02](#mer-02) | N [PUML-07](#puml-07) | N [NOM-02](#nom-02) |
| Cell / compartment structures | N [DR-06](#dr-06) | N [MER-04](#mer-04) | N [PUML-03](#puml-03) | N [NOM-01](#nom-01) |
| Automatic layout | N [DR-02](#dr-02) | N [MER-14](#mer-14) | N [PUML-11](#puml-11) | N [NOM-03](#nom-03) |
| Obstacle-aware / orthogonal routing | N [DR-03](#dr-03) | P [MER-14](#mer-14) | P [PUML-11](#puml-11) | P [NOM-02](#nom-02) |
| Layout constraints / placement hints | N [DR-02](#dr-02) | P [MER-02](#mer-02) | N [PUML-11](#puml-11) | P [NOM-02](#nom-02) |
| Incremental / position-preserving layout | P [DR-03](#dr-03) | ? [MER-14](#mer-14) | ? [PUML-11](#puml-11) | ? [NOM-03](#nom-03) |
| Themes / reusable styling | N [DR-09](#dr-09) | N [MER-11](#mer-11) | N [PUML-26](#puml-26) | N [NOM-02](#nom-02) |
| Named views / filtering | P [DR-02](#dr-02) | P [MER-02](#mer-02) | P [PUML-03](#puml-03) | C [NOM-04](#nom-04) |
| Expand / collapse | P [DR-10](#dr-10) | N [MER-02](#mer-02) | P [PUML-03](#puml-03) | C [NOM-04](#nom-04) |
| Change marks with semantic status | N [DR-07](#dr-07) | P [MER-02](#mer-02) | P [PUML-03](#puml-03) | P [NOM-02](#nom-02) |
| Aligned before / after semantic panels | N [DR-07](#dr-07) | C [MER-15](#mer-15) | C [PUML-10](#puml-10) | C [NOM-04](#nom-04) |
| Compare layout / routing candidates | N [DR-11](#dr-11) | C [MER-14](#mer-14) | C [PUML-11](#puml-11) | C [NOM-04](#nom-04) |
| SVG export | N [DR-08](#dr-08) | N [MER-15](#mer-15) | N [PUML-15](#puml-15) | N [NOM-04](#nom-04) |
| PNG export | N [DR-12](#dr-12) | N [MER-16](#mer-16) | N [PUML-10](#puml-10) | N [NOM-05](#nom-05) |
| PDF export | U [DR-08](#dr-08) | N [MER-16](#mer-16) | N [PUML-10](#puml-10) | C [NOM-04](#nom-04) |
| Source embedded in exported image | N [DR-12](#dr-12) | ? [MER-16](#mer-16) | N [PUML-10](#puml-10) | N [NOM-05](#nom-05) |
| Structured import / export | P [DR-02](#dr-02) | P [MER-15](#mer-15) | P [PUML-10](#puml-10) | P [NOM-04](#nom-04) |
| Reuse / includes / definitions | U [DR-02](#dr-02) | P [MER-02](#mer-02) | N [PUML-09](#puml-09) | N [NOM-02](#nom-02) |
| Data-driven programmatic generation | C [DR-02](#dr-02) | C [MER-15](#mer-15) | N [PUML-09](#puml-09) | C [NOM-04](#nom-04) |
| Syntax / structural validation | N [DR-02](#dr-02) | N [MER-15](#mer-15) | N [PUML-10](#puml-10) | N [NOM-05](#nom-05) |
| Domain semantics / constraints | P [DR-02](#dr-02) | P [MER-04](#mer-04) | P [PUML-03](#puml-03) | P [NOM-01](#nom-01) |
| Document / keyboard / screen-reader support | P [DR-08](#dr-08) | P [MER-13](#mer-13) | P [PUML-15](#puml-15) | ? [NOM-05](#nom-05) |
| Visual edits round-trip to canonical source | N [DR-11](#dr-11) | C [MER-15](#mer-15) | U [PUML-02](#puml-02) | U [NOM-04](#nom-04) |
| Local CLI / automation | N [DR-08](#dr-08) | N [MER-16](#mer-16) | N [PUML-10](#puml-10) | N [NOM-03](#nom-03) |
| Local / offline operation | N [DR-01](#dr-01) | N [MER-15](#mer-15) | N [PUML-10](#puml-10) | N [NOM-02](#nom-02) |
| Interactive editor primitives | N [DR-10](#dr-10) | P [MER-02](#mer-02) | P [PUML-15](#puml-15) | C [NOM-05](#nom-05) |
| Undo / redo | N [DR-12](#dr-12) | C [MER-15](#mer-15) | C [PUML-02](#puml-02) | C [NOM-04](#nom-04) |

### Text languages: graphs and architecture models

| Capability | Draftably | Graphviz | D2 | Structurizr |
| --- | --- | --- | --- | --- |
| Dedicated diagram text DSL | N [DR-02](#dr-02) | N [GV-02](#gv-02) | N [D2-01](#d2-01) | N [STR-01](#str-01) |
| Built-in shape vocabulary | N [DR-02](#dr-02) | N [GV-03](#gv-03) | N [D2-05](#d2-05) | N [STR-15](#str-15) |
| Icon assets / catalogs | U [DR-02](#dr-02) | P [GV-09](#gv-09) | N [D2-06](#d2-06) | N [STR-09](#str-09) |
| Images in diagrams | U [DR-02](#dr-02) | N [GV-09](#gv-09) | N [D2-06](#d2-06) | N [STR-01](#str-01) |
| Rich / formatted labels | P [DR-02](#dr-02) | N [GV-03](#gv-03) | N [D2-07](#d2-07) | P [STR-01](#str-01) |
| Attached notes / annotations | P [DR-02](#dr-02) | P [GV-03](#gv-03) | N [D2-02](#d2-02) | P [STR-01](#str-01) |
| Mathematical label notation | U [DR-02](#dr-02) | C [GV-03](#gv-03) | N [D2-07](#d2-07) | U [STR-01](#str-01) |
| Arrowhead / endpoint vocabulary | P [DR-02](#dr-02) | N [GV-04](#gv-04) | N [D2-08](#d2-08) | P [STR-01](#str-01) |
| Relationship multiplicity / cardinality | P [DR-02](#dr-02) | P [GV-04](#gv-04) | N [D2-08](#d2-08) | P [STR-01](#str-01) |
| Named / semantic connection ports | P [DR-02](#dr-02) | N [GV-02](#gv-02) | N [D2-03](#d2-03) | U [STR-01](#str-01) |
| Nested containers / groups | N [DR-02](#dr-02) | N [GV-02](#gv-02) | N [D2-09](#d2-09) | N [STR-01](#str-01) |
| Cell / compartment structures | N [DR-06](#dr-06) | N [GV-03](#gv-03) | N [D2-03](#d2-03) | U [STR-01](#str-01) |
| Automatic layout | N [DR-02](#dr-02) | N [GV-05](#gv-05) | N [D2-10](#d2-10) | N [STR-05](#str-05) |
| Obstacle-aware / orthogonal routing | N [DR-03](#dr-03) | P [GV-07](#gv-07) | N [D2-10](#d2-10) | P [STR-05](#str-05) |
| Layout constraints / placement hints | N [DR-02](#dr-02) | N [GV-10](#gv-10) | N [D2-11](#d2-11) | P [STR-01](#str-01) |
| Incremental / position-preserving layout | P [DR-03](#dr-03) | P [GV-08](#gv-08) | P [D2-11](#d2-11) | P [STR-01](#str-01) |
| Themes / reusable styling | N [DR-09](#dr-09) | P [GV-02](#gv-02) | N [D2-18](#d2-18) | N [STR-15](#str-15) |
| Named views / filtering | P [DR-02](#dr-02) | N [GV-11](#gv-11) | N [D2-15](#d2-15) | N [STR-07](#str-07) |
| Expand / collapse | P [DR-10](#dr-10) | C [GV-02](#gv-02) | P [D2-15](#d2-15) | ? [STR-06](#str-06) |
| Change marks with semantic status | N [DR-07](#dr-07) | P [GV-02](#gv-02) | P [D2-14](#d2-14) | P [STR-15](#str-15) |
| Aligned before / after semantic panels | N [DR-07](#dr-07) | C [GV-10](#gv-10) | C [D2-13](#d2-13) | ? [STR-06](#str-06) |
| Compare layout / routing candidates | N [DR-11](#dr-11) | C [GV-12](#gv-12) | C [D2-10](#d2-10) | ? [STR-05](#str-05) |
| SVG export | N [DR-08](#dr-08) | N [GV-06](#gv-06) | N [D2-20](#d2-20) | N [STR-06](#str-06) |
| PNG export | N [DR-12](#dr-12) | N [GV-06](#gv-06) | N [D2-20](#d2-20) | N [STR-06](#str-06) |
| PDF export | U [DR-08](#dr-08) | N [GV-06](#gv-06) | N [D2-20](#d2-20) | ? [STR-06](#str-06) |
| Source embedded in exported image | N [DR-12](#dr-12) | ? [GV-06](#gv-06) | ? [D2-20](#d2-20) | ? [STR-06](#str-06) |
| Structured import / export | P [DR-02](#dr-02) | N [GV-13](#gv-13) | P [D2-21](#d2-21) | N [STR-04](#str-04) |
| Reuse / includes / definitions | U [DR-02](#dr-02) | P [GV-02](#gv-02) | N [D2-16](#d2-16) | N [STR-10](#str-10) |
| Data-driven programmatic generation | C [DR-02](#dr-02) | N [GV-12](#gv-12) | N [D2-21](#d2-21) | N [STR-01](#str-01) |
| Syntax / structural validation | N [DR-02](#dr-02) | N [GV-02](#gv-02) | N [D2-23](#d2-23) | N [STR-16](#str-16) |
| Domain semantics / constraints | P [DR-02](#dr-02) | U [GV-02](#gv-02) | P [D2-03](#d2-03) | N [STR-11](#str-11) |
| Document / keyboard / screen-reader support | P [DR-08](#dr-08) | P [GV-17](#gv-17) | ? [D2-19](#d2-19) | P [STR-06](#str-06) |
| Visual edits round-trip to canonical source | N [DR-11](#dr-11) | C [GV-01](#gv-01) | C [D2-21](#d2-21) | P [STR-04](#str-04) |
| Local CLI / automation | N [DR-08](#dr-08) | N [GV-12](#gv-12) | N [D2-23](#d2-23) | N [STR-16](#str-16) |
| Local / offline operation | N [DR-01](#dr-01) | N [GV-12](#gv-12) | N [D2-23](#d2-23) | N [STR-03](#str-03) |
| Interactive editor primitives | N [DR-10](#dr-10) | P [GV-17](#gv-17) | P [D2-19](#d2-19) | P [STR-05](#str-05) |
| Undo / redo | N [DR-12](#dr-12) | C [GV-02](#gv-02) | C [D2-21](#d2-21) | ? [STR-05](#str-05) |

### Programmable diagram and graph libraries

| Capability | Draftably | Diagrams | Cytoscape | G6 |
| --- | --- | --- | --- | --- |
| Dedicated diagram text DSL | N [DR-02](#dr-02) | P [DIAG-02](#diag-02) | U [CY-02](#cy-02) | U [G6-10](#g6-10) |
| Built-in shape vocabulary | N [DR-02](#dr-02) | P [DIAG-03](#diag-03) | N [CY-02](#cy-02) | N [G6-04](#g6-04) |
| Icon assets / catalogs | U [DR-02](#dr-02) | N [DIAG-01](#diag-01) | P [CY-02](#cy-02) | P [G6-04](#g6-04) |
| Images in diagrams | U [DR-02](#dr-02) | N [DIAG-06](#diag-06) | N [CY-02](#cy-02) | N [G6-04](#g6-04) |
| Rich / formatted labels | P [DR-02](#dr-02) | P [DIAG-05](#diag-05) | P [CY-02](#cy-02) | P [G6-04](#g6-04) |
| Attached notes / annotations | P [DR-02](#dr-02) | P [DIAG-02](#diag-02) | P [CY-02](#cy-02) | P [G6-04](#g6-04) |
| Mathematical label notation | U [DR-02](#dr-02) | C [DIAG-06](#diag-06) | C [CY-02](#cy-02) | C [G6-04](#g6-04) |
| Arrowhead / endpoint vocabulary | P [DR-02](#dr-02) | P [DIAG-05](#diag-05) | N [CY-02](#cy-02) | N [G6-02](#g6-02) |
| Relationship multiplicity / cardinality | P [DR-02](#dr-02) | P [DIAG-05](#diag-05) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |
| Named / semantic connection ports | P [DR-02](#dr-02) | P [DIAG-05](#diag-05) | P [CY-02](#cy-02) | N [G6-04](#g6-04) |
| Nested containers / groups | N [DR-02](#dr-02) | N [DIAG-04](#diag-04) | N [CY-02](#cy-02) | N [G6-10](#g6-10) |
| Cell / compartment structures | N [DR-06](#dr-06) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-04](#g6-04) |
| Automatic layout | N [DR-02](#dr-02) | N [DIAG-09](#diag-09) | N [CY-02](#cy-02) | N [G6-03](#g6-03) |
| Obstacle-aware / orthogonal routing | N [DR-03](#dr-03) | P [DIAG-10](#diag-10) | P [CY-02](#cy-02) | N [G6-05](#g6-05) |
| Layout constraints / placement hints | N [DR-02](#dr-02) | P [DIAG-02](#diag-02) | P [CY-02](#cy-02) | P [G6-03](#g6-03) |
| Incremental / position-preserving layout | P [DR-03](#dr-03) | C [DIAG-10](#diag-10) | P [CY-02](#cy-02) | P [G6-03](#g6-03) |
| Themes / reusable styling | N [DR-09](#dr-09) | N [DIAG-10](#diag-10) | N [CY-02](#cy-02) | N [G6-09](#g6-09) |
| Named views / filtering | P [DR-02](#dr-02) | C [DIAG-02](#diag-02) | N [CY-02](#cy-02) | P [G6-08](#g6-08) |
| Expand / collapse | P [DR-10](#dr-10) | U [DIAG-02](#diag-02) | E [CY-05](#cy-05) | N [G6-06](#g6-06) |
| Change marks with semantic status | N [DR-07](#dr-07) | P [DIAG-05](#diag-05) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |
| Aligned before / after semantic panels | N [DR-07](#dr-07) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| Compare layout / routing candidates | N [DR-11](#dr-11) | C [DIAG-02](#diag-02) | C [CY-02](#cy-02) | C [G6-03](#g6-03) |
| SVG export | N [DR-08](#dr-08) | N [DIAG-02](#diag-02) | E [CY-04](#cy-04) | E [G6-11](#g6-11) |
| PNG export | N [DR-12](#dr-12) | N [DIAG-02](#diag-02) | N [CY-02](#cy-02) | N [G6-12](#g6-12) |
| PDF export | U [DR-08](#dr-08) | N [DIAG-02](#diag-02) | C [CY-04](#cy-04) | C [G6-13](#g6-13) |
| Source embedded in exported image | N [DR-12](#dr-12) | ? [DIAG-08](#diag-08) | ? [CY-02](#cy-02) | ? [G6-12](#g6-12) |
| Structured import / export | P [DR-02](#dr-02) | P [DIAG-02](#diag-02) | N [CY-02](#cy-02) | N [G6-10](#g6-10) |
| Reuse / includes / definitions | U [DR-02](#dr-02) | N [DIAG-03](#diag-03) | N [CY-02](#cy-02) | N [G6-02](#g6-02) |
| Data-driven programmatic generation | C [DR-02](#dr-02) | N [DIAG-03](#diag-03) | N [CY-02](#cy-02) | N [G6-10](#g6-10) |
| Syntax / structural validation | N [DR-02](#dr-02) | P [DIAG-10](#diag-10) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |
| Domain semantics / constraints | P [DR-02](#dr-02) | C [DIAG-01](#diag-01) | C [CY-02](#cy-02) | C [G6-10](#g6-10) |
| Document / keyboard / screen-reader support | P [DR-08](#dr-08) | ? [DIAG-02](#diag-02) | ? [CY-02](#cy-02) | ? [G6-02](#g6-02) |
| Visual edits round-trip to canonical source | N [DR-11](#dr-11) | U [DIAG-08](#diag-08) | P [CY-02](#cy-02) | P [G6-10](#g6-10) |
| Local CLI / automation | N [DR-08](#dr-08) | N [DIAG-09](#diag-09) | E [CY-02](#cy-02) | C [G6-02](#g6-02) |
| Local / offline operation | N [DR-01](#dr-01) | N [DIAG-08](#diag-08) | N [CY-02](#cy-02) | N [G6-01](#g6-01) |
| Interactive editor primitives | N [DR-10](#dr-10) | U [DIAG-08](#diag-08) | P [CY-02](#cy-02) | N [G6-02](#g6-02) |
| Undo / redo | N [DR-12](#dr-12) | P [DIAG-08](#diag-08) | E [CY-06](#cy-06) | N [G6-07](#g6-07) |

### Interactive diagram toolkits

| Capability | Draftably | React Flow | JointJS | GoJS |
| --- | --- | --- | --- | --- |
| Dedicated diagram text DSL | N [DR-02](#dr-02) | U [RF-17](#rf-17) | U [JJS-15](#jjs-15) | U [GO-05](#go-05) |
| Built-in shape vocabulary | N [DR-02](#dr-02) | P [RF-04](#rf-04) | N [JJS-04](#jjs-04) | N [GO-24](#go-24) |
| Icon assets / catalogs | U [DR-02](#dr-02) | C [RF-04](#rf-04) | P [JJS-19](#jjs-19) | P [GO-21](#go-21) |
| Images in diagrams | U [DR-02](#dr-02) | C [RF-04](#rf-04) | N [JJS-04](#jjs-04) | N [GO-21](#go-21) |
| Rich / formatted labels | P [DR-02](#dr-02) | P [RF-04](#rf-04) | N [JJS-20](#jjs-20) | P [GO-22](#go-22) |
| Attached notes / annotations | P [DR-02](#dr-02) | P [RF-04](#rf-04) | E [JJS-19](#jjs-19) | P [GO-05](#go-05) |
| Mathematical label notation | U [DR-02](#dr-02) | C [RF-04](#rf-04) | C [JJS-18](#jjs-18) | C [GO-21](#go-21) |
| Arrowhead / endpoint vocabulary | P [DR-02](#dr-02) | N [RF-14](#rf-14) | N [JJS-22](#jjs-22) | N [GO-08](#go-08) |
| Relationship multiplicity / cardinality | P [DR-02](#dr-02) | P [RF-14](#rf-14) | P [JJS-20](#jjs-20) | P [GO-08](#go-08) |
| Named / semantic connection ports | P [DR-02](#dr-02) | N [RF-05](#rf-05) | N [JJS-05](#jjs-05) | N [GO-06](#go-06) |
| Nested containers / groups | N [DR-02](#dr-02) | N [RF-06](#rf-06) | N [JJS-06](#jjs-06) | N [GO-07](#go-07) |
| Cell / compartment structures | N [DR-06](#dr-06) | C [RF-15](#rf-15) | E [JJS-09](#jjs-09) | N [GO-18](#go-18) |
| Automatic layout | N [DR-02](#dr-02) | C [RF-03](#rf-03) | E [JJS-08](#jjs-08) | N [GO-04](#go-04) |
| Obstacle-aware / orthogonal routing | N [DR-03](#dr-03) | C [RF-03](#rf-03) | N [JJS-07](#jjs-07) | N [GO-08](#go-08) |
| Layout constraints / placement hints | N [DR-02](#dr-02) | P [RF-06](#rf-06) | P [JJS-05](#jjs-05) | P [GO-04](#go-04) |
| Incremental / position-preserving layout | P [DR-03](#dr-03) | P [RF-17](#rf-17) | P [JJS-15](#jjs-15) | P [GO-05](#go-05) |
| Themes / reusable styling | N [DR-09](#dr-09) | N [RF-13](#rf-13) | P [JJS-18](#jjs-18) | N [GO-19](#go-19) |
| Named views / filtering | P [DR-02](#dr-02) | P [RF-17](#rf-17) | P [JJS-06](#jjs-06) | P [GO-05](#go-05) |
| Expand / collapse | P [DR-10](#dr-10) | E [RF-12](#rf-12) | C [JJS-06](#jjs-06) | N [GO-03](#go-03) |
| Change marks with semantic status | N [DR-07](#dr-07) | P [RF-17](#rf-17) | P [JJS-15](#jjs-15) | P [GO-05](#go-05) |
| Aligned before / after semantic panels | N [DR-07](#dr-07) | C [RF-17](#rf-17) | C [JJS-15](#jjs-15) | C [GO-05](#go-05) |
| Compare layout / routing candidates | N [DR-11](#dr-11) | C [RF-03](#rf-03) | C [JJS-08](#jjs-08) | C [GO-04](#go-04) |
| SVG export | N [DR-08](#dr-08) | C [RF-10](#rf-10) | E [JJS-13](#jjs-13) | N [GO-10](#go-10) |
| PNG export | N [DR-12](#dr-12) | C [RF-10](#rf-10) | E [JJS-14](#jjs-14) | N [GO-09](#go-09) |
| PDF export | U [DR-08](#dr-08) | C [RF-10](#rf-10) | E [JJS-21](#jjs-21) | C [GO-09](#go-09) |
| Source embedded in exported image | N [DR-12](#dr-12) | C [RF-08](#rf-08) | C [JJS-13](#jjs-13) | C [GO-10](#go-10) |
| Structured import / export | P [DR-02](#dr-02) | N [RF-08](#rf-08) | N [JJS-15](#jjs-15) | N [GO-05](#go-05) |
| Reuse / includes / definitions | U [DR-02](#dr-02) | N [RF-04](#rf-04) | N [JJS-19](#jjs-19) | N [GO-05](#go-05) |
| Data-driven programmatic generation | C [DR-02](#dr-02) | N [RF-17](#rf-17) | N [JJS-15](#jjs-15) | N [GO-05](#go-05) |
| Syntax / structural validation | N [DR-02](#dr-02) | P [RF-09](#rf-09) | P [JJS-05](#jjs-05) | N [GO-20](#go-20) |
| Domain semantics / constraints | P [DR-02](#dr-02) | C [RF-09](#rf-09) | C [JJS-11](#jjs-11) | C [GO-20](#go-20) |
| Document / keyboard / screen-reader support | P [DR-08](#dr-08) | N [RF-07](#rf-07) | C [JJS-18](#jjs-18) | N [GO-12](#go-12) |
| Visual edits round-trip to canonical source | N [DR-11](#dr-11) | P [RF-08](#rf-08) | P [JJS-15](#jjs-15) | P [GO-05](#go-05) |
| Local CLI / automation | N [DR-08](#dr-08) | C [RF-16](#rf-16) | C [JJS-15](#jjs-15) | C [GO-23](#go-23) |
| Local / offline operation | N [DR-01](#dr-01) | N [RF-01](#rf-01) | N [JJS-01](#jjs-01) | N [GO-01](#go-01) |
| Interactive editor primitives | N [DR-10](#dr-10) | N [RF-04](#rf-04) | N [JJS-02](#jjs-02) | N [GO-03](#go-03) |
| Undo / redo | N [DR-12](#dr-12) | E [RF-11](#rf-11) | E [JJS-16](#jjs-16) | N [GO-11](#go-11) |

### Modeling and graph editor toolkits

| Capability | Draftably | bpmn-js | X6 | yFiles |
| --- | --- | --- | --- | --- |
| Dedicated diagram text DSL | N [DR-02](#dr-02) | U [BPMN-02](#bpmn-02) | U [X6-10](#x6-10) | U [YF-01](#yf-01) |
| Built-in shape vocabulary | N [DR-02](#dr-02) | N [BPMN-02](#bpmn-02) | N [X6-06](#x6-06) | N [YF-02](#yf-02) |
| Icon assets / catalogs | U [DR-02](#dr-02) | P [BPMN-02](#bpmn-02) | P [X6-06](#x6-06) | P [YF-02](#yf-02) |
| Images in diagrams | U [DR-02](#dr-02) | C [BPMN-04](#bpmn-04) | N [X6-06](#x6-06) | N [YF-11](#yf-11) |
| Rich / formatted labels | P [DR-02](#dr-02) | P [BPMN-10](#bpmn-10) | P [X6-12](#x6-12) | N [YF-15](#yf-15) |
| Attached notes / annotations | P [DR-02](#dr-02) | N [BPMN-10](#bpmn-10) | P [X6-06](#x6-06) | P [YF-02](#yf-02) |
| Mathematical label notation | U [DR-02](#dr-02) | C [BPMN-04](#bpmn-04) | C [X6-12](#x6-12) | C [YF-15](#yf-15) |
| Arrowhead / endpoint vocabulary | P [DR-02](#dr-02) | N [BPMN-02](#bpmn-02) | N [X6-13](#x6-13) | N [YF-16](#yf-16) |
| Relationship multiplicity / cardinality | P [DR-02](#dr-02) | P [BPMN-02](#bpmn-02) | P [X6-02](#x6-02) | P [YF-12](#yf-12) |
| Named / semantic connection ports | P [DR-02](#dr-02) | P [BPMN-02](#bpmn-02) | N [X6-04](#x6-04) | N [YF-06](#yf-06) |
| Nested containers / groups | N [DR-02](#dr-02) | N [BPMN-02](#bpmn-02) | N [X6-07](#x6-07) | N [YF-02](#yf-02) |
| Cell / compartment structures | N [DR-06](#dr-06) | U [BPMN-02](#bpmn-02) | C [X6-06](#x6-06) | N [YF-07](#yf-07) |
| Automatic layout | N [DR-02](#dr-02) | E [BPMN-07](#bpmn-07) | C [X6-14](#x6-14) | N [YF-02](#yf-02) |
| Obstacle-aware / orthogonal routing | N [DR-03](#dr-03) | P [BPMN-02](#bpmn-02) | N [X6-05](#x6-05) | N [YF-02](#yf-02) |
| Layout constraints / placement hints | N [DR-02](#dr-02) | P [BPMN-02](#bpmn-02) | P [X6-04](#x6-04) | N [YF-06](#yf-06) |
| Incremental / position-preserving layout | P [DR-03](#dr-03) | P [BPMN-02](#bpmn-02) | P [X6-10](#x6-10) | N [YF-05](#yf-05) |
| Themes / reusable styling | N [DR-09](#dr-09) | N [BPMN-04](#bpmn-04) | P [X6-06](#x6-06) | P [YF-17](#yf-17) |
| Named views / filtering | P [DR-02](#dr-02) | P [BPMN-10](#bpmn-10) | P [X6-07](#x6-07) | N [YF-08](#yf-08) |
| Expand / collapse | P [DR-10](#dr-10) | N [BPMN-10](#bpmn-10) | C [X6-07](#x6-07) | N [YF-08](#yf-08) |
| Change marks with semantic status | N [DR-07](#dr-07) | E [BPMN-05](#bpmn-05) | P [X6-10](#x6-10) | P [YF-02](#yf-02) |
| Aligned before / after semantic panels | N [DR-07](#dr-07) | C [BPMN-05](#bpmn-05) | C [X6-10](#x6-10) | C [YF-05](#yf-05) |
| Compare layout / routing candidates | N [DR-11](#dr-11) | C [BPMN-07](#bpmn-07) | C [X6-14](#x6-14) | C [YF-02](#yf-02) |
| SVG export | N [DR-08](#dr-08) | N [BPMN-09](#bpmn-09) | N [X6-09](#x6-09) | N [YF-11](#yf-11) |
| PNG export | N [DR-12](#dr-12) | C [BPMN-09](#bpmn-09) | N [X6-09](#x6-09) | C [YF-11](#yf-11) |
| PDF export | U [DR-08](#dr-08) | C [BPMN-09](#bpmn-09) | C [X6-09](#x6-09) | C [YF-11](#yf-11) |
| Source embedded in exported image | N [DR-12](#dr-12) | ? [BPMN-09](#bpmn-09) | ? [X6-09](#x6-09) | ? [YF-11](#yf-11) |
| Structured import / export | P [DR-02](#dr-02) | N [BPMN-02](#bpmn-02) | N [X6-10](#x6-10) | N [YF-02](#yf-02) |
| Reuse / includes / definitions | U [DR-02](#dr-02) | P [BPMN-02](#bpmn-02) | N [X6-06](#x6-06) | N [YF-02](#yf-02) |
| Data-driven programmatic generation | C [DR-02](#dr-02) | N [BPMN-02](#bpmn-02) | N [X6-10](#x6-10) | N [YF-10](#yf-10) |
| Syntax / structural validation | N [DR-02](#dr-02) | N [BPMN-02](#bpmn-02) | P [X6-11](#x6-11) | P [YF-02](#yf-02) |
| Domain semantics / constraints | P [DR-02](#dr-02) | N [BPMN-02](#bpmn-02) | C [X6-11](#x6-11) | C [YF-01](#yf-01) |
| Document / keyboard / screen-reader support | P [DR-08](#dr-08) | P [BPMN-08](#bpmn-08) | P [X6-03](#x6-03) | P [YF-02](#yf-02) |
| Visual edits round-trip to canonical source | N [DR-11](#dr-11) | N [BPMN-02](#bpmn-02) | P [X6-10](#x6-10) | P [YF-02](#yf-02) |
| Local CLI / automation | N [DR-08](#dr-08) | E [BPMN-06](#bpmn-06) | C [X6-02](#x6-02) | C [YF-01](#yf-01) |
| Local / offline operation | N [DR-01](#dr-01) | N [BPMN-02](#bpmn-02) | N [X6-02](#x6-02) | N [YF-01](#yf-01) |
| Interactive editor primitives | N [DR-10](#dr-10) | N [BPMN-02](#bpmn-02) | N [X6-11](#x6-11) | N [YF-02](#yf-02) |
| Undo / redo | N [DR-12](#dr-12) | N [BPMN-02](#bpmn-02) | N [X6-08](#x6-08) | N [YF-02](#yf-02) |


### Cross-feature caveats

A pair of N cells does not promise every combination. [Graphviz orthogonal routing](https://graphviz.org/docs/attrs/splines/) does not support ports or dot edge labels; Diagrams inherits that limitation. D2 SQL-row connections depend on ELK/TALA. Family-scoped ports/compartments are explicit. React Flow/X6 integrate external node layout through application code; purpose-built bpmn-auto-layout and JointJS layout packages receive E. Generic PDF converter pipelines receive C, not E. yFiles direct SVG is N while its browser rasterization example for PNG is C. The inspected [cytoscape-svg extension](https://github.com/kinimesi/cytoscape-svg) is GPL-3.0, distinct from the MIT core.

Recoverable source is stricter than identity metadata: GoJS SVG IDs alone do not qualify. nomnoml’s source recovery is native for SVG only. Native JSON/model round trips in toolkits are not equivalent to rewriting application source or preserving a hand-authored DSL. Free labels receive P for informal multiplicity/annotation sketches wherever that same fallback is credited to Draftably.

### Frequency with explicit denominators

Every full-set frequency below has denominator **15 alternatives**, excluding Draftably. The dedicated-text-language subset has denominator **6**, including Graphviz and Structurizr. N is counted separately from P, C and E; unknowns remain unknown. The code counts in each row sum to 15. P is not half an N, and C is not evidence of native domain support or demand.

#### Diagram families

| Capability | All 15: count by support code | Native in six text languages |
| --- | --- | --- |
| Flowcharts / generic directed processes | N 11, P 4, C 0, E 0, U 0, ? 0 | 5/6 |
| UML activity notation | N 1, P 13, C 0, E 0, U 1, ? 0 | 1/6 |
| Sequence: participants, ordered messages | N 3, P 1, C 9, E 0, U 2, ? 0 | 3/6 |
| Sequence: fragments, activation, notes | N 2, P 2, C 9, E 0, U 2, ? 0 | 2/6 |
| State machines / statecharts | N 2, P 11, C 0, E 0, U 2, ? 0 | 2/6 |
| Class / object UML | N 4, P 3, C 6, E 0, U 2, ? 0 | 4/6 |
| ER / schema diagrams | N 3, P 4, C 6, E 0, U 2, ? 0 | 3/6 |
| ER: keys, typed fields, cardinality | N 3, P 4, C 6, E 0, U 2, ? 0 | 3/6 |
| Software architecture | N 4, P 10, C 0, E 0, U 1, ? 0 | 3/6 |
| C4 model and views | N 1, P 13, C 0, E 0, U 1, ? 0 | 1/6 |
| Cloud / network architecture | N 4, P 10, C 0, E 0, U 1, ? 0 | 3/6 |
| Swim lanes | N 3, P 5, C 5, E 1, U 1, ? 0 | 2/6 |
| BPMN 2.0 notation and model | N 1, P 3, C 8, E 1, U 2, ? 0 | 0/6 |
| Trees / hierarchies | N 7, P 4, C 2, E 1, U 1, ? 0 | 3/6 |
| Mind maps | N 3, P 3, C 7, E 0, U 2, ? 0 | 2/6 |
| Chronological timelines | N 1, P 3, C 8, E 0, U 3, ? 0 | 1/6 |
| Gantt / project schedules | N 2, P 0, C 10, E 0, U 3, ? 0 | 2/6 |
| User journeys | N 1, P 11, C 1, E 0, U 2, ? 0 | 1/6 |
| Requirements diagrams | N 1, P 12, C 0, E 0, U 2, ? 0 | 1/6 |
| Packet / bit-field diagrams | N 2, P 0, C 10, E 0, U 3, ? 0 | 2/6 |
| Byte / file-layout diagrams | N 0, P 2, C 10, E 0, U 3, ? 0 | 0/6 |
| UML component / deployment | N 1, P 13, C 0, E 0, U 1, ? 0 | 1/6 |
| Dependency / relationship graphs | N 14, P 0, C 0, E 0, U 1, ? 0 | 6/6 |
| Timing / waveform diagrams | N 1, P 0, C 10, E 0, U 4, ? 0 | 1/6 |
| Git / branching history | N 1, P 11, C 0, E 0, U 2, ? 1 | 1/6 |
| Sankey / weighted-flow diagrams | N 1, P 0, C 10, E 0, U 3, ? 1 | 1/6 |
| Kanban boards | N 1, P 11, C 0, E 0, U 2, ? 1 | 1/6 |
| Wireframes / UI mockups | N 1, P 12, C 0, E 0, U 2, ? 0 | 1/6 |

#### Features

| Capability | All 15: count by support code | Native in six text languages |
| --- | --- | --- |
| Dedicated diagram text DSL | N 6, P 1, C 0, E 0, U 8, ? 0 | 6/6 |
| Built-in shape vocabulary | N 13, P 2, C 0, E 0, U 0, ? 0 | 6/6 |
| Icon assets / catalogs | N 5, P 8, C 1, E 0, U 1, ? 0 | 4/6 |
| Images in diagrams | N 12, P 0, C 2, E 0, U 1, ? 0 | 5/6 |
| Rich / formatted labels | N 6, P 9, C 0, E 0, U 0, ? 0 | 4/6 |
| Attached notes / annotations | N 5, P 9, C 0, E 1, U 0, ? 0 | 4/6 |
| Mathematical label notation | N 2, P 1, C 10, E 0, U 2, ? 0 | 2/6 |
| Arrowhead / endpoint vocabulary | N 13, P 2, C 0, E 0, U 0, ? 0 | 5/6 |
| Relationship multiplicity / cardinality | N 3, P 12, C 0, E 0, U 0, ? 0 | 3/6 |
| Named / semantic connection ports | N 9, P 4, C 0, E 0, U 2, ? 0 | 3/6 |
| Nested containers / groups | N 15, P 0, C 0, E 0, U 0, ? 0 | 6/6 |
| Cell / compartment structures | N 7, P 0, C 5, E 1, U 2, ? 0 | 5/6 |
| Automatic layout | N 11, P 0, C 2, E 2, U 0, ? 0 | 6/6 |
| Obstacle-aware / orthogonal routing | N 6, P 8, C 1, E 0, U 0, ? 0 | 1/6 |
| Layout constraints / placement hints | N 4, P 11, C 0, E 0, U 0, ? 0 | 3/6 |
| Incremental / position-preserving layout | N 1, P 10, C 1, E 0, U 0, ? 3 | 0/6 |
| Themes / reusable styling | N 11, P 4, C 0, E 0, U 0, ? 0 | 5/6 |
| Named views / filtering | N 5, P 8, C 2, E 0, U 0, ? 0 | 3/6 |
| Expand / collapse | N 5, P 2, C 4, E 2, U 1, ? 1 | 1/6 |
| Change marks with semantic status | N 0, P 14, C 0, E 1, U 0, ? 0 | 0/6 |
| Aligned before / after semantic panels | N 0, P 0, C 14, E 0, U 0, ? 1 | 0/6 |
| Compare layout / routing candidates | N 0, P 0, C 14, E 0, U 0, ? 1 | 0/6 |
| SVG export | N 11, P 0, C 1, E 3, U 0, ? 0 | 6/6 |
| PNG export | N 11, P 0, C 3, E 1, U 0, ? 0 | 6/6 |
| PDF export | N 5, P 0, C 8, E 1, U 0, ? 1 | 4/6 |
| Source embedded in exported image | N 2, P 0, C 3, E 0, U 0, ? 10 | 2/6 |
| Structured import / export | N 10, P 5, C 0, E 0, U 0, ? 0 | 2/6 |
| Reuse / includes / definitions | N 12, P 3, C 0, E 0, U 0, ? 0 | 4/6 |
| Data-driven programmatic generation | N 13, P 0, C 2, E 0, U 0, ? 0 | 4/6 |
| Syntax / structural validation | N 8, P 7, C 0, E 0, U 0, ? 0 | 6/6 |
| Domain semantics / constraints | N 2, P 4, C 8, E 0, U 1, ? 0 | 1/6 |
| Document / keyboard / screen-reader support | N 2, P 7, C 1, E 0, U 0, ? 5 | 0/6 |
| Visual edits round-trip to canonical source | N 1, P 8, C 3, E 0, U 3, ? 0 | 0/6 |
| Local CLI / automation | N 7, P 0, C 6, E 2, U 0, ? 0 | 6/6 |
| Local / offline operation | N 15, P 0, C 0, E 0, U 0, ? 0 | 6/6 |
| Interactive editor primitives | N 7, P 6, C 1, E 0, U 1, ? 0 | 0/6 |
| Undo / redo | N 5, P 1, C 5, E 3, U 0, ? 1 | 0/6 |

## 6. What the coverage means for Draftably

### The common gaps, in numbers

The feature matrix counts native endpoint/arrowhead vocabularies in **13/15** alternatives and native named or field-specific ports in **9/15**. Draftably has a single directed head and side/cell attachment, so richer endpoint meaning is a common, concrete gap. These counts include family-scoped capabilities such as SQL-row or deployment ports; they do not imply a universal port model in every tool.

Notes have **5/15 native** implementations, **1/15 identified extension** and **9/15 partial** label/node approximations. All of the tools can help explain a drawing, but automatic attachment and source persistence are the meaningful depth test. Basic automatic layout is native in **11/15**, with two integrations and two purpose-built extensions; Draftably already belongs to the native group and should improve specific quality failures before adding engines.

Advanced ER notation is native in **3/15** and advanced sequence in **2/15**. These are concentrated strengths of dedicated diagram languages, not universal toolkit functions. They are still high-value candidates because Draftably already serves schema and interaction jobs. Full BPMN has **1/15 native** comparator plus **1/15 extension**; that concentration supports studying the specialist instead of treating BPMN as routine parity work.

No inspected alternative base establishes the same aligned semantic before/after panel contract: this row contains **0/15 N, 14/15 C and 1/15 unknown**. That is evidence for protecting Draftably's integrated workflow, not proof that no third-party application offers it. Recoverable source in images is positively established for **2/15** alternatives, while **10/15** remain unknown and three require custom work. Never turn those unknowns into an exclusivity claim.

All counts derive from the immediately preceding matrices and the CSV records. They are comparison-set frequencies, not market demand or market share.

### Read frequency through the product’s jobs

Commonality is useful for discovering expectations: users bring assumptions about attached notes, relationship ends, rich labels and reusable styling from other tools. It is poor evidence that every small diagram language needs a calendar engine, a complete UML metamodel or an application builder. Native breadth is concentrated in the large text renderers. Graph toolkits frequently offer C-level feasibility with strong native primitives; treating their demos as turnkey diagram support would inflate almost every category.

The meaningful gap is often **depth within a job Draftably already serves**. A sequence diagram that cannot express alternatives must put its most important behavior into labels. A schema drawing without multiplicity leaves relationship meaning ambiguous. A note without attachment can drift when content changes. A before panel that reuses a new field value can tell the wrong story even when it looks orderly. Those are stronger reasons to build than a competitor’s long family menu.

### Four kinds of gap

| Gap kind | Strategic interpretation |
| --- | --- |
| Shared primitive | Endpoint markers, typed field rows, named ports, attached annotations and portable symbols improve several existing families. Prefer these when they can share measurement, routing, source and editing code. |
| Notation depth | Sequence fragments/activation and ER cardinality add meaning to already native layouts or useful approximations. They have a bounded user job and concrete proof cases. |
| Workflow | Complete comparison deltas, version-faithful panels, explicit capability diagnostics, accessibility and eventual structural views strengthen review and human/agent handoff. |
| New breadth | BPMN, full statecharts, full UML, scheduling and mathematical/chart families require additional semantic commitments. Defer unless a specific repeated job changes the cost/value balance. |

### Preserve the distinctive combination

**One readable source with an honest visual editor.** Do not add a feature that appears editable but silently disappears from `.draft`. Introduce model fields, parser/formatter handling, translation, canonical geometry and export together, or make a temporary read-only boundary explicit. The current rejection behavior is better than an undocumented loss of intent. [DR-02](#dr-02), [DR-11](#dr-11), [DR-12](#dr-12)

**Deterministic outputs with explicit human choices.** Rich labels and assets need shared measurement; new connection endpoints need shared geometry; views need a stated layout policy. Preserve the distinction between soft hints, exact pins and transient interaction. Do not replace source constraints with hidden browser state. [DR-03](#dr-03), [DR-10](#dr-10), [DR-14](#dr-14)

**Review as a first-class job.** Stable IDs, visible changes, common positions and source-bearing outputs already work together. Improve their truthfulness before adding numerous surface notations. Upstream code analysis, selecting repository lenses and posting review artifacts belong to the surrounding workflow described by the owner, not to a new Draftably analysis backend. [DR-07](#dr-07), [DR-08](#dr-08), [DR-16](#dr-16)

**A compact line language.** Reuse `node`, `group`, `edge`, existing layouts and named IDs. Add explicit attributes and a few justified declarations rather than a collection of incompatible arrow grammars, imported language interpreters or embedded scripting. This is consistent with the supplied primitive intent. [DR-14](#dr-14), [DR-15](#dr-15)

## 7. Ranked capability bets

These are Strategy judgments, not observed demand estimates or engineering quotations. Scores use five ordinal dimensions, each 1–5: **J** repeated job value in the supplied examples/owner intent; **B** breadth across Draftably families; **F** fit with local source, deterministic geometry and human/agent editing; **L** dependency leverage; **S** smallest-slice clarity. Their sum is a transparent comparison aid out of 25. Complexity and quality risk are separately rated 1–5, where higher means harder/riskier. A one-point difference is not statistically meaningful. Build order also respects dependencies.

| Rank and disposition | Value and judgment | Cost/risk and next boundary |
| --- | --- | --- |
| **BET-01 — Build: comparison fidelity** | J5 B5 F5 L5 S5 = **25/25**. Protect a real review job and stop new semantic fields from becoming invisible changes. | Complexity **3/5**, risk **3/5**. The 3/5 estimate applies to the first detection/diagnostic slice. Version-faithful old/new values and moved-group geometry are a later, potentially higher-risk design step. |
| **BET-02 — Build: relationship ends and field rows** | J5 B5 F5 L5 S4 = **24/25**. Improve schemas, architecture, dependency and class-like drawings through shared primitives. | Complexity **3/5**, risk **3/5**. Ship endpoint vocabulary first, then retained field metadata/cardinality. Named ports are a later slice, not a prerequisite for all ER value. |
| **BET-03 — Build: sequence depth** | J5 B3 F5 L3 S4 = **20/25**. Explain alternatives, repetition and processing intervals in a family already supported. | Complexity **4/5**, risk **4/5**. Notes and bounded alternatives first; nesting/activation later. Defer full interaction/UML conformance. |
| **BET-04 — Build: portable annotations and symbols** | J4 B5 F5 L4 S4 = **22/25**. Add the explanatory context and recognizable symbols currently forced into labels or browser-only state. | Complexity **3/5**, risk **4/5**. A small measured text subset, anchored notes and bundled symbols first. External images need an asset/embedding contract and coordination with existing work. |
| **BET-05 — Explore: named structural views** | J4 B4 F5 L3 S2 = **18/25**. One model could support audience-specific architecture and review views. | Complexity **5/5**, risk **5/5**. Prove pruning/boundary/geometry rules before committing to syntax or multi-file reuse. |

BET-03 is ranked ahead of BET-04 despite the ordinal sum because it closes a direct, already-established interaction job and has a narrower initial behavioral proof. BET-04’s annotation slice can ship before sequence fragments because it is a dependency. These are a portfolio and dependency order, not a numeric backlog sort.

The detailed bet document includes **one runnable competitor example, one baseline-compatible approximation and one explicitly unimplemented `.draft` proposal for every bet**. BET-01 intentionally proposes no new source syntax in its first slice: a behavior correction should not require users to learn a new grammar.

### Dependency and delivery sequence

1. **Stage A — Define truth before expanding meaning.** Create comparison fixtures for omitted fields, a source capability inventory and explicit comparison policies. Return useful diagnostics for unsupported historical differences. Establish semantic versus presentation-only fields. This is BET-01’s bounded first release.
2. **Stage B — Add shared expressive primitives.** Add source/target endpoint markers, measured endpoint labels and the first anchored-note primitive. Integrate retained metadata into comparison immediately. Use ER and architecture examples to test cross-family usefulness. This joins BET-02 with the small dependency slice of BET-04.
3. **Stage C — Close the two strongest notation jobs.** Add typed field rows/cardinality and sequence alternatives, then activation intervals if the first proof stays legible. Preserve the current line grammar, identity and route contracts. Extend docs, examples and agent skill along with each feature.
4. **Stage D — Prove views and portable assets separately.** Explore structural view projection on the same model. Resolve embedded asset extraction before general external images. Neither experiment should become a prerequisite for the small earlier releases.

No calendar estimate is given: the packet does not expose available engineering time, branch state or runtime measurements. Each stage is a reviewable outcome with a stopping condition. Codex should shape one smallest slice, run the repository’s documented checks and inspect visual fixtures, then reassess.

## 8. Dispositions for the wider opportunity set

| ID and disposition | Recommendation and one-line reason |
| --- | --- |
| **BET-01 — Build** | Complete comparison detection and truthful version rendering; protect review trust before adding metadata. |
| **BET-02 — Build** | Add shared endpoints and field semantics; they improve several current families at moderate scope. |
| **BET-03 — Build** | Deepen sequence notation; the current native layout already supplies most of the structural base. |
| **BET-04 — Build** | Add portable notes, restrained rich text and bundled symbols; these reduce common label workarounds. |
| **BET-05 — Explore** | Prototype named structural views; boundary edges, pins and comparison alignment need a coherent contract. |
| **REC-06 — Explore** | Lightweight state notation on the generic graph after endpoint work; prove initial/final and guarded transitions without promising full statecharts. |
| **REC-07 — Explore** | External/local image assets after resolving source-bearing export and extraction, coordinating the existing rich-node initiative. |
| **REC-08 — Explore** | Simple named definitions or local includes only after repeated multi-view duplication is demonstrated; define IDs and source-edit ownership first. |
| **REC-09 — Explore** | Optional PDF output as a narrow export convenience if publication demand appears; it is lower leverage than semantic gaps. |
| **REC-10 — Build as acceptance criteria** | Keyboard access, descriptive exports and non-color status meaning for new primitives; validate concrete behavior without unsupported compliance claims. |
| **REC-11 — Defer** | Full BPMN 2.0 metamodel/import/execution semantics; a specialized ecosystem already handles a much larger commitment. |
| **REC-12 — Defer** | Full UML/statechart conformance and exhaustive notation families; add shared primitives and a few specific jobs before standards breadth. |
| **REC-13 — Defer** | Gantt, calendar/timing scheduling and project management; they introduce time semantics unrelated to the current core loop. |
| **REC-14 — Defer** | Journey scoring, requirements traceability semantics and Kanban workflow models; generic drawings remain useful until a repeated owner job appears. |
| **REC-15 — Defer** | Sankey, extensive mathematical labels and general statistical charts; these are specialized rendering/data commitments with weak current evidence of need. |
| **REC-16 — Avoid** | A React Flow or other framework rewrite merely to match examples; the source-backed SolidJS editor is already a strategic asset. |
| **REC-17 — Avoid** | An embedded general programming language, arbitrary HTML or unbounded plugin execution in `.draft`; these complicate deterministic measurement, validation and round trips. |
| **REC-18 — Avoid** | Enterprise collaboration or repository-analysis backends for this scope; they are not justified by the personal local workflow or the owner’s integration boundary. |
| **REC-19 — Avoid** | DOT/BPMN/PlantUML import as a prerequisite to expression improvements; import creates a large semantic and round-trip promise and DOT import is explicitly outside existing primitive intent. |
| **REC-20 — Defer** | A comprehensive provider-icon collection; start with a small stable symbol vocabulary and an asset contract instead of a catalog-maintenance project. |
| **REC-21 — Defer** | Additional layout engines as a coverage response; improve quality on concrete fixtures before expanding an already substantial engine menu. |

“Avoid” applies to the proposed next strategy and the stated motivation, not to every possible future circumstance. A concrete user job can change the decision. None of these dispositions authorizes implementation in this research mission.

## 9. Uncertainty, risks and open Design questions

### What is firmly checked

The parser and implementation establish the baseline’s notation, fields, source limits, source/editor mismatch and comparison keys. Tests establish what the supplied test suite asserts, including geometry and export expectations. Current primary documentation establishes competitor capability boundaries and edition/version changes. The matrices preserve unknowns where evidence did not establish a feature. These are stronger grounds than a README feature list, but they do not replace execution.

### What remains a judgment or needs a proof

- The bet rankings reflect the supplied owner jobs and examples, not interviews or telemetry. A strong preference for schema work, sequence work or audience views could change their order.
- More expressive semantics increase label size, port congestion and visual density. Reuse does not make the layout problem free. Each proposed primitive needs a small stress fixture and a before/after quality assessment.
- Comparison truth and common geometry sometimes conflict. A moved group or changed table span may need two shapes, a shared stable frame, or an explicit exception. Do not claim both perfect historical layout and identical positions without defining the rule.
- A source-backed view may exclude a pinned object, hide the destination of a relationship or remove an ancestor. These are model-projection decisions before they are user-interface controls.
- Rich text, SVG assets, fonts and source-bearing exports need one reproducible measurement and packaging contract. A local file path alone is not a portable image.
- Some official documentation is ahead of released packages or lags source. The profiles name observed conflicts, especially version/edition changes. Do not convert a current `main` capability into a guarantee about an older installation.
- No latency, memory, rendering-quality superiority, market share or total implementation estimate was measured. Existing benchmark descriptions remain descriptions, not results of this mission.

### Immediate Design questions

| Bet | Question to resolve in Design mode |
| --- | --- |
| BET-01 | Which fields change diagram meaning, which change presentation, and how should an aligned before panel preserve old values and old group membership? |
| BET-02 | Should endpoint/cardinality metadata stay fully generic, with entity/field roles as optional helpers, or should a small validated schema role be introduced immediately? |
| BET-03 | Can existing `phase` declarations grow into bounded alternatives without making phase membership ambiguous, and what is the smallest useful nesting rule? |
| BET-04 | Which visible text/annotation subset can be measured identically in browser and CLI, and what must be embedded to make an exported asset self-contained? |
| BET-05 | Should a structural view preserve positions from the full model, recompute a compact layout, or make that choice explicit per view? |

The immediate next action is to shape BET-01’s field-policy and comparison-fixture slice against the exact baseline, then inspect the existing rich-node work before dividing BET-02/BET-04 implementation. Codex can integrate this research and run the repository gates. This mission supplies the decision and the evidence; it does not change the application.


## 10. Source index

All external sources are primary documentation, official repositories, official package metadata or named extension repositories. Dates are observation dates. Repositories and docs can move after verification. Source keys are stable across the report and CSVs. The source index contains 263 external evidence records covering 261 distinct primary URLs, plus 17 baseline evidence bundles. Counts describe research coverage, not independent corroboration.

### Exact Draftably packet evidence

#### DR-01

**Product and architecture.** Local TypeScript/SolidJS diagram editor, pure shared DSL compiler and CLI; existing engines and source workflow.

Paths: `AGENTS.md`, `README.md`, `package.json`, `docs/ARCHITECTURE.md`.

#### DR-02

**Exhaustive DSL grammar and model.** Accepted statements, shapes, fields, domain limitations and source limits.

Paths: `src/dsl/syntax.ts`, `docs/DSL.md`.

Symbols: `DslShape, DSL_SHAPES, Algorithm, ENGINES, ModelObject, ModelEdge, parseModel`.

#### DR-03

**Compiler and layout refinements.** Deterministic geometry, engines, constraints, routing channels, conflict diagnostics.

Paths: `src/dsl/compile.ts`, `src/dsl/channels.ts`, `src/dsl/conflicts.ts`, `src/dsl/frame.ts`.

Symbols: `compile, compileModel, engineArrangement, layoutPass, refine, staleStays, planChannels, findConflicts`.

#### DR-04

**Sequence implementation and proof cases.** Native ordered messages, lifelines, self loops, phases and participant bands; absent fragments/activations/notes.

Paths: `src/dsl/compile.ts`, `src/dsl/syntax.ts`, `tests/sequence.test.ts`, `examples/login-sequence.draft`.

Symbols: `sequenced, phase parsing`.

#### DR-05

**Lane implementation and proof cases.** Native equal-length swim lanes and global process ranks, without BPMN semantics.

Paths: `src/dsl/lanes.ts`, `src/dsl/compile.ts`, `tests/lanes.test.ts`, `examples/support-lanes.draft`.

Symbols: `swimLanes`.

#### DR-06

**Cell, bit and byte implementation.** Touching cells, typed-looking table approximation, span/unit layouts and cell anchors.

Paths: `src/dsl/cells.ts`, `src/dsl/compile.ts`, `tests/cells.test.ts`, `examples/billing-schema.draft`, `examples/tcp-header.draft`, `examples/png-file.draft`.

Symbols: `arrangeCells, arrangeUnits, cell layout compilation`.

#### DR-07

**Change comparison implementation.** Native change marks and stable-ID comparison; limited field equality and moved-group caveat.

Paths: `src/dsl/compare.ts`, `src/model/status.ts`, `tests/compare.test.ts`, `examples/checkout-change.draft`.

Symbols: `objectKey, edgeKey, compareDetailed, compareSources`.

#### DR-08

**SVG and aligned panel rendering.** SVG exports, shared positions/routes across semantic panels, state grid and CLI option boundaries.

Paths: `src/cli/svg.ts`, `src/cli/main.ts`, `tests/compare.test.ts`, `tests/states.test.ts`.

Symbols: `renderSvg, statesSvg, compare command, inspect command`.

#### DR-09

**Emphasis and appearance.** Named emphasis states, geometric stability, themes and non-color status signals.

Paths: `src/model/status.ts`, `src/model/appearance.ts`, `src/dsl/syntax.ts`, `tests/states.test.ts`, `examples/emphasis.draft`, `examples/theme-proof.draft`.

Symbols: `withState, Model.appearance.states`.

#### DR-10

**Editor model and route primitives.** Editor shape superset, side attachment, automatic routing, cells as endpoints, projection.

Paths: `src/model/types.ts`, `src/model/routes.ts`, `src/dsl/project.ts`.

Symbols: `ShapeKind, portPoint, cellEnds, computeRoutes, drawRoutes, messageRoute, projectScene, canonicalGeometry`.

#### DR-11

**Source-backed editing.** Supported visual edits, comment retention, durable arrangements, explicit rejection of unsupported source edits.

Paths: `src/dsl/translate.ts`, `src/dsl/source-edits.ts`, `src/dsl/layout-edits.ts`, `tests/translate.test.ts`.

Symbols: `rejectUnsupported, translateEdit, anchorSurroundings, reflowGroup, movedOutsideEdit, setLayoutRecipe, writeArrangement`.

#### DR-12

**File sessions and source-bearing images.** Native own-format JSON/SVG, source embedded in PNG/SVG, image insertion in standalone editor, revisions/undo/conflicts.

Paths: `src/state/files.ts`, `src/state/file-session.ts`, `src/cli/main.ts`, `tests/embed.test.ts`.

Symbols: `projectScene use in file sessions; image import and source extract command`.

#### DR-13

**Validation and test scope.** Syntax/structural and geometry checks; tests inspected but not executed; no accessibility audit or optimal-layout guarantee.

Paths: `tests/dsl.test.ts`, `docs/CHECKS.md`, `src/dsl/conflicts.ts`, `src/cli/main.ts`.

#### DR-14

**Product quality and authoring contract.** Readable local source, predictable geometry, short routes, edit stability, modest visual vocabulary, agent workflow.

Paths: `docs/intent/diagram-quality/FEEL.md`, `skills/draftably/SKILL.md`, `docs/intent/diagram-dsl/intent-brief.md`.

#### DR-15

**Primitive and structure intent.** Reuse node/group/edge/layout rather than separate mini-languages; planned rich-node work; historical scope versus shipped cells/sequence/lanes.

Paths: `docs/intent/diagram-primitives/intent-brief.md`, `docs/intent/diagram-primitives/shape-brief.md`, `docs/intent/diagram-primitives/implementation-plan.md`, `docs/intent/diagram-structure/intent-brief.md`, `docs/intent/diagram-structure/options.md`, `docs/intent/diagram-structure/shape-brief.md`, `docs/intent/diagram-structure/implementation-plan.md`.

#### DR-16

**Comparison, emphasis and file-layout plans.** Owner review jobs and upstream analysis boundary; old plans contain features now implemented.

Paths: `docs/intent/diagram-comparisons/research.md`, `docs/intent/diagram-comparisons/gap-analysis.md`, `docs/intent/diagram-emphasis/intent-brief.md`, `docs/intent/diagram-emphasis/shape-brief.md`, `docs/intent/diagram-emphasis/implementation-plan.md`, `docs/intent/diagram-dsl/shape-brief.md`, `docs/intent/diagram-dsl/implementation-plan.md`, `docs/intent/layout-in-files/plan.md`.

#### DR-17

**Remaining supplied examples.** Real communication jobs and generic graph approximations; labels are not domain semantics.

Paths: `examples/aws-vpc-network.draft`, `examples/checkout.draft`, `examples/ci-cd-pipeline.draft`, `examples/data-lakehouse.draft`, `examples/hexagonal-billing.draft`, `examples/incident-response.draft`, `examples/kubernetes-cluster.draft`, `examples/monorepo-packages.draft`, `examples/multi-region-failover.draft`, `examples/observability-stack.draft`, `examples/order-lifecycle.draft`, `examples/order-pipeline.draft`, `examples/order-saga.draft`, `examples/prompt-request.draft`, `examples/rag-assistant.draft`, `examples/support-triage.draft`, `examples/web-app-components.draft`.

### Mermaid sources

#### MER-01

[Mermaid introduction / current family catalog](https://mermaid.js.org/intro/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Current full library catalog; site reports 12.2.0.

#### MER-02

[Flowcharts syntax](https://mermaid.js.org/syntax/flowchart.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Shapes, icon/image syntax, labels, groups, collapsed subgraphs, direction constraints.

#### MER-03

[Sequence diagrams](https://mermaid.js.org/syntax/sequenceDiagram.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Participants, activation, notes, alt/opt/loop/par/critical/break.

#### MER-04

[Entity relationship diagrams](https://mermaid.js.org/syntax/entityRelationshipDiagram.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Typed attributes, PK/FK/UK, crow-foot cardinality, identifying relationships.

#### MER-05

[State diagrams](https://mermaid.js.org/syntax/stateDiagram.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: States, transitions, composite states, fork/join notation.

#### MER-06

[Class diagrams](https://mermaid.js.org/syntax/classDiagram.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Classes, fields, methods, UML relationship glyphs.

#### MER-07

[Architecture diagrams](https://mermaid.js.org/syntax/architecture.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Services/resources/groups/junctions; architecture-beta and icon vocabulary.

#### MER-08

[C4 diagrams](https://mermaid.js.org/syntax/c4.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Experimental five C4 diagram syntaxes; style limitations.

#### MER-09

[Swimlanes diagrams](https://mermaid.js.org/syntax/swimlanes.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: First-class responsibility lanes since v11.16.0; evolving syntax.

#### MER-10

[Packet diagrams](https://mermaid.js.org/syntax/packet.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Native bit ranges, relative field sizes, rows.

#### MER-11

[Theme configuration](https://mermaid.js.org/config/theming.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Site and per-diagram themes and customization.

#### MER-12

[Math configuration](https://mermaid.js.org/config/math.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: KaTeX mathematical labels; diagram/runtime restrictions.

#### MER-13

[Accessibility options](https://mermaid.js.org/config/accessibility.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: accTitle/accDescr produce SVG title/desc with ARIA.

#### MER-14

[Layouts](https://mermaid.js.org/config/layouts.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: ELK bundled and default for listed families from v12.0; alternatives.

#### MER-15

[Usage and API](https://mermaid.js.org/config/usage.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Browser library, source-driven render, parse validation API.

#### MER-16

[Mermaid CLI repository](https://github.com/mermaid-js/mermaid-cli). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: mmdc SVG/PNG/PDF, icons, Node API, containers.

#### MER-17

[Mermaid repository](https://github.com/mermaid-js/mermaid). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: MIT core; approximately 90.9k stars observed.

#### MER-18

[Timeline syntax](https://mermaid.js.org/syntax/timeline.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Chronological event-period notation; experimental icon integration.

#### MER-19

[Gantt syntax](https://mermaid.js.org/syntax/gantt.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Dates, dependencies, exclusions, milestones.

#### MER-20

[User journey syntax](https://mermaid.js.org/syntax/userJourney.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Task scores and actors by section.

#### MER-21

[Requirements syntax](https://mermaid.js.org/syntax/requirementDiagram.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Requirements/elements/relationships following SysML 1.6 notation.

#### MER-22

[Mindmap syntax](https://mermaid.js.org/syntax/mindmap.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Indentation-based mind maps.

#### MER-23

[Sankey syntax](https://mermaid.js.org/syntax/sankey.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Weighted flow from three-column CSV, experimental.

#### MER-24

[Kanban syntax](https://mermaid.js.org/syntax/kanban.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Columns/tasks/metadata.

#### MER-25

[GitGraph syntax](https://mermaid.js.org/syntax/gitgraph.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Commit/branch/checkout/merge notation.

### PlantUML sources

#### PUML-01

[PlantUML overview](https://plantuml.com/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Current family catalog and source-to-render purpose.

#### PUML-02

[Sequence syntax](https://plantuml.com/sequence-diagram). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Fragments, notes, activation, timing/teoz options.

#### PUML-03

[Class syntax](https://plantuml.com/class-diagram). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: UML class/member/relationship/multiplicity notation; filtering.

#### PUML-04

[Information engineering](https://plantuml.com/ie-diagram). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Crow-foot relationships, entity alias, mandatory attributes.

#### PUML-05

[Chen ER](https://plantuml.com/er-diagram). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Typed keys, composite/derived/multivalued attributes, participation, EER.

#### PUML-06

[Activity syntax](https://plantuml.com/activity-diagram-beta). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Control-flow branches/loops/forks and swimlanes.

#### PUML-07

[Deployment syntax](https://plantuml.com/deployment-diagram). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Nested architecture shapes and port/portin/portout.

#### PUML-08

[Standard library](https://plantuml.com/stdlib). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Bundled C4, AWS/Azure/Kubernetes/icon libraries; third-party origin.

#### PUML-09

[Preprocessing](https://plantuml.com/preprocessing). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Includes, variables, procedures/functions and data generation.

#### PUML-10

[Command line](https://plantuml.com/command-line). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: CLI, exports, source metadata extraction, validation flags, selective interchange.

#### PUML-11

[Layout engines](https://plantuml.com/layout-engines). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Graphviz/Smetana/VizJs/ELK and routing/layout caveats.

#### PUML-12

[Creole](https://plantuml.com/creole). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Rich labels, tables and images.

#### PUML-13

[ASCII math](https://plantuml.com/ascii-math). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Mathematical notation support.

#### PUML-14

[State syntax](https://plantuml.com/state-diagram). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Statechart notation, hierarchy and transitions.

#### PUML-15

[SVG output](https://plantuml.com/svg). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: SVG generation, interactive SVG, title/description options.

#### PUML-16

[Changes](https://plantuml.com/changes). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Packetdiag added February 2026; chronology temporarily removed.

#### PUML-17

[Packetdiag package API](https://plantuml.github.io/plantuml/javadoc/net/sourceforge/plantuml/packetdiag/package-summary.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Built-in bit/field packet layout model and indicator.

#### PUML-18

[Chronology documentation](https://plantuml.com/chronology-diagram). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Chronology syntax still documented despite removal changelog.

#### PUML-19

[Gantt syntax](https://plantuml.com/gantt-diagram). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Scheduling dates, durations and dependencies.

#### PUML-20

[Mindmap syntax](https://plantuml.com/mindmap-diagram). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Native hierarchical mindmap language.

#### PUML-21

[Salt wireframes](https://plantuml.com/salt). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Dedicated UI mockup grammar.

#### PUML-22

[Timing syntax](https://plantuml.com/timing-diagram). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Native timing/waveform notation.

#### PUML-23

[Repository](https://github.com/plantuml/plantuml). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Approximately 13.4k stars observed; project licenses/build variants.

#### PUML-24

[License](https://plantuml.com/license). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: GPL build and diagram ownership; alternative builds require own license check.

#### PUML-25

[BPM package API](https://plantuml.github.io/plantuml/javadoc/net/sourceforge/plantuml/bpm/package-summary.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Built-in BPM drawing package; no evidence of BPMN 2 XML model exchange.

#### PUML-26

[Themes](https://plantuml.com/theme). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Reusable themes and includeable theme definitions.

#### PUML-27

[Network diagrams](https://plantuml.com/nwdiag). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Native nwdiag network/address notation.

### Graphviz sources

#### GV-01

[Graphviz overview](https://graphviz.org/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Generic graph drawing, output formats and platform role.

#### GV-02

[DOT grammar](https://graphviz.org/doc/info/lang.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Nodes/edges/subgraphs/clusters/ports; bounded core grammar.

#### GV-03

[Node shapes](https://graphviz.org/doc/info/shapes.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Shape list, records, HTML-like labels/tables, named cell ports.

#### GV-04

[Arrow shapes](https://graphviz.org/doc/info/arrows.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Composable heads including crow/tee/dot/diamond.

#### GV-05

[Layout engines](https://graphviz.org/docs/layouts/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Layered, force, radial, circular and other native engines.

#### GV-06

[Output formats](https://graphviz.org/docs/outputs/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: SVG/PNG/PDF and structured output support depends on build plugins.

#### GV-07

[Splines](https://graphviz.org/docs/attrs/splines/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Orthogonal routing limitation with ports and dot edge labels.

#### GV-08

[Pin](https://graphviz.org/docs/attrs/pin/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: neato/fdp pinned positions and caveats.

#### GV-09

[Image attribute](https://graphviz.org/docs/attrs/image/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Local image files inside nodes.

#### GV-10

[Rank attribute](https://graphviz.org/docs/attrs/rank/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: dot rank constraints.

#### GV-11

[Layers](https://graphviz.org/docs/attrs/layers/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Selective output layers; output-format support caveat.

#### GV-12

[Command line](https://graphviz.org/doc/info/command.html). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: CLI rendering, input/output and processing options.

#### GV-13

[JSON output](https://graphviz.org/docs/outputs/json/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Machine-readable DOT/xdot encodings.

#### GV-14

[License](https://graphviz.org/license/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: EPL 2.0 licensing.

#### GV-15

[Graphviz as default in PlantUML](https://plantuml.com/layout-engines). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Current official integration/reach proxy.

#### GV-16

[gvpr](https://graphviz.org/docs/cli/gvpr/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Graph pattern-processing language.

#### GV-17

[Tooltip](https://graphviz.org/docs/attrs/tooltip/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: SVG/imagemap tooltips, not full accessibility.

### D2 sources

#### D2-01

[D2 overview](https://d2lang.com/tour/intro/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Declarative text diagram language.

#### D2-02

[Sequence diagrams](https://d2lang.com/tour/sequence-diagrams/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Ordered actors/messages, spans, groups, notes and self-messages.

#### D2-03

[SQL tables](https://d2lang.com/tour/sql-tables/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Typed fields, constraints, field links, engine-dependent exact row routing.

#### D2-04

[UML classes](https://d2lang.com/tour/uml-classes/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Fields/methods/types and visibility prefixes.

#### D2-05

[Shapes](https://d2lang.com/tour/shapes/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Generic shape vocabulary and declarations.

#### D2-06

[Icons and images](https://d2lang.com/tour/icons/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Local/URL assets, icon library and image shapes.

#### D2-07

[Text and code](https://d2lang.com/tour/text/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Markdown, mathematical notation and language labels.

#### D2-08

[Connections](https://d2lang.com/tour/connections/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Heads, cardinality glyphs and endpoint labels.

#### D2-09

[Containers](https://d2lang.com/tour/containers/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Nested groups and relative references.

#### D2-10

[Layout overview](https://d2lang.com/tour/layouts/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Engine choices and nonuniform feature support.

#### D2-11

[Positions](https://d2lang.com/tour/positions/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Near/label positions; TALA-only arbitrary pinning.

#### D2-12

[TALA](https://d2lang.com/tour/tala/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Orthogonal routing, container features and change-sensitive randomness.

#### D2-13

[Composition](https://d2lang.com/tour/composition/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Layers/scenarios/steps have distinct inheritance rules.

#### D2-14

[Scenarios](https://d2lang.com/tour/scenarios/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Named variants inherit from base; not semantic diff classification.

#### D2-15

[Models](https://d2lang.com/tour/models/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Suspend/unsuspend/glob filtered views.

#### D2-16

[Imports](https://d2lang.com/tour/imports/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Regular/spread/selective source imports.

#### D2-17

[Classes](https://d2lang.com/tour/classes/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Reusable attribute sets and classes as tags.

#### D2-18

[Themes](https://d2lang.com/tour/themes/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Theme catalog and dark theme controls.

#### D2-19

[Interactive output](https://d2lang.com/tour/interactive/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Tooltip/link annotations and static export appendix.

#### D2-20

[Exports](https://d2lang.com/tour/exports/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: SVG/PNG/PDF/PPTX/GIF/ASCII; PDF uses raster pages.

#### D2-21

[Oracle API](https://d2lang.com/tour/api/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Pure Go AST mutation API; not a complete interactive editor.

#### D2-22

[Grid diagrams](https://d2lang.com/tour/grid-diagrams/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Grid rows/columns/cells and placement controls.

#### D2-23

[Repository](https://github.com/d2lang/d2). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Approximately 25.7k stars; MPL 2.0; CLI, Go API and language tooling.

#### D2-24

[D2 v0.9.0 release](https://d2lang.com/releases/0.9.0/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: TALA now bundled/free; built-in exports; native SVG Markdown labels.

#### D2-25

[TALA open source announcement](https://d2lang.com/blog/tala-is-open-source/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: September 7, 2026 MPL release; deterministic same-seed input but no edit stability guarantee.

#### D2-26

[D2 non-profit announcement](https://d2lang.com/blog/d2-non-profit/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: September 5, 2026 transition, maintenance and future Studio statements.

#### D2-27

[C4 model in D2](https://d2lang.com/blog/c4/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: First-class model/view building blocks, theme, c4-person; not full typed C4 metamodel.

### Structurizr DSL sources

#### STR-01

[Structurizr DSL language reference](https://docs.structurizr.com/dsl/language). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Exhaustive DSL model/view vocabulary; model scope; native vs absent domain notation.

#### STR-02

[Current consolidated Structurizr repository](https://github.com/structurizr/structurizr). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Apache-2.0; C4 reference implementation; observed 505 stars; local command.

#### STR-03

[local command](https://docs.structurizr.com/local). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Free local/offline authoring and viewer; replacement for Lite.

#### STR-04

[Local workflow](https://docs.structurizr.com/local/workflow). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Semantic DSL text authoring; browser layout saved to workspace.json.

#### STR-05

[Diagram editor](https://docs.structurizr.com/server/diagrams/editor). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Layout-only edits; Dagre; manual align/distribute; direct/orthogonal/curved routing.

#### STR-06

[Diagram viewer](https://docs.structurizr.com/server/diagrams/viewer). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: UI PNG/SVG export, tag/perspective filtering, keyboard controls.

#### STR-07

[Filtered views cookbook](https://docs.structurizr.com/dsl/cookbook/filtered-view/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Tag-based views; original base view needs explicit all-elements filtered view.

#### STR-08

[Dynamic views with parallel sequences](https://docs.structurizr.com/dsl/cookbook/dynamic-view-parallel/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Ordered relationship instances; limited parallel-block support.

#### STR-09

[Amazon Web Services cookbook](https://docs.structurizr.com/dsl/cookbook/amazon-web-services/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Deployment nodes/instances and optional AWS icon theme.

#### STR-10

[Includes](https://docs.structurizr.com/dsl/includes). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Local files/directories or HTTPS include; textual expansion.

#### STR-11

[Workspace inspections](https://docs.structurizr.com/workspaces/inspections). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Built-in architecture checks and adjustable severity.

#### STR-12

[PNG and SVG command exports](https://docs.structurizr.com/export/png-and-svg). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Preview/source-build restriction; browser-renderer-based exports; manual layout requires JSON input.

#### STR-13

[PlantUML export](https://docs.structurizr.com/export/plantuml). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Dynamic view sequence export vs native collaboration view.

#### STR-14

[DSL library README](https://github.com/structurizr/structurizr/blob/main/structurizr-dsl/README.md). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: DSL is wrapper around model; ThoughtWorks Radar ecosystem proxy.

#### STR-15

[Element styles cookbook](https://docs.structurizr.com/dsl/cookbook/element-styles/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Tag styles, shapes; export style parity caveat.

#### STR-16

[validate command](https://docs.structurizr.com/validate). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: CLI workspace validation.

#### STR-17

[Legacy Lite repository](https://github.com/structurizr/lite). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Archived 2026-02-04; explicitly directs migration to consolidated local tooling.

#### STR-18

[Current Structurizr local quickstart](https://docs.structurizr.com/local/quickstart). Verified 2026-10-28 UTC. Supports: Current Docker local invocation, workspace.dsl workflow and browser layout editing.

### mingrammer/diagrams sources

#### DIAG-01

[Diagrams repository](https://github.com/mingrammer/diagrams). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Observed 42.8k stars; MIT; provider catalogs; official ecosystem integrations.

#### DIAG-02

[Diagram API guide](https://diagrams.mingrammer.com/docs/guides/diagram). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Context API, PNG/JPG/SVG/PDF/DOT outputs and Graphviz attribute forwarding.

#### DIAG-03

[Nodes guide](https://diagrams.mingrammer.com/docs/guides/node). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Provider/resource class catalog and connection operators.

#### DIAG-04

[Clusters guide](https://diagrams.mingrammer.com/docs/guides/cluster). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Nested clusters, relationships across cluster boundaries.

#### DIAG-05

[Edges guide](https://diagrams.mingrammer.com/docs/guides/edge). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Label/color/style and Graphviz attributes.

#### DIAG-06

[Custom nodes](https://diagrams.mingrammer.com/docs/nodes/custom). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Local custom image/icon support.

#### DIAG-07

[C4 nodes](https://diagrams.mingrammer.com/docs/nodes/c4). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Packaged C4 Person/Container/Database/System/Boundary/Relationship classes.

#### DIAG-08

[Online Playground guide](https://diagrams.mingrammer.com/docs/getting-started/playground). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Pyodide/Graphviz WASM; local execution; code editor; export and URL source sharing; 2026-10-15 page update.

#### DIAG-09

[Installation guide](https://diagrams.mingrammer.com/docs/getting-started/installation). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Local installation and Python invocation. Python minimum conflicts with current package metadata.

#### DIAG-10

[Current core implementation](https://github.com/mingrammer/diagrams/blob/master/diagrams/__init__.py). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Themes, rendering attributes, constructor validation, default UUID IDs, no visual editing model.

#### DIAG-11

[Current package metadata](https://github.com/mingrammer/diagrams/blob/master/pyproject.toml). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: 0.25.1 metadata; Python ~=3.9; diagrams CLI entry point.

#### DIAG-12

[Graphviz routing limitations inherited by Diagrams](https://graphviz.org/docs/attrs/splines/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Orthogonal routing limitation with ports and dot edge labels.

### nomnoml sources

#### NOM-01

[nomnoml syntax and web application](https://nomnoml.com/). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Complete small classifier/association/directive catalog and client-side editor behavior.

#### NOM-02

[Repository and library/CLI README](https://github.com/skanaar/nomnoml). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: MIT, about 2.8k stars; renderSvg/draw/CLI/imports; not an application toolkit.

#### NOM-03

[Package manifest](https://github.com/skanaar/nomnoml/blob/master/package.json). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: Current repository version 1.7.0, graphre dependency and CLI.

#### NOM-04

[Public TypeScript API](https://github.com/skanaar/nomnoml/blob/master/index.d.ts). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: draw, renderSvg, compileFile; bounded public interface.

#### NOM-05

[Changelog](https://github.com/skanaar/nomnoml/blob/master/changelog.md). Verified 2026-10-27 America/Indianapolis (2026-10-28 UTC). Supports: SVG source in desc, compartments/data-name hooks, PNG web export, latest listed 1.7.0 dated 2024-12-14.

### React Flow (xyflow) sources

#### RF-01

[xyflow repository](https://github.com/xyflow/xyflow). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: MIT core; monorepo scope; observed 38.8k stars.

#### RF-02

[React Flow Pro](https://reactflow.dev/pro). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Core vs optional support/examples licensing; official usage proxy.

#### RF-03

[Layouting overview](https://reactflow.dev/learn/layouting/layouting). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Explicitly no built-in layout engine; Dagre/ELK integration; libavoid routing Pro example.

#### RF-04

[Custom nodes](https://reactflow.dev/learn/customization/custom-nodes). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: React component extension model and interaction wrappers.

#### RF-05

[Handles](https://reactflow.dev/learn/customization/handles). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Native IDs and sourceHandle/targetHandle connections.

#### RF-06

[Sub flows](https://reactflow.dev/learn/layouting/sub-flows). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Parent-relative nodes and containment constraints.

#### RF-07

[Accessibility](https://reactflow.dev/learn/advanced-use/accessibility). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Native keyboard controls, ARIA labels/roles/live announcements; app responsibilities remain.

#### RF-08

[Save and restore](https://reactflow.dev/examples/interaction/save-and-restore). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: toObject and node/edge state; app persistence.

#### RF-09

[Connection validation](https://reactflow.dev/examples/interaction/validation). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: isValidConnection callback; custom semantics.

#### RF-10

[Download image](https://reactflow.dev/examples/misc/download-image). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: html-to-image integration; export not core pipeline.

#### RF-11

[Undo and redo](https://reactflow.dev/examples/interaction/undo-redo). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Pro snapshot-history hook example.

#### RF-12

[Expand and collapse](https://reactflow.dev/examples/layout/expand-collapse). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Pro visibility hook plus Dagre, not native collapse model.

#### RF-13

[Theming](https://reactflow.dev/learn/customization/theming). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Built-in light/dark/system and CSS variables.

#### RF-14

[Edge markers](https://reactflow.dev/examples/edges/markers). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Built-in marker types and SVG custom markers.

#### RF-15

[Database Schema Node](https://reactflow.dev/ui/components/database-schema-node). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Copy-in table/handle component, no ER semantics.

#### RF-16

[Server-side rendering](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: SSR supported in v12; caller supplies dimensions/handle positions.

#### RF-17

[Node API](https://reactflow.dev/api-reference/types/node). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Positions, hidden state, arbitrary data, parent and extent fields.

### JointJS sources

#### JJS-01

[JointJS repository](https://github.com/clientIO/joint). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Observed 5.4k stars; MPL-2.0; broad legacy marketing claims.

#### JJS-02

[Introduction and edition boundary](https://docs.jointjs.com/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Core vs commercial Plus capabilities; 180+ demos.

#### JJS-03

[Version 4 release notes](https://docs.jointjs.com/learn/release-notes/4.0.0/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Legacy UML/FSA/PN/logic/org shape sets removed from core and moved to custom demos.

#### JJS-04

[Standard shapes API](https://docs.jointjs.com/api/shapes/standard/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Built-in basic SVG/image/HTML shape vocabulary; includes Plus records with separate edition evidence.

#### JJS-05

[Ports](https://docs.jointjs.com/learn/features/ports/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Native port IDs, links and permitted-connection facilities.

#### JJS-06

[Containers and grouping](https://docs.jointjs.com/learn/features/containers-and-grouping/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Native nesting; collapse is demonstrated with viewport filtering.

#### JJS-07

[Routers API](https://docs.jointjs.com/api/routers/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Built-in obstacle-avoiding Manhattan router; separate libavoid integration.

#### JJS-08

[Automatic layout edition comparison](https://docs.jointjs.com/react/features/automatic-layouts/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: DirectedGraph/MSAGL open-source packages; Tree/Grid/Stack/Force layouts in Plus.

#### JJS-09

[Record shapes](https://docs.jointjs.com/learn/features/ready-to-use-shapes/records/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Records are JointJS+; not free-core table support.

#### JJS-10

[BPMN shapes API](https://docs.jointjs.com/api/shapes/bpmn/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: BPMN 2.0 notation shapes, pools, lanes, annotations and markers.

#### JJS-11

[BPMN import](https://docs.jointjs.com/learn/features/export-import/bpmn/import/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Commercial BPMN XML importer with factories and errors.

#### JJS-12

[BPMN export](https://docs.jointjs.com/learn/features/export-import/bpmn/export/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Commercial BPMN XML exporter; not evidence of an execution engine.

#### JJS-13

[SVG export](https://docs.jointjs.com/learn/features/export-import/svg/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Plus SVG export and standalone image/style options.

#### JJS-14

[Raster export](https://docs.jointjs.com/learn/features/export-import/raster/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Plus PNG/JPEG export.

#### JJS-15

[JSON serialization](https://docs.jointjs.com/learn/features/export-import/json/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Core graph toJSON/fromJSON, including custom properties.

#### JJS-16

[Undo and redo](https://docs.jointjs.com/learn/features/undo-redo/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Plus CommandManager transaction history.

#### JJS-17

[Validations](https://docs.jointjs.com/learn/features/validations/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Plus Validator; application-defined validity rules.

#### JJS-18

[Custom elements, styling and accessibility](https://docs.jointjs.com/react/getting-started/custom-elements/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Custom HTML/SVG content; explicitly application-owned ARIA/focus/keyboard support.

#### JJS-19

[Creating custom shapes](https://docs.jointjs.com/learn/features/customizing-shapes/creating-a-shape-from-scratch/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Custom shape implementation, not native domain notation.

#### JJS-20

[Link labels](https://docs.jointjs.com/learn/features/labels/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Multiple labels with custom markup and positions.

#### JJS-21

[Print export](https://docs.jointjs.com/learn/features/export-import/print/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Plus browser print plugin; PDF is browser output rather than dedicated PDF renderer.

#### JJS-22

[Link arrowheads](https://docs.jointjs.com/learn/features/customizing-shapes/link-arrowheads/). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Core sourceMarker and targetMarker SVG endpoint construction.

### GoJS sources

#### GO-01

[GoJS public distribution repository](https://github.com/NorthwoodsSoftware/GoJS). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Observed 8.5k stars; public distribution and examples, not OSS license.

#### GO-02

[Deployment and licensing](https://gojs.net/latest/learn/deployment). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Proprietary license; September 2026 personal non-commercial exception; organization use remains commercial.

#### GO-03

[Core features](https://gojs.net/latest/learn/features). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Integrated interaction, layout, grouping, collapse and exports.

#### GO-04

[Layouts](https://gojs.net/latest/learn/layouts). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Built-in grid/tree/force/layered/circular layout; custom layouts separate.

#### GO-05

[Using models](https://gojs.net/latest/learn/usingModels). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: GraphLinksModel/TreeModel, JSON persistence, data/template relation.

#### GO-06

[Ports](https://gojs.net/latest/learn/ports). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Named ports, source/target port fields and linkability.

#### GO-07

[Groups](https://gojs.net/latest/learn/groups). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Native group membership, group-local layout and collapse.

#### GO-08

[Links](https://gojs.net/latest/learn/links). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Native arrowheads, orthogonal/AvoidsNodes routing and limitations.

#### GO-09

[Making images](https://gojs.net/latest/learn/makingImages). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Native PNG/JPEG image generation API.

#### GO-10

[Making SVG](https://gojs.net/latest/learn/makingSVG). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Native SVG output; node key/port metadata is not complete model embedding.

#### GO-11

[Transactions and undo](https://gojs.net/latest/learn/transactions). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Native transaction and UndoManager model; exclusions for some transient properties.

#### GO-12

[Accessibility](https://gojs.net/latest/learn/accessibility). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Keyboard focus/virtual pointer and generic screen-reader descriptions; domain speech customization.

#### GO-13

[Sequence diagram sample](https://gojs.net/latest/samples/sequenceDiagram). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Sample uses custom lifeline/activity/message templates and linking tools.

#### GO-14

[Entity relationship sample](https://gojs.net/latest/samples/entityRelationship). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Custom ER templates, table properties and relationship styling.

#### GO-15

[State chart sample](https://gojs.net/latest/samples/stateChart). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Custom application templates, controls and link semantics.

#### GO-16

[BPMN editor sample](https://gojs.net/latest/samples/bpmnEditor). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Custom BPMN application, templates/tools/rules, not native BPMN metamodel.

#### GO-17

[Swim lanes sample](https://gojs.net/latest/samples/swimLanes). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Custom pool layout and dragging assembled from native groups.

#### GO-18

[Table panels](https://gojs.net/latest/learn/tablePanels). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Native rows, columns, spans and sizing.

#### GO-19

[Theming](https://gojs.net/latest/learn/theming). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Built-in ThemeManager and light/dark/system themes.

#### GO-20

[Validation](https://gojs.net/latest/learn/validation). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Graph constraints, connection and text validation hooks; custom domain rules.

#### GO-21

[Pictures](https://gojs.net/latest/learn/pictures). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Native image objects and geometry.

#### GO-22

[TextBlocks](https://gojs.net/latest/learn/textBlocks). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Text font/wrapping/editability; geometry measurement caveats across browsers.

#### GO-23

[Node.js](https://gojs.net/latest/learn/nodeJs). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Server-side library automation requires application code and rendering infrastructure.

#### GO-24

[Shapes](https://gojs.net/latest/learn/shapes). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Built-in geometries; custom geometry and figure definitions.

#### GO-25

[Samples catalog](https://gojs.net/latest/samples). Verified 2026-10-27 (America/Indianapolis); 2026-10-28 UTC. Supports: Examples are application starting points, not a complete native domain grammar.

### bpmn-js sources

#### BPMN-01

[bpmn-js repository](https://github.com/bpmn-io/bpmn-js). Verified 2026-10-27. Supports: Scope, source availability, approx 9.7k stars observed.

#### BPMN-02

[bpmn-js walkthrough](https://bpmn.io/toolkit/bpmn-js/walkthrough/). Verified 2026-10-27. Supports: BPMN model, bpmn-moddle XML, editing rules, undo, browser-only architecture.

#### BPMN-03

[bpmn.io license](https://bpmn.io/license/). Verified 2026-10-27. Supports: Free toolkit license with visible watermark condition.

#### BPMN-04

[Examples index](https://bpmn.io/toolkit/bpmn-js/examples/). Verified 2026-10-27. Supports: Custom elements, overlays, colors, theming, diff extensions.

#### BPMN-05

[bpmn-js-differ](https://github.com/bpmn-io/bpmn-js-differ). Verified 2026-10-27. Supports: Separate semantic diff package, change and layout categories; visual app assembly.

#### BPMN-06

[bpmnlint](https://github.com/bpmn-io/bpmnlint). Verified 2026-10-27. Supports: Separate configurable domain linter and CLI.

#### BPMN-07

[bpmn-auto-layout](https://github.com/bpmn-io/bpmn-auto-layout). Verified 2026-10-27. Supports: Separate auto-layout utility; generates BPMN DI.

#### BPMN-08

[Focus/accessibility changes in v18](https://bpmn.io/blog/posts/2025-bpmn-js-18-playing-nicely-with-others). Verified 2026-10-27. Supports: Canvas focus, safe keyboard binding, Camunda integration.

#### BPMN-09

[Awaitable import/export APIs](https://bpmn.io/blog/posts/2020-bpmn-js-7-0-awaitable-import-export-apis.html). Verified 2026-10-27. Supports: importXML, saveXML, saveSVG, createDiagram APIs.

#### BPMN-10

[Current bpmn-js changelog](https://github.com/bpmn-io/bpmn-js/blob/develop/CHANGELOG.md). Verified 2026-10-27. Supports: Current release headings through 18.31.1; lanes, notes, theme tokens, keyboard/accessibility improvements.

#### BPMN-11

[Current auto-layout design](https://github.com/bpmn-io/bpmn-auto-layout/blob/main/docs/LAYOUT.md). Verified 2026-10-27. Supports: Current main supports collaboration/lane/artifact logic; do not repeat stale npm limitations as universal.

#### BPMN-12

[bpmn-moddle current usage](https://github.com/bpmn-io/bpmn-moddle). Verified 2026-10-27. Supports: Current named BpmnModdle import, async fromXML/toXML and metamodel validation.

#### BPMN-13

[bpmn-js-differ package manifest](https://github.com/bpmn-io/bpmn-js-differ/blob/main/package.json). Verified 2026-10-27. Supports: Inspected version 3.2.0, ESM exports, compatible moddle 10 development dependency.

#### BPMN-14

[bpmn-moddle package manifest](https://github.com/bpmn-io/bpmn-moddle/blob/main/package.json). Verified 2026-10-27. Supports: Inspected version 10.3.1 and current ESM entry point.

### Cytoscape.js sources

#### CY-01

[Cytoscape.js repository](https://github.com/cytoscape/cytoscape.js). Verified 2026-10-27. Supports: MIT core; approx 11.3k stars observed.

#### CY-02

[Cytoscape.js reference](https://js.cytoscape.org/). Verified 2026-10-27. Supports: Graph model, JSON, styling, algorithms, interactions, export, layouts and extension catalog.

#### CY-03

[fCoSE extension](https://github.com/iVis-at-Bilkent/cytoscape.js-fcose). Verified 2026-10-27. Supports: Fixed/alignment/relative constraints; incremental initialization with randomize false.

#### CY-04

[SVG export extension](https://github.com/kinimesi/cytoscape-svg). Verified 2026-10-27. Supports: SVG outside core; optional svg2pdf PDF path.

#### CY-05

[Expand-collapse extension](https://github.com/iVis-at-Bilkent/cytoscape.js-expand-collapse). Verified 2026-10-27. Supports: Compound expansion/collapse; repository warns it is no longer maintained.

#### CY-06

[Undo-redo extension](https://github.com/iVis-at-Bilkent/cytoscape.js-undo-redo). Verified 2026-10-27. Supports: Undo/redo as extension rather than core.

#### CY-07

[Cytosnap](https://github.com/cytoscape/cytosnap). Verified 2026-10-27. Supports: Server-side image rendering via Node/Puppeteer, distinct from headless core computation.

#### CY-08

[Edge-editing extension](https://github.com/iVis-at-Bilkent/cytoscape.js-edge-editing). Verified 2026-10-27. Supports: Interactive bend/control editing is extension.

### AntV X6 sources

#### X6-01

[X6 repository](https://github.com/antvis/X6). Verified 2026-10-27. Supports: MIT; approximately 6.7k stars observed.

#### X6-02

[Introduction](https://x6.antv.antgroup.com/en/tutorial/about/). Verified 2026-10-27. Supports: SVG/HTML graph editor engine; diagram applications assembled by developer.

#### X6-03

[Upgrade to 3.x](https://x6.antv.antgroup.com/en/tutorial/update/). Verified 2026-10-27. Supports: Previously separate standard plugins merged into @antv/x6.

#### X6-04

[Ports](https://x6.antv.antgroup.com/en/tutorial/basic/port/). Verified 2026-10-27. Supports: Named ports, groups, layouts and port labels.

#### X6-05

[Routing](https://x6.antv.antgroup.com/en/api/registry/router). Verified 2026-10-27. Supports: Built-in orth/manhattan/metro/er routers and documented fallbacks.

#### X6-06

[Nodes](https://x6.antv.antgroup.com/en/tutorial/basic/node/). Verified 2026-10-27. Supports: Built-in shapes, custom nodes, SVG/image nodes.

#### X6-07

[Groups](https://x6.antv.antgroup.com/en/tutorial/intermediate/group/). Verified 2026-10-27. Supports: Native parent-child hierarchy; custom implementation of collapse/expand.

#### X6-08

[History](https://x6.antv.antgroup.com/en/tutorial/plugins/history/). Verified 2026-10-27. Supports: Bundled opt-in history plugin, batch actions.

#### X6-09

[Export](https://x6.antv.antgroup.com/en/tutorial/plugins/export). Verified 2026-10-27. Supports: Bundled opt-in SVG/PNG/JPEG export; styles/image serialization.

#### X6-10

[Data serialization](https://x6.antv.antgroup.com/en/tutorial/basic/serialization/). Verified 2026-10-27. Supports: toJSON/fromJSON retains cells, geometry and attributes.

#### X6-11

[Interaction](https://x6.antv.antgroup.com/en/tutorial/basic/interacting/). Verified 2026-10-27. Supports: Connection validation callbacks, interactive editing.

#### X6-12

[HTML nodes](https://x6.antv.antgroup.com/en/tutorial/intermediate/html/). Verified 2026-10-27. Supports: Built-in HTML rendering; custom content implementation.

#### X6-13

[Attributes](https://x6.antv.antgroup.com/en/api/registry/attr/). Verified 2026-10-27. Supports: Text wrapping, title metadata, SVG attributes.

#### X6-14

[Layout integration](https://x6.antv.vision/en/docs/tutorial/advanced/layout/). Verified 2026-10-27. Supports: Separate @antv/layout integration (legacy example; current API needs version check).

### AntV G6 sources

#### G6-01

[G6 repository](https://github.com/antvis/G6). Verified 2026-10-27. Supports: MIT, approximately 12.4k stars observed.

#### G6-02

[Documentation and built-in taxonomy](https://g6.antv.antgroup.com/en/docs/manual/). Verified 2026-10-27. Supports: Current 5.1.1 node/edge/layout/behavior/plugin family inventory.

#### G6-03

[Layout overview](https://g6.antv.antgroup.com/en/manual/layout/overview). Verified 2026-10-27. Supports: Built-in graph/tree/mindmap layouts and layout acceleration boundaries.

#### G6-04

[Node configuration](https://g6.antv.antgroup.com/en/manual/element/node/BaseNode/). Verified 2026-10-27. Supports: Shapes, label style, icons/images and keyed ports.

#### G6-05

[Polyline edges](https://g6.antv.antgroup.com/en/manual/element/edge/Polyline/). Verified 2026-10-27. Supports: Orthogonal/shortest-path routing options.

#### G6-06

[CollapseExpand](https://g6.antv.antgroup.com/en/manual/behavior/CollapseExpand/). Verified 2026-10-27. Supports: Bundled collapse/expand behavior for nodes and combos.

#### G6-07

[History](https://g6.antv.antgroup.com/en/manual/plugin/History/). Verified 2026-10-27. Supports: Built-in undo/redo plugin.

#### G6-08

[Timebar](https://g6.antv.antgroup.com/en/manual/plugin/Timebar/). Verified 2026-10-27. Supports: Temporal filtering/playback, not a complete project schedule model.

#### G6-09

[Custom theme](https://g6.antv.antgroup.com/en/manual/theme/custom-theme/). Verified 2026-10-27. Supports: Theme registration and switching.

#### G6-10

[Data](https://g6.antv.antgroup.com/en/manual/data/). Verified 2026-10-27. Supports: JSON node/edge/combo model and mutations.

#### G6-11

[Renderers](https://g6.antv.antgroup.com/en/manual/further-reading/renderer/). Verified 2026-10-27. Supports: Canvas default; separate SVG/WebGL renderer packages.

#### G6-12

[Export image](https://g6.antv.antgroup.com/en/api/export-image/). Verified 2026-10-27. Supports: toDataURL exports PNG/JPEG/WebP; not all plugin DOM included.

#### G6-13

[AntV G image exporter](https://g.antv.antgroup.com/en/guide/advanced-topics/image-exporter). Verified 2026-10-27. Supports: SVG export only with SVG renderer; PDF uses external library.

#### G6-14

[Using Iconfont](https://g6.antv.antgroup.com/en/manual/further-reading/iconfont/). Verified 2026-10-27. Supports: User-supplied iconfont integration.

### yFiles sources

#### YF-01

[yFiles commercial SDK scope](https://www.yworks.com/faq?id=100006). Verified 2026-10-27. Supports: Commercial framework-agnostic SDK, not finished editor; examples are starting points.

#### YF-02

[yFiles features](https://docs.yworks.com/yfiles-html/dguide/features/). Verified 2026-10-27. Supports: Core graph/editor primitives, layouts, undo and customization.

#### YF-03

[Licensing](https://docs.yfiles.com/yfiles-html/dguide/licensing/). Verified 2026-10-27. Supports: Development/distribution licenses and product package boundaries.

#### YF-04

[Vendor customer references](https://www.yworks.com/company/references). Verified 2026-10-27. Supports: Named vendor customer references as dated reach proxy.

#### YF-05

[Incremental layout](https://docs.yworks.com/yfiles-html/dguide/layout-incremental_layout/). Verified 2026-10-27. Supports: Sketch-preserving hierarchy/tree/organic/incremental routing.

#### YF-06

[Port placement](https://docs.yworks.com/yfiles-html/dguide/port_placement/). Verified 2026-10-27. Supports: First-class ports; KEEP_PARAMETER and layout port candidates.

#### YF-07

[Tables](https://docs.yworks.com/yfiles-html/dguide/tables/). Verified 2026-10-27. Supports: Nested table model, row/column editing and table layout.

#### YF-08

[Folding](https://docs.yworks.com/yfiles-html/dguide/folding/). Verified 2026-10-27. Supports: Separate master/view graph, folded edge projection and limitations.

#### YF-09

[Filtering](https://docs.yworks.com/yfiles-html/dguide/filtering/). Verified 2026-10-27. Supports: Filtered graph projection.

#### YF-10

[Graph builders](https://docs.yworks.com/yfiles-html/dguide/graph_builder/). Verified 2026-10-27. Supports: Binding external business data into graph model.

#### YF-11

[Image export](https://docs.yworks.com/yfiles-html/dguide/io-image_export/). Verified 2026-10-27. Supports: SVG native; PNG browser helper; PDF external svg2pdf/jsPDF; VSDX separate add-on.

#### YF-12

[UML editor demo](https://www.yfiles.com/demos/showcase/uml/). Verified 2026-10-27. Supports: Explicitly custom UML node style and label helper; demo is not native UML metamodel.

#### YF-13

[BPMN editor demo](https://www.yfiles.com/demos/showcase/bpmn/). Verified 2026-10-27. Supports: Reference BPMN application and specialized demo layout, not complete core BPMN XML model claim.

#### YF-14

[Accessibility demo](https://www.yfiles.com/demos/application-features/accessibility/). Verified 2026-10-27. Supports: Keyboard and ARIA live-region approach; documented browser/screen-reader differences.

#### YF-15

[MarkupLabelStyle](https://docs.yworks.com/yfileshtml/api/MarkupLabelStyle). Verified 2026-10-27. Supports: First-class rich text label markup subset.

#### YF-16

[Edge styles](https://docs.yworks.com/yfiles-html/dguide/styles-edge_styles/). Verified 2026-10-27. Supports: Built-in endpoint decorations; custom arrows; geometry vs semantic direction distinction.

#### YF-17

[CSS item styles](https://docs.yworks.com/yfiles-html/dguide/styles-css_item_class/). Verified 2026-10-27. Supports: Reusable styles/CSS classes and limitations.

#### YF-18

[Support resources](https://www.yworks.com/products/yfiles/support). Verified 2026-10-27. Supports: Vendor states over 300 reference demos; SDK ecosystem proxy.

## 11. Files read and final handoff

The complete supplied file manifest is below. “Read” means content inspection, not successful test execution. These are repository-relative paths at the exact baseline, not links to a potentially different live branch.

### Root and documentation

- `AGENTS.md`
- `README.md`
- `package.json`
- `docs/ARCHITECTURE.md`
- `docs/DSL.md`
- `docs/CHECKS.md`
- `skills/draftably/SKILL.md`
- `docs/intent/diagram-quality/FEEL.md`
- `docs/intent/diagram-primitives/implementation-plan.md`
- `docs/intent/diagram-primitives/intent-brief.md`
- `docs/intent/diagram-primitives/shape-brief.md`
- `docs/intent/diagram-structure/implementation-plan.md`
- `docs/intent/diagram-structure/intent-brief.md`
- `docs/intent/diagram-structure/options.md`
- `docs/intent/diagram-structure/shape-brief.md`
- `docs/intent/diagram-emphasis/implementation-plan.md`
- `docs/intent/diagram-emphasis/intent-brief.md`
- `docs/intent/diagram-emphasis/shape-brief.md`
- `docs/intent/diagram-comparisons/gap-analysis.md`
- `docs/intent/diagram-comparisons/research.md`
- `docs/intent/diagram-dsl/implementation-plan.md`
- `docs/intent/diagram-dsl/intent-brief.md`
- `docs/intent/diagram-dsl/shape-brief.md`
- `docs/intent/layout-in-files/plan.md`

### Implementation

- `src/model/types.ts`
- `src/model/status.ts`
- `src/model/appearance.ts`
- `src/model/routes.ts`
- `src/cli/main.ts`
- `src/cli/svg.ts`
- `src/state/files.ts`
- `src/state/file-session.ts`
- `src/dsl/cells.ts`
- `src/dsl/channels.ts`
- `src/dsl/compare.ts`
- `src/dsl/compile.ts`
- `src/dsl/conflicts.ts`
- `src/dsl/frame.ts`
- `src/dsl/lanes.ts`
- `src/dsl/layout-edits.ts`
- `src/dsl/project.ts`
- `src/dsl/source-edits.ts`
- `src/dsl/syntax.ts`
- `src/dsl/translate.ts`

### Examples

- `examples/aws-vpc-network.draft`
- `examples/billing-schema.draft`
- `examples/checkout-change.draft`
- `examples/checkout.draft`
- `examples/ci-cd-pipeline.draft`
- `examples/data-lakehouse.draft`
- `examples/emphasis.draft`
- `examples/hexagonal-billing.draft`
- `examples/incident-response.draft`
- `examples/kubernetes-cluster.draft`
- `examples/login-sequence.draft`
- `examples/monorepo-packages.draft`
- `examples/multi-region-failover.draft`
- `examples/observability-stack.draft`
- `examples/order-lifecycle.draft`
- `examples/order-pipeline.draft`
- `examples/order-saga.draft`
- `examples/png-file.draft`
- `examples/prompt-request.draft`
- `examples/rag-assistant.draft`
- `examples/support-lanes.draft`
- `examples/support-triage.draft`
- `examples/tcp-header.draft`
- `examples/theme-proof.draft`
- `examples/web-app-components.draft`

### Tests

- `tests/sequence.test.ts`
- `tests/lanes.test.ts`
- `tests/cells.test.ts`
- `tests/compare.test.ts`
- `tests/states.test.ts`
- `tests/translate.test.ts`
- `tests/dsl.test.ts`
- `tests/embed.test.ts`

**Access:** exact supplied baseline available; no missing decisive core input. **Checked:** the 77-file review surface and current primary evidence for exactly 15 alternatives. **Not executed:** Draftably tests, renderer benchmarks, browser proofs or competitor render outputs. **Proposed:** five capability bets, ordinal scores, future syntax, dispositions and staged proofs. **Integration:** Codex reviews and integrates these files; no application code was changed.

**Companion files:** [diagram-types.csv](diagram-types.csv), [features.csv](features.csv), [capability-bets.md](capability-bets.md).

**Open questions:** comparison field policy and old-value representation; optional schema roles versus generic endpoints; sequence interval/branch grammar; reproducible content/asset packaging; structural-view boundary and layout policy. The five Design questions above are ready for the next shaping pass.
