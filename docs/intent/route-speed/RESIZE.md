# Full-quality routing on resize · #715

Across 360 changed layouts, passing the previous result improved the router’s weighted cost on 14 and tied on 346. No drawing increased shared length between unrelated lines. All 12,000 line instances reached their assigned rows and cleared the cards.

**Dense resize missed the 100 ms target.** On the five standard 60-line schemas, the guarded call took 1,699 ms median and 2,134 ms p95. A candidate can clear every card and still lose to a fresh drawing on crossings or shared runs. These layouts needed the fresh computation to settle that question. The fast path worked on a separate 60-line control with independent rows.

## What the router reuses

Pass the last result as the second argument to `route(graph, previous)`. The runtime stores a private snapshot keyed by that result. Caller edits to returned points cannot change the snapshot. The ordinary entry point still returns the same public fields.

- Reuse supports unlabelled lines between rectangular cards with fixed left or right row ports and explicit full or quick quality. A topology or settings change, an ambiguous split or reorder of columns, and unsupported input all use ordinary routing.
- A vertical track follows its nearest card face. A horizontal track follows the nearer terminal row. Both endpoints must match the ports computed for the new cards.
- The router checks the moved polyline against inflated obstacles and checks the drawn path with the strict rounded-corner test. A kept run must preserve its former card standoff and parallel-lane separation up to the requested gaps. Existing tight fans can keep their spacing.
- The router searches for missing lines against kept lines, then runs the requested quality passes with the kept lines fixed. It routes fresh when more than a third fail. It also goes directly to a fresh drawing if the missing lines need repair and two kept lines already conflict.
- Unchanged boxes can use their checked result. A new drawing can skip a fresh comparison when its lines attain a lower bound. Each line must attain its Manhattan distance and minimum bend count. The drawing must have zero crossings, sharing, lane conflicts and standoff cost, and its cost must be below the cost of a blocked line.
- Otherwise, the router computes a fresh reference at the requested quality. To keep the candidate, its total, shared length, lane deficit and standoff cost must each be at most the reference value. It also checks shared length for pairs with no common card and pairs with no common row port. The caller receives the fresh drawing if the candidate fails. Every choice uses geometry and counts.

## Replay

The benchmark uses the five-column, 30-card generator from `bench:route`. Each sequence starts with a full route at 320 px column pitch and 220 px card width. Twelve changed layouts widen and narrow the pitch from 270 to 360 px and the cards from 200 to 240 px. Each call receives the preceding call’s result. A separate process computes the fresh references, so a resize cannot hit the reference process’s cache.

The primary seeds are 101–105. The confirmation seeds are 401–405. Each table row covers 60 resizes and excludes the five initial full calls. Cost comes from `createContext().total()` with the default weights. Each blocked line costs 100 million. The other terms are length, 32 per bend, 360 per crossing, 8 per shared pixel and 18 per unit of lane deficit. Unrelated sharing in the table counts each pair of lines with no common endpoint card, as in the diagram audit.

| Seeds        | Lines | Mean fresh cost | Mean resize cost | Better / tied / worse | Mean unrelated px, fresh → resize |
| ------------ | ----: | --------------: | ---------------: | --------------------: | --------------------------------: |
| Primary      |    10 |       17,736.91 |        17,727.01 |            6 / 54 / 0 |                             0 → 0 |
| Primary      |    30 |      140,037.81 |       140,037.81 |            0 / 60 / 0 |                       2.98 → 2.98 |
| Primary      |    60 |      588,142.95 |       588,142.95 |            0 / 60 / 0 |                     19.12 → 19.12 |
| Confirmation |    10 |       17,956.42 |        17,930.82 |            6 / 54 / 0 |                             0 → 0 |
| Confirmation |    30 |      124,529.65 |       124,519.61 |            1 / 59 / 0 |                       0.27 → 0.27 |
| Confirmation |    60 |      584,298.82 |       583,886.87 |            1 / 59 / 0 |                     32.00 → 31.25 |

All five cost components tied or improved in every primary frame. Three confirmation frames traded length or bends for a lower total. Seed 405 at 10 lines, step 12, added 1,526 px and six bends and removed six crossings. Seed 401 at 30 lines, step 2, added 110 px and twelve bends. It removed 21 px of shared runs and reduced lane deficit by 51.56. Seed 401 at 60 lines, step 1, added 156 px and removed two crossings and sixteen bends. The machine-readable replays retain every component for every frame.

| Seeds        | Lines | Fresh median / p95 / max (ms) | With previous median / p95 / max (ms) |
| ------------ | ----: | ----------------------------: | ------------------------------------: |
| Primary      |    10 |            45.9 / 68.1 / 75.2 |                    45.2 / 65.1 / 76.4 |
| Primary      |    30 |         310.0 / 442.4 / 486.7 |                 313.5 / 458.7 / 604.9 |
| Primary      |    60 |   1,716.8 / 2,152.4 / 2,414.3 |           1,699.3 / 2,134.3 / 2,418.1 |
| Confirmation |    10 |           51.7 / 89.8 / 103.7 |                    46.2 / 63.5 / 74.8 |
| Confirmation |    30 |         318.7 / 391.7 / 460.1 |                 315.4 / 380.0 / 443.0 |
| Confirmation |    60 |   1,811.8 / 2,432.8 / 2,883.0 |           1,810.4 / 2,258.9 / 2,582.9 |

