# Source reading log

This is the collective reading record for the study, not a claim that every contributor independently read every file. “Full” means at least one workstream explicitly read the complete file. “Targeted” means only the stated sections or symbols were used. The immutable source is Draftably commit `f14d9b891adba75de6cc172b190017ea5a5ca091`.

The original per-workstream records are preserved in `appendix/readlogs/`; the root handoff is consolidated here. `appendix/readlogs/combined-source-read.json` records exact paths, readers, line counts and SHA-256 hashes. The supplied packet inventory and unchanged-byte proof are in `logs/baseline-integrity.json` and the final corpus verification.

## Complete-file reads

Paths below are relative to the study workspace. In an extracted archive, the application paths refer to the separately supplied unchanged source packet; they are not claims that the whole application is duplicated in this ZIP.

| File | Complete read reported by | Lines |
| --- | --- | ---: |
| `baseline/AGENTS.md` | root; concept E11–E22; infra E01–E10; adjacent E23–E30 | 30 |
| `baseline/README.md` | root | 153 |
| `baseline/SOURCE-CONTEXT.md` | root; concept E11–E22; infra E01–E10; adjacent E23–E30 | 10 |
| `baseline/docs/ARCHITECTURE.md` | root | 139 |
| `baseline/docs/CHECKS.md` | root | 168 |
| `baseline/docs/DSL.md` | root; concept E11–E22; adjacent E23–E30 | 1245 |
| `baseline/docs/intent/diagram-quality/CORPUS.md` | root | 29 |
| `baseline/docs/intent/diagram-quality/FEEL.md` | root | 88 |
| `baseline/docs/intent/diagram-quality/NEXT.md` | root | 299 |
| `baseline/docs/intent/diagram-quality/RUBRIC.md` | root | 313 |
| `baseline/package.json` | root | 79 |
| `baseline/scripts/diagram-audit.mjs` | root | 1721 |
| `baseline/scripts/draftably.mjs` | root; infra E01–E10 | 62 |
| `baseline/scripts/lib/proof.mjs` | root | 106 |
| `baseline/scripts/shoot.mjs` | root; concept E11–E22; infra E01–E10; adjacent E23–E30 | 137 |
| `baseline/skills/draftably/SKILL.md` | root; concept E11–E22; infra E01–E10; adjacent E23–E30 | 341 |
| `baseline/src/cli/main.ts` | root | 694 |
| `baseline/src/cli/svg.ts` | infra E01–E10 | 549 |
| `baseline/src/dsl/cells.ts` | concept E11–E22; adjacent E23–E30 | 232 |
| `baseline/src/dsl/compile.ts` | root | 3162 |
| `baseline/src/dsl/frame.ts` | root; adjacent E23–E30 | 34 |
| `baseline/src/dsl/syntax.ts` | root | 1181 |
| `baseline/src/model/appearance.ts` | concept E11–E22 | 664 |
| `baseline/src/model/fonts.ts` | concept E11–E22; adjacent E23–E30 | 175 |
| `baseline/src/model/heading.ts` | root; concept E11–E22; adjacent E23–E30 | 82 |
| `baseline/src/model/labels.ts` | root; concept E11–E22; infra E01–E10 | 178 |
| `baseline/src/model/legend.ts` | concept E11–E22 | 77 |
| `baseline/src/model/note.ts` | root; concept E11–E22; infra E01–E10; adjacent E23–E30 | 133 |
| `baseline/src/model/panels.ts` | adjacent E23–E30 | 91 |
| `baseline/src/model/routes.ts` | infra E01–E10 | 860 |
| `baseline/src/model/types.ts` | concept E11–E22; infra E01–E10 | 271 |
| `baseline/tests/cells.test.ts` | concept E11–E22; adjacent E23–E30 | 155 |
| `baseline/tests/compare.test.ts` | adjacent E23–E30 | 89 |
| `baseline/tests/dsl.test.ts` | root | 333 |
| `baseline/tests/edge-labels.test.ts` | concept E11–E22; infra E01–E10 | 150 |
| `baseline/tests/heading.test.ts` | root; concept E11–E22 | 64 |
| `baseline/tests/legend.test.ts` | root; concept E11–E22 | 73 |
| `baseline/tests/notes.test.ts` | concept E11–E22; infra E01–E10; adjacent E23–E30 | 38 |
| `baseline/tests/sequence.test.ts` | concept E11–E22; infra E01–E10 | 128 |
| `baseline/tests/soft-groups.test.ts` | root | 97 |
| `baseline/tests/theme-slots.test.ts` | concept E11–E22 | 120 |
| `baseline/tests/themes.test.ts` | concept E11–E22; infra E01–E10 | 295 |
| `baseline/tests/title-wrap.test.ts` | root; concept E11–E22 | 88 |
| `upload/pro-prompt(20261102-031322).md` | root; concept E11–E22; infra E01–E10; adjacent E23–E30 | 247 |

