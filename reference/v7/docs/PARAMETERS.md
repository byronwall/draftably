# Layout and routing parameters
## Diagram Studio v7 · current implementation reference

These are the defaults and ranges in the supplied source, not an ELK or libavoid configuration. A loaded example or imported document may override the defaults. Layout/routing dimensions are **world pixels**, except for the v7 brush radius and lookahead threshold, which are screen pixels and are explicitly converted to world space.

Use **Compare** (Alt+E) to see alternatives. Choose **Parameter grid**, an approach, column parameter/values, and optionally row parameter/values. Generate recomputes from the frozen baseline, not from the previously displayed cell. Ports & routes uses the same idea without changing node positions.

## 1. Run intentions

| Start | Meaning |
| --- | --- |
| Rebuild & settle | Deterministic seed, protected geometry retained, iterate to stability/plateau/effort limit. |
| Current positions → settle | No canonical reseed; continue from the current drawing without the small-pass displacement cap. |
| One bounded pass | Use movement limit and stability from the starting document. This is not terminal settling. |

Settled comparison effort offers 320, 640, or 1,200 iterations **per solve**. The engine also has minimum stability observation and objective-plateau windows. Read the stop label and warnings; “settled” does not mean globally optimal or guaranteed crossing-free. Pins, parent frames, inherited direction, and scope can prevent preferred placement.

## 2. Layout controls

### `algorithm`

**Default:** `tidy`. **Range/choices:** 11 IDs below.

One of eleven active families. Old radial imports map to tree without rearranging existing positions.

### `direction`

**Default:** `RIGHT`. **Range/choices:** RIGHT / DOWN.

RIGHT is left-to-right; DOWN is top-to-bottom. Containers may override it for their contents.

### `mode`

**Default:** `pass`. **Range/choices:** pass / rebuild invocation.

The saved editor preference normalizes to pass. Rebuild is an explicit invocation, not a new permanent mode.

### `maxMove`

**Default:** `48`. **Range/choices:** 4–300.

Maximum world displacement during one bounded action, including inherited parent translation. Not used as a small cap in settled runs.

### `stability`

**Default:** `65`. **Range/choices:** 0–100.

Strength of attachment to the pre-pass geometry. Higher values resist unnecessary movement; only offered for pass comparisons.

### `iterations`

**Default:** `32`. **Range/choices:** 4–160.

Iteration budget for one bounded solve. Rounded to an integer. Settled comparisons use the separate maximum effort instead.

### `nodeGap`

**Default:** `24`. **Range/choices:** 4–160.

Preferred gap between sibling shape rectangles, in world pixels. Infeasible spacing remains subject to pins and frame size.

### `rankGap`

**Default:** `52`. **Range/choices:** 12–220.

Desired separation between forward ranks, including node extents. Does not mean center-to-center distance.

### `edgeLength`

**Default:** `88`. **Range/choices:** 20–260.

Preferred link-length component for spring/stress-style arrangements; shape dimensions also contribute to the internal ideal.

### `repulsion`

**Default:** `45`. **Range/choices:** 0–100.

Force-family repulsion control. Higher is not always better; compare actual bounding size and labels at fit scale.

### `flowStrength`

**Default:** `65`. **Range/choices:** 0–100.

Strength of soft forward pressure. Respect arrows also enables a separate forward projection; zero alone is not the off switch.

### `alignment`

**Default:** `55`. **Range/choices:** 0–100.

Attraction toward shared neighbor/target alignments. It is not a permanent snap constraint.

### `compactness`

**Default:** `35`. **Range/choices:** 0–100.

Packing/centering pressure. Does not authorize overlap or pin movement.

### `gridStrength`

**Default:** `45`. **Range/choices:** 0–100.

Soft attraction toward target cells. Manual movement remains possible.

### `aspect`

**Default:** `1.6`. **Range/choices:** canvas / 0.75 / 1 / 1.333 / 1.6 / 2.

