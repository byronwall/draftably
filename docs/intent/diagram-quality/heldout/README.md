# Held-out diagrams

Two or three fresh diagrams are added here each round, written by the corpus rules and run once
after that round's fixes. Never tune against them. Run them with the same script:

```bash
node scripts/diagram-audit.mjs docs/intent/diagram-quality/heldout tmp/audit/rN-heldout
```

| Added in | Diagram                                             | Source repo         | Kind / layout / color                                       |
| -------- | --------------------------------------------------- | ------------------- | ----------------------------------------------------------- |
| Round 2  | [exploreda-linked-filter](exploreda-linked-filter/) | explorEDA           | data flow, layered down, semantic / signal                  |
| Round 2  | [regionshot-capture](regionshot-capture/)           | whiteboard          | state lifecycle, flow right, shade ramp / fieldnotes        |
| Round 2  | [ufw-flow-render](ufw-flow-render/)                 | user-flow-workbench | nested architecture, compound-flow, custom brand / graphite |
