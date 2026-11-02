# Authoring effort and metric audit

All counts below come from the retained `.draft` sources. Authoring minutes were not tracked. Source burden is measured; cognitive difficulty, resilience to label edits and future effort reductions are judgments or proposals. The baseline and frozen defaults were not changed to improve these totals.

## Counting rules

`scripts/aggregate.py` excludes blank and comment-only lines. Declarations are node/group/edge lines. Layout/refinement counts include documented ordering, alignment, sizing, position and routing controls; their union avoids double counting overlapping categories. Pins, nudges, stays, explicit-port lines, note widths, notes, legends, styling lines and individual styling assignments remain separate columns. Manual dimensions include exact sizes, group minimums, unit widths and explicit diagram/note widths. A line can contribute to several different descriptive columns; do not sum them into an invented total effort score.

All nineteen v1 dimensional lines are note widths, not exact node sizes. V0 has zero appearance overrides, pins, nudges and manual dimensions. V2 has zero nudges: explicit pins carry all manual positions. Style assignment counts may be much larger than style-line counts because each supported attribute is counted. Declared semantic shapes are not counted as styling overrides. Full definitions appear in `methodology.md` and the actual counting implementation is included.

## Stage totals and medians

| Metric | v0 total / median | v1 total / median | v2 total / median |
| --- | --- | --- | --- |
| Non-comment lines | 953 / 26.5 | 1146 / 30.5 | 1880 / 55 |
| Declarations | 814 / 23.5 | 824 / 23.5 | 839 / 24 |
| Layout/refinement union | 85 / 1 | 154 / 4 | 884 / 25.5 |
| Pins | 0 / 0 | 0 / 0 | 376 / 10 |
| Nudges | 0 / 0 | 0 / 0 | 0 / 0 |
| Dimensional lines | 0 / 0 | 19 / 0 | 441 / 13.5 |
| Styling assignments | 0 / 0 | 885 / 28 | 883 / 28 |
| Explicit-port lines | 0 / 0 | 27 / 0 | 180 / 0.5 |
| Notes | 24 / 0 | 34 / 0 | 32 / 0 |


The final sources total 1,880 non-comment lines versus 953 default lines, while declarations rise by only 25. Much of the extra source therefore specifies appearance and geometry around largely unchanged content. The median doubles from 26.5 to 55 lines; that is a ratio of medians, not the median of per-case ratios. The final range is 13–164 lines. Thirteen lines can still be a lossy solution (E26), so source size is not a proxy for completeness or quality.

## Per-case source burden

`Dimensions` is the broad line count defined above. An exact-node-size count quoted in an individual audit may be smaller because that audit separates note widths and group minimums. Port lines count edge declarations containing either side attribute, not individual `from`/`to` assignments.

