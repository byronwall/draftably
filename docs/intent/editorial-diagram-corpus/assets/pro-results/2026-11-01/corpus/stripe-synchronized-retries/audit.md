# E02 — Synchronized retries and the thundering herd

## Verdict and visual evidence

**v0 readability versus reference: worse.** The first render preserves every retry label, but equal box spacing hides the growing intervals and the repeated text makes synchronization slower to see than three simple source tracks. All ratings below are visual judgments of actual unchanged-baseline renders. Semantic completeness, standalone communication quality, and reference fidelity are separate axes. The anchors are 1 misleading/unreadable, 3 useful but visibly compromised, 5 publication-ready; a quality 5 would not imply pixel identity.

| Stage | Semantic completeness | Communication quality | Fidelity |
| --- | ---: | ---: | ---: |
| v0 | 3 | 3 | 2 |
| v1 | 3 | 3 | 2 |
| v2 | 5 | 4 | 3 |

Inspected the full original, v0, v1, v2, and publication comparison. `comparison.png` retains full content and aspect ratios; `detail-selection.json` names a specific detail region for the supplied screenshot crop workflow. No raw pixel-difference score is claimed. The original source and attribution are in [source.md](source.md). Primary page: https://stripe.com/blog/idempotency.

## Independent dimensions

**Semantics and grouping.** All three clients have failure at t0 and retries at t0+1, +2, +4, and +8. v0/v1 show those exact labels but not proportional intervals. v2 pins event centers at 120 native units per time unit, preserving simultaneous columns and increasing waits.

**Composition, reading path, spacing, and containment.** v0/v1 are repeated row graphs with large group headers. v2 uses a shared linear x scale; the large last gap now carries the intended message. It remains much taller and more repetitive than the compact source. There is no dedicated continuous timeline track or shared tick guide.

**Typography.** Uniform bold node text is easy to read at full resolution but competes with fifteen repetitions. The reference only needs one shared set of event headings and time labels. Native type cannot be independently reduced for time labels within the same event.

**Routes, arrowheads, and annotations.** Twelve directed edges stand in for three continuous tracks. v2 edge lengths now reflect the intervals, but lines have the global connection color rather than each client family. Native event boxes replace thin vertical tick bars; they are not falsely claimed as ticks.

**Color, contrast, borders, and finish.** Three pale color families retain client identity and good contrast. White group surfaces remove much frame noise. Dashed vertical synchronization guides and very fine tick geometry are absent; custom node sizes have a 40 px minimum, so this is not a literal tick reconstruction.

## Actual iteration history

v1 added three client color families. v2 added 30 explicit geometry statements and a visible scale explanation. No rejected trials; further exactness needs a timeline primitive or a deliberately hand-positioned custom drawing.

**Refinement cycles after v0: 2. Stopping reason: unsupported primitive.** The final source is not a guarantee that another allowed native design could not improve it. It is the closest completed attempt within this explicit protocol. 

## Effort and source resilience

| Stage | Non-comment lines | Declarations | Layout/refinement lines | Pins | Nudges | Manual-size lines | Styling lines / assignments |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v0 | 36 | 30 | 4 | 0 | 0 | 0 | 0 / 0 |
| v1 | 41 | 30 | 4 | 0 | 0 | 0 | 23 / 39 |
| v2 | 71 | 30 | 34 | 15 | 0 | 15 | 23 / 39 |

Counts use `scripts/aggregate.py:effort`: declarations are node/group/edge; manual-size lines also include minimum dimensions and explicit note widths. Styling assignments count theme selection/attributes, family swatch attributes, and node/group color/shade. Categories intentionally overlap and should not be summed as a total. Exact count data is in `effort.json`; global `effort.csv` is recomputable. **Authoring time was not measured.** Execution timings below are measured command durations, not human effort.

**How nasty did the DSL become?** High for a small figure: 15 pins plus 15 exact sizes encode a timeline that should follow a shared scale. Every new event would require the author to calculate another x coordinate. The graph and timing labels remain understandable.

```draft
pin c1e2 x=240 y=0
size c1e2 width=100 height=64
pin c1e3 x=480 y=0
pin c1e4 x=960 y=0
```

## Residual losses and implementation evidence

- No dedicated timeline scale, shared guides, or continuous tracks.
- Fifteen labeled boxes replace thin ticks; the native version is much taller.
- Per-track line colors remain unavailable through native edge declarations.

Provisional gap keys: I-TIME, I-EDGE-COLOR, I-PANEL-GEOMETRY, I-TYPE. These map to the cross-corpus audit; a single case does not establish a common gap. Implementation grounding: `docs/DSL.md` Refinements and Themes; `src/dsl/syntax.ts` `Algorithm`, `ModelEdge`, and size parsing; `src/model/types.ts` `EdgeLayout`. Distinguish native source exposure from internal capability: model label offsets/leaders, image kinds, and edge waypoints exist in places but are not therefore authorable in this baseline's .draft syntax. Future fixes and visual proof suggestions are in the main gap audit, not implemented here.

## Execution status

All three delivered source hashes match successful check/inspect/SVG/shoot manifests. Check exit 0 may still contain warnings, enumerated below. v0's hash remains frozen. References are original third-party bytes; PNG reference previews are conversions only when the original is SVG/JPEG. No source image is imported into a native diagram.

- **v0:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.988 s. `logs/stripe-synchronized-retries/v0/20261102T032012603072Z`. Check output: OK: 15 nodes, 3 groups, 12 connections.
- **v1:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.568 s. `logs/stripe-synchronized-retries/v1/20261102T032404420226Z`. Check output: OK: 15 nodes, 3 groups, 12 connections.
- **v2:** check=0, inspect=0, svg=0, shoot=0; total command execution 3.384 s. `logs/stripe-synchronized-retries/v2/20261102T032716379381Z`. Check output: OK: 15 nodes, 3 groups, 12 connections.
