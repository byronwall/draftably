# Independent rerun-helper review

## Concrete issue observed during final review

The initial study helpers `run-trials.py`, `run-details.py` and `run-sheets.py` recorded child command exit codes but returned a successful Python process exit even when a child command failed. `rerun.sh` used `set -e`, so that shell setting could not detect those recorded failures. The previous SVG/PNG could remain in place when a later command failed, making file existence an unsafe completion check.

`aggregate.py` already read actual child exit codes and source hashes when assigning validated/rendered status. `verify-corpus.py` also checked every required child exit, current source hashes, v0 freeze integrity, original hashes, comparison input hashes, detail selections and image validity, and returned nonzero for failures. The missing connection was that the initial `rerun.sh` ended after aggregation rather than requiring this integrity gate.

A related packaging issue was that the initial `package-study.py` trusted a previously written `logs/final-verification.json`. If artifacts changed after that record, its old passed flag was not sufficient evidence for a new archive.

## Disposition

The issue was reported to the root integrator without concurrently editing the shared scripts. The integrator took ownership of failure propagation, adding the build-index and verification gate to the rerun workflow, and requiring fresh baseline verification at packaging. It is a helper hardening finding resolved during delivery, not an unexecuted native-render blocker or a Draftably engine defect. The delivered helper source was re-inspected after those changes: `run-trials.py` now returns nonzero for recorded failures and refuses a changed frozen v0; detail and sheet runners return nonzero for incomplete results; `rerun.sh` invokes index generation and `verify-corpus.py`; packaging requires `--baseline` and runs that verifier immediately with `check=True`. This review verified the code paths, not a new fault-injection test. The final delivered scripts and final verification record are the operative evidence.

## Safe interpretation retained

Successful native execution still does not imply visual quality. Conversely, preserved failed trials do not make the current retained stages incomplete when their own hashes and command records prove success. Rerun comparisons should use a copy of the delivered corpus so that the baseline images and audits remain available beside changed-engine results. Saved detail coordinates should be reviewed after geometry changes.

## Subsequent executed helper fault checks

After the source review, the integrator ran five isolated synthetic fault checks using a fake pnpm that exits 7. Child stage failures, missing stages, changed frozen v0, comparison failures and detail-crop failures all returned nonzero wrapper status; unsuccessful v0 was not frozen. See `logs/helper-failure-tests.json` at the archive root and `scripts/test-helper-failures.py`. These checks did not render native diagrams, change the application or touch the actual corpus.