| Case | Lines v0 / v1 / v2 | v2 declarations | v2 layout/refine | Pins | Dimensions | Port lines | Cycles |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [E01](corpus/cloudflare-tls-handshake/audit.md) | 11 / 14 / 15 | 8 | 1 | 0 | 0 | 0 | 2 |
| [E02](corpus/stripe-synchronized-retries/audit.md) | 36 / 41 / 71 | 30 | 34 | 15 | 15 | 0 | 2 |
| [E03](corpus/github-blackbird-query/audit.md) | 14 / 24 / 32 | 9 | 15 | 5 | 10 | 0 | 2 |
| [E04](corpus/figma-database-migration/audit.md) | 50 / 62 / 93 | 44 | 43 | 19 | 23 | 21 | 2 |
| [E05](corpus/vercel-fluid-transport/audit.md) | 17 / 26 / 35 | 15 | 13 | 5 | 8 | 3 | 3 |
| [E06](corpus/chrome-process-architecture/audit.md) | 13 / 19 / 25 | 11 | 11 | 5 | 5 | 0 | 3 |
| [E07](corpus/cloudflare-http2-multiplexing/audit.md) | 54 / 62 / 86 | 46 | 33 | 8 | 16 | 24 | 2 |
| [E08](corpus/stripe-read-compare/audit.md) | 15 / 25 / 29 | 13 | 9 | 3 | 5 | 2 | 3 |
| [E09](corpus/figma-journal-checkpoints/audit.md) | 46 / 54 / 96 | 32 | 54 | 21 | 30 | 0 | 3 |
| [E10](corpus/github-security-layers/audit.md) | 17 / 29 / 38 | 12 | 13 | 0 | 21 | 0 | 2 |
| [E11](corpus/e11-transformer-stacks/audit.md) | 36 / 45 / 68 | 33 | 31 | 15 | 14 | 16 | 3 |
| [E12](corpus/e12-lstm-recurrent-cell/audit.md) | 48 / 55 / 89 | 45 | 43 | 21 | 20 | 9 | 3 |
| [E13](corpus/e13-cqrs/audit.md) | 34 / 40 / 57 | 24 | 27 | 13 | 16 | 8 | 3 |
| [E14](corpus/e14-dns-hierarchy/audit.md) | 35 / 40 / 71 | 28 | 41 | 20 | 15 | 0 | 2 |
| [E15](corpus/e15-js-agent-cluster/audit.md) | 59 / 73 / 136 | 57 | 77 | 34 | 33 | 0 | 3 |
| [E16](corpus/e16-react-dependency-tree/audit.md) | 15 / 18 / 30 | 13 | 15 | 7 | 7 | 0 | 2 |
| [E17](corpus/e17-go-slice/audit.md) | 15 / 17 / 25 | 11 | 13 | 2 | 8 | 0 | 2 |
| [E18](corpus/e18-git-divergent-history/audit.md) | 17 / 26 / 36 | 15 | 17 | 8 | 8 | 0 | 2 |
| [E19](corpus/e19-pixel-pipeline/audit.md) | 11 / 12 / 16 | 9 | 6 | 0 | 5 | 0 | 2 |
| [E20](corpus/e20-compiler-mountain/audit.md) | 21 / 22 / 39 | 19 | 19 | 9 | 9 | 0 | 2 |
| [E21](corpus/e21-open-upvalue/audit.md) | 32 / 39 / 51 | 24 | 25 | 7 | 13 | 7 | 3 |
| [E22](corpus/e22-dns-query/audit.md) | 23 / 30 / 98 | 41 | 55 | 23 | 24 | 4 | 3 |
| [E23](corpus/E23-nasa-star-life/audit.md) | 28 / 30 / 56 | 25 | 26 | 12 | 12 | 13 | 3 |
| [E24](corpus/E24-noaa-enso/audit.md) | 25 / 31 / 54 | 23 | 25 | 11 | 11 | 12 | 3 |
| [E25](corpus/E25-usgs-water-cycle/audit.md) | 55 / 60 / 101 | 50 | 42 | 20 | 20 | 0 | 2 |
| [E26](corpus/E26-design-double-diamond/audit.md) | 13 / 17 / 13 | 3 | 5 | 2 | 2 | 1 | 3 |
| [E27](corpus/E27-emf-butterfly/audit.md) | 57 / 63 / 108 | 53 | 46 | 22 | 22 | 14 | 2 |
| [E28](corpus/E28-tfl-tram/audit.md) | 83 / 85 / 164 | 79 | 80 | 39 | 39 | 40 | 2 |
| [E29](corpus/E29-cope-plagiarism/audit.md) | 57 / 63 / 112 | 53 | 51 | 24 | 24 | 0 | 2 |
| [E30](corpus/E30-openstax-cell-cycle/audit.md) | 16 / 24 / 36 | 14 | 14 | 6 | 6 | 6 | 2 |


## How awkward did the native source become?

The following judgments were written against the actual sources and retained images. They are not measured editing-time results. A source can remain understandable while becoming geometrically brittle: fixed widths and positions mean a longer label can require several follow-up edits.

### E01 — TLS handshake

Low. Two participants, six messages, two phases, one custom actor color, and a few explicit line breaks. No geometry refinements; sequence intentionally ignores them.

**Stop:** unsupported primitive. **Actual final source:** [E01 v2](corpus/cloudflare-tls-handshake/v2.draft).

