# Deep usability audit run

- Mission: review the published landing page, docs, Playground, Editor, and their coherence through real browser use.
- Mode: Review; full Pro process. Complete when original results, checked findings, dispositions, repair plan, and verified review PR exist.
- Repository: https://github.com/byronwall/draftably
- Checkout: `/Users/byronwall/.codex/worktrees/531b/diagram-studio`
- Branch: `codex/deep-usability-audit-2026-10-29` (created from detached HEAD; initially clean).
- Baseline: `ca96d3babd05041aaa206509090d023b02b61b5b`.
- Prompt: [pro-prompt.md](pro-prompt.md).
- Uploaded attachment: `pro-prompt(20261030-013557).md`; upload complete before send.
- Conversation: https://chatgpt.com/c/6ae3f47c-fdec-83e9-b04d-cd8e9c170f2c
- Model: Pro, effort 5 of 5, checked in live model menu.
- Chrome: extension browser 2, profile `byroni.us`.
- Submitted: 2026-10-29 about 21:36 EDT (2026-10-30 01:36 UTC).
- Next check: about 2026-10-29 22:37 EDT.
- Phase: Pro processing; initial independent audit saved with 13 findings.
- Follow-ups: 0.
- Heartbeat: `complete-draftably-deep-usability-audit`, ACTIVE, hourly at minute 37, attached to this chat.
- Evidence working folder: `tmp/evals/website-experience-audit/2026-10-29/` (ignored).
- Collected Pro results: none yet.
- PR: pending final integration.

## Continuation rules

Read this record and live state before acting. Do not resubmit. Use the authorized workflow for collection, original artifact preservation, synthesis, validation, commits, push, PR, and heartbeat shutdown. No product implementation, merge, or deployment is requested.

Byron also requested GitHub issues for existing audit findings, with no duplicates. All 13 independent findings are now tracked in [issues.md](issues.md): eight new issues (#257–#264), four exact existing matches, and the related source-recovery issue #248 with added evidence. Check this register and current open/closed issues before filing later Pro findings. Do not recreate already tracked work.

The existing browser-saved editor diagram is personal state. Do not modify it. An audit source named `Usability audit` was created in Playground and opened in the Editor as an unsaved scratch example. Use that disposable example for edit tests.

## Independent observations so far

- At 1440×900, clicking the landing primary `Open the editor` changed the URL to `/draftably/app/` but kept the landing UI. This repeated the same result from the Docs header Editor link. Reloading `/app/` loaded the real editor. Screenshots: `editor-link-shows-landing.jpg`, `landing-desktop.jpg`.
- The real editor initially restored an existing browser-saved `Automatic ports — review flow` diagram. It was inspected without changes.
- Playground source entry successfully compiled a two-node `Usability audit` diagram. Its `Open in the editor` button performed a full navigation and correctly opened `/app/#s=...` with a scratch-copy banner.
- Docs have 20 visible topics in five groups. Get started begins with Node/CLI installation despite browser-only use being available.

## Browser handles at initial turn

Site user tab: `2011000539`. Pro agent tab: `2011000542`. Rebind from fresh inventory on later turns. Chrome's actual viewport was 1512×697; its override did not work. An isolated in-app browser successfully tested 390×844, 768×900, and 1440×900. Both viewport overrides were reset.

## Initial audit handoff

- Read [browser-audit.md](browser-audit.md) before collecting Pro results. It includes scores, journeys, 13 stable finding IDs, source checks, screenshots, and coverage limits.
- Three P1 findings: client navigation to Editor shows Landing; narrow Playground source collapses to 9px; edited landing source links to the stock example.
- More browser evidence: example-switch fitting clips diagrams; documentation expansion leaves keyboard focus behind its overlay; bare Playground navigation resets source, but Back can restore the encoded-source history entry.
- Docs-to-Playground edited-source transfer succeeded. Playground-to-Editor source transfer succeeded. Inspector edits, connected creation, undo/redo, and Compare Apply/Undo succeeded on scratch diagrams.
- Downloaded `/Users/byronwall/Downloads/docs-audit.svg` is disposable audit output, not a Pro artifact. Its existence was verified after the browser download-event hook timed out.
- Do not turn a synthetic locator fill issue into a product defect. Inspector fill did not commit; ordinary native typing and Tab did commit correctly.
- Dependencies installed from the locked pnpm file after sandbox network access failed. No dependency files changed.
- Checkpoint validation: typecheck, lint, format, and 58 test files passed under `pnpm check:fast`. Three test files failed because sandbox restrictions blocked local listeners and browser export. Their bounded rerun outside the sandbox passed: `pnpm exec vitest run tests/embed.test.ts tests/open-port.test.ts tests/workspace.test.ts` (13/13 tests). `git diff --check` passed. Full `pnpm check` remains required before the final push.
- Keep generated screenshots in ignored tmp and attach them with gh. Preserve actual Pro originals in the skill's committed asset location later.
