# Replaying the Draftably evaluation

This is an executed experiment against **f14d9b891adba75de6cc172b190017ea5a5ca091**. The supplied source packet is included under `baseline-packet/`; the product implementation was not changed. Raw results, failures, partial layout checkpoints, frozen decisions, blinded judgments and source files remain in their relative paths.

## Environment

The original run used Node24.22.1, pnpm11.25.0, Python3.12.14 and the packet's frozen pnpm lockfile. The packet declares pnpm11.9.0. Exact environment details are in `data/environment.json`. Analysis uses Python's standard library plus NumPy and Matplotlib for figures. The shipped algorithms remain JavaScript; Python does not substitute a layout implementation.

The renderer and compiler require the baseline dependencies. Browser PNGs and real UI proofs additionally need Chromium. Read `runtime-notes.md` for the actual fallback browser and command paths. Normal Playwright CDN downloads failed in the original environment; the successful fallback used a temporary `@sparticuz/chromium`153 package and left product source unchanged.

## Completed run and accounting

All **8,203 registered trials** have a canonical terminal result: **7,731 completed, 452 timed out and 20 failed**. There are no unstarted or unplanned registered IDs. The 8,210 raw terminal rows also preserve seven overlapping duplicate attempts; the first outcome remains canonical. These totals comprise 6,714 development and 1,489 heldout trials. Completed execution does not imply a hard-valid or acceptable drawing. Detailed stage tables, hashes and missing-counter qualifications are in `data/execution-summary.json` and `data/execution-summary.csv`.

The 63 frozen visual judgments comprise 36 development pairs reviewed before policy freeze, three post-freeze development witness pairs, and 24 fresh heldout pairs. The later development supplement did not alter selection or metrics. These are one expert model's judgments, not an independent human study.

## Inspect and resume the delivered run

From this bundle's root:

```bash
python3 evaluation/unpack-baseline.py
cd ../baseline
pnpm install --frozen-lockfile
cd ../draftably-evaluation
node evaluation/run.mjs evaluation/tasks/screen-development.json 3
```

Use the actual extracted evaluation folder name in the last `cd`. `unpack-baseline.py` defaults to a sibling `baseline/` directory because all original harness paths were rooted that way. It verifies the source ZIP SHA-256 and every original file. A different, nonempty source tree is not overwritten. `DRAFTABLY_BASELINE` can override the adapter's path, but the standalone baseline-calibration scripts should use the sibling layout documented here.

The runner skips **every existing terminal trial ID**, including failed and timed-out trials. It does not retry a poor result to improve coverage. It has a15-second per-trial timeout in the task definitions and an assignment-wide stop for new trials after5.5hours, reserving30minutes for analysis/package work. The delivered original clock remains historical; a replay after that deadline must use a new run directory below.

Each task JSON supplies exact source path, settings, direction, history, edit, reference geometry and scope. Trials use persistent worker threads, the actual Vite-loaded compiler and shipped engines, the production route input, production label placement and SVG renderer. Identical successful routing inputs can reuse a hash-keyed cache. Timing trials explicitly bypass that cache and use one worker.

## Fresh reproduction

Do not erase the delivered raw results. Create an empty reproduction directory:

```bash
python3 evaluation/prepare-replay.py ../replay/draftably-evaluation
cd ../replay/draftably-evaluation
python3 evaluation/unpack-baseline.py
cd ../baseline
pnpm install --frozen-lockfile
cd ../draftably-evaluation
bash evaluation/replay-all.sh
```

`prepare-replay.py` copies the immutable corpus, harness, task definitions and frozen policies, then starts a separately identified six-hour reproduction clock. It does not overwrite original results or change the heldout policies. The replay script executes fixed tasks; it does not fit a new selector on heldout outcomes. Hardware-dependent timeouts can differ. Report those differences explicitly instead of replacing failed original observations.

For a single stage, run `node evaluation/run.mjs evaluation/tasks/<stage>.json <workers>`. Use at most four simultaneous workers in total. Run `timing-development` with one worker and no other algorithm batch. `run-stages.mjs --after stageA,stageB --workers 3 stageC stageD` provides dependency queues without starting a separate CLI for every trial.

## Analysis commands

```bash
python3 evaluation/portfolio-selfcheck.py
node evaluation/analyze-validation.mjs
python3 evaluation/analyze-controls.py
python3 evaluation/layout-control-ablation.py --phase analyze
python3 evaluation/analyze-contexts.py
python3 evaluation/analyze-edits.py --split development
python3 evaluation/analyze-portfolio.py --phase heldout
python3 evaluation/analyze-dependencies.py --split heldout
python3 evaluation/report-heldout-portfolio.py
python3 evaluation/analyze-family-tails.py --split development
python3 evaluation/analyze-family-tails.py --split heldout
python3 evaluation/analyze-edits.py --split heldout --allow-heldout-after-freeze
python3 evaluation/analyze-heldout-routing.py --analyze --allow-heldout-after-freeze
python3 evaluation/summarize-heldout-routing-decision.py
python3 evaluation/plot-portfolio.py --split heldout
MPLCONFIGDIR=/tmp/draftably-matplotlib python3 evaluation/plot-decision.py
node evaluation/audit-result-archives.mjs --heldout
node evaluation/audit-cell-access.mjs
node evaluation/audit-cell-access.mjs --heldout
python3 evaluation/summarize-execution.py
node evaluation/analyze-visual-final.mjs
node evaluation/final-geometry-integrity.mjs
python3 evaluation/final-accounting-audit.py
```

