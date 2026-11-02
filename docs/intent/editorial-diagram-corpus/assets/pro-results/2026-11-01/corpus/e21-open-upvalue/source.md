# E21: Open upvalue and closure object graph

- Publisher: Crafting Interpreters
- Author: Robert Nystrom
- Publication: unknown
- Access: 2026-11-02 (UTC)
- Original page: https://craftinginterpreters.com/closures.html
- Exact image source: https://craftinginterpreters.com/image/closures/open-upvalue.png
- Figure: open-upvalue.png
- Observed license: CC BY-NC-ND 4.0 for PNG illustrations; explicit repository LICENSE
- Original SHA-256: `a4d278565b2493558ad2bd35f4f0478633d7159f5dd6292e1c028f05bfa12297`
- Original: `reference.png` (32,687 bytes)
- Preview: Original raster flattened onto white with aspect and complete content unchanged.

## Selection judgment

Field-level reference circles, irregular hand-drawn records and a long returning pointer explain aliasing while retaining the physical order of fields. The compact branch/back-reference composition challenges automatic routing.

- Pattern families: memory layout, cells, pointer graph, annotation
- Principal objects: 16 (editorial count, not engine node count)
- Reading path: Stack function points to closure; closure branches to function metadata and upvalue array; upvalue points back to stack slot a.
- Confirmation case: false. Audited now; may inform proposed future improvements.

## Attribution and interpretation

The real downloaded reference remains intact. Native attempts reinterpret its explanatory content; long explanatory prose is paraphrased, retaining the facts and relationships. Any representational loss is recorded in `audit.md`. No permission to publish is inferred from public availability. Original reference retention is for this requested study; publication review belongs to Codex.
