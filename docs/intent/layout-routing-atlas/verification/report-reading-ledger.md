# Pro package reading ledger

## Inputs read

- `AGENTS.md` and `docs/intent/layout-routing-atlas/{run.md,pro-prompt.md,preparation.md}`.
- Original authored package at `tmp/pro/layout-routing-atlas/collected/extracted/draftably-layout-routing-atlas/`:
  - `report.md`, `implementation-plan.md`, `recommendations.md`, `page-drafts.md`, `visual-atlas.md`, `coverage.csv`, `README.md`, `atlas-manifest.json`.
  - `evidence/layout-source-audit.md`, `evidence/routing-source-audit.md`, `evidence/editor-source-audit.md`.
  - `evidence/final-qa-editor.md`, `evidence/final-qa-layout.md`, `evidence/final-qa-routing.md`, `evidence/verification-summary.md`, `evidence/live-observations.md`, `evidence/files-read.md`, `evidence/layout/review.md`.
  - `scripts/README.md`, `scripts/reproduce-routing-README.md`, `examples/routing/README.md`.
  - Reviewed the atlas storyboard structure and the visual family map from VL01–VL46, V-R01–V-R24, V-E01–V-E36, and NV-E01–NV-E04. Used audit and final QA tables for detailed takeaways and exceptions instead of dumping 4,370 lines of storyboard or source into this ledger.

No downloaded program was executed. No original bytes were edited. No tests or product checks were run in this synthesis task. Only the four draft files in this directory were written.

## Artifact paths to preserve

Preserve the extracted originals under `docs/intent/layout-routing-atlas/assets/pro-results/2026-11-01/` during parent integration, excluding the supplied input ZIP as instructed. Keep original reports, CSV, manifest, preview HTML, evidence, example sources, SVGs, and helper scripts intact. Keep ZIPs and input packets under ignored `tmp/pro/layout-routing-atlas/`.

The current extraction path is `tmp/pro/layout-routing-atlas/collected/extracted/draftably-layout-routing-atlas/`. The root package `README.md` is the artifact index and explains reproduction commands. `evidence/verification-summary.md` contains final package counts and exact check boundaries.

## Completion and limits

All six requested authored deliverable types exist: report, coverage CSV, visual atlas, page drafts, implementation plan, and recommendations. The package also has 323 positive `.draft` sources, isolated negative/defect examples, generated SVG evidence, a machine-readable manifest, and an offline preview. Final QA reports 197 CSV rows × 14 columns; 105 visual families and four nonvisual groups; 323 positive sources; 969 successful baseline CLI check/inspect/SVG commands; 17 frozen routing subcomparisons; 13 page-draft fences; 24 native model renders, including 11 warm-layout renders.

Evidence boundaries that must stay visible:

- Pinned baseline source validation is not proof that the current worktree still matches it. An independent source-verification pass is responsible for current-source checks.
- The bundle's source packet omits historical reference engine assets, release metadata, and some growth/quality corpus inputs. It cannot establish a full release gate.
- `pnpm check:fast` reached formatting and stopped on 253 unchanged packet files; the reported typecheck and lint passed. Some unit failures were tied to missing assets or loopback limits; two affected suites passed in an approved rerun. `site:build` passed. `pnpm check` and `pnpm prove:site` are not claimed as complete passes.
- Offline atlas browser QA is not native Draftably Editor QA. Native operation artifacts are actual model executions, not UI gesture or save/reopen evidence.
- The published site was inspected on 2026-11-01. Treat that as dated deployment evidence, not evidence of pinned-source identity.
- Pro's product fixes remain proposals. Do not describe them as implemented, released, merged, or deployed.