### E02 — Synchronized retries

High for a small figure: 15 pins plus 15 exact sizes encode a timeline that should follow a shared scale. Every new event would require the author to calculate another x coordinate. The graph and timing labels remain understandable.

**Stop:** unsupported primitive. **Actual final source:** [E02 v2](corpus/stripe-synchronized-retries/v2.draft).

### E03 — Blackbird query architecture

Moderate. Five pins and eight exact node sizes establish two full-width bands and one service row. Two notes need explicit wrap widths. It is legible source, but changing the shard count or long layer label requires revisiting width assumptions.

**Stop:** diminishing returns. **Actual final source:** [E03 v2](corpus/github-blackbird-query/v2.draft).

### E04 — Database migration panels

High but transparent: nineteen pins and nineteen exact node sizes duplicate a five-component coordinate template across four panels. The layout remains readable in source, but the author owns every panel dimension and shared coordinate.

**Stop:** unsupported primitive. **Actual final source:** [E04 v2](corpus/figma-database-migration/v2.draft).

### E05 — Fluid transport, dark

Moderate to high. Five object pins, five exact node sizes, two minimum-sized containers, explicit ports, a custom dark palette, and a special note-surface override. Paired reverse edges and a dash legend replace source semantics that one colored/two-headed connector should carry.

**Stop:** effort limit. **Actual final source:** [E05 v2](corpus/vercel-fluid-transport/v2.draft).

### E06 — Chrome processes

Low to moderate for the valid sources: five pins and five exact sizes in v2. The final attempted cycle used x=-40 and failed validation. Rather than spend an unauthorized fourth cycle, the earlier successful v2 is restored. v1 is the better compact communication result.

**Stop:** effort limit. **Actual final source:** [E06 v2](corpus/chrome-process-architecture/v2.draft).

### E07 — HTTP multiplexing

High. Twenty-four native edges represent twelve source duplex connections, and explicit ports are repeated on every edge. Eight pins and sixteen exact sizes align the two panels. The source remains inspectable, but adding one file means several new edges and repeated geometry.

**Stop:** diminishing returns. **Actual final source:** [E07 v2](corpus/cloudflare-http2-multiplexing/v2.draft).

### E08 — Read and compare records

Moderate. Four nested scopes, quiet custom shades, two cell recipes, three pins, one exact node size, and several minimum widths express what is largely typographic record layout. The hierarchy stays readable in source, but the workaround is verbose and exact typography remains unavailable.

**Stop:** effort limit. **Actual final source:** [E08 v2](corpus/stripe-read-compare/v2.draft).

### E09 — Checkpoint/journal panels

Very high. Twenty-one pins and twenty-one sizes plus nine panel minimum dimensions maintain only nine temporal scenes. Native geometry is duplicated for every snapshot. A label or shape change needs repeated edits. The original red octagon and green freeform path still cannot be expressed.

**Stop:** unsupported primitive. **Actual final source:** [E09 v2](corpus/figma-journal-checkpoints/v2.draft).

### E10 — Security layers

Moderate. Nine notes and nine exact node sizes plus three reserved layer heights recreate component/caption pairs. No pins are needed. A longer caption can exceed reserved room, so the source is less resilient than a true card-with-caption recipe.

**Stop:** diminishing returns. **Actual final source:** [E10 v2](corpus/github-security-layers/v2.draft).

### E11 — Transformer stacks

Moderate to high: the final source is still recognizable as two repeated stacks, but fifteen pins, fourteen sizes and thirty-two endpoint-side assignments make the composition largely manual.

**Stop:** diminishing returns. **Actual final source:** [E11 v2](corpus/e11-transformer-stacks/v2.draft).

### E12 — LSTM recurrent cell

High: the gate topology remains readable in source, but nearly every visible object is pinned and sized, with nine edges receiving explicit endpoint sides. One final correction was spent repairing a pin overlap.

**Stop:** effort limit. **Actual final source:** [E12 v2](corpus/e12-lstm-recurrent-cell/v2.draft).