## Named example reads

The root reported complete reads of these exact supplied native examples; paths and byte hashes are also in the combined JSON register.

| File | Reader | Lines |
| --- | --- | ---: |
| `baseline/examples/theme-proof.draft` | root | 36 |
| `baseline/examples/login-sequence.draft` | root | 18 |
| `baseline/examples/tcp-header.draft` | root | 25 |
| `baseline/examples/png-file.draft` | root | 27 |
| `baseline/examples/support-lanes.draft` | root | 34 |
| `baseline/examples/order-lifecycle.draft` | root | 26 |
| `baseline/examples/checkout-change.draft` | root | 27 |

## Targeted reads only

These files were inspected for decisive implementation details; a complete-file read is not claimed.

| File | Sections / symbols | Reader |
| --- | --- | --- |
| `baseline/src/dsl/translate.ts` | root lines 98–130; infra beginning through rejectUnsupported and main translation setup | root; infra E01–E10 |
| `baseline/src/model/geometry.ts` | roundedPath | infra E01–E10 |
| `baseline/src/components/scene/NodeView.tsx` | ShapeOutline | infra E01–E10 |
| `baseline/src/engines/routing-engine.js` | Lines 1–100 (settings and obstacles), 518–604 (ports/slots), 1760–1834 (routing report/export); no full engine read claimed | concept handoff review |
| `baseline/tests/translate.test.ts` | unsupported-edit / waypoint rejection test | infra E01–E10 |

## Focused rereads of files covered in full elsewhere

The root additionally checked `types.ts` lines 1–220, `routes.ts` lines 440–715 and `svg.ts` lines 180–275. Infrastructure focused on native shape/edge allow-lists, sequenced compilation, cell endpoint handling, theme/group shade and contrast definitions, and cells routing tests. Adjacent work focused on `ModelObject`, `ModelEdge`, `DslShape`, `titleArea`, `diamondMeasure`, `nodeLabel`, label measurements and SVG outline/label/edge markup. Concept checked the historical audit’s relevant parsing/measurement/scoring sections (1–260, 450–750, 810–856, 1130–1285 and 1550–1645). These targeted inspections add traceability; they do not inflate the number of complete-file reads.

## Evidence beyond application source

Each accepted reference has its primary page, exact asset URL, access date, observed-license boundary, original image hash, editorial selection rationale and image in its case folder. All 30 original references and their native v0/v2 images were viewed; workstream records also document v1 and full-sheet review. The collected references are independent external material, not the historical internal corpus named in the repository intent documents.

The 90 retained native sources were actually passed through the baseline CLI and screenshot script. Reading a test file is not equivalent to executing the complete application test suite. Source review, actual command validation and human visual judgment remain separate evidence streams. No full repository test-suite or site-build result is implied by this reading log.

## Study helper review

The concept handoff review read the complete orchestration helpers `run-trials.py`, `run-details.py`, `run-sheets.py`, `run-baseline-audit.py`, `aggregate.py`, `verify-corpus.py`, `package-study.py` and `rerun.sh`. These are study orchestration and audit programs, not replacement renderers. The concrete rerun review is preserved in `appendix/reviews/rerun-helper-review.md`; the final helpers add failure propagation and a fresh verification gate. The remaining execution boundary is recorded in `remaining-work.md`.

## Limits

Files absent from these lists are not claimed as complete reads. Internal model support was distinguished from native-file serialization: existing label placement, edge label offsets, waypoints and icon/image representations do not imply that this baseline native DSL can save them. Implementation recommendations in the gap audit are proposals grounded in those interfaces and the retained visual failures; no application patch was made.
