---
title: 'Diagram DSL and shared file editing — shape brief'
slug: 'diagram-dsl'
phase: shape
status: current
last_updated: '2026-10-14'
---

# Diagram DSL and shared file editing — what we are adding

**Outcome:** Byron and an agent edit one local diagram file. Automatic layout and saved human refinements work together.

**Primary flow:** Write source → open viewer → drag and refine → save source → agent adds content → reopen the same drawing.

## Feature scope

```text
Shared diagram authoring
├── PLANNED ADDITIONS FOR TONIGHT
│   ├── Readable diagram files, provisionally .meld
│   │   ├── Stable IDs, labels, connections, nested groups, sizes, and basic styles
│   │   └── Automatic layouts, relative preferences, soft position anchors, and exact pins
│   ├── Local CLI and current Diagram Studio editor
│   │   ├── Open one file; watch agent edits; save committed viewer edits automatically
│   │   ├── Check errors and inspect geometry without opening the viewer
│   │   └── Format source consistently; retain comments and unrelated content
│   ├── Source-backed editing
│   │   ├── Add, rename, connect, delete, group, move, resize, and change basic styles
│   │   ├── Drag to save a relative preference; pin or release explicitly
│   │   └── Reflow a selected group; preserve outside placement preferences
│   └── Clear feedback
│       ├── Saved, saving, source error, changed file, and save conflict
│       └── Show relaxed preferences and unsatisfied hard constraints
├── EVALUATE IN THE FIRST PROOF
│   └── Adapt Meld's compiler into the current editor without replacing the editor
└── LATER
    ├── Timeline, brush, and comparison results written into DSL
    ├── Custom connection bends, label positions, and embedded images
    └── Richer views, viewport summaries, and specialized diagram notation
```

Architecture and user flows lead. Dependency trees and call stacks use the same primitives initially.

## Behavior

| Situation                             | Expected result                                                                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Drop a moved node                     | Save a sibling-relative preference. Show the chosen relationship. Use a soft offset if no suitable sibling exists.                        |
| Agent adds content                    | Recompute from source. Saved anchors resist distant movement; nearby nodes can adjust. Show unavoidable movement outside the edited area. |
| Relative preference conflicts         | Relax it deterministically and report the affected rule. Keep the authored preference available for later edits.                          |
| Exact pins conflict                   | Preserve their coordinates and report the conflict. A nested pin uses parent-local coordinates; moving its parent moves the subtree.      |
| Resize a group                        | Save its requested frame size. Keep children inside; report any minimum size imposed by the contents.                                     |
| Undo or redo a viewer edit            | Restore its source transaction, including preferences and anchors, then save it.                                                          |
| Agent changes the file during an edit | Reject the stale save. Retain the unsaved proposal and show the newer source. Let Byron reload or explicitly retry.                       |
| Source becomes invalid                | Keep the last valid drawing with an error label. Pause viewer writes until the source is valid.                                           |
| Open a file-backed session            | Disk source is authoritative. Browser saves cannot replace it. Camera changes do not rewrite the diagram.                                 |

## Examples

Proposed starting syntax, borrowed from Meld:

```text
diagram "Checkout" version=1
group services "Services"
node api "API" in=services
node orders "Orders" in=services
edge submit api -> orders "submit"
layout services row gap=32
near orders api side=right gap=32
```

A drag saves a preference. A pin fixes a position. Soft anchors resist movement.

## Decisions and boundaries

**Appetite:** A usable local file/viewer loop tonight. Keep the current editor, with a bounded set of supported edits.

**Key decision:** Adapt Meld's pure compiler for file-backed diagrams. Project its result into the current editor; share the compiler with the CLI. This avoids implementing relative constraints twice. Extend sizes and styles for the agreed operations.

Save completed editor transactions, with outside anchors when accepting a refinement. Agent edits use those recorded anchors. Rendering never invents inputs from browser history. Use a stable default render context, independent of window resizing.

A JSON-shaped text wrapper leaves relative placement unsolved. Start with one directed layout and row/column recipes. Disable unsupported file-backed editing actions before they can change the drawing.

**Boundary:** Use a local file server with revision checks and atomic writes. External replacements reset undo history so Undo cannot erase agent work. Existing JSON files and reference bundles remain intact.

**First proof:**

**Try:** Open a nested architecture file. Drag one sibling, pin another, resize a group, and save. Add a connected node externally, then restart.

**Observe:** The file retains comments and content. The relative preference survives, pins hold, distant anchors remain steady where feasible, and Node/browser geometry agrees.

**Decide:** Continue only if the existing editor can display and save this result without geometry drift or silent data loss. If it fails, repair the compiler/editor boundary before adding tools. Do not replace the editor or weaken the accepted behavior.

See [intent](intent-brief.md).
