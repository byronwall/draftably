---
title: 'Diagram DSL and shared file editing'
slug: 'diagram-dsl'
phase: intent
status: current
last_updated: '2026-10-14'
---

# Diagram DSL and shared file editing

## My read

Diagram Studio should become a local diagram authoring tool that Byron and an agent can use together. A readable DSL file will hold the diagram and its layout intent. A CLI will open a viewer and watch that file. Agent edits will update the drawing. Human edits in the viewer will update the same file. Neither participant should need an export-and-import step to continue the work.

The main problem is preserving useful manual choices while automatic layout remains useful. Automatic placement should produce a good starting point with few instructions. Byron should then move related objects, refine one area, and add content without rebuilding the entire arrangement. Those choices must survive closing the viewer and reopening the source. The source must contain enough information to reproduce the result without hidden browser state.

The goal for tonight, October 14, is a working authoring loop with durable layout tweaks. Architecture diagrams and user flows lead. Dependency trees and call stacks also matter. Richer viewport and presentation modes can follow. Implementation is under way; see the [implementation plan](implementation-plan.md).

## What matters most

- Use one local source file that both the agent and viewer can edit.
- Keep automatic layout, relative placement, and exact pins available together.
- Reproduce geometry from the same source and explicit rendering inputs.
- Preserve useful relationships when content changes, within the stated constraints.
- Keep the language compact, readable, and easy to validate from a terminal.

Repeatability and edit stability are separate requirements. Identical inputs should reproduce identical geometry. Changed content may require movement, but saved relationships should still guide that movement. Exact pixels across operating systems are outside tonight's proof.

## The experience or behavior you appear to want

An agent creates a diagram file with a custom extension. Byron opens it through the CLI and sees an automatic layout. He drags a node near related nodes. The viewer saves a relative placement preference that he can inspect and release. Exact pinning is a separate action. The agent then adds a node or changes a label. The watcher updates the viewer. Nearby nodes may move, while distant areas should stay steady.

Relative preferences can relax when necessary for a clean layout. The viewer must show what changed. Exact pins remain fixed. Reopening the same inputs must reproduce these decisions.

Byron can refine a selected area and keep improvements elsewhere. Nested groups support layout within a group and between groups. He can close the viewer and reopen the file with the same geometry. The agent can check source errors without using the interface. Neither a prior pointer sequence nor browser storage should be required to reconstruct the drawing.

## Boundaries

The file is the authority for authored content and durable layout intent. Temporary selections, cameras, and previews should not silently become layout requirements. Preview actions should write only when accepted. An invalid external edit should show an actionable error without destroying the source or last valid drawing.

Automatic formatting should keep the DSL clean and readable. Saves may format the whole file consistently. Preserve comments and unrelated diagram content; exact whitespace preservation is not required.

Two writers must not silently erase each other's work. The implementation needs a small, explicit stale-write rule. This is a local editing requirement, not a request for multi-user collaboration or distributed merging.

Avoid making every drag a permanent absolute coordinate. Avoid storing only a picture of the final layout. Also avoid requiring an append-only event history to discover the current diagram.

Tonight does not require automatic static summaries, multiple presentation modes, inset diagrams, specialized notation families, or a new layout-engine comparison platform. The source model should leave room for views without making those features prerequisites.

## What seems settled

The workflow should follow explorEDA's pattern: custom text files, terminal validation, a local viewer, file watching, and edits written back. The exact grammar need not match explorEDA.

Keep the current editor. Tonight, persist node moves, labels, connections, nested groups, resizing, basic styles, and main layout edits. Defer custom edge bends and label positions.

Existing layout comparison, timeline, and brush features are assets to assess during shaping. They are not a requirement to expose every control through the first DSL. Any supported edit must persist honestly; unsupported edits must not appear saved.

## Current reality that matters

Diagram Studio is a SolidJS browser application with layout and routing engines, manual geometry, pins, groups, and undo. It saves browser state and exports JSON. It has no local file server or DSL.

The recovered Meld prototype has a line-based `.meld` language, stable IDs, nested layouts, relative hints, nudges, stays, pins, and optional checkpoints. It separates model, views, layout intent, and exact saved geometry. Its source and examples are available locally for reuse assessment. Its historical test reports do not prove integration with this application.

## Next step after confirmation

The [shape brief](shape-brief.md) recommends adapting Meld's compiler into the current editor. Plan around its nested drag, save, agent edit, and restart proof. Keep syntax extensions provisional until that boundary works.
