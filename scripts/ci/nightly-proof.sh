#!/usr/bin/env bash
# CI passes checked-in commands from its matrix, never PR text.
set -uo pipefail
mkdir -p tmp/nightly
run_suite() {
  bash -eo pipefail -c "$PROOF_COMMAND" 2>&1 | tee "tmp/nightly/attempt-$1.log"
}
{
  echo '### Reproduce this suite'
  echo 'Start from the checked-out commit with Node 24 and the locked pnpm dependencies.'
  echo '~~~sh'
  echo "git checkout --detach $GITHUB_SHA"
  echo 'pnpm install --frozen-lockfile'
  if [[ -n ${PROOF_BROWSERS:-} ]]; then echo "pnpm exec playwright-core install --with-deps $PROOF_BROWSERS"; fi
  if [[ -n ${PROOF_BUILD:-} ]]; then echo "$PROOF_BUILD"; fi
  if [[ -n ${PROOF_HALF:-} ]]; then echo "export PROOF_HALF=$PROOF_HALF"; fi
  echo "$PROOF_COMMAND"
  echo '~~~'
} >> "$GITHUB_STEP_SUMMARY"
if run_suite 1; then exit 0; fi
echo 'First execution failed. Repeating this suite once on the same checkout.' >> "$GITHUB_STEP_SUMMARY"
if run_suite 2; then
  echo 'Passed on retry. Inspect both logs for an intermittent failure.' >> "$GITHUB_STEP_SUMMARY"
else
  echo 'Failed twice. Compare the two logs and the captured fixtures.' >> "$GITHUB_STEP_SUMMARY"
fi
# Preserve the first failure and the last healthy baseline.
exit 1
