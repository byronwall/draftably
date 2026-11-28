# Router speed on schema resize · #715

## Summary

Use the dogleg preview while the user resizes the schema. Draw the settled routes once after release. On the five 60-line benchmark schemas, the preview took **40 ms median**, down from **223 ms quick** and **1,715 ms full**. Every line cleared the cards and reached its assigned row.

Across 36 changed column geometries, dogleg stayed under 100 ms on **72 of 72 calls** in two isolated runs. Both medians were 30 ms. The p95s were 42 and 51 ms. In a process rotating all four modes, dogleg reached 123 ms p95. Measure event-to-paint in explorEDA before treating 100 ms as a host guarantee. The visual cost is shared lines that are harder to trace during motion.

The dogleg prototype is commit `5cd08803`. The sparse grid preserved more lane separation, at 85 ms on the standard benchmark and 128–149 ms p95 in the isolated width runs. The third prototype at the branch tip used at most twelve optional refinements. It took 44 ms on the standard benchmark and recovered little of the lost lane separation. All three use the same explicit `routing.quality: 'resize'` selector. Each makes its decisions from geometry, routing order, and counts. Existing callers must select the new quality to get the preview. Byron’s decision is whether shared trunks are acceptable during motion, and whether the host target applies to the median or p95.

## Route timings

Apple M3 Pro, Node 24.21.0, base `c962cb08`. Each cell shows median / maximum milliseconds for synchronous `route()`. The harness warms the engine and uses five distinct schemas per size, seeds 101–105. The timed call includes strict obstacle checks. All 500 requested edges per mode were present, with zero blocked edges and zero missed rows.

| Mode or prototype     | Commit     | 10 lines |  30 lines |      60 lines | Speed vs quick at 60 |
| --------------------- | ---------- | -------: | --------: | ------------: | -------------------: |
| Full                  | `c962cb08` |  38 / 55 | 304 / 366 | 1,715 / 1,747 |                0.13× |
| Quick                 | `c962cb08` |   8 / 17 |   51 / 60 |     223 / 247 |                1.00× |
| Dogleg                | `5cd08803` |    5 / 9 |   13 / 16 |   **40 / 43** |            **5.58×** |
| Sparse grid           | `9c36beb3` |   8 / 14 |   36 / 38 |   **85 / 88** |            **2.62×** |
| Selective sparse grid | `f3b2a469` |   5 / 13 |   18 / 19 |   **44 / 47** |            **5.07×** |

**Resize replay.** Three further 60-line schemas kept the same rows and edges while the five column positions changed. The distance between column origins ranged from 260 to 370 px in 10 px steps. Cards stayed 220 px wide. In the primary replay, each process loaded one runtime. The two trials below each covered the same 36 inputs. Pairs of numbers give trial 1 / trial 2.

| Built runtime         |   Median ms |      p95 ms |  Maximum ms | Calls under 100 ms |
| --------------------- | ----------: | ----------: | ----------: | -----------------: |
| Quick                 |   228 / 231 |   319 / 314 |   391 / 425 |             0 / 72 |
| Dogleg                | **30 / 30** | **42 / 51** | **55 / 68** |        **72 / 72** |
| Sparse grid           |     92 / 89 |   149 / 128 |   173 / 133 |            50 / 72 |
| Selective sparse grid |     38 / 41 |     46 / 51 |     65 / 64 |            72 / 72 |

**Timing sensitivity and determinism.** A second harness kept several runtime bundles in one process. The four modes rotated their execution order. A second pass repeated all 144 mode/geometry combinations after cache eviction. All edge outputs matched byte for byte. Each mode drew all 2,160 requested edges at their assigned rows.

| Built runtime         | Median ms |  p95 ms | Maximum ms | Calls under 100 ms |
| --------------------- | --------: | ------: | ---------: | -----------------: |
| Quick                 |       259 |     635 |        885 |             0 / 36 |
| Dogleg                |    **38** | **123** |    **132** |        **33 / 36** |
| Sparse grid           |       105 |     224 |        225 |            17 / 36 |
| Selective sparse grid |        48 |     153 |        200 |            32 / 36 |

