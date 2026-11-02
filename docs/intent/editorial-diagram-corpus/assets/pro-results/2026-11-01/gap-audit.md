# Cross-corpus gap audit

**Status:** observed fixed-baseline evidence plus source-grounded interpretation and unexecuted proposals. Baseline `f14d9b891adba75de6cc172b190017ea5a5ca091` is unchanged. No proposed fix is represented as implemented.

Stable IDs G01–G12 merge duplicate provisional findings from three workstreams. A **common** gap requires at least three accepted examples from at least two consolidated independent publishers. Google Chrome, web.dev and Go are conservatively consolidated. G01–G08 meet that rule; G09–G12 are reproduced two-case stress issues. Incidence measures this purposive sample only.

Every entry names observed case evidence, category, severity, workaround, visible native cost, source boundary, proposed proof, tests and risk. The cost table reports the full affected v2 source, not a causal estimate of how many lines the individual gap created. One case can expose several gaps, so gap costs must not be summed. `gap-mapping.csv` provides one row per gap/case incidence; `gaps.json` is the authored register.

## Disposition index

| ID | Gap | Evidence class | Cases | Publishers | Decision |
| --- | --- | --- | --- | --- | --- |
| G01 | Local text hierarchy and bounded text roles | Common | 7 | 6 | Build |
| G02 | Anchored labels, captions and annotation space | Common | 9 | 9 | Build |
| G03 | Semantic connection styling and arrow ends | Common | 6 | 5 | Build |
| G04 | Quiet containment that preserves the layout scope | Common | 8 | 6 | Build |
| G05 | Native route and edge-label placement controls | Common | 6 | 6 | Explore |
| G06 | Directed contours, smooth loops and cyclic regions | Common | 5 | 5 | Explore |
| G07 | A small missing semantic shape vocabulary | Common | 3 | 2 | Explore |
| G08 | Shared geometry across repeated editorial panels | Common | 5 | 3 | Explore |
| G09 | Dark-theme notes use incompatible foreground and surface | Stress | 2 | 2 | Build |
| G10 | Metric time is not a native timeline abstraction | Stress | 2 | 2 | Explore |
| G11 | Cell and open-group endpoint routing needs targeted repair | Stress | 2 | 2 | Build |
| G12 | Fit diagnostics should distinguish padding policy from visible clipping | Stress | 2 | 2 | Build |


## G01 — Local text hierarchy and bounded text roles

**Build — Title, field, value and caption roles recur, and global font changes cannot express them.**

**Classification:** Missing native controls; some new text primitives. **Severity:** Medium; high when prose or notation carries distinctions. **Frequency:** 7/30 accepted cases across 6 consolidated publishers (Christopher Olah, Committee on Publication Ethics, GitHub, NOAA Climate.gov, Stripe, Wizard Zines). This meets the commonness rule.

| Affected case / visible evidence | Actual files |
| --- | --- |
| [E08](corpus/stripe-read-compare/audit.md): Entity, field and italic value roles collapse into similarly bold small text. | [Full comparison](corpus/stripe-read-compare/comparison.png) · [Detail](corpus/stripe-read-compare/details/comparison.png) · [v2 source](corpus/stripe-read-compare/v2.draft) |
| [E10](corpus/github-security-layers/audit.md): Component titles and monospace mechanism captions need nine separate notes and reserved heights. | [Full comparison](corpus/github-security-layers/comparison.png) · [Detail](corpus/github-security-layers/details/comparison.png) · [v2 source](corpus/github-security-layers/v2.draft) |
| [E12](corpus/e12-lstm-recurrent-cell/audit.md): Subscripts and gate notation become prose; the author-created plus shorthand also introduces ambiguity. | [Full comparison](corpus/e12-lstm-recurrent-cell/comparison.png) · [Detail](corpus/e12-lstm-recurrent-cell/details/comparison.png) · [v2 source](corpus/e12-lstm-recurrent-cell/v2.draft) |
| [E14](corpus/e14-dns-hierarchy/audit.md): Dialogue, emphasis and nameserver identity become uniform box text. | [Full comparison](corpus/e14-dns-hierarchy/comparison.png) · [Detail](corpus/e14-dns-hierarchy/details/comparison.png) · [v2 source](corpus/e14-dns-hierarchy/v2.draft) |
| [E22](corpus/e22-dns-query/audit.md): Panel narration, NS/A records and answers require different text roles. | [Full comparison](corpus/e22-dns-query/comparison.png) · [Detail](corpus/e22-dns-query/details/comparison.png) · [v2 source](corpus/e22-dns-query/v2.draft) |
| [E24](corpus/E24-noaa-enso/audit.md): Inline emphasis inside atmospheric evidence and varied hierarchy are flattened. | [Full comparison](corpus/E24-noaa-enso/comparison.png) · [Detail](corpus/E24-noaa-enso/details/comparison.png) · [v2 source](corpus/E24-noaa-enso/v2.draft) |
| [E29](corpus/E29-cope-plagiarism/audit.md): Long guidance loses the original distinction between short icon labels and explanatory prose. | [Full comparison](corpus/E29-cope-plagiarism/comparison.png) · [Detail](corpus/E29-cope-plagiarism/details/comparison.png) · [v2 source](corpus/E29-cope-plagiarism/v2.draft) |

**Checked source:** `src/dsl/syntax.ts: THEME_ATTRS and node/group attribute allowlists; src/model/appearance.ts: typography roles; src/model/labels.ts: titleArea/nodeLabel/edgeLabelLines; src/model/heading.ts: headingMarkup.`

**Capability boundary:** The baseline already has title, group-title and annotation roles and deterministic bundled font metrics. It lacks per-object size/weight/italic/rich-run authoring. Ordinary edge labels do not get the sequence-specific wrapping path. Oversized author-selected coordinates also caused tiny publication text; that is not solely a renderer fault.

**Current workaround:** Choose global theme font roles, split content into nodes or notes, and manually resize/reposition. Exact mixed weight, italic values and local rich text remain unavailable.

**Cost interpretation:** Styling, notes and manual geometry in affected files are measured; the isolated cost of typography is not separable. Full v2 burden is reported below, not attributed wholly to this gap.

| Case | v2 lines | Pins | Dimension lines | Port lines | Cycles |
| --- | --- | --- | --- | --- | --- |
| [E08](corpus/stripe-read-compare/audit.md) | 29 | 3 | 5 | 2 | 3 |
| [E10](corpus/github-security-layers/audit.md) | 38 | 0 | 21 | 0 | 2 |
| [E12](corpus/e12-lstm-recurrent-cell/audit.md) | 89 | 21 | 20 | 9 | 3 |
| [E14](corpus/e14-dns-hierarchy/audit.md) | 71 | 20 | 15 | 0 | 2 |
| [E22](corpus/e22-dns-query/audit.md) | 98 | 23 | 24 | 4 | 3 |
| [E24](corpus/E24-noaa-enso/audit.md) | 54 | 11 | 11 | 12 | 3 |
| [E29](corpus/E29-cope-plagiarism/audit.md) | 112 | 24 | 24 | 0 | 2 |

