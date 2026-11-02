# Draftably editorial diagram corpus

**Completed study — 2 November 2026.** Thirty actual external references, ninety editable native attempts, ninety successful final command sets, thirty full comparison sheets, and thirty detail comparison sheets. The source packet and all thirty first-render sources remain unchanged.

Baseline: **`f14d9b891adba75de6cc172b190017ea5a5ca091`**, as identified by the supplied packet. Packet SHA-256: `5112a74cdb9674f223914392783baaa5349c63d4fdc492b26e823436c45f9373`. The packet has 388 supplied files. It excludes Git metadata; this is packet verification, not an independent remote Git-object verification.

## Reading route

1. Open **[index.html](index.html)** locally for a searchable gallery of the real reference | frozen v0 | final v2 comparisons. It requires no network. Expand a card for its labeled detail comparison; open the original, audit, native source or SVG from that card.
2. Read **[report.md](report.md)** for the findings, all thirty case dispositions, strong defaults and limitations.
3. Use **[gap-audit.md](gap-audit.md)** and **[implementation-plan.md](implementation-plan.md)** for the twelve stable gap IDs, incidence, source evidence, recommended priorities and future acceptance criteria.
4. Read **[effort-audit.md](effort-audit.md)** for source burden, awkward native excerpts, refinement history and interpretation of metrics.
5. Consult **[coverage.md](coverage.md)**, **[methodology.md](methodology.md)**, **[source-read-log.md](source-read-log.md)** and **[remaining-work.md](remaining-work.md)** for sampling, evidence boundaries and the Codex handoff.

## Completion and evidence

| Deliverable | Complete | Evidence |
|---|---:|---|
| Accepted external references and original local files | 30 / 30 | `sources.csv`, each `source.md` and `reference.<ext>` |
| Native attempts | 90 / 90 | Every case has `v0.draft`, `v1.draft`, `v2.draft` |
| Successful final `check` commands | 90 / 90 | `validation.csv`, timestamped stdout/stderr/exit records |
| Successful final JSON/metrics inspections | 90 / 90 | `vN.geometry.json` and logs |
| Actual native SVGs and PNGs | 90 / 90 of each | Baseline CLI exports and supplied screenshot script |
| Full reference / v0 / v2 comparisons | 30 / 30 | `comparison.png` and source-hash validation |
| Labeled detail comparisons | 30 / 30 | `details/comparison.png`, selectors and source-hash validation |
| Per-case source, visual, effort and stopping audits | 30 / 30 | `audit.md`, `review.json`, `effort.json` and/or `vN.effort.json` |
| Frozen v0 sources | 30 / 30 intact | `freeze-integrity.csv`, `v0-frozen.json` |
| Unchanged packet files | 388 / 388 | `logs/baseline-integrity.json`, `logs/final-verification.json` |

All final retained attempts have actually run. **No mandatory baseline rendering step is deferred to Codex.** Future application fixes, regression tests for those fixes, repository summaries, permissions review before republication, and a review PR remain unexecuted. Successful validation permits warnings and does not imply publication-ready visual quality.

## What is in a case folder?

The `corpus/` folder uses the original workstream slugs; `item.json` supplies the stable E01–E30 identity. Capitalization is intentional and retained in links.

| File or pattern | Purpose |
|---|---|
| `reference.<ext>` | Actual retrieved image, original SVG or publisher PDF, at original resolution where available |
| `reference-preview.png` | Readable raster view of that original; not a recreated reference |
| `item.json`, `source.md` | URLs, authors, dates, figure location, design merit, object inventory, observed license and original hash |
| `v0.draft`, `v0-frozen.json` | Straightforward default source and hash of its first successful rendering |
| `v1.draft`, `v2.draft` | Documented native refinements; final manual geometry remains visible |
| `vN.svg`, `vN.png` | Actual baseline native render and screenshot |
| `vN.geometry.json`, `vN.validation.json`, `effort.json` and/or `vN.effort.json` | Geometry, exact source/run linkage, command outcomes and source counts |
| `comparison.png`, `comparison.validation.json` | Full equal-card-width presentation and hashes of its source PNGs |
| `detail-selection.json`, `details/` | Explicit crop coordinates, issue selection, crops, comparison and validation |
| `audit.md`, `review.json` | Independent quality/fidelity/semantic judgments, source burden and residuals |
| `trials/` | Informative failures or superseded refinements, when present |

