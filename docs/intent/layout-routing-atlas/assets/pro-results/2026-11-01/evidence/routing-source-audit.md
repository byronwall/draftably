# Routing audit at af70d8317797d5a522acffdd604819376a3ec893

## Decision

Build a routing lesson around **fixed geometry → one setting → measured route tradeoff**, then a separate lesson showing how file compilation reserves routing space. Keep all 12 public file settings. Add the missing `standoff` control to the menu and Compare; do not expose internal router experiment flags. Correct source/UI explanations before building additional routing capabilities. The bounded heuristic already provides good mechanisms to teach; there is no evidence here that a new routing dependency or algorithm is needed.

## Inventory reconciliation

`ROUTING_PARAMS` has exactly **12 attributes** (`src/dsl/syntax.ts:426–439`). The menu has **9 ordinary + 2 advanced sliders**, and `ExplorerLab.routeParams` has **11 axes**: both omit `standoff`. The defaults and ranges in the DSL routing table match `RouteLab.defaults/settings`. DSL numbers are rejected outside range; raw engine settings clamp finite numbers; `passes` is rounded by `settings`, so a file can parse `passes=1.5` but execute 2. This is a boundary inconsistency worth making deliberate, not a reason to invent another setting.

The routing inventory contributes **30 rows**: 12 parameters, 4 edge attributes (`from`, `to`, `kind`, `constraint`), 3 automatic behavior rows (return lanes, wrap lanes, channel reservations), 4 presets/operations, 5 native route/label editing operations, endpoint target choice, and reverse connection. Of these, **27 are authored controls or operations and 3 are derived public behaviors** requested by the mission. A combined atlas should keep these classes explicit rather than claiming 30 independent knobs.

## Highest-impact findings

### RG-01 — A file routing comparison can move boxes (source-proven and CLI-reproduced)

- `Menus.tsx:RoutingMenu` says “Shapes never move.” `RouteLab.compute` does leave its node inputs unchanged.
- In file mode, `setRouting` calls `commitSource(sourceWithRouting(next))` (`src/components/Menus.tsx:445–457`). A routing Compare candidate similarly returns a modified source, not a snapshot route pass (`src/state/comparison.ts:candidateSource`, 155–163).
- The compiler passes `m.routing` into `planChannels`, then runs layout again with channel widths; `edgeGap` also controls some intergroup spacing (`src/dsl/compile.ts:layoutModel`, 2301–2317; `layoutPass`, 2469; `src/dsl/channels.ts:planChannels`, 178–198).
- Thus a global file setting can affect node and group geometry. Pins retain their requested positions relative to parent content, but changes to a parent's frame and location can still affect world geometry. Pins are not a universal substitute for freezing a nested document.
- **Measured source variant:** standoff0/20/40 gives scene width1147/1259/1235 with height828. Eighteen nodes or frames change versus default in either direction; crossings2/1/3 and bends23/21/22. See `routing-validation/comparisons.json:channel_trio`.
- **Classification:** misleading UI promise and missing causal explanation; a fixed-geometry Compare mode is a separate capability decision.
- **Fix:** say “Changes routes; a diagram file can also reserve different space for them.” Use flat, fully pinned fixtures for pure routing sweeps. Label grouped recompiled examples “source variant: geometry may change.” Add a geometry-invariance check when a visual claims to freeze shapes.

### RG-02 — File Compare's release-fixed-ports option is not applied (source-proven; coordinated with editor audit)

`ExplorerLab.candidate` honors `config.autoPorts` by clearing both sides before routing (`src/engines/explorer-engine.js:198–204`). File `candidateSource` only calls `sourceWithRouting`; it does not rewrite edge `from=` / `to=` attributes. The UI option therefore has different effects across contexts. Implement source rewrites with a test or disable/explain that checkbox in file mode until it is supported. Do not quietly compare a different graph interpretation.

### RG-03 — The title-band explanation is stale (source-proven)

`docs/DSL.md:716–718` says that only a group's title blocks its header band. Current `obsFor` also makes the entire band gated by default. A route can cross straight into/out of a member's top at a gate. `find` relaxes the band's restriction when a clear route around it would exceed **1.75 times** the alternative's length; the actual title rectangle remains an obstacle (`src/engines/routing-engine.js:obsFor`, 720–773; `find`, 820–840). Tests explicitly cover the lower-member detour and top-member entry (`tests/routing-channels.test.ts:31–59`). This is a documentation defect. Show a title band, its real title rectangle, and a straight-entry gate in the visual. Avoid telling users to route freely through the rest of the band.

### RG-04 — `standoff` is a cost band, not an almost-hard minimum (observed CLI and raw-router counterexample)