**Proposed proof, not executed:** Use E08 record fields and E29 prose as development proofs; keep all values readable at the same comparison width with distinct roles and fewer helper notes. Check a longer label without clipping. E10 is a confirmation case.

**Relevant existing tests / proposed additions:** `tests/themes.test.ts, theme-slots.test.ts, title-wrap.test.ts, heading.test.ts, edge-labels.test.ts, translate.test.ts.`

**Main implementation risk:** Arbitrary free-form CSS would undermine deterministic measurement and make themes inconsistent. Prefer a small stable role vocabulary before unrestricted rich text.

## G02 — Anchored labels, captions and annotation space

**Build — Annotations should point to their subject and have room without becoming fake graph nodes.**

**Classification:** Native persistence gap plus missing additive caption/leader behavior. **Severity:** High when the explanation becomes detached or overlaps. **Frequency:** 9/30 accepted cases across 9 consolidated publishers (Committee on Publication Ethics, Crafting Interpreters, Ellen MacArthur Foundation, GitHub, Martin Fowler, NASA Science, OpenStax / Rice University, Transport for London, U.S. Geological Survey). This meets the commonness rule.

| Affected case / visible evidence | Actual files |
| --- | --- |
| [E03](corpus/github-blackbird-query/audit.md): The v0 Redis note overlaps the following Git region; v2 replaces fine leaders with boxed notes. | [Full comparison](corpus/github-blackbird-query/comparison.png) · [Detail](corpus/github-blackbird-query/details/comparison.png) · [v2 source](corpus/github-blackbird-query/v2.draft) |
| [E13](corpus/e13-cqrs/audit.md): Explanatory leaders around the command/query model become disconnected note panels. | [Full comparison](corpus/e13-cqrs/comparison.png) · [Detail](corpus/e13-cqrs/details/comparison.png) · [v2 source](corpus/e13-cqrs/v2.draft) |
| [E20](corpus/e20-compiler-mountain/audit.md): Process labels and pointers to terrain/artifacts lose their anchored editorial role. | [Full comparison](corpus/e20-compiler-mountain/comparison.png) · [Detail](corpus/e20-compiler-mountain/details/comparison.png) · [v2 source](corpus/e20-compiler-mountain/v2.draft) |
| [E23](corpus/E23-nasa-star-life/audit.md): Exterior object captions become text inside the celestial stand-ins. | [Full comparison](corpus/E23-nasa-star-life/comparison.png) · [Detail](corpus/E23-nasa-star-life/details/comparison.png) · [v2 source](corpus/E23-nasa-star-life/v2.draft) |
| [E25](corpus/E25-usgs-water-cycle/audit.md): Labels tied to terrain, water stores and fluxes become small node/edge labels. | [Full comparison](corpus/E25-usgs-water-cycle/comparison.png) · [Detail](corpus/E25-usgs-water-cycle/details/comparison.png) · [v2 source](corpus/E25-usgs-water-cycle/v2.draft) |
| [E27](corpus/E27-emf-butterfly/audit.md): Exterior role labels and loop annotations become node-bound text. | [Full comparison](corpus/E27-emf-butterfly/comparison.png) · [Detail](corpus/E27-emf-butterfly/details/comparison.png) · [v2 source](corpus/E27-emf-butterfly/v2.draft) |
| [E28](corpus/E28-tfl-tram/audit.md): External station names cannot be attached to ticks or interchange symbols through native label layout. | [Full comparison](corpus/E28-tfl-tram/comparison.png) · [Detail](corpus/E28-tfl-tram/details/comparison.png) · [v2 source](corpus/E28-tfl-tram/v2.draft) |
| [E29](corpus/E29-cope-plagiarism/audit.md): A route icon with a separate explanatory paragraph is replaced by one box. | [Full comparison](corpus/E29-cope-plagiarism/comparison.png) · [Detail](corpus/E29-cope-plagiarism/details/comparison.png) · [v2 source](corpus/E29-cope-plagiarism/v2.draft) |
| [E30](corpus/E30-openstax-cell-cycle/audit.md): Sector leaders and a phase bracket have no equivalent native annotation primitive. | [Full comparison](corpus/E30-openstax-cell-cycle/comparison.png) · [Detail](corpus/E30-openstax-cell-cycle/details/comparison.png) · [v2 source](corpus/E30-openstax-cell-cycle/v2.draft) |

**Checked source:** `src/model/types.ts: LabelLayout; src/model/labels.ts: nodeLabel; src/model/note.ts: Note/placeNotes/noteMarkup; src/dsl/translate.ts: rejectUnsupported; src/dsl/syntax.ts note parsing; src/dsl/compile.ts and src/dsl/project.ts.`

**Capability boundary:** Node-label mode, offsets, width and leader already exist in the model, but native persistence explicitly rejects label-position edits. A second caption is different from moving the primary label. Notes accept near/side/width but lack edge anchors or leaders and are placed after graph layout.

**Current workaround:** Use note near=object side=... width=..., reserve room with larger groups, or add a text node and edge. The last workaround alters graph semantics and should remain explicit.

**Cost interpretation:** Counts include notes, exact note widths and reserved group sizes. The actual source shows where captions duplicate the object structure. No measured time-saving claim.

| Case | v2 lines | Pins | Dimension lines | Port lines | Cycles |
| --- | --- | --- | --- | --- | --- |
| [E03](corpus/github-blackbird-query/audit.md) | 32 | 5 | 10 | 0 | 2 |
| [E13](corpus/e13-cqrs/audit.md) | 57 | 13 | 16 | 8 | 3 |
| [E20](corpus/e20-compiler-mountain/audit.md) | 39 | 9 | 9 | 0 | 2 |
| [E23](corpus/E23-nasa-star-life/audit.md) | 56 | 12 | 12 | 13 | 3 |
| [E25](corpus/E25-usgs-water-cycle/audit.md) | 101 | 20 | 20 | 0 | 2 |
| [E27](corpus/E27-emf-butterfly/audit.md) | 108 | 22 | 22 | 14 | 2 |
| [E28](corpus/E28-tfl-tram/audit.md) | 164 | 39 | 39 | 40 | 2 |
| [E29](corpus/E29-cope-plagiarism/audit.md) | 112 | 24 | 24 | 0 | 2 |
| [E30](corpus/E30-openstax-cell-cycle/audit.md) | 36 | 6 | 6 | 6 | 2 |

**Proposed proof, not executed:** E03 must keep Redis/Git labels and both notes unobscured after a longer label; E13 must maintain obvious subject-to-annotation correspondence. Existing label-position edits must survive native save/reopen. E28/E30 confirm exterior and sector-like labeling needs.

**Relevant existing tests / proposed additions:** `tests/notes.test.ts, edge-labels.test.ts, heading.test.ts, bounds.test.ts, translate.test.ts, file-session.test.ts.`

