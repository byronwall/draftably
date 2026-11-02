# Held-out diagrams

Two or three fresh diagrams are added here each round, written by the corpus rules and run once
after that round's fixes. Never tune against them. Run them with the same script:

```bash
node scripts/diagram-audit.mjs docs/intent/diagram-quality/heldout tmp/audit/rN-heldout
```

| Added in | Diagram                                                 | Source repo            | Kind / layout / color                                           |
| -------- | ------------------------------------------------------- | ---------------------- | --------------------------------------------------------------- |
| Round 2  | [exploreda-linked-filter](exploreda-linked-filter/)     | explorEDA              | data flow, layered down, semantic / signal                      |
| Round 2  | [regionshot-capture](regionshot-capture/)               | whiteboard             | state lifecycle, flow right, shade ramp / fieldnotes            |
| Round 2  | [ufw-flow-render](ufw-flow-render/)                     | user-flow-workbench    | nested architecture, compound-flow, custom brand / graphite     |
| Round 3  | [annotations-modules](annotations-modules/)             | vsc-code-annotations   | module tree, tree down, many families / signal → fieldnotes     |
| Round 3  | [coolify-restic-backup](coolify-restic-backup/)         | coolify-backup-scripts | ops runbook with a loop, flow right, accent / midnight          |
| Round 3  | [tasks-trpc-request](tasks-trpc-request/)               | tasks-trpc             | request path, compound-flow, nested groups, by group / mulberry |
| Round 3  | [v2ctx-pipeline](v2ctx-pipeline/)                       | video-to-context       | data pipeline, layered down, semantic / graphite                |
| Round 5  | [recipes-kroger-cart](recipes-kroger-cart/)             | recipes-modern         | request path, layered right, groups, custom brand / fieldnotes  |
| Round 5  | [chess-practice-modules](chess-practice-modules/)       | chess-practice         | dependency map, stress, shade ramp / signal → midnight          |
| Round 5  | [annotator-credit-checkout](annotator-credit-checkout/) | image-annotator        | payment lifecycle, default → flow down, none / mulberry         |

Round 5's three have v0, e1 and e2. The earlier seven have v0 and e1.
