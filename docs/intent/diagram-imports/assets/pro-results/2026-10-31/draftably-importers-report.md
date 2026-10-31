**Decision.** Build import as a one-way compiler into native `.draft` source, accompanied by a structured diagnostic report and a deterministic foreign-to-native ID map; obtain the editable `Diagram` only by compiling and projecting that source through draftably’s existing pipeline. Ship an explicitly bounded **DOT core** adapter and **Mermaid flowchart** adapter first, after closing the native undirected-edge persistence gap. Keep official D2 compilation optional and experimental until its substantial package cost and execution limits are acceptable. Reject unsupported diagram families and relationships rather than silently flattening them; require review for stated appearance/layout approximations. An accepted import opens a fresh, recoverable native scratch document, and Save creates a new `.draft` file. The foreign input is never watched, overwritten, exported, or synchronized.

# Read-only text diagram importers for draftably

**Repository baseline:** [byronwall/draftably at dd2ababcbe3b9ac011bc23e652309c10cf31cd02](https://github.com/byronwall/draftably/tree/dd2ababcbe3b9ac011bc23e652309c10cf31cd02)  
**Research date:** 2026-10-31 UTC  
**Mode:** design and implementation research; original checkout unchanged.

Access was confirmed at the exact commit before implementation conclusions were drawn. The full Git tree was available: 723 tracked blobs, untruncated. A clean checkout identifies that exact HEAD. This report uses that baseline, not whatever `main` points to later.

**Evidence convention:** “Fact” means inspected repository or upstream source. “Measured” means a controlled executable probe described in the validation record. “Proposal” means work for Codex to integrate. Working companions are separately identified; they are not claimed to be a merged product feature.

The accompanying files are `draftably-importers-plan.md`, `draftably-feature-mapping-and-fixtures.md`, `native-undirected.patch`, `validation-results.md`, and the source/fixture kit in `draftably-importer-companions.zip`. Paths beginning `adapter-kit/` below refer to that archive.

## Recommendations and stable IDs

“Build” is recommended implementation scope, not a claim that every UI or packaging task is already complete.

| ID | Classification | Recommendation and reason |
|---|---|---|
| IMP-01 | **Build** | Make native source authoritative; reuse native compile, projection, edit translation and saving. A raw Diagram alone is not a sufficient writable import. |
| IMP-02 | **Build** | Add native `directed=false` support end to end. One undirected relationship must stay one relationship through edit/save/reopen. Companion prerequisite: `IMP-02-native-undirected`. |
| IMP-03 | **Build** | Use explicit format, extension, selected Markdown fence, then confident signature; ask for format when ambiguous. Family detection is separate from language detection. |
| IMP-04 | **Build** | Stage conversion and report losses before changing active state. Fatal results contain neither applicable source nor graph facts. |
| IMP-05 | **Build** | Use pinned `@ts-graphviz/ast@3.0.10` for an advertised DOT-core dialect, with explicit semantic evaluation and guards for parser gaps. |
| IMP-06 | **Build** | Use pinned Mermaid 12.2.0’s flowchart DB behind a guarded facade. Node is demonstrated; browser hard execution isolation remains a release gate. |
| IMP-07 | **Build** | Add a dedicated CLI `import` command with create-only `.draft` output. Keep shared native `read()` and all native mutation commands unchanged in purpose. |
| IMP-08 | **Build** | Generalize the existing scratch session minimally, persist the initial import, and connect one dispatcher to editor and public-site entry points. |
| IMP-09 | **Build** | Bound input, expansion, nesting, labels, output and runtime; deny external resources and active behavior by default. |
| IMP-10 | **Explore** | Offer official `@d2lang/d2@0.1.34` as an optional ordinary-graph importer. It works for a useful subset but carries a large compiler/runtime. |
| IMP-11 | **Explore** | Build a semantic-only D2 Go/WASM bridge only if measured demand and size/startup justify owning that build. |
| IMP-12 | **Build** | Add a separately tested, bounded Mermaid sequence profile next; preserve participant/message order and reject unsupported fragments/lifetimes. |
| IMP-13 | **Explore** | Design endpoint markers, endpoint labels and member/field connections before claiming faithful ER, UML or richer state semantics. |
| IMP-14 | **Build** | Add a bounded nomnoml graph/compartment profile after the first importers; its small parse API is a promising low-cost extension. |
| IMP-15 | **Explore** | Validate DBML v2 into native cells with explicit field references and relationship diagnostics. Do not connect to a database. |
| IMP-16 | **Explore** | Investigate PlantUML by family, starting with simple sequences; current JS/WASM rendering is not a public semantic AST. |
| IMP-17 | **Defer** | Defer executing Structurizr DSL. Explore importing a selected view from inert workspace JSON separately. |
| IMP-18 | **Defer** | Defer waveform timing and arbitrary drawing languages; WaveDrom and Pikchr are not ordinary node/edge graphs. |
| IMP-19 | **Avoid** | Do not build foreign writers, round-trip synchronization, SVG reverse engineering, silent renderer fallbacks, or remote upload conversion. |
| IMP-20 | **Explore** | Evaluate an explicitly selected Viz.js full-DOT backend if core-dialect rejection is a real user problem; account for layout, framing, size and license costs. |

## 1. What import should mean in this product

### 1.1 The existing native authority is source

**Facts.** `compile(source)` produces a `Scene`; `projectScene(scene)` creates the editor’s `Diagram`. In a native file session, visual changes go through `translateEdit`, native source is recompiled, and the server saves that native source. This is already the product’s working editable-document architecture. The in-memory model contains more capabilities than the source translator can save. [R1, R2, R3]

The decisive mismatch is direction:

- `DiagramEdge` already has `directed: boolean`.
- Baseline `ModelEdge` has no persistent direction field; native edge syntax accepts `->`.
- `projectScene` hard-codes `directed: true` and `emphasis: false`.
- `translateEdit`’s `rejectUnsupported` rejects undirected or emphasized edges anywhere in the resulting document, even when the user edited an unrelated node.
- The browser edge renderer already checks direction, but CLI SVG emission always attaches the terminal arrow marker. [R2, R3, R4]

Therefore importing a DOT `graph` directly into a `Diagram` may look plausible while breaking the next edit or save. The supplied native prerequisite patch implements `edge e a -> b "" directed=false`, retaining `->` as the native endpoint separator. Missing direction stays directed. It updates parsing, projection, translation, comparison, native ranking decisions and CLI SVG, plus DSL documentation, the bundled skill and a changeset. It does not add foreign arrow grammar or two-ended arrowheads.

**Proposal IMP-01:** return this small conversion envelope:

```ts
type ImportResult = {
  status: 'ready' | 'needs-review' | 'failed';
  format: 'dot' | 'mermaid' | 'd2';
  family: string;
  nativeSource?: string;       // absent on fatal error
  diagnostics: Diagnostic[];
  ids: IdMapping[];
  requires: string[];          // e.g. IMP-02-native-undirected
  facts?: NativePlan;          // test/debug facts; not a second saved document
};
```

Use an ephemeral compiled preview after conversion. Persist the native source and a compact import report, not an independently editable source-plus-Diagram pair. The kit’s `NativePlan` is only a small source-construction helper; it is not a universal AST, plugin framework, or replacement document model. Future sequence/cell adapters may emit native source through dedicated builders instead of forcing all families into this graph helper.

### 1.2 One pipeline, separate parser responsibilities

| Stage | Required behavior | Existing or proposed boundary |
|---|---|---|
| Read | Read bounded UTF-8 text; preserve original bytes; do not execute a source file. | New import reader; native embedded-image reopening remains separate. |
| Detect | Explicit `--from` / dialog choice first, then known extension, then selected conventional code fence or confident header. | `src/import/detect.ts` proposed; executable companion supplied. |
| Identify family | Recognize flowchart versus sequence, class, timing, chart, board/workspace, etc. | Per-format adapter; never infer that “parser accepted” means “native supports.” |
| Parse | Use the pinned parser/compiler in an isolated execution context, with inert options. | DOT AST, Mermaid flow DB facade, optional D2 compiler. |
| Resolve meaning | Resolve identities, scopes/defaults, containment, edge occurrences, direction, labels and selected styles. | Per-format code owns foreign semantics. |
| Lower | Emit valid native IDs, JSON-quoted labels and native declarations; collect loss/error diagnostics. | Small shared native-source helpers. |
| Validate/lay out | Run native `checkSource`, then `compile` and `projectScene`; retain native layout notes separately. | Existing native compiler and projector. |
| Review | Show retained graph facts, omitted/approximated features, affected IDs and source locations where reliable. | Staged preview, not active-document mutation. |
| Open/save | Open a fresh native scratch session; create a new `.draft` or download it. | Existing session/save mechanisms with the lifecycle fixes below. |

Geometry is recalculated by draftably. Do not pretend Mermaid/DOT/D2 renderer coordinates, spline control points, fonts or layout engines are native layout refinements. Preserve supported direction and endpoint-side intent; report the remaining placement differences.

A malformed foreign source never reaches native opening. A semantically unsupported source may parse successfully and still fail conversion. A valid native candidate may also encounter native containment/endpoint limits; report that as a mapping failure, not as a foreign syntax error.

### 1.3 Detection, file types and paste

**Proposal IMP-03.**

| Format | Initial file hints | Confident text hint |
|---|---|---|
| Native | `.draft` | `diagram "…"` |
| Mermaid | `.mmd`, `.mermaid` | Common explicit Mermaid family headers, including recognized unsupported families so the error is useful. |
| DOT | `.dot`, `.gv` | `graph` / `digraph`, optional `strict` and graph ID, followed by a graph body. |
| D2 | `.d2` | Prefer explicit choice; short `a -> b` is too ambiguous. |
| PlantUML, later | `.puml`, `.plantuml`, `.pu`, `.iuml` | `@startuml` or another PlantUML start-family marker. |
| DBML / nomnoml, later | `.dbml` / `.nomnoml` | DBML’s strong declaration headers may help; bracket syntax alone is not enough for nomnoml. |

A recognized extension determines the attempted parser; failure does not silently try progressively more permissive languages. Explicit choice overrides extension. MIME type is only a hint. A Markdown document with one recognized closed fence can offer that block; multiple blocks require selection, never automatic concatenation. Preserve the fence’s starting line for location mapping. The supplied fence reader deliberately covers conventional backtick/tilde fences, not every nested CommonMark container.

**Facts.** Editor `keyboard.handlePaste` currently sends multiline ordinary text to QuickBuild. Native clipboard fragments have separate handling. `site/reopen.ts::readDiagramFile` treats every non-image file as native source, while editor `files.importText` expects legacy/native JSON or editable SVG metadata. These paths differ today. [R5, R6]

Add foreign detection before the multiline-list fallback, while preserving clipboard-fragment precedence and leaving paste inside editable text controls alone. “Paste text diagram…” is useful for ambiguous input and choosing the source language. Do not replace the current diagram simply because a permissive parser accepted prose. Update both editor and site/Playground paths; a `.mmd` drag must not be treated as native text in one surface and imported in another.

### 1.4 Detached opening, recovery and saving

**Facts.** `openExampleSession` already supplies a source-backed scratch experience. However, it can restore earlier text by a reused key; `keepScratch` saves only edited source with history, so an unedited import is not recoverable through that mechanism. Title slugs are not unique import identities. `settleSave` waits for in-flight work but does not prove a save succeeded. File sessions disable ordinary browser snapshot persistence and install source commit/history handlers. [R3]

**Proposal IMP-08:** factor `openScratchSession` from this existing branch, keeping `openExampleSession` as a wrapper:

1. Give each import a fresh ID independent of title, filename or content.
2. Persist the generated native source immediately, before the first edit, with kind `import` and the diagnostic report. Reuse the existing compressed native-source URL mechanism only when its length/privacy tradeoffs are acceptable.
3. Complete pending native edits; protect a failed/conflicting save before switching. A conversion preview can exist without replacing unresolved current work.
4. Reject stale async parse/layout results with a generation token. Cancellation or a newer import must invalidate the old result.
5. Show “Imported from Mermaid · native draft · not saved to disk,” plus “Import report.” Do not label it an Example or display the foreign path as saved.
6. Start undo/redo at the generated native source. All further edits use `translateEdit`. The foreign source can remain visible during review as read-only text, but is not a live document or a file handle.
7. Save via `launch.createDiagramFile` and the existing create-only workspace API, or download a `.draft`. A saved destination enters an ordinary native file session.

Never call `openDocument` with a foreign-derived Diagram while an existing file session’s commit hook is active. That can route changes to the wrong native document. Never create a server `FileSession` for a foreign pathname: `createFileSession` watches and atomically writes its owned path. [R3, R5, R7]

### 1.5 CLI contract

**Proposal IMP-07; production command not yet implemented:**

```bash
pnpm draftably import architecture.dot --from dot --output architecture.draft
pnpm draftably import flow.mmd --from mermaid --output flow.draft --accept-lossy
pnpm draftably check flow.draft
pnpm draftably open flow.draft
```

When output is omitted, print only native source on stdout and diagnostics on stderr. Use a report option for machine-readable diagnostics if needed. A loss-review result should fail noninteractively unless explicitly accepted; acceptance cannot bypass fatal semantic failures. Suggested exit statuses: 0 accepted conversion, 1 parse/mapping/native-validation failure, 2 usage/ambiguous input, 3 review required.

Create destination files with exclusive `wx` after validation. Reject the same path and every pre-existing destination, including symlinks and hardlinks. No initial `--force` option. This rule is easier to verify than complicated overwrite exceptions. The companion `safe-output.ts` implements and tests this boundary. Shell redirection is not a substitute for it because the shell can truncate a target before the program starts.

Do not add foreign conversion to `src/cli/main.ts::read`: format/set/rm and other native commands share that reader. That would create an accidental foreign-overwrite route. An `open foreign.mmd` convenience command can later invoke the same importer and materialize a separate native destination; first shipping `import` followed by `open` keeps the boundary clear. [R8]

### 1.6 Failure and loss reporting

**Proposal IMP-04:** classify each diagnostic by stable code, severity, impact, affected foreign IDs, message and reliable source span.

- **Fatal:** malformed input; unsupported family; unknown semantic data; overlapping containment; missing endpoints; unsupported endpoint/cardinality meanings; illegal native group-edge relationship; resource limits; incompatible parser API.
- **Review:** shape approximation; explicit style omitted; rich text reduced; reverse layout normalized; generated source rules replaced by concrete values; links/assets omitted.
- **Informational:** native layout rerun, IDs remapped, dashed stroke represented through native `kind=async` without inferring execution semantics.

A failed result has no `nativeSource` or `facts`. It may retain diagnostics/ID mappings for explanation. No partial graph opens. Do not bury import loss in `FileNotes`’ “layout notes,” which are regenerated for different reasons. Preserve an import report for review after saving. Exact original-source locations are unavailable for some Mermaid preprocessing and D2 target mapping; label parser-relative locations honestly instead of inventing offsets. [R5]

## 2. Mapping to the actual native model and DSL

The detailed construct tables and exact input/output examples are in `draftably-feature-mapping-and-fixtures.md`. The essentials below determine the architecture.

### 2.1 Native capabilities and hard limits

| Native fact at the baseline | Consequence for import |
|---|---|
| Nodes/groups have one `parentId`; native `in=` uses a containment tree. | Preserve nesting; reject incomparable overlapping cluster membership. Ordinary DOT subgraphs are not automatically containers. |
| Writable shapes: box, pill, circle, diamond, text; marker is cells-only. | Map exact shapes; report approximations. Model image/icon support is insufficient because the source translator rejects them. |
| Edge has one ID, two endpoints, one central label, one directed boolean. | Preserve parallel occurrences and self-loops. Do not split a single two-ended relationship into two edges. |
| Native `kind=async` projects to dashed appearance. | Useful for dashed lines; it does not establish foreign asynchronous semantics. |
| Only right/down layout directions are representable. | LR/TB map; RL/BT or left/up require review. Never reverse semantic arrows to imitate layout orientation. |
| IDs use `[A-Za-z_][A-Za-z0-9_.-]*`; reserved/suspicious IDs must be remapped. | Allocate deterministic collision-free IDs across node/group/edge namespaces; preserve a foreign-ID map. |
| Source allows 300,000 characters, 500 nodes+groups, 1,200 edges and 12 levels. | Use source limits, not only model normalization’s separate node cap. Cap expansion before allocation. |
| Edges can terminate on boxed groups, but not soft/none groups or a group enclosing the other endpoint. | A valid foreign graph can be impossible in native source. Fail with an affected-edge explanation. |
| Native sequences have ordered participants/messages, self messages, top-level participant bands and phase bands. | They do not provide alt/loop/par control fragments, activations, creation/destruction, or general notes. |
| Cells contain nodes only, without nested groups; `count` is a stack/count badge. | Cells are useful for records. `count` is not ER cardinality; native schema/UML meaning is not automatically typed. |

Sources: `types.ts`, `document.ts::normalize`, `syntax.ts::validate`, `compile.ts::sequenced/layoutFor`, `translate.ts::rejectUnsupported`, and DSL sequence/cells documentation. [R2, R3, R9]

### 2.2 Mermaid flowcharts

**Working partial companion, IMP-06.** Preserve parser-resolved node identity and labels; use the official DB’s implicit nodes, chain expansion and occurrence order. Separate identity from text. Preserve explicit edge IDs; generate deterministic occurrence IDs otherwise. Keep parallel edges and loops.

Reconstruct group parentage from immediate membership, including group IDs inside parent groups. Mermaid can expose shadow vertices for subgraph endpoints/styles; merge those with the group identity rather than producing a duplicate node. The native source must declare parents and group endpoints consistently.

Map rectangle to box, stadium to pill, circle/diamond/text directly. Rounded rectangles become pill with a shape-approximation warning; cylinder, subroutine, double-circle and the larger shape catalog need explicit approximations or future native shapes. An arbitrary shape cannot be claimed as exact because both happen to be selectable nodes.

`-->` is directed; `---` needs IMP-02. Dotted stroke becomes native dashed appearance. Thick line loses emphasis with review because native source cannot currently preserve `emphasis`. Double-ended, circle/cross terminals and invisible links block this profile. An invisible Mermaid link is layout intent, not an ordinary visible relationship.

Resolve in-diagram class/default/inline supported hex fill/stroke/text colors into native `theme-color` families. Omit arbitrary CSS, animations, unrecognized color expressions, icons, URLs and callbacks with diagnostics; never insert foreign HTML or CSS. HTML labels are reduced using inert text extraction with line breaks/entities; Markdown markers remain literal in this companion.

Layout requires care: the source has no universal simple inheritance rule. Mermaid’s Dagre extractor, external connections and `flowchart.inheritDir` affect subgraph direction. The companion deliberately emits native flow layout for every group, chooses nearest declared/root direction as its normalized policy, and warns for implicit or explicit subgraph layout differences. Native groups otherwise default to column. [S1–S4, R9]

### 2.3 DOT

**Working partial companion, IMP-05.** The AST is only syntax. The adapter implements graph-global node identity, creation-time default snapshots, scoped changes, explicit later attribute updates, named subgraphs, cluster nesting, and edge semantics.

Important distinctions:

- Non-strict repeated edges are distinct occurrences; strict duplicate identity is ordered for digraphs and unordered for graphs. Updating a strict edge does not reapply newly changed defaults.
- Brace endpoint sets deduplicate members before Cartesian expansion. `{a a}->{b b}` creates one edge, not four. Ports on node declarations inside a set are not edge endpoint ports.
- Direct endpoint ports override inherited edge defaults; explicit attributes on that edge declaration then win. A later strict declaration changes only the resolved declaration patch.
- `cluster*` subgraphs become native groups. Other subgraphs retain scoping/set meaning without a visible frame. Non-prefix/anonymous `cluster=true` is currently rejected, not flattened. Anonymous `rank=same` is reported as layout loss.
- Cluster labels default empty; `\G` in a cluster label means the cluster context, not the root graph name.
- Cardinal compass sides map to native side hints. Named field ports are unsupported; diagonal/center attachment hints require review and fall back to automatic attachment.
- `constraint=false` and `constraint=0` map to native `constraint=false`. Accepted true/false/1/0 booleans are explicit.
- Root `rankdir` becomes native root and cluster flow direction. Cluster layout is a native approximation; all Graphviz rank constraints are not preserved.
- DOT `dir=back` is arrow decoration without changing the logical tail/head. Do not reverse endpoints. `dir=both`, or a directed edge whose arrow is suppressed, cannot preserve both logical direction and rendered marker using the current native boolean; this profile blocks those cases. [S5–S8]

Record/HTML labels and named ports can encode fields and relationships. The current companion blocks them instead of stripping them into apparently faithful text. Ordinary named-context escapes are interpreted; graph-name escapes in anonymous graphs fail explicitly because Graphviz supplies a generated name. Entity-bearing labels and escaped identifiers used as default labels fail explicitly where exact rendering has not been implemented.

The chosen AST grammar is narrower than Graphviz DOT: repeated attribute lists, quoted-string concatenation and some subgraph forms are rejected; full subgraph edge operands can be misparsed by the upstream parser. The adapter guards unquoted reserved keywords to prevent that silent acceptance. Label the feature **DOT core**, not “all DOT.” A valid DOT file can produce `DOT_PARSE_REJECTED` because of the importer dialect; the diagnostic explains this possibility. [S6, S9]

### 2.4 D2 ordinary graphs

**Working partial companion; optional runtime remains Explore, IMP-10.** Use the official compiler to resolve scopes, quoted keys, classes, variables, globs, repeated declarations and indexed connections. Import its resolved result as a snapshot; future native edits do not rerun foreign rules.

The stock JS API’s `graph` JSON is not complete topology: parent/children and edge endpoint pointers are omitted. The companion joins `diagram.shapes/connections` with compiler object/edge metadata using the pinned exporter’s order, length and local-ID guards. It tolerates observed null empty slices, but fails on unexplained shape changes. A different `d2graph.SerializeGraph` API includes explicit endpoints/children; it is not what stock `compile()` returns. [S10–S12]

Do not split canonical IDs on dots. `"a.b"` is one key. Parent recovery uses existing canonical full-ID candidates, level difference and whole prefix matching; exactly one parent is required.

Use semantic `src_arrow/dst_arrow` flags, not rendered marker strings. `a <- b` becomes one native edge from b to a. `a -> b` with a hidden target arrowhead remains directed, with an appearance warning. `a -- b` needs IMP-02; `a <-> b` fails. Parallel/indexed connection identities remain distinct.

Map rectangle/circle/diamond/text, hierarchical containers and right/down direction. Other shapes, literal markup, omitted explicit styles, links/resources and placement/configuration get diagnostics. D2 theme tokens are not CSS colors. The companion does not claim to preserve D2 color styling; exact supported hex-color resolution is future work.

Reject sequences, SQL tables/classes, endpoint labels, specialized arrows and boards/layers/scenarios/steps. Sequence layout introduces synthetic lifeline endpoints; SQL connections can carry column information outside the target’s simple src/dst pair. A later board picker must choose one board, not merge all views or silently select the root. [S10–S13]

### 2.5 Families that must not be advertised as general graph support

| Foreign family | Native fit | Initial result / next scope |
|---|---|---|
| Mermaid flowchart; DOT ordinary graph; D2 ordinary hierarchy | Good structural fit, within limits | Implement documented subset, report explicit losses. |
| Mermaid/PlantUML/D2 sequence | Native sequence subset exists | Current companions reject; add separate ordered message adapter. |
| Mermaid class/ER; PlantUML UML; D2 class/SQL | Members, relationship kinds, cardinality and endpoint identity need design | Reject now; explore cells + explicit relationship semantics. |
| Simple state transitions | Nodes/edges can depict them | Dedicated adapter only after initial/final, composite/concurrent, history and guard/action semantics are accounted for. |
| Mindmap/WBS | Tree is structurally compatible | Later family adapter with deterministic hierarchy and clear layout/style limits. |
| C4/Structurizr | Model/view/style/technology distinctions | Select a view and report metadata loss; do not import an entire workspace as one graph. |
| Gantt, timeline, pie, XY, Sankey, radar, quadrant, journey | Time/quantity/chart semantics absent | Unsupported-family error; no generic graph flattening. |
| Timing/waveforms, arbitrary vector drawings | Domain model absent | Defer. |
| Packet/bitfield diagrams | Native cells/bits offer a possible focused fit | Separate exploratory mapping, not evidence of full Mermaid/WaveDrom support. |

## 3. Additional major formats and staged coverage

### 3.1 Evidence of demand, with its limits

Popularity is not parser feasibility. GitHub stars are dated interest signals, not installations, market share, active users, or diagram-family frequencies. First-party metadata retrieved on 2026-10-31 showed Mermaid 90,939 stars, D2 25,770, PlantUML 13,388, DBML 3,721 and nomnoml 2,840. The newly consolidated Structurizr repository had 510; it is not comparable with long-lived repositories because history is split. Official GitHub Mermaid support, PlantUML integration listings, and the dbdiagram/dbdocs ecosystem add adoption evidence. No comparable market-share data or importer demand telemetry was established. [S14–S17]

| Priority after the first graph adapters | Why it is valuable | Parser feasibility and honest coverage |
|---|---|---|
| **Bounded Mermaid sequences — IMP-12, Build** | Already a prominent Mermaid family; draftably has native ordered sequence layout. | Reuse a pinned family-specific official DB facade; require exhaustive event-kind handling. No alt/loop/par/activation flattening. |
| **nomnoml — IMP-14, Build** | Smaller audience, but concentrated graph/UML-like input and a compact JS parse result give favorable effort/value. | `parse()` returns nodes, associations, compartments and directives. Use parse only; block imports. Map a stated association/compartment subset. |
| **DBML — IMP-15, Explore** | Direct database-diagram demand, maintained official ecosystem and structured schema parser. | Evaluate `@dbml/parse` versus `@dbml/core` v2. Preserve table/field IDs and reference endpoints; cardinality is not native `count`. |
| **PlantUML — IMP-16, Explore** | Large, mature ecosystem and broad family coverage make it a high-demand candidate. | There is current browser JS/WASM, but public rendering/check-syntax APIs are not a semantic graph. Start with a family/API spike, not a universal parser promise. |
| **Structurizr — IMP-17, Defer DSL / Explore JSON view** | Useful C4 architecture workflows, but multiple views and model semantics matter. | Official DSL parser is Java with optional files, URLs, scripts/plugins. Inert workspace JSON plus selected view is a smaller first boundary. |
| **WaveDrom / Pikchr — IMP-18, Defer** | Recognized text diagram tools in specific domains. | Timing waveforms and low-level drawing primitives need different native models. A bitfield-only WaveDrom experiment can be separate. |

nomnoml’s runtime exports `parse` although its published type surface does not declare all parser structure; write a small checked local declaration and pin the version. Its `compileFile` / `processImports` are unsuitable for untrusted single-file import. The inspected package is MIT, depends on graphre, and has a roughly 73 KB tracked distribution before graphre. That is a file measurement, not a complete minified application delta. [S18]

DBML’s current documented parser is `new Parser().parse(source, 'dbmlv2')`; older `dbml` parsing is deprecated in the inspected docs. `@dbml/core` includes SQL/import/export functionality and a larger dependency tree. `@dbml/parse` offers a narrower compiler/schema/diagnostic surface worth measuring. Both inspected v11 packages are Apache-2.0 with ESM/CJS exports; core declares Node >=16 and parse >=18. Browser source/playground evidence exists, but this research did not execute or bundle either. Never install `@dbml/connector` merely to read a source file. [S16, S19]

PlantUML is **not accurately described as Java-only today**. Current `@plantuml/core` uses TeaVM-compiled browser JavaScript, with a separate experimental Wasm GC build; npm releases since 1.2026.6 use the MIT variant. Java distributions have variant-specific licensing. The separate headless/MCP package exposes version, syntax checks, SVG rendering and explanations, not an established universal graph AST. Source includes runtime resource loaders, so “browser-only” does not mean “no network.” A limited parser is justified only for a declared small sequence grammar, full-input consumption, useful spans, and explicit rejection of preprocessors/macros/includes and unsupported events. [S15, S20]

Structurizr’s parser moved from older archived projects into the active consolidated repository. Its restricted mode is not enough by itself: current feature switches still require explicit HTTP/HTTPS policy. Reject scripts, plugins, local includes, workspace extensions, environment access and remote retrieval unless a future explicit trusted mode is designed. The current parser is Apache-2.0 and requires Java 21; there is no need to add that runtime for this personal project’s first import release. [S21]

For the deferred drawing domains, WaveDrom’s inspected source is MIT, declares Node >=20 and uses JSON5; consume data without evaluating JavaScript. Pikchr is a BSD-0-Clause C89 implementation using libc, with drawing primitives rather than a diagram-meaning AST. Neither runtime was bundled or benchmarked here. [S26]

### 3.2 Staged support promise

1. **Stage A:** native undirected prerequisite; DOT core; Mermaid flowcharts; shared diagnostics/detection; safe CLI import; recoverable browser scratch flow.
2. **Stage B:** strict basic Mermaid sequences and bounded nomnoml; optional D2 ordinary graphs if runtime gates pass.
3. **Stage C:** DBML and typed field/member relationships; selected state/mindmap/C4 families; explicitly selected full-DOT backend if demonstrated need.
4. **Separate research:** PlantUML semantic family API, D2 semantic-only WASM, Structurizr selected JSON views.
5. **No current commitment:** full foreign-language coverage, arbitrary preprocessors/resources, quantitative charts, waveform timing, foreign writing.

Treat the published feature matrix as part of the product contract. Parser updates are compatibility changes requiring fixture gates, not routine caret-range upgrades.

## 4. Parser/compiler choices, cost and safety

### 4.1 Comparison of mature options

| Option, checked version | Structured data and errors | Browser / Node and maintenance | License/dependency implications | Recommendation |
|---|---|---|---|---|
| `@ts-graphviz/ast 3.0.10` | Location-bearing syntax AST and configurable input/AST/nesting/chain limits. Defaults/strict/set/cluster semantics remain adapter work. Known grammar gaps. | ESM JS suitable for browser workers and Node >=20. Recent October 2026 releases; limits/security fixes are relevant. | MIT; runtime `@ts-graphviz/common`, also MIT. No Graphviz executable required. | **Build**, core dialect. |
| `graphlib-dot` | Returns a Graphlib graph; some semantics resolved, but original syntax and loss evidence disappear. Group membership/empty subgraphs have modeling compromises. | CommonJS plus graphlib. Inspected source snapshot last changed in 2023; repository package says 1.0.3-pre, not evidence of latest npm version. | MIT; graphlib dependency. | Do not choose over AST merely to save evaluator code. |
| `@viz-js/viz 3.31.0` / Graphviz 16.1.0 | Graphviz JSON/dot_json output plus warnings/errors, not a source AST. Full Graphviz grammar. | Browser/Node WASM, active September 2026 release. Wrapper’s render path still runs layout even for dot_json. | Wrapper MIT, bundled Graphviz EPL-2.0, Expat MIT, preserve binary notices. | **Explore** optional explicit backend. |
| `mermaid 12.2.0` | Public `parse` validates and returns diagram type/config; internal `getDiagramFromText().db` provides usable family data. Must guard structure and clear state. | Browser DOM with ES2024 bundles (upstream aims at Safari17.4+); Node parse needs a DOM shim in tested strict mode. Actively maintained October 2026 release. Node package floor >=22.12.0. | MIT wrapper/source; actual lock includes elkjs EPL-2.0 and DOMPurify MPL-2.0 OR Apache-2.0. JSDOM adds dependencies and a higher Node floor. | **Build** flowchart facade with hard gates. |
| `@mermaid-js/parser 2.0.1` | Public structured parser, but **no flowchart, sequence, class, state or ER** in the checked release. | Modern JS/TS/Langium family parsers. Current October release; family coverage must be checked individually. | MIT; standalone parser dependency graph still needs accounting. | Use only for a supported future family; not a flowchart replacement. |
| `@d2lang/d2 0.1.34`, D2 v0.9.0 | CompileResponse includes target shapes/connections and compiler metadata. Resolve semantics with official compiler; guarded join required. Compile errors include source context. | Browser worker / Node worker_threads, ESM/CJS. Compilation includes layout. New organization/nonprofit maintenance context; recent release, no abandonment inference. | MPL-2.0 plus bundled Go/layout/font/rendering notices, including EPL/Apache/MIT material. Empty npm dependency list does not mean no bundled dependencies. | **Explore**, optional. |
| `@plantuml/core` current MIT JS variant | Rendering API; no demonstrated public universal semantic AST. Syntax validation/explanation elsewhere is insufficient. | Browser TeaVM JavaScript; separate experimental Wasm GC build and separate headless implementation for Node. Current releases actively maintained. | Current npm MIT variant; Java license variants differ. Bundle and AST feasibility not measured here. | **Explore** by family. |

Sources: [S1–S13, S20, S22–S24]. License descriptions are artifact-specific; shipping notices and source obligations must follow the exact released package/build, not only a repository badge.

### 4.2 What the measurements actually show

**Measured on this environment, Node 24.22.1/Linux.** These are reproducible package/probe observations, not comparable end-user benchmarks or a promise about draftably’s final Vite chunks.

| Measurement | Raw bytes | Gzip bytes | Interpretation |
|---|---:|---:|---|
| DOT AST `lib/ast.js` | 116,438 | 20,680 | Published JS file; not the final minified app delta. |
| Mermaid minified ESM static entry closure | 712,477 | 184,751 | esbuild 0.28.2, split build, sum of per-file gzip. |
| Mermaid entry + flowchart static closure | 780,022 | 207,152 | Relevant parse-path reachability; dynamic families excluded. |
| All Mermaid emitted chunks | 5,180,446 | 1,507,024 | 106 files; not all downloaded for one flowchart. |
| Viz ESM distribution | 1,188,719 | 471,109 | Wrapper/WASM distribution measurement, not integration delta. |
| D2 browser entry | 11,514,165 | 8,558,342 | Dominant optional-browser cost. |
| D2 Node WASM file | 42,117,145 | 11,598,525 | Binary file only, not total installation footprint. |

A sampled Mermaid dynamic module import took roughly 496 ms; simple/warm controlled parses were about 4–21 ms, before product worker/DOM startup accounting. D2 cold worker-plus-two-node compilation measured 456/512/460 ms; warm compilation 6.5/11.4/6.3 ms. These one-host observations justify lazy loading and benchmarking; they do not establish production p95 or mobile behavior. The project’s own documented budgets are 200 ms interactive work and 1 s document load; measure complete import-to-editable behavior against those budgets. [R10]

Bare Node Mermaid strict parsing failed with `DOMPurify.sanitize is not a function`. Creating JSDOM before dynamic Mermaid import made the tested cases work. JSDOM 30.1.3 requires `^22.22.2 || ^24.15.0 || >=26.0.0`, while draftably’s baseline floor is 22.21.0. This is an integration decision: raise the declared/package-tested floor, isolate an optional Node importer, or prove an alternative DOM shim. Do not install the companion’s dependencies and assume the baseline runtime promise is unchanged. [S1, S25, R11]

Viz-specific probes also matter: `renderJSON` forces JSON output; using `render(..., {format:'dot_json'})` still invokes wrapper layout. A source containing two top-level graphs was accepted with only the first used. nop/nop2 produced missing-position errors rather than a clean semantic-only workaround. Any Viz backend needs one-graph framing, explicit error inspection even on success, and its own behavior fixtures. It is not a silent fallback when the AST adapter rejects syntax. [S23]

### 4.3 Untrusted input and external resources

**Proposal IMP-09, with implemented boundaries called out:**

- Use bounded decoding before parsing. The common companion cap is 256 KiB UTF-8; Mermaid’s facade is stricter at 100,000 bytes. Limit objects to 500, edges to 1,200, hierarchy to 12, each label to 16,384 characters, total label bytes and emitted native source to 1 MiB each, and emitted source to the native parser’s 300,000-character limit (JavaScript string length).
- Check Cartesian expansions before allocating edges. Count unique endpoint-set members correctly. Limit AST depth and chain size independently; a short source can expand dramatically.
- Run parsers in terminable workers/processes. The supplied Mermaid Node provider has an actual worker deadline and V8 memory settings. Those are not an OS sandbox or complete native-memory cap.
- The supplied browser Mermaid provider requires a DOM and does **not** have a hard CPU watchdog. A timeout Promise cannot interrupt synchronous parsing. Bare Web Worker use is not a drop-in solution. Browser isolation/responsiveness is explicitly unfinished.
- Official D2 creates its own worker, but the companion does not have hard bootstrap/compile termination or memory containment. `dispose()` depends on initialization; a Promise race is not a hard deadline. Keep the experimental entry point opt-in and use controlled fixtures until supervised.
- Reject Mermaid frontmatter/config directives in the first profile. Never call render, bind callbacks, inject CSS or adopt parsed label DOM. Parse-only strict configuration is part of the boundary, not a universal guarantee about future versions.
- DOT uses pure syntax parsing. Never invoke `dot`, gvpr, arbitrary shell commands or plugin adapters; never read image/font/shapefile paths from attributes.
- D2 receives only a fixed one-file virtual filesystem. Missing includes fail. Do not expose host paths, mount a folder automatically, fetch URLs, call render, or write the compiler’s returned formatted filesystem. Bundled layout selection is different from executing arbitrary external plugins.
- PlantUML and Structurizr need explicit preprocessor/file/network/plugin/script policy before use. Browser rendering alone does not prove resource isolation.
- Use inert text and explicit hex-color subsets. Report URLs/assets as omitted; do not activate native href merely because a source named it.
- Keep Map-based identity tables and own-property checks. Tests cover reserved IDs and prototype-like filename/fence hints. Guard unexpected API fields; never accept a changed compiler schema silently.
- Deny all network in package fixtures and repeat on upgrades. The supplied D2 probe verified the denial hook in main and worker and saw no attempted requests across its controlled fixtures. Mermaid parse probes also saw no fetch and inserted no body DOM. These are exercised-path observations, not a complete sandbox proof.

Bundled code loaded on demand is not the same as a URL embedded in foreign input. Client-only operation can use shipped lazy chunks; it must not upload the diagram to an external rendering service.

## 5. Buildable implementation and companions

### 5.1 What is complete, partial, or proposed

| Artifact/work | Status |
|---|---|
| `native-undirected.patch` | Complete, applicable prerequisite patch; tested in an isolated copy, not applied to the original repository. |
| `import-core.ts`, `detect.ts`, `safe-output.ts` | Working shared helpers with meaningful contract/resource/path tests. Native validation is mandatory at output handoff. |
| `dot-importer.ts` | Working partial DOT-core importer, scoped semantic evaluation, guarded unsupported forms, fixtures. |
| Mermaid facade/providers/mapper | Working Node flowchart path and native lowering; browser provider typechecks but production browser isolation is partial. |
| D2 normalizer/mapper | Working partial ordinary-graph mapping using official compiler; compiler entry point remains experimental. |
| `import-demo.ts` | Working research CLI harness; reads a trusted native checkout for validation. It is not the production `draftably import` implementation. |
| Fixture generators, inputs, expected JSON, native outputs | Executed controlled fixtures; failed cases have no output source. Regenerators are not correctness oracles—handwritten invariant tests remain authoritative. |
| `native-validation.ts` | Working harness validating checked-in emitted source/facts through chosen exact-ref or patched native compiler. |
| Production UI/session/CLI/site integration | Proposed in the ordered plan, not implemented. |
| Mermaid sequence, nomnoml, DBML, PlantUML, full DOT backend | Explicit future scope; no pseudocode is represented as completed parser support. |

### 5.2 Setup and use

The kit pins dependencies and includes a pnpm lockfile. Its Node range reflects JSDOM, not draftably’s unchanged baseline promise.

```bash
cd adapter-kit
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm test

# Validate directed fixtures against the untouched baseline.
DRAFTABLY_ROOT=/absolute/path/to/draftably pnpm test:native

# Research CLI example; output must not exist.
DRAFTABLY_ROOT=/absolute/path/to/draftably \
  pnpm demo fixtures/dot/nested.dot --from dot --output /tmp/imported.draft

# Native prerequisite applied only to a separate reviewed worktree/copy:
DRAFTABLY_ROOT=/absolute/path/to/patched-draftably \
DRAFTABLY_APPLIED_REQUIREMENTS=IMP-02-native-undirected \
DRAFTABLY_FULL_LAYOUT=1 pnpm test:native
```

The trusted native checkout needs its own dependencies installed with its lockfile. All production imports should lazy-load parser dependencies. The research kit installs all measured adapters together for reproducibility; this is not a recommendation to add every compiler to draftably’s initial application bundle or published CLI.

The kit has no foreign-format writer. Its output demo uses `wx`, validates native source first, and emits diagnostics separately. It deliberately fails an undirected result against the unpatched native baseline.

### 5.3 Verification actually performed

A clean frozen-lockfile install and strict TypeScript build passed on Node 24.22.1. The final `pnpm test` run reported **61 passing runner entries, zero failures**: 60 registered tests plus one facade file with three logged assertion groups. Across **38 fixtures**, 22 produce native documents and 16 fail atomically. Full native `compile` + `projectScene` passed **19 outputs on the untouched baseline**, explicitly skipping the three requiring IMP-02, and **all 22 outputs on the patched copy**; both runs checked all 16 rejection snapshots with zero failures. The working DOT and Mermaid demo commands also created separately validated native files.

Meaningful cases include scoped defaults, strict/non-strict multiplicity, endpoint-set deduplication, nested groups, quoted/reserved IDs, literal escaping, port precedence, hidden arrowhead direction, malformed syntax, unsupported families, unsafe resources, source-rule snapshots and graph/output limits.

The native patch passed `git apply --check`. Five focused native suites passed 61 tests: ten new direction regressions plus existing DSL, translation, sequence and comparison tests. Six DOT integration cases additionally survived native compile/project, an unrelated node-label edit, print and reload with edge direction/multiplicity/ports/constraints preserved.

No claim is made that full `pnpm check`, complete engine suites, production Vite builds, Safari/Firefox/mobile behavior, browser interaction proofs, p95 performance, or installed CLI packaging have passed. Those are concrete integration milestones in the companion plan. The original exact-ref checkout remains clean.

## Evidence ledger

### Repository sources: all links pinned to the requested ref

- **R1 — Product and architecture:** [README.md](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/README.md), [docs/ARCHITECTURE.md](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/docs/ARCHITECTURE.md).
- **R2 — Model and validation:** [src/model/types.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/model/types.ts), [src/model/document.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/model/document.ts), symbols `Diagram`, `DiagramEdge`, `Direction`, `normalize`.
- **R3 — Source/edit authority:** [src/dsl/compile.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/dsl/compile.ts), [project.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/dsl/project.ts), [translate.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/dsl/translate.ts), [state/file-session.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/state/file-session.ts); `compile`, `checkSource`, `projectScene`, `translateEdit`, `showSource`, `openExampleSession`, `keepScratch`, `settleSave`.
- **R4 — Rendering:** [src/cli/svg.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/cli/svg.ts), [src/components/scene/EdgeView.tsx](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/components/scene/EdgeView.tsx).
- **R5 — Editor entry points:** [src/state/files.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/state/files.ts), [keyboard.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/state/keyboard.ts), [commands.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/state/commands.ts), [src/App.tsx](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/App.tsx), [FileNotes.tsx](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/components/FileNotes.tsx).
- **R6 — Public site:** [site/reopen.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/site/reopen.ts), [site/Shell.tsx](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/site/Shell.tsx), [site/play/Playground.tsx](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/site/play/Playground.tsx).
- **R7 — Save boundary:** [src/server/file-session.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/server/file-session.ts), [workspace.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/server/workspace.ts), [src/state/launch.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/state/launch.ts); `createFileSession`, `createDiagramFile`.
- **R8 — CLI:** [src/cli/main.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/cli/main.ts), [open.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/cli/open.ts); `main`, `read`, native mutation dispatch.
- **R9 — Language:** [docs/DSL.md](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/docs/DSL.md), [src/dsl/syntax.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/src/dsl/syntax.ts); `ModelEdge`, `readSource`, `validate`, `parseModel`.
- **R10 — Required validation:** [AGENTS.md](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/AGENTS.md), [docs/CHECKS.md](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/docs/CHECKS.md), [FEEL.md](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/docs/intent/diagram-quality/FEEL.md).
- **R11 — Toolchain/package:** [package.json](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/package.json), [pnpm-lock.yaml](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/pnpm-lock.yaml), [packages/cli](https://github.com/byronwall/draftably/tree/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/packages/cli).
- **R12 — Related history/plans:** [docs/IMPORT.md](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/docs/IMPORT.md), [diagram-primitives](https://github.com/byronwall/draftably/tree/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/docs/intent/diagram-primitives), [diagram-structure](https://github.com/byronwall/draftably/tree/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/docs/intent/diagram-structure), [layout-in-files/plan.md](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/docs/intent/layout-in-files/plan.md).
- **R13 — Representative examples/tests:** [examples](https://github.com/byronwall/draftably/tree/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/examples), [tests/dsl.test.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/tests/dsl.test.ts), [tests/translate.test.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/tests/translate.test.ts), [tests/sequence.test.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/tests/sequence.test.ts), [tests/file-session.test.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/tests/file-session.test.ts), [tests/cli.test.ts](https://github.com/byronwall/draftably/blob/dd2ababcbe3b9ac011bc23e652309c10cf31cd02/tests/cli.test.ts).

### Current primary external sources

- **S1 — Mermaid release/runtime/license:** [12.2.0 release](https://github.com/mermaid-js/mermaid/releases/tag/mermaid%4012.2.0), [release package manifest](https://github.com/mermaid-js/mermaid/blob/mermaid%4012.2.0/packages/mermaid/package.json), [MIT license](https://github.com/mermaid-js/mermaid/blob/mermaid%4012.2.0/LICENSE).
- **S2 — Mermaid API and families:** [usage/API](https://mermaid.ai/open-source/config/usage.html), [mermaidAPI.ts](https://github.com/mermaid-js/mermaid/blob/mermaid%4012.2.0/packages/mermaid/src/mermaidAPI.ts), [Diagram.ts](https://github.com/mermaid-js/mermaid/blob/mermaid%4012.2.0/packages/mermaid/src/Diagram.ts), [released parser 2.0.1 overloads](https://github.com/mermaid-js/mermaid/blob/%40mermaid-js/parser%402.0.1/packages/parser/src/parse.ts).
- **S3 — Flow data:** [flowDb.ts](https://github.com/mermaid-js/mermaid/blob/mermaid%4012.2.0/packages/mermaid/src/diagrams/flowchart/flowDb.ts), [flow types](https://github.com/mermaid-js/mermaid/blob/mermaid%4012.2.0/packages/mermaid/src/diagrams/flowchart/types.ts), [flowchart syntax](https://mermaid.js.org/syntax/flowchart.html).
- **S4 — Mermaid layout and DOM:** [Dagre graph extraction](https://github.com/mermaid-js/mermaid/blob/mermaid%4012.2.0/packages/mermaid/src/rendering-util/layout-algorithms/dagre/mermaid-graphlib.js), [common sanitization](https://github.com/mermaid-js/mermaid/blob/mermaid%4012.2.0/packages/mermaid/src/diagrams/common/common.ts), [Node discussion](https://github.com/mermaid-js/mermaid/issues/6531).
- **S5 — DOT language:** [normative language](https://graphviz.org/doc/info/lang/), [subgraphs](https://graphviz.org/docs/attrs/cluster/), [rankdir](https://graphviz.org/docs/attrs/rankdir/).
- **S6 — AST implementation:** [types](https://github.com/ts-graphviz/ts-graphviz/blob/6b90db1e687f5b7d76dd8e16c2374f686c0cff5c/packages/ast/src/types.ts), [parser options](https://github.com/ts-graphviz/ts-graphviz/blob/6b90db1e687f5b7d76dd8e16c2374f686c0cff5c/packages/ast/src/dot-shim/parser/parse.ts), [grammar](https://github.com/ts-graphviz/ts-graphviz/blob/6b90db1e687f5b7d76dd8e16c2374f686c0cff5c/packages/ast/src/dot-shim/parser/dot.peggy).
- **S7 — DOT labels:** [escString](https://graphviz.org/docs/attr-types/escString/), [label](https://graphviz.org/docs/attrs/label/), [node shapes/HTML labels](https://graphviz.org/doc/info/shapes.html).
- **S8 — DOT attributes:** [dir](https://graphviz.org/docs/attrs/dir/), [headport](https://graphviz.org/docs/attrs/headport/), [constraint](https://graphviz.org/docs/attrs/constraint/), [attribute types/list](https://graphviz.org/doc/info/attrs.html).
- **S9 — AST package:** [npm official package](https://www.npmjs.com/package/@ts-graphviz/ast), [source package](https://github.com/ts-graphviz/ts-graphviz/blob/6b90db1e687f5b7d76dd8e16c2374f686c0cff5c/packages/ast/package.json), [repository license](https://github.com/ts-graphviz/ts-graphviz/blob/6b90db1e687f5b7d76dd8e16c2374f686c0cff5c/LICENSE).
- **S10 — D2 JS API:** [README](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2js/js/README.md), [index.d.ts](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2js/js/index.d.ts), [wrapper](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2js/js/src/index.js).
- **S11 — D2 graph/serialization:** [graph fields](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2graph/d2graph.go), [SerializeGraph](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2graph/serde.go), [exporter](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2exporter/export.go).
- **S12 — D2 execution:** [WASM functions](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2js/d2wasm/functions.go), [compiler](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2compiler/compile.go), [in-memory filesystem](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/lib/memfs/memfs.go).
- **S13 — D2 release/licenses:** [0.9.0](https://d2lang.com/releases/0.9.0/), [TALA is open source](https://d2lang.com/blog/tala-is-open-source/), [third-party notices](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/d2js/js/THIRD_PARTY_NOTICES.txt), [go.mod](https://github.com/d2lang/d2/blob/6a7b4837838a3907604a1d9eec57ee98b6f3cd01/go.mod).
- **S14 — Dated adoption signals:** GitHub REST repository metadata for [Mermaid](https://api.github.com/repos/mermaid-js/mermaid), [D2](https://api.github.com/repos/d2lang/d2), [PlantUML](https://api.github.com/repos/plantuml/plantuml), [DBML](https://api.github.com/repos/holistics/dbml), [nomnoml](https://api.github.com/repos/skanaar/nomnoml), [Structurizr](https://api.github.com/repos/structurizr/structurizr), retrieved 2026-10-31; these endpoints will subsequently change.
- **S15 — PlantUML adoption/current release:** [integration list](https://plantuml.com/running), [news](https://plantuml.com/news).
- **S16 — DBML:** [core API](https://dbml.dbdiagram.io/js-module/core/), [ecosystem](https://dbml.dbdiagram.io/ecosystem/), [source at inspected ref](https://github.com/holistics/dbml/tree/7a62c58accdbf0a2e890d5e087a7f869821053c2).
- **S17 — Mermaid in GitHub:** [GitHub diagram documentation](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams).
- **S18 — nomnoml:** [runtime exports](https://github.com/skanaar/nomnoml/blob/3f30d38556e93b89231d7c11ef7ef93faf525d90/src/index.ts), [parser](https://github.com/skanaar/nomnoml/blob/3f30d38556e93b89231d7c11ef7ef93faf525d90/src/parser.ts), [package](https://github.com/skanaar/nomnoml/blob/3f30d38556e93b89231d7c11ef7ef93faf525d90/package.json).
- **S19 — DBML packages:** [core package](https://github.com/holistics/dbml/blob/7a62c58accdbf0a2e890d5e087a7f869821053c2/packages/dbml-core/package.json), [parse package](https://github.com/holistics/dbml/blob/7a62c58accdbf0a2e890d5e087a7f869821053c2/packages/dbml-parse/package.json).
- **S20 — PlantUML runtime/licenses/security:** [JS package README template](https://github.com/plantuml/plantuml/blob/a6420f610eb8362d758becd66607c7f8d40e3edc/license-variants/plantuml-mit/npm/README.md.tmpl), [license variants](https://github.com/plantuml/plantuml/blob/a6420f610eb8362d758becd66607c7f8d40e3edc/LICENSES.md), [security profiles](https://plantuml.com/security), [headless/MCP API](https://github.com/plantuml/plantuml/blob/a6420f610eb8362d758becd66607c7f8d40e3edc/plantuml-mcp-js/README.md).
- **S21 — Structurizr:** [parser documentation](https://docs.structurizr.com/dsl/parser), [active consolidated source](https://github.com/structurizr/structurizr), [DSL language](https://docs.structurizr.com/dsl/language), [parser feature switches](https://github.com/structurizr/structurizr/blob/main/structurizr-dsl/src/main/java/com/structurizr/dsl/StructurizrDslParser.java), [Features.java](https://github.com/structurizr/structurizr/blob/main/structurizr-dsl/src/main/java/com/structurizr/dsl/Features.java) (current source checked 2026-10-31).
- **S22 — graphlib-dot:** [build-graph implementation](https://github.com/dagrejs/graphlib-dot/blob/8649330a05fd6599929acfc9d5a1cf23f04256bc/lib/build-graph.js), [package](https://github.com/dagrejs/graphlib-dot/blob/8649330a05fd6599929acfc9d5a1cf23f04256bc/package.json).
- **S23 — Viz/Graphviz:** [Viz API](https://viz-js.com/api/), [release 3.31.0](https://github.com/mdaines/viz-js/releases/tag/release-viz-3.31.0), [Graphviz JSON formats](https://graphviz.org/docs/outputs/json/), [Graphviz license](https://graphviz.org/license/), [Viz license](https://github.com/mdaines/viz-js/blob/release-viz-3.31.0/LICENSE).
- **S24 — Transitive license examples:** [ELK](https://github.com/kieler/elkjs/blob/master/LICENSE.md), [DOMPurify](https://github.com/cure53/DOMPurify/blob/main/LICENSE).
- **S25 — JSDOM 30.1.3:** [manifest and Node requirement](https://github.com/jsdom/jsdom/blob/v30.1.3/package.json), [license](https://github.com/jsdom/jsdom/blob/v30.1.3/LICENSE.txt).
- **S26 — Other families:** [WaveDrom source](https://github.com/wavedrom/wavedrom), [Pikchr official source/docs](https://pikchr.org/home/doc/trunk/homepage.md).

## Access, files read, checked facts and remaining questions

**Access: confirmed.** No missing source packet blocks this research. The exact-ref checkout was left unchanged.

The mandatory files were inspected: `AGENTS.md`, `README.md`, `package.json`, `docs/ARCHITECTURE.md`, `docs/DSL.md`, `docs/CHECKS.md`; `src/model/types.ts` and `document.ts`; `src/state/files.ts`, `file-session.ts`, `launch.ts`; `src/dsl/syntax.ts`, `compile.ts`, `project.ts`, `translate.ts`; `src/cli/main.ts`; `src/server/file-session.ts`. The full native compile, syntax, translate and DSL files were read, including a final check of source-size and cells restrictions. Separate engine implementations were examined at relevant paths; this is not represented as a line-by-line review of every tracked file.

Related reads included state/document/editor/actions/commands/keyboard, CLI open/SVG, server/workspace, App/StartScreen/Menus/Dialogs/ExampleBar/FileNotes/FileBanner, source-hash, site/reopen/Shell/Playground, the lockfile and CLI packaging, comparisons/lanes, DSL/translate/sequence/model/CLI/file-session/workspace/open-reuse tests, and representative checkout, login-sequence, cells/layout examples.

Existing plans were searched before adding abstractions. `docs/IMPORT.md` records historical source-archive provenance, not a foreign syntax importer. Searches of source, docs, packages and lockfile found no existing parser registry for these formats. Older diagram-primitives scope explicitly excluded DOT; the present user request supersedes that old scope. Diagram-structure and layout-in-files plans favor one writable native language, which this proposal preserves. [R12]

**Checked:** native persistence mismatch, opening/save boundaries, parser APIs/grammar gaps, current versions/licenses, measured costs, controlled adapter fixtures, native patch and native fact preservation. **Proposed:** production CLI/UI/session integration, browser isolation, optional compiler packaging, additional families and release policy.

**Open implementation decisions, with defaults already recommended:**

1. Accept IMP-02, or explicitly block all undirected imports? Default: implement the tested additive native extension.
2. Raise CLI Node floor for JSDOM or isolate/prove another shim? Default: do not silently raise the existing package promise; make it an explicit packaging milestone.
3. Can a browser-safe Mermaid execution context meet responsiveness requirements? Default: keep that gate visible; Node worker success is not browser proof.
4. Is D2’s lazy download/startup acceptable for this project? Default: optional, explicitly enabled, measured before product inclusion.
5. Which richer meaning matters first: basic sequences, field references, endpoint markers, or C4 views? Default: bounded sequences, then nomnoml/DBML based on real import examples.

None requires changing the requested read-only scope. Re-import remains a new conversion; saving remains native.

