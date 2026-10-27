---
title: 'Interactive links and emphasis states — shape brief'
slug: 'diagram-emphasis'
phase: shape
status: current
last_updated: '2026-10-26'
---

# Interactive links and emphasis states — what we are adding

**Outcome:** Linked objects look and act like links, and one file can draw itself in named emphasis
states without moving anything.

**Primary flow:** Agent writes `href=` and `state` lines → reader opens links and steps through
states in the viewer → `inspect --svg --state` or `--states` for static output.

## Feature scope

```text
Links and emphasis
├── PLANNED ADDITIONS
│   ├── Links in the viewer (first)
│   │   ├── ↗ mark at the node's top-right, in the node's ink; title icon stays left
│   │   ├── Open chip on hover and selection; Inspector "Open link"
│   │   ├── URL or GitHub link → browser tab, as written
│   │   ├── .draft → open in the viewer
│   │   └── File path → editor, from the git root; path:42 and path:42:5 open at the line
│   ├── File settings and agent help
│   │   ├── config link-base=".." editor=cursor  (one line or several; last duplicate wins, warned)
│   │   ├── check warns on a missing file and suggests a likely path; the link stays as written
│   │   └── Skill: when to add href, root-relative paths, path:line
│   ├── Links in static SVG (decent first guess)
│   │   ├── Same mark; <a>, <title> with the target, CSS hover, data-id
│   │   └── Browser SVG export keeps <a> (it drops it today)
│   ├── Emphasis states
│   │   ├── state id "label" ids…  (listed objects are the focus; repeat the line to append)
│   │   ├── Focus: own colors, 2px border; an edge between two focused nodes is focused
│   │   ├── Rest fades like a `.` context line; rest=plain keeps it readable
│   │   └── check errors on unknown IDs
│   ├── CLI: inspect --svg --state id; --states draws one aligned panel per state
│   └── Viewer: state chips top-center (All · states · Grid); [ and ] step in file order
└── LATER POSSIBILITIES
    ├── Multi-file sheets or boards; overlays
    └── Editing states in the viewer; captions; playback
```

## Behavior

| Situation                                | Expected result                                                         |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| A relative href                          | Resolve from the git root of the `.draft`; outside a repo, its folder.  |
| `config link-base=".."`                  | Resolve from that folder, relative to the `.draft`.                     |
| The file is missing at the base          | `check` warns with its line and suggests a unique match. No silent fix. |
| An href is a URL                         | Open it as written. Never rewrite an agent's URL.                       |
| A state lists a group                    | The group and all its members are in focus.                             |
| A focused node sits in an unlisted group | The frame stays plain, so the context reads.                            |
| A file has change marks and states       | Hue still means change; the state adds fade and border weight only.     |
| A file has states, no flag               | `inspect --svg` draws the plain diagram.                                |
| `--states` on a file with `compare`      | Error for now: one panel axis at a time.                                |
| Viewer edit while a state is active      | Edits work on every object; dimmed objects stay selectable.             |

## Examples

Proposed syntax; spelling is settled while extending the parser:

```text
config editor=cursor
node api "API gateway" href="src/api/routes.ts:42"
node orders "Orders" href="src/orders/service.ts"
node docs "Runbook" href="https://github.com/org/repo/blob/main/RUNBOOK.md#L10"
node db "Postgres"
node cache "Redis"
edge persist orders -> db "persist"

state write "Write path" api orders db
state read "Read path" api cache
state hot "Hot path" api orders rest=plain
```

## DSL shape: consider and contrast

Decision: how an agent declares which objects each state emphasizes.

| Approach                                    | Lines per new state | Reads at a glance | Fits diff layer | Survives ID edits |
| ------------------------------------------- | ------------------: | ----------------: | --------------: | ----------------: |
| A. `state id "label" ids…` (one line)       |                   9 |                 8 |               9 |                 7 |
| B. `tags=` on objects + `state id tag=…`    |                   5 |                 5 |               8 |                 8 |
| C. `emphasis=write,read` on each object     |                   3 |                 4 |               7 |                 9 |
| D. CLI flag only (`--focus a,b`)            |                  10 |                 2 |               6 |                 3 |
| E. Mark characters (`*node api`), one state |                   8 |                 9 |              10 |                 9 |

**Choice:** A, painted like E's marks. One line per state keeps agent edits local, and the parser
already reads ID lists (`order`, `align`). B and C touch every member line; D is not saved; E allows
one state only.

## Decisions and boundaries

**Appetite:** Six small PRs. No new renderer, no layout change, no walkthrough.

**Key decision:** One treatment layer. `status.ts` grows from "change status" to "how an object is
painted": diff status, focus and dim. The canvas, the CLI SVG and the legend change together.

**Key decision:** Viewer links get the careful path resolution. Static SVG takes a first guess:
hrefs relative to the `.draft`'s folder, which is right when the SVG sits beside it.

**Key decision:** `--states` generalizes the `compare` panel code from two panels to N. States
share geometry, so all panels share one routing pass.

**First proof:** Open a root-relative `path:line` link from a `.draft` in a subfolder of this repo.

**Try:** `pnpm draftably open docs/intent/diagram-emphasis/links.draft` and click each link kind.

**Observe:** The editor opens at the line; URLs and `.draft` links open as written.

**Decide:** If the git-root guess is wrong for real nested diagrams, make `config link-base` more
prominent in the skill before adding SVG rewriting.

See the [implementation plan](implementation-plan.md).
