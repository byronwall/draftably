---
title: 'Diagram structure — intent brief'
slug: 'diagram-structure'
phase: intent
status: current
last_updated: '2026-10-26'
---

# Diagram structure — intent brief

## My read

Byron wants diagrams that say "these things belong together" without paying for a frame. Today
a group is the only way to say that, and a group drives layout: it pads its members, adds a
header, and moves as one block. Diagrams grow bigger and less direct than their content needs.

He also wants a small number of more opinionated diagram forms. He dislikes Mermaid overall,
but some of its diagram types are worth having. Swim lanes and sequence diagrams are the likely
ones, because they fix positions on a grid instead of leaving placement to a general layout.

## What matters most

- **Containers cost space.** In the bundled examples, removing every group cut the drawing area
  by 40–70% in most files (Kubernetes: 1287×1105 to 849×568).
- **Containers block good ranks.** Issue #125 shows a group that spans several ranks placed as
  one column, so its entry edge crosses the whole canvas. No knob moves it.
- **But frames carry meaning.** The same Kubernetes file without groups loses its namespaces,
  its colors and its clusters; monitoring drifts away from what it watches. Some files fall to a
  single line. "Fewer containers" must keep the "belongs together" signal.

## Desired outcomes

1. An author or agent can mark a set of nodes as related. Layout keeps them near each other but
   ranks each member with its own edges, and the drawing shows the relation lightly.
2. A diagram can switch between framed and soft grouping without rewriting its nodes or edges,
   so a tool such as the planned `draftably vary` (#124) can offer a "fewer containers" variant.
3. A process with roles reads as swim lanes: one band per role, steps placed in global order.
4. An interaction between participants reads as a sequence diagram: participants across the
   top, messages down the page in the order the file lists them.

## Boundaries

- One file language. New forms reuse `node`, `group`, `edge`, `layout` and change marks rather
  than adding a second syntax.
- Copy what earns its place, not Mermaid's surface. No new arrow syntaxes, no per-diagram
  mini-languages.
- Deterministic geometry stays: the same file draws the same picture.
- FEEL.md still governs: left-to-right reading, quiet frames, lines stronger than borders.

## What seems settled

- Soft grouping is `frame=soft` on a group, drawn as a tint with a small label.
- Swim lanes come first, then sequence diagrams with messages only.
- Nothing new ships as the default: `frame=box` and today's layouts stay.

## Not in scope now

- Gantt, pie, class, state, ER and other Mermaid types.
- BPMN semantics (gateways, events, pools with message flow rules).
- A general constraint language for grouping.

## Next step after confirmation

Byron answers the product questions. Then Milestone 1 (soft groups) starts after the #125 fix lands.

## Source

Byron's voice memo of 26 October, issues #124 and #125, and a measurement of the bundled
examples with and without groups.
