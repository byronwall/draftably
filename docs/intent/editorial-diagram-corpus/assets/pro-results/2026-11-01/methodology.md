# Methodology and evidence boundaries

## Fixed baseline

This study uses the supplied tracked-file snapshot identified by `SOURCE-CONTEXT.md` as Draftably commit `f14d9b891adba75de6cc172b190017ea5a5ca091`. The input ZIP SHA-256 is `5112a74cdb9674f223914392783baaa5349c63d4fdc492b26e823436c45f9373`. All 388 files supplied in the packet are compared byte for byte with the extracted baseline; the individual hashes and final result are in `logs/baseline-integrity.json` and `logs/final-verification.json`.

No application source, language syntax, font, layout algorithm, renderer, or default was changed. Installing dependencies and generating CLI build output adds runtime files outside the packet's tracked inputs. The packet intentionally excludes the site, dependencies, builds and Git metadata; a full website build is outside this study. The packet identifies the commit; this study does not claim an independent Git-object verification against the remote repository.

## Selection

The corpus deliberately favors explanatory editorial design: a visible reading path, purposeful spacing and typography, meaningful color, useful annotations and selective containment. Topic familiarity or publisher reputation alone is insufficient. There are 22 computing references and eight adjacent references. `sources.csv` and `coverage.md` identify the accepted cases, while `candidate-log.csv` records rejected or unselected candidates and acquisition failures.

Most references contain 5–30 principal objects. Counts are reviewer inventories of the things a reader must distinguish, not machine counts of every SVG path, decorative mark or letter. Small comparisons and dense scientific or memory diagrams are included intentionally. A native attempt's node count can differ from the principal-object count because compound semantic objects may need multiple declarations, and a pictorial region may be represented by one labeled concept. The per-case audit records important decomposition or omission.

Independent publisher counting conservatively consolidates Chrome, web.dev and The Go Blog under one Google-associated group, two Wizard Zines comics under one author/publisher, and both Crafting Interpreters figures under Robert Nystrom. There are 24 displayed publisher names and 22 such independent publisher groups. A recurring pattern is called **common** only when it occurs in at least three accepted cases from at least two independent publishers. Counts are incidence within this purposive corpus, not prevalence in all editorial diagrams.

The six confirmation cases are E06, E10, E16, E20, E28 and E30. They were reserved before the aggregate recommendations. They are audited normally, but the plan proposes no numerical tuning values derived from them. Their purpose is to test a future change after implementation choices have been made using the other 24 cases.

## Actual originals and attribution

Each `reference.<ext>` contains the actual retrieved image or publisher PDF. `reference-preview.png` is a readable raster presentation of that source, not a reconstruction. Source records state any selected PDF page or figure. Full original bytes remain available even when a preview is smaller. Exact source-page and image URLs, figure identifiers, publisher/author, available publication dates, access dates, design merit and observed licensing are retained in `source.md` and `item.json`.

`unknown` means no applicable permission statement was established. Availability on the public web does not establish permission to republish. Some references carry attribution, noncommercial or no-derivatives conditions. The archive preserves these materials for the requested study. It does not publish them to the Draftably repository, alter their permissions or assert that every image is cleared for repository redistribution. Source images remain distinct from the independently authored native attempts.

## Three-stage protocol

1. **v0 — default:** straightforward native declarations and suitable recipes, default appearance, no pins, nudges, stays, manual dimensions, custom colors or typography. The first successfully rendered source is hashed and frozen before visual refinement. Native semantic shapes and sequence/cells recipes are allowed.
2. **v1 — documented structural and appearance controls:** grouping, order, direction, recipes, notes, legends and theme controls. This study reserves pins, nudges and exact node sizes for v2, making that extra cost easier to inspect. Explicit note widths remain allowed in v1: all 19 dimensional lines counted in that stage are note-width declarations, not exact node sizes.
3. **v2 — closest honest native attempt within the budget:** explicit position and size controls are allowed and counted. The result may still have a low fidelity score or a poor route. The study does not hide unresolved failures by removing hard content.

E14 and E22 initially used the reserved identifier `root` for a DNS root nameserver. The parser rejected those preflight sources before any native image existed. The failing sources and logs are retained in `trials/`; a name-only correction to `root_ns` established the first valid v0. This is an authoring mistake, not a layout defect, and is not counted as a visual refinement cycle. Other rejected trials, if any, remain recorded separately.

Each case has at most three visual refinement cycles after v0. The usual sequence is v1 followed by v2. A saved replacement after viewing an unsuccessful v2 is an additional cycle, not an invisible correction. `review.json`, the audit and timestamped run folders provide the stopping reason and actual stage history. V0 drift is checked again at packaging.

## Execution and rendering

The study runs the baseline's own CLI and `scripts/shoot.mjs`. The helper scripts in this archive only orchestrate commands, collect evidence and build indexes. They do not draw native diagrams.

For every final source, `check`, `inspect --json --metrics`, `inspect --svg` and `shoot` are executed. `pnpm --silent` removes the package-script banner from stdout; it does not change the underlying command. `DRAFTABLY_NO_UPDATE_CHECK=1` disables the optional update lookup. Every command records its arguments, working directory, UTC start, elapsed execution time, exit status, stdout and stderr. The exact source bytes used for the run are copied into the timestamped log directory. Final validation status also requires the current source hash to match that run.

