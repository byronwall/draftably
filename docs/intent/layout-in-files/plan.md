---
title: 'Automatic layout in diagram files — restoration plan'
slug: 'layout-in-files'
phase: plan
status: draft
last_updated: '2026-10-14'
---

# Automatic layout in diagram files

## What happened

Nothing was deleted. The DSL work hid the layout tools whenever a `.draft` file is open, because
the file could not store what they produce:

- `src/components/Toolbar.tsx`: the whole layout group (approach picker, Improve, Layout
  options, Timeline, Brush, Compare, Reroute) sits inside `<Show when={!fileMode()}>`.
- `src/state/commands.ts`: `FILE_UNSUPPORTED` blocks `layout*`, `compare-*`, `timeline-*`,
  `brush-toggle` and `reroute`, with the toast "Its results cannot be saved to the file."
- `docs/intent/diagram-dsl/implementation-plan.md` put "writing comparison, timeline or brush
  results into source" below the cut line.

Without a file open (plain JSON mode) everything still works. The engines
(`src/engines/layout-engine.js`, `sculpt-engine.js`, `explorer-engine.js`) are unchanged.

The missing piece is that the compiler (`src/dsl/compile.ts`) only knows its own three
recipes, `flow`, `row` and `column`, and the translator (`src/dsl/translate.ts`) only knows how
to turn a single moved object into `near` or `nudge`.

## The core constraint: replayable or not

A `.draft` file never stores a picture of the final layout. The same source always compiles to
the same geometry. Whether a layout result can be saved as a recipe depends on whether it can be
recomputed from the source alone:

| Tool                                             | Engine mode                       | Recomputable from source? |
| ------------------------------------------------ | --------------------------------- | ------------------------- |
| Layout options + **Rebuild**                     | `rebuild`, cold start             | Yes. The engine reports `deterministic: true`. |
| **Compare** layout/algorithm grid (rebuild run)  | `rebuild`, cold start per cell    | Yes.                      |
| Compare routing parameters                       | Router settings                   | Yes, if the router settings are stored. |
| **Improve** (pass)                               | Warm start from current geometry  | No. It depends on where things were. |
| **Timeline** step                                | `rebuild` with `warmStart` + trace | No. Step 42 means something else once a node is added. |
| **Brush** stroke                                 | Local, path dependent             | No.                       |

The engine is safe to run in the compiler: its header says it is Browser, Worker and Node
compatible, it uses no random start, and its `await`s only yield to the event loop.

So two kinds of result need two kinds of storage.

## Proposal: recipes for choices, arrangements for results

### 1. Engine recipes (Layout options, Compare)

Extend `layout` so a scope can name an engine and its parameters:

```text
layout root engine=layered direction=right rank-gap=96 group-gap=48
layout services engine=grid gap=24
```

The compiler runs the engine cold for that scope and uses its positions as the base layout.
`near`, `stay` and `pin` then refine it exactly as they refine `flow` today. Choosing an
approach in Layout options, or applying a Compare cell, writes or replaces this one line. When an
agent later adds a node, the engine lays the scope out again, which is what choosing an engine
means.

Compare routing cells write a `routing` line (`routing edge-gap=12 auto-ports=true`) so `inspect`
and the viewer route the same way.

### 2. Arrangements (Improve, Timeline, Brush)

Keeping a timeline step, an Improve pass or a brush stroke writes soft `stay` positions for the
objects that moved, under one provenance comment:

```text
# arrangement: timeline step 42 · layered · 2026-10-14
stay api x=0 y=180
stay orders x=240 y=0
...
```

`stay` already exists, is soft, and the Milestone 4 anchoring and relaxation logic already makes
nearby objects give way when an agent adds content. **Reflow group** and **Clear manual
markers** already remove these. The cost is one line per moved object.

A tighter syntax, such as a named `arrangement` statement whose `stay` lines refer back to it so
the block can be dropped or replaced as a unit, is an option. It is worth adding only if plain
comments prove too loose.

### 3. Tell the translator what the edit was

Today the translator infers intent from a before/after diff. A layout result moves most of the
diagram at once, and inferring `near` for thirty objects gives nonsense. Layout commands should
pass an explicit edit intent with the commit:

- `{ kind: 'recipe', scope, engine, params }` → replace the scope's `layout` line and drop the
  soft position hints in that scope.
- `{ kind: 'arrangement', label, nodes }` → write `stay` for moved objects and leave the rest.

The diff-based path stays for ordinary drags.

## Work required

0. **Rename `.meld` to `.draft`** (PR 1). The extension, the CLI script (`pnpm draftably`), the
   example and the docs use the Draftably name. The Meld lineage stays in `reference/meld/`.
1. **Compiler: engine base layout** (`src/dsl/compile.ts`, `src/dsl/syntax.ts`)
   - Parse `engine=` and the engine's parameter names on `layout`. Validate them against
     `LayoutLab.algorithms[].controls` and report unknown keys with their line.
   - In `arrange(scope)`, when the layout names an engine, build a flat `Diagram` of that scope's
     direct children with their compiled sizes and the lifted edge pairs, run
     `LayoutLab.compute(..., { mode: 'rebuild' })`, and use the result as `base.positions`.
     Doing it per scope keeps the compiler's bottom-up sizing and lets refinements stay local.
   - The compiler becomes async, or the engine gains a synchronous entry point that skips its
     yields. The second keeps `compile`, the CLI and the translator synchronous, so it is the
     recommended route.
   - Golden tests: `inspect --json` must match byte for byte between runs and between Node and
     the browser.
2. **Routing settings in source**: a `routing` statement, read by `project.ts` and the CLI
   router.
3. **Edit intent through the commit seam** (`src/state/document.ts`, `src/state/file-session.ts`,
   `src/dsl/translate.ts`): add the `recipe` and `arrangement` paths above.
4. **Turn the tools back on in file mode**
   - Toolbar: remove the `<Show when={!fileMode()}>` gate; remove the layout ids from
     `FILE_UNSUPPORTED`.
   - Layout options / Rebuild / approach picker → recipe edit.
   - Compare `applyCandidate` → recipe edit for rebuild runs, arrangement for warm or pass runs.
   - Timeline `keepStep`, Improve pass, brush stroke end → arrangement edit. Scrubbing stays a
     preview and touches nothing.
   - Checkpoints (`layout-checkpoint`/`restore`) can stay disabled; in file mode, undo through
     source versions already covers them.
5. **Docs**: update `docs/DSL.md` (new `layout` keys, `routing`, arrangements, the
   "Editing in the viewer" table) and drop the "unavailable while a file is open" paragraph.
6. **Proof**: extend `scripts/prove-file-session.mjs`. Pick an engine in Compare, keep a
   timeline step, add a node from outside, restart, and check that the file and the geometry
   still agree.

## Risks and open questions

- **Engine changes move every recipe diagram.** Once files depend on the engine's output,
  tuning the engine changes saved diagrams. Option: record the engine version
  (`engine=layered@7`) and keep golden fixtures.
- **Per-scope versus whole-tree engine runs.** Running per scope loses some cross-container
  optimization that the nested-systems algorithms do today. Check this against the
  `nested-services` and `platform` samples before deciding.
- **Arrangement churn.** Keeping a second timeline step rewrites many `stay` lines, so
  diffs are noisy but readable.
- **Timeline replay (rejected).** Storing `engine + step=N` and replaying would keep the file
  tiny, but it is stable only while the source is unchanged. The first agent edit would move
  everything.
