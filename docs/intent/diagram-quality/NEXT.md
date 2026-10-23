# Diagram quality: what to work on next

The audit has now run four rounds ([r1](rounds/r1.md), [r2](rounds/r2.md), [r3](rounds/r3.md),
[r4](rounds/r4.md)). Over them:

- The corpus mean score rose from 2.9 / 2.8 to 3.5 / 3.15 (v0 / follow-ups).
- Hooks fell 66 → 11, lines beside boxes 436 → 108, and border runs 82 (round 2) → 20.
- Expectations failed fell 20 → 13 of 75.
- Round 4 removed group staircases, title-band crossings and most border riding.
- **It also brought back three S1 lines**: a planned return lane runs through a forward
  edge's label in srcly-release. S1 lines had been at 0 since round 2.

This is the ranked list of what is left. Each entry gives:

- its cause tag (the rubric's) and severity;
- the evidence from round 4 (`main` at `42ba473`);
- where the cause most likely lives, and an approach;
- the open product questions.

Counts are corpus (45 renders) unless marked. "Held-out" is the 14 held-out renders and
"examples" the 17 bundled examples. Re-measure with [RUBRIC.md](RUBRIC.md)'s loop before
starting, since main will have moved.

## Product decisions already made (round 4)

These decisions stand unless an entry below argues otherwise, with evidence:

| Decision                                                                                 | PR       | Cost seen in round 4                                                                                       | Verdict                                        |
| ---------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| A theme switch holds rows and order (slots; a slot grows only where the theme can't fit) | #64      | ragged row tops in a taller theme (annotations e1); narrower gaps leave no relabel pockets (add-metric e2) | keep; fix tops (item 9)                        |
| A relabel widens only the gap that needs it                                              | #65      | all 4 relabel `still *` checks fail by construction (pgm, add-metric, ingest, coolify)                     | keep; **change the check** (item 5)            |
| Growth promises `keeps-order`, not `still *`                                             | #68      | engine sweeps still flip order (v2ctx 15, ufw 53, tasks 3); stale viewer stays (hn-offline e2)             | keep                                           |
| Routing channels may cost up to ~10% area                                                | #66      | area is fine; channels the router doesn't use leave lopsided margins (uneven-padding 0 → 4)                | keep; fix waste (item 6)                       |
| Lines never cross a group's title band (except straight into a top member)               | #66      | ~2,000px loops (web-app useSession, vn-architecture e2 query/action); long-edge 29 → 44                    | **cost too high in places** (item 3)           |
| Returns take the shorter side, in a planned lane                                         | #67      | the lane enters a gap holding the forward edge's label: S1 in srcly-release v0–e2                          | **cost too high** (item 1)                     |
| Groups pack tight: local ranks, straight chains, one gap next to groups                  | #63      | packed gaps carry 3 lines + a label (file-session); 7–9:1 strips; stale stays (hn-offline e2)              | keep; widen gaps (item 4), cap aspect (item 2) |
| A bundle into one side keeps the 16px stagger                                            | #60, #69 | none seen                                                                                                  | keep                                           |

## 1. Lines run through labels in the gaps they share (S1)

- **Cause**: `label-placement`. **Severity**: S1 (3 lines), S2 (13), S3 (4); 5 MISSED.
- **Evidence**: label-on-edge 7 → 16, label-detached 5 → 5; examples include order-saga.
  - srcly-release v0, e1, e2 (**S1**): the `wait for more` return lane (#67) turns up into PR
    squash-merged's bottom through the gap that holds `push to main`. It runs into the
    label's text, with its arrowhead 16px beside the forward arrow.
  - order-saga (example): the StockReserved line runs through the `PaymentSucceeded` text.
  - add-metric e2: `loaded before render` sits on the Refresh snapshots → test line.
  - decisory e2: the yes-with-context return runs through the detached `cancel pending`.
  - hn-offline e2: `offline shell` sits on the fan into Story views.
  - scan e2: four labels crowd one 110px gutter, and `fingerprint` is 124px from its edge.
  - Labels that read as one pair: v2ctx e1 (`missing` / `retry`), exploreda e1 (`clear` /
    `active filters`), code-layers e2 (`viewer build` / `bundles`).
  - mcp-call e1/e2: `missing` floats with no line near it.
- **Where**:
  - `returnLanes` / `gapBeside` in [src/dsl/lanes.ts](../../../src/dsl/lanes.ts) choose the
    lane's side and arrival gap without looking at labels already placed there.
  - `placeEdgeLabel` / `shiftedLabel` in [src/model/routes.ts](../../../src/model/routes.ts)
    place each label on its own route. They avoid what is already placed, but routes drawn
    after a label never move it.
- **Approach**:
  1. In `returnLanes`, treat a gap that holds another edge's label as closed for arrival. Take
     the other side, or arrive on the target's side face.
  2. Run a label pass after all routes exist. Candidates go on each label's straight
     segments. Cost a label within 8px of another route, or within its own height of another
     label. Use greedy placement with one repair sweep.
  3. Raise the weight of `label-on-edge` when the crossing line runs through the text rather
     than its padding (S1), and add the missing "two labels closer than their height"
     metric.
- **Product questions**: When a return's shorter side means crossing a label, should it take
  the longer side, or arrive on the target's side face (a perpendicular entry)?

## 2. Groups leave empty quarters at the root, or flatten into strips

- **Cause**: `group-packing`, `engine-spacing`. **Severity**: S2 (6 group-packing + 1 strip),
  S3 (2); 6 MISSED.
- **Evidence**:
  - Root groups leave a quarter of the drawing empty:
    - hn-offline v0: Phone browser top right, server mid-left, Upstream bottom right. The
      top-left ~1,100 × 350px is empty, and three ~1,300px lines run to Upstream.
    - scan v0/e1: Scan services drops under the routers in a layered-right drawing, leaving
      the top right ~500 × 450px empty.
    - vn-architecture v0: Services keeps its row low, with the top-left third empty.
    - web-app (example): App's lower left is empty.
  - Straight chains turn wide drawings into strips:
    - file-session e2: 4.8 → 9.1:1
    - tasks-trpc v0: 2.4 → 5.1
    - ufw e1: 5.8 → 7.1
    - order-pipeline: 5.3 → 9.0
  - sparse-group 4 → 3. The rest are scan's services at 0.23–0.28 fill.
- **Where**:
  - `packed()` in [src/dsl/compile.ts](../../../src/dsl/compile.ts) lays a scope out on local
    ranks along one axis and never wraps it.
  - The root's group placement comes from the `compound-flow` / `layered` engines in
    [src/engines/layout-engine.js](../../../src/engines/layout-engine.js), and `foldRanks`
    doesn't apply to group scopes.
- **Approach**:
  1. Add the missing metrics: the largest empty rectangle inside the drawing's hull, as a share
     of its area, and an aspect defect over 5:1.
  2. Let `packed()` fold a root or group scope whose run is longer than `FOLD_ASPECT` allows,
     reusing `foldRanks` on the packed ranks.
  3. At the root, place a sink group (Upstream APIs, Analysis cache) beside its callers'
     band instead of in the next global rank.
- **Product questions**: For a long chain of groups, which is better: a wrapped row (reads like
  text) or a strip that needs horizontal scrolling? Is 5:1 the right cap?

## 3. Detours run long where lanes don't apply or title bands block

- **Cause**: `routing-detour`. **Severity**: S2 (6), S3 (13); 6 MISSED.
- **Evidence**: long-edge 29 → 44 and crossings 30 → 32. Hooks fell 31 → 11, but some lines
  now go the long way instead.
  - code-layers v0 (worse): state/ → model/ climbs ~700px over examples/ instead of running
    straight above dsl/.
  - vn-architecture e2: query / action goes over the whole drawing, back left under Services'
    title, and up into Time blocks from below.
  - web-app (example): useSession → ProfileCard circles the whole App (~2,000px).
  - add-metric e1: GET → Client store still loops under test_metric_catalog.
  - hn-offline e1: all comments loops into Firebase from below.
  - decisory e1: yes-with-context runs 600px up the column, held there by its `stay`.
- **Where**:
  - The title-band blocks and `HOOK_PENALTY` in
    [src/engines/routing-engine.js](../../../src/engines/routing-engine.js). The band has a gate
    only for a top member's top side.
  - Lanes (`returnLanes`) are planned only in the drawing's top-level flow. Inside groups and
    under the stress, force and compound engines, `search()` routes each edge alone.
- **Approach**:
  1. Give the title band a capped exception. A line may cross a band straight down into any
     member when the detour round the group is over 3 × the direct length. Measure how many
     long-edge hits that removes.
  2. For code-layers' state/ → model/, find out why the straight run above dsl/ lost. It is
     likely the standoff-in-search fix (#66) pricing the 20px gap above dsl/ out.
  3. Extend lane planning into packed group scopes, so returns inside a group get a lane
     too.
- **Product questions**: Was "never cross a title band" meant absolutely? Would a crossing
  straight into a member's top be acceptable when it saves a loop round the group?

## 4. Packed gaps carry more lines than they have room for

- **Cause**: `engine-spacing`, `routing-clearance`. **Severity**: S2 (4 + 2), S3 (1 + 3);
  3 MISSED.
- **Evidence**:
  - file-session v0/e1: edit, recompile, revision and redraw all use the 40px gap between
    File session client and Project revision. edit runs through the `recompile` text.
  - hn-deploy e1: four lines pass a 50px gap between Repository and Builder, with
    package.json's two exits 15px apart.
  - hn-deploy e2: `restart on fail` arrives through the 35px db.json gap.
  - mcp-call e1: `insert` and `record` sit side by side in a 40px gap.
  - uneven-channel 4 → 12: lines share a corridor at mixed pitches, as in hn-deploy
    `12/16/39/34` and vn-architecture `20/16/36/16`.
- **Where**: `packed()` in [src/dsl/compile.ts](../../../src/dsl/compile.ts) widens the gaps next
  to groups by 16px per crossing line (#63). The gap between two members of one chain keeps
  the scope gap. `planChannels` in [src/dsl/channels.ts](../../../src/dsl/channels.ts) plans
  channels for insets only.
- **Approach**:
  1. Count the lines that leave or enter between two packed neighbours (from the scope's
     edges and the planned lanes), and widen that gap like a group gap: one standoff each side
     plus `LANE_PITCH` per extra line, plus label height for a labelled edge.
  2. Hand those lines evenly pitched offsets in the gap, as fold wraps get.
- **Product questions**: none beyond the packing decision. This keeps packing tight except
  where lines need the room.

## 5. Follow-ups still move: relabels by design, growth under the engines

- **Cause**: `stability`. **Severity**: S2 (8), S3 (1).
- **Evidence**:
  - Corpus `still` 3/7 and `keeps-order` 4/5. Mean move 144.8 → 163.3px, flips 248 → 309.
  - Held-out `still` 2/3 and `keeps-order` 1/4. Mean move 203 → 67px.
  - Relabels: pgm e2 (5 stores move), add-metric e2 (10 move, 10 flips), ingest e1 (5 move
    ~20px), coolify e1 (7 move).
  - Growth: v2ctx e1 (15 flips), ufw e1 regroup (53), tasks e1 (3), and hn-offline e2 (9).
    In hn-offline e2 the viewer's `stay`s, written against the old staircase, let the grown
    chain slide under the anchored group.
- **Where**:
  - Relabels: `withLabelRoom` / `pocketed` in [src/dsl/compile.ts](../../../src/dsl/compile.ts).
    A label on a straight chain link has nowhere to go but its own gap.
  - Growth: the barycentre sweeps in `layeredTarget` in
    [src/engines/layout-engine.js](../../../src/engines/layout-engine.js). A stateless compile
    can't see the previous order.
  - Stale stays: the viewer's drag writer.
- **Approach**:
  1. **Change the relabel check, not the drawing.** A relabel follow-up should expect
     `keeps-order` plus "objects off the widened band move only along it". Add that as an
     expectation (e.g. `still-shape *`: positions hold after removing each band's own shift).
     `still *` fails here by policy.
  2. For growth, try an engine prior: `layeredTarget` keeps the declared or previous in-rank
     order unless a sweep cuts crossings by a margin. This changes the engine's parity
     fixtures.
  3. For stays, have growth drop a `stay` whose anchor rank or group no longer matches the
     packing, or have the viewer rewrite stays on save.
- **Product questions**:
  1. Is the relabel promise "nothing outside the widened band changes shape"? If so, the
     expectation should say so.
  2. When a viewer `stay` goes stale because the layout around it changed, should growth honour
     it (today), drop it, or ask?

## 6. Channels reserved and then unused leave lopsided margins

- **Cause**: `container-fit`. **Severity**: S3 (4).
- **Evidence**: uneven-padding 0 → 4, padding-varies 0 → 3 (held-out 0 → 1, examples 0 → 2 +
  0 → 2). Unused channels:
  - file-session v0/e1: Node server's left is 56px and empty, because 409 conflict routes
    outside the group.
  - mcp-call e1: MCP server's right is 40px.
  - kubernetes (example): ns_ops' right is 58px.
  - web-app (example): page's left is 40px.
  - tasks v0: Next.js server's bottom is 40px.
- **Where**: `planChannels` / `trimChannels` in
  [src/dsl/channels.ts](../../../src/dsl/channels.ts) plan on the arrangement before routing.
  The router's `search()` is free to take another way.
- **Approach**: pass each planned channel's centre line to the router as a waypoint for the
  edges it was planned for. Or, after routing, drop channels no route used and re-pack (one
  more `arrange` pass, no loop: channels only shrink).
- **Product questions**: Is a second layout pass after routing acceptable (compile time), or
  should channels be binding on the router?

## 7. Ports: diamonds, tree side exits, three-sided fans

- **Cause**: `routing-ports`, `routing-order`. **Severity**: S2 (1), S3 (16); 11 MISSED.
- **Evidence**: off-axis-port 21 → 12, uneven-ports 8 → 6, ragged-bends 10 → 11.
  - Diamonds:
    - reading-flow v0: Open app enters Online? on its upper face, above the centre line.
    - reading-flow e1/e2: the `no` exit leaves the upper-right face and steps 25px up.
    - coolify v0: `yes` leaves the top and climbs over apt install.
    - decisory v0: Recommendations enters Another round? off centre.
  - Tree side exits: node-tree e1/e2 (src/ → app.css leaves src/'s left), annotations e1
    (activate() → sidebar leaves the root's right).
  - Three-sided fans:
    - pgm v0: server → five stores over top, right and bottom.
    - tasks v0: the handler fans over its right, top-right and bottom.
    - tasks e1: Prisma is entered from three sides.
  - ufw e1: Canvas is entered from below twice and once from the top-left.
- **Where**:
  - `slot()`, `fan()` and `axis()` in
    [src/engines/routing-engine.js](../../../src/engines/routing-engine.js).
  - The diamond's slanted faces are not sides, so `off-axis-port` and the tidy pass's Ports
    step skip them.
- **Approach**:
  1. Snap a diamond's in and out ports to its four vertices when the edge runs along the flow
     axis.
  2. For a fan whose facing side runs out of slots, spread it on the facing side at half the
     port gap before opening a second side.
  3. Find why `axis()` lets src/ → app.css leave the side when the bottom has room for three.
  4. Extend `off-axis-port` to diamonds.
- **Product questions**: Should a diamond take more than one edge per vertex (two lines leaving
  the bottom vertex), or move the second to a side vertex?

## 8. Folds put a side branch far from its source

- **Cause**: `engine-order`. **Severity**: S2 (4), S3 (1); 4 MISSED. Unchanged since round 3.
- **Evidence**:
  - ci-checks v0: Upload screenshots starts row 2, so `on failure` crosses the whole
    drawing.
  - v2ctx v0: Contact sheet tops column 2, and Screenshots → Contact sheet climbs the whole
    height.
  - decisory v0: the fold splits the loop.
  - tasks e1: GitHub OAuth lands 452px from NextAuth.
- **Where**: `foldRanks` and `rankLayers` in [src/dsl/compile.ts](../../../src/dsl/compile.ts).
- **Approach**: before cutting, pull a sink branch back to its source's band when that band has
  room, and score cuts by the length of the edges they create, not only their count.
- **Product questions**: none.

## 9. Polish

- `theme-metrics`: in a taller theme, slot-centred boxes give a row ragged tops
  (annotations e1). Keep a rank's boxes aligned by their start across the reading direction,
  as the recipes already do.
- `palette`: shade ramps above 600 still merge on signal and midnight (srcly-release).
  vn-architecture's 13 fills say nothing. ufw's custom brand stays `low-contrast`.
- `routing-order`: regionshot e1's return runs 25px above a wrap and crosses it.
- All S3.

## Metric work before the next round

- **Largest empty rectangle** inside the drawing's hull, as a share of its area (item 2; 4
  MISSED lines).
- **Aspect over 5:1** as a defect (item 2).
- **Two labels on different edges closer than their height** (item 1; carried from round 3).
- **A line through a label's text** at S1 weight, apart from a line under its padding (item 1).
- **`off-axis-port` on diamonds** (item 7; 4 MISSED lines).
- **`hook`**: count a U into the side the line left from, not a C down a channel into a facing
  side (multi-region, kubernetes).
- **`long-edge`**: measure against the drawing's diagonal or the direct distance between the
  ends, not 4 × the median. Tight packing shortens the median and adds hits.
- **A relabel expectation** that tests shape outside the widened band (item 5).

## Open product questions, together

1. When a return's shorter side would cross a label, should it take the longer side or arrive
   on the target's side face? (item 1)
2. Wrapped rows or long strips for chains of groups, and is 5:1 the cap? (item 2)
3. May a line cross a title band straight into a member's top when the detour is over 3 × the
   direct length? (item 3)
4. Is the relabel promise "nothing outside the widened band changes shape"? (item 5)
5. Should growth honour, drop or refresh viewer `stay`s that went stale? (item 5)
6. Channels: binding on the router, or dropped and re-packed after routing? (item 6)
7. Diamonds: one edge per vertex, with the rest on side vertices? (item 7)