Packing/folding hint, not a guaranteed final aspect ratio. canvas uses the captured viewport ratio.

### `fold`

**Default:** `never`. **Range/choices:** never / auto.

Optional wrapping for eligible rank layouts. Respect arrows suppresses folding; use false for that preference to compare folding deliberately.

### `respectDirection`

**Default:** `true`. **Range/choices:** true / false.

Shared directed-edge objective/projection for connective methods. Undirected edges do not impose rank. Separate overlaps deliberately ignores this structural objective.

### `ordering`

**Default:** `stable`. **Range/choices:** stable / crossings.

Stable ordering versus crossing-oriented rank ordering. Crossings is a heuristic, not a crossing-free guarantee.

### `rootId`

An authored start in `layout.intent` takes precedence for that solve. The original rootId preference is retained in the resulting document; clearing start does not leave an invisible replacement root.

**Default:** `(empty)`. **Range/choices:** existing ID or empty.

Stable node ID used by rooted tree interpretation; empty chooses deterministically. It is not the camera focus selector.

### `respectManual`

**Default:** `false`. **Range/choices:** true / false.

Treat manual flags as layout protections in addition to explicit pins.

### `growContainers`

**Default:** `false`. **Range/choices:** true / false.

Permit right/down growth of frames. Does not shrink-wrap every result or move children during resize.

### `boundaryPull`

**Default:** `65`. **Range/choices:** 0–100.

Strength of actual endpoint alignment/attraction across hierarchy boundaries.

### `hierarchySweeps`

**Default:** `2`. **Range/choices:** 1–4.

Number of compound hierarchy passes, rounded to integer. Total work can include multiple sibling solves per pass.

### `groupGap`

**Default:** `48`. **Range/choices:** 12–180.

Preferred sibling container separation for compound approaches.

## 3. Active approaches and useful controls

### Compound flow · `compound-flow`

**Family:** Cross-hierarchy layered. Order nested blocks by all their connections; bring inputs and outputs toward the relevant boundary.

Bottom-up projected sibling graphs plus global terminal ranks and exact-endpoint boundary forces. Alternating hierarchy sweeps let inner and outer levels inform each other. An original heuristic, not ELK.

**Approach-specific controls:** `rankGap`, `groupGap`, `boundaryPull`, `hierarchySweeps`, `ordering`, `fold`. Shared constraints and arrow preference also apply, except structural direction is not a goal for Separate overlaps.

### Boundary alignment · `boundary-align`

**Family:** Cross-hierarchy local repair. Line up connected endpoints across containers without rebuilding the whole structure.

Warm-start transverse endpoint alignment and mild link-length relaxation, applied to leaves and translated subtrees. No hard rank assignment during improvement passes. Scope, pins and total displacement caps remain in force.

**Approach-specific controls:** `boundaryPull`, `hierarchySweeps`, `alignment`, `groupGap`. Shared constraints and arrow preference also apply, except structural direction is not a goal for Separate overlaps.

### Compound spring · `compound-spring`

**Family:** Hierarchical force-directed. Relax nested systems using the actual connected children, rather than container centres.

Size-aware springs at actual leaf endpoints transfer force to their direct sibling owners. External neighbours act as temporary boundary anchors. Rectangular separation and alternating hierarchy sweeps constrain the result. Not CoSE or fCoSE.

**Approach-specific controls:** `edgeLength`, `boundaryPull`, `hierarchySweeps`, `groupGap`, `compactness`. Shared constraints and arrow preference also apply, except structural direction is not a goal for Separate overlaps.

### Local tidy · `tidy`

**Family:** Local optimisation. Shorten stretched links and align nearby neighbours. Keep the overall arrangement.

A warm-start spring / alignment hybrid with a displacement anchor and rectangular separation. Designed for small repairs, not global crossing optimisation.

**Approach-specific controls:** `edgeLength`, `alignment`, `compactness`. Shared constraints and arrow preference also apply, except structural direction is not a goal for Separate overlaps.

