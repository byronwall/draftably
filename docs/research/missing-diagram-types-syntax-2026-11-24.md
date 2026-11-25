# Syntax options: database tables, icons, mind maps

Checked 2026-11-24 against draftably 0.18.0 (`8e8ab1fa`). Planning task: TASK-0081.

Byron picked three types from the [survey](missing-diagram-types-2026-11-24.md): database
diagrams with crow's feet, icons in boxes, and mind maps. This page compares syntax options for
each, and says how well each one fits the parts draftably already has. It is a proposal. Nothing is
built.

## What the code already has

Four existing parts decide most of the choices below.

- **Heredoc bodies.** `node sql "q" shape=code <<SQL … SQL` already parses a multi-line body
  (`src/dsl/syntax.ts`). Only code nodes take one today; a group with a body is an error.
- **Dotted sub-ids from a body.** `range sql.scan1 lines=3-5` gives part of a code node an id
  that `edge`, `note near=` and `state` accept. So "a line of a body has an id" is already a
  language idea.
- **Cells.** `layout g cells columns=N` draws a group's nodes as one object, lines can end on one
  cell, change marks work per cell, and the Editor reorders cells by writing an `order` line
  (`src/dsl/cells.ts`).
- **A two-sided tree layout.** `bilateralTarget` in `src/engines/layout/trees.ts` already puts a
  center node in the middle and balances its branches left and right. It runs when the layout
  intent has a start with `placement: 'center'`. No DSL word reaches it yet.

## One rule for two of the three

Database tables and mind maps want the same thing: many short members, written as text, that
still become real nodes. One rule covers both:

> **A heredoc body on a group lists its members, one per line. The group's `layout` line decides
> how they draw.**

Each body line compiles to an ordinary node with the id `group.name`. Edges, notes, states,
change marks, colors and links then work on members with no new code. The body is only shorter
input. This reuses the heredoc parser, and it lifts the "a group takes no body" error.

## 1. Database tables

**Decision:** how to write a table's columns and the lines between tables.

| Option                                                                 | Example                                    |
| ---------------------------------------------------------------------- | ------------------------------------------ |
| A. One `node` line per column in a cells group (today, plus `mark=pk`) | `node users.id "id uuid" in=users mark=pk` |
| B. A body on the group, one column per line                            | `id uuid pk`                               |
| C. Paste SQL `CREATE TABLE` and parse it                               | `CREATE TABLE users (id uuid PRIMARY KEY…` |

Scores, 0–10, higher is better:

| Option     | Paste an existing schema | Line ends on one column | Per-column change marks | Editor reorder and Inspector | Main tradeoff                                                    |
| ---------- | -----------------------: | ----------------------: | ----------------------: | ---------------------------: | ---------------------------------------------------------------- |
| A. Nodes   |                        2 |                      10 |                      10 |                            9 | Works today, but one long line per column; nobody writes ERDs so |
| B. Body    |                        8 |                       9 |                       7 |                            5 | Reads like `\d users`; the Editor must rewrite body text         |
| C. SQL DDL |                       10 |                       8 |                       3 |                            2 | Best paste, but SQL dialects are a large parser to own           |

- A scores 10 on line ends and marks because cells already do both. Its paste score is low: a
  20-column table is 20 `node` lines with `in=`.
- B gets line ends from the "body line is a member" rule. Change marks come from a leading
  `+`, `-` or `~` on a body line, the same marks as file lines. The Editor gap is real: dragging a
  row must edit the body, not write an `order` line. Assumption: the source-edit code can rewrite
  one body line in place.
- C infers foreign-key lines for free, but `ALTER TABLE`, quoting and dialects make it an
  importer's job, not the language's.

**Choice:** B for the language, C as an importer (`draftably import schema.sql` writes B).

```draft
group users "users" color=blue <<T
  id        uuid        pk
  email     text        uk
  org_id    uuid        fk -> orgs.id
  created   timestamptz
T
layout users table

group orgs "orgs" color=teal <<T
  id    uuid  pk
  name  text
T
layout orgs table

# An explicit edge still works, and can override the inferred one:
edge member users.org_id -> orgs.id tail=many head=one "belongs to"
```

- A line is `name type [pk|fk|uk|nn]… [-> table.column]`. Two or more spaces, or a tab, split
  the parts, as code tables already do.
- `-> orgs.id` makes an edge with id `users.org_id`, `tail=many head=one`. A written `edge` with
  the same ends replaces it.
- `layout g table` is `cells columns=1` with three tracks: a key gutter (a key glyph for `pk`,
  a link glyph for `fk`), the name, and a muted type column.