`standoffCost` charges overlapping run length × `(1 − distance / band)` × a weight, with a global factor 0.5 and stronger group-border weight2 (`routing-engine.js:211–240`). There is no rule “come closer only when no clearer route exists,” as current DSL prose says. Other costs can win even when a farther route is possible. This also means increasing the band need not monotonically increase measured distance. The fixed-geometry CLI and pure-router `standoff` companions with automatic ports gave obstacle clearance **10 / 20 / 10 px** at settings **0 / 20 / 40**, with route lengths **470 / 490 / 470**. This is a useful honest atlas result, not an image to discard. The fixed-side counterpart is identical at all three values.

- **Classification:** incorrect documentation; nonmonotonic behavior is a heuristic tradeoff, not automatically a code bug.
- **Fix:** document “penalizes running close” and show the counterexample. If owners later want minimum preferred distances, that is a new constraint semantics proposal requiring tests and a release.

### RG-05 — Fan-out setting descriptions overpromise spreading (source-proven and observed)

The current DSL says higher `fanout-penalty` spreads branches across more sides. `findIn.fan` returns zero for endpoints on the declared reading axis and for roomy facing sides; the crowded-fan logic also rewards staying on a planned facing side (`routing-engine.js:902–915, 978–1002`). Therefore ordinary fans often stay identical. The small-hub companion shows a difference only after side capacity is exceeded; the roomy/dense no-effect companion remains unchanged at0/50/160. Rename the label to **Crowded-side cost**, or keep the current label with the capacity rule in its hint. Do not increase defaults or add more fan settings merely to force an obvious visual difference.

### RG-06 — `passes` does not count all route-improvement stages (source-proven and observed)

The `for(pass=1; pass<s.passes; pass++)` loop controls single-edge rerouting and may exit early. Pair-crossing repair (up to four tried pairs, across up to two sweeps), up to three nudge passes, and tidy still run for settled routing with `passes=1` (`routing-engine.js:1291–1810`). A raw probe at `passes=1` reported `tidied:1`. The final report `passes` is the configured value, not an actual-work counter. Correct the table/hint to **Reroute rounds** or explain the exact budget. A new `roundsExecuted` metric would be a small contributor/diagnostic change, not an end-user knob.

### RG-07 — Prior-side stability has two contexts (source-proven and observed)

A deterministic `.draft` render starts without routes from previous edits. The native editor generally passes earlier routes; quick dragging often restricts side candidates to old sides regardless of numeric stability (`state/scene.ts:143–156`; `routing-engine.js:864–875`). However, a cold compute still passes its current routes into later refinement/repair attempts. At `port-stability=150`, the dense fixture kept18bends/3434length; at0/20 it accepted a within-run repair to17bends/3386length. Thus “inert in cold file compilation” would be a false finding. The atlas needs one cold no-history sweep and one native warm-history comparison from the same prior route set.

### RG-08 — The user can see unsupported bend/label gestures in a file (source-proven)

The Inspector advertises double-click to add/remove bends and Alt-drag labels (`src/components/Inspector.tsx:309–312`). File translation rejects changed waypoints and label offsets (`src/dsl/translate.ts:102–111`); Reset bends is disabled by `FILE_UNSUPPORTED`. The product should explain native-only availability before the gesture. Keeping `.draft` syntax compact is reasonable; adding authored waypoints is **Defer**, not a prerequisite to complete docs. A native JSON starting document and exact action recipe cover the existing controls.

### RG-09 — `constraint=false` is absent from ranking, not from every geometry influence (source-proven inference)

Ranking and engine pull exclude these edges (`compile.ts:684–686,2335–2336`). Channel reservation, fold wraps and return lanes still receive all model edges (`compile.ts:2313,3116–3131`). So current broad prose “takes no part in layout” is too strong for routing-space allocation. Keep the clear statement “does not rank or order nodes,” then explain that the line still needs routing space. Existing `edge-constraint.test.ts` proves equal geometry for its one fixture, not all nested/channel cases.

### RG-10 — Automatic lanes have different constants from ordinary routing preferences (source-proven)

Return lanes use fixed20px standoff/pitch and capped16px target offset (`dsl/lanes.ts:35–40`); wrap-lane assignment uses fixed20px pitch with port ordering based on max(portGap,edgeGap). They are compiled geometric plans converted to side choices and waypoints by `laneBends`. Explicit edge sides suppress planning; an invalidated lane is dropped after endpoint motion; native authored waypoints take precedence. These are intentional mechanics to document. Do not add every internal constant as a public setting. Show them as automatic behavior with limits.