### Stress descent · `stress`

**Family:** Distance optimisation. Balance the whole network using graph distances, without restarting it.

Weighted all-pairs shortest-path stress, solved with diagonal-preconditioned gradient steps. Anchored and projected; not an implementation of the full stress-majorisation algorithm.

**Approach-specific controls:** `edgeLength`, `compactness`. Shared constraints and arrow preference also apply, except structural direction is not a goal for Separate overlaps.

### Spring network · `force`

**Family:** Force-directed. Let connected clusters find an organic, compact arrangement.

Fruchterman–Reingold-style attraction and repulsion with cooling and rectangular collision projection. Quadratic pair evaluation, not Barnes–Hut.

**Approach-specific controls:** `edgeLength`, `repulsion`, `compactness`. Shared constraints and arrow preference also apply, except structural direction is not a goal for Separate overlaps.

### Directional flow · `flow`

**Family:** Constraint relaxation. Encourage a reading direction without forcing rows or columns.

Soft directed separation constraints on a cycle-broken graph, plus edge springs and neighbour alignment. Feedback edges remain rendered; they do not impose contradictory directional constraints.

**Approach-specific controls:** `edgeLength`, `flowStrength`, `alignment`. Shared constraints and arrow preference also apply, except structural direction is not a goal for Separate overlaps.

### Layered + fold · `layered`

**Family:** Hierarchical. Ranks and crossing sweeps, with optional aspect-aware folding.

A local Sugiyama-style pipeline: deterministic feedback-edge handling, longest-path ranks, barycentric sweeps, dimension-aware coordinates and optional row folding. Not ELK or Graphviz.

**Approach-specific controls:** `rankGap`, `ordering`, `fold`. Shared constraints and arrow preference also apply, except structural direction is not a goal for Separate overlaps.

### Subtree tree · `tree`

**Family:** Tree drawing. Centre parents above their children and give each subtree its own space.

Builds a deterministic breadth-first spanning forest, reserves subtree spans, and centres parents over their children. Non-tree edges are kept. This is a span-based implementation, not Buchheim’s linear-time tidy-tree algorithm.

**Approach-specific controls:** `rankGap`, `rootId`. Shared constraints and arrow preference also apply, except structural direction is not a goal for Separate overlaps.

### Soft grid · `grid`

**Family:** Assignment + relaxation. Attract boxes toward nearby free cells, without a permanently rigid grid.

Stable greedy nearest-free-cell assignment around the current centre, followed by soft attraction and rectangular separation. Manual movement remains unrestricted. Not globally optimal matching.

**Approach-specific controls:** `gridStrength`, `compactness`. Shared constraints and arrow preference also apply, except structural direction is not a goal for Separate overlaps.

### Separate overlaps · `separate`

**Family:** Geometric repair. Move only colliding neighbours. Leave clean regions alone.

Pairwise minimum-axis translations of padded rectangles, with hard pins, boundary constraints and a per-action movement limit. Does not optimise connectivity or promise a globally minimum displacement.

**Approach-specific controls:** . Shared constraints and arrow preference also apply, except structural direction is not a goal for Separate overlaps.

The retired `radial` setting is not an active algorithm. Existing imported geometry is retained and the next chosen layout uses `tree`. Historical v4 guide pages are not duplicated in this release; their inventory is not the current selector.

## 4. Route controls

Automatic ports, route search, simplification, and lane nudging use the same geometry. Explicit endpoint sides and waypoints remain constraints unless you deliberately release them. The renderer rounds corners only after route geometry has been chosen.

### `clearance`

**Default:** `10`. **Range:** 4–30.

World-space obstacle buffer. Independent of the preferred gap between routes.

### `portGap`

**Default:** `16`. **Range:** 6–28.

Preferred endpoint spacing along a shape side. Capacity can limit achievable spacing.

### `edgeGap`

**Default:** `16`. **Range:** 4–48.

