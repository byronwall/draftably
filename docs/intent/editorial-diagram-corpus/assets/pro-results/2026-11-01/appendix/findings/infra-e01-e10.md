# Computing/editorial subset findings — E01–E10

## Completion and selection

Ten accepted original diagrams from six independent publishers: Cloudflare (2), Stripe (2), GitHub (2), Figma (2), Vercel (1), Google/Chrome (1). The ten references span protocol sequences, synchronized timelines, layered architecture, repeated migration panels, deployment boundaries, process multiplicity, multiplexing comparisons, nested records, incremental state scenes, and a layered taxonomy. All originals are present. Two are original SVGs with PNG previews rendered through the supplied `shoot`; one original JPEG has a full-resolution raster conversion; the rest are original PNGs copied unchanged as previews. Exact URLs, hashes, authors, observed license, and figure descriptions are in each item.json/source.md.

The candidate fragment has ten accepts and three concrete rejects: a decorative Figma hero/related image, a Vercel ISR page whose fetched static image list provided no qualifying explanatory figure, and the light duplicate of the accepted Vercel dark transport figure. The actual inspected candidates are retained as intermediate research evidence, but full fetched article HTML is **not needed in the deliverable ZIP**. No reference comes from an engine gallery or an AI generation.

All thirty delivered .draft sources have successful actual check, JSON inspection, SVG export and supplied-shoot PNG execution. All ten v0 hashes were frozen before v1 authoring. All ten full references and all thirty native renders were visually inspected, then all ten full comparison sheets were inspected at publication scale. Per-case `detail-selection.json` specifies meaningful intrinsic-PNG crops; the parent runs those through supplied shoot. Neither the reference nor any custom overlay was imported into native drawings.

E06 (Chrome process architecture) and E10 (GitHub security layers) are confirmation cases. Their current outputs are evaluated, but their measurements must not choose numerical constants in a future engine fix.

## What the visual comparisons actually show

The best straightforward default is E01: two participants and six protocol flights make a coherent, high-contrast sequence immediately. Its readability is **comparable** to the reference for reading message names, with different strengths: native contrast and clear row order versus source meaningful colors and transit depiction. The source combines ACK and ClientHello at the TCP/TLS boundary; native phases remain schematic. This is a useful native default, not a claim of full temporal fidelity.

All nine other first renders are judged worse for the reference's reading task. This demanding selection is deliberately editorial. E10 still produces a useful three-by-three layer grid with only straightforward declarations. E06 native count=many conveys multiplicity well. E08 retains all field/value relationships in a compact source. Those are native capability wins even where the reference is the better diagram.

Refinement substantially improves structural correspondence: E03 now has full-width web/query bands; E04 retains identical service coordinates across migration stages; E07 restores three-versus-one TCP lanes; E09 recovers incremental-color meaning and stable panels. But a wide manually sized diagram often has very small labels at publication width. E03 and E08 demonstrate why matching box geometry is insufficient. E05 becomes closer in composition while retaining thin, small labels. Native labels do not grow just because the author enlarges panels.

No case is scored a 5 for reference fidelity or standalone quality. These are editable native attempts with visible losses. Independent quality/fidelity/semantic ratings and all six requested dimensions are in review.json and audit.md. Do not mistake successful check exit codes for visual success.

## Effort and honest iteration limits

The final sources range from 15 to 96 non-comment lines. E02 needs 15 pins plus 15 exact sizes for a shared time scale. E04 needs 19 pins and 19 exact object sizes to maintain repeated panel coordinates, plus minimum panel height. E09 needs 21 pins and 21 sizes plus nine minimum panel sizes. E07 contains 24 directed edges for twelve source duplex links. E10 needs no pins, but nine captions require notes and reserved container height.

Authoring time was **not measured**. Recorded wall times are subprocess execution only. `effort.json` and root `effort.csv` use the same `scripts/aggregate.py:effort` function, avoiding incompatible counting conventions. Counts include notes with explicit widths as manual-size lines and distinguish styling statements from assignments.