These commands read saved outcomes; they do not silently execute extra layout/routing algorithms. The final visual aggregation requires all four original judgment files and their keys. Run it against this delivered evidence, or only after a new reviewer has frozen all required judgments for a reproduction. `prepare-replay.py` copies the selected pair specifications, but intentionally does not copy original judgments into a new run as new review evidence.

The final accounting audit also checks original sealed development and inventory evidence; it is intended for this delivered run. A newly measured reproduction can legitimately have different hardware timings and outcomes and should report those differences, rather than require agreement with the original result hashes. Use the execution summary, archive audits and analysis outputs to assess that new run. `build-final-inventory.py` recreates the delivered final inventory from its included source/development annotations and completed heldout evidence; it makes no geometry calls.

Three final presentation helpers—`report-heldout-portfolio.py`, `summarize-heldout-routing-decision.py`, and `plot-decision.py`—contain the completed original run's narrative and fixed-count figure. They verify the exact five source/routing input-stream hashes through `original_report_inputs.py` before producing those reports. They deliberately refuse different freshly measured raw results, including changed timing records. The fresh `replay-all.sh` therefore runs the general frozen-policy analyses, routing findings, family summaries and portfolio charts, but does not run those three original-run presentation helpers. Assess a new run from its newly computed tables instead of carrying over the original narrative. This separation changes no policy, metric or original result.

The independent edit/routing review's actually executed arithmetic is preserved under `evaluation/reviews/`, with a separate portability launcher and explicit provenance. See its `README.md` for commands, which checks write review metadata, and the distinction between executed checks and source inspection.

`draw-workflow.py` creates the exact experimental-workflow SVG. `render-editing-workflow.py` creates the proposed editing-dispatch diagram; its optional PNG export uses Inkscape. Charts and design diagrams are distinct from production-rendered graph evidence. The optional `validate-inventory-csv.mjs` read-only audit uses `@oai/artifact-tool` from the primary artifact runtime; this dependency is not needed to run the engines or statistical analysis. Ordinary CSV readers can inspect all 175 rows without it.

The final stage accounting is in `data/execution-summary.json` and `report.md`. Additional targeted-audit analyses describe their CLI at the top of their corresponding files. The file-source port-checkbox probe is a separate source-applicability experiment with two actual router calls; it is not silently included in the registered main-trial count.

The original development fitting order was: fixed metric/corpus/settings freeze; engine/recipe and sensitivity screening; four presets per engine on twelve fixed development cases; selected presets across the remaining development cases; exact subset and dependency/configuration cover; edit/joint trials and blinded development review; then policy freeze and a single heldout evaluation. All divergences are in `data/protocol-addenda.jsonl` and `evaluation-method.md`.

Heldout routing uses 72 current-position reroutes and 216 frozen layout-by-route combinations. It applies the sealed choices without searching for new ones. Route-only validity is the primary observation. A compile-time-plus-route-operation sensitivity is a derived serial estimate; it is not an observed end-to-end cold invocation. Partial layout references and inherited source-intent gates remain explicit.

## Result integrity and partial outcomes

The first terminal result for an ID is canonical. Later accidental overlapping attempts remain in raw logs and cannot rescue coverage. Complete artifacts live under `data/geometry/`; unfinished routing retains a separately marked `data/layout-checkpoints/` artifact. A layout checkpoint is never treated as a completed diagram with invented routes.

Nine early terminal summary rows were reconstructed from eight existing complete geometry archives and one logged timeout/checkpoint. Their original JSONL and reconstruction proof are under `data/recovery/`; unrecoverable wall/routing/label timings and cache status remain null. Later batches write immutable per-attempt JSON before appending the summary, and exact immutable records can restore a missing summary row without losing any field or rerunning an algorithm. Read every recovery record for the final total; do not infer that every reconstructed row lost timings.

`recover-results.mjs <stage> data/logs/<console>.log` only reconciles an already completed batch. It prefers exact immutable terminal records, otherwise complete archived metrics or a logged timeout. It executes no engine/router and refuses a batch without a completion log. Missing information is retained as missing, not guessed.

All 61 files captured by the original development seal are preserved byte-for-byte in `evaluation/frozen-development/`. Final reporting and replay integration changed a few current copies; their original versions and exact hashes remain available. Frozen scoring, selection, source transformation, adapter and worker code did not change. The E analyzer's broad reference-catalog scan incidentally read the completed routing stream and a partial joint snapshot after freeze. The disclosed audit found no E reference to those streams and no effect on E estimates; see `data/analysis/edits-heldout-reference-read-scope-deviation.json`.

## Figures and blinded judgments

`render-pairs.mjs data/visual-pairs-<phase>.json` recreates production SVG pair panels and invokes the unchanged baseline `scripts/shoot.mjs`. Set `PLAYWRIGHT_BROWSERS_PATH` as described in `runtime-notes.md`. The public manifest intentionally omits candidate identities. The separate key and selection file disclose them only after the judge has frozen judgments.

Visual judgments are evidence records, not deterministic test outputs. Do not regenerate them and claim to reproduce the same independent review. The original model review is already included, with PNG hashes, per-pair confidence, severity and defect observations. This is one expert model assessment; no human usability study was run.

## What this kit does not claim

- Synthetic family weights are declared assumptions, not market prevalence.
- A best-per-case oracle is not a deployable pre-layout selector.
- Equal soft scores do not prove visual equality; node/group boxes, ports and route point sequences are also compared.
- Frozen hard validity is the documented measured subset. Reading-direction/fit precedence and cell-access obstacle audits are reported separately where coverage is incomplete.
- Cloud timings do not establish a200ms desktop interaction budget.
- The supplied packet omits site/research/release files needed by portions of the broad repository checks. Those failures and the browser bfcache limitation remain in the logs.
