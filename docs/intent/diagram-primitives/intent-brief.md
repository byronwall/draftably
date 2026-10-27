---
title: 'Diagram primitives: cells, tables, byte layouts and images'
slug: 'diagram-primitives'
phase: intent
status: current
last_updated: '2026-10-26'
---

# Diagram primitives: cells, tables, byte layouts and images

## My read

Draftably draws boxes, groups and lines well. Byron wants it to draw everything he now reaches
for Graphviz DOT to draw, so it can become his general diagram tool. Today some pictures still
send him back to DOT or to hand-drawn images. Four kinds stand out:

1. **Sequences.** Boxes that touch each other to show the parts of one thing in order. The
   example is how a model request is built: system prompt, tools, history, a cache point, then
   the new turn. Arrows between separate boxes say "flows to". Touching boxes say "is made of".
2. **Byte layouts.** On-disk and on-the-wire structures, like the figures in the PNG and PDF
   specs or an RFC packet header: fields laid out in order, with widths that mean bytes or bits.
3. **Tables on the canvas.** DOT's HTML-like table labels and record shapes: a box with rows and
   columns, where a line can start or end at one row.
4. **Images.** Screenshots and pictures in a diagram. These matter most in the interactive
   viewer, because a large screenshot reads badly in a static export.

The first three have one thing in common: one object made of touching parts that keep their
order and size. That is the core of this initiative.

## What matters most

- Cover what DOT records and HTML-like tables do, so no diagram needs DOT.
- Keep the language small. Byron wants the smallest DSL that covers all three shapes.
- A line can point at one part of a composite object, not only the whole object.
- Widths in a byte layout carry meaning. A 4-byte field is twice as wide as a 2-byte field.
- Images build on the plan in PR #28; this initiative does not plan them again.

## The experience you want

An agent or Byron writes a few plain lines and gets a strip of touching boxes, a table, or a
packet header. The same lines work with every theme, the change marks, `compare`, `inspect --svg`
and the viewer. A line from elsewhere in the diagram lands on the right row or field. A diagram
can mix these objects with ordinary nodes and groups, as DOT allows.

## Boundaries

- No DOT importer. The goal is to cover what DOT can express, not to read `.dot` files.
- No spreadsheet: no formulas, sorting or cell editing grids in the viewer.
- No general rich text in cells beyond today's titles.
- Image storage, paste, inspection and portable assets stay in the rich-node-content
  initiative (PR #28). This initiative only lets an image sit in a cell or beside cells.
- Keep one statement per line and the current file rules.

## What seems settled

- Sequences, byte layouts and tables are wanted. Images are wanted, viewer first.
- The DSL stays line-based, readable and diff-friendly.
- Geometry stays a pure function of the source, the same in the CLI and the viewer.
- One `cells` recipe on a group covers sequences, tables and byte layouts; cells are nodes.
- Order: sequences, then tables (schema entities first), then byte layouts, then image cells,
  then viewer editing of cells.
- Byte layouts are RFC-style: fixed rows, a ruler, split fields and variable-length fields.
- A seam such as a cache point is a marker on the seam that lines can reach.
- Lines use a cell's own outer side; to reach an inner cell they cross cells and end with a dot.
- Static exports embed image previews capped at the node's size, as PR #28 plans.
- No `.dot` importer.

## Next step after confirmation

Byron answered three rounds of product questions on 2026-10-26; the answers are above. His
reference images for byte layouts live in his notes database, which did not respond during
planning; check milestone 3 against them. Start milestone 1 (sequences) from the
[implementation plan](implementation-plan.md).