**Main implementation risk:** Reservation can inflate diagrams or destabilize unrelated nodes. Keep additive captions distinct from primary-label placement; preserve existing note defaults when no new option is used.

## G03 — Semantic connection styling and arrow ends

**Build — Color and line form often distinguish relations rather than decorate them.**

**Classification:** Missing native/model semantic line controls. **Severity:** High when route color identifies the type of flow. **Frequency:** 6/30 accepted cases across 5 consolidated publishers (Cloudflare, Ellen MacArthur Foundation, Stripe, Transport for London, Vercel). This meets the commonness rule.

| Affected case / visible evidence | Actual files |
| --- | --- |
| [E01](corpus/cloudflare-tls-handshake/audit.md): TCP and TLS flights cannot receive independent colors; a combined ACK/ClientHello row cannot split its paint. | [Full comparison](corpus/cloudflare-tls-handshake/comparison.png) · [Detail](corpus/cloudflare-tls-handshake/details/comparison.png) · [v2 source](corpus/cloudflare-tls-handshake/v2.draft) |
| [E02](corpus/stripe-synchronized-retries/audit.md): Client tracks are colored by event boxes, but the connecting timeline tracks remain uniform. | [Full comparison](corpus/stripe-synchronized-retries/comparison.png) · [Detail](corpus/stripe-synchronized-retries/details/comparison.png) · [v2 source](corpus/stripe-synchronized-retries/v2.draft) |
| [E05](corpus/vercel-fluid-transport/audit.md): Green requests, blue responses and neutral duplex HTTP become solid/dashed gray alternatives; the native legend has a retained exception. | [Full comparison](corpus/vercel-fluid-transport/comparison.png) · [Detail](corpus/vercel-fluid-transport/details/comparison.png) · [v2 source](corpus/vercel-fluid-transport/v2.draft) |
| [E27](corpus/E27-emf-butterfly/audit.md): Biological and technical material-return streams lose their independent green/blue line meaning. | [Full comparison](corpus/E27-emf-butterfly/comparison.png) · [Detail](corpus/E27-emf-butterfly/details/comparison.png) · [v2 source](corpus/E27-emf-butterfly/v2.draft) |
| [E28](corpus/E28-tfl-tram/audit.md): Different tram service identities and shared parallel route strokes are absent. | [Full comparison](corpus/E28-tfl-tram/comparison.png) · [Detail](corpus/E28-tfl-tram/details/comparison.png) · [v2 source](corpus/E28-tfl-tram/v2.draft) |
| [E07](corpus/cloudflare-http2-multiplexing/audit.md): Two-ended source connections require pairs of directed edges: 24 native edges for 12 source duplex connections. | [Full comparison](corpus/cloudflare-http2-multiplexing/comparison.png) · [Detail](corpus/cloudflare-http2-multiplexing/details/comparison.png) · [v2 source](corpus/cloudflare-http2-multiplexing/v2.draft) |

**Checked source:** `src/dsl/syntax.ts: ModelEdge and edge attribute allowlist; src/model/types.ts: DiagramEdge; src/cli/svg.ts: sceneMarkup/arrowsFor; src/model/appearance.ts and status paint helpers.`

**Capability boundary:** The theme can set one connection color. Async dashing and status/emphasis paint exist, but status is not a general semantic category. Native directed=false removes the arrowhead; it does not create two-ended arrowheads (docs/DSL.md, Undirected connections).

**Current workaround:** Differentiate nodes, use meaningful edge text or async dashes, and duplicate reverse edges for duplex relations. Do not misuse change-status markers to fake unrelated route colors.

**Cost interpretation:** E07 is an exact measured duplication: 24 edge declarations versus 12 visually bidirectional source links, plus repeated endpoint controls. Other style costs are visible case totals rather than causal estimates.

| Case | v2 lines | Pins | Dimension lines | Port lines | Cycles |
| --- | --- | --- | --- | --- | --- |
| [E01](corpus/cloudflare-tls-handshake/audit.md) | 15 | 0 | 0 | 0 | 2 |
| [E02](corpus/stripe-synchronized-retries/audit.md) | 71 | 15 | 15 | 0 | 2 |
| [E05](corpus/vercel-fluid-transport/audit.md) | 35 | 5 | 8 | 3 | 3 |
| [E27](corpus/E27-emf-butterfly/audit.md) | 108 | 22 | 22 | 14 | 2 |
| [E28](corpus/E28-tfl-tram/audit.md) | 164 | 39 | 39 | 40 | 2 |
| [E07](corpus/cloudflare-http2-multiplexing/audit.md) | 86 | 8 | 16 | 24 | 2 |

**Proposed proof, not executed:** E05 should preserve all three relation classes with a truthful legend; E07 should express duplex connections once without changing connectivity; E27 should distinguish both cycles in the routes themselves. E28 is a confirmation.

**Relevant existing tests / proposed additions:** `tests/drawn-colors.test.ts, themes.test.ts, undirected.test.ts, edge-labels.test.ts, translate.test.ts, sequence.test.ts.`

**Main implementation risk:** New paint must preserve contrast, arrowhead inheritance, diff/emphasis precedence and accessibility when color is not available.

## G04 — Quiet containment that preserves the layout scope

**Build — Removing visual weight should not require losing a useful layout boundary.**

**Classification:** Awkward coupling between appearance and layout. **Severity:** Medium; high when membership becomes ambiguous. **Frequency:** 8/30 accepted cases across 6 consolidated publishers (GitHub, MDN Web Docs, Martin Fowler, OpenStax / Rice University, Stripe, Wizard Zines). This meets the commonness rule.

| Affected case / visible evidence | Actual files |
| --- | --- |
| [E03](corpus/github-blackbird-query/audit.md): Large bands and a quiet shard region need custom fill/stroke and manual dimensions. | [Full comparison](corpus/github-blackbird-query/comparison.png) · [Detail](corpus/github-blackbird-query/details/comparison.png) · [v2 source](corpus/github-blackbird-query/v2.draft) |
| [E08](corpus/stripe-read-compare/audit.md): Nested record scopes require several nearly identical custom shades to hide internal box chrome. | [Full comparison](corpus/stripe-read-compare/comparison.png) · [Detail](corpus/stripe-read-compare/details/comparison.png) · [v2 source](corpus/stripe-read-compare/v2.draft) |
| [E10](corpus/github-security-layers/audit.md): Layer groups and component captions need reserved room but lighter header/card treatment. | [Full comparison](corpus/github-security-layers/comparison.png) · [Detail](corpus/github-security-layers/details/comparison.png) · [v2 source](corpus/github-security-layers/v2.draft) |
| [E13](corpus/e13-cqrs/audit.md): Nested query/command model groups acquire heavier headers and framing than their editorial role needs. | [Full comparison](corpus/e13-cqrs/comparison.png) · [Detail](corpus/e13-cqrs/details/comparison.png) · [v2 source](corpus/e13-cqrs/v2.draft) |
| [E14](corpus/e14-dns-hierarchy/audit.md): Comic panels need independent layout and restrained panel borders. | [Full comparison](corpus/e14-dns-hierarchy/comparison.png) · [Detail](corpus/e14-dns-hierarchy/details/comparison.png) · [v2 source](corpus/e14-dns-hierarchy/v2.draft) |
| [E15](corpus/e15-js-agent-cluster/audit.md): Repeated realm/heap/stack groups gain much more framing and padding than the original. | [Full comparison](corpus/e15-js-agent-cluster/comparison.png) · [Detail](corpus/e15-js-agent-cluster/details/comparison.png) · [v2 source](corpus/e15-js-agent-cluster/v2.draft) |
| [E22](corpus/e22-dns-query/audit.md): Numbered panels and records use different visual containment roles that the native group treatment only approximates. | [Full comparison](corpus/e22-dns-query/comparison.png) · [Detail](corpus/e22-dns-query/details/comparison.png) · [v2 source](corpus/e22-dns-query/v2.draft) |
| [E30](corpus/E30-openstax-cell-cycle/audit.md): The Interphase soft tint splits into separate pieces around manually placed phases. | [Full comparison](corpus/E30-openstax-cell-cycle/comparison.png) · [Detail](corpus/E30-openstax-cell-cycle/details/comparison.png) · [v2 source](corpus/E30-openstax-cell-cycle/v2.draft) |

