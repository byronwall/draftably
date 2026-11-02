#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
run_stage() { node evaluation/run.mjs "evaluation/tasks/$1.json" "${2:-3}"; }
run_stage prepare-routing
run_stage settings-routing
run_stage interactions-routing
run_stage screen-development
run_stage tuning-development
run_stage selected-presets-development
run_stage documented-default-development
run_stage settings-layout
run_stage interactions-layout
run_stage settings-warm
run_stage network-direction
python3 evaluation/analyze-portfolio.py --phase edit-predictions --split development
python3 evaluation/build-edit-tasks.py --policies
run_stage edits-current-development
run_stage edits-states-development
run_stage edits-warm-development
run_stage edits-policies-development
run_stage joint-development
run_stage identity-development
run_stage sanity
run_stage timing-development 1
run_stage layout-control-ablation
run_stage warm-targeted
run_stage optional-scale
# The delivered policy is already frozen; no fitting occurs after the following boundary.
run_stage screen-heldout
run_stage documented-default-heldout
run_stage selected-presets-heldout
python3 evaluation/analyze-portfolio.py --phase edit-predictions --split heldout
python3 evaluation/build-edit-tasks.py --policies
run_stage edits-current-heldout
run_stage edits-states-heldout
run_stage edits-warm-heldout
run_stage edits-policies-heldout
run_stage routing-current-heldout
run_stage joint-heldout
node evaluation/analyze-validation.mjs
python3 evaluation/analyze-controls.py
python3 evaluation/layout-control-ablation.py --phase analyze
python3 evaluation/analyze-contexts.py
python3 evaluation/analyze-edits.py --split development
python3 evaluation/analyze-portfolio.py --phase heldout
python3 evaluation/analyze-dependencies.py --split heldout
python3 evaluation/analyze-family-tails.py --split development
python3 evaluation/analyze-family-tails.py --split heldout
python3 evaluation/analyze-edits.py --split heldout --allow-heldout-after-freeze
python3 evaluation/analyze-heldout-routing.py --analyze --allow-heldout-after-freeze
python3 evaluation/plot-portfolio.py --split heldout
node evaluation/audit-result-archives.mjs --heldout
node evaluation/audit-cell-access.mjs
node evaluation/audit-cell-access.mjs --heldout
python3 evaluation/summarize-execution.py
