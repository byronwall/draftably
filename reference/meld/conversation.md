# Research diagramming DSLs prototype

Source: https://chatgpt.com/c/6aba9bf0-f064-83ea-97b2-6a5c7bd82c50

Recovered October 14, 2026. Text retrieved through read_thread. Product claims and test counts below are historical claims, not current verification. Original sandbox links require the ChatGPT conversation.

## User request

Okay, go ahead and do a bit of research for me, specifically around various diagramming approaches and the DSLs that they use. It's related to some other work I've asked for, but what I'm trying to understand is what's the best approach for creating an agent-friendly DSL that describes a diagram that can be rendered quickly and that the rendering is viewport aware, understands the constraints of the viewport, is kind of modality-aware, so that if you're going into a modality where you've got interactivity, it's like a full browser, you can make a diagram that's probably richer, more interactive, supports expanding and collapsing. And then I need the DSL to be, like, layout-aware, but also have, like, strong opinionated defaults. So I want to have a suite of different layout approaches. I want to have a suite of hinting mechanisms. I want to have the ability to render the diagram, have the user make tweaks on layout, have the user do iterative layout passes, like quickly update, update kind of thing, and to then be able to persist those, either the final layout or the hints, back into the DSL. It needs to be deterministic, though, so that whatever you do, running it again and again and again always gives the same result. Because this is my big hangup with Mermaid, is that it's auto-layout only and the layout tends to be terrible. Other tools let you do a little bit of hinting, but they don't ever really give you full control, and they don't let you. It's kind of like all or nothing. What I really want is to be able to get some auto-layout, move stuff around, do a couple hits of layout maybe in a certain area, but then not have everything be super rigidly, like absolutely positioned. Because if it's absolutely positioned, then I've got the new problem of as soon as I add new content, the diagram looks terrible, I got to go reset it all. And so it's like I want it to be iterative on the layout, also iterative in the ability to add new content and have that kind of meld in. So part of me is wondering if it's almost like a, I don't know, like an append-only log type setup. I know that's not great as a DSL, but maybe that works in terms of, like, being able to incrementally add things and not have it wreck stuff. Go think about all that. Do some research on the current diagramming DSLs. So we got Mermaid, we got D2, we got this new thing called Rella Draw that I saw on Hacker News in the last couple days. And yeah, just go search them all. Do deep research, and then go build me a HTML, JavaScript prototype, just vanilla, so I can download it, that kind of plays with these ideas, gives me a syntax that broadly supports the kinds of things I want. I also need to be able to do, like, containers and then layout between the groups and within the groups. Yeah, go take a run at all that. Thank you.

[User attached 3 images; image contents were not included]

## Pro response

I built **Meld**, a working vanilla HTML/JavaScript prototype, along with a research report, language reference, examples, and tests.

**My central recommendation: make layout intent a first-class part of the source—not an accidental byproduct of automatic layout, and not a permanent collection of absolute coordinates.** Keep the semantic diagram, its views, its layout refinements, and optional exact-layout checkpoints distinct.

## Downloads

| File | Contents |
|---|---|
| **:chatgpt-content-reference{index="13"}[Standalone HTML prototype](sandbox:/mnt/data/meld-diagram-lab.html)** | The complete application in one file. No framework, installation, CDN, or runtime network dependency. |
| **:chatgpt-content-reference{index="14"}[Full project ZIP](sandbox:/mnt/data/meld-diagram-lab.zip)** | Prototype, readable JavaScript/CSS sources, three examples, SVG exports, DSL reference, agent-authoring guide, research, and automated tests. |
| **:chatgpt-content-reference{index="15"}[Research report](sandbox:/mnt/data/diagramming-research.html)** | Approximately 4,100 words covering the approaches, architecture recommendation, tradeoffs, and 30 linked sources. |

Download the HTML and open it in a modern browser. The ZIP is the better starting point for modifying the implementation.

## 1. What the research changed

The closest existing tools are more capable than an “automatic versus manual” comparison suggests. However, **persisting a final position and persisting the reason for that position remain different capabilities**.

### D2 + TALA is the strongest immediate reuse candidate