## Actual CLI validation and frozen-router probes

All **98** routing companions passed the actual pinned baseline CLI `inspect --json --metrics` and `inspect --svg`; every SVG parsed as XML. `check <routing-fixtures-directory> --metrics` exited0 with no errors. Evidence is in `routing-validation/results.json`, SVG exports in `routing-validation/svg/`, and exact equality checks in `routing-validation/comparisons.json`. The validator did not run the full repository suite.

`node work/routing-probe.mjs` independently imported baseline `RouteLab` and ran36 numeric variants. Every one of those raw route point arrays exactly matches its CLI result. The raw harness provides finer report fields (shared length, close-lane pairs, finishing-stage counters); it does not replace the DSL compiler. All12 main numeric sweeps have byte-for-byte equal compiled node rectangle arrays.

The first DSL validation exposed a causal confound: flat pinned graphs still received default flow skip/return lane plans. Every flat sweep now includes constant `layout root row` to suppress those automatic plans while pins freeze the shapes. This is why authoring pins alone was not enough. Seventeen short-box files received constant `theme drafting padding-y=4` to eliminate accidental text overflow without changing their rectangles or routes. No unrelated fixture warnings were removed.

| Sweep | Observed mechanism | Important limit |
| --- | --- | --- |
| clearance4/10/30 | Fixed-side detour lengths428/440/480 | Bigger hard buffer can prevent routes in tighter graphs. |
| standoff0/20/40 | Automatic-side lengths470/490/470; obstacle distances10/20/10 | Nonmonotonic soft cost; fixed-side version identical. |
| port-gap6/16/28 with edge-gap4 | Hub terminal spread changes; lengths988/968/944 | Other ports may cap usable spacing. |
| edge-gap4/16/48 with port-gap6 | Terminal pitch changes; lengths988/968/904 | Also controls lanes; cannot call it independent of port spacing. |
| bend cost0/32/100 | Bends26/17/14; crossings0/2/2 | Fewer bends traded against crossings. |
| crossing cost0/360/1200 | Crossings1/1/0; bends6/6/8; lengths960/960/1342 | Low/default result equal; do not invent separation. |
| shared cost0/8/20 | Shared length420/39/39 on fixed tiny hub |13px common stubs remain because all three endpoints coincide. |
| parallel cost0/18/60 | At0:0crossings,20bends,3828length; default/high:2,17,3386 | Crossings/lanes exchange and default/high equality. |
| port stability0/20/150 |150 prevents one within-compute side repair | No prior-session routes were supplied. |
| fanout0/50/160 | High reduces close lane pairs2→0, changes8→7bends, length2200→2256 |0/default equal; roomy counterpart all equal. |
| passes1/3/5 |18/17/17bends; one repair by3; tidy still occurs at1 | More rounds can have no effect. |
| radius0/6/16 | Exact CLI routes and metrics identical; three distinct actual SVG path strings | Requested16 clamps locally to6.5 at a13px terminal segment. |
| Narrow corridor clearance4/10/30 | At4/10: straight360px,0bends; at30:648px,4bends | A28px corridor becomes impassable at the larger hard buffer. |
| Equal-metrics edge-gap4/16/48 |1crossing,6bends,960px in every variant; middle route y168/84/168 | Equal aggregate metrics do not prove equal paths. |

True no-effect trios for standoff, shared cost and fanout compare identical in both CLI point arrays and SVG edge paths. Auto source side resolves right; auto target side resolves top, and each matches its corresponding explicit-side variant. Grouped `constraint=false` rectangles match the edge-absent baseline exactly; ranking-enabled geometry differs.

**Warning semantics matter.** `inspect` / `vary` metrics count compiler diagnostics plus geometric conflicts, including soft-split; `check --metrics` additionally emits `qualityNotes` and replaces the warning total (`src/cli/variants.ts:704–725,774–805`; `src/cli/main.ts:260–276`). Therefore crossing or extreme-aspect quality warnings can coexist with `inspect.metrics.warnings=0`. The retained57 check warnings occur in34 files: deliberate crossing/aspect tradeoffs plus the blocked fixed-side and interior-cell examples. This is why the atlas must keep the warning category, not merely one unlabeled number.

Timing from these runs is a local execution observation, not a reproducible performance ranking; do not use it as a public benchmark.

## Internal flags and aliases: exclusion ledger

