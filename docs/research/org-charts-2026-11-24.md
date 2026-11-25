# Org charts: what draftably draws today and what would fix it

Checked 2026-11-24 against draftably 0.18.0 (`8e8ab1fa`). Planning task: TASK-0081.

Draftably can draw an org chart with `layout root engine=tree root=<id>`. The docs mention it in
one cell of the engine table ("An org chart"). No example, no DSL section and no skill line cover
it. This page draws a realistic org chart today, lists what is wrong with it, compares it with
dedicated org-chart tools, and proposes changes. Nothing is built.

## The test file

23 people in five levels: a CEO with an executive assistant, three executives, directors,
engineering managers and their reports, one open role, and one dotted-line partnership. Names sit
on the first line and titles on the detail line (`"Dana Ruiz\nCEO"`). The screenshots are on PR
#643, not in the repository.

| Variant                                     | Size and shape         | `check --metrics`                 |
| ------------------------------------------- | ---------------------- | --------------------------------- |
| `engine=tree root=ceo direction=down`       | 2500×707, aspect 3.54  | 1 crossing, 37 bends, 5 warnings  |
| Same, with `fit=slide`                      | unchanged, aspect 3.54 | `fit-direction`: it cannot fold   |
| Default `flow` (no engine line)             | 1153×1106, aspect 1.04 | 1 crossing, 28 bends, 1 warning   |
| `tree`, with Engineering and Product groups | 2708×1115, aspect 2.43 | 0 crossings, 38 bends, 9 warnings |

## What is wrong today

Ordered by how much each one hurts the picture.

1. **Too wide.** Every manager's reports sit side by side, so three engineers under one manager
   add three box widths. 23 people already make a 3.5:1 strip that draws at 38% in a page column.
   `fit=slide` cannot help: the tree has no fold, and `direction=down` blocks turning it.