### E13 — CQRS

Moderate: thirteen pins, ten exact sizes and explicit sides on eight relations recover the U-shaped story. Five notes remain ordinary native notes; there is no hidden custom drawing.

**Stop:** diminishing returns. **Actual final source:** [E13 v2](corpus/e13-cqrs/v2.draft).

### E14 — DNS hierarchy comic

High for such a short explanation: twenty pins and fifteen sizes are needed to obtain the chosen two-row panel composition. The declarations remain simple and explicit.

**Stop:** unsupported primitive. **Actual final source:** [E14 v2](corpus/e14-dns-hierarchy/v2.draft).

### E15 — JavaScript agent cluster

Very high: 136 non-comment lines, thirty-four pins and thirty-one exact sizes. The manual coordinates dominate the native semantic model, and a corrective cycle was required because group headers/padding made the queues overlap heaps.

**Stop:** effort limit. **Actual final source:** [E15 v2](corpus/e15-js-agent-cluster/v2.draft).

### E16 — React dependency tree

Moderate: seven pins and seven sizes recover a very simple asymmetric tree after the unarrowed-edge refinement removed automatic depth. The final source remains easy to read, but its geometry is less resilient than v0.

**Stop:** diminishing returns. **Actual final source:** [E16 v2](corpus/e16-react-dependency-tree/v2.draft).

### E17 — Go slice descriptor

Low to moderate: two pins and eight exact cell sizes. Cells avoid having to pin each field, so the source is concise and the underlying memory order remains obvious.

**Stop:** diminishing returns. **Actual final source:** [E17 v2](corpus/e17-go-slice/v2.draft).

### E18 — Git divergent history

Moderate: the graph itself is tiny, but eight pins and eight sizes make chronological position explicit. The v1 order/near solution is actually more resilient and already communicates well.

**Stop:** good enough. **Actual final source:** [E18 v2](corpus/e18-git-divergent-history/v2.draft).

### E19 — Pixel pipeline

Low: five exact sizes and one row gap are the only geometric refinements. No pins are needed, and the source remains a straightforward five-stage pipeline.

**Stop:** unsupported primitive. **Actual final source:** [E19 v2](corpus/e19-pixel-pipeline/v2.draft).

### E20 — Compiler mountain

Moderate source cost for an inherently partial reconstruction: nine pins and nine sizes create the ascent/descent landmarks, but cannot recover illustrated terrain or hand-lettered route labels.

**Stop:** unsupported primitive. **Actual final source:** [E20 v2](corpus/e20-compiler-mountain/v2.draft).

### E21 — Open upvalue

High relative to sixteen principal objects: seven object pins, twelve sizes and fourteen explicit endpoint-side assignments are needed. The source is understandable as records plus pointers, but manual route repair is disproportionately large.

**Stop:** effort limit. **Actual final source:** [E21 v2](corpus/e21-open-upvalue/v2.draft).

### E22 — DNS query comic

High for matching panel composition: v2 has 98 non-comment lines, twenty-three pins and twenty-one sizes. The sequence representation is much shorter; the panel representation trades concise semantics for closer editorial structure.

**Stop:** effort limit. **Actual final source:** [E22 v2](corpus/e22-dns-query/v2.draft).

### E23 — Star lifecycles

Moderate to high. The semantic model remains easy to scan, but every stage receives a size and a pin, most edges receive explicit endpoint sides, and a palette entry is needed just to make the note legible. The two paths can be edited, but the final composition no longer adapts automatically.

**Stop:** unsupported primitive. **Actual final source:** [E23 v2](corpus/E23-nasa-star-life/v2.draft).

### E24 — El Niño decision process

Moderate. Eleven sizes, eleven pins and explicit ports on all twelve edges are required to recover the stair. Three complete custom swatches are verbose for a small palette. The source is readable, but a diagram that is visually simple has accumulated substantial geometry.

**Stop:** effort limit. **Actual final source:** [E24 v2](corpus/E24-noaa-enso/v2.draft).

### E25 — Water cycle