Preferred buffer between overlapping parallel route runs. A soft geometric objective with visible residual reporting, not an unconditional guarantee.

### `bendPenalty`

**Default:** `32`. **Range:** 0–100.

Cost per bend. Higher favors simpler, possibly longer routes.

### `crossingPenalty`

**Default:** `360`. **Range:** 0–1200.

Cost of route intersections. Higher may choose an outer detour.

### `sharedPenalty`

**Default:** `8`. **Range:** 0–20.

Penalty for reused coincident segments. Different from near-parallel spacing.

### `parallelPenalty`

**Default:** `18`. **Range:** 0–60.

Cost scale for lane-gap deficit. Zero disables the cost, not the report.

### `portStability`

**Default:** `20`. **Range:** 0–150.

Preference for previous automatic sides. Candidates share one previous-side snapshot, so comparisons are not order-dependent.

### `fanoutPenalty`

**Default:** `50`. **Range:** 0–160.

Preference for distinct useful source sides among independent branches.

### `passes`

**Default:** `3`. **Range:** 1–5.

Initial route pass plus up to four conflict-repair passes. Rounded to integer. Nudging also has its own bounded sweeps.

### `cornerRadius`

**Default:** `6`. **Range:** 0–16.

World-space SVG turn radius. Zero renders square orthogonal corners; this never substitutes for geometry simplification.

## 5. Useful experiments

**Choose an overall approach.** Start with six approaches and Rebuild & settle. Use Synced to compare absolute dimensions at one scale. Use On their own, then Fit all, to make a very wide and a very tall drawing readable side by side. Enlarge a cell before judging a small route detail.

**Test flow orientation.** Choose Layered + fold or Directional flow. Use columns `nodeGap = 12,24,44` and rows `direction = RIGHT,DOWN`. Keep Respect arrows on. The family name still contains “fold,” but folding is deliberately suppressed in this configuration.

**Test iterative improvement.** Use One bounded pass, `maxMove = 24,48,96`, and `stability = 25,80`. Each of the six cells starts from exactly the same existing drawing. This is not a sequence of six cumulative edits.

**Test nested behavior.** Use Compound flow, Boundary alignment, and Compound spring on the Nested services example. Then compare `boundaryPull = 25,65,100` and `hierarchySweeps = 1,3`. Keep an eye on frames and direction notes. A fixed frame does not expand merely because another layout would like more room.

**Test lane spacing.** Open Ports & routes, columns `edgeGap = 10,18,28` and rows `bendPenalty = 16,64`. Focus on the same node in every tile. Try `parallelPenalty = 6,18,40` next to distinguish the requested distance from the strength of the spacing preference.

**Test automatic sides versus constraints.** First generate with the fixed-side release checkbox off. Then explicitly enable it and generate again. Node positions stay unchanged in both experiments. Waypoints remain constraints; use the normal editor's Reset bends when the intended experiment needs to remove them.

**Test curvature separately.** Use `cornerRadius = 0,6,12`. Path polylines should remain the same when only radius changes. A visible tiny detour is a routing concern, not something to hide by increasing radius.

## 6. Comparison limits and exports

A parameter axis accepts one to six comma-separated values. A two-axis product may contain at most twelve candidates. Invalid values become explicit errors, and oversized products are rejected before silent truncation. The visible control list excludes parameters not used by the chosen approach/start mode.

The comparison guard is 160 shapes / 360 edges. A candidate worker has a 30-second timeout. These are safety limits, not throughput guarantees. Normal document import permits 500 shapes / 1,200 edges and should still be benchmarked with representative real diagrams before production use.

The full-viewport grid has no diagram scrolling; only the left control rail scrolls. In Grid, synced cameras share center and scale. Focus cameras share an offset around the corresponding object and a common scale. Independent cameras each have their own transform. In Overlay, one shared camera follows translation-only alignment on the clicked shape. None of these camera changes alter candidate geometry or the live diagram.