**Checked source:** `src/dsl/frame.ts; src/dsl/compile.ts: scope layout and group framing; src/model/types.ts: DiagramGroup.frame/hull; src/cli/svg.ts: sceneMarkup group rendering; src/model/panels.ts; src/dsl/translate.ts.`

**Capability boundary:** frame=soft draws member tints; frame=none draws no frame. Both dissolve the group's own layout scope and cannot take their own layout/position. They are not simply borderless versions of an ordinary framed container. Existing compare/state panels serve different semantics.

**Current workaround:** Keep framed scopes and define quiet swatches; reserve group dimensions; manually align contents. This preserves membership but retains fixed header glyphs/spacing.

**Cost interpretation:** Repeated custom palette shades, group minimum dimensions and pins are measurable in E08/E10/E14/E15. Source verbosity is partly legitimate hierarchical content.

| Case | v2 lines | Pins | Dimension lines | Port lines | Cycles |
| --- | --- | --- | --- | --- | --- |
| [E03](corpus/github-blackbird-query/audit.md) | 32 | 5 | 10 | 0 | 2 |
| [E08](corpus/stripe-read-compare/audit.md) | 29 | 3 | 5 | 2 | 3 |
| [E10](corpus/github-security-layers/audit.md) | 38 | 0 | 21 | 0 | 2 |
| [E13](corpus/e13-cqrs/audit.md) | 57 | 13 | 16 | 8 | 3 |
| [E14](corpus/e14-dns-hierarchy/audit.md) | 71 | 20 | 15 | 0 | 2 |
| [E15](corpus/e15-js-agent-cluster/audit.md) | 136 | 34 | 33 | 0 | 3 |
| [E22](corpus/e22-dns-query/audit.md) | 98 | 23 | 24 | 4 | 3 |
| [E30](corpus/E30-openstax-cell-cycle/audit.md) | 36 | 6 | 6 | 6 | 2 |

**Proposed proof, not executed:** E08 should retain editable record nesting with unobtrusive presentation; E14 panels should keep their independent recipes with quiet chrome. E10 confirms captions/layers, E30 confirms that membership is not accidentally changed.

**Relevant existing tests / proposed additions:** `tests/soft-groups.test.ts, group-fit.test.ts, group-packing.test.ts, compare.test.ts, theme-slots.test.ts, translate.test.ts.`

**Main implementation risk:** Changing the meaning of existing frame=soft would break deliberate scope dissolution. Add an explicit appearance control for a retained scope rather than silently repurposing it.

## G05 — Native route and edge-label placement controls

**Explore — Existing waypoint capability is valuable, but coordinate and save/reopen semantics need a small design proof; edge-label persistence can ship with G02.**

**Classification:** Existing model capability rejected by native persistence. **Severity:** Medium to high for constrained editorial arrangements. **Frequency:** 6/30 accepted cases across 6 consolidated publishers (Cloudflare, Crafting Interpreters, Jay Alammar, Martin Fowler, Transport for London, Vercel). This meets the commonness rule.

| Affected case / visible evidence | Actual files |
| --- | --- |
| [E05](corpus/vercel-fluid-transport/audit.md): TCP and HTTP corridors need repeated endpoint choices and object repositioning. | [Full comparison](corpus/vercel-fluid-transport/comparison.png) · [Detail](corpus/vercel-fluid-transport/details/comparison.png) · [v2 source](corpus/vercel-fluid-transport/v2.draft) |
| [E07](corpus/cloudflare-http2-multiplexing/audit.md): Duplicated duplex edges compete for closely spaced paths even after alignment. | [Full comparison](corpus/cloudflare-http2-multiplexing/comparison.png) · [Detail](corpus/cloudflare-http2-multiplexing/details/comparison.png) · [v2 source](corpus/cloudflare-http2-multiplexing/v2.draft) |
| [E11](corpus/e11-transformer-stacks/audit.md): A shared fanout origin becomes several orthogonal elbows; repeated explicit endpoints reduce ambiguity but do not reproduce the chosen paths. | [Full comparison](corpus/e11-transformer-stacks/comparison.png) · [Detail](corpus/e11-transformer-stacks/details/comparison.png) · [v2 source](corpus/e11-transformer-stacks/v2.draft) |
| [E13](corpus/e13-cqrs/audit.md): Longer orthogonal reads/writes replace compact perimeter paths and annotation relationships. | [Full comparison](corpus/e13-cqrs/comparison.png) · [Detail](corpus/e13-cqrs/details/comparison.png) · [v2 source](corpus/e13-cqrs/v2.draft) |
| [E21](corpus/e21-open-upvalue/audit.md): Pointer paths still run along record borders and through the Stack title after explicit endpoint choices. | [Full comparison](corpus/e21-open-upvalue/comparison.png) · [Detail](corpus/e21-open-upvalue/details/comparison.png) · [v2 source](corpus/e21-open-upvalue/v2.draft) |
| [E28](corpus/E28-tfl-tram/audit.md): Pinned station labels cannot preserve authored octilinear paths or shared route segments. | [Full comparison](corpus/E28-tfl-tram/comparison.png) · [Detail](corpus/E28-tfl-tram/details/comparison.png) · [v2 source](corpus/E28-tfl-tram/v2.draft) |

**Checked source:** `src/model/types.ts: EdgeLayout.waypoints/labelDx/labelDy; src/model/routes.ts: laneBends/routeInput/drawRoutes/placeEdgeLabels; src/dsl/translate.ts: rejectUnsupported; src/dsl/syntax.ts: edge allowlist.`

**Capability boundary:** Waypoints and edge-label offsets already exist internally. rejectUnsupported explicitly prevents saving changed bends or label positions to native files. Exposing them will not itself add arbitrary Bézier curves, shared buses or repair default endpoint behavior.

