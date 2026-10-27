---
title: 'Diagram structure — implementation plan'
slug: 'diagram-structure'
phase: plan
status: current
last_updated: '2026-10-26'
---

# Diagram structure — implementation plan

## Plan at a glance

Ship soft groups first, in the compiler, with the simplest drawing. They answer the main
question, whether a group can stop driving layout and still read as a group, in one PR. Then
add cohesion only if the first proof shows scatter, and the viewer drag. Lanes come next: they
reuse the same "members rank on their own" rule, applied across the whole drawing. Sequence
diagrams (messages only) follow lanes. The `vary` variant lands whenever #124 has a command.

Each milestone is one PR, with a changeset, a `docs/DSL.md` edit and a matching
`skills/draftably/SKILL.md` edit (the skill check fails otherwise).

## Implementation strategy

- **Core seam: a layout parent.** In `layoutPass` (`src/dsl/compile.ts`), build `children` and
  `immediate()` from each object's layout parent: its nearest ancestor that is framed, or
  `root`. A soft group is not a scope; its members are items of that ancestor. The model parent
  stays unchanged for color, change marks, `in=` and source edits.
- **Engines see the same tree.** `engineArrangement` projects the scene through `projectScene`
  (`src/dsl/project.ts`). Give soft members their layout parent as `parentId` there, so
  `layout-engine.js` never treats a soft group as a container. No engine change.
- **Bounds after layout.** After `arrange`, size a soft group from its members' world boxes
  plus a small pad and a short label strip. It never pushes siblings. The router does not treat
  it as a frame.
- **Fast local loop:** `pnpm check:fast` (about 10 s), plus
  `pnpm draftably inspect tmp/repro-125.draft --svg > tmp/repro-125.svg` and
  `pnpm shoot tmp/repro-125.draft tmp/repro-125.png`. Run `pnpm test:engines` in the background
  before each push.
- **Rollback:** `frame=box` is the default. A milestone that fails reverts as one PR; no file
  in the repo needs to change back.

## Coordination

The #125 fix and the `fold-small` work both change ranking and packing in `src/dsl/compile.ts`
(`rankLayers`, `packed`, `layoutPass`). M1 and M4 change the same function. Land the #125 fix
first and build M1 on top of it. If the #125 fix ranks group members globally under `layered`,
M4 reuses that code instead of writing its own. No open PR touches these files today.

## Milestone 1: Soft groups draw a tint and stop driving layout

- `src/dsl/syntax.ts`: `frame=box|soft|none` on `group`; `ModelObject.frame`. An error on
  `frame=` on a node.
- `src/dsl/compile.ts`: the layout-parent map in `layoutPass`; soft group bounds after
  `arrange`; `SceneObject.frame`. A `soft-overlap` note when a soft group's box covers a
  non-member.
- `src/dsl/project.ts`: soft members carry their layout parent into the engine document.
- Drawing: `src/components/scene/GroupView.tsx`, `StaticScene.tsx`, `src/cli/svg.ts`,
  `src/lib/svg-export.ts`. Soft is a tint at the group's shade with no border and a small label;
  none draws nothing. Change marks color the tint.
- Router: `src/engines/routing-engine.js` skips soft and none groups as obstacles and borders.
- Tests: in `tests/group-packing.test.ts`, the #125 repro with both groups soft gives the same
  node ranks as the repro with no groups; a scattered soft group gets `soft-overlap`.
- Proof run: the area script below on all 16 grouped examples, with every group soft.

### Desired end state

Done when: the #125 repro with `frame=soft` has no line across the canvas and matches the
no-group ranks; `frame=box` files are byte-identical in `inspect`; the proof table is in the PR.

## Milestone 2: Soft members stay together

Only if M1's proof shows overlaps in more than a few files.

- `src/dsl/compile.ts`: keep a soft group's members contiguous in each rank (sort by group, then
  barycenter, in `byBarycenter` and `packed`).
- Draw the tint as a union of padded member boxes, so a non-member between ranks is not covered.

### Desired end state

Done when: `soft-overlap` fires on no bundled example with every group soft, and the
Kubernetes example keeps monitoring beside its scrape target.

## Milestone 3: Soft groups in the viewer

- `src/components/scene/GroupView.tsx`: a soft group is hit-tested on its tint; click selects it
  and the Inspector shows it as a group.
- Drag on the tint moves every member by the same offset. On release, write a soft `stay` for
  each member and anchor the objects around them, through the same path Tidy uses
  (`src/dsl/layout-edits.ts`).
- Test in `tests/layout-edits.test.ts`: a tint drag writes one `stay` per member and nothing
  else.

### Desired end state

Done when: dragging the monitoring tint in the Kubernetes example (with `frame=soft`) moves
prometheus and grafana together, the file gains two `stay` lines, and undo restores it.

## Milestone 4: Swim lanes

- `src/dsl/syntax.ts`: `lanes` as a `layout root` algorithm. `direction=right` (the default)
  stacks horizontal bands; `direction=down` sets the lanes side by side as columns.
- `src/dsl/compile.ts`: rank every leaf across all lanes with `rankLayers`; place each leaf in
  its lane's band at its rank column; stretch every lane to the full length; a lane title strip
  at the start of each band. A nested group follows its own `frame=`: a box ranks as one block,
  a soft group's members rank freely.
- `check` errors: `lanes` outside root; a node outside every lane.
- `examples/support-lanes.draft` (from `support-triage.draft`, with roles as lanes).
- Tests: one lane test for rank columns and band order.

### Desired end state

Done when: every node in the example sits at its global rank column inside its own band;
forward edges run straight; return edges use the existing return lanes; `pnpm shoot` image
attached to the PR.

## Milestone 5: Sequence diagrams, messages only

- `layout root sequence`: root nodes are participants in file order; each edge is a message, in
  file order, on its own row; `kind=async` draws dashed; a self-message draws a short loop.
- New drawing: lifelines in the scene, `src/cli/svg.ts` and exports. Messages are straight and
  skip the router.
- `check` errors: groups or `in=` under `sequence`.

### Desired end state

Done when: a login sequence with six messages, one reply and one self-message draws with
participants across the top and messages in file order, and a `+edge` mark shows the new
message in place.

## Milestone 6: Fewer containers in `vary`

Starts when #124 has a `vary` command.

- Add one variant: soften leaf groups and groups whose members span more than one rank; never
  the group that holds most of the drawing. Rank it by area and `soft-overlap` like the others.

### Desired end state

Done when: `vary` on `kubernetes-cluster.draft` lists the variant with fewer frames, a
smaller area, and no `soft-overlap`, and `--apply` changes only `group` lines.

## Proof script for M1

The planning run measured root bounding boxes from `pnpm draftably inspect` for each grouped
example against a copy with its `group` lines and `in=` removed. Repeat it with `frame=soft`
in place of removal, and add the count of `soft-overlap` notes.

## Below the cut line

- `together a b c` as a separate statement.
- Viewer editing for lanes: drag a node across lanes to rewrite `in=`; collapse a soft group.
- Sequence fragments (`loop`, `alt`, `par`), activations, notes, create and destroy.
- Any other Mermaid diagram type.

## Open decisions

- Whether M4 reuses the #125 fix's global ranking, decided when that PR lands.