In Grid, Save sheet SVG exports completed drawings independently fitted, with scale labels—not the accidental crops left by current panel panning. In Overlay, it exports the visible, aligned layers at one common scale with their current opacity and a legend. Neither static sheet is the editable single-diagram SVG export. Save experiment retains the configuration that generated the visible cells even when the form has since been edited. The experiment JSON is not directly opened by the ordinary diagram File menu; its candidate documents are ordinary diagram objects.

## 7. Agent example

Use the browser console or a connected automation context. This operates on the current editor, not on a remote service. Opening Compare begins a default run; generateComparison cancels that run before creating the requested experiment.

```javascript
// Freeze the current diagram and open the real comparison workspace.
diagramStudio.compare('layout');

// Six independent candidates: three gaps × two directions.
const run = await diagramStudio.generateComparison({
  mode: 'layout', kind: 'parameters', algorithm: 'layered',
  run: 'rebuild', maxIterations: 640,
  axisA: 'nodeGap', valuesA: '12,24,44',
  axisB: 'direction', valuesB: 'RIGHT,DOWN'
});
console.log('[compare] generation', run);
console.log('[compare] reports', diagramStudio.explorerState());

// Read a complete clone; keep source/version with it for reproducibility.
const experiment = diagramStudio.getExperiment();
console.log('[compare] captured candidates', experiment?.candidates.length);

// Commit only after inspection. Index 0 is the first shown candidate.
// diagramStudio.applyCandidate(0);
// Or leave the live diagram untouched:
// diagramStudio.closeComparison();
```

## 8. Diagnostics and interpretation

`backwardEdges` counts remaining non-feedback directed order conflicts against the effective lowest-common-container direction. It does not count every intentional cycle return as a failed forward edge. `feedbackEdges` records the deterministic cycle-breaking heuristic's exclusions.

`lanePairs` counts parallel **segment** pairs too close together, not unique edge pairs. `minimumConflictingGap` is null when no conflict is found. `laneDeficit` weights shortfall by overlapping run length. `crossings`, `shared`, `blocked`, `bends`, and total route length provide other evidence. No single metric is a visual-quality verdict.

Inputs are never mutated by the pure engines. Route computation never moves nodes. Parameter normalization clamps numeric controls to supported ranges for ordinary import; comparison generation explicitly rejects a requested candidate value that would be clamped, so the label cannot falsely promise the original number.


## 9. Authored start/end and broad placement

`layout.intent` is an optional object. It normalizes to `{}` when absent. Its fields are independent of `layout.nodes[id].pinned` and comparison `focusId`.

```json
{
  "start": { "id": "z-input", "placement": "top-left" },
  "end": { "id": "done", "placement": "bottom-right" }
}
```

This is the value of `layout.intent`, not a complete diagram document. The IDs above exist in `examples/guided-process.json`.

| Field | Accepted meaning | Default when its role exists |
| --- | --- | --- |
| `start.id` | Existing shape; layout origin/root preference. | No role without an ID. |
| `end.id` | Different existing shape; last-rank/endpoint preference. | No role without an ID. |
| `placement` | A finite diagram-relative compass area. | Start top-left; end bottom-right. |

The finite area names are `top-left`, `left-center`, `center`, `top-center`, `top-right`, `right-center`, `bottom-left`, `bottom-center`, and `bottom-right`. The end UI omits Center because the dedicated bilateral-branch behavior belongs to a center **start**. The low-level normalizer recognizes Center as an area but does not turn an end into a branch root.

Invalid shape references, unknown area values, malformed objects, or the same shape used for both roles fail normalization. The UI maintains at most one role per shape. Containers/edges are not directly eligible, although container owners participate when a hinted descendant is laid out hierarchically.

These are soft target areas based on sibling rectangle bounds. The target for an axis is its lower bound plus half the hinted shape's extent, plus the area's 0, 0.5, or 1 fraction of the remaining extent. This keeps “top left” a relative preference rather than an absolute coordinate.