**Current workaround:** Reposition actual nodes/groups, set from/to sides, tune global routing controls, or accept the automatic route. The files retain these controls visibly.

**Cost interpretation:** Explicit port lines and pins are counted independently. The corpus does not claim that every pin would disappear after waypoint support; many pins define the intended composition.

| Case | v2 lines | Pins | Dimension lines | Port lines | Cycles |
| --- | --- | --- | --- | --- | --- |
| [E05](corpus/vercel-fluid-transport/audit.md) | 35 | 5 | 8 | 3 | 3 |
| [E07](corpus/cloudflare-http2-multiplexing/audit.md) | 86 | 8 | 16 | 24 | 2 |
| [E11](corpus/e11-transformer-stacks/audit.md) | 68 | 15 | 14 | 16 | 3 |
| [E13](corpus/e13-cqrs/audit.md) | 57 | 13 | 16 | 8 | 3 |
| [E21](corpus/e21-open-upvalue/audit.md) | 51 | 7 | 13 | 7 | 3 |
| [E28](corpus/E28-tfl-tram/audit.md) | 164 | 39 | 39 | 40 | 2 |

**Proposed proof, not executed:** Round-trip a manually chosen corridor and label placement without moving semantic nodes, then recompile deterministically. E05 and E11 are development proofs; E28 confirms cartographic limitations separately. Default routes must remain unchanged when no controls are specified.

**Relevant existing tests / proposed additions:** `tests/translate.test.ts, layout-edits.test.ts, routing-ports.test.ts, routing-direction.test.ts, routing-clearance.test.ts, edge-labels.test.ts.`

**Main implementation risk:** Saved bends can become stale after label growth or node moves. Validation must report stale/obstructed controls rather than silently discard them or snap back.

## G06 — Directed contours, smooth loops and cyclic regions

**Explore — The need recurs, but one generic curve switch will not cover all the semantics.**

**Classification:** Missing path/region primitives and layout recipes. **Severity:** High when the path shape itself explains the concept. **Frequency:** 5/30 accepted cases across 5 consolidated publishers (Design Council, Ellen MacArthur Foundation, NASA Science, OpenStax / Rice University, Stripe). This meets the commonness rule.

| Affected case / visible evidence | Actual files |
| --- | --- |
| [E08](corpus/stripe-read-compare/audit.md): Two sweeping read paths become orthogonal paths with different convergence. | [Full comparison](corpus/stripe-read-compare/comparison.png) · [Detail](corpus/stripe-read-compare/details/comparison.png) · [v2 source](corpus/stripe-read-compare/v2.draft) |
| [E23](corpus/E23-nasa-star-life/audit.md): Two broad stellar lifecycle loops become thin elbow routes. | [Full comparison](corpus/E23-nasa-star-life/comparison.png) · [Detail](corpus/E23-nasa-star-life/details/comparison.png) · [v2 source](corpus/E23-nasa-star-life/v2.draft) |
| [E26](corpus/E26-design-double-diamond/audit.md): The two directed divergence/convergence contours lose perimeter arrows and sloped phase labels. | [Full comparison](corpus/E26-design-double-diamond/comparison.png) · [Detail](corpus/E26-design-double-diamond/details/comparison.png) · [v2 source](corpus/E26-design-double-diamond/v2.draft) |
| [E27](corpus/E27-emf-butterfly/audit.md): Nested return loops no longer show shorter and longer value-preserving cycles through their shape. | [Full comparison](corpus/E27-emf-butterfly/comparison.png) · [Detail](corpus/E27-emf-butterfly/details/comparison.png) · [v2 source](corpus/E27-emf-butterfly/v2.draft) |
| [E30](corpus/E30-openstax-cell-cycle/audit.md): Annular phase bands and sector extent are replaced by a rectangular cycle with split Interphase tint. | [Full comparison](corpus/E30-openstax-cell-cycle/comparison.png) · [Detail](corpus/E30-openstax-cell-cycle/details/comparison.png) · [v2 source](corpus/E30-openstax-cell-cycle/v2.draft) |

**Checked source:** `src/model/routes.ts: drawRoutes uses roundedPath; src/cli/svg.ts: path and marker rendering; src/dsl/syntax.ts: layout/shape vocabulary; src/dsl/compile.ts: recipe dispatch; src/model/types.ts.`

**Capability boundary:** Rounded orthogonal corners already exist. They are not arbitrary smooth curves, directed closed contours, annular regions or radial layout. These cases require different semantic abstractions, not just a larger corner radius.

**Current workaround:** Pin nodes around the desired silhouette and use orthogonal return edges, with explicit notes about the missing spatial meaning.

**Cost interpretation:** E23/E27 use one pin and size per principal node; E30 adds manual geometry yet has lower judged quality than v0. Those measurements do not prove the cost of a future radial recipe.

| Case | v2 lines | Pins | Dimension lines | Port lines | Cycles |
| --- | --- | --- | --- | --- | --- |
| [E08](corpus/stripe-read-compare/audit.md) | 29 | 3 | 5 | 2 | 3 |
| [E23](corpus/E23-nasa-star-life/audit.md) | 56 | 12 | 12 | 13 | 3 |
| [E26](corpus/E26-design-double-diamond/audit.md) | 13 | 2 | 2 | 1 | 3 |
| [E27](corpus/E27-emf-butterfly/audit.md) | 108 | 22 | 22 | 14 | 2 |
| [E30](corpus/E30-openstax-cell-cycle/audit.md) | 36 | 6 | 6 | 6 | 2 |

**Proposed proof, not executed:** Prototype one narrow primitive at a time: ordered nested return lanes on E27, then a directed cyclic band proof on a non-confirmation fixture. Test E30 only after the design is chosen. Readers should be able to follow cycle direction and membership without corrective explanatory notes.

**Relevant existing tests / proposed additions:** `New path/region fixture tests if pursued; tests/routing-direction.test.ts, routing-clearance.test.ts, routing-group-borders.test.ts, bounds.test.ts and CLI/canvas export parity.`

**Main implementation risk:** Generic vector editing could overwhelm the semantic DSL and create difficult text/path bounds problems. Keep an exploratory branch separate from immediate default fixes.

## G07 — A small missing semantic shape vocabulary

**Explore — Three compact shape needs recur across different publishers; full illustration is a separate problem.**

**Classification:** Missing native geometric primitives. **Severity:** Medium; sometimes semantic, sometimes stylistic. **Frequency:** 3/30 accepted cases across 2 consolidated publishers (Figma, Google (Chrome, web.dev, Go)). This meets the commonness rule.

