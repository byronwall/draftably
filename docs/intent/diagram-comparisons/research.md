---
title: 'Diagram comparisons — research notes'
slug: 'diagram-comparisons'
phase: research
status: draft
last_updated: '2026-10-26'
---

# Research notes: PR diagrams, side-by-side panels and diff views

These notes collect the source material behind [gap-analysis.md](gap-analysis.md). They cover
two sources:

1. Byron's voice-memo transcripts about diagrams for pull requests.
2. The `diagram-led-technical-brief` agent skill, which makes Graphviz briefs today.

## 1. Transcripts

### Primary memo: "Deterministic PR Diagramming via Data-Flow Views" (2026-08-23)

Source: `~/.v2c-voice-memos/20260823-202007-6B46813F-context/transcript/transcript.txt`.

This is the only memo that is directly about diagrams for pull requests. The question it asks:

> Can you create a diagram which describes the changes in a pull request (…) deterministically?

The main points, in the order the memo makes them:

| #   | Point                                                                                                                                                                                                     | Status in the memo                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| T1  | A stable product diagram is the base. A PR "lights up" the blocks it touches. Linking code to blocks is easy when the base diagram came from a deterministic path.                                        | Committed idea                                    |
| T2  | A base diagram with three or four boxes (client, server, database) is too coarse: every PR lights up everything. The base needs a finer breakdown, for example by route.                                  | Committed idea                                    |
| T3  | Several lenses on the same change: route lens, component-usage lens, file-tree lens, call-stack lens, lifecycle lens for stateful servers.                                                                | Exploration                                       |
| T4  | Component-usage view: changed components in the middle, direct consumers one ring out, unchanged consumers shown as a quiet "control" for context.                                                        | Committed idea                                    |
| T5  | **Side-by-side before/after**: removals and edits on the left, the new state on the right. Unchanged nodes stay "in as close to the same spot as possible" so the viewer sees the change in connectivity. | Strongly wanted                                   |
| T6  | **Single superset graph**: draw one graph that holds both states, with color for removed, added and changed.                                                                                              | Strongly wanted, offered as the alternative to T5 |
| T7  | Show the change frontier: where the edit stopped propagating up or down a call stack, and how far it spread sideways to other consumers.                                                                  | Exploration                                       |
| T8  | Find "islands of change" so a reviewer can split a PR into independent PRs.                                                                                                                               | Committed goal for the PR tooling                 |
| T9  | Several route planes aligned on the changed components (the "graphene sheets" picture) show whether the changes share a root.                                                                             | Speculation                                       |
| T10 | Blast radius: a change in a widely used component lights up the whole app. Show the count and paths, not every node.                                                                                      | Exploration                                       |
| T11 | Most PRs need only one view: "where is the change", then the overlay, then optionally one narrow call-stack view.                                                                                         | Conclusion                                        |

What belongs to which repository:

- **The other repository** (the automated PR summary tool, likely built on `tsx-data-flow`) owns
  T1–T4, T7, T8 and T10: static analysis, the code-to-block mapping, which lens to show, and
  island detection.
- **draftably** owns the drawing contract that those features need: T5 (aligned side-by-side
  panels), T6 (a superset graph with added, removed and changed styles), stable placement of
  unchanged nodes across two versions, quiet "context" nodes (T4), and summarized nodes for
  large fan-out (T10).

### Supporting memos

| Date       | Memo                                                                                            | What it adds                                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-07-03 | Diagramming tools: rendering, views, and limits (`20260703-080307-2B169F6E`)                    | A diagram is a view over data. One saved layout per project breaks down; you need several views over one model. About 30 objects per page before it turns to mush. |
| 2026-07-05 | Code Visualization and Data-Flow Mapping (`20260705-210437-CC6EF8BD`)                           | Vertical feature slices against horizontal support systems make change scope easy to reason about.                                                                 |
| 2026-07-02 | Diagrams, layout, and the pain of making visual structure explicit (`20260702-212928-1312A672`) | Auto layout plus containers plus easy edits; current tools fail at the combination.                                                                                |
| 2026-08-21 | Diagramming-focused public presence (`20260821-204450-DB29548F`)                                | PR and code diagrams as a public showcase.                                                                                                                         |

No memo names draftably directly; the archive search for "draftably" returns nothing. The links
above come from topic searches ("PR summary", "diff diagram", "side by side diagram",
"before and after diagram", "change summary").

### The benefits the transcripts claim

The automated PR summary is worth building because:

1. **Placement.** A reviewer sees _where_ in the product a change lands before reading files.
2. **Coherence.** The changed nodes connect to each other, or they don't. A PR whose changes form
   one connected cluster that matches its description is easy to approve.
3. **Splitting.** Islands of change show which parts can ship as separate PRs.
4. **Hidden reach.** A change that looks local but reaches a shared component or a stateful core
   shows its true consumers.
5. **Determinism.** The diagram comes from code on disk, not an LLM, so two runs agree and the
   picture can be trusted as evidence.

Benefits 1, 2 and 4 depend on draftably drawing _two states, or one merged state, without the
layout moving around_. If unchanged nodes jump between the before and after pictures, the
viewer cannot see what changed, and the diagram fails at its one job.

## 2. The `diagram-led-technical-brief` skill

Source: `~/.agents/skills/diagram-led-technical-brief/SKILL.md` and its two assets
(`portrait-system-boundary.dot`, `side-by-side-comparison.dot`).

### What the skill asks of a diagram

The skill makes Graphviz DOT and PNG output. Its artifact contract:

- Every image stands alone: an embedded **title**, a one-line **subtitle**, and a compact
  **legend** when color, border, line style or shape carries meaning.
- A true before/after goes in **one side-by-side image** with **aligned panels** and a shared
  visual grammar, never in two images.
- Comparable entry points and outcomes line up across panels. Both panels use the same terms,
  colors, shapes and scale. One shared legend.
- Red means the problematic outcome; green means the corrected outcome.
- Portrait canvas for documents (`size="7.0,9.2!"`); landscape for comparisons
  (`size="12.0,7.8!"`).
- Render at 180 DPI, inspect the real image, keep the source next to the image.
- Dedicated annotation and risk nodes instead of labels on orthogonal edges.
- `constraint=false` for feedback edges so they don't bend the main hierarchy.
- Tests: five-second, detach, comparison, squint, line-trace, geography, remove-one-layer.

### How the skill gets alignment in Graphviz, and why it is fragile

The comparison asset puts each state in a `cluster_before` / `cluster_after` subgraph, then
uses `newrank=true` and `{ rank=same; BEFORE_ENTRY; AFTER_ENTRY }` to line up the entry and
result rows. The asset itself warns that "cross-cluster rank constraints can destabilize
Graphviz layouts". In practice:

- Only _rows_ align. Graphviz has no way to say "this node is at the same x in both panels".
- Each panel lays out on its own, so an unchanged node can sit left of center in one panel and
  right of center in the other.
- A changed node count in one panel shifts every rank below it.
- The legend sits at `rank=sink` with invisible edges, which can pull panels around.

These are exactly the failures that T5 says must not happen. They are also the place where
draftably can do much better than Graphviz, because draftably already owns its layout engine,
already keeps layout stable across theme changes, and already has `stay`, `pin` and `align`.