Six cases used two cycles after v0. E05, E06, E08, and E09 used three. E09 cycle 1 incorrectly used per-node state=muted; all four commands failed and the trial is retained. A valid v1 uses a neutral custom family. E05/E08 preserve an over-tall successful v2 before their final third refinement. E06 cycle 3 failed because x=-40 is outside the native pin range. The previous successful v2 source/render was restored verbatim and revalidated without another authoring cycle; v1 is the better compact communication version. These are authoring mistakes/effort limits, not evidence that the renderer cannot draw the desired topology. No fourth authoring cycle occurred.

## Provisional gap evidence for the parent audit

The keys below are subset-local and should map into the parent stable gap IDs. A common gap requires three accepted cases from at least two publishers; not every row meets that threshold. Some related issues should be split instead of padded into a broad category.

| Key | Evidence / frequency in this subset | Category and severity | Current workaround and cost | Source anchor / proposed proof |
| --- | --- | --- | --- | --- |
| I-TYPE | E03, E04, E08, E10, with E02/E05 also affected; GitHub, Figma, Stripe, Vercel | Common. Native typography/control exposure; high editorial impact | Global theme fonts plus separate notes; manually enlarged boxes make text relatively smaller. E10 uses nine notes, E08 nested cells. | `src/dsl/syntax.ts` native node/theme fields; `src/cli/svg.ts:sceneMarkup` renders groupTitle/title tokens. Build limited semantic type roles and group-header alignment/scale; prove E03/E08/E10 at equal publication width without extra semantic nodes. |
| I-PANEL-GEOMETRY | E02, E03, E04, E09, E10; three publishers | Common. Awkward controls / missing concise repeated-panel intent; high author cost | Per-object pins/sizes and min-width/min-height. E04 38 object geometry lines; E09 42 plus nine panel minima. | `src/dsl/compile.ts`, `src/dsl/cells.ts`, `src/dsl/frame.ts`, syntax refinements. Explore equal-track/fixed-footprint comparison structure; preserve current automatic sizing by default. Prove panel correspondence after a label edit without editing every snapshot. |
| I-EDGE-COLOR | E01, E02, E05; Cloudflare, Stripe, Vercel | Common. Missing direct semantic edge paint; medium/high | Global connection color, labels, or dashed response convention. Do not misuse change marks to obtain colors. | `src/dsl/syntax.ts:ModelEdge` and edge allow-list; `src/model/types.ts:DiagramEdge`; `src/cli/svg.ts` route paint. Build native edge color/family if model support is added consistently; prove role color survives export without status semantics. |
| I-VISUAL-VOCAB | E01, E04, E05, E06, E07, E09; five publishers | Common broad pressure, but split into **native icon/image exposure** and **missing geometric shapes** | Labels replace device/file/thread icons; pills replace cylinders; diamond/pill substitute octagon/path. Real semantic losses in E06/E09. | `src/dsl/syntax.ts:DslShape` explicitly excludes icon/image although `src/model/types.ts:ShapeKind` includes them. `DSL_SHAPES` and `src/cli/svg.ts:outline` have six native shapes. Explore safe native icon/image exposure; build common cylinder only if wider corpus confirms; defer arbitrary freeform illustration. Never use reference-as-background. |
| I-GROUP-ROUTING | E04v0 next1 through two child nodes; E05v0 group-origin paths through Node.js; E07v0 several group endpoint paths through child resources; three publishers | Common observed routing failure, mixed with authoring/order choices; high on affected first renders | Explicit sides, correct declaration/order, then pins. v2 checks clear but route quality still differs. | `src/model/routes.ts:routeInput`, `computeRoutes`, `drawRoutes`; `src/dsl/conflicts.ts`. Build regression cases for boxed-group endpoint paths avoiding their own descendants/headers where feasible. Do not claim E07's entire initial tangle is an engine defect. |
| I-LABEL-EXPOSURE | E01 external message blocks, E03 leader captions, E08 type/route captions, E10 attached captions; multiple publishers | Common pressure for explicit annotation/label roles; avoid claiming all subfeatures absent | Native notes with near/side/width; manual reserved room; external labels stay heavier note panels | `src/model/types.ts:LabelLayout`/`EdgeLayout` already expose modes, leaders, offsets, waypoints. Parent read `src/model/labels.ts`. Native syntax does not serialize those controls. Build a small deliberate exposure rather than a second renderer. Proof: E03 leader caption and E10 component/caption card with semantic graph unchanged. |
| I-DUPLEX | E05, E07; two publishers, **not common yet** | Stress-case missing two-ended arrowhead semantics | Double edges: 24 in E07 versus twelve reference links, route competition | `docs/DSL.md` Undirected connections; native `directed` true/false is one-ended/no-ended. Explore an explicit bidirectional option; prove one centerline, two heads, one label, no hidden duplicate adjacency. |
| I-TIME | E01, E02; two publishers, **not common yet** | Stress-case missing timed-sequence/timeline representation | Durations as labels in E01; 30 geometry statements in E02 | `src/dsl/compile.ts:sequenced`; `src/model/routes.ts:messageRoute` has same y at both ends. Explore a shared time-axis recipe after editorial priorities, not generalized charting. |
| I-NOTE-LAYOUT | E03 and E10; same publisher here, **not common alone** | Notes intentionally do not reserve space; awkward caption usage | E03 near/align and widths; E10 minimum layer height | `src/model/note.ts:placeNotes` searches nine spots, does not move nodes. Explore optional attached-caption footprint; preserve overlay note behavior. |
| I-DARK-NOTE | E05 here; parent also observed E23, two publishers/two cases, **not common yet** | Concrete default contrast defect; high in dark notes | One `theme-color slate shade=50` override fixes visible contrast | `src/model/note.ts:noteMarkup` uses slate-50 fill with look.text. Build theme-aware note surface/ink pairing; prove all five themes and dark custom overrides. |

