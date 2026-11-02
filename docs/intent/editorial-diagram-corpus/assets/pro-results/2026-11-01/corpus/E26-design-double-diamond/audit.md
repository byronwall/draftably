# E26 audit · The Double Diamond

## Outcome

The default makes a clean two-group process list. v1 is a rejected visual direction: four red diamond nodes resemble four decisions rather than the source’s two continuous expansion/contraction regions. Final v2 uses two native diamond objects containing the four phase words. This is closer in silhouette but reduces independent phase structure.

**v0 readability versus reference: comparable.** For reading the four phase names and their order, the default is compact, clear and comparable. It loses the divergence/convergence mechanism encoded by the source’s two outlines; that semantic loss is scored separately rather than hidden by the readability verdict.

The ratings are independent visual judgments: 1 means misleading/unreadable, 3 useful but visibly compromised, and 5 publication-ready. Fidelity scores resemblance and preservation of the source’s graphic mechanism; quality scores communication on the attempt’s own merits. A successful check is not a visual-quality rating.

| Stage | Quality | Fidelity | Semantics | Lines | Declarations | Layout/refinement | Pins | Sizes | Style attrs | Crossings |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| v0 | 4 | 2 | 3 | 13 | 9 | 3 | 0 | 0 | 0 | 0 |
| v1 | 2 | 2 | 2 | 17 | 9 | 3 | 0 | 0 | 16 | 0 |
| v2 | 3 | 3 | 3 | 13 | 3 | 5 | 2 | 2 | 12 | 0 |


## Independent dimensions

**Semantic completeness and correctness.** Discover, Define, Develop and Deliver remain in order. v0 preserves them as four separate nodes in two groups, but neither group conveys widening and narrowing. v1’s four decision-like diamonds are misleading relative to the conceptual meaning. v2 coalesces each pair into one label so there are two visible diamonds; independent phase identity and phase-to-phase edges are lost. This tradeoff is explicit, not a claim of complete native support.

**Composition, reading path and containment.** The source has no rectangular containers, no heading above the graphic and two diamond contours that almost meet at the center. v0’s framed groups communicate membership clearly on their own merits. v2 approximates the two side-by-side regions but cannot place two independently editable labels on opposing slopes of one nonrectangular container. A short native connection spans the gap.

**Typography and label hierarchy.** The original’s rotated words run along the lower sloped edges. Native words remain horizontal and centered; blank-line spacing in the composite label does not turn them into independently positioned phase captions. The large source outline is visually stronger than the fixed native stroke. A native note names these losses instead of disguising them.

**Routes, arrowheads and annotations.** The original uses directional arrows on the diamond perimeter and faint vertical center guides. Final v2 has a single undirected connection between diamonds. It cannot attach arrows to an object’s outline or store perimeter segments as flow paths. The default’s ordinary directed step connections are clearer for sequence but do not explain the design-space mechanism.

**Color, contrast and finish.** The saturated red outline and dark words can be selected with a custom native family. Source thickness, rounded corners, center notch and faint center guides are missing. Red itself is not a feature gap; the inability to make a shared outlined process region is the substantive issue.

## What is still missing

- Nonrectangular native groups cannot hold the four independent phase objects.
- Final v2 merges four phase objects into two composite labels.
- No sloped/rotated labels or perimeter arrows.
- Thin native outline differs from the bold continuous source contour.
- Initial v2 gap=0 was an authoring error, rejected by the DSL; preserved and corrected to gap=8 within the third cycle.

These residuals separate native representational limits from authoring decisions. The preserved full reference and full native images remain the basis of comparison; detail crops do not replace them. No registered pixel-error score was calculated because graphic models and type layouts differ substantially.

## Effort and maintainability

**How nasty did the DSL become?** The final source is short, but brevity is purchased by losing structure. Four sizes/pins are not the problem; the awkward part is encoding two meaningful phases in one string and documenting the missing independent placement. The default is the most maintainable of the three.

```draft
node first "Discover\n\nDefine" shape=diamond color=design shade=100
node second "Develop\n\nDeliver" shape=diamond color=design shade=100
size first width=280 height=280
pin first x=0 y=0
```

Predicted, not exercised: changing a phase name is easy in all versions. In v2 the two phase names cannot move or connect separately, and a longer pair can overflow the fixed 280-pixel diamond. The invalid gap trial is retained as an authoring mistake, not attributed to the tool.

Refinement cycles after the frozen default: **3**. Stopping reason: **unsupported primitive**. The initial v0 SHA-256 still matches its freeze record: **true**. Earlier rejected/failed v2 files and rationale are retained in `trials/`.

Authoring time was **not measured**. `effort.json` records exact statement/attribute counts and measured command elapsed times. Pins, sizes, appearance attributes and explicit endpoint choices are visible in native source. Command duration is not an estimate of drawing labor. Label-edit resilience above is predicted, not tested.

## Execution evidence and source-grounded limits

- `v0`: `../../logs/E26-design-double-diamond/v0/20261102T032010585591Z/`; all four final commands exited 0; metrics warnings: 0.
- `v1`: `../../logs/E26-design-double-diamond/v1/20261102T032120289375Z/`; all four final commands exited 0; metrics warnings: 0.
- `v2`: `../../logs/E26-design-double-diamond/v2/20261102T032636839293Z/`; all four final commands exited 0; metrics warnings: 0.

The commands were the unchanged baseline CLI `check`, `inspect --json --metrics`, `inspect --svg`, and supplied `pnpm shoot`. The `comparison.png` sheet uses the supplied `shoot --sheet`. The comparison shows complete content at proportional equal column width; it does not equalize letter size or conceal mismatches. The original file is actual downloaded media, documented in [source.md](source.md).

`src/dsl/syntax.ts::ModelObject` offers box/soft/none group framing rather than a diamond group. `src/dsl/frame.ts` constructs rectangular group content/header geometry. `src/model/labels.ts::nodeLabel` supports one label per object, without rotation in native source; `ModelEdge` cannot encode perimeter paths.

Primary source: https://www.designcouncil.org.uk/resources/framework-for-innovation/. Observed license: **unknown**; details and attribution are in `source.md`. This case belongs to the development/evaluation subset.
