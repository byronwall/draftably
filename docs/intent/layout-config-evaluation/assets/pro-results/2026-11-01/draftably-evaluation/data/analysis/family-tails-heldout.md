# Heldout family tails

This is a reporting-only view of saved measurements. It does not fit a policy, change a score, or execute an algorithm.

## Denominators and interpretation

The logical method pool contains **852 base/method observations**, drawn from **829 distinct physical trials** on **24 bases**. Heldout selected presets use their frozen supplemental runs, with preset 0 reusing canonical heldout C results; development tuning outcomes are not read. Reused rows do not add executions.

Each family/method cell contains one observation per base. Candidate methods are repeated measurements of the same diagrams, not independent users or extra corpus cases. `completed` means status `ok`, even when a hard gate failed. `hardValid` applies the frozen geometry and source-intent gates. `unavailable` means a planned logical observation has no terminal result; inapplicable specialist cases are not silently counted as missing runs.

Median, p90, and maximum are shown separately for completed-only and hard-valid-only observations. The p90 uses linear interpolation at (n−1)×0.9. With four development or two heldout bases per family, these are descriptive observed tails, not precise population estimates. Timeouts and failed trials remain in every planned denominator and in the failure ledger, but are not fabricated into numerical geometry scores.

Screening runtime medians are cache affected and may also reflect parallel worker contention. Use `data/analysis/validation/timing.json` and `data/timing-sample-freeze.json` for the dedicated uncached timing experiment. Original timeout durations and missing recovered timings remain in the raw records.

## Current-source family table

All geometry statistics below use completed-only observations. The companion CSV/JSON tables also show hard-valid-only statistics.

| Family | Planned | Completed | Hard valid | Timeout | Failed | Unavailable | DI/10 median / p90 / max | Crossings median / p90 / max | Route length median / p90 / max |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| architecture | 2 | 1 | 1 | 1 | 0 | 0 | 64.78 / 64.78 / 64.78 | 38.00 / 38.00 / 38.00 | 16347.00 / 16347.00 / 16347.00 |
| authored | 2 | 2 | 2 | 0 | 0 | 0 | 1.14 / 1.68 / 1.82 | 0.00 / 0.00 / 0.00 | 5832.00 / 9070.40 / 9880.00 |
| containers | 2 | 1 | 0 | 1 | 0 | 0 | 67.50 / 67.50 / 67.50 | 2.00 / 2.00 / 2.00 | 2847.00 / 2847.00 / 2847.00 |
| cycles | 2 | 2 | 2 | 0 | 0 | 0 | 4.71 / 5.65 / 5.88 | 3.00 / 4.60 / 5.00 | 12780.23 / 18774.72 / 20273.34 |
| dags | 2 | 1 | 1 | 1 | 0 | 0 | 27.14 / 27.14 / 27.14 | 44.00 / 44.00 / 44.00 | 13402.00 / 13402.00 / 13402.00 |
| disconnected | 2 | 1 | 1 | 1 | 0 | 0 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 429.84 / 429.84 / 429.84 |
| hierarchies | 2 | 1 | 1 | 1 | 0 | 0 | 5.83 / 5.83 / 5.83 | 0.00 / 0.00 / 0.00 | 2704.00 / 2704.00 / 2704.00 |
| networks | 2 | 1 | 0 | 1 | 0 | 0 | 4.62 / 4.62 / 4.62 | 5.00 / 5.00 / 5.00 | 6502.00 / 6502.00 / 6502.00 |
| pipelines | 2 | 2 | 2 | 0 | 0 | 0 | 3.52 / 5.76 / 6.32 | 1.00 / 1.80 / 2.00 | 12848.00 / 18492.00 / 19903.00 |
| presentation | 2 | 2 | 2 | 0 | 0 | 0 | 2.73 / 3.53 / 3.73 | 0.00 / 0.00 / 0.00 | 7627.00 / 10150.20 / 10781.00 |
| recipes | 2 | 2 | 2 | 0 | 0 | 0 | 9.40 / 11.48 / 12.00 | 0.00 / 0.00 / 0.00 | 4469.50 / 4654.70 / 4701.00 |
| routing | 2 | 2 | 2 | 0 | 0 | 0 | 23.50 / 32.46 / 34.71 | 7.50 / 13.50 / 15.00 | 20000.50 / 25880.10 / 27350.00 |

## Concrete current-source failures

| Case | Terminal status | Hard defects | Required intent failures | Saved evidence |
|---|---|---:|---:|---|
| dags-06 | timed_out | — | — | `data/layout-checkpoints/C-heldout-dags-06-current.json.gz` |
| hierarchies-06 | timed_out | — | — | `data/layout-checkpoints/C-heldout-hierarchies-06-current.json.gz` |
| architecture-06 | timed_out | — | — | `data/layout-checkpoints/C-heldout-architecture-06-current.json.gz` |
| networks-05 | ok | 3 | 0 | `data/geometry/C-heldout-networks-05-current.json.gz` |
| networks-06 | timed_out | — | — | `data/layout-checkpoints/C-heldout-networks-06-current.json.gz` |
| disconnected-06 | timed_out | — | — | `data/layout-checkpoints/C-heldout-disconnected-06-current.json.gz` |
| containers-05 | ok | 15 | 0 | `data/geometry/C-heldout-containers-05-current.json.gz` |
| containers-06 | timed_out | — | — | `data/layout-checkpoints/C-heldout-containers-06-current.json.gz` |

## Saved detail and limitations

Group density is reported from the frozen metric's saved `groupFill` values: the sum of child rectangle areas divided by their enclosing child span. Within-base summaries are computed before family summaries, so diagrams with more groups do not become extra observations. Alignment is the saved per-diagram fraction of visible nodes aligned with another node; a distinct per-group alignment metric was not measured. Group padding spread excludes the top header margin, matching the saved metric's left/right/bottom convention.

Raw defect index, normalized DI per 10 edges, crossings, bends, route length, area, label counts and defects, detours, density, alignment, and hard layout/routing defects remain available. Extent and route-length maxima are scale-sensitive descriptors, not additional quality gates. Lower density or alignment witnesses are descriptive and do not introduce new pass/fail thresholds.

Saved group-detail gaps: **0**. Existing per-case profile score rows are referenced by file, trial, method, profile, and CSV line; scores are not recalculated here.

## Files

- `family-tails-heldout.json`: metadata and nested family/method statistics.
- `family-tails-heldout-current-source.csv`: current-source counts and both statistic cohorts.
- `family-tails-heldout-engine-methods.csv`: all other methods, with their own base denominators.
- `family-tails-heldout-statistics-long.csv`: one family/method/cohort/metric per row.
- `family-tails-heldout-case-metrics.json` and `.csv`: one logical base/method observation, physical trial key, raw metrics, and profile links.
- `family-tails-heldout-worst-cases.json` and `.csv`: observed tail witnesses and every execution/hard failure.
