# Development family tails

This is a reporting-only view of saved measurements. It does not fit a policy, change a score, or execute an algorithm.

## Denominators and interpretation

The logical method pool contains **1704 base/method observations**, drawn from **1658 distinct physical trials** on **48 bases**. Selected presets reuse canonical tuning measurements and canonical C results for preset 0. Reused rows do not add executions.

Each family/method cell contains one observation per base. Candidate methods are repeated measurements of the same diagrams, not independent users or extra corpus cases. `completed` means status `ok`, even when a hard gate failed. `hardValid` applies the frozen geometry and source-intent gates. `unavailable` means a planned logical observation has no terminal result; inapplicable specialist cases are not silently counted as missing runs.

Median, p90, and maximum are shown separately for completed-only and hard-valid-only observations. The p90 uses linear interpolation at (n−1)×0.9. With four development or two heldout bases per family, these are descriptive observed tails, not precise population estimates. Timeouts and failed trials remain in every planned denominator and in the failure ledger, but are not fabricated into numerical geometry scores.

Screening runtime medians are cache affected and may also reflect parallel worker contention. Use `data/analysis/validation/timing.json` and `data/timing-sample-freeze.json` for the dedicated uncached timing experiment. Original timeout durations and missing recovered timings remain in the raw records.

## Current-source family table

All geometry statistics below use completed-only observations. The companion CSV/JSON tables also show hard-valid-only statistics.

| Family | Planned | Completed | Hard valid | Timeout | Failed | Unavailable | DI/10 median / p90 / max | Crossings median / p90 / max | Route length median / p90 / max |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| architecture | 4 | 3 | 3 | 1 | 0 | 0 | 11.54 / 12.49 / 12.73 | 1.00 / 1.80 / 2.00 | 3872.00 / 4422.40 / 4560.00 |
| authored | 4 | 4 | 4 | 0 | 0 | 0 | 7.18 / 11.72 / 11.82 | 0.00 / 0.70 / 1.00 | 2705.50 / 7388.15 / 8864.00 |
| containers | 4 | 4 | 2 | 0 | 0 | 0 | 35.83 / 119.00 / 145.00 | 0.50 / 4.50 / 6.00 | 5814.67 / 7093.20 / 7140.00 |
| cycles | 4 | 4 | 4 | 0 | 0 | 0 | 2.05 / 3.97 / 4.50 | 1.00 / 1.70 / 2.00 | 2859.07 / 7010.95 / 8515.16 |
| dags | 4 | 3 | 3 | 1 | 0 | 0 | 1.54 / 3.16 / 3.57 | 0.00 / 0.80 / 1.00 | 2008.00 / 3164.80 / 3454.00 |
| disconnected | 4 | 4 | 4 | 0 | 0 | 0 | 22.50 / 52.70 / 56.00 | 0.00 / 44.80 / 64.00 | 2218.34 / 23346.60 / 31780.00 |
| hierarchies | 4 | 3 | 3 | 1 | 0 | 0 | 0.00 / 24.00 / 30.00 | 0.00 / 24.80 / 31.00 | 2322.00 / 16531.60 / 20084.00 |
| networks | 4 | 3 | 3 | 1 | 0 | 0 | 0.91 / 21.83 / 27.06 | 0.00 / 8.00 / 10.00 | 1830.15 / 7202.68 / 8545.81 |
| pipelines | 4 | 4 | 4 | 0 | 0 | 0 | 0.00 / 2.10 / 3.00 | 0.00 / 0.00 / 0.00 | 1820.50 / 4523.60 / 5498.00 |
| presentation | 4 | 4 | 4 | 0 | 0 | 0 | 2.25 / 4.23 / 4.62 | 0.00 / 1.40 / 2.00 | 3147.50 / 11438.60 / 14903.00 |
| recipes | 4 | 4 | 4 | 0 | 0 | 0 | 13.51 / 89.75 / 120.00 | 0.00 / 0.70 / 1.00 | 2065.50 / 4155.31 / 4608.02 |
| routing | 4 | 3 | 3 | 1 | 0 | 0 | 13.57 / 21.84 / 23.91 | 3.00 / 8.60 / 10.00 | 3704.36 / 13002.47 / 15327.00 |

## Concrete current-source failures

| Case | Terminal status | Hard defects | Required intent failures | Saved evidence |
|---|---|---:|---:|---|
| dags-04 | timed_out | — | — | `raw terminal record only` |
| hierarchies-04 | timed_out | — | — | `data/layout-checkpoints/C-development-hierarchies-04-current.json.gz` |
| architecture-04 | timed_out | — | — | `data/layout-checkpoints/C-development-architecture-04-current.json.gz` |
| networks-04 | timed_out | — | — | `data/layout-checkpoints/C-development-networks-04-current.json.gz` |
| routing-04 | timed_out | — | — | `data/layout-checkpoints/C-development-routing-04-current.json.gz` |
| containers-03 | ok | 23 | 0 | `data/geometry/C-development-containers-03-current.json.gz` |
| containers-04 | ok | 36 | 0 | `data/geometry/C-development-containers-04-current.json.gz` |

## Saved detail and limitations

Group density is reported from the frozen metric's saved `groupFill` values: the sum of child rectangle areas divided by their enclosing child span. Within-base summaries are computed before family summaries, so diagrams with more groups do not become extra observations. Alignment is the saved per-diagram fraction of visible nodes aligned with another node; a distinct per-group alignment metric was not measured. Group padding spread excludes the top header margin, matching the saved metric's left/right/bottom convention.

Raw defect index, normalized DI per 10 edges, crossings, bends, route length, area, label counts and defects, detours, density, alignment, and hard layout/routing defects remain available. Extent and route-length maxima are scale-sensitive descriptors, not additional quality gates. Lower density or alignment witnesses are descriptive and do not introduce new pass/fail thresholds.

Saved group-detail gaps: **0**. Existing per-case profile score rows are referenced by file, trial, method, profile, and CSV line; scores are not recalculated here.

## Files

- `family-tails-development.json`: metadata and nested family/method statistics.
- `family-tails-development-current-source.csv`: current-source counts and both statistic cohorts.
- `family-tails-development-engine-methods.csv`: all other methods, with their own base denominators.
- `family-tails-development-statistics-long.csv`: one family/method/cohort/metric per row.
- `family-tails-development-case-metrics.json` and `.csv`: one logical base/method observation, physical trial key, raw metrics, and profile links.
- `family-tails-development-worst-cases.json` and `.csv`: observed tail witnesses and every execution/hard failure.