## Preserve these baseline strengths

- Sequence file order, reliable bundled-message wrapping, and native phase bands produce a useful E01 without pins.
- Native groups/rows/columns carry E10's semantic hierarchy with little source. No fake graph edges were needed for the taxonomy.
- Count badges and stack plates convey process multiplicity in E06.
- Theme families and contrast-conscious swatches permit faithful role color without manual SVG edits.
- Cells reduce E08's record-value box clutter, and explicit ports/order are useful real controls.
- Check diagnostics identify note and group-path collisions; successful refined checks are evidence of resolving those concrete warnings, not a substitute for visual review.
- Original source, embedded fonts, geometry output, SVG, PNG and hashes make the experiment reproducible. Internal model features should be exposed selectively rather than reinvented.

## Priority dispositions

**Build:** targeted typography/header/caption roles, semantic edge paint, group-endpoint routing regressions, and theme-aware note contrast. They have either common multi-publisher evidence or a narrow demonstrated bug. Start with source serialization/model/render parity tests, then publication-scale image checks.

**Explore:** concise comparison-panel footprints, attached captions/label exposure, bidirectional connectors, native image/icon authoring, and temporal layouts. Keep semantic graph/containment distinct from editorial framing and measure source reduction plus label-edit resilience.

**Defer:** exact proprietary font matching, hand-drawn line imitation, arbitrary freeform artwork, and database shadow/extrusion effects until core hierarchy and route semantics are sound. E06/E09 should remain candid stress cases.

**Avoid:** importing originals as native backgrounds, using change status to encode unrelated edge categories, inventing hidden nodes to paint decorative lines, enlarging every panel while leaving type unchanged, or treating a no-warning check as publication quality.

## Evidence boundary and remaining local work

No renderer work for this subset remains merely predicted: thirty delivered attempts are actually validated/rendered. Future application improvements are proposals only. Source-packet files were not changed. Parent aggregation/sealing must include all current manifests and retained failures, exclude full research article HTML, verify immutable baseline/v0 hashes, and include the parent-generated detail crops. Publication rights for nine unknown-license sources remain unknown; the corpus is retained for the requested study, not published.

## Independent review qualifications

Cross-review identified two retained semantic qualifications. E05 has all intended endpoints, but the native global solid=request legend overgeneralizes the neutral duplex API/VM HTTP exchange; its solid return is an exception. This is an authoring residual, so final semantic rating is 4, not 5. E08 preserves every named field and read, but the source stack marks may carry collection/record multiplicity; the missing cue is conservatively rated semantic4 at every stage. Large manually chosen bands/frames in E03/E04/E05/E08 also contribute to small labels at publication width; this authoring choice is kept causally separate from missing local typography controls.