An earlier three-mode replay gave dogleg 34 / 73 / 92 ms (median / p95 / maximum) and sparse grid 103 / 246 / 259 ms. The repeated geometry produced identical routes, while the machine timings varied. These measurements cover the router on synthetic schemas. Browser layout, painting, and the delay from a resize event to the visible frame need a host measurement.

## Where the time goes

The baseline profile used a readable esbuild bundle of `src/graph-api/route-entry.ts`. Each mode warmed separately on seed 999, then routed five fresh 60-line schemas with strict avoidance. The Node inspector sampled at a requested 500 µs interval. Percentages use elapsed sample weights. Inclusive rows overlap when one function calls another.

| Baseline function, inclusive                  |     Quick |      Full |
| --------------------------------------------- | --------: | --------: |
| `find`, including searches and simplification |     91.2% |     75.0% |
| A* `search`, including grid preparation       | **59.9%** | **45.5%** |
| `onLine`, inside search                       |     10.7% |     11.9% |
| `simplify`                                    |     14.3% |     14.9% |
| `conflicts`                                   |     10.7% |     20.2% |
| `parallelConflicts`                           |      3.4% |      5.9% |
| `improve`, including its re-finds             |        0% | **66.0%** |
| `nudge`                                       |        0% |     13.6% |
| `tidy`                                        |        0% |      5.5% |

Dogleg made zero grid searches at all 36 replay widths, including the slow calls. Further A* tuning cannot fix that preview’s measured tail. Profile dogleg generation, scoring, simplification, allocation and host load at the slow widths first.

In full mode, the first route finds accounted for 10.8% of samples outside the later passes. Improvement tried 600 re-finds and accepted 348 across five drawings. Even eliminating all A* time at the measured full-mode share leaves roughly 935 ms at the baseline median.

The following counters came from separate untimed runs of the same five inputs. Each search contributes its grid dimensions and heap pops. A cell can have two arrival directions and multiple heap entries.

| Mode                  | Searches | Grid cells summed | Heap pops summed |
| --------------------- | -------: | ----------------: | ---------------: |
| Quick                 |      274 |         2,313,379 |        3,940,329 |
| Full                  |      889 |        13,345,686 |       20,347,457 |
| Dogleg                |        0 |                 0 |                0 |
| Sparse grid           |      274 |           269,840 |          489,780 |
| Selective sparse grid |       60 |            49,204 |           93,051 |

## Candidate ideas

Estimates below apply to whole-call time at 60 pinned lines. Only the three named prototypes have measured speedups. The other ranges are planning estimates from the baseline profile.

| Idea                                                                                                                                                            | Speedup or saving                                                                                       | Can drawings change?                           | Risk or limit                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Keep the best obstacle-clear straight line or dogleg. Use quick's grid when none exists.                                                                        | 5.58× quick, measured                                                                                   | Yes, preview                                   | Shared trunks hide individual edges. Required fallback searches can still be expensive.                         |
| Keep the grid search but omit lanes derived from prior paths when a clear candidate exists. Keep obstacle, terminal and standoff lines, and all conflict costs. | 2.62× quick, measured                                                                                   | Yes, preview                                   | Fewer places to separate lines. Some resize widths still take over 200 ms.                                      |
| Use the sparse grid for long shared runs. Allow one refinement per four edges seen, up to twelve.                                                               | 5.07× quick, measured                                                                                   | Yes, preview                                   | Routing order allocates the refinements. Median shared length fell only 11% from dogleg.                        |
| Add unavoidable bends to the Manhattan lower bound.                                                                                                             | Estimated 0–5% less time                                                                                | Possible on ties or at the visit cap           | One ordinary bend costs 32. A crossing costs 360. A stronger bound alone has limited leverage.                  |
| Tighten the first window around the terminal stubs. Retry the existing window on failure.                                                                       | Estimated 5–20% less quick time if it removes 10–35% of search work                                     | Yes                                            | An early success can cause a poor detour. Extra attempts can make narrow gaps slower.                           |
| Share grid setup between a find's side pairs.                                                                                                                   | About 0% on these pinned schemas                                                                        | No, with identical coordinates, gates and sums | Both sides are fixed. This needs a separate benchmark with automatic sides.                                     |
| Skip one or both improvement passes on dense full drawings.                                                                                                     | Estimated 1.3–1.5× full for one skipped pass. Removing both gives about 2.9× if other work stays fixed. | Yes                                            | Many replacements are useful. The remaining work alone is hundreds of milliseconds.                             |
| Re-find only routes affected by a changed path in the second improve pass.                                                                                      | Estimated 5–20% less full time if it removes 8–30% of improvement work                                  | Yes                                            | A vacated corridor may help a line outside the old path's neighborhood. Dense fans can dirty almost every line. |