The aggregate tables are `sources.csv`, `candidate-log.csv`, `effort.csv`, `ratings.csv`, `render-metrics.csv`, `validation.csv`, `warnings.csv`, `diagnostics.csv`, `gap-mapping.csv` and `freeze-integrity.csv`. `summary.json` is the machine-readable completion and score summary. `file-register.md` explains the tree; `file-register.csv` records each deliverable's role, bytes and SHA-256. `manifest.sha256` covers all archived files except itself.

## Reproduce the native runs

Keep this archive's original results intact. Make a **separate extracted copy** for a replay. Extract the supplied `source-packet.zip` to a separate baseline directory, or use an unchanged checkout at the stated commit. The source packet is an input and is not duplicated inside this evidence ZIP. Supply Node **>=22.21**, pnpm, Python 3 and Pillow. Dependency resolution uses the supplied lockfile.

From any directory, run the orchestration helper against the baseline:

```sh
bash /absolute/path/to/study-copy/scripts/rerun.sh /absolute/path/to/baseline
```

The helper runs the original baseline CLI and `scripts/shoot.mjs`; it does not draw native diagrams. Its `pnpm install --frozen-lockfile` and browser install need network access. Use a supported Playwright Chromium environment. This study used Node 24.22.1, pnpm 11.25.0, Python 3.12.14, and Chromium headless shell 156.0.8078.4 / Playwright build 1248. The package requests pnpm 11.9.0; the actual pnpm difference is disclosed. The local browser installer initially received invalid empty archives; the matching official browser archive and successful approved execution are recorded in the logs. The original corpus runs are complete despite that setup failure.

The following is an exact single-case equivalent; replace the two absolute paths:

```sh
cd /absolute/path/to/baseline
export DRAFTABLY_NO_UPDATE_CHECK=1
case_dir=/absolute/path/to/study-copy/corpus/cloudflare-tls-handshake

pnpm --silent draftably check "$case_dir/v0.draft"
pnpm --silent draftably inspect "$case_dir/v0.draft" --json --metrics > "$case_dir/v0.geometry.json"
pnpm --silent draftably inspect "$case_dir/v0.draft" --svg > "$case_dir/v0.svg"
pnpm --silent shoot "$case_dir/v0.draft" "$case_dir/v0.png"
```

Repeat for v1 and v2, or use `scripts/run-trials.py`, which records every stdout/stderr/exit status and copies the exact source into a timestamped log folder. `scripts/run-sheets.py` regenerates full comparisons with the supplied `shoot --sheet`. `scripts/run-details.py` uses the supplied `shoot --crop` and the saved intrinsic-pixel selectors. If a changed renderer alters image dimensions, **review the selectors before comparing details**; an old pixel rectangle is not a reliable new crop automatically.

The supplemental historical audit is run unchanged through `scripts/run-baseline-audit.py`. Its temporary adapter maps v1 to e1 and v2 to e2 because the original script discovers those filenames. The mapping and real outputs are preserved in `baseline-audit/`. Its defect index is diagnostic evidence, not the editorial score.

After a replay, refresh and verify the evidence:

```sh
python3 /absolute/path/to/study-copy/scripts/aggregate.py
python3 /absolute/path/to/study-copy/scripts/build-coverage.py
python3 /absolute/path/to/study-copy/scripts/build-reports.py
python3 /absolute/path/to/study-copy/scripts/build-index.py
python3 /absolute/path/to/study-copy/scripts/verify-corpus.py --baseline /absolute/path/to/baseline
python3 /absolute/path/to/study-copy/scripts/package-study.py --baseline /absolute/path/to/baseline
```

Replays use current environment paths in new logs. Do not edit the original frozen v0 files or run the archived workstream authoring generators over final sources. The curated appendix preserves findings and evidence; disposable authoring workspaces and full article HTML caches are omitted.

## Evidence and permission boundaries

Actual pixels, command exits, hashes and source counts are observed. Visual scores and maintainability assessments are judgments. Proposed engine features, future test outcomes and expected effort reductions are unexecuted proposals. No registered pixel error, authoring-time measurement, comprehension study or speed benchmark is claimed.

Third-party originals retain their recorded attribution and observed license status, including `unknown`. A public URL does not establish redistribution permission. This archive fulfills the requested private study; no corpus image was published to the repository and no author was contacted. See each `source.md` before later publication.

The six confirmation cases are **E06, E10, E16, E20, E28 and E30**. They are fully audited now but reserved from choosing numerical tuning values in the proposed future implementation work.