- New line ends: `one`, `many`, `zero-or-one`, `zero-or-many`, `one-or-many`. This reverses the
  note in `DSL.md` that crow's feet stay out. The marks join `src/model/markers.ts`, so the
  canvas, SVG and legend draw them from one definition.
- **Watch:** the Editor's row drag and Inspector edits now write into a body. If that is too much,
  ship the body as read-only in the Editor first, like code bodies are.

## 2. Icons in boxes

**Decision:** which icon set draftably ships, and how a file names an icon.

| Option                                          | Names                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| A. Lucide by default, any Iconify set by prefix | `icon=database`, `icon=logos:aws-lambda`, `icon=ph:cloud-duotone` |
| B. A small curated draftably set (about 60)     | `icon=database`, `icon=aws/lambda`                                |
| C. Phosphor by default                          | `icon=database`, `icon=database-duotone`                          |
| D. Any file or URL                              | `icon="./lambda.svg"`                                             |

Facts from the Iconify API and npm today:

| Set                           | Icons | JSON size | License                        | Notes                                                          |
| ----------------------------- | ----: | --------: | ------------------------------ | -------------------------------------------------------------- |
| Lucide (`lucide`)             | 2,104 |    694 KB | ISC                            | 2px stroke on 24×24, like the Editor's own icons; shadcn's set |
| Phosphor (`ph`)               | 9,072 |    4.6 MB | MIT                            | 1,512 shapes × 6 weights (thin to duotone)                     |
| Tabler (`tabler`)             | 6,563 |    2.3 MB | MIT                            | Stroke icons, larger set                                       |
| Logos (`logos`)               | 2,093 |    8.8 MB | CC0 file; marks are trademarks | Color logos, includes 66 `aws-*` services                      |
| Simple Icons (`simple-icons`) | 3,472 |    4.8 MB | CC0 file; marks are trademarks | One-color brand marks                                          |

A subset of `logos` (AWS, Google Cloud, Azure, Kubernetes, and about 20 common products) is 120
icons and 288 KB.

| Option             | Find a name without our docs | Architecture nouns and cloud services | Recolors with the theme | Export carries the icon | Added `npx` download |
| ------------------ | ---------------------------: | ------------------------------------: | ----------------------: | ----------------------: | -------------------: |
| A. Lucide + prefix |                            9 |                                     8 |                       9 |                      10 |                    8 |
| B. Curated         |                            5 |                                     4 |                      10 |                      10 |                   10 |
| C. Phosphor        |                            8 |                                     8 |                       8 |                      10 |                    5 |
| D. File or URL     |                            4 |                                    10 |                       3 |                       3 |                   10 |

- **Find a name:** lucide.dev and icones.js.org search every Iconify set and show the name to
  copy. Lucide is the set most web developers already know. A curated set means reading our list.
- **Cloud services:** Lucide has `database`, `server`, `cloud`, `smartphone`, `users`, `lock`,
  `cpu`, `container`, `bot`; it has no `queue` (use `list-ordered` or `inbox`). It has no vendor
  logos, so A needs the `logos:` subset for `aws-lambda`.
- **Recolor:** a one-color icon draws in the node's ink color, so Blueprint and dark pages work.
  Color logos keep their own colors and can clash with a dark theme. D cannot be recolored at all.
- **Export:** A, B and C embed the path data of only the icons used, so SVG and PNG exports and
  `extract` stay complete with no network. D has the asset problem the earlier study's REC-07
  describes.

**Choice:** A. Lucide is the default set, so a bare name works. Any Iconify set works with its
prefix. Ship Lucide and the 288 KB vendor subset; read any other `@iconify-json/<set>` package if
it is installed in the project (`pnpm add -D @iconify-json/ph`), so the CLI never fetches.

```draft
node web "Web app" icon=monitor
node api "Orders API" icon=logos:aws-lambda
node db "Orders DB" icon=database color=violet
node q "Order events" icon=inbox
node buyer "Buyer" icon=user icon-pos=top

group vpc "Production VPC" icon=logos:aws color=slate
legend violet "Data stores" icon=database
```

- `icon=` works on a node, a group (in its title band) and a legend entry.
- `icon-pos=left` (default) puts it before the label at the label's line height. `icon-pos=top`
  draws it large over the label, the tile look of AWS and Ilograph diagrams.
- An icon is content, like label text: it has the same size in every theme, so the rule "colors
  never move a box" still holds.

To make choosing very easy:

1. **Editor autocomplete with pictures.** Typing `icon=da` shows `database`, `database-backup`,
   `database-zap`, each with its icon. CodeMirror autocomplete is already a dependency.
2. **An icon picker in the Inspector.** A search box over the installed sets that writes `icon=`.
3. **`draftably icons <word>`** prints matching names from every installed set, so an agent can
   pick one.