| Affected case / visible evidence | Actual files |
| --- | --- |
| [E04](corpus/figma-database-migration/audit.md): Pills/circles substitute for database cylinders. | [Full comparison](corpus/figma-database-migration/comparison.png) · [Detail](corpus/figma-database-migration/details/comparison.png) · [v2 source](corpus/figma-database-migration/v2.draft) |
| [E09](corpus/figma-journal-checkpoints/audit.md): A diamond substitutes for an octagon and a pill for a freeform patch; overlap and canvas state are reduced. | [Full comparison](corpus/figma-journal-checkpoints/comparison.png) · [Detail](corpus/figma-journal-checkpoints/details/comparison.png) · [v2 source](corpus/figma-journal-checkpoints/v2.draft) |
| [E19](corpus/e19-pixel-pipeline/audit.md): Separated rectangles and small connectors replace a contiguous chevron pipeline. | [Full comparison](corpus/e19-pixel-pipeline/comparison.png) · [Detail](corpus/e19-pixel-pipeline/details/comparison.png) · [v2 source](corpus/e19-pixel-pipeline/v2.draft) |

**Checked source:** `src/dsl/syntax.ts: DSL_SHAPES/DslShape; src/model/types.ts: ShapeKind; src/cli/svg.ts: outline; src/model/labels.ts: titleArea; src/model/routes.ts: portPoint.`

**Capability boundary:** Native shapes are box, pill, circle, diamond, text and marker. The model also has icon/image kinds, but native files reject their persistence. Adding a cylinder or chevron requires native shape measurement, attachment and export work; an image of the entire reference is not a native recreation. Each particular new outline appears in one accepted case; the three-case count supports a vocabulary limitation, not a claim that any one proposed shape is individually common.

**Current workaround:** Use a labeled existing shape, keep the substitution explicit, and score the lost visual meaning separately. The source remains editable at the substitute level.

**Cost interpretation:** Manual sizes and explanatory labels can make the substitute clearer but cannot create the missing outline. Their source counts are measured; a new primitive's effort benefit is unmeasured.

| Case | v2 lines | Pins | Dimension lines | Port lines | Cycles |
| --- | --- | --- | --- | --- | --- |
| [E04](corpus/figma-database-migration/audit.md) | 93 | 19 | 23 | 21 | 2 |
| [E09](corpus/figma-journal-checkpoints/audit.md) | 96 | 21 | 30 | 0 | 3 |
| [E19](corpus/e19-pixel-pipeline/audit.md) | 16 | 0 | 5 | 0 | 2 |

**Proposed proof, not executed:** Compare a narrow cylinder and contiguous-stage proof using E04 and E19; preserve labels, arrow attachment and small-size legibility. Do not select a large icon library merely to match brands.

**Relevant existing tests / proposed additions:** `tests/title-wrap.test.ts, bounds.test.ts, model.test.ts, routing-ports.test.ts, dsl.test.ts, translate.test.ts.`

**Main implementation risk:** Shape additions can multiply sizing and routing edge cases. Keep pictorial terrain, stars and cartoon characters out of the scope of this small vocabulary proposal.

## G08 — Shared geometry across repeated editorial panels

**Explore — Repeated scenes require repeated geometry, while native comparison features have narrower semantics.**

**Classification:** Awkward authoring controls; recipe/design exploration. **Severity:** Medium. **Frequency:** 5/30 accepted cases across 3 consolidated publishers (Figma, MDN Web Docs, Wizard Zines). This meets the commonness rule.

| Affected case / visible evidence | Actual files |
| --- | --- |
| [E04](corpus/figma-database-migration/audit.md): Four migration scenes repeat a coordinate template using 19 pins and 19 exact node sizes. | [Full comparison](corpus/figma-database-migration/comparison.png) · [Detail](corpus/figma-database-migration/details/comparison.png) · [v2 source](corpus/figma-database-migration/v2.draft) |
| [E09](corpus/figma-journal-checkpoints/audit.md): Nine checkpoint/journal panels repeat shape placement with 21 pins, 21 sizes and nine panel minimum dimensions. | [Full comparison](corpus/figma-journal-checkpoints/comparison.png) · [Detail](corpus/figma-journal-checkpoints/details/comparison.png) · [v2 source](corpus/figma-journal-checkpoints/v2.draft) |
| [E14](corpus/e14-dns-hierarchy/audit.md): Five explanatory panels need a manually maintained reading grid. | [Full comparison](corpus/e14-dns-hierarchy/comparison.png) · [Detail](corpus/e14-dns-hierarchy/details/comparison.png) · [v2 source](corpus/e14-dns-hierarchy/v2.draft) |
| [E15](corpus/e15-js-agent-cluster/audit.md): Mirrored agent bands duplicate realm/heap/stack geometry. | [Full comparison](corpus/e15-js-agent-cluster/comparison.png) · [Detail](corpus/e15-js-agent-cluster/details/comparison.png) · [v2 source](corpus/e15-js-agent-cluster/v2.draft) |
| [E22](corpus/e22-dns-query/audit.md): Six numbered panels and record rows repeat a visual template manually. | [Full comparison](corpus/e22-dns-query/comparison.png) · [Detail](corpus/e22-dns-query/details/comparison.png) · [v2 source](corpus/e22-dns-query/v2.draft) |

**Checked source:** `src/model/panels.ts; src/dsl/compare.ts; src/dsl/compile.ts: group layout/order/pin handling; src/dsl/syntax.ts; src/model/types.ts.`

**Capability boundary:** Existing compare and emphasis-state panels are useful, but their graph/version semantics do not directly express arbitrary editorial panels with shared positions. In particular, native state declarations and inspect --states already draw labeled panels from one layout and can fade nonfocused objects; compare already aligns before/after version panels. E09's rejected state=muted node attribute is an authoring error, not evidence that focus or dimming is absent. The study did not exhaustively evaluate those existing panel paths or implement a template system, so assess their applicability before adding new shared-geometry syntax.

**Current workaround:** Repeat groups and explicit geometry, using stable IDs and comments to expose correspondence.

**Cost interpretation:** This is a direct source-burden finding. Corresponding objects have repeated pins/sizes; aggregate counts are not a stopwatch measurement. A label edit's maintenance burden is assessed, not experimentally measured.

| Case | v2 lines | Pins | Dimension lines | Port lines | Cycles |
| --- | --- | --- | --- | --- | --- |
| [E04](corpus/figma-database-migration/audit.md) | 93 | 19 | 23 | 21 | 2 |
| [E09](corpus/figma-journal-checkpoints/audit.md) | 96 | 21 | 30 | 0 | 3 |
| [E14](corpus/e14-dns-hierarchy/audit.md) | 71 | 20 | 15 | 0 | 2 |
| [E15](corpus/e15-js-agent-cluster/audit.md) | 136 | 34 | 33 | 0 | 3 |
| [E22](corpus/e22-dns-query/audit.md) | 98 | 23 | 24 | 4 | 3 |

**Proposed proof, not executed:** Use E04/E09 to test whether a small correspondence/slot mechanism preserves aligned counterparts with fewer repeated controls. Make one content edit and inspect all affected panels. E10 is a confirmation for whether simpler native rows remain adequate.

**Relevant existing tests / proposed additions:** `tests/compare.test.ts, states.test.ts, refinement-drift.test.ts, group-fit.test.ts, translate.test.ts.`

