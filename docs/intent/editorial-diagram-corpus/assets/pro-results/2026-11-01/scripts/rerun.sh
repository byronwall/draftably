#!/usr/bin/env bash
# Run from any directory. First argument is an unchanged checkout/extracted packet at the baseline.
set -euo pipefail
draftably_root="$(cd "${1:?Pass the path to the immutable baseline checkout}" && pwd)"
corpus_root="$(cd "$(dirname "$0")/.." && pwd)"

# Install exactly the supplied dependency lockfile. Node must be >=22.21.
cd "$draftably_root"
pnpm install --frozen-lockfile
pnpm exec playwright-core install chromium
export DRAFTABLY_NO_UPDATE_CHECK=1

# Every stage runs check, JSON inspection with metrics, SVG export, then the original shoot script.
# Outputs stay in the study directory. Existing trial logs are retained in timestamped folders.
for case_dir in "$corpus_root"/corpus/*; do
  [ -d "$case_dir" ] || continue
  python3 "$corpus_root/scripts/run-trials.py" "$case_dir" --baseline "$draftably_root" --sheet
done

# Full comparisons retain all content; selected details retain their recorded pixel coordinates.
python3 "$corpus_root/scripts/run-sheets.py" --baseline "$draftably_root"
python3 "$corpus_root/scripts/run-details.py" --baseline "$draftably_root"

# Supplemental historical geometry audit; explicit filename mapping is preserved with its results.
python3 "$corpus_root/scripts/run-baseline-audit.py" --baseline "$draftably_root"
python3 "$corpus_root/scripts/aggregate.py"
python3 "$corpus_root/scripts/build-index.py"
python3 "$corpus_root/scripts/verify-corpus.py" --baseline "$draftably_root"
