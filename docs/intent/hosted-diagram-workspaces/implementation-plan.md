# Deliver hosted workspaces in four proofs

## Plan at a glance

Prove the retrieval and arrangement workflow with disposable data first. Then introduce account-owned storage and prove the history boundary. Expose the same operations to MCP and REST before connecting the gallery. This order allows a headless client to recover real work while the visual surface is being built.

## Implementation strategy

The hosted Worker in `packages/service/src/` already resolves API keys and MCP OAuth to accounts. Put ownership, capture, revision checks and placement ordering behind a shared service called from both transports. Keep the filesystem workspace in `src/server/workspace.ts` as a local file browser. Use the account page as the signed-in entry point. Treat existing public share IDs and render cache keys as separate from private document identity.

### Proposed contract

| User operation | REST and MCP equivalents |
| --- | --- |
| Find diagrams, fetch latest source | `GET /v1/diagrams[/:id]` · `list_diagrams`, `get_diagram` |
| Save or revise | `POST /v1/diagrams`, `PATCH /v1/diagrams/:id` · `save_diagram` with optional ID and expected revision |
| Create, discover, reopen | `POST /v1/workspaces`, `GET /v1/workspaces[/:id]` · `create_workspace`, `list_workspaces`, `get_workspace` |
| Add, remove or reorder cards | `PATCH /v1/workspaces/:id` · `update_workspace` with expected version and ordered diagram IDs |
| Delete a workspace | `DELETE /v1/workspaces/:id` · `delete_workspace` |

List results carry opaque cursors, titles, IDs and update times. A workspace read returns ordered cards plus its version. A fresh session can rediscover it by title and disambiguate duplicate names by ID. Never require session-global “current workspace” state.

## Milestone 1: Reopen a set from another client

Build a local fixture with two accounts, three checkout diagrams, two workspaces and an unrelated diagram of the same title. Use an in-memory repository and a small card view. Record an initial gallery, a reordered workspace and the mobile reading order. Proposed focused command after adding the fixture: `node --test tests/hosted-workspace-contract.test.mjs`.

### Desired end state

A reviewer completes the first proof in the [shape](shape-brief.md). A failing placement exercise changes the proposed placement contract before a migration lands.

## Milestone 2: Recover private diagrams across sessions

Add an additive D1 migration beside `packages/service/migrations/0004_share_notes.sql`. Store account, stable ID, source language, source, current revision, title and timestamps on diagrams. Store account and version on workspaces. Use a unique workspace/diagram pair, account-qualified references and position on placements. Page by update time plus ID. Apply membership replacement and version increment atomically.

Run the fixture contract against disposable local D1. Exercise stale writers, two accounts with identical source, a failed placement write and a replayed create request. Scope idempotency keys to account and operation. An untargeted render of identical source should reuse that account’s captured item unless an explicit new document was requested. Use a recoverable write record keyed to the render operation so a retry after a billing or persistence failure can complete without duplicate billing or a duplicate entry.

Backfill signed shares by recorded account with an idempotent provenance mapping. Compare eligible, imported and skipped counts across two passes. Existing shares deduplicate by source and language before recording another account. A later caller may therefore have no recoverable row. Offer explicit import from a supplied link or source. Label imports with their provenance and retain the original public links.

### Desired end state

With capture enabled in a test account, a cached render and a newly drawn item both appear. Backfill can stop and resume. A second account cannot read either private source or thumbnail by guessing its ID.

## Milestone 3: Continue the same work through REST and MCP

Wire the proposed operations into `api.ts`, `index.ts` and `mcp.ts`. Extend existing render results additively. Test authenticated share creation as another capture path, including a share already created by a different account. Preserve existing billing, public share URLs and validate-only behavior. Check API-key and OAuth sessions against the same fixtures.

### Desired end state

Create a workspace through REST, add diagrams through MCP, then reopen through REST. Lists agree across pages. Stale updates return a conflict with the current version. Existing render consumers can still read their image response.

## Milestone 4: Browse everything and roll out capture

Link All diagrams from the signed-in account. Add lazy private thumbnails, title search, keyboard ordering, multi-select placement, coverage messaging and workspace deep links. Check desktop and phone with empty, mixed-size and multi-page galleries. Test a signed-out deep link, a failed thumbnail and a deleted workspace.

Use an opt-in test account first. Track capture failures, list latency, backfill coverage and private-preview failures without logging source. Verify one staging flow with the deployed Worker, D1 binding, OAuth and the account session. Disable new capture and writes independently while retaining read access and durable rows. Publish the accepted contract in `packages/service/README.md` and `site/docs/pages/mcp.md`.

### Desired end state

A person can open the gallery from a fresh sign-in, recover an older attributable diagram, arrange it with a new one, and reopen the set from an agent. The gallery explains where earlier coverage ends.

## Below the cut line

Team membership, public workspace publishing, revision browsing, connectors between cards, and automatic desktop sync. Revisit spatial layout if the placement proof demands it.

## Open decisions

1. **What should enter history automatically?** A. Successful signed-in renders and shares, with an explicit transient option (recommended). B. Explicit saves only. A better matches “ever made” and requires a clearly disclosed retention policy. B keeps agent experiments out of the gallery and loses unsaved work.
2. **What relationship should placement express?** A. Reading order in a responsive grid (recommended). B. Fixed rows and columns. C. Free coordinates on a pan-and-zoom canvas. Test with a real overview and two details before committing to B or C.

Other requirements or examples can be added as free text.