The runtime is Node v24.22.1, pnpm 11.25.0 and the supplied frozen dependency lockfile. The manifest requests pnpm 11.9.0; this difference is recorded rather than concealed. Chromium headless shell 156.0.8078.4 is the build expected by the installed Playwright dependency (build 1248). Its matching official archive was downloaded after the ordinary browser installer received invalid empty responses. Browser startup required the execution environment's approved sandbox exception. These environment failures and the successful native runs are preserved in `logs/`.

The native bundled Draft Inter, Draft Source Serif and Draft JetBrains Mono faces remain fixed. No source-publisher font was installed to make a recreation match. A difference caused only by an unavailable handwritten or proprietary face is identified separately from missing text controls.

`comparison.png` is produced by the supplied `shoot --sheet`: reference, frozen v0 and final v2, each fitted to an equal-width card with its full aspect ratio and content retained. Native standalone SVG/PNG files supply the full view. `details/` contains explicitly labeled crops made by the supplied `shoot --crop`; `detail-selection.json` records intrinsic source-pixel coordinates and the selected issue. Detail views supplement the full comparisons and are not substitutes for them. Equal panel width is a presentation comparison, not registration at identical physical object size.

## Visual judgments

Ratings are expert visual judgments, not a blinded human comprehension experiment. They are independent axes; no weighted total conflates them.

| Score | Communication quality | Fidelity | Semantic completeness |
|---|---|---|---|
| 1 | Misleading or unreadable | Original visual explanation largely absent | Important message or relations incorrect/missing |
| 2 | Significant reading obstacles | Only part of the original structure recognizable | Major omissions or weakened distinctions |
| 3 | Useful, visibly compromised | Structure recognizable, major design devices lost | Central explanation preserved with meaningful losses |
| 4 | Clear, minor local defects | Close composition with visible residual differences | Almost all important content and relations preserved |
| 5 | Publication-ready on its own merits | Original visual explanation convincingly preserved | Important content, relations and meaningful visual encodings preserved |

A quality score of 5 does not assert pixel-perfect matching. Fidelity 5 also does not imply registered pixel identity. Semantic completeness includes important spatial, temporal and color encodings: equal-width retry steps, an uncolored transit network or a linearized cycle can retain labels and still lose meaning. A new caption explaining a missing encoding does not restore that encoding.

Each case additionally reviews composition/reading path/spacing/containment; type face, scale, weight, wrapping and hierarchy; routes, arrowheads, labels and overlaps; color, contrast and finish; and v0 readability versus the source as better/comparable/worse. A larger font, smaller image, familiar style or cleaner box alone is not grounds for a win. Whole-image and detail inspection inform the verdict. The individual audit names the concrete residuals and whether the source remains understandable after a label edit.

## Measured effort

`effort.csv` is generated directly from the native sources by `scripts/aggregate.py`.

- Non-comment lines exclude blank lines and standalone comments. Inline comments are ignored by a shell-like token reader.
- Declarations are node, group and edge lines. Layout lines and refinement lines are reported separately and as a union.
- Refinements count order, align, near, size, pin, nudge, stay and routing lines. Pins, nudges, stays and explicit edge-port lines also have their own columns.
- Manual sizing counts size commands, min-width/min-height/unit-width attributes, and explicitly set diagram/note widths. It is a count of lines with dimensions, not individual numeric coordinates.
- Styling lines count theme/theme-color and node/group color or shade assignments. Styling assignments also count the individual supported attributes, so a long theme line cannot hide several controls in one line. Semantic shape choices do not count as styling overrides.
- Refinement cycles come from the retained trial history and review, not from line count. Authoring minutes are **not measured**. No extrapolated minutes are presented as actual work time.

Counts measure visible source burden. They do not directly measure cognitive effort, maintainability or resilience. Those are explained in per-case prose, with awkward source excerpts. Any projected reduction in effort after a proposed feature is a hypothesis until that feature is implemented and evaluated.

## Geometry metrics and the historical audit

Native inspection reports geometric size, crossings, bends, route length and diagnostic counts. These describe the native drawing only; they cannot score faithfulness to an unrelated source image or scientific correctness. `check` exits successfully in the presence of warnings, so a successful validation is not a clean visual bill of health.

The supplied historical `scripts/diagram-audit.mjs` is also run unchanged. It discovers `v0` and `eN` filenames, so a temporary filename adapter maps v1→e1 and v2→e2. The exact mapping is recorded. Its heuristic defect index is supplemental and is not used as the headline quality score. Geometry boxes, shape boundaries, labels, notes and nonstandard editorial semantics can disagree with its heuristics. Particular false positives or blind spots are recorded in `effort-audit.md` and the report.

No raw image difference, exact pixel error, speed benchmark, usability success rate or statistical confidence interval is claimed. The originals and attempts cannot be fairly registered as pixel-identical images, and their different typography and antialiasing would further confound such a score.

## Facts, inferences and proposals

- **Observed:** original/reference pixels, native pixels, retained source, diagnostics, command results and source counts.
- **Source-grounded:** statements about supported syntax or renderer behavior, with repository paths and symbols.
- **Judgment/inference:** visual ratings, explanation of cognitive burden and identification of recurrent editorial needs.
- **Proposal:** future APIs, fixes, test additions and acceptance criteria. No proposed engine change is implemented or claimed to have passed.

The gap audit separates missing primitives, missing native-language exposure of existing model features, defaults, routing/layout behavior, awkward controls, guidance, font availability and deliberate stylistic differences. A malformed source or unwise grouping is labeled as an authoring problem. A common source motif is not automatically a feature recommendation: reproduction cost, semantic value and risk to the existing defaults all matter.