- `quick`: internal interaction performance mode; document contributor behavior and the visible fact dragging is provisional. No DSL/menu flag.
- `facing`: internal regression/experiment switch; default on. Keep contributor tests; explain facing ports as user-visible automatic behavior, not a toggle.
- `titleBands`: internal default-on experiment switch. Same treatment; title-band rules belong in user docs.
- `window`: internal search optimization, default on;80px local search then full grid on failure. Contributor performance docs only.
- `tidy`: internal router finishing switch, default on for settled renders. Not the layout engine named `tidy`; keep the naming distinction in contributor docs, no public toggle.
- `jogs`: internal finishing substep switch, default on. No public toggle; user explanation can say tiny steps may be straightened.
- `previous`: supplied prior routes, not authored diagram semantics. Contributor API/session documentation only.
- `direction`: raw router option, not `ROUTING_PARAMS`; user changes layout direction or explicit edge sides. Per-edge `cfg.flow` comes from projection. Count direction under layout inventory, cross-link its visual.
- `EdgeLayout.row`, `lane`, `toOffset`, `flow`: compiled scene artifacts, not file attributes. Explain their visual outcome only.
- `cornerRadius` is camelCase in in-memory API; `corner-radius` is canonical DSL spelling. Similar camelCase pairs are not extra aliases/options.
- No `minlen`, polyline/spline routing selector, route-per-edge penalty override, arbitrary free-point endpoint, or named channel statement exists in this source. Do not borrow these from Graphviz/ELK/libavoid docs.
- Native `directed` and `emphasis` alter edge rendering/meaning, not route choice; both are rejected in `.draft` translation and belong in a broader editing reference. `kind=async` is retained here because the sequence and route atlas must show its no-geometry effect.

## Terminology checked against primary sources

- Wybrow, Marriott and Stuckey, *Orthogonal Connector Routing*: https://people.eng.unimelb.edu.au/pstuckey/papers/gd09.pdf . The paper separates route search from final segment centering/nudging. It gives an optimality result for its own visibility-graph formulation and objective; it does not prove Draftably's bounded candidate/search/repair process optimal.
- Official Adaptagrams/libavoid reference: https://www.adaptagrams.org/documentation/namespaceAvoid.html . It separately exposes shape-buffer distance, crossing/shared-path penalties and nudging distance; this supports separating clearance, route cost and spacing vocabulary. Draftably's implementation is original and its defaults/semantics must be derived from Draftably source.
- Official libavoid overview: https://www.adaptagrams.org/documentation/libavoid.html . This identifies the library and papers, not a shipped Draftably dependency.

Primary URLs were opened/verified during this audit. Limit derived external prose to these terminology checks; source code is decisive for behavior.

## Files read

Completely read: `PACKET.md`, `pro-prompt.md`, `AGENTS.md`, `src/engines/routing-engine.js`, `routing-engine.d.ts`, `src/model/types.ts`, `routes.ts`, `static-scene.ts`, `src/state/scene.ts`, `src/dsl/channels.ts`, `lanes.ts`; all 9 `tests/routing-*.test.ts`, `tests/return-lanes.test.ts`, `wrap-lanes.test.ts`, `edge-constraint.test.ts`, `edge-labels.test.ts`, `edge-halo.test.ts`; `examples/multi-region-failover.draft`; `src/dsl/frame.ts`.

Relevant sections read: `src/dsl/syntax.ts` (model, parameter tables, edge/refinement parsing, validation); `compile.ts` (engine edge exclusion, wrap-lane algorithm, layout channels/refinement/final lanes); `project.ts`; `layout-edits.ts`; `translate.ts`; `src/model/geometry.ts`, `document.ts`, `edits.ts`; `src/state/actions.ts`, `commands.ts`, `comparison.ts`; `src/engines/explorer-engine.js` and declarations; `src/components/Menus.tsx`, `Inspector.tsx`; `src/state/pointer.ts`; `docs/DSL.md:Routing/Refinements/related layout sections`, `skills/draftably/SKILL.md` parameter guidance, `docs/intent/diagram-quality/FEEL.md`; `src/cli/main.ts:checkFile` and `src/cli/variants.ts:draw/qualityNotes` for warning semantics.

No baseline source file was changed. Dependencies were installed by the parent. This agent ran the narrow actual CLI validation described above, plus raw RouteLab probes; no full repository suite or browser screenshot run was performed here. Native gesture recipes and menu actions are source-backed but require separately recorded UI execution before being labeled interactive validation.

## Final integration QA corrections

The routing inventory now uses exact source symbol anchors for cost, fan, stability, passes and rendering rather than broad approximate line ranges. Cell endpoint prose distinguishes exposed left/right/bottom sides from top-only cells behind a title band. The interior-cell fixture reports26 routed units but its full drawn polyline is78; `drawRoutes` appends52 units after raw RouteLab metrics are computed. Keep that metric scope visible in the endpoint comparison.
