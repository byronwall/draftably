---
'draftably': minor
'@draftably/runtime': minor
'@draftably/editor': minor
'@draftably/mermaid': minor
---

Add timelines: `layout <group> timeline` places nodes on a real date axis as rows in bands, with open, unknown-start and partial-step spans, milestone rules, a today rule, a generated legend and an optional zoom panel. A timeline sits beside ordinary boxes, and lines join its rows to them.

Mermaid `gantt` charts and dated `timeline` charts now import as native timelines: `draftably import`, `draftably migrate` and the `@draftably/mermaid` drop-in keep Mermaid's computed dates and draw `after` dependencies as arrows.