An important recent development: **TALA became open source on September 7, 2026**. Its announcement explicitly demonstrates diagrams mixing positioned nodes with automatically laid-out nodes.

It also identifies your precise concern: the same input and seeds reproduce the same result, but adding a node can substantially change the layout. That is the crucial distinction between **determinism** and **stability under edits**. :chatgpt-content-reference{index="0"}

D2 also has container layouts, grids, engine-specific placement controls, and an AST manipulation API. That makes it worth evaluating as the underlying language or backend before committing to a completely new public syntax. :chatgpt-content-reference{index="1"}

My assessment: the missing product layer to investigate is not simply “manual positioning.” It is the combination of understandable refinement semantics, scoped reflow, preservation policy, view adaptation, and source-backed editing.

### Reladraw is especially relevant to the language design

The project you saw is **Reladraw**. Its relative-placement vocabulary is close to the middle ground you described: relationships between objects, rather than choosing every coordinate yourself. It also documents hierarchical structure and edge endpoint controls. Its README calls the project early-stage and its syntax unstable. :chatgpt-content-reference{index="2"}

I would borrow the idea of statements such as “beside,” “below,” and “aligned with.” I would not assume that relative notation alone establishes stable incremental editing or viewport adaptation.

### LikeC4 deserves a serious comparison

LikeC4 already has **manual-layout drift validation** and **Draw.io round-tripping**, including layout and edge-waypoint information stored in source comment blocks. It is not appropriately characterized as “automatic layout only.” :chatgpt-content-reference{index="3"}

The distinction I would test is what happens *after* a meaningful content change. Does the system preserve a relationship such as “these services stay together,” or primarily preserve the last coordinates?

### Mermaid’s baseline has changed, but your requirement remains

Current Mermaid documentation says **ELK is bundled and the default from version 12 for several graph-like diagram types**. Its flowchart documentation also includes collapsible subgraphs. So “Mermaid has no interaction or layout controls” would now be an inaccurate baseline. :chatgpt-content-reference{index="4"}

Your requirement is nevertheless broader: a visual edit should become durable, editable layout intent, which then participates in subsequent automatic and local layout passes. A different default engine or collapse control does not, by itself, establish that workflow.

### The other approaches contribute different pieces

| Approach | What I would borrow |
|---|---|
| **Structurizr** | Separation between semantic model/views and generated layout data. Its compiled JSON can carry editor layout alongside the model. :chatgpt-content-reference{index="5"} |
| **ELK / elkjs** | A production backend candidate for compound directed graphs, ports, and cross-hierarchy connections—not a complete editor or persistence solution. :chatgpt-content-reference{index="6"} |
| **Graphviz / PlantUML / Pikchr** | Rich layout vocabulary and specialized notations. Graphviz also illustrates why a common syntax must not imply identical backend capabilities: `pin`, for example, is engine-specific. :chatgpt-content-reference{index="7"} |
| **Bluefish / Penrose / WebCoLa** | Partial constraints, composable relationships, and separation of content from geometric intent. These are valuable design references, even where their full machinery would be excessive for ordinary architecture diagrams. :chatgpt-content-reference{index="8"} |
| **yFiles PartialLayout** | A useful behavioral benchmark: selected or new elements can be laid out while designated fixed elements remain unchanged. :chatgpt-content-reference{index="9"} |

The report expands these comparisons. This was a documentation and source review; I did **not** run a comparative performance or layout-quality benchmark of those products.

## 2. The architecture I recommend

I would give the representation four layers:

| Layer | What belongs there | Why it matters |
|---|---|---|
| **Semantic model** | Stable node and edge IDs, labels, relationships, containment | A label change should not recreate an object or break its references. |
| **View specification** | Scope, viewport, modality, disclosure, connection policy | An interactive explorer and a small static image should not have to show the same representation. |
| **Layout intent** | Per-container algorithms, ordering, alignment, relative placement, soft preservation anchors, occasional pins | Refinements remain understandable and can adapt when content changes. |
| **Optional checkpoint** | Exact geometry plus an input fingerprint and engine version | An approved result can be replayed without confusing generated positions with future-edit intent. |

