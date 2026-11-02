---
title: 'Viewer feedback, 2 November 2026 — shape brief'
slug: 'viewer-feedback-2026-11-02'
phase: shape
status: current
last_updated: '2026-11-02'
---

# Viewer feedback, 2 November 2026 — what we are adding

**Outcome:** an agent-written diagram reads on its own: a short heading, a legend that decodes
every code, readable labels and diffs, fewer boxes.

**Primary flow:** agent writes a `.draft` → `check` flags what does not stand alone → viewer and
exports draw it cleanly and say which version drew it.

## Feature scope

```text
Diagrams that stand on their own
├── PLANNED ADDITIONS
│   ├── G. Version readout
│   │   ├── Status bar shows the running version (v0.8.0)
│   │   └── Release #322 so the sidebar resize ships
│   ├── A. Heading and prose budget
│   │   ├── Subtitle wraps at the drawing width, not the frame
│   │   ├── check warns heading-prose: unanchored note, long subtitle
│   │   └── Skill: one short takeaway; notes only beside the object they explain
│   ├── B. Legend that decodes
│   │   ├── Line-style rows: dashed, dotted, solid
│   │   ├── check warns legend-missing for used colors with no row
│   │   ├── One-row legend when it fits
│   │   └── Diff legend counts shapes and lines apart
│   ├── D. Diff ghost
│   │   └── Removed items fade but stay readable (variant picked by Byron)
│   ├── E. Sequence calm
│   │   ├── Line breaks and label cards take the color under them
│   │   └── No outer frame when lanes already enclose everything
│   ├── C. Edge labels
│   │   ├── Long labels wrap to at most three lines
│   │   └── Labels sit on a straight run, not a bend
│   └── F. Straight column lines
│       └── Align each target with its single source when room allows
└── EVALUATE BEFORE COMMITTING
    └── Long single rows: re-check the three shapes on main first
```

## Behavior

| Situation                              | Expected result                                  |
| -------------------------------------- | ------------------------------------------------ |
| Subtitle longer than the drawing       | Wraps under the title; frame keeps drawing width |
| Unanchored `note` in a file            | Drawn as now; `check` warns `heading-prose`      |
| Legend names blue; file also uses mint | `check` warns `legend-missing` naming mint       |
| Dashed and solid edges, no line row    | `check` info suggests a line row                 |
| Label wider than the measure           | Wraps; the route makes room                      |
| Removed node in a diff                 | Text readable at normal size                     |
| Viewer open on any file                | Status bar shows the version                     |

## Examples

Unsettled syntax:

```text
legend blue "State owner"
legend line dashed "Only in development"
legend direction=row
```

## Decisions and boundaries

**Appetite:** one stacked PR per group, small groups first.

**Key decision:** fault 1 is mostly the skill, not the renderer. Fix the skill and add a `check`
warning so agents stop writing the prose; the subtitle wrap handles old files.

**Boundary:** `note` stays in the language; layout work (F, long rows) must pass the
diagram-quality audit loop; no private content in repros or PRs.

**First proof:** **Try:** wrap the subtitle and rerender [repro/heading-prose.draft](repro/heading-prose.draft).
**Observe:** whether the frame shrinks to the drawing width. **Decide:** if it shrinks, A owns the
width fault; if not, the drawing is the width and the long-row check owns it.

**Open choices:** which diff ghost variant (D); whether unanchored notes later leave the language.

Plan: [implementation-plan.md](implementation-plan.md). Intent: [intent-brief.md](intent-brief.md).
