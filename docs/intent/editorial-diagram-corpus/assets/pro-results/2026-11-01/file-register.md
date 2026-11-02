# Human-readable file register

This register explains the archive without requiring knowledge of the authoring workspaces. **`file-register.csv` is the exhaustive inventory**: one row per deliverable other than the self-generated register/manifest, with relative path, role, bytes and SHA-256. **`manifest.sha256` hashes every archived file except itself.** The outer `draftably-editorial-corpus-pro.zip.sha256` identifies the delivered ZIP.

## Start with the findings and images

| Path | Contents |
|---|---|
| `README.md` | Completion counts, exact baseline, reading route, commands and reproduction boundaries |
| `report.md` | Main synthesis, measured/judged results, all thirty case dispositions, preserved defaults and priorities |
| `index.html` | Searchable offline gallery linking actual originals, full/detail comparisons, audits, `.draft` sources and SVGs |
| `coverage.md` | Thirty accepted references, publisher consolidation, sixteen pattern families, object-count caveats and confirmation set |
| `methodology.md` | Selection, immutable baseline, frozen-first-render protocol, ratings, counts and evidence definitions |
| `gap-audit.md` | Twelve stable gap IDs with evidence, frequency, cost, source boundary, workaround, severity, proof and risk |
| `implementation-plan.md` | Ranked Build/Explore/Defer/Avoid dispositions and staged future module/test/proof plan |
| `effort-audit.md` | Stage and per-case source counts, actual awkward excerpts, maintainability judgments and metric caveats |
| `source-read-log.md` | What was actually read, with full-file versus targeted reading separated |
| `remaining-work.md` | Completed execution versus future Codex changes, PR and publication review |

## Machine-readable audit tables

| Path | Scope and interpretation |
|---|---|
| `sources.csv` | Thirty accepted reference records and source/attribution metadata |
| `candidate-log.csv` | Thirty-nine retained acquisition/decision records, with original source rows preserved losslessly |
| `effort.csv` | Ninety stage rows; measured non-comment lines, declarations, layout/refinement, pins, dimensions, styles and ports |
| `ratings.csv` | Ninety stage rows; independently judged communication, fidelity and semantics plus case context |
| `render-metrics.csv` | Native geometry measurements; not an image-fidelity or comprehension score |
| `validation.csv` | Current source-to-run hash matches and final command exit statuses |
| `warnings.csv` | Literal warning diagnostics from the final checks, including unresolved fit/title warnings |
| `diagnostics.csv` | All captured severity levels, so informational findings remain distinct |
| `freeze-integrity.csv` | Frozen v0 hashes and current matching status |
| `gap-mapping.csv` | One row per global gap/case incidence with visible evidence, source boundary and measured full-case cost |
| `gaps.json` | Authored global gap definitions; source for the Markdown and CSV views |
| `summary.json` | Completion counts, publisher groups, confirmation set, score distributions and selected effort summaries |
| `execution-summary.json` | Actual final command count and summed process durations, explicitly not wall or authoring time |

## Case folders: `corpus/<slug>/`

`item.json` provides the stable E01–E30 identity. `source.md` records primary page/image URLs, figure/crop identity, access and available publication dates, author/publisher, observed license, design merit and intended reading path. Original filenames adapt to the real media type: PNG, JPG/JPEG, SVG, GIF or PDF as obtained. The source table and folder metadata identify the actual extension.

| Pattern | Evidence |
|---|---|
| `reference.<ext>` | Actual retrieved original image/SVG or publisher PDF; never a hand-drawn substitute |
| `reference-preview.png` | Readable raster view of that real source; original bytes remain separately available |
| `v0.draft`, `v0-frozen.json` | First successful default source and its freeze record |
| `v1.draft`, `v2.draft` | Supported native refinements, with manual controls exposed |
| `vN.svg`, `vN.png` | Actual unchanged baseline vector export and supplied-shoot screenshot |
| `vN.geometry.json` | Actual JSON/metrics inspection |
| `vN.validation.json` | Hash of the exact source, timestamped log location, commands, exits and elapsed process times |
| `effort.json` and/or `vN.effort.json` | Workstream stage effort records; root `effort.csv` applies one consolidated counting definition |
| `comparison.png`, `comparison.validation.json` | Full reference / frozen v0 / final v2 sheet with retained aspect ratio and source-image hashes |
| `detail-selection.json`, `details/` | Explicit intrinsic-pixel crops, detail images, sheet and selection/source-hash validation |
| `audit.md`, `review.json` | Visual judgment, independent scores, readability verdict, residuals, source burden and stop reason |
| `trials/` | Informative rejected or superseded trials, when available; filenames and notes distinguish them from retained stages |

