---
title: 'Diagram DSL and shared file editing — implementation plan'
slug: 'diagram-dsl'
phase: plan
status: current
last_updated: '2026-10-14'
---

# Diagram DSL and shared file editing — implementation plan

## Plan at a glance

Build from the source outward. First make the `.meld` language, formatter and compiler a pure TypeScript module that runs the same way in Node and the browser, and expose it through a headless CLI. Then let the current editor display a watched file, read-only. Only then route committed editor transactions back into source. Stability anchors, relaxation feedback and the end-to-end proof come last, once a real drag can reach the file.

Each step is one stacked pull request and leaves a working system. After step 1, an agent can check, format and inspect diagrams. After step 2, Byron can watch an agent's edits. After step 3, viewer edits are saved. Step 4 makes saved refinements hold up when the agent adds content.

The plan rebases the shape onto the current typed SolidJS app (`cleanup/normal-app`), not the older JavaScript editor the shape inspected. The seams are the same: `commit` in `src/state/document.ts` is the single committed-transaction path, and `restoreDocument` already replaces the document without recording history.

## Implementation strategy

- **First proof:** a nested `.meld` file opened through the CLI; drag, pin and resize in the browser; an external sibling added; then a restart. Node and browser geometry must match.
- **Primary seam:** `src/dsl/` — parse/format/compile/project, plus a translator from a committed editor diff to source edits. The editor never writes geometry to disk.
- **Fast local loop:** `pnpm test:unit` for the language and translator; `pnpm meld check|inspect` for files; `DIAGRAM_FILE=x.meld pnpm dev` for the viewer.
- **Local dependencies:** real temporary files and a real localhost server. No fakes are needed.
- **Rollout and rollback:** file mode turns on only when `/api/session` answers. The static build and the JSON workflow are unchanged.

## Milestone 1: Check, format and inspect a diagram file

- **Change — `src/dsl/syntax.ts`:** line-based parser with stable IDs, nested groups, edges, `layout` recipes (flow, row, column), and the refinement statements `order`, `align`, `near`, `nudge`, `stay`, `pin` and `size`. Comments survive formatting. Styles use the editor's colors and shapes.
- **Change — `src/dsl/compile.ts`:** Meld's layout and refinement, ported to typed code with one fixed render context. It reports unsatisfied hard rules and relaxed soft rules, tied to source lines.
- **Change — `src/dsl/project.ts`, `src/cli/main.ts`:** project a scene into an editor `Diagram`, and route it with the editor's router. `check`, `format` and `inspect --json|--svg` use that path.

### Desired end state

- Unit tests cover parsing errors, formatting with comments, nested layout, pins and relative preferences.
- `inspect` prints canonical node and route geometry. Repeated runs match byte for byte.

## Milestone 2: Watch a file in the current editor

- **Change — `src/server/file-session.ts`:** one process owns the path. It serves the source with a content revision, watches the directory so renames are seen, writes atomically, and rejects stale revisions with 409.
- **Change — `src/state/file-session.ts`, status bar:** detect a session at startup. Project each valid source revision, stop browser storage, and show saved/saving/error/conflict.
- **Change — `pnpm meld open`:** serves the built app plus the API. `DIAGRAM_FILE` does the same under `pnpm dev`.

### Desired end state

- Editing the file in a text editor updates the open viewer. Invalid source keeps the last drawing and shows the error line.

## Milestone 3: Save viewer edits as source

- **Change — `src/dsl/transactions.ts`:** diff the committed document before and after an edit and emit source edits. A move becomes `near` with the nearest sibling, or `nudge` when there is none. The translator also covers pin/unpin, node size, group `min-width/min-height`, add, rename, connect, reverse, delete, group/ungroup, reparent, color and shape. Anything else is rejected and reverted.
- **Change — commit seam:** in file mode, `commit` hands the edit to the translator. The result is recompiled, re-projected and saved with its base revision. Undo/redo walks source history. An external change clears it.
- **Change — disabled tools:** layout passes, comparison, timeline, brush, bends, label positions, images and intent are disabled in file mode.

### Desired end state

- A drag writes a readable `near` line, and the toast names the relationship. A stale save keeps the proposal and offers Reload or Retry.

## Milestone 4: Stable refinements and the end-to-end proof

- **Change — anchors:** an accepted move or resize writes `stay` anchors for unhinted root objects and siblings. An agent's later addition then leaves distant areas in place.
- **Change — feedback:** a diagnostics list shows relaxed preferences and unsatisfied pins. An external edit reports which objects outside the changed statements moved.
- **Change — `Reflow group`:** remove soft hints inside the selected group, anchor what is outside, and recompile.
- **Change — `scripts/prove-file-session.mjs`:** drive the real browser through the first proof, and compare its geometry to `inspect --json` before and after a restart.

### Desired end state

- The proof script passes and saves screenshots. Comments and unrelated statements are still in the file.

## Open decisions and spikes

- **Edge label positions in canonical geometry.** The browser measures label text; Node estimates it. Compare nodes and route points exactly, but leave label positions out of the equality check. Fallback: share a fixed-width estimate in both.

## Below the cut line

- Views, static summaries, checkpoints and radial/grid recipes
- Writing comparison, timeline or brush results into source
- Custom edge bends, label positions and images
- Multi-user merge; automatic conflict resolution
