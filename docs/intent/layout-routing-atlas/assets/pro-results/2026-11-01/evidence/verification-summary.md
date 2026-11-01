# Verification summary

Baseline `af70d8317797d5a522acffdd604819376a3ec893`; reviewed1 November2026. Tests here describe the supplied baseline and delivered review artifacts. They do not claim the proposed fixes have been implemented.

| Check | Actual outcome | Evidence |
| --- | --- | --- |
| Exact source | All335 supplied ZIP members unchanged; no missing members | `baseline-source-hashes.json` |
| Coverage contract | 197 canonical entries,194 controls/operations plus three derived behaviors;105 visual families plus four nonvisual groups; all references resolve | `package-structure-check.json`, `../coverage.csv`, `../atlas-manifest.json` |
| CSV import | 197 records ×14 columns; all imported fields match the canonical manifest; no duplicated IDs or empty fields | `coverage-csv-check.json` |
| Positive companions | 323 final sources;969 successful actual CLI check/inspect/SVG commands; all packaged source hashes match those executions | `final-cli-reproduction.json` |
| Complete page fences | All13 full source fences compile and render; extraction issue found during assembly was corrected before this final run | `page-drafts/validation.json` |
| Frozen routing geometry | 17 subcomparisons across all 12 numeric settings and their selected counterexamples have exactly equal node rectangles | `final-cli-reproduction.json#/frozen_comparisons` |
| Raw router against CLI | All36 primary numeric routing outputs match the actual CLI route arrays | `routing/comparisons.json`, `routing/raw-router-probes.json` |
| All ten supplied engines | All ten locally reproduced headline metric records match the supplied comparison | `engine-reproduction.json` |
| Native editor/timeline/brush | 13 genuine model SVG/JSON outputs; portable reproduction matches recorded geometry hashes | `editor/model-render-results.json`, `../scripts/README.md` |
| Native warm parameter mechanisms | 11 genuine model SVG/JSON outputs; portable reproduction matches all 11 geometry hashes | `layout-warm/model-render-results.json`, `layout-warm/portable-validation.json` |
| Full CLI radius experiment | Completed through the unmodified CLI with actual PNGs, contact sheet and variants manifest; all three requested radii still tagged same-as-v0 | `cli-vary-radius/variants.json`, `cli-vary-radius/command.log` |
| Existing screenshot tool | Unmodified `scripts/shoot.mjs` rendered the three actual radius SVGs, with only browser executable selection adapted | `cli-vary-radius/corners-existing-shoot.png`, `cli-vary-radius/existing-shoot.log` |
| Offline atlas browser | All109 groups traversed,347 source variant visits and36 native variant visits including repeats; zero JavaScript errors; equal paired viewBoxes; byte-exact original SVG download; search and repeated keyboard selection work | `preview-qa/results.json` |
| Narrow layout | At390px viewport, page width 390px and stacked panel width 354px; no document-level horizontal overflow; wide drawings scroll inside synchronized viewports | `preview-qa/V-R12-mobile.png`, `preview-qa/results.json` |
| Published docs | Real engine edit/Expand/Reset, routing error/Reset, sequence self-message/Reset; relevant lessons read | `live-observations.md` |
| `pnpm check:fast` | Typecheck and ESLint passed. Formatting stopped the chain on 253 unchanged packet files; no autoformat applied | `checks/check-fast.log` |
| `pnpm test:unit` initial run | 59 files passed, one skipped, five failed;413 tests passed,6 failed,8 skipped. Omitted fixtures/metadata and restricted loopback affected failures | `checks/unit-tests.log` |
| Targeted loopback rerun | Both affected suites passed:2 files,10 tests | `checks/network-tests.log` |
| `pnpm site:build` | Exit0;25 pages generated. Bundle advice and Vite WebSocket EPERM setup message retained | `checks/site-build.log` |
| Full release/browser gates | `pnpm check`, complete historical engine parity and `pnpm prove:site` are not claimed as passing. Native Editor lifecycle recipes remain unexecuted UI proofs | `files-read.md`, `../implementation-plan.md` |

## Diagnostic scope

Positive sources can retain deliberate quality or compiler warnings. The primary pass criterion is no error, finite geometry and valid actual rendering. `inspect`/`vary` warning counts differ from the additional quality notes reported by `check --metrics`; the atlas displays both scopes. The ten defect repros are isolated. The separate pin/required-alignment conflict is an expected diagnostic that retains pins, not an eleventh defect.

Metrics are not interchangeable: frame area includes export framing; object bounds describe geometry; raw router length can omit later cell-entry extensions and sequence drawing segments. Equal metrics, equal rectangles, equal point arrays, equal visible paths and identical SVG bytes are separate claims.

## Runtime and recovered browser limitation

Node 24.22.1 and pnpm 11.25.0 were used; the repository names pnpm 11.9.0. The frozen lockfile remained unchanged. Early package-driven browser downloads failed. A later download from the official Chrome for Testing stable index supplied Chrome Headless Shell 156.0.8078.80. Browser tasks needed the permitted process environment, and CLI `CHROME_PATH` selected a local wrapper adding the container-required `--no-sandbox`. No project source or test assertion was changed to obtain successful results.

The missing `reference/v7/source/*-engine.js`, release metadata and omitted quality/growth corpus inputs must come from a complete checkout for integration. Do not manufacture substitutes or treat the artifact viewer's browser proof as the Editor's lifecycle proof.