Pins and pinned ancestors, fixed frames, feasible collision avoidance, scope, and whole-action displacement limits precede the preference. All connective families share the hint machinery; Separate overlaps ignores structural placement. The ordinary RIGHT/DOWN direction remains an independent choice. A contradictory area and direction may remain approximate.

`report.intent` gives `role`, `id`, `placement`, `error`, `satisfied`, and `pinned`. Error is distance from the final sibling-relative target, in world pixels. Satisfied means error is no greater than `max(12, nodeGap)`, not exact positioning. Reports warn when a preference remains approximate.

A center start chooses a two-sided tree target with subtree-size balancing, not the retired radial-shell method. There is no radius parameter. Node/rank gap and the normal algorithm controls remain relevant. Crosslinks, scope restrictions, and relaxation can keep a complex graph from being perfectly symmetrical.

## 10. Comparison presentation controls

| Control | Values / behavior | Does it recompute geometry? |
| --- | --- | --- |
| Presentation | Grid / Overlay | No. |
| Visual anchor | Click a visible shape; Enter/Space on a focused preview shape. | No; translation-only alignment. |
| Grid navigation | Synced / Focus / Independent | No. |
| Layer opacity | 5–100%, in 5% slider steps. | No. |
| Layer emphasis | Click a layer name; it is drawn on top with labels. | No. |
| Layer visibility | Show or hide each candidate. | No. |
| All labels | Show labels in every layer rather than only the emphasized one. | No. |
| Drawing intent | One start/end and preferred areas, copied into the next candidate computation. | Only after Generate. |

Initial emphasis is 85% opacity; other layers start at 30%. Manually adjusted opacity is kept when emphasis changes. The comparison workspace is session state, not a second editable document or set of saved views.

In Overlay, the camera selector is disabled because there is one composite view, not separate cameras per layer. Returning to Grid preserves the grid camera mode. Fit shows the complete visible composite. Choosing a new anchor centers that correspondence while keeping scale; use Fit after re-anchoring when the remaining geometry extends outside the viewport.

```javascript
// Optional editable preference: one ordinary undoable change, no layout yet.
diagramStudio.setIntent('start', 'z-input', 'top-left');
console.log('[intent]', diagramStudio.get().layout.intent);

// Build three alternatives using the existing document's intent.
diagramStudio.compare('layout');
await diagramStudio.generateComparison({
  kind: 'algorithms', algorithms: ['tree', 'layered', 'flow'],
  run: 'rebuild', maxIterations: 640
});
diagramStudio.comparisonView('overlay');
diagramStudio.anchorComparison('z-input');
console.log('[comparison]', diagramStudio.explorerState());

// Closing keeps the working diagram; applying is an explicit alternative.
// diagramStudio.applyCandidate(1);
diagramStudio.closeComparison();
```

The visual anchor API never assigns a start or end. To clear an authored start use `diagramStudio.setIntent('start', null)`. To experiment without editing the baseline, set the `intent` object in `generateComparison` or use Drawing intent in the comparison rail, then Generate and explicitly Apply a candidate.


## v7. Recorded layout journeys

A timeline uses the current algorithm, direction, spacing, start/end hints and scope. It warm-starts from current geometry with `mode: "rebuild"`, `warmStart: true`, `settle: true`, and `trace: true`. This is a run mode, not a replacement saved diagram mode. The public timeline API can request `rebuild: true` to use the deterministic reseed path; the existing Shift+L rebuild control remains unchanged.

