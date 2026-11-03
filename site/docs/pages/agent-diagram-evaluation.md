# Agent diagram comparison

Three identical diagram tasks, five native formats, fifteen actual agent outputs. This draft evaluation is awaiting its browser-rendering and image-review results.

## Scope

The same workflow, grouped architecture and cyclic state-machine prompts were assigned to
independent agent contexts using Mermaid, Draftably, D2, Graphviz DOT and raw SVG. Each had one
response, a 200-line limit, a short format reference and no renderer feedback.

All fifteen initial sources are preserved. The local native Draftably, D2 and Graphviz attempts
rendered successfully. Browser rendering is pending CI because the local execution sandbox blocks
new Chromium processes. This is an environment limitation, not a language failure.

The source audit found the required nodes, directed edges, labels and memberships in all fifteen
sources. That manual agent judgment does not prove visible correctness. The final comparison will
show actual images and their review findings before drawing conclusions.

[Read the protocol](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/PROTOCOL.md),
[exact prompts](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/tasks.json)
and [source/evidence instructions](https://github.com/byronwall/draftably/blob/main/docs/evaluations/agent-diagrams/README.md).

## Limits

Nine cells were generated before a maintenance interruption and six afterward. Model ID and
configuration continuity could not be verified. One sample per cell, curated references and
non-blinded review limit generalization. No cost, speed or overall winner claims are made.
