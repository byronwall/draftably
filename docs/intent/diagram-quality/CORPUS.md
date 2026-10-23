# Corpus plan

15 diagrams from five repositories on disk. Each row is a folder under `corpus/` with `v0.draft`,
two follow-ups (`e1.draft`, `e2.draft`) and `requests.md`. All 15 were written for round 1.

| #   | Slug                      | Repo               | Kind                  | Layout                   | Color strategy / theme       | Follow-ups              |
| --- | ------------------------- | ------------------ | --------------------- | ------------------------ | ---------------------------- | ----------------------- |
| 1   | srcly-scan-lifecycle      | srcly              | request flow          | layered right            | by group / graphite          | grow, place             |
| 2   | srcly-release             | srcly              | release pipeline      | flow down                | shade ramp / signal          | branch + recolor, theme |
| 3   | draftably-file-session    | diagram-studio     | process with a cycle  | layered down             | custom brand / mulberry      | branch, relayout        |
| 4   | srcly-add-metric          | srcly              | dev process           | flow right               | accent / fieldnotes          | grow, relabel           |
| 5   | srcly-node-tree           | srcly              | hierarchy             | tree                     | shade ramp / graphite        | grow, recolor           |
| 6   | hn-offline-architecture   | hn-client          | architecture, nested  | compound-flow            | semantic / graphite          | drag (viewer) → grow    |
| 7   | hn-reading-flow           | hn-client          | user flow             | default (no layout line) | none / fieldnotes            | branch, relayout        |
| 8   | hn-deploy                 | hn-client          | deploy topology       | groups with grid         | by group / midnight          | drag (viewer) → grow    |
| 9   | visual-notes-architecture | visual-notes       | architecture          | compound-flow            | many families / graphite     | drag (viewer) → grow    |
| 10  | visual-notes-ingest       | visual-notes       | data pipeline         | layered right            | accent / signal              | relabel, branch         |
| 11  | visual-notes-mcp-call     | visual-notes       | agent tool call       | flow right, groups row   | semantic / mulberry          | place, recolor          |
| 12  | draftably-ci-checks       | diagram-studio     | CI / test pipeline    | layered right            | semantic (fail red) / signal | branch, relayout        |
| 13  | draftably-code-layers     | diagram-studio     | dependency map        | stress                   | shade ramp / fieldnotes      | drag (viewer) → grow    |
| 14  | pgm-cli-context           | product-grid-mgmt  | CLI ↔ server ↔ data   | force                    | none / mulberry              | grow, relabel           |
| 15  | decisory-session          | llm-question-asker | LLM consultation loop | flow right with cycles   | custom brand / midnight      | drag (viewer) → grow    |

Five diagrams take one follow-up through the viewer (drag, then grow from the saved file), so the
`stay` anchoring path is tested. Their color follow-ups move to the source-edit diagrams.

Coverage check: every preset theme appears at least twice; every color strategy at least once;
layouts cover flow (right, down, default), layered (right, down), compound-flow, tree, grid,
stress and force; follow-up kinds cover grow, branch, relabel, regroup, place, relayout, recolor.
