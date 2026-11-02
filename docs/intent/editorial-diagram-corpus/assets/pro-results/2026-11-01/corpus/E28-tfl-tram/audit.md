# E28 audit · London Trams service map

## Outcome

All 39 stop names and 40 native adjacency/one-way connections are present. Manual placement restores a west-to-east line, Croydon loop and eastern branches, with no measured final crossings. It is a station-connectivity schematic rather than a faithful service map: route colors, continuous rails, stop marks, interchange symbols and exterior labels are essential losses.

**v0 readability versus reference: worse.** The automatic default turns a low, wide transport map into a very tall station list with huge loop detours. It preserves names and adjacency but loses route/service identity and rapid geographic scanning.

The ratings are independent visual judgments: 1 means misleading/unreadable, 3 useful but visibly compromised, and 5 publication-ready. Fidelity scores resemblance and preservation of the source’s graphic mechanism; quality scores communication on the attempt’s own merits. A successful check is not a visual-quality rating.

| Stage | Quality | Fidelity | Semantics | Lines | Declarations | Layout/refinement | Pins | Sizes | Style attrs | Crossings |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| v0 | 2 | 1 | 3 | 83 | 79 | 1 | 0 | 0 | 0 | 1 |
| v1 | 2 | 1 | 3 | 85 | 79 | 1 | 0 | 0 | 6 | 1 |
| v2 | 3 | 2 | 3 | 164 | 79 | 80 | 39 | 39 | 6 | 0 |


## Independent dimensions

**Semantic completeness and correctness.** The source has multiple colored services sharing parts of the network, direction arrows in the central loop, step-free context and interchange symbols. Native arrows retain the Croydon direction; non-loop links use directed=false, correctly avoiding one-way claims. Interchange meanings are written into station names. However, a single global green edge cannot distinguish which service follows which continuation, so the result is not semantically complete as a passenger map. Source typography/stop marks separate a station point from its label; native text-node bounds interrupt the route.

**Composition, reading path and containment.** The default layered recipe is a poor match for an undirected transit chain. Native documentation explicitly says undirected links do not impose flow ranks; this is an expected consequence of the chosen recipe, not established as an engine defect. v2’s 39 pins reconstruct the broad topology. It is 3550 native units wide, so labels shrink at reference publication width; exterior labels and station marks are what let the source remain compact. The manual map is intentionally kept complete rather than cropping off distant stops.

**Typography and label hierarchy.** The source alternates short station labels above/below a continuous line. Native labels are centered inside text-node bounding rectangles, with additional interchange words taking space. A fixed blue text color is achievable, but the exact TfL face and compact exterior label roles are not natively specified. The final tiny appearance at sheet scale is partly the chosen 110-pixel station widths and long layout; the missing anchored label role makes a better compact native map harder.

**Routes, arrowheads and annotations.** The source combines horizontal and 45-degree segments, rounded junctions, bold parallel service strokes, small station ticks and direction chevrons. Native ports provide orthogonal links and ordinary arrowheads; there is no native route waypoint/color/weight per edge. At joints, the line ends at each text object. This gap is not fixed merely by lowering crossing count to zero.

**Color, contrast and finish.** Global green connections and dark blue text reproduce the broad palette. Two service greens cannot coexist on native edges; changing node color would change a different semantic channel. Interchange pictograms and the step-free badge are represented only as prose.

## What is still missing

- Service-line identity and shared parallel route strokes are absent.
- No exterior stop labels, native station ticks or interchange symbols.
- No controlled octilinear geometry or saved route waypoints.
- Every stop requires manual pin/size; the full publication-width result is too fine for the source’s rapid scanning.
- All 39 stops remain; no claim that a simplified adjacency graph is an operational transit map.

These residuals separate native representational limits from authoring decisions. The preserved full reference and full native images remain the basis of comparison; detail crops do not replace them. No registered pixel-error score was calculated because graphic models and type layouts differ substantially.

## Effort and maintainability

**How nasty did the DSL become?** Very high. Seventy-eight size/pin lines, plus explicit sides on nearly every edge, are needed for the visible map. The station declarations are easy to read, but maintaining branches and preventing label growth from colliding is manual cartographic work. This is a confirmation case, not a numeric tuning target.

```draft
node west "West Croydon · rail / bus / Windrush" shape=text
edge e16 west -> wellesley from=right to=top
size west width=110 height=auto
pin west x=1680 y=20
```

Predicted, not exercised: height=auto preserves text vertically, but adjacent station spacing stays fixed. Longer names or richer interchange descriptions will require manual spacing changes. Adding a station means updating downstream pins; a readable exterior-label primitive would reduce this cost.

Refinement cycles after the frozen default: **2**. Stopping reason: **unsupported primitive**. The initial v0 SHA-256 still matches its freeze record: **true**. v1 is retained as the intermediate attempt; there were no discarded native render cycles.

Authoring time was **not measured**. `effort.json` records exact statement/attribute counts and measured command elapsed times. Pins, sizes, appearance attributes and explicit endpoint choices are visible in native source. Command duration is not an estimate of drawing labor. Label-edit resilience above is predicted, not tested.

## Execution evidence and source-grounded limits

- `v0`: `../../logs/E28-tfl-tram/v0/20261102T032031967973Z/`; all four final commands exited 0; metrics warnings: 0.
- `v1`: `../../logs/E28-tfl-tram/v1/20261102T032137349836Z/`; all four final commands exited 0; metrics warnings: 0.
- `v2`: `../../logs/E28-tfl-tram/v2/20261102T032629647668Z/`; all four final commands exited 0; metrics warnings: 0.

The commands were the unchanged baseline CLI `check`, `inspect --json --metrics`, `inspect --svg`, and supplied `pnpm shoot`. The `comparison.png` sheet uses the supplied `shoot --sheet`. The comparison shows complete content at proportional equal column width; it does not equalize letter size or conceal mismatches. The original file is actual downloaded media, documented in [source.md](source.md).

`docs/DSL.md` under Undirected connections explains the rank behavior. `src/dsl/syntax.ts::ModelEdge` lacks route colors/weights/waypoints. `src/model/labels.ts::nodeLabel` supports model-side outside label modes, but no matching native DSL statement is available. This is a DSL round-trip gap, not a claim that the internal model has no external labels.

Primary source: https://tfl.gov.uk/maps/track/tram. Observed license: **unknown**; details and attribution are in `source.md`. This is a reserved confirmation case; its audit informs coverage but its measurements are not used to choose numerical tuning values.
