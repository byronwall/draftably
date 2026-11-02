# E27 audit · Circular economy butterfly diagram

## Outcome

The final native graph preserves the principal resource, production, use, collection, recovery and leakage roles. Pinned left/right organization and four measured crossings improve on the default’s 19. It still loses the nested green/blue paths that make the butterfly diagram’s value-preservation hierarchy intuitive.

**v0 readability versus reference: worse.** The default’s large rectangular return corridors and 19 measured crossings obscure the bilateral cycle and the order of shorter versus longer recovery loops. The original communicates that hierarchy immediately through nested colored arcs.

The ratings are independent visual judgments: 1 means misleading/unreadable, 3 useful but visibly compromised, and 5 publication-ready. Fidelity scores resemblance and preservation of the source’s graphic mechanism; quality scores communication on the attempt’s own merits. A successful check is not a visual-quality rating.

| Stage | Quality | Fidelity | Semantics | Lines | Declarations | Layout/refinement | Pins | Sizes | Style attrs | Crossings |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| v0 | 2 | 1 | 3 | 57 | 53 | 1 | 0 | 0 | 0 | 19 |
| v1 | 3 | 2 | 3 | 63 | 53 | 1 | 0 | 0 | 59 | 7 |
| v2 | 3 | 3 | 4 | 108 | 53 | 46 | 22 | 22 | 59 | 4 |


## Independent dimensions

**Semantic completeness and correctness.** Twenty-two roles and thirty-one connections are retained, including sharing, maintenance, reuse, remanufacture, recycling, cascades, digestion, biogas, regeneration and leakage. Footnote meanings remain in a note. Native node colors distinguish biological from technical roles, but all connecting edges share one gray appearance. The final arrangement suggests short versus long returns through destination level, yet does not preserve the ordered nesting of routes or the conceptual emphasis of keeping products/materials in closer loops.

**Composition, reading path and containment.** v0/v1 arrange a production spine with recovery roles primarily below or beside it; long returns dominate. v2 places biological systems left, a central manufacturer/service spine, and technical recovery right, matching the source’s broad bilateral structure. Source icon medallions and nested curves make the same space carry more meaning than pinned boxes. Excessive gaps and a large footprint are partly author choices made to avoid collisions, not proof that all layout spacing defaults are wrong.

**Typography and label hierarchy.** The source uses compact all-cap role labels beside icons and narrow rounded central stages. Native text is centered, uniformly bold and wrapped into boxes. The final long footnote note has a clear readable treatment but sits above the diagram rather than below the biological side. No brand marks were reproduced.

**Routes, arrowheads and annotations.** The source’s smooth loop family is the central explanatory device. The native router can choose sides and round orthogonal corners, but it cannot save nested arbitrary curves or color each material stream. Four crossings remain. The reduction in crossing count does not mean recovery-loop ordering or visual identity is solved.

**Color, contrast and finish.** Two custom pale families give useful role grouping. Their meaning is explained in a native legend. The source assigns saturated green/blue to the flowing paths themselves; muted node fills cannot fully substitute. The source’s icons add role recognition and compactness without long boxes, a missing native DSL serialization capability.

## What is still missing

- No independently colored biological and technical edge streams.
- No nested smooth return curves with ordered loop priority.
- No icon medallions or exterior role labels.
- Four final measured crossings and long return corridors remain.
- The final source explains relationships but does not retain the source’s full value-preservation visual hierarchy.

These residuals separate native representational limits from authoring decisions. The preserved full reference and full native images remain the basis of comparison; detail crops do not replace them. No registered pixel-error score was calculated because graphic models and type layouts differ substantially.

## Effort and maintainability

**How nasty did the DSL become?** High. Twenty-two manual sizes and pins, fourteen explicit port pairs and a custom palette produce a recognizable silhouette, but the important curves remain impossible. Node/edge declarations are readable; routing and spatial maintenance would be brittle as the system changes.

```draft
edge e28 tech_collect -> recycle from=right to=bottom
edge e29 recycle -> parts constraint=false from=left to=right
size recycle width=200 height=auto
pin recycle x=1650 y=170
```

Predicted, not exercised: many width=200, height=auto boxes tolerate modest wording changes, while the fixed circles and central pills do not. Pinned neighbors and ordered recovery tiers need review after edits. No manual curve tuning can be retained in the native file.

Refinement cycles after the frozen default: **2**. Stopping reason: **unsupported primitive**. The initial v0 SHA-256 still matches its freeze record: **true**. v1 is retained as the intermediate attempt; there were no discarded native render cycles.

Authoring time was **not measured**. `effort.json` records exact statement/attribute counts and measured command elapsed times. Pins, sizes, appearance attributes and explicit endpoint choices are visible in native source. Command duration is not an estimate of drawing labor. Label-edit resilience above is predicted, not tested.

## Execution evidence and source-grounded limits

- `v0`: `../../logs/E27-emf-butterfly/v0/20261102T032014163511Z/`; all four final commands exited 0; metrics warnings: 0.
- `v1`: `../../logs/E27-emf-butterfly/v1/20261102T032124136595Z/`; all four final commands exited 0; metrics warnings: 0.
- `v2`: `../../logs/E27-emf-butterfly/v2/20261102T032618144731Z/`; all four final commands exited 0; metrics warnings: 0.

The commands were the unchanged baseline CLI `check`, `inspect --json --metrics`, `inspect --svg`, and supplied `pnpm shoot`. The `comparison.png` sheet uses the supplied `shoot --sheet`. The comparison shows complete content at proportional equal column width; it does not equalize letter size or conceal mismatches. The original file is actual downloaded media, documented in [source.md](source.md).

`src/dsl/syntax.ts::ModelEdge` has no per-edge color, width, route or label-position attributes. `docs/DSL.md` explicitly says a file cannot store bends of one line. `src/model/routes.ts` and `src/cli/svg.ts` implement routed paths; the model’s richer style/icon support is not equivalent to serializable native DSL support.

Primary source: https://www.ellenmacarthurfoundation.org/circular-economy-diagram. Observed license: **unknown**; details and attribution are in `source.md`. This case belongs to the development/evaluation subset.