The editor’s history belongs beside these layers, not underneath them as a required replay mechanism.

### A drag should create the weakest useful constraint

Moving a box should not automatically mean “freeze this box here forever.”

The default interpretation should be something like:

```text
near payments orders side=right gap=32 view=explore
```

Other interpretations remain available:

```text
nudge payments dx=16 dy=24 view=explore
pin payments x=240 y=80 view=explore
```

These have deliberately different meanings:

**Relative placement** expresses a relationship. **A nudge** adjusts the result of a fresh automatic layout. **A pin** fixes parent-local coordinates.

That distinction is the middle ground you were describing. A user can progressively constrain the parts that matter without turning the entire diagram into a rigid drawing.

### Preserving a layout should also be explicit

When content is added, an editor can capture selected existing positions as **soft stays**:

```text
stay orders x=0 y=0 weight=8 view=explore
```

A stay means “prefer not to move this,” rather than “movement is forbidden.”

The important property is that preservation no longer depends on an invisible previous frame in the browser. Another machine—or an agent rendering the file headlessly—receives the same preservation inputs.

There is an unavoidable tradeoff here: arbitrary new content, a fixed viewport, unchanged old coordinates, and no overlaps cannot always coexist. The system needs a declared priority policy and diagnostics, not an implicit promise that nothing will ever move.

## 3. What the prototype implements

Meld implements the authoring loop, rather than just illustrating the proposed syntax.

| Area | Working behavior |
|---|---|
| **Nested containers** | Children lay out inside their group; the parent then arranges groups as boxes. Different groups can use different algorithms. |
| **Layout choices** | Directed flow, row, column, grid, and radial. |
| **Refinements** | Relative placement, ordering, preferred/required alignment, nudges, weighted stays, parent-local pins, dimensions, and minimum container sizes. |
| **Visual editing** | Real pointer dragging writes refinements back into the DSL. The inspector changes layout recipes and other source-backed settings. |
| **Iterative changes** | Add a component while recording preservation preferences; reflow a selected scope; release individual refinements. |
| **Views** | Interactive/static mode, explicit viewport dimensions, adaptive/full/overview disclosure, focus, collapse, and primary/all connections. |
| **Persistence** | DSL export/import, project export/import with undo history, and exact-layout checkpoints that invalidate when their inputs change. |
| **Rendering and inspection** | SVG, pan/zoom, collapse controls, outline, diagnostics, source highlighting, and standalone SVG export. |
| **Agent use** | Stable identities, forward references, strict validation, line-numbered errors, a headless Node CLI, and an agent-authoring guide. |

Here is a valid example of the implemented syntax:

```text
diagram "Checkout" version=1

group commerce "Commerce"
group workers "Services" in=commerce
node orders "Orders" in=workers
node payments "Payments" in=workers

group data "Data"
node db "Database" in=data kind=database

edge charge orders -> payments "authorize"
edge save orders -> db "persist"

layout root flow direction=auto gap=48
layout commerce column gap=28
layout workers row gap=32
layout data column gap=24

view explore "Explore" mode=interactive width=1100 height=720
view card "Summary" mode=static width=480 height=320 detail=auto

near payments orders side=right gap=32 view=explore
```

The declarations describe content; `layout` statements choose automatic behavior; the final statement refines one relationship in one view.

### A useful first walkthrough

1. **Switch Explore → Briefing → Small card.** The model stays intact, while the presentation changes. The card uses a different root layout and summarized groups.
2. **Return to Explore and drag Payments.** Watch the new `near` statement appear. Change the drag mode to compare relative placement, soft offsets, and exact pins.
3. **Select Domain services, change its layout, and add a component.** Then use **Reflow scope** to release local soft refinements while retaining preservation preferences outside the scope.
4. **Click Checkpoint, then Verify ×20.** Add another component afterward: the checkpoint becomes stale, and the diagram returns to live layout intent rather than applying obsolete boxes.

## 4. Viewport awareness should change the representation—not just the scale

This was one of the strongest points in your notes.

I treated the viewport as a compiler input, separate from the browser’s preview scale. In a static view, the prototype tries to aggregate groups before accepting unreadably small primary text. It reports summarized components and omitted connections rather than silently hiding them.

