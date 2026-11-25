# Diagram types draftably lacks, from 23 diagramming tools

Checked 2026-11-24 against draftably 0.18.0 (`8e8ab1fa`). Planning task: TASK-0081.

This is a quick survey, not a full study. The earlier
[15-library comparison](diagram-library-gaps-2026-10-27/summary.md) covered mostly open-source
libraries and text languages. This one weights paid, professional-looking products, and asks one
question: which major diagram types do they offer that draftably does not?

Evidence comes from vendor pages, docs and template galleries (see [Sources](#sources)), plus
general product knowledge. Template galleries overstate support: a template is often plain shapes
arranged to look like a notation. The counts below are judgments, good to about ±2 per row.

## What draftably draws today

| Type                                | How                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------- |
| Flowchart, pipeline, dependency map | `flow`, `layered`, `stress` and other engines; nested groups           |
| Architecture (boxes in containers)  | Nested groups, soft groups, legend, themes                             |
| Swim lanes                          | `layout root lanes`                                                    |
| Sequence                            | `layout root sequence`: phases, actions, activation bars; no fragments |
| Timeline and roadmap                | `layout g timeline`: dated bars, milestones, progress, zoom, ordinal   |
| Tree, org chart, decision tree      | `engine=tree`                                                          |
| Record, table, grid                 | `layout g cells`, `columns=N`, `span=`, edges to single cells          |
| Byte and bit layouts                | `cells unit=byte\|bit`                                                 |
| Code with callouts                  | `shape=code`, `range`, code tables, `src=` from a file                 |
| Before/after change diagrams        | `+` `-` `~` marks, `compare` panels                                    |
| Focus views of one diagram          | `state` lines (emphasis), `--states` panels                            |
| UML-ish relations                   | `head=`/`tail=` triangles and diamonds, `directed=false`               |

Code nodes, change marks and source carried inside exports are rare. No paid tool in the list
draws code with line callouts or a diff of a diagram from one source file.

## Tools surveyed

| Tool                    | Kind                   | Notes on its look                                                          |
| ----------------------- | ---------------------- | -------------------------------------------------------------------------- |
| Lucidchart              | Paid editor            | Huge shape libraries, AWS/Azure/GCP import, ERD from SQL, BPMN, C4 kits    |
| Miro                    | Paid whiteboard        | Cloud, BPMN, UML packs on paid plans; Mermaid/PlantUML apps; sticky boards |
| Microsoft Visio         | Paid editor            | The reference stencil sets: network, BPMN, org chart, floor plan           |
| draw.io / diagrams.net  | Free editor            | Every notation as shapes; weak defaults, strong libraries                  |
| Whimsical               | Paid editor            | Calm palette, few choices; flowchart, mind map, wireframe, sequence        |
| FigJam                  | Paid whiteboard        | Friendly sticky style; journey maps, 2×2, mind maps by template            |
| Excalidraw+             | Paid whiteboard        | Hand-drawn look is the brand; community icon libraries                     |
| tldraw                  | SDK / whiteboard       | Hand-drawn look; mostly free-form                                          |
| Eraser                  | Paid diagram-as-code   | Five DSL types: flow, ERD, cloud with icons, sequence, BPMN                |
| IcePanel                | Paid architecture      | C4 levels you zoom through, tech icons, step-through flows                 |
| Structurizr             | Paid / free DSL        | One C4 model, many views: context, container, dynamic, deployment          |
| Ilograph                | Paid architecture      | Interactive perspectives over one model, sequence views, AWS/Azure icons   |
| Gliffy                  | Paid (Confluence)      | UML, ERD, network, Venn, swimlane, floor plan shape sets                   |
| Creately                | Paid editor            | Mind map, org chart, genogram, SWOT, journey, UML, network                 |
| Cacoo                   | Paid editor            | Flowchart, UML, cloud architecture, wireframe templates                    |
| OmniGraffle             | Paid (macOS)           | Print-quality typography; Stenciltown icon sets                            |
| yFiles                  | Paid SDK               | Best automatic layouts: hierarchic, orthogonal, radial, tree, BPMN demos   |
| GoJS                    | Paid SDK               | Samples for org chart, mind map, Gantt, BPMN, kanban, ERD, swimlane        |
| JointJS+                | Paid SDK               | BPMN, UML, ERD, Gantt-like and kanban kits                                 |
| Mermaid / Mermaid Chart | Free DSL / paid editor | Widest text-language list: ERD, class, state, gitgraph, quadrant, sankey…  |
| PlantUML                | Free DSL               | Full UML set, C4 stdlib, timing, Gantt, mind map, WBS, wireframe (Salt)    |
| D2 / TALA               | Free DSL / paid layout | `sql_table`, `class`, sequence, grids, icons by URL; TALA layout is paid   |
| Napkin                  | Paid AI visuals        | Infographic types from prose: Venn, cycle, funnel, timeline, charts        |

### What makes the paid output look professional

1. **Icons.** Eraser, Ilograph, IcePanel, Lucidchart and D2 all put a provider or tech icon in
   each box. This is the single largest visual difference between their architecture diagrams and
   draftably's.
2. **Real notation marks.** Crow's feet, key glyphs (PK/FK), UML compartments, BPMN event circles.
   A reader trusts a diagram that uses the notation they know.
3. **Few, calm defaults.** Whimsical, Eraser and IcePanel give few color choices and good spacing.
   Draftably already does this well.
4. **Many views of one model.** IcePanel, Structurizr and Ilograph let a reader zoom from context
   to containers to components, or step through a flow. Draftably's `state` lines are a start.
5. **A style of its own.** Excalidraw's hand-drawn line and Napkin's infographic look are brands.
   Draftably has no hand-drawn option.

## Matrix

"Tools" counts the 23 tools above that offer the type as notation, shapes or a working template.
Draftably: **yes** = a real way to draw it; **partial** = you can fake it, but notation or layout is
missing; **no** = no reasonable way.

| Type                                | Tools | Examples                                                     | Draftably | What is missing                                                  |
| ----------------------------------- | ----- | ------------------------------------------------------------ | --------- | ---------------------------------------------------------------- |
| Flowchart / process                 | 23    | all                                                          | yes       | —                                                                |
| ERD with keys and cardinality       | 16    | Lucid, Eraser, Whimsical, D2, Mermaid, Visio, GoJS, JointJS+ | partial   | Key glyphs, typed columns, crow's feet, table-to-table routing   |
| Cloud / network architecture, icons | 15    | Lucid, Eraser, Ilograph, IcePanel, Miro, Visio, D2, Mermaid  | partial   | Icons in boxes; groups and edges already work                    |
| UML class                           | 14    | Lucid, Visio, draw.io, PlantUML, Mermaid, D2, GoJS, yFiles   | partial   | Name/fields/methods compartments, visibility, stereotypes        |
| Mind map                            | 14    | Whimsical, Miro, FigJam, Lucid, Creately, Mermaid, PlantUML  | partial   | Two-sided and radial layout, curved branches, outline syntax     |
| Org chart                           | 13    | Lucid, Visio, Creately, GoJS, yFiles                         | yes       | Photo or role card; tree engine draws it                         |
| BPMN                                | 11    | Lucid, Visio, Miro, Eraser, JointJS+, yFiles                 | partial   | Event, gateway, task, data-object shapes on lanes                |
| Wireframe / UI mockup               | 11    | Whimsical, Lucid, Cacoo, PlantUML Salt, FigJam               | no        | A UI widget set; poor fit for a graph tool                       |
| UML state machine                   | 10    | Lucid, Visio, Mermaid, PlantUML, GoJS, yFiles                | partial   | Start/end pseudo-states, composite states, guards on transitions |
| C4 model (levels and views)         | 9     | IcePanel, Structurizr, Ilograph, Lucid, Mermaid, PlantUML    | partial   | Person shape, element kinds, one model with several views        |
| Quadrant / 2×2 / SWOT               | 8     | Miro, FigJam, Lucid, Creately, Mermaid, Napkin               | partial   | Axes and quadrant labels; SWOT works as `cells columns=2`        |
| Gantt                               | 8     | Visio, Mermaid, PlantUML, GoJS, Creately                     | partial   | Task dependencies and a work calendar; timeline bars exist       |
| Venn                                | 7     | Lucid, Gliffy, Creately, Napkin, Visio, Miro                 | no        | Overlapping circles                                              |
| User journey / journey map          | 7     | Mermaid, Lucid, Miro, FigJam, Creately, Whimsical            | partial   | Stage columns × emotion score; lanes come close                  |
| UML use case                        | 7     | Lucid, Visio, PlantUML, draw.io, Creately                    | partial   | Actor figure, ellipse, system box                                |
| Data-flow diagram (DFD)             | 6     | Lucid, Miro, Visio, Creately, draw.io                        | partial   | Data-store and external-entity shapes                            |
| Fishbone / Ishikawa                 | 5     | Lucid, Miro, Visio, Creately, draw.io                        | no        | Spine-and-ribs layout                                            |
| Kanban board                        | 5     | Miro, FigJam, Whimsical, Mermaid, GoJS                       | partial   | Columns of cards work as groups; no card fields                  |
| Charts (pie, bar, radar, treemap)   | 5     | Napkin, Mermaid, Lucid, Miro                                 | no        | Out of scope: a chart library does this better                   |
| Sankey / weighted flow              | 4     | Mermaid, yFiles, Napkin                                      | no        | Widths by value                                                  |
| Git graph                           | 3     | Mermaid, draw.io                                             | no        | Branch rails and commit dots                                     |
| Timing / waveform                   | 1     | PlantUML                                                     | no        | Signal lanes                                                     |
| Floor plan                          | 5     | Visio, Lucid, draw.io, Gliffy, OmniGraffle                   | no        | Out of scope                                                     |
| Byte / bit layout                   | 2     | Mermaid, PlantUML                                            | yes       | —                                                                |
| Code with callouts                  | 0     | —                                                            | yes       | Draftably only                                                   |
| Diagram diff (one source)           | 0     | —                                                            | yes       | Draftably only                                                   |

Sequence fragments (`alt`, `loop`, `opt`) are not a new type, but 9 tools have them and draftably
does not. They belong to sequence depth, which the earlier study's BET-03 already holds.

## Ranking

Score = breadth (tool count) × how often a developer needs it × fit with text-first, auto-laid-out
diagrams. Each factor is 1–5. Out-of-scope rows (charts, floor plans) are left out.

| Rank | Type                              | Breadth | Need | Fit | Score | Why                                                                                             |
| ---- | --------------------------------- | ------- | ---- | --- | ----- | ----------------------------------------------------------------------------------------------- |
| 1    | ERD with keys and crow's feet     | 5       | 5    | 5   | 125   | Every dev tool has it; schemas are text already; `cells` and row edges do half the work today   |
| 2    | Architecture icons                | 5       | 5    | 4   | 100   | The biggest look gap with Eraser, Ilograph, IcePanel; one attribute; asset bundling is the cost |
| 3    | Mind map                          | 5       | 3    | 5   | 75    | An outline is the natural text form; reuses `tree`; needs a two-sided layout                    |
| 4    | UML class                         | 5       | 3    | 5   | 75    | Compartments are cells; inheritance and composition marks already exist                         |
| 5    | C4 kinds and views                | 3       | 4    | 4   | 48    | What the paid architecture tools sell; builds on groups and `state`                             |
| 6    | UML state machine                 | 4       | 3    | 4   | 48    | Start/end pseudo-states and guards; groups give composite states                                |
| 7    | BPMN-lite on lanes                | 4       | 3    | 3   | 36    | Lanes exist; event and gateway shapes are the gap; full BPMN is a trap                          |
| 8    | Quadrant / 2×2                    | 3       | 3    | 4   | 36    | Small and self-contained; product and planning slides use it a lot                              |
| 9    | Gantt dependencies                | 3       | 3    | 4   | 36    | Timelines exist; arrows between bars and a work calendar finish it                              |
| 10   | User journey                      | 3       | 2    | 4   | 24    | Lanes plus a score row                                                                          |
| 11   | Git graph                         | 1       | 3    | 4   | 12    | Developers want it; few tools have it                                                           |
| 12   | Sankey                            | 2       | 2    | 3   | 12    | Needs width-by-value routing                                                                    |
| 13   | Venn, fishbone, kanban, wireframe | 2–4     | 1–2  | 1–2 | ≤16   | Fit is poor: fixed geometry or UI widgets, not graphs                                           |

## Top five: syntax sketches

These are sketches to react to, not designs. Each names the engine parts it would reuse.

### 1. ERD: `layout g table`

A table is a cells group with two or three columns and a header. A row can carry `mark=pk|fk|uk` (`key=` already means a timeline key).
New line ends give cardinality.

```draft
group users "users" color=blue
layout users table
node users.id "id uuid" in=users mark=pk
node users.email "email text" in=users mark=uk
node users.org "org_id uuid" in=users mark=fk

group orgs "orgs" color=teal
layout orgs table
node orgs.id "id uuid" in=orgs mark=pk
node orgs.name "name text" in=orgs

edge belongs users.org -> orgs.id tail=many head=one
```

- `layout g table` = `cells columns=1` with a name column and a muted type column split on the
  first space, and a key glyph gutter.
- New `head=`/`tail=` values: `one`, `many`, `zero-or-one`, `zero-or-many`, `one-or-many`.
  This reverses the line-ends note that crow's feet are left out on purpose, so it is a product
  decision.
- Reuses: `src/dsl/cells.ts` (rows, edges that end on one cell), `src/model/markers.ts`
  (end marks), the router's side choice for cells. `draftably import` could read Mermaid
  `erDiagram`, D2 `sql_table` and a SQL `CREATE TABLE` later.

### 2. Architecture icons: `icon=`

```draft
node api "Orders API" icon=aws/lambda
node db "Orders DB" icon=aws/dynamodb
node queue "Events" icon=aws/sqs
node gh "GitHub" icon=logos/github
```

- An icon sits left of the label (or above it with `icon-pos=top`), sized to the label's line
  height. It never moves a box more than the label would.
- Start with a small bundled set (about 60: generic server, database, queue, user, browser,
  phone, cloud, and the top AWS/GCP/Azure/Kubernetes services), as the earlier study's REC-20
  said. A file path `icon="./logo.svg"` comes later, under REC-07's asset rules.
- Reuses: node measurement in `src/model/labels.ts`, the SVG drawing in `src/cli/svg.ts` and the
  canvas node view. Exports must embed the SVG so `extract` still gives a complete file.
- Risk: license and size of provider icon sets. AWS, Azure and GCP publish theirs for use in
  architecture diagrams; check each license before bundling.

### 3. Mind map: `layout root mindmap`

```draft
node idea "Launch plan"
node mk "Marketing" parent=idea
node blog "Blog post" parent=mk
node hn "Show HN" parent=mk
node eng "Engineering" parent=idea
node docs "Docs site" parent=eng
layout root mindmap root=idea
```

- A `mindmap` engine splits the root's children to the left and right, draws curved branches
  that taper, and colors each first-level branch with its own family.
- `parent=` is shorthand for an undirected edge with no label. An outline block (indented
  lines) would be friendlier, but the DSL says indentation means nothing, so that is a bigger
  decision.
- Reuses: the `tree` engine's subtree packing in `src/engines/layout`, family colors from
  `src/model/colors.ts`, `directed=false` edges.

### 4. UML class: `shape=class`

```draft
node order "Order" shape=class fields="+id: UUID\n+total: Money" methods="+place()\n+cancel()"
node line "OrderLine" shape=class fields="+qty: int"
node entity "Entity" shape=class stereotype=abstract
edge has order -> line "1..*" tail=diamond head=none
edge is order -> entity head=open-triangle
```

- Three compartments: name (with `«stereotype»`), fields, methods. Monospace for members is a
  theme choice.
- An alternative is a group with `layout g class` and one node per member, like a table. That
  lets an edge end on a field, at the cost of more lines.
- Reuses: cells rendering for compartments, existing triangle and diamond ends, end labels
  (`1..*`) from BET-02.

### 5. C4: element kinds and views

```draft
node buyer "Buyer" kind=person
group shop "Shop" kind=system
node web "Web app" in=shop kind=container tech="SolidJS"
node api "API" in=shop kind=container tech="Node"
node pay "Stripe" kind=external

view context "System context" show=buyer,shop,pay collapse=shop
view containers "Containers" show=buyer,shop,pay
```

- `kind=` picks a C4 look: a person figure, a system box, a container with a `[tech]` line, a
  grey external box. It sets shape and color defaults; the reader still sees normal draftably.
- `view` extends today's `state` line: a state fades objects, a view hides them and collapses a
  group into one box with its edges merged. This is the earlier study's BET-05; its rule holds
  that hiding B in A→B→C must never invent A→C.
- Reuses: groups, `state` and `--states` panels, the viewer's state chips (they become view
  tabs), `src/model/panels.ts` for one export per view.

## Recommendation

Build ERD tables (1) and icons (2) first. Together they close most of the visible gap with Eraser
and Lucidchart for the diagrams developers draw most. Mind map and UML class are cheap follow-ons
that reuse `tree` and cells. C4 views are the largest and depend on the view-projection rules.

Skip wireframes, Venn, fishbone, charts and floor plans. They need fixed geometry or widgets, and
tools that do only that will always do them better.

## Sources

- [Lucidchart diagram types](https://lucid.co/diagram), [Lucidchart templates](https://lucidchart.com/pages/templates/9)
- [Miro diagramming](https://miro.com/online-diagram-and-map-maker/), [Miro cloud architecture](https://miro.com/diagramming/cloud-architecture/)
- [Visio featured templates](https://support.microsoft.com/office/27d4274b-5fc2-4f5c-8190-35ff1db34aa5)
- [Whimsical diagrams](https://whimsical.com/diagrams), [Whimsical templates](https://whimsical.com/templates)
- [Eraser diagram-as-code](https://docs.eraser.io/docs/diagram-as-code), [Eraser cloud diagrams](https://docs.eraser.io/docs/cloud-architecture-diagrams)
- [IcePanel flows](https://docs.icepanel.io/features/flows), [IcePanel flows vs UML sequence](https://icepanel.io/blog/comparison-icepanel-flows-vs-uml-sequence-diagrams)
- [Structurizr dynamic views](https://docs.structurizr.com/ui/diagrams/dynamic-view), [Structurizr Ilograph export](https://docs.structurizr.com/export/ilograph), [Structurizr deployment view](https://docs.structurizr.com/dsl/cookbook/deployment-view/)
- [Gliffy shape libraries](https://help.gliffy.com/online/Content/GliffyCommon/Shape-libraries.htm)
- [Cacoo vs Creately vs Gliffy](https://www.trustradius.com/compare-products/cacoo-vs-creately-vs-gliffy)
- [OmniGraffle Stenciltown](https://stenciltown.omnigroup.com/categories/all/?page=3)
- [Mermaid types as listed by draw.io](https://www.drawio.com/docs/manual/mermaid/mermaid-supported-diagram-types/)
- [PlantUML diagram list](https://plantuml-documentation.readthedocs.io/en/latest/diagrams/index.html)
- [D2 shape constants](https://beta.pkg.go.dev/oss.terrastruct.com/d2/d2target), [D2 0.6.2 release](https://www.d2lang.com/releases/0.6.2)
- [Napkin review, March 2026](https://dev.to/techsifted/napkin-ai-review-march-2026-turn-text-into-visuals-instantly-97i)
- yFiles, GoJS, JointJS+, Excalidraw+, tldraw and FigJam: from their sample galleries and the
  [earlier comparison](diagram-library-gaps-2026-10-27/coverage.md); not rechecked today.