| Parameter | Default / range | Meaning |
| --- | --- | --- |
| `maxIterations` | 640; engine clamps 80–1,200 per solve | Iteration ceiling, not a guarantee of terminal convergence. Nested scopes may involve multiple solves. |
| Recorded frames | At most 96 | The collector samples progress and thins earlier intermediate frames when full. First and final geometry are retained. |
| Slider index | 0…frames−1 | Discrete recorded checkpoint. No invented positions between checkpoints. |
| Ghost | `next`; next / final / off | Nearby-change outline, computed endpoint outline, or no ghost. |
| Near-change threshold | 48 screen pixels | Choose a later checkpoint with at least this much movement for an object when possible. At the tail a smaller change can remain. |
| Playback interval | 420 ms; 750 ms with reduced motion | User-started checkpoint advancement. No autoplay on opening. |
| `fixedIds` | Session local holds | Extra immutable IDs for the computation; not persisted pin metadata. |
| History-storage cap | 3,500,000 serialized characters | Above this threshold, keep the latest recording in memory and export it explicitly rather than filling local storage. |

`report.termination` can be settled, objective plateau, or iteration limit. The final frame is exactly the `LayoutLab.compute` result. Intermediate metrics describe their own geometries. A checkpoint can be earlier than the final best state of an internal solve, so the sequence must not be labeled monotonically improving.

### Timeline JSON

`kind` is `diagram-studio-journey` and `schemaVersion` is 1. Fields are `baseline`, `settings`, `report`, `frames`, `bookmarks`, `createdAt`, `finalDocument`, and optional `routePrior`. Each frame contains `nodes`, `iteration`, `phase`, `metrics`, and calculated motion summaries. All frames have the baseline object IDs. Bookmarks store index and title, not a second graph.

The source diagram schema remains version 2. The history envelope is separate. Open performs validation before replacing the editor. A remembered path is only reopened against compatible objects, hierarchy, connections, pins, and frame dimensions. Position-only edits do not automatically invalidate it.

## v7. Local brush parameters

| Parameter | Default / range | Meaning |
| --- | --- | --- |
| `mode` | `tidy`; tidy / flow / space / restore / protect | The local policy. These are not new entries in the global layout algorithm list. |
| `radius` | 190; 40–600 screen pixels | Radius of the influence field. Runtime `worldRadius = radius / camera.k`. Brackets adjust by 20 screen pixels. |
| `strength` | 35%; 1–100% | Scales the proposed change and maximum motion. |
| `softness` | 75%; 0–100% | Fraction of the radius occupied by the smooth falloff band. Zero gives a hard-edged footprint. |
| `step` | 18; 1–64 world pixels | Maximum full-strength, full-influence displacement per dab. Engine/API parameter; not another default toolbar slider. |
| `holdRestored` | true | Add moved restore targets to temporary local protection for subsequent automatic runs. |
| `reference` | Last bookmark / pre-brush geometry | Matching coordinate source used by restoration. Missing IDs are ignored. No nodes are created or reparented. |
| Hold threshold | Influence ≥0.25 | Hold mode turns the soft field into an explicit node-level protection set. It is not a continuously weighted pin. |
| Held-pointer cadence | Requests every ~90 ms | Repeated bounded dabs while pressed. It stops on pointer-up, cancellation, lost capture, Escape or blur. Rendering cost can reduce actual cadence. |

For rectangle distance `d`, radius `r` and softness fraction `s`, the core radius is `r(1−s)`. The weight is 1 within the core, 0 at or outside r, and `1−t²(3−2t)` in the band, where `t=(d−r(1−s))/(rs)`. Distance to the rectangle is zero for a cursor inside it. This deliberately differs from a center-only hit test.

The per-dab cap is `step × strengthFraction × weight`. Small unconstrained moves are also softened by strength and field weight. A stroke may contain many dabs: its total travel is not the one-dab cap. A proposal is clipped to the existing parent interior without moving the frame. A line search reduces motion if it would add or worsen a non-ancestor rectangle intersection. Local goals can make global spring energy or total edge length worse; that is permitted.

The influence support is exact for geometry: nodes outside the field do not move, hidden nodes do not become targets, and containers do not move or resize. Fixed ports and waypoints are not erased by brush movement. Connections are rerouted from the resulting geometry using the existing routing parameters.