In an interactive view, it can retain detail because expansion, collapse, pan, and zoom are available.

For a production system, I would make this decision sequence explicit:

**Choose scope and detail → choose a suitable layout → route connections → fit the viewport → diagnose unresolved readability problems.**

That is different from laying out everything once and shrinking the resulting SVG.

There also needs to be a distinction between *semantic containment* and *presentation grouping*. Your sketches of related diagrams and inset views point toward a later concept of multiple view instances on one canvas. I discuss that direction in the report, but the prototype does not implement multi-panel insets or continuous zoom-triggered levels of detail.

## 5. Where the append-only log belongs

Your log intuition is useful—but I would not make the log the canonical diagram language.

The canonical source should describe the current model and current intent. A log should record semantic edits such as “set this relationship,” “change this container’s recipe,” or “release these refinements.”

That avoids requiring every renderer to replay a long sequence of pointer movements to discover the current diagram. It also makes ordinary review and agent editing much easier.

The prototype therefore exports two different things:

**Export DSL** saves enough current state to reconstruct the selected diagram views without history.

**Save project** includes that source plus the local undo history.

Its history is a bounded collection of source states, not a durable append-only audit system or collaborative CRDT. Those could be added around the same current-state representation later.

## 6. Determinism, verification, and the remaining limits

I treated these as separate acceptance criteria:

**Repeatability:** identical source, view, viewport, and engine version produce identical geometry.

**Edit stability:** small content changes preserve existing placement where the recorded intent allows it.

**Responsiveness:** a different viewport or modality may intentionally produce a different representation.

**Pixel identity:** fonts and rasterization look identical across platforms—a stronger requirement than matching geometry.

This separation matters when selecting existing engines too. For example, ELK documents that a random seed of `0` uses system-time initialization; deterministic integration needs an explicit seed policy rather than an assumption about defaults. :chatgpt-content-reference{index="10"}

### What passed

The delivered implementation passed **45 core tests and 26 browser integration tests**. Those include real pointer dragging, source and project round-trips, constraint conflicts, collapse and edge provenance, checkpoint replay/invalidation, fresh-process repeatability, and exact canonical-geometry agreement between Node and Chromium for all example views.

The **Verify ×20** control compares complete geometry, not merely a short hash.

Local warm Node measurements were a few milliseconds for the small examples. A synthetic 100-node, 99-edge grouped diagram measured approximately **81 ms median**, excluding browser painting. These are prototype measurements, not promises about larger diagrams or comparisons with other engines.

### What remains experimental

**Scoped reflow currently changes the selected scope’s constraints and runs a full deterministic compile.** It is not yet a true incremental engine with dependency caching. Parent bounds and cross-boundary routes can still change.

The five algorithms and router are original, bounded heuristics; no ELK, D2, or other third-party engine is bundled. Complex routing can still be unattractive. Arbitrary cross-container alignment, manual edge waypoints, draggable labels, specialized notation families, robust font measurement, and multi-user collaboration are not implemented.

The geometry tests do not establish universal pixel-identical rendering. Browser testing used Chromium with the standalone document injected directly because the managed environment blocks `file://` navigation; native file opening in an unmanaged browser, Firefox, and Safari was not verified here.

## Where I would take it next

I would keep the model/view/intent/checkpoint separation and replace the weakest layout machinery before expanding the grammar substantially.

The next evaluation should compare **ELK and TALA behind an explicit backend capability interface**, while also testing whether the intended workflow is cheaper to build around **D2 or LikeC4** than around a new public language. ELK’s compound-graph capabilities and LikeC4’s existing layout persistence make those concrete starting points, not merely conceptual references. :chatgpt-content-reference{index="11"}

The deciding test should not be which engine produces the prettiest initial diagram. It should be what happens after **dragging, adding a sibling, inserting a group, lengthening a label, collapsing a boundary, resizing the viewport, and reopening the source in a fresh process**.

**Persist relationships first, positions selectively, and history separately.** That is the foundation I would use for the resilient, agent-friendly authoring experience you described.