Times are synchronous wall time for the public call, including validation, repair and fallback. The median averages the middle two calls. P95 uses the nearest rank. In the positive control, sixty straight lines joined sixty independent pairs of cards. All twelve resizes tied fresh on cost. They took **3.6 / 7.0 / 7.0 ms**, against **9.9 / 13.7 / 13.7 ms** fresh.

On the primary replay, all 60 calls at each of 30 and 60 lines returned the fresh route. At 10 lines, 19 of 60 calls returned the moved drawing after comparison. The other 41 returned the fresh route. No primary drawing met the lower bound that permits skipping the comparison.

## 60-line comparison

On confirmation seed 401, the first resize moved the column pitch from 320 to 326 px and the card width from 220 to 222 px. Fifty-seven lines changed coordinates from the previous frame. On the new layout, reuse lowered cost from **557,132.70 to 532,415.58** and unrelated sharing from **45 px to zero**. Lane deficit fell from 11,432.15 to 10,130.31, although the count of close parallel runs rose from 597 to 641.

![Fresh full route and accepted reused route at the same column positions](../../../tmp/route-resize/comparison.png)

The two panels use the same extent and row geometry. The PNGs are generated locally under `tmp/route-resize/`.

## Rejected fast paths

I first tested moving each bend with its nearest card face. At 60 lines this took 12 ms median. It lost on weighted cost in 56 of 60 primary frames, by as much as 169,955.28. Keeping each path clear did not preserve the room between paths.

A second trial built one search grid for the resized scene. It charged each grid arc for the lines already on it. Removing and adding one line updated those charges for the next search. I also tested sliding runs, preserving lane order during compression, reducing grid density, searching fewer lines, and retrying crowded lines. The compact grid at checkpoint `11c13e7c` reached **72.0 / 96.5 / 116.0 ms** at 60 lines. It still increased weighted cost twice and unrelated sharing twice. The guarded implementation at `ad5a5c84` drops that grid.

Every regression of the compact grid on the primary replay is below. A positive delta means worse than fresh. The local CSV also lists the losing frames of the other trials. [Experimental case ledger](../../../tmp/route-resize/rejected-cases.csv)

| Lines | Seed | Step | Cost delta | Unrelated px delta |
| ----: | ---: | ---: | ---------: | -----------------: |
|    10 |  102 |    4 |    +208.00 |                  0 |
|    10 |  103 |    6 |    +115.58 |                  0 |
|    10 |  103 |    7 |    +199.58 |                  0 |
|    10 |  103 |    8 |    +211.58 |                  0 |
|    30 |  104 |    5 |    +486.52 |                  0 |
|    30 |  104 |    6 |  +1,113.52 |                  0 |
|    30 |  104 |   11 |    +811.02 |                  0 |
|    30 |  105 |    8 |  +1,786.70 |                  0 |
|    30 |  105 |    9 |    +546.20 |                  0 |
|    60 |  101 |   10 |    +443.00 |                +12 |
|    60 |  101 |   11 | −13,960.80 |                +10 |
|    60 |  101 |   12 |  +1,545.82 |                −23 |

## explorEDA integration

In `routeSchemaEdges`, retain the existing row offsets, side choices, self-link arcs and boundary walls. A worker can own the full result for the current schema. Replace the 15-line cutoff with explicit full quality for drawings that need full routing.

```ts
import { route, type RouteIn, type Routed } from '@draftably/runtime/route';

let previous: Routed | undefined;
function routeSchema(nodes: RouteIn['nodes'], edges: RouteIn['edges']) {
  previous = route({ nodes, edges, routing: { quality: 'full', avoidNodes: 'strict' } }, previous);
  return previous.edges;
}
```

Keep `previous` in the same worker across calls. Sending a copy to another worker loses the private snapshot. Route the initial layout and dense resizes off the UI thread. Coalesce pending viewport changes to the latest geometry. Apply each set of card positions together with its matching line result. A worker keeps the interface responsive while a full pass runs. The measured dense route still takes about 1.7 seconds before that drawing is ready.

## Verification

Base `c962cb08`. The default engine parity report matched the base byte for byte across 320 comparisons, 13 fixtures and 11 algorithms. The geometry and brush reports matched after excluding their timing fields. The diagram audit tied on all 429 renders with zero render errors. Its issue-improvement warning recorded an unchanged issue score. The pooled weighted defect index stayed at 4.80. [Audit](../../../tmp/route-resize/audit/compare.md) · [Coverage](../../../tmp/route-resize/audit/coverage.md)

`pnpm check` and `pnpm bench:route` passed. All four default `bench:fresh` drawing digests matched the base across five runs per case. They were `cfffb78d`, `29e578cc`, `1171cc8e`, and `4053b61c` in benchmark order. The exact-search experiment remains deferred because dense resize missed its target.

```sh
pnpm bench:route:resize
pnpm bench:route:resize --holdout
pnpm bench:route:resize --independent
pnpm bench:route:resize --picture
pnpm shoot tmp/route-resize/fresh.svg tmp/route-resize/fresh.png
pnpm shoot tmp/route-resize/reuse.svg tmp/route-resize/reuse.png
pnpm shoot --sheet tmp/route-resize/comparison.png --cols 2 --size 2100x1100 \
  'Fresh full route::tmp/route-resize/fresh.svg' 'Reuse after resize::tmp/route-resize/reuse.svg'
```
