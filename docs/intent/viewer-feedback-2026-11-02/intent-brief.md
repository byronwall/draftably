---
title: 'Viewer feedback, 2 November 2026'
slug: 'viewer-feedback-2026-11-02'
phase: intent
status: current
last_updated: '2026-11-02'
---

# Viewer feedback, 2 November 2026

## My read

Byron reviewed ten agent-written `.draft` diagrams of a private codebase in `draftably open`
(ContextRecorder session `2026-11-02_09-18-19`, 7 minutes, 14 marks). Most were good; several
were "approaching perfection". The faults were general, not tied to the content.

The durable goal: **a diagram stands on its own.** The drawing carries the meaning and the words
around it stay short. Where the drawing uses a visual code (a color, a dashed line, a strike), the
reader can decode it without guessing. The diagram text is private, so every fault has a generic
repro in [repro/](repro/). All seven repros render the same on `main` at `d72e684`, after
#395–#399 landed, so none of these is already fixed.

## What matters most

1. **Too much prose above the drawing.** Title, a long subtitle, then a boxed context note. The
   subtitle sets the frame width, so one long sentence widened several diagrams (1:42, 6:10).
   Byron wants a narrower, editorial subtitle (2:43) and far fewer notes. The skill invites both:
   "a `subtitle` stating its takeaway" and `note "…"` "to add a sentence of context".
2. **The legend does not decode the drawing.** It names only some colors (4:22). It cannot say
   what dashed versus solid lines mean (3:08, 4:00). It stacks vertically when one row would do
   (2:01). A diff legend says "10 added" for five boxes; it counts lines too.
3. **Edge labels too wide or badly placed.** A label of five hash keys runs across the drawing
   (3:01, 3:35). Labels sit at the bend of a long route (5:57).
4. **Diff marks too heavy to read.** Removed items are struck, dashed, tinted and faded; the old
   text is unreadable (4:39, 6:17). He wants a ghost and expects to try versions.
5. **Sequence diagrams look busy.** Canvas-colored line breaks and label cards sit on tinted lane
   backgrounds as "weird splotches"; too many borders and cards (0:31–1:14).
6. **Bent lines between aligned columns.** Before/after columns jog every line (5:20–6:05).
   Small node shifts are fine if the lines go straight.
7. **Long wide rows** (0:14, 1:20, 3:48). Byron would accept a second row.
8. **Version visibility.** The sidebar cannot be resized (6:35), but #367 already fixed it; it
   waits in "Version Packages" #322. With many PRs landing, the status bar should show the live
   version so a review says which build it saw.

## The experience or behavior you appear to want

An agent writes a diagram. Above it: a title and one short line. In it: boxes, lines and short
labels. Under it: a compact legend that explains every color and line style used. A diff still
lets you read what was removed. The viewer says which version drew it.

## Boundaries

### Must be true

- Language changes update `skills/draftably/SKILL.md` and `docs/DSL.md` in the same PR.
- Keep what works: color use, the arrow over the diamond, tight stacked columns.

### Must be avoided

- Committing or quoting private diagram content. Repros use invented names.
- Engine work that regresses the diagram-quality rubric.

## What seems settled

- Fewer explanatory notes; the subtitle must not set the frame width.
- The legend should explain line styles and every color in use.
- Small node shifts are acceptable for straight lines.

## Possibilities, not decisions

- `legend line dashed "…"` syntax and a one-row legend option.
- Which diff ghost style; Byron said "we may need to play with" it.
- Whether fault 7 still happens on main: the generic eight-step chain already folds there.

## Current reality that matters

- `src/model/heading.ts` measures the subtitle as one line and the frame takes its width.
- `EdgeView.tsx` paints halos and label cards in the canvas color, not the color under them.
- `status.ts` paints removed items with strike, dash, tint and 0.75 opacity.
- No `check` warning covers legend gaps; `legend` takes only color families.

## Next step after confirmation

Shape and plan are written: [shape-brief.md](shape-brief.md),
[implementation-plan.md](implementation-plan.md).
