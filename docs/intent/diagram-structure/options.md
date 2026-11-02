---
title: 'Diagram structure — options compared'
slug: 'diagram-structure'
status: current
last_updated: '2026-10-26'
---

# Diagram structure — options compared

Supporting analysis for the [shape brief](shape-brief.md). Scores are 0–10, higher is better.

## How groups shape layout today

- `layoutPass` in `src/dsl/compile.ts` arranges each scope bottom-up. A group is arranged
  inside, sized to its content plus `GROUP_INSET` and the header, then placed in its parent as
  one item. `pairsIn` maps every edge to the members' immediate ancestors in the scope, so a
  group takes exactly one rank there.
- The engines in `src/engines/layout-engine.js` do the same: `arrange(activeIds, parentId)`
  solves one sibling set per container. `compound-flow` adds boundary pull, but members still
  stay inside their frame.
- So a frame changes three things at once: it draws a box, it adds padding, and it makes its
  members one block in the parent's ranks. Issue #125 is the third effect.

## Soft grouping: three options

| Dimension                                    | A. `frame=soft` on a group | B. `together a b c` | C. Tint/hull only |
| -------------------------------------------- | -------------------------- | ------------------- | ----------------- |
| Layout freedom (members rank on their own)   | 8                          | 9                   | 9                 |
| Keeps the "belongs together" reading         | 8                          | 4                   | 6                 |
| Keeps label, color inheritance, change marks | 9                          | 2                   | 3                 |
| One concept in the language                  | 9                          | 5                   | 6                 |
| `vary` can flip it with a one-line edit      | 10                         | 4                   | 6                 |
| Implementation risk (low risk scores high)   | 6                          | 6                   | 7                 |
| **Total**                                    | **50**                     | **30**              | **37**            |

**A. `frame=soft` on an existing group.** The group keeps its id, label, color and `in=`
members. For layout, its members join the nearest framed ancestor's scope and rank by their own
edges. The compiler then draws a light tint behind the members with a small label. Cost: the
tint can cover a non-member when members scatter, so it needs a cohesion rule and an overlap
check. `frame=none` is the same layout with nothing drawn.

**B. A `together` refinement.** Members stay where they are declared and the line adds a soft
pull. It is honest about being a hint, but it has no label, no color for `auto` members and no
change mark. It duplicates what a group already says. It also makes `vary` rewrite membership
instead of one attribute.

**C. A drawn hull with no language change.** Draw a hull behind members of any group that the
layout scattered. It cannot say when to scatter, so it needs A or B anyway.

**Choice: A, with C's drawing.** `frame=box|soft|none` on `group`. Soft groups dissolve for
layout, keep a cohesion pull, and draw as a tint. B stays below the cut line; add it only if
authors need a relation that is not a group.

**Effect on layout.** A soft group is not a block. Its members enter the parent's ranks, so
the #125 repro ranks like the version without groups. Cohesion keeps members next to each other
across each rank (contiguous order, then barycenter), which is what stops the drift seen in the
flat Kubernetes drawing.

**`vary` "fewer containers".** With A, the variant is a set of `frame=soft` edits. Candidates:
leaf groups first, then groups whose members span more than one rank (the #125 shape), never
the outermost group that holds most of the drawing. The variant reports area and overlap like
any other.

## Swim lanes and sequence diagrams elsewhere

| Tool     | Swim lanes                                                                          | Sequence                                                                                        |
| -------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Mermaid  | No native lanes; authors fake them with `subgraph` and `direction`.                 | `sequenceDiagram`: participants, `->>`/`-->>` messages, activations, notes, `loop`/`alt`/`par`. |
| PlantUML | Activity diagrams take `\|Lane\|` markers; steps after a marker fall in that lane.  | Like Mermaid plus dividers, delays, create/destroy, and grouping boxes.                         |
| BPMN     | Pools hold lanes; every flow node sits in one lane; message flows cross pools only. | No sequence form; collaboration diagrams cover part of it.                                      |

**What fits draftably.**

- Lanes map onto groups that already exist. A lane is a root group drawn as a full-length band.
  The new part is one rule: rank all leaves globally across lanes, then place each leaf in its
  lane's band at its rank. That rule is the fix #125 asks for, applied on purpose.
- Sequence maps onto nodes and edges. Participants are root nodes in file order. Each `edge`
  line is one message, and its line order is time. `kind=async` already draws dashed, which
  reads as a reply. Change marks then show an added or removed message in place.
- Fragments (`loop`, `alt`, `par`), activations and notes need new statements. They wait.
- BPMN's pool/message-flow rules and PlantUML's lane markers do not fit a declarative file and
  are left out.

**Smallest DSL.**

```text
layout root lanes direction=right     # root groups become lanes, in file or `order` order
layout root sequence                   # root nodes become participants; edges are messages
```

**Build lanes first.** Lanes reuse groups, ranks, the router and frame drawing, and they share
the global-rank work with soft groups. Sequence needs new drawing (lifelines, straight message
rows), a new meaning for edge order, and its own viewer editing rules.