High and low reward. Twenty sizes and twenty pins, plus thirty edge labels and global routing settings, still produce a diagram with substantially less meaning than the source. The graph itself is understandable; maintaining a physical layout and its many routes would be laborious.

**Stop:** unsupported primitive. **Actual final source:** [E25 v2](corpus/E25-usgs-water-cycle/v2.draft).

### E26 — Double Diamond

The final source is short, but brevity is purchased by losing structure. Four sizes/pins are not the problem; the awkward part is encoding two meaningful phases in one string and documenting the missing independent placement. The default is the most maintainable of the three.

**Stop:** unsupported primitive. **Actual final source:** [E26 v2](corpus/E26-design-double-diamond/v2.draft).

### E27 — Circular-economy butterfly

High. Twenty-two manual sizes and pins, fourteen explicit port pairs and a custom palette produce a recognizable silhouette, but the important curves remain impossible. Node/edge declarations are readable; routing and spatial maintenance would be brittle as the system changes.

**Stop:** unsupported primitive. **Actual final source:** [E27 v2](corpus/E27-emf-butterfly/v2.draft).

### E28 — London Trams

Very high. Seventy-eight size/pin lines, plus explicit sides on nearly every edge, are needed for the visible map. The station declarations are easy to read, but maintaining branches and preventing label growth from colliding is manual cartographic work. This is a confirmation case, not a numeric tuning target.

**Stop:** unsupported primitive. **Actual final source:** [E28 v2](corpus/E28-tfl-tram/v2.draft).

### E29 — Plagiarism workflow

High. Twenty-four manual sizes and pins plus a long order line increase cost substantially over the already-useful default. The explicit IDs make the workflow intelligible, but every wording change may need another layout review. The source is verbose because the real process is verbose; that part is legitimate content cost.

**Stop:** diminishing returns. **Actual final source:** [E29 v2](corpus/E29-cope-plagiarism/v2.draft).

### E30 — Cell cycle

Moderate source cost, weak payoff. Six sizes and pins and six port pairs are understandable, but cannot express a continuous cyclic band. v0 is the most maintainable explanation of ordering. This held-out confirmation case supports testing future features, not choosing numerical routing or layout constants.

**Stop:** unsupported primitive. **Actual final source:** [E30 v2](corpus/E30-openstax-cell-cycle/v2.draft).


## Exact native excerpts: where the burden appears

These excerpts are copied from retained v2 sources. They are supported current syntax, not proposed features.

### E02: coordinate arithmetic replaces a shared time axis

```text
pin c1e0 x=0 y=0
size c1e0 width=100 height=64
pin c1e1 x=120 y=0
size c1e1 width=100 height=64
pin c1e2 x=240 y=0
size c1e2 width=100 height=64
pin c1e3 x=480 y=0
size c1e3 width=100 height=64
pin c1e4 x=960 y=0
size c1e4 width=100 height=64
```

Those ten lines repeat for each of three client tracks. They correctly preserve the 0, 1, 2, 4, 8 event-center spacing, but the author now owns the shared-scale arithmetic. Label growth must fit the fixed 100-pixel boxes or trigger another layout decision. This is possible but laborious, rather than unsupported in every form.

### E07: one duplex connection becomes two routed declarations

```text
edge h1.t0f h1.o0 -> h1.i0 from=right to=left
edge h1.t0b h1.i0 -> h1.o0 constraint=false from=left to=right
```

The source uses twenty-four directed edges for twelve duplex connections. The workaround is transparent and preserves two-way connectivity, but it duplicates endpoints and introduces path competition. Setting `directed=false` instead would remove arrowheads and logical direction; it would not supply a two-ended arrow.

### E21: explicit sides do not guarantee a clear route

```text
edge upvalue_stack location -> a constraint=false from=bottom to=bottom
```

The retained geometry is `(700,287) → (35,287) → (35,487)`. Despite the declared sides, the route approaches the lower endpoint from above through a title/field. This is a concrete remaining routing issue, not evidence that the author omitted a side hint. Other E21 paths improved after hints; E22 was successfully repaired with semantic-field targeting and explicit sides. Do not generalize this into a ban on legitimate interior-cell crossings.

