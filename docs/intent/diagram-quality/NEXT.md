# Diagram quality: what to work on next

The audit ran three rounds ([r1](rounds/r1.md), [r2](rounds/r2.md), [r3](rounds/r3.md)). Over them
the corpus went from a mean score of 2.9 to 3.4, the summed defect index from about 1,150 to 494,
and S1 defects (misleading or unreadable) from 10 to 0. Labels sit on their own edges, nothing is
clipped, groups fit with even padding, folds keep decisions and loops whole, trees and layered
flows enter children along the reading direction, and titles no longer break inside words.

This is the ranked list of what is left, for the next effort. Each entry gives its cause tag (the
rubric's), severity, the evidence from round 3's final run (`claude/r3-route-jogs`, the top of
the #56–#58 stack), where the cause most likely lives, and an approach. Counts are corpus (45
renders) unless marked; "held-out" is the 14 held-out renders, "examples" the 17 bundled examples.
Re-measure with [RUBRIC.md](RUBRIC.md)'s loop before starting, since main will have moved.

## 1. Follow-ups that should hold the layout still move it

- **Cause**: `stability`, `theme-metrics`. **Severity**: S2 (11 ledger lines in round 3).
- **Evidence**:
  - Theme-only changes: srcly-release e2 (signal → midnight, 6 objects move), annotations-modules
    e1 (signal → fieldnotes, 7 move as the wider serif titles wrap). Both fail `still *`.
  - Relabels, after #57 held the fold: pgm-cli-context e2 (5 stores move), srcly-add-metric e2
    (10 move, 10 order flips), visual-notes-ingest e1 (5 move), coolify-restic-backup e1 (7 move).
    All fail `still *` because a gap widens for a label that doesn't fit the default gap.
  - Growth reorders more than it adds: order flips after one new node or edge in tasks-trpc e1
    (10), v2ctx e1 (15), ufw e1 (28), regionshot e1 (14), vn-architecture e2 (11), ci-checks e1
    (23). Seven `keeps-order` failures across corpus and held-out.
- **Where**: `layoutModel` / `arrange` in [src/dsl/compile.ts](../../../src/dsl/compile.ts): node
  sizes come from `leafSize` with the theme's padding and font, and every rank gap from
  `baseLayout`/`withLabelRoom` with label rooms; `foldRanks` cuts by even shares, so one more node
  can move a cut. Theme padding is in `resolveAppearance` ([src/model/appearance.ts](../../../src/model/appearance.ts)).
- **Approach**:
  - Themes: lay out on theme-independent slots. Measure each node with a reference appearance
    (graphite), place slot centres from those sizes, and draw the node at its theme size centred in
    its slot; grow a slot only where the theme's size is larger than the gap can absorb.
  - Relabels: before widening a gap, try the label on the edge's longest straight segment and
    along the band gap (a wrap or a fan has long segments that fit it), and widen only when no
    segment fits. Keep the widening local to the rank that needs it.
  - Growth: carry the previous ranks and in-rank order as priors when the file is unchanged apart
    from additions (the compile is stateless, so either diff against the previous source in the
    viewer or write the order as soft `order` hints the way a drag writes `stay`).
- **Product questions**: Should a theme switch hold positions even when it makes nodes taller (gaps
  shrink), or is "same rows and order, gaps may change" enough? Should a relabel never widen a gap
  (labels go beside the line when they don't fit), or is the current "widen only that gap" right?
  Is `keeps-order` the promise for growth, or `still *` for everything that existed?

## 2. Lines with nowhere to go ride borders and squeeze past groups

- **Cause**: `routing-clearance`. **Severity**: S2 (11 S2, 6 S3; 5 MISSED).
- **Evidence**: edge-on-group-border 15 (round 2: 9), edge-near-group-border 30, edge-hugs-node
  182; examples 19 on and 43 near borders. Renders: hn-deploy v0 (src/ → pnpm build 12px above
  Builder stage; "defines" on its top border), srcly-scan-lifecycle v0–e2 (fingerprint inside Scan
  services' bottom border, overlay through FastAPI routers' title band), visual-notes-architecture
  v0–e1 (query / action along SolidStart app's top, tool call inside Clients' border),
  draftably-file-session v0 (redraw in the slot between the column and Browser's border),
  multi-region-failover (tier links down the inside of App and Data tier borders, DI 30.8),
  aws-vpc-network (DI 28.5).
- **Where**: the router can only route through the space the layout leaves.
  [src/engines/routing-engine.js](../../../src/engines/routing-engine.js) `compute()` builds
  border bands (`band: s.standoff`) and header obstacles; `search()` / `cost()` then pick the
  cheapest remaining path, which is along the border when the gap between groups, or between a
  group's members and its border, is narrower than two standoffs. Gaps come from `GROUP_INSET` and
  the group gap in [src/dsl/compile.ts](../../../src/dsl/compile.ts) and `groupGap` in
  [src/engines/layout-engine.js](../../../src/engines/layout-engine.js).
- **Approach**: make the layout reserve routing room. Before placing, count the edges that must
  pass each sibling gap and each group's inner margin (an edge between two non-adjacent ranks or
  out of a nested group) and size those gaps like fold band gaps (`LANE_PITCH` per edge plus two
  standoffs). Then route inter-group edges along the centre of those channels. Add a metric for a
  run inside a group that is near both a member and the border (the slot case is MISSED today).
- **Product questions**: Is a bigger drawing acceptable to get channels (groups further apart)?
  May an edge cross a group's title band when the alternative is a long detour?

## 3. Returns and cross-band edges take the long way round

- **Cause**: `routing-detour`. **Severity**: S2 (12 S2, 8 S3; 10 MISSED).
- **Evidence**: long-edge 29, hook 31, many-bends 48 (round 2: 41); examples hooks 16. Renders:
  draftably-code-layers v0 ("engine tasks" loops under server/), decisory-session e1 ("yes, with
  context" 600px up the column), hn-reading-flow e2 (Online? "no" climbs back over Pull to
  refresh), v2ctx-pipeline v0 (Screenshots → Contact sheet climbs the whole height),
  visual-notes-architecture e2 (two lines to Postgres over the whole top, one hooking in),
  srcly-add-metric e1 (GET → Client store loops under test_metric_catalog), srcly-scan-lifecycle
  e1 (the only round-3 regression: overlay and SSE progress loop round the groups).
- **Where**: only fold wraps get planned lanes (`wrapLanes` in
  [src/dsl/compile.ts](../../../src/dsl/compile.ts), #52). Every other back edge or long
  cross-rank edge is routed alone by `find()` in the router, which takes whatever gap is free.
- **Approach**: extend lane planning to every back edge in a flow or layered layout and to edges
  that skip ranks: give each a lane in the nearest rank gap on the side of the drawing it returns
  along, share lanes at an even pitch, and pass them to the router as waypoints, as wrap lanes
  are. Count hooks and long edges on these before and after.
- **Product questions**: Should returns run on one side of the drawing (always below, like a
  draftsman's return line), or on whichever side is shorter?

## 4. Groups are laid out as staircases, too big, or pressed together

- **Cause**: `group-packing`, `engine-spacing`. **Severity**: S2 (7 S2, 4 S3; 8 MISSED, no metric).
- **Evidence**: compound-flow staircases in hn-offline-architecture v0–e2, tasks-trpc-request v0,
  ufw-flow-render v0; interiors mostly empty in tasks-trpc e1 (`Data` holds two boxes at opposite
  ends) and web-app-components (App and AppLayout); sibling groups 8px apart in ufw e1 (pnpm flow
  CLI under Diagram library); packages/cli 8px above components/ in code-layers e2.
- **Where**: `compound-flow` in [src/engines/layout-engine.js](../../../src/engines/layout-engine.js)
  (around line 1079) ranks each group's members by their global leaf ranks, so a group whose
  members sit at ranks 3 and 7 spans five ranks and the groups step diagonally. Group frames are
  sized bottom-up in `arrange` ([src/dsl/compile.ts](../../../src/dsl/compile.ts)), so the
  stretch shows as empty interior.
- **Approach**: first add metrics: group fill (member area over interior area under 0.35), group
  staircase (sibling groups whose centres step monotonically on both axes), and group gap under
  16px. Then in compound-flow, compact each group's members onto consecutive local ranks before
  aligning groups on the global rank grid, and enforce the group gap after the engine runs.
- **Product questions**: Should a group keep its members in global rank columns (reading order
  across groups) or pack them tight (compact groups)? The two pull against each other.

## 5. Fans use several sides; ports sit lopsided

- **Cause**: `routing-ports`, `routing-order`. **Severity**: mostly S3 (4 S2, 14 S3; 13 MISSED).
- **Evidence**: ragged-bends 19, uneven-ports 8, off-axis-port 21, one jog left (code-layers v0).
  Every uneven-ports hit is the same shape: a straight edge on the side's centre and a second
  port one port-gap off (`29, 45 of 57`: coolify v0, hn-deploy, hn-reading-flow, decisory,
  tasks-trpc). Fans across three sides: pgm-cli-context v0 (server to five stores), tasks-trpc v0
  (handler to the routers; three lines into Prisma from three sides). Side exits in a downward
  tree: srcly-node-tree e1/e2 (src/ → app.css), annotations-modules e1 (root → sidebar).
- **Where**: the tidy pass's Ports step in
  [src/engines/routing-engine.js](../../../src/engines/routing-engine.js) shifts all of a side's
  ports by one amount and is refused when the straight edge's move costs standoff or a lane;
  `slot()` places the first port on the centre and the next one a gap away; `fan()` stops being
  free when a facing side runs out of slots.
- **Approach**: re-slot a side's ports together (n ports at ±k·gap/2 about the centre) and move a
  straight edge's far port with it only when that side is free; let the jog step's port slide
  (#58) handle the remainder. For trees, find out why `axis()` and `fan()` let src/ → app.css
  leave src/'s left side when its bottom already carries two siblings (the off-axis metric
  doesn't count it). In the metric, accept turns that step by exactly the edge gap (12 of round
  3's 20 ragged-bends are such bundles).
- **Product questions**: Is a bundle of lines entering one side at a 16px stagger the drafted look
  you want, or should they share one trunk and split at the box?

## 6. Labels crowd one gap or read as one edge

- **Cause**: `label-placement`. **Severity**: S2 (8 S2, 4 S3; 6 MISSED).
- **Evidence**: label-on-edge 7, label-detached 5, label-on-group-border 14. exploreda e1 ("clear"
  and "active filters" on lines 25px apart read as one pair), v2ctx e1 ("missing" and "retry" on
  one line read as one edge), srcly-release e1/e2 ("import error" where the artifacts line runs),
  pgm e2 (two labels stacked at the server's side over crossing lines), mcp-call e1/e2 ("missing"
  detached), ci-checks ("proofs job" between two exits).
- **Where**: `placeEdgeLabel` / `shiftedLabel` in [src/model/routes.ts](../../../src/model/routes.ts)
  place each label on its own route, avoiding what is already placed; edge-to-label and
  label-to-label spacing is not optimised across labels.
- **Approach**: a global pass after routing: candidates on each label's straight segments, a cost
  for sitting within 30px of another label or over another edge, and a greedy or small search to
  pick. Add a metric for two labels on different edges closer than their height.
- **Product questions**: none beyond item 1's relabel question.

## 7. Folds put a side branch far from its source

- **Cause**: `engine-order`. **Severity**: S2 (7 S2, 1 S3).
- **Evidence**: draftably-ci-checks v0 (Upload screenshots starts row 2, so "on failure" crosses
  the whole drawing), v2ctx-pipeline v0 (Contact sheet at the top of column 2 beside the
  transcriber), decisory-session v0 (the loop's 8–12 questions → Answer wraps the full width),
  srcly-scan-lifecycle (Browser right of the routers it calls; `order-x` fails in all three).
- **Where**: `foldRanks` in [src/dsl/compile.ts](../../../src/dsl/compile.ts) cuts between blocks
  of ranks; a leaf branch takes its longest-path rank, which can be after the cut.
  `rankLayers` ranks by longest path from sources.
- **Approach**: before cutting, pull a sink branch (a node with no outgoing edges) back to its
  source's band when the band has room, and score cuts by the length of the edges they create,
  not only the count. For scan, rank the user's entry group (Browser) first when it has only
  outgoing edges into the next group.
- **Product questions**: none.

## 8. Polish

- `text-wrap`: widows ("Analyzer counts / it", "Version Packages / PR"): balance the last two
  lines. `palette`: shade ramps above 600 still merge on signal and midnight (srcly-release);
  custom brand shades under 4.5:1 (ufw, `low-contrast` 4 held-out). S3.

## Metric work before the next round

- Group fill, group staircase and group gap (item 4).
- Two labels on different edges closer than their height (item 6).
- A run inside a group near both a member and the border (item 2).
- `ragged-bends`: accept turns that step by the edge gap (item 5).
- `still` with the median shift removed, alongside the raw check, so a drawing that slides whole
  is told apart from one that changes shape (annotations e1 moved 22px as a whole).

## Open product questions, together

1. Theme switch: hold positions even if nodes grow (gaps shrink), or hold rows and order only?
2. Relabel: never widen a gap (labels beside the line when they don't fit), or widen only the gap
   that needs it (today)?
3. Growth: promise `keeps-order` or `still *` for objects that existed?
4. Is a larger drawing an acceptable price for routing channels between groups?
5. May a line cross a group's title band to avoid a long detour?
6. Returns: always on one side of the drawing, or the shorter side?
7. Groups: keep members on global rank columns, or pack each group tight?
8. Line bundles: a 16px stagger into one side, or one trunk that splits at the box?