2. **Lines do not read as an org chart.** Each report gets its own elbow from its own port on
   the manager, at its own height (the CEO's four lines turn at two heights). Org charts use one
   bus: a stem down from the manager's center, one bar, and a drop to each report. Every
   reporting line also has an arrowhead; org charts draw none.
3. **The assistant is a peer.** The executive assistant sits beside the CTO as a fourth report,
   at the far left, 965px from the CEO (`check` warns `stranded`). Org charts hang an assistant
   off the stem between the two levels.
4. **Groups break the levels.** With department frames, the Product team drops about 450px below
   the Engineering team's level, and the controller drops to the bottom. People at one level no
   longer line up, which is the main thing an org chart promises.
5. **The default engine is the wrong shape.** With no layout line, `flow` draws the chart left
   to right with the CEO at the bottom left. It has the best aspect, but nobody reads an org chart
   that way.
6. **No open-role look.** "Open role" is only text. Tools draw a vacancy with a dashed outline.
7. **Solid color fills are heavy.** 20 saturated blue boxes read as one block. Org-chart tools
   draw white or pale cards with the team color as a stripe or a light tint, so names stay the
   loudest thing.
8. **The dotted line routes poorly.** `kind=async constraint=false` gives a dashed line, but it
   enters its target from the side against the reading direction (`backward-side`).
9. **Writing it is long.** 23 people need 23 `node` lines and 23 `edge` lines, each edge with its
   own id. The data usually exists already as an HR export (name, title, manager).

## What dedicated tools do

From Visio, Lucidchart, OrgChart JS, d3-org-chart, GoJS and yFiles samples, and HR-backed tools
(ChartHop, Pingboard, Organimi). Web sources were thin, so most of this is from product knowledge;
see [Sources](#sources).

| Feature                              | Seen in                                                                        | Draftably today                  |
| ------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------- |
| Bus connectors, no arrowheads        | All of them                                                                    | No: elbows, arrows by default    |
| Leaf reports stacked in a column     | Visio "vertical" layouts, d3-org-chart compact, OrgChart JS mixed layout, GoJS | No                               |
| Per-manager layout choice            | Visio "Arrange Subordinates"                                                   | No                               |
| Assistant on a side branch           | Visio, OrgChart JS, GoJS, SmartArt                                             | No                               |
| Vacancy / open role style            | Visio, Lucidchart, ChartHop, Organimi                                          | No                               |
| Dotted-line (matrix) reports         | Visio, Lucidchart, OrgChart JS, Pingboard                                      | Partial: dashed edge, poor route |
| Photo or initials avatar             | Lucidchart, Pingboard, ChartHop, OrgChart JS                                   | No                               |
| Team frames that keep levels aligned | Visio Team Frame, Plumsail grouping                                            | Partial: frames break levels     |
| Headcount roll-up per manager        | ChartHop, Organimi, d3-org-chart                                               | No (`count=` draws `×N` by hand) |
| Collapse below a depth, "+14" marker | d3-org-chart, OrgChart JS, Lucidchart                                          | No                               |
| Build from a CSV or HR export        | Lucidchart, Visio wizard, every HR tool                                        | No                               |

## Proposal

### 1. `layout root orgchart root=<id>`

A preset over the existing `tree` engine, so an org chart gets the right defaults without tuning:

- Bus connectors: one stem, one bar per manager at a fixed height in the gap, and a straight drop
  to each report. Reporting lines have no head.
- **Compact leaves:** a manager whose reports are all leaves stacks them in a column under the
  stem (`leaves=stack`), or in two columns either side of it (`leaves=split`). `leaves=row` is
  today's look. The default is `auto`: stack when a row would make the drawing wider than `fit=`
  asks for. For the test file this turns each row of leaf reports into a column, which should bring
  the aspect from 3.5 to under 2 (estimate, not measured).
- `fit=` works: it chooses `leaves=` per manager and, for very wide orgs, can stack a second level.
- Groups keep levels: a department frame wraps a subtree without moving its people off their
  level. This needs the tree engine to place by level across groups, then draw frames around the
  result.
- `check` notes `orgchart` when a file uses `engine=tree` on a single-root tree of people (every
  node has one incoming edge), so agents find the preset.

### 2. Roles on a node

```draft
node ea "Sam Ito\nExecutive assistant" role=assistant
node sec "Head of Security" role=vacant
```

- `role=assistant`: placed on a short side branch off the manager's stem, above the reports.
- `role=vacant`: dashed outline, muted text, and "Open role" as the detail line when the label
  has none.
- Dotted-line reports stay ordinary edges: `kind=async` with `constraint=false`. The `orgchart`
  layout routes them around the tree, never through a bus, and adds the legend line.

### 3. Person cards

- `card=tint` as the `orgchart` default: a pale card (shade 50) with a team-color stripe on top,
  name in bold, title muted. `card=solid` keeps today's look. This is a color choice only, so no
  box moves.
- Initials avatar: `avatar=on` draws a circle with the person's initials from the first line of
  the label, in the team color. A photo is later work, with the asset rules from the earlier
  study's REC-07.
- `rollup=on` adds each manager's total headcount under the title ("12 people"), counted from the
  tree.

### 4. Shorter source: `reports=`

```draft
node cto "Priya Nair\nCTO" reports=ceo color=blue
```

`reports=ceo` makes the reporting edge, so a person is one line. This is the same `parent=`
shorthand that the mind-map design kept for later. One attribute could serve both; the name is a
product call (`parent=` reads better for mind maps, `reports=` for people).

### 5. Import from a CSV

```bash
draftably import people.csv --manager manager_email --id email --label "{name}\n{title}" --output org.draft
```

It writes one `node … reports=` line per row and an `orgchart` layout line. Team color can come
from a column (`--color-by department`). This matches where org data already lives.

### 6. Large orgs

- `depth=3` on the layout line draws three levels and gives each cut manager a "+14" marker.
- `focus=cto` draws only that subtree, with the CTO's manager as a small stub above it.
- `draftably pdf` already puts one diagram per page, so a large org can be one file per
  department.

### 7. Docs and skill

- A new "Org charts" section in `docs/DSL.md`: the preset, leaves, roles, dotted lines, cards,
  department frames, CSV import and large orgs, each with a "Try it".
- `examples/org-chart.draft` built from the test file, in the examples gallery.
- One line in `skills/draftably/SKILL.md`: "For an org chart, use `layout root orgchart
root=<id>`."

## Suggested order

| Step | Change                                                         | Why first                                         |
| ---- | -------------------------------------------------------------- | ------------------------------------------------- |
| 1    | `orgchart` preset: bus lines, no heads, compact leaves, `fit=` | Fixes problems 1, 2 and 5, the biggest visual gap |
| 2    | `role=assistant`, `role=vacant`, dotted-line routing           | Small; fixes problems 3, 6 and 8                  |
| 3    | Docs section, example, skill line                              | Ship with step 1 so people find it                |
| 4    | Groups that keep levels                                        | Fixes problem 4; touches the tree engine          |
| 5    | `card=tint`, `avatar=on`, `rollup=on`                          | Polish; color-only except avatar size             |
| 6    | `reports=` and CSV import                                      | Fixes problem 9                                   |
| 7    | `depth=`, `focus=`                                             | Only matters past about 60 people                 |

## Sources

- The test file and metrics: `draftably check --metrics` and `pnpm shoot` on 0.18.0, 2026-11-24.
- [Visio: lay out the shapes in your organization chart](https://support.microsoft.com/en-us/visio/lay-out-the-shapes-in-your-organization-chart),
  [Visio: create an organization chart](https://support.microsoft.com/en-us/visio/create-an-organization-chart-in-visio)
- [d3-org-chart](https://npmjs.com/package/d3-org-chart),
  [dabeng OrgChart README](https://cdn.jsdelivr.net/gh/dabeng/orgchart@master/README.md),
  [Plumsail: group employee boxes](https://plumsail.com/docs/orgchart/v1.x/how-tos/group-employees-boxes-using-custom-fields.html),
  [DevExpress org chart compact layout](https://docs.devexpress.com/WindowsForms/DevExpress.XtraDiagram.Options.DiagramOptionsOrgChartLayout.IsCompact?v=20.2)
- [Pingboard features](https://www.g2.com/products/pingboard/features),
  [ChartHop review](https://fitsmallbusiness.com/charthop-review/)
- Lucidchart, GoJS, yFiles and OrgChart JS details are from product knowledge and were not
  rechecked today.