Some workstreams retain extra acquisition/provenance or earlier comparison records beside the common files. They remain in the exhaustive register. The aggregate metadata and current validation records identify the final retained outputs.

## Execution history: `logs/`

`logs/<slug>/<stage>/<UTC-run-id>/` contains `source.draft`, each command's stdout/stderr, and a result JSON with actual arguments, working directory, UTC start, elapsed seconds and exit status. Multiple runs are retained; the case's `vN.validation.json` points to the final current run. Failed historical runs do not make a later validated source incomplete, and a successful old render does not validate a newly changed source.

Comparison and detail runs have their own logs. Full comparisons are refreshed with input-image hashes; detail logs retain the crop selector and source PNG hashes. Installation, browser acquisition, smoke attempts and runtime versions remain under top-level `logs/`. Final gates are `logs/baseline-integrity.json` and `logs/final-verification.json`. Helper fault tests, when present, are explicitly labeled synthetic orchestration tests and are separate from native-case results.

## Supplemental historical audit: `baseline-audit/`

The original `scripts/diagram-audit.mjs` ran unchanged. Its file-discovery convention uses v0/e1/e2, so the included adapter records the v1→e1 and v2→e2 mapping. This directory contains actual per-case metrics, summary, command output and run status. The initial failed invocation is retained under trials. Its heuristic defect index supplements the native metrics and visual review; it is not the principal quality score. The independent critique explains concrete false positives and a missed title crossing.

## Curated appendix

`appendix/README.md` indexes byte-identical source-context, candidate, reading, finding, license and review copies. `copy-provenance.json` identifies each original copied file and hash. The combined readlog names 51 fully read files and five targeted-only files, with source hashes. Global reports supersede local provisional gap labels and older qualitative notes where independent review corrected them.

The appendix includes an independent synthesis/plan review, independent visual review, a historical-audit critique, helper-reproduction review, and the archive-only coverage reproduction proof. Original candidate rows remain available even though disposable downloaded article HTML and historical authoring workspaces are excluded.

## Reproduction and packaging helpers

| Script | Function |
|---|---|
| `scripts/rerun.sh` | Install frozen baseline dependencies/browser, replay all native stages, comparisons/details and historical audit, aggregate and verify |
| `scripts/run-trials.py` | Run unchanged baseline CLI/shoot commands and retain exact source/logs; refuse changed frozen v0 and propagate failures |
| `scripts/run-sheets.py` | Use supplied `shoot --sheet` and record final source-image hashes |
| `scripts/run-details.py` | Validate saved crop bounds, use supplied `shoot --crop`/`--sheet`, record selection/source hashes and propagate failures |
| `scripts/run-baseline-audit.py` | Run the unchanged historical audit through the documented filename adapter |
| `scripts/aggregate.py` | Recompute measured source counts, statuses, diagnostics, ratings and freeze summary |
| `scripts/build-coverage.py` | Reproduce coverage and candidate normalization from included metadata and appendix candidate records |
| `scripts/build-reports.py` | Assemble the authored synthesis with current measured tables and stable case links |
| `scripts/build-index.py` | Build an offline HTML reading index; not a native diagram renderer |
| `scripts/verify-corpus.py` | Verify actual outputs, command/source linkage, baseline/freeze integrity, comparison provenance and required deliverables |
| `scripts/package-study.py` | Require fresh verification, create register/manifest, write the named ZIP and verify its CRC |

Rerun in a separate copy. The package requires the supplied source packet or an unchanged checkout at the stated baseline; the packet itself, installed dependencies, browser binaries, build products, full article caches and authoring workspaces are not duplicated in this ZIP. No hidden reference background, custom diagram renderer or post-render native overlay is included.