**Main implementation risk:** Premature macros can obscure meaning and complicate source edits. First determine whether shared layout constraints solve the cases without a general templating language.

## G09 — Dark-theme notes use incompatible foreground and surface

**Build — A small demonstrated correctness fix should precede broader styling work.**

**Classification:** Reproduced default contrast defect. **Severity:** High locally; narrow affected feature. **Frequency:** 2/30 accepted cases across 2 consolidated publishers (NASA Science, Vercel). This is important reproduced stress evidence, below the commonness threshold.

| Affected case / visible evidence | Actual files |
| --- | --- |
| [E05](corpus/vercel-fluid-transport/audit.md): The v1 dark Vercel note has pale text on a pale note panel. | [Full comparison](corpus/vercel-fluid-transport/comparison.png) · [Detail](corpus/vercel-fluid-transport/details/comparison.png) · [v2 source](corpus/vercel-fluid-transport/v2.draft) |
| [E23](corpus/E23-nasa-star-life/audit.md): The v1 dark NASA note independently shows the same near-unreadable combination. | [Full comparison](corpus/E23-nasa-star-life/comparison.png) · [Detail](corpus/E23-nasa-star-life/details/comparison.png) · [v2 source](corpus/E23-nasa-star-life/v2.draft) |

**Checked source:** `src/model/note.ts: noteMarkup chooses swatchFor(look,'slate',50,'group') for panel.fill but look.text for the note text; src/model/appearance.ts: swatch resolution.`

**Capability boundary:** This is not an unavailable publisher font or subjective style difference. Both actual v1 renders expose the same foreground/background mismatch. Two cases from two publishers is reproduced stress evidence, below this study's commonness threshold.

**Current workaround:** The v2 files override theme-color slate shade=50 with a dark surface and light ink. The renderer still reads look.text for the text.

**Cost interpretation:** One extra palette line with three assignments in each final case; it also couples the workaround to any other use of that shade.

| Case | v2 lines | Pins | Dimension lines | Port lines | Cycles |
| --- | --- | --- | --- | --- | --- |
| [E05](corpus/vercel-fluid-transport/audit.md) | 35 | 5 | 8 | 3 | 3 |
| [E23](corpus/E23-nasa-star-life/audit.md) | 56 | 12 | 12 | 13 | 3 |

**Proposed proof, not executed:** E05 and E23 notes must remain readable without the workaround on their dark canvas; light notes and custom swatches must retain intended contrast. Inspect both SVG and PNG.

**Relevant existing tests / proposed additions:** `tests/notes.test.ts, themes.test.ts, drawn-colors.test.ts.`

**Main implementation risk:** Blindly replacing look.text with an ink role without checking custom swatches may change legitimate note styles. Preserve intended surface/foreground pairing explicitly.

## G10 — Metric time is not a native timeline abstraction

**Explore — Manual scaled pins can preserve one timeline, but the coordinate arithmetic belongs in a reusable abstraction if the need grows.**

**Classification:** Missing domain recipe; manual workaround available. **Severity:** High for temporal meaning; limited corpus incidence. **Frequency:** 2/30 accepted cases across 2 consolidated publishers (Cloudflare, Stripe). This is important reproduced stress evidence, below the commonness threshold.

| Affected case / visible evidence | Actual files |
| --- | --- |
| [E01](corpus/cloudflare-tls-handshake/audit.md): The sequence preserves flight order but not slanted time-of-flight or timed phase extent. | [Full comparison](corpus/cloudflare-tls-handshake/comparison.png) · [Detail](corpus/cloudflare-tls-handshake/details/comparison.png) · [v2 source](corpus/cloudflare-tls-handshake/v2.draft) |
| [E02](corpus/stripe-synchronized-retries/audit.md): Default equal spacing loses exponential backoff spacing; final v2 restores proportional event centers with 15 pins and 15 sizes. | [Full comparison](corpus/stripe-synchronized-retries/comparison.png) · [Detail](corpus/stripe-synchronized-retries/details/comparison.png) · [v2 source](corpus/stripe-synchronized-retries/v2.draft) |

**Checked source:** `src/dsl/compile.ts: sequenced; src/model/routes.ts: messageRoute; src/dsl/syntax.ts: layout recipe choices; docs/DSL.md: sequence behavior.`

**Capability boundary:** Sequence rows are ordinal message events, not a quantitative time axis. No finding implies that the sequence recipe should silently become time-scaled. The v2 retry diagram demonstrates a possible but laborious workaround.

**Current workaround:** Encode explicit times in labels and calculate pin coordinates from a common scale. Keep flight durations labeled as schematic when not geometrically represented.

**Cost interpretation:** E02 has 30 pin/size lines for 15 event objects, plus repeated timing labels. Authoring minutes and future time savings are not measured.

| Case | v2 lines | Pins | Dimension lines | Port lines | Cycles |
| --- | --- | --- | --- | --- | --- |
| [E01](corpus/cloudflare-tls-handshake/audit.md) | 15 | 0 | 0 | 0 | 2 |
| [E02](corpus/stripe-synchronized-retries/audit.md) | 71 | 15 | 15 | 0 | 2 |

**Proposed proof, not executed:** A separate timeline proof should reproduce the common event centers for t0, t0+1, +2, +4 and +8 from data values; label edits must not alter those positions. E01 checks that ordinal sequence behavior remains stable.

**Relevant existing tests / proposed additions:** `New metric-timeline fixture tests if pursued; existing tests/sequence.test.ts and layout-fit.test.ts remain protection.`

**Main implementation risk:** A universal time axis would conflate duration, ordering and protocol-flight notation. Keep any new recipe opt-in.

## G11 — Cell and open-group endpoint routing needs targeted repair

**Build — These are concrete route correctness cases, distinct from exposing manual bends.**

**Classification:** Observed default routing defect/limitation. **Severity:** High in the affected pointer diagrams. **Frequency:** 2/30 accepted cases across 2 consolidated publishers (Crafting Interpreters, Wizard Zines). This is important reproduced stress evidence, below the commonness threshold.

| Affected case / visible evidence | Actual files |
| --- | --- |
| [E21](corpus/e21-open-upvalue/audit.md): Initial group-target routes cross fields; final explicit ports still put the upvalue-to-stack route through the Stack title and approach a bottom endpoint from above. | [Full comparison](corpus/e21-open-upvalue/comparison.png) · [Detail](corpus/e21-open-upvalue/details/comparison.png) · [v2 source](corpus/e21-open-upvalue/v2.draft) |
| [E22](corpus/e22-dns-query/audit.md): An earlier v2 route to a record container crosses record fields; semantic field targeting and explicit sides repair the retained final case. | [Full comparison](corpus/e22-dns-query/comparison.png) · [Detail](corpus/e22-dns-query/details/comparison.png) · [v2 source](corpus/e22-dns-query/v2.draft) |

**Checked source:** `src/model/routes.ts: cellEnds/routeInput/drawRoutes; src/engines/routing-engine.js: side selection/stubs/ancestor handling; src/dsl/conflicts.ts: sceneConflicts.`