Selective mode tests whether the candidate shares at least four edge gaps of total length with prior routes. The budget covers optional refinements. A missing candidate still gets quick's normal search in all three prototypes.

## What changed on the page

The table uses medians across the five 60-line inputs. Crossings, shared length and close parallel runs use the engine's pair measures. Shared pixels sum over pairs, so several lines on one trunk count several times.

| Measure                                   |  Quick |    Dogleg | Sparse grid | Selective |
| ----------------------------------------- | -----: | --------: | ----------: | --------: |
| Crossings                                 |    767 |     1,055 |         848 |     1,002 |
| Shared length, px                         |  7,669 |    47,173 |      11,047 |    42,146 |
| Close parallel pairs                      |    654 |       659 |         637 |       665 |
| Bends                                     |    396 |       180 |         330 |       204 |
| Total line length, px                     | 57,388 |    46,484 |      54,662 |    49,758 |
| Edges changed vs quick, all five drawings |      — | 234 / 300 |   233 / 300 | 229 / 300 |

All 15 standard schema drawings changed under each preview. Dogleg makes the outside of the diagram look quieter. At the receiving card `c3r2`, several relationships merge visually before they reach the header. Selective separates some of them. Sparse keeps more of the approach lanes distinguishable. The benchmark has substantial fan-in. Four of five 60-line seeds send every analysis edge to the same three cards. That limits how far the crossing counts generalize. [Schema comparison in this checkout](../../../tmp/route-speed/resize-comparison.png)

**Authored reference drawings.** I compared all 105 visible edges across the 13 authored samples with quick and each explicit preview. Only `branches` changed, and only on `e4`, from **Validate schema** to **Merge fields**. Dogleg and selective take the shorter inside path. It adds two crossings and removes four bends. I judge that path harder to follow. Sparse moves a turn on the outside path. Its crossings, bends and length match quick, and it looks comparable. The existing blocked edge in `overlaps` stayed blocked. Every previously clear edge stayed clear. [Reference comparison in this checkout](../../../tmp/route-speed/branches.png)

**Fresh layout graphs.** With the default quality, all three prototypes preserved all four `bench:fresh` digests across 20 drawings. With each preview explicitly selected, edge geometry matched quick in three sets of five drawings each (100-node trees, 50/65 DAGs and 100/127 DAGs). All five 200/260 DAGs changed. Median proper crossings rose from 672 to 731 for dogleg, 688 for sparse, and 724 for selective. No previously clear edge became blocked. Near **Service 100** in the first large DAG, dogleg takes a wider outside lane across more lines. Sparse stays closer to quick. Selective still crosses several lower lanes. [Quick](../../../tmp/route-speed/dag-1-quick-crop.png) · [Dogleg](../../../tmp/route-speed/dag-1-dogleg-crop.png) · [Sparse](../../../tmp/route-speed/dag-1-sparse-crop.png) · [Selective](../../../tmp/route-speed/dag-1-selective-crop.png)