4. **`check` suggests a name.** `icon=postgres` → "No icon `postgres` in lucide. Did you mean
   `logos:postgresql` or `database`?"
5. **Later, `icon=auto`:** choose from the label ("Postgres" → `logos:postgresql`, "Queue" →
   `inbox`). Keep it opt-in, because a wrong guess looks worse than no icon.

**Watch:** brand logos are trademarks, even where the file is CC0. Drawing a vendor's logo to name
its service is the normal use, but read the AWS, Google Cloud and Azure icon terms before shipping
the subset.

## 3. Mind maps

**Decision:** how to write the tree of topics.

| Option                                         | Lines for 20 topics |
| ---------------------------------------------- | ------------------: |
| A. `node` and `edge` lines, `layout … mindmap` |            about 41 |
| B. A `parent=` attribute on each `node`        |            about 21 |
| C. An indented outline in a group body         |    about 21, no ids |

| Option     | Paste an outline (Markdown bullets, Mermaid `mindmap`) | Edges and notes from a topic to other boxes | Ids survive a rename | Main tradeoff                                         |
| ---------- | -----------------------------------------------------: | ------------------------------------------: | -------------------: | ----------------------------------------------------- |
| A. Edges   |                                                      2 |                                          10 |                   10 | Exact, but twice the lines and hard to read as a tree |
| B. parent= |                                                      3 |                                          10 |                   10 | One new attribute; still one `node` line per topic    |
| C. Outline |                                                     10 |                                           7 |                    5 | Reads like notes; ids come from the text by default   |

- C scores lower on ids because a topic's default id is a slug of its text: renaming "Marketing"
  changes `plan.marketing` and breaks an edge that names it. An optional `{id}` at the end of a
  line fixes this where it matters, and `check` names the unknown id with a suggestion.
- The layout is the same for all three, so it does not decide the choice: `layout g mindmap`
  sets the body's first line as the center and calls the existing `bilateralTarget`.
- "Indentation means nothing" stays true for the file. Inside a body, indentation is the body's
  own format, as it already is for code.

**Choice:** C, on the same group-body rule as tables. A and B keep working, since body lines are
ordinary nodes.

```draft
group plan "Launch plan" <<M
  Launch plan
    Marketing
      Blog post
      Show HN {hn}
    Engineering
      Docs site
      Pricing page
    Support
      FAQ
M
layout plan mindmap

node forum "Community forum"
edge hn-forum plan.hn -> forum "links to"
```

- The one line at the least indent is the center. Each deeper line is a child of the line above
  it with less indent. Markdown bullets (`-`, `*`) are allowed and dropped.
- Lines are undirected edges with no head (`directed=false`), drawn as curves that taper from
  the center. Each first-level branch takes its own color family in turn, unless the line says
  `color=`.
- Ids: `plan.launch-plan`, `plan.marketing`, `plan.blog-post`, and `plan.hn` from `{hn}`.
- `import mindmap.mmd` and `migrate` can convert Mermaid `mindmap` fences into this, since that
  format is also an indented outline.
- **Watch:** curved, tapered branches are a new edge style in both the canvas and SVG paths.
  Start with the existing rounded orthogonal lines if that is too large for the first slice.

## Summary

| Type      | Choice                                        | New language                                       | Reuses                                                                |
| --------- | --------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------- |
| Tables    | Group body, one column per line; SQL importer | Group bodies, `layout g table`, 5 crow's-feet ends | Heredoc parser, cells, line ends, cell-to-cell routing, change marks  |
| Icons     | Lucide by default, any Iconify set by prefix  | `icon=`, `icon-pos=`                               | Node label measurement, SVG path drawing, autocomplete, `check` hints |
| Mind maps | Group body as an indented outline             | Group bodies, `layout g mindmap`, `{id}`           | Heredoc parser, `bilateralTarget`, undirected edges, family colors    |

Suggested order: icons first (smallest, and the largest visible change), then group bodies with
tables, then mind maps on the same body rule.

## Sources

- Icon counts and licenses: the Iconify API (`api.iconify.design/collection?prefix=…`) and
  `pnpm view @iconify-json/<set>` on 2026-11-24. The vendor subset size was measured from
  `iconify/icon-sets` `json/logos.json`.
- Code seams: `src/dsl/syntax.ts`, `src/dsl/cells.ts`, `src/engines/layout/trees.ts`,
  `src/engines/layout/arrange.ts`, `src/model/markers.ts`, `docs/DSL.md` at `8e8ab1fa`.
- Line counts for mind maps are estimates for a 20-topic map, not measured on a real file.