**Capability boundary:** Interior cells without a free side intentionally get a crossing segment. Open-group targets instead use frame-sized stubs. Explicit from/to sides select endpoints but do not guarantee a clear outward departure or approach in E21. E22's successful workaround means group attachment is not wholly unsupported.

**Current workaround:** Use exact semantic field targets when appropriate and explicit from/to sides; preserve group targets when the pointer means the record as a whole. Do not silently change the target solely to make a route look better.

**Cost interpretation:** Repeated port overrides plus manual group placement; E21 still retains an edge-through-title warning. The source and geometry, not only visual scores, support this finding.

| Case | v2 lines | Pins | Dimension lines | Port lines | Cycles |
| --- | --- | --- | --- | --- | --- |
| [E21](corpus/e21-open-upvalue/audit.md) | 51 | 7 | 13 | 7 | 3 |
| [E22](corpus/e22-dns-query/audit.md) | 98 | 23 | 24 | 4 | 3 |

**Proposed proof, not executed:** Reduce E21 to a regression fixture that preserves record targets and requires outward approach without traversing unrelated fields or the title. E22 tests container-versus-field targeting; E17 is a positive control for valid slice-to-cell attachment.

**Relevant existing tests / proposed additions:** `tests/cells.test.ts, routing-direction.test.ts, routing-ports.test.ts, routing-group-borders.test.ts, routing-clearance.test.ts.`

**Main implementation risk:** A global clearance adjustment can break legitimate interior-cell references. Fix endpoint/stub behavior using semantic target type, not a corpus-wide penalty tweak.

## G12 — Fit diagnostics should distinguish padding policy from visible clipping

**Build — The current warning can imply clipped text when the glyphs visibly fit.**

**Classification:** Diagnostic precision and guidance. **Severity:** Medium for author trust; not a demonstrated unreadability failure. **Frequency:** 2/30 accepted cases across 2 consolidated publishers (Jay Alammar, NOAA Climate.gov). This is important reproduced stress evidence, below the commonness threshold.

| Affected case / visible evidence | Actual files |
| --- | --- |
| [E11](corpus/e11-transformer-stacks/audit.md): Twelve final compact ENCODER/DECODER boxes receive text-overflow warnings although their labels are visibly contained. | [Full comparison](corpus/e11-transformer-stacks/comparison.png) · [Detail](corpus/e11-transformer-stacks/details/comparison.png) · [v2 source](corpus/e11-transformer-stacks/v2.draft) |
| [E24](corpus/E24-noaa-enso/audit.md): Four final 52-pixel YES/NO diamonds receive fit warnings despite the short words fitting the outlines. | [Full comparison](corpus/E24-noaa-enso/comparison.png) · [Detail](corpus/E24-noaa-enso/details/comparison.png) · [v2 source](corpus/E24-noaa-enso/v2.draft) |

**Checked source:** `src/model/labels.ts: titleArea/diamondMeasure; src/dsl/compile.ts: text-overflow diagnostics; tests/title-wrap.test.ts; scripts/diagram-audit.mjs: heuristic text/shape measures.`

**Capability boundary:** The warnings reflect the baseline's conservative text/padding fit policy, not necessarily escaped or clipped glyphs. This study does not suppress them or call them proof that all diagnostics are wrong.

**Current workaround:** Use larger shapes to satisfy the fit policy or retain a documented warning after visual inspection. Both choices have a layout cost.

**Cost interpretation:** Sixteen final warnings across these two cases are retained in warnings.csv; no extra authoring-time estimate. The diagrams are still valid native outputs.

| Case | v2 lines | Pins | Dimension lines | Port lines | Cycles |
| --- | --- | --- | --- | --- | --- |
| [E11](corpus/e11-transformer-stacks/audit.md) | 68 | 15 | 14 | 16 | 3 |
| [E24](corpus/E24-noaa-enso/audit.md) | 54 | 11 | 11 | 12 | 3 |

**Proposed proof, not executed:** Classify actual clipping separately from tight padding on E11/E24 and add a deliberately clipped control that must still warn. Keep the warning's actionable source line and avoid weakening safety margins silently.

**Relevant existing tests / proposed additions:** `tests/title-wrap.test.ts, dsl.test.ts, quality-notes.test.ts, bounds.test.ts.`

**Main implementation risk:** Relaxing padding solely to remove corpus warnings can create regressions in different fonts or longer labels. Improve diagnostic specificity before changing numerical thresholds.

## Findings kept outside the product-gap count

**Authoring mistakes and choices.** E05's final legend overgeneralizes solid-arrow meaning; E12's plus shorthand can misstate concatenation; E16's use of `directed=false` intentionally changes a logical relation and weakens direction; E26 merges independent phases in order to imitate a contour. These affect ratings but are not renderer defects. E03/E08/E20 also have oversized author-chosen geometry that makes publication-width text smaller. E07's default tangle reflects both declaration/layout choices and the duplicated-edge workaround. Native failures from reserved `root` identifiers, a negative pin, `gap=0` and an unsupported state attribute are retained as authoring evidence, not asserted missing capabilities.

**Unavailable fonts and deliberate style differences.** Handwritten, publisher-specific or proprietary faces, sketch texture, gradients, shadows and pictorial medallions are recorded in fidelity residuals. The bundled deterministic fonts stayed fixed. A different but readable pointer or pipeline is acceptable on quality even when it differs in fidelity. No new font was installed to conceal the boundary.

**Pictorial and physical semantics.** E20/E25 cannot retain conceptual terrain/geographic cutaway meaning by relabeling a general graph. These cases are retained as explicit product-scope boundaries. They do not justify a broad illustration editor ahead of repeated caption, text and relation needs. E23's scientific imagery also carries recognition and scale cues that colored circles do not replace.

**Existing native alternatives not exhausted.** Emphasis-state shared-layout export exists; compare/version panels exist; supported endpoint sides repair some routes; ordinary group/theme controls already produce clear examples. Three refinement cycles bound this study. It establishes demonstrated source burden and residual limits, not global optimality of every attempt or proof that no shorter native solution exists.

## Build, Explore, Defer, Avoid

- **Build:** G09, G01/G02, G03, G04, G11 and G12. Each has an actionable source boundary and a narrow proof that can improve practical editing or correctness without replacing the semantic model.
- **Explore:** G05, G08, G06, G07 and G10. Establish coordinate, correspondence, path/region, shape and metric-time contracts separately; do not collapse them into a generic drawing escape hatch.
- **Defer:** exact publisher fonts, decorative shadows/textures, unconstrained geographic/pictorial illustration and broad rich mathematical typesetting until a narrower need is demonstrated.
- **Avoid:** embedding reference images, hidden SVG/raster tracing, changing defaults to fit one confirmation case, misusing change-status paint, treating warnings/DI as quality, or reducing source by dropping semantics.

The implementation plan supplies the staged module/test/proof/risk sequence. The six confirmation cases E06, E10, E16, E20, E28 and E30 must not determine numerical tuning values. Their future results remain unexecuted.
