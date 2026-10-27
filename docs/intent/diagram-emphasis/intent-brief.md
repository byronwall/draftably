---
title: 'Interactive links and emphasis states'
slug: 'diagram-emphasis'
phase: intent
status: current
last_updated: '2026-10-26'
---

# Interactive links and emphasis states

## My read

Many Draftably diagrams describe real code: files, modules and services. A reader who sees a box
named `routes.ts` wants to open `routes.ts`. Today `href=` makes a node a link in `inspect --svg`,
but nothing on the drawing says so, and the viewer only shows the link in a hover tooltip. Byron
wants linked objects to work as links in SVG and in the viewer, with a visual cue that fits the
drawing. The agent must be able to declare links without the file getting out of control.

The second want is emphasis. One diagram often answers several questions: "what does the write
path touch?", "what does this PR change?". Byron wants to put a diagram into named states:
emphasize these objects, de-emphasize those. The change-mark diff view already does a fixed version
of this. Emphasis should be the same kind of styling layer, defined by the author, not a second
renderer.

## What matters most

- A linked object looks clickable and opens its target, in a standalone SVG and in the viewer.
- An agent declares emphasis in the `.draft` file with few lines, by object ID.
- A state never moves anything. Every state of a diagram has the same geometry.
- Emphasis reuses the diff styling: fade, border weight and neutral surfaces.
- One state, every state, or no state can be drawn from the CLI and the viewer.

## The experience you want

An agent writes a diagram of a service and adds two states: "Write path" and "Read path". Each
state names the objects that matter. `inspect --svg --state write` draws the write path at full
strength and fades the rest. `inspect --svg --states` draws one small panel per state, aligned like
the `compare` panels. In the viewer, the reader steps through the states with a small switcher and
sees the drawing change in place, with no layout jump.

A linked node shows a small link mark. In an exported SVG, hovering it shows the target and
clicking opens it. In the viewer, a click still selects the node; a separate control opens the
link.

## Boundaries

This is not a walkthrough or presentation mode. Byron does not fully accept a step-by-step
narration with captions and animation. File order of states can give simple stepping, but no
script, timing or per-step text beyond the state's name.

States do not edit the model. They do not hide, add or move objects; `compare` panels and change
marks keep that job. Emphasis does not create new colors: hue still comes from the author's
families or, in a diff, from the change marks.

Several diagrams at once (a grid of files, overlays) is the hard part for agents. This initiative
covers many states of one file. A multi-file board stays a later question.

## What seems settled

Byron answered four question rounds on 26 October.

- Respect the agent's link. URLs and GitHub links open as written; `.draft` opens in the viewer;
  file paths open in the editor (VS Code by default, `path:42` at the line).
- Relative paths start at the git root of the `.draft`. A bad base hurts a lot, so a clearly named
  `config link-base=` setting overrides it; `config editor=` picks the editor.
- `check` warns on a missing file and suggests a likely path. The link stays as written.
- The viewer gets careful links first. Static SVG takes a decent first guess.
- A link shows a corner ↗ mark.
- A state fades what it does not list, with the `.` context look. `rest=plain` keeps the rest
  readable for a soft highlight.
- States step in file order. No captions or playback.
- `inspect --svg` draws the plain diagram; `--states` draws only the states.
- Several diagrams at once waits until states of one file ship.

## Related memo items

Title and subtitle inside nodes, icons of varying sizes and text position belong with
[rich node content](https://github.com/byronwall/diagram-studio/pull/28) and themes, not here.
Consistency across a diagram is a theme and audit concern. The link mark must sit beside a future
title icon without collision.

## Next step after confirmation

Build the six milestones in the plan, starting with links in the viewer.
