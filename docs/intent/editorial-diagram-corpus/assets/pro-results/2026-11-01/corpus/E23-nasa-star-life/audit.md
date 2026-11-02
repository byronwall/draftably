# E23 audit · Life Cycles of Sun-like and Massive Stars

## Outcome

The final native diagram is a useful two-path lifecycle schematic with no measured crossings. It preserves the sequence, mass split, timescale labels, remnant branch and return of ejected material. Its flat ellipses and orthogonal lines cannot reproduce the visual evidence supplied by the nebula, stars, explosion, remnant scale and curved flow bands.

**v0 readability versus reference: worse.** The default graph makes the sequence explicit, but long wraparound links and two crossings obscure the paired stellar lifecycles. The source uses two immediately legible loops and distinct celestial objects.

The ratings are independent visual judgments: 1 means misleading/unreadable, 3 useful but visibly compromised, and 5 publication-ready. Fidelity scores resemblance and preservation of the source’s graphic mechanism; quality scores communication on the attempt’s own merits. A successful check is not a visual-quality rating.

| Stage | Quality | Fidelity | Semantics | Lines | Declarations | Layout/refinement | Pins | Sizes | Style attrs | Crossings |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| v0 | 3 | 2 | 4 | 28 | 25 | 1 | 0 | 0 | 0 | 2 |
| v1 | 3 | 2 | 4 | 30 | 25 | 1 | 0 | 0 | 29 | 1 |
| v2 | 4 | 3 | 4 | 56 | 25 | 26 | 12 | 12 | 33 | 0 |


## Independent dimensions

**Semantic completeness and correctness.** All 12 native stage objects and 13 relationships remain. A single shared protostar caption becomes two explicit mass-dependent protostar nodes, an intentional disambiguation rather than two additional astrophysical stages. The original astronomical appearance and relative visual scale are absent; these are explanatory content, not merely a decorative background. The drawing is not a physical size model.

**Composition, reading path and containment.** v0 spreads the loops into ranked rows and sends return paths around the perimeter. v1 uses color and circles but remains an automatic arrangement. v2 pins a left low-mass loop, central nebula and right high-mass loop. The initial v2 had author-chosen excessive whitespace; the preserved third-cycle compaction improves publication-scale labels. The remaining contour is rectangular rather than circular.

**Typography and label hierarchy.** The baseline provides consistent, readable wrapping and a clear heading. The source labels sit outside its stars and vary in importance; native labels are centered in their objects. The two timescale captions cannot follow an arc. Font choice and label scale differ from the reference, and no per-object native text-scale/position setting exists. Small type in the initial v2 was primarily caused by the chosen coordinates, not automatically by the renderer.

**Routes, arrowheads and annotations.** Port choices give the final two-loop reading path and remove measured crossings (v0 2 → v2 0). Rounded orthogonal corners remain, rather than broad tapered curved arrows. The label masks break the stroke where timescales and returned material are written. There is no native saved bend/curve geometry to follow the source contours.

**Color, contrast and finish.** Meaningful dark canvas, warm low-mass path and cool massive-star path are possible. v1 exposed a real light-note-panel/light-text contrast failure after the canvas/text override. v2 fixes that using an explicit slate-50 theme-color override. This is a supported but nonobvious workaround; noteMarkup chooses slate-50 independently of the canvas.

## What is still missing

- No nebula/stellar illustration, glow, texture or scientifically recognizable silhouettes in native DSL.
- No tapered circular flow bands or text along a path.
- Object-bound labels replace separate exterior captions.
- Manual sizes and pins mean later text changes require review.
- Relative physical sizes are not preserved; the diagram must not be read as a size scale.

These residuals separate native representational limits from authoring decisions. The preserved full reference and full native images remain the basis of comparison; detail crops do not replace them. No registered pixel-error score was calculated because graphic models and type layouts differ substantially.

## Effort and maintainability

**How nasty did the DSL become?** Moderate to high. The semantic model remains easy to scan, but every stage receives a size and a pin, most edges receive explicit endpoint sides, and a palette entry is needed just to make the note legible. The two paths can be edited, but the final composition no longer adapts automatically.

```draft
theme-color slate shade=50 fill="#172120" stroke="#344542" ink="#B8E5DF"
edge e13 supernova -> nebula "Ejected material" constraint=false from=left to=right
size supernova width=180 height=120
pin supernova x=740 y=500
```

Predicted, not exercised: fixed-height ellipses can overflow after longer wording; pins do not make more room. v0 is more resilient to relabeling. The reference-sized physical objects would require labels independent of object size.

Refinement cycles after the frozen default: **3**. Stopping reason: **unsupported primitive**. The initial v0 SHA-256 still matches its freeze record: **true**. Earlier rejected/failed v2 files and rationale are retained in `trials/`.

Authoring time was **not measured**. `effort.json` records exact statement/attribute counts and measured command elapsed times. Pins, sizes, appearance attributes and explicit endpoint choices are visible in native source. Command duration is not an estimate of drawing labor. Label-edit resilience above is predicted, not tested.

## Execution evidence and source-grounded limits

- `v0`: `../../logs/E23-nasa-star-life/v0/20261102T032005662624Z/`; all four final commands exited 0; metrics warnings: 0.
- `v1`: `../../logs/E23-nasa-star-life/v1/20261102T032114914320Z/`; all four final commands exited 0; metrics warnings: 0.
- `v2`: `../../logs/E23-nasa-star-life/v2/20261102T032915144218Z/`; all four final commands exited 0; metrics warnings: 0.

The commands were the unchanged baseline CLI `check`, `inspect --json --metrics`, `inspect --svg`, and supplied `pnpm shoot`. The `comparison.png` sheet uses the supplied `shoot --sheet`. The comparison shows complete content at proportional equal column width; it does not equalize letter size or conceal mismatches. The original file is actual downloaded media, documented in [source.md](source.md).

`src/dsl/syntax.ts::DslShape` excludes image/icon shapes; `ModelEdge` has endpoint sides but no curve or label-position fields. `src/model/labels.ts::nodeLabel` has richer model label modes, while the DSL does not expose them. `src/model/note.ts::noteMarkup` selects the slate-50 panel and global text color.

Primary source: https://science.nasa.gov/asset/webb/life-cycles-of-sun-like-and-massive-stars/. Observed license: **unknown**; details and attribution are in `source.md`. This case belongs to the development/evaluation subset.
