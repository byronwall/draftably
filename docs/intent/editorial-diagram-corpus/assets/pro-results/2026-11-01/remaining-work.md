# Remaining work and execution boundary

## Current study execution is complete

**All 90 retained native attempts have completed the actual baseline `check`, `inspect --json --metrics`, SVG export and supplied `shoot` PNG render. There are no existing mandatory render blockers and no retained attempt awaiting local Codex execution.** The count is 30 accepted references × three retained stages (v0, v1 and v2). Each stage has editable source, actual SVG/PNG output, geometry, exact source hash, command results, stdout/stderr and timing evidence.

This is an execution statement, not a claim that all diagrams are publication ready. The per-item audits retain residual semantic and visual limitations, warnings and unsuccessful refinement trials. All 30 first-render freezes are intact; no custom renderer or imported reference background was used to make native attempts appear more faithful.

| Evidence | Completed in this study | Authoritative record |
| --- | ---: | --- |
| Accepted real reference originals and readable previews | 30 | `sources.csv`, each `source.md` / `item.json` and `reference.*` |
| Retained native sources | 90 | `corpus/*/v0.draft`, `v1.draft`, `v2.draft` |
| Actual native checks | 90 | Per-stage `validation.json` and timestamped command logs |
| Actual JSON inspections with metrics | 90 | Per-stage geometry and inspection stdout |
| Actual SVG exports | 90 | Per-stage SVG and export logs |
| Actual native PNG renders | 90 | Per-stage PNG and supplied-shoot logs |
| Full reference / v0 / v2 comparison sheets | 30 | `comparison.png` and `comparison.validation.json` |
| Selected reference / v0 / v2 detail comparison sheets | 30 | `detail-selection.json`, `details/` and detail validation |
| Supplemental unchanged historical audit | Completed | `baseline-audit/run.json`, exit 0, with explicit v1→e1 and v2→e2 filename mapping |

The final combined integrity gate is `logs/final-verification.json`; the aggregate counts are in `summary.json` and `validation.csv`. The historical audit's heuristic defect index is not used as a human quality or fidelity score. Concrete metric false positives and a blind spot are retained in `appendix/reviews/historical-audit-concept-review.md`.

## Work for a future local Codex / repository session

The following work has **not** been executed. It is separate from the completed corpus and render evidence.

| Future task | Status and boundary | Useful completion evidence |
| --- | --- | --- |
| Review and adopt implementation dispositions | Proposed in `gap-audit.md` and `implementation-plan.md`; no application patch has been applied | Maintainer decisions linked to the stable gap IDs and accepted corpus examples |
| Implement selected product changes | Unexecuted; the supplied baseline remains immutable | A separate branch/checkout, source changes, focused regression tests, native source round trips and actual before/after renders |
| Open a repository review PR | Unexecuted; no commit, push or PR was made from this source packet | A reviewable PR in the full repository with the problem, change, resulting behavior, validation and remaining risk stated clearly |
| Rerun after engine or native-language changes | Unexecuted because no such changes were made | A separate comparison run against the changed revision, retaining this baseline and all frozen v0 sources |
| Test meaningful label edits and authoring resilience | Proposed, not measured here | A fixed real label-edit workload with source edits, geometry changes and actual publication/detail views before and after |
| Measure authoring time | Not measured in this study | A prospectively timed task with a defined start/stop protocol; subprocess elapsed times must remain identified as execution times |
| Review publication and redistribution rights | Unexecuted; no public corpus was published and no authors were contacted | Figure-specific review of the intended publication, observed licenses, attribution and any permissions needed; unknown terms remain unknown until resolved |
| Full repository/site verification | Not claimed by this packet study | Use the complete repository if a future patch touches omitted site material or requires full project checks |

The supplied packet intentionally omits `site/` and Git metadata. `SOURCE-CONTEXT.md` explicitly distinguishes that boundary from native CLI rendering. A full site build or a repository PR therefore belongs in a complete checkout; neither is a missing native render in this deliverable.

## Reproduction discipline

Use the unchanged baseline identified in `README.md`, install the supplied dependency lockfile, and run the provided orchestration helpers. The actual application renderer remains `pnpm draftably` and the actual raster/crop/sheet tool remains the supplied `scripts/shoot.mjs`. A local browser installation and a platform where Chromium can launch are reproduction prerequisites; both were resolved for the current study.

Keep this delivered corpus as the reference evidence. Rerun in a copy when comparing another engine revision, because successful helper execution refreshes stage artifacts and latest validation records. The timestamped command histories remain useful, but they do not turn overwritten latest outputs into a separate comparison corpus. Do not rerun historical authoring generators over frozen v0 files.

After a rerun, require the integrity verifier to pass before treating its outputs as complete or creating a new ZIP. Check actual child command exits and current source hashes; file existence alone is insufficient. The final helper workflow includes verification, and packaging requires a fresh verification of the supplied baseline. The concrete failure-propagation issue found during independent review and its disposition are preserved in `appendix/reviews/rerun-helper-review.md`.

If future layout changes alter image dimensions, review the saved detail rectangles against the new images. Their coordinates intentionally describe the present reference and native PNGs; blindly reusing them after geometry changes can select a different region. Preserve full views so a changed crop cannot hide a regression.

## Confirmation discipline

E06, E10, E16, E20, E28 and E30 are the designated confirmation cases. Their current outputs were inspected and scored in this study, but no new engine constants were tuned. A future implementation should choose numerical defaults using development cases, lock them, then run these six confirmations. A failure should be documented as another iteration, not silently retuned and called an independent confirmation.

## Essential unresolved questions

The open questions concern design decisions and future evidence: which bounded typography and label controls to expose; how to preserve native source and model round trips; how to repair group/cell endpoint approach without breaking legitimate interior-cell crossings; which repeated-panel and curved-layout behaviors deserve a small semantic feature; and which reference media may be published in the intended context. The study supplies concrete cases, source anchors and proposed proofs for those questions. It does not report their proposed benefits as measured outcomes.
