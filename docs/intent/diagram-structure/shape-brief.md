---
title: 'Diagram structure — shape brief'
slug: 'diagram-structure'
phase: shape
status: current
last_updated: '2026-10-26'
---

# Diagram structure — what we are adding

**Outcome:** An author can say "these belong together" without a frame that drives layout, and
can draw a process as swim lanes or an interaction as a sequence diagram.

**Primary flow:** Write groups as today → mark some `frame=soft` (or let `vary` suggest it) →
members rank freely and draw on a light tint → switch the root to `lanes` when the groups are
roles.

## Feature scope

```text
Diagram structure
├── PLANNED ADDITIONS
│   ├── Soft groups: group … frame=box|soft|none
│   │   ├── soft: members join the parent's ranks; tint + small label behind them
│   │   ├── none: same layout, nothing drawn; `color=auto` members still inherit
│   │   ├── cohesion: members stay next to each other across each rank
│   │   ├── check: `soft-overlap` when a tint covers a non-member
│   │   └── viewer: click the tint to select; drag it to move members (a `stay` per member)
│   ├── Fewer containers in `vary` (after #124 lands)
│   │   └── a variant that softens leaf and multi-rank groups, with its area and overlap
│   ├── Swim lanes: layout root lanes
│   │   ├── root groups are lanes, in file or `order` order
│   │   ├── horizontal bands by default; `direction=down` gives vertical columns
│   │   ├── every leaf takes a global rank and sits in its lane's band at that rank
│   │   └── lane titles in a header strip at the start of each band
│   └── Sequence diagrams: layout root sequence (messages only)
│       ├── root nodes are participants, in file order
│       ├── each edge is one message row, in file order; `kind=async` is a dashed reply
│       └── lifelines; a self-message draws a short loop
└── LATER POSSIBILITIES
    ├── Sequence fragments, activations and notes
    └── `together a b c` for a relation that is not a group
```

## Behavior

| Situation                                    | Expected result                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| #125 repro with both groups `frame=soft`     | Nodes take the same ranks as the file without groups; each group is a tint behind them. |
| A soft group inside a framed group           | Members join the framed group's scope; the frame sizes to all of them.                  |
| A framed group inside a soft group           | The framed group is one item in the soft group's parent scope.                          |
| A change mark on a soft group line           | The tint takes the mark's color, as a frame does today.                                 |
| `lanes` with a node outside every root group | `check` error on that node's line: lanes need every node in a lane.                     |
| `lanes` with a nested group inside a lane    | Follows its own `frame=`: a box ranks as one block, a soft group ranks freely.          |
| Drag a soft group's tint in the viewer       | Every member moves; each gets a soft `stay` at its new place, as Tidy writes them.      |
| Edge back against the flow in `lanes`        | Uses the existing return lanes (`src/dsl/lanes.ts`).                                    |

## Examples

Unsettled syntax:

```text
group monitoring "namespace: monitoring" color=amber frame=soft
node prometheus "prometheus" in=monitoring
node grafana "grafana" in=monitoring

group customer "Customer"
group support "Support"
node ask "Opens ticket" in=customer
node triage "Triage" in=support
edge t1 ask -> triage
layout root lanes direction=right
```

## Decisions and boundaries

**Appetite:** Six PRs: soft groups, cohesion, viewer drag, lanes, sequence, and the `vary`
variant whenever #124 lands.

**Key decision:** Soft grouping is an attribute on `group`, not a new `together` statement or a
render-only hull. A group already carries the label, the color for `auto` members and change
marks. One attribute keeps those, and it gives `vary` a one-line edit. Scores and the survey of
Mermaid, PlantUML and BPMN are in [options.md](options.md).

**Order:** Lanes come before sequence. Lanes reuse groups, ranks, router and frame
drawing. They share their core rule, global ranks across groups, with soft groups and with the
#125 fix. Sequence needs new drawing and a new meaning for edge order.

**Boundary:** `frame=box` stays the default, so every file draws as it does now, and the agent
skill keeps writing boxes; `vary` offers the softer variant. No Mermaid syntax. Edges still join
nodes only. No collapse for soft groups in v1.

**First proof:** **Try:** `frame=soft` in the compiler only, drawn as a padded bounding box, on
the #125 repro and the 16 grouped examples. **Observe:** area against `frame=box`, and how often
a tint covers a non-member. **Decide:** if most files shrink and few overlap, keep the bounding
box and ship. If overlaps are common, add cohesion before the tint ships, and draw a union of
member boxes instead of one rectangle.

**Settled with Byron (26 Oct):** `frame=soft` on group; tint plus small label; box stays the
default; lanes first, then sequence (messages only); lane strays are a `check` error; `vary`
softens leaf and multi-rank groups; tint drag writes a `stay` per member; lanes default to
horizontal bands and `direction=down` switches; nested groups in lanes follow their own frame.