### E28: every station carries manual cartographic maintenance

```text
size wimbledon width=110 height=auto
pin wimbledon x=0 y=290
size dundonald width=110 height=auto
pin dundonald x=110 y=290
size merton width=110 height=auto
pin merton x=220 y=290
```

There are 39 stations, 39 sizes and 39 pins. Height remains automatic, but width and placement still constrain the labels. All stop names are present; route identity, exterior ticks/interchange symbols and shared service strokes remain absent. A short adjacency graph could be easier to maintain but would still not constitute a faithful operational transport map.

### E23: a palette override repairs a default note mismatch

```text
theme-color slate shade=50 fill="#172120" stroke="#344542" ink="#B8E5DF"
```

The extra line fixes the note's light panel on the dark canvas by changing that swatch's surface. It also affects any other use of the same shade. `noteMarkup` currently reads global `look.text` for note text rather than pairing it with the chosen panel's ink. E05 independently requires the same class of workaround. Both v1 failures are preserved.

## Refinement limits, failures and honest stopping

Seventeen cases used two refinement cycles after v0; thirteen used three. Stops were thirteen unsupported-primitive boundaries, eight effort limits, eight diminishing-return decisions and one good-enough result. Those are author judgments at the allowed budget, not a proof that further native work is impossible. Alternative native representations, especially emphasis states and different declaration order, were not exhaustively searched.

The retained trials include failed parsing/compilation, visually inferior refinements and intermediate valid sources. E06's final rejected negative pin did not justify a fourth attempt; the prior successful v2 was restored and revalidated. E14/E22's reserved-name errors happened before the first valid image and are not visual cycles. The v0 freeze is never rewritten during replay. A v2 label or legend may retain a candid authoring error after the limit; those errors lower semantic judgments rather than becoming fictional product gaps.

## Native geometry metrics versus visual quality

`render-metrics.csv` records current native geometry, including crossings, bends, route length, canvas size and diagnostic counts when supplied. Those metrics are useful for comparisons within a case. E25's crossings fall from thirty to seven and E27's from nineteen to four, but their key geographic or nested-loop semantics remain missing. Fewer crossings alone cannot establish success.

The unchanged historical audit is included under `baseline-audit/` with the v1→e1 and v2→e2 adapter mapping. Its first environment-dependent failed invocation is preserved under trials; the successful run is the final record. The defect index can disagree with the editorial result:

| Case | Historical metric behavior | Why the metric is insufficient |
|---|---|---|
| E02 v0 | DI 0 | Equal-spacing loses the metric retry scale despite simple geometry. |
| E26 v1/v2 | DI 0 | Diamonds/merged labels still lose four-phase divergence/convergence structure. |
| E16 v2 | DI 54 | Undirected hierarchy and inferred direction penalties do not describe its whole reading quality. |
| E17 v0/v1/v2 | DI 5 / 8 / 12 | A valid bottom-entry cell pointer receives an `arrives-below` penalty. |
| E11 v1 | Twelve back-edge counts | The script guesses downward flow while the intended stacks run upward. |
| E21 final | Historical title-band count 0 | Its terminal-segment exemption misses the real Stack-title crossing reported by the current CLI. |

The independent source/geometry review is `appendix/reviews/historical-audit-concept-review.md`. No scalar combination of that index, lines or fidelity replaces the separate judgments. Exact image-difference error is not reported because the images cannot be fairly registered and font rendering would confound it.

## Measured execution time, not authoring time

Every command result includes a UTC start and elapsed seconds. The sum of the 360 final-stage command durations is reported in `execution-summary.json`; it is a sum across concurrent processes, not wall time, human time, a speed comparison or the complete work cost. Setup, research, source reading, visual review, failed attempts and packaging are not represented by that sum. Do not infer authoring productivity from it.

Future claims such as “caption support halves source edits” require an implemented feature and a controlled label/content-edit exercise. The current study supplies suitable before sources and case-specific risks, but no fabricated future minutes or savings.
