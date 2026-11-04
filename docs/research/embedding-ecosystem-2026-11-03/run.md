# Embedding ecosystem research run

- Mission: design Markdown and web embedding with Mermaid-like integration ease and reach.
- Mode: Design, with distribution strategy.
- Completion: collect every Pro artifact, review decisive claims, write a plan and summary, open and verify a PR.
- Repository: https://github.com/byronwall/draftably
- Source commit: `ed4eff3181ded0c501c35ae18ef6aed9c62de8c5`.
- Branch: `codex/embedding-ecosystem-research`.
- Prompt: [prompt.md](prompt.md).
- Input packet: ignored `tmp/pro/embedding-ecosystem/source-packet.zip`.
- Phase: Pro research running. Sent message, both attachments, and Stop control verified.
- Pro conversation: https://chatgpt.com/c/6aeaa852-3e08-83ea-997e-ca7c5ac0206d
- Model: Pro, power 5 of 5, verified in Chrome model selector.
- Chrome profile: `byroni.us`; signed-in ChatGPT history visible.
- Submitted: 2026-11-04, between 03:36 and 03:37 UTC (November 3, 22:36–22:37 EST).
- First planned check: approximately 04:37 UTC. Continue useful repository work in this task.
- Early check at approximately 03:45 UTC: still running; source access and active web research visible. No follow-up sent.
- Displayed attachments: `prompt(10).md` and `source-packet(10).zip`.
- Packet inventory: 355 tracked files plus the prompt and inventory; 1,091,300 bytes compressed.
- Follow-up count: 0.
- Heartbeat: none. App instructions require checking this job in the current task instead of creating a monitoring automation.
- Collected files: none yet.
- Blockers: none.
- PR: pending.

## Repository checks

- [Repository review](repository-review.md) records current seams and targeted CLI probes.
- `pnpm check` passed with approved local server and Chrome access on November 4 at 03:43 UTC.
- Unit tests: 76 files, 575 tests passed.
- Engine regression and sculpt suites passed; parity reported 320 comparisons across 13 fixtures and 11 algorithms.
- Typecheck, lint, formatting, and production build passed.
- The restricted sandbox attempt failed on loopback listeners and Chrome export access. It did not reveal a code regression.
- Logs: ignored `tmp/pro/embedding-ecosystem/check.log` and `check-unsandboxed.log`.
- Repeated CLI SVG output for `examples/checkout.draft` matched byte for byte.
- `pnpm changeset:check origin/main` and `pnpm skill:check origin/main` passed. Documentation changes need neither a changeset nor a language-skill update.
