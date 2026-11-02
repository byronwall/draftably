---
title: 'Viewer feedback, 2 November 2026 — implementation plan'
slug: 'viewer-feedback-2026-11-02'
phase: plan
status: current
last_updated: '2026-11-02'
---

# Viewer feedback, 2 November 2026 — implementation plan

## Plan at a glance

Ship what is already built and make versions visible first, so later reviews say which build
they saw. Then fix the prose at its source: the skill and a `check` warning stop agents writing
it, and a wrapped subtitle fixes existing files. The legend comes next because it adds language.
Diff ghost and sequence calm are small render changes in separate files; run them in parallel.
Labels and layout come last: they touch routing and engines, need the diagram-quality audit
loop, and overlap the open Arrange/Compare stack (#373–#393).

Every milestone has a generic repro in [repro/](repro/) as its before/after screenshot. Each
leaves `main` working, and each reverts as one PR.

Parallel lanes: M1, M2, M4 and M5 touch different files. M3 follows M2 (both change
`legend-notes.ts` and the frame). M6 and M7 run one after the other.

## Implementation strategy

- **First proof:** subtitle wrap on `repro/heading-prose.draft`.
- **Primary seam:** none external; all work is local rendering, `check` and skill text.
- **Fast local loop:** `pnpm shoot docs/intent/viewer-feedback-2026-11-02/repro/<file>.draft tmp/<file>.png`
- **Local dependencies:** the seven repro files; `pnpm check:fast` while iterating.
- **Provider/live confirmation:** none; `draftably open` screenshot for viewer changes.
- **Rollout and rollback:** one PR per milestone with a changeset; revert the PR.

## Milestone 1: The viewer says which version it runs

Smallest change, and it makes every later review trustworthy.

- **Change — status bar version** in `src/components/StatusBar.tsx`, injected at build time.
- **Change — release** #322 after the open stack lands, so the sidebar resize ships.

### Desired end state

- The status bar reads `v0.9.0` (or current); a screenshot shows it.

## Milestone 2: Heading and prose budget

- **Change — subtitle wrap** in `src/model/heading.ts`: wrap at the drawing width (360px minimum,
  about 70 characters maximum); `headingSize` returns the wrapped height for `frame.ts` and
  `cli/svg.ts`.
- **Change — `heading-prose` warning** in `src/dsl/legend-notes.ts` for an unanchored note or a
  subtitle past the measure.
- **Change — skill** `skills/draftably/SKILL.md` lines 325–332: one short takeaway; drop "add a
  sentence of context"; anchored notes only when the drawing cannot say it.

### Desired end state

- `repro/heading-prose.draft` frame is the drawing's width; `check` prints the warning.

## Milestone 3: The legend decodes the drawing

- **Change — syntax** `src/dsl/syntax.ts`: `legend line dashed|dotted|solid "meaning"` and a
  one-row option; `docs/DSL.md` and the skill updated.
- **Change — warnings** `legend-missing` for used families with no row; info for dashed edges
  with no line row.
- **Change — diff legend** counts shapes and lines apart.

### Desired end state

- `repro/legend-gaps.draft` warns, then renders a full one-row legend.

## Milestone 4: Removed items stay readable

- **Spike — ghost variant** in `src/model/status.ts` `changePaint('removed')`
  - Decision required: which variant ships.
  - Evidence to gather: contact sheet of 3 variants on `repro/diff-ghost.draft` and
    `repro/straight-columns.draft`.
  - Fallback: no strike, 0.55 fade, dashed border.

### Desired end state

- Removed text reads at normal size; Byron chose the variant.

## Milestone 5: Sequence diagrams without splotches

- **Change — halos and label cards** in `EdgeView.tsx` and `cli/svg.ts` take the fill under them.
- **Change — outer frame** dropped when lanes enclose every participant. Read #331's plan first.

### Desired end state

- `repro/sequence-cruft.draft` shows no canvas-colored patches on lane color.

## Milestone 6: Edge labels wrap and avoid bends

- **Change — wrap** in `src/model/labels.ts`: about 180px measure, three lines at most.
- **Change — placement** on the longest straight run of the route.

### Desired end state

- `repro/edge-labels.draft`: the hash list wraps; no label at a bend; rubric scores hold.

## Milestone 7: Straight lines between columns

- **Change — alignment** in the layered engine for two-column `direction=right` layouts.
- **Spike — long rows**
  - Decision required: does any long-row shape still run as one row on main?
  - Evidence to gather: render the three shapes from the session as generic repros.
  - Fallback: close fault 7 as fixed.

### Desired end state

- `repro/straight-columns.draft` has five straight lines; audit scores do not drop.

## Below the cut line

- Removing `note` from the language.
- Editor UI to pick a diff style.
- New themes or legend styling beyond line rows and one row.
