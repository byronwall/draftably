# Final link and numerical consistency review

Reviewed the actual generated `index.html`, all 30 per-case audit/review pairs, source metadata, the aggregate CSVs and the main report's 30-case ledger on 2 November 2026. This review made no changes to native attempts, reference media, ratings, the immutable baseline or the report. It checked correspondence and evidence links; it was not another visual rating exercise.

## Checks completed

| Check | Result |
| --- | --- |
| Offline index local `href` / `src` targets | 456 references to 336 distinct local targets; all resolved, no references into excluded `working/`, and no missing same-document anchors |
| Per-case review ratings versus `ratings.csv` | All 90 stage records agreed on quality, fidelity and semantic completeness |
| Narrative audit rating tables versus `review.json` | All 270 rating cells agreed across 30 cases |
| Audit refinement-cycle counts and stopping reasons | All 30 agreed with their case reviews; every case had a parseable cycle statement |
| Main report case ledger | All 30 quality sequences, final fidelity/semantic scores and v2 non-comment line counts agreed with the CSVs |
| Per-case effort tables versus current native source | 462 directly comparable numeric cells agreed; checked columns included lines, declarations, layout/refinement lines, pins, nudges, manual-size lines and styling lines where the table named the same count |
| Item metadata versus `sources.csv` | All 30 agreed on title, publisher, primary page URL, original-image URL, publication date and access date |
| Included Markdown local links | 596 targets checked; no actual link entered an excluded `working/` folder. The missing report register link was reported and resolved as described below. |

Effort-table checks compare like-named count definitions. They do not conflate individual endpoint-side attributes with edge statements, exact-size statements with every dimensional attribute, or styling assignments with styling lines. The per-case narratives and the root methodology preserve those distinctions.

## Findings and delivery disposition

The following concrete issues were sent to the root integrator. The root confirmed the listed corrections; report/index regeneration and archive sealing remain the integrator's final assembly steps. No additional native refinement was performed.

| Finding at review time | Disposition |
| --- | --- |
| `report.md` and `effort-audit.md` referred to `appendix/reviews/historical-audit-review.md`, while the curated filename is `historical-audit-concept-review.md` | **Resolved:** report generation corrected to the included historical review path |
| `appendix/independent-plan-review.md` cited excluded `working/infra/final-review-edits.json` as the edit/hash evidence | **Resolved:** the proof is copied into `appendix/proofs/` and its reference adjusted |
| The copied concept findings referred to `effort-concept.csv`, which was absent beside that findings file | **Resolved:** the CSV is included beside the findings with copy provenance |
| The report linked `file-register.md`, which did not yet exist | **Resolved:** the root created the human-readable register |
| The report cited nonexistent `src/model/cells.ts` | **Resolved:** the source citation is corrected to `src/dsl/cells.ts` |
| Root additionally identified E27 prose counting 15 explicit-port edges rather than 14 | **Resolved by the root:** a prose-only correction, with no native-source or rating change |

The unchanged archival `appendix/source-context/AGENTS.md` retains its original repository-relative links. Those point into the separately supplied baseline/full repository, not a complete repository duplicated in this evidence ZIP. They are preserved input provenance and are not essential dependencies for reading the corpus, comparisons or audit results.

## Evidence boundary

The successful checks above establish consistency between the delivered sources, records and reports at review time. They do not prove scientific completeness, publication quality, licensing permission or an improvement in reader comprehension. Those claims remain separately qualified in the case audits, methodology and remaining-work document. The root's final integrity verifier and archive manifest are the operative seal after final assembly.
