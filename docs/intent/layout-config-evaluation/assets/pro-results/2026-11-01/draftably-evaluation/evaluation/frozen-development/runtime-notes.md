# Execution and browser evidence

This file records actual setup findings and checks, not a proposed test plan. Baseline product sources remain unchanged.

## Source and runtime

- Immutable snapshot: `f14d9b891adba75de6cc172b190017ea5a5ca091`.
- Node: `v24.22.1`.
- Actual compiler, layout engines, router, font metrics, label placement, CLI SVG rendering, and browser UI were executable.
- Dependencies were installed from the supplied lockfile by the primary harness owner.
- Evaluation metrics consume native `Diagram`, `RouteLab.compute` results, production `routeInput`, `drawRoutes`, and `visibleRects`. No external layout implementation is substituted.

## Why the first screenshot and audit attempts failed

The initial Chromium extraction left `/tmp/chromium` as a zero-byte file. The package helper subsequently treated that existing path as extracted. Decompressing the original `@sparticuz/chromium@153.0.0` package's `chromium.br` via Node's Brotli stream produced a **209,022,176-byte** executable reporting **Chromium 153.0.8010.0**. Its linked shared libraries were present.

The restricted process environment then rejected Chromium's sandbox host operation. Launching the unchanged repository screenshot command outside that process sandbox succeeded. The PNG at `renders/access-production.png` was opened and inspected: the real exported typography, groups, connectors, arrowheads, halo breaks, and labels were present.

The historical audit had a related subprocess restriction: `execFileSync` returned an `EPERM` launch error with empty stdout and stderr. Its existing error wrapper converted this to an empty `error` string; a later truthiness guard reached stability calculations without geometry and crashed. This was an execution-environment failure, not evidence about diagram quality. The same unmodified audit completed when its subprocesses were allowed.

Initial failure logs are retained alongside successful run logs. No product script was edited to work around these issues.

## Actual historical audit

Command: unchanged `scripts/diagram-audit.mjs`, `--no-shots`, supplied historical development corpus.

- **45 of 45** source versions completed, across **15** historical base diagrams.
- **0** source failures in the completed run.
- **135** CLI subprocess invocations: `check`, geometry `inspect`, and SVG `inspect` for each source.
- Mean stock audit DI: **8.1088888889**; median: **5.4**.
- Stock audit hard-defect total: **0** (`node-overlap`, `edge-through-node`, `clipped`).
- Full results: `data/historical-audit/`, including the stock `summary.md` and an added `aggregate.json`.

These are historical baseline results. They are not the assignment's new heldout evaluation, and they do not include a claim that every renderer/router defect is captured by the stock audit.

## Actual browser proofs

The supplied repository scripts were run once after the environment was fixed. They operate on their own temporary copies of shipped examples. Their actions change only temporary fixtures.

| Unchanged proof | Result | Scope of evidence |
| --- | --- | --- |
| `scripts/prove-layout-tools.mjs` | **15/15 checks passed** | Compare recipe application, Improve/save, timeline step/save, brush/save, external addition, distant-region preservation, restart and CLI/browser geometry agreement |
| `scripts/prove-file-session.mjs` | **22/23 checks passed** | Resize, drag, pin, relative refinement, camera nonmutation, source undo/redo, external addition, invalid source, stale-save refusal, file switching, restart and reconnection |

The file proof's one failure was **“back navigation actually restores a cached page.”** The fallback executable is a headless Chromium build, substituted for the expected Playwright browser revision. The result therefore does **not** validate a full stock Chromium back/forward-cache lifecycle. The subsequent reconnect/catch-up and forward-navigation assertions passed. It remains unresolved whether the failed cache assertion is specific to this fallback/environment; no product defect is claimed from it.

Logs are in `data/logs/prove-layout-tools.log` and `data/logs/prove-file-session.log`. Requested screenshots, including failure evidence, were copied to `renders/browser-proofs/`. Final temporary source states were copied to `data/browser-proofs/`.

These proofs establish that the named real UI flows ran on the baseline. They do not measure the proposed editing UI's usability, nor do they replace corpus-wide edit-sequence testing.

## Replay run sheet

Normal installation of the lockfile-selected Playwright browser is preferred on another machine. The fallback below records the actual alternative used here. The screenshot command remains the repository's tool.

```bash
# Run from the extracted baseline directory.
# Install the immutable package graph, then build without changing product sources.
pnpm install --frozen-lockfile
node node_modules/vite/bin/vite.js build --logLevel error

# Prefer a normal matching browser if its download is available.
pnpm exec playwright-core install chromium

# Actual fallback in this environment, when the normal browser download was unavailable.
# Run from the evaluation bundle's parent and pass explicit paths to the setup helper.
npm install --prefix /tmp/draftably-evaluation-browser @sparticuz/chromium@153.0.0
node deliverables/evaluation/setup-browser.mjs \
  /tmp/draftably-evaluation-browser \
  /tmp/draftably-evaluation-browsers \
  baseline
export PLAYWRIGHT_BROWSERS_PATH=/tmp/draftably-evaluation-browsers

# Actual repository screenshot tool. The SVG uses the production renderer.
node baseline/scripts/shoot.mjs \
  deliverables/renders/access-production.svg \
  deliverables/renders/access-production.png

# Historical audit: the original source corpus, without new layout choices.
node baseline/scripts/diagram-audit.mjs \
  baseline/docs/intent/diagram-quality/corpus \
  deliverables/data/historical-audit --no-shots

# Actual browser flows; each proof creates its own temporary source copy.
node baseline/scripts/prove-layout-tools.mjs
node baseline/scripts/prove-file-session.mjs
```

This execution environment required authorization for the local browser listener/process and child CLI subprocesses outside its restricted process sandbox. The source code, flags in product scripts, and corpus were not changed. On an ordinary development machine that tool-level requirement does not apply.

## Metric calibration and changes before broad measurement

The calibration package has **20 fixtures**: 18 in `metric-calibration.mjs`, plus two visibility checks in `metric-visibility-calibration.mjs`. Exact hand-authored calibration geometry is labelled analytical; it is never counted as shipped-layout output. The three actual-router cases in a clean calibration invocation call the shipped `RouteLab` directly.

Calibration exposed and corrected measurement assumptions before broad outcome selection:

1. Actual router terminal offsets clamp at 10px, while a separate model helper uses 12px. The verifier must follow the actual raw-router terminal geometry.
2. Pill ports have curved-end insets; a rectangle-only verifier falsely reports disconnection.
3. Production visible rectangles must override simplified collapsed-frame dimensions.
4. Soft and frameless group bounding spans are not solid obstacles or hard overlap objects.
5. A hidden descendant's visible collapsed ancestor is its displayed edge endpoint.

The production sanity set covered unchanged web-app architecture, sequence, cells, and pipeline examples. It found one actual `blocked` route (`e8`) in `order-pipeline`; that flag is kept as a hard router failure. The stock historical audit does not treat this example or flag as part of its hard-defect count.

The final metrics distinguish raw counts from per-edge rates, zero-edge cases, hard layout/routing gates, legacy-normalized DI, literal per-ten-edge DI, three weighting profiles, and production label availability. The scoring implementation is a documented diagnostic subset, not a claim of bit-for-bit equality with all stock audit metrics.
