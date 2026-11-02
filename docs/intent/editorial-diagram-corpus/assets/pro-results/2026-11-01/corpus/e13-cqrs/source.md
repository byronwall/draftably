# E13: CQRS: separate query and command models

- Publisher: Martin Fowler
- Author: Martin Fowler
- Publication: 2011-07-14
- Access: 2026-11-02 (UTC)
- Original page: https://martinfowler.com/bliki/CQRS.html
- Exact image source: https://martinfowler.com/bliki/images/cqrs/cqrs.png
- Figure: cqrs.png
- Observed license: unknown; article footer © Martin Fowler
- Original SHA-256: `38a9da39997f4508f0ef57eef8187f881ee597cbefff41749cf9920203f401c5`
- Original: `reference.png` (148,223 bytes)
- Preview: Original raster flattened onto white with aspect and complete content unchanged.

## Selection judgment

A compact U-shaped story separates read and write responsibility. Small internal model graphs and handwritten leader notes explain the abstraction at two levels.

- Pattern families: architecture, comparison panels, annotation leaders, request/data flow
- Principal objects: 13 (editorial count, not engine node count)
- Reading path: Database → query model → UI across the top; UI → command model → database across the bottom.
- Confirmation case: false. Audited now; may inform proposed future improvements.

## Attribution and interpretation

The real downloaded reference remains intact. Native attempts reinterpret its explanatory content; long explanatory prose is paraphrased, retaining the facts and relationships. Any representational loss is recorded in `audit.md`. No permission to publish is inferred from public availability. Original reference retention is for this requested study; publication review belongs to Codex.
