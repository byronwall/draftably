# Editorial diagram corpus run

- Mission: collect editorial references, recreate each natively, and audit common gaps.
- Mode: Evaluation loop and Review.
- Completion: validated corpus ZIP, linked original Pro assets, summary, plan, and verified PR.
- Repository: https://github.com/byronwall/draftably
- Checkout: `/Users/byronwall/.codex/worktrees/c994/diagram-studio`.
- Branch: `codex/editorial-diagram-corpus`.
- Baseline: `f14d9b891adba75de6cc172b190017ea5a5ca091`.
- Prompt: [pro-prompt.md](pro-prompt.md).
- Input packet: `tmp/pro/editorial-diagram-corpus/source-packet.zip`.
- Pro conversation: https://chatgpt.com/c/6ae7ffd2-5bf0-83e9-abbf-5ab21e2395e4
- Account: Byron Wall Pro; Chrome profile `byroni.us` verified.
- Model: Pro, power 5 of 5 verified in the live selector.
- Submission time: 2026-11-01 22:13 EST (2026-11-02 03:13 UTC).
- Last check: 2026-11-01 23:11 EST (2026-11-02 04:11 UTC).
- Phase: local replay complete; review documents written; final checks and packaging in progress.
- Follow-up count: 0.
- Heartbeat ID: `complete-draftably-editorial-corpus` (active, hourly at minute 14).
- Blockers: none.
- Collected files: all 3,248 Pro result files under `assets/pro-results/2026-11-01/`.
- PR: pending.
- Final ZIP: `tmp/pro/editorial-diagram-corpus/draftably-editorial-corpus.zip` (planned).

## Submission evidence

The sent message and both completed attachments were visible in the conversation.
ChatGPT showed `ChatGPT is responding` and a Stop button after submission.
The live attachment names were `pro-prompt(20261102-031322).md` and `source-packet(9).zip`.
The packet contains 386 tracked files and two context files; ZIP integrity passed.
Its local file inventory is `tmp/pro/editorial-diagram-corpus/source-packet-files.txt`.
No application changes were sent or made.

The saved automation configuration names this conversation, checkout, branch, and run record.
It carries collection, local recreation, audit, ZIP, and PR duties. It stops on completion.

## Local preparation

Node 22.21.1 and pnpm 11.9.0 are available. Dependencies were absent at task start.
The first sandboxed install could not resolve the registry. The network-enabled retry passed.
Install output: `tmp/pro/editorial-diagram-corpus/install.log`.

The baseline CLI exported `examples/theme-proof.draft` as SVG successfully.
`pnpm shoot` produced its PNG with host access; the sandbox blocked Chromium launch.
The screenshot was inspected. Files: `tmp/pro/editorial-diagram-corpus/baseline.{svg,png}`.
The Pro submission screenshot is `tmp/pro/editorial-diagram-corpus/pro-submission.jpg`.

The first `pnpm check` passed typecheck, lint, and formatting. It failed in PNG/PDF and server
tests because of sandbox restrictions. The host-access retry passed the complete `pnpm check`:
480 unit tests, 195 named engine assertions, 55 broad engine cases, 55 sculpt checks,
320 parity comparisons, and the build. Exit code: 0. Do not repeat without a new reason.
Logs: `baseline-check.log` and `baseline-check-host.log` in the same working folder.

Pro finished after 49 minutes 59 seconds. It supplied 30 real references and 90 native attempts.
Its final response reports 360 successful check, inspect, SVG, and PNG commands.

## Collection and verification

The archive was downloaded through its Library preview in the same Chrome profile.
Local original: `tmp/pro/editorial-diagram-corpus/draftably-editorial-corpus-pro.zip`.
Size: 88,841,951 bytes. SHA-256:
`52edc61abd763457c0ec22e8276b3206b96b8d1a719912b9f62e0d2c68dfe949`.

Archive path checks, ZIP CRC, all 3,247 supplied manifest hashes, and all 30 reference hashes passed.
The remaining archive entry is the manifest itself. All 3,248 extracted files were copied byte for byte.
The input packet hash also matches Pro's recorded baseline packet hash.
The asset inventory is `tmp/pro/editorial-diagram-corpus/pro-archive-inventory.json`.

A locally authored replay script checked all 90 attempts with the unchanged checkout.
All 360 CLI/screenshot commands passed. All 90 geometry outputs and SVG files match Pro exactly.
PNG dimensions match; byte identity is not claimed. Downloaded programs were not executed.
Outputs: `tmp/pro/editorial-diagram-corpus/local-replay/` and `local-replay.log`.

All 30 full comparison sheets were inspected during integration. Selected details and local PNGs were also viewed.
The original Pro report, gap audit, plan, effort audit, metadata, and workstream findings were read.
Key code claims about label persistence, note colors, and group scope were verified locally.
All 456 local gallery references resolve. Independent counts reproduce the reported line and pin totals.
The summary narrows G12 to Explore before changing the fit diagnostic policy.

The final pre-push `pnpm check` is running. Log: `tmp/pro/editorial-diagram-corpus/integration-check.log`.

## Evaluation boundary

Target 30 references, at least 10 publishers and 10 pattern families. Each item gets default,
structural refinement, and closest native attempts. Runtime restrictions must stay explicit.
Codex must finish actual rendering and audit missing evidence before claiming completion.
Do not change the renderer or DSL during this evaluation.

Review reference licenses before publishing third-party images. Preserve all original Pro
results and attribution. Keep ZIPs and input packets in ignored storage.