## Plan and decisions

1. Trial `5cd08803` in explorEDA with `routing: { quality: 'resize', avoidNodes: 'strict' }` while columns move. It gave the fastest preview and the most timing margin.
2. After release, replace the preview once with quick or full routes. If full quality is required, run it off the UI thread and apply only the result for the current geometry. Full took about 1.7 seconds on these schemas.
3. Capture a real 30-card resize in the host. Measure route time and event-to-paint p95 separately. Count missing rows and blocked edges by ID. Inspect the same receiving cards during motion and after release.
4. If p95 must stay under 100 ms, profile the slow real widths. Try reusing a previous path after checking its endpoints and obstacle clearance. Use the ordinary deterministic search for paths that fail validation. A reusable path would become an explicit input to preserve determinism.

**Byron's decisions.** Is 100 ms the median or the p95 target on the host machine? May lines share trunks during motion if they separate on release? Should the settled schema use the current quick result or pay for full refinement? These choices determine whether dogleg can ship as a resize-only mode or needs more work.

## Reproduction

From the root of each listed revision, run the following commands. The three prototype commits accept `--quality resize`. Run the baseline without that argument.

```sh
pnpm bench:route
pnpm bench:route --quality resize
pnpm test:engines
pnpm bench:fresh --out tmp/route-speed/fresh.json
```

The branch-tip harness supports `pnpm bench:route --quality resize --sweep` for the 36 width inputs. To compare an archived runtime, add `--dist <directory-containing-route.js>`. Run each command twice, in a fresh process each time, to reproduce the isolated trials. The four-mode comparison used the same geometries and rotated the mode order.

To reproduce the CPU profiles from a clean checkout of `c962cb08`, build the runtime and a second copy with readable function names. Importing the benchmark runs its normal checks before the profiler starts. Each profile below runs in its own process. Open each `.cpuprofile` in the browser performance panel to inspect its call tree.

```sh
pnpm runtime:build
mkdir -p tmp/route-speed
pnpm exec esbuild src/graph-api/route-entry.ts --bundle --platform=node --format=esm --outfile=tmp/route-speed/base.mjs
for quality in quick full; do
  node --input-type=module - "$quality" <<'JS'
import { Session } from 'node:inspector/promises';
import { writeFileSync } from 'node:fs';
import { schema } from './scripts/bench/route.mjs';
import { route } from './tmp/route-speed/base.mjs';
const quality = process.argv[2];
const draw = seed => route({ ...schema(60, seed), routing: { quality, avoidNodes: 'strict' } });
draw(999);
const session = new Session();
session.connect();
await session.post('Profiler.enable');
await session.post('Profiler.setSamplingInterval', { interval: 500 });
await session.post('Profiler.start');
for (let seed = 101; seed <= 105; seed++) draw(seed);
const { profile } = await session.post('Profiler.stop');
writeFileSync(`tmp/route-speed/${quality}.cpuprofile`, JSON.stringify(profile));
JS
done
```

The final `pnpm check:fast` passed type, lint and format checks, with 1,194 unit tests passing and 41 skipped. Each prototype passed the 320 engine parity comparisons across 13 fixtures and 11 algorithms, plus the layout/routing and brush suites. The default fresh digests were `cfffb78d`, `29e578cc`, `1171cc8e`, and `4053b61c` in benchmark order. The CPU profiles, counters, diagram scores and screenshots were collected outside the timed route calls.

The default diagram audit passed against `c962cb08` at both the sparse-grid and selective commits. All 429 SVGs matched the baseline byte for byte. Counts were 45 corpus, 31 held-out, 40 examples, 24 issues, 118 population and 171 options, with zero build errors. Weighted defect index stayed at 4.80. The issue-improvement rule warned because its mean stayed at 6.10. [Gate results](../../../tmp/route-speed/audit-final/compare.md) · [Coverage](../../../tmp/route-speed/audit-final/coverage.md)
