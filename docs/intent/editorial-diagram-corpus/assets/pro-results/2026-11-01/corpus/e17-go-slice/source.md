# E17: Go slice descriptor and backing array after reslicing

- Publisher: The Go Blog
- Author: Andrew Gerrand
- Publication: 2011-01-05
- Access: 2026-11-02 (UTC)
- Original page: https://go.dev/blog/slices-intro
- Exact image source: https://go.dev/blog/slices-intro/slice-2.png
- Figure: slice-2.png
- Observed license: unknown; exact figure-specific reuse license not verified
- Original SHA-256: `c0008f5a935182449cf759305bfcb4a11fc6f722a89878fda7c13d77c6bfb235`
- Original: `reference.png` (7,220 bytes)
- Preview: Original raster flattened onto white with aspect and complete content unchanged.

## Selection judgment

Two perpendicular memory strips distinguish the descriptor from storage. Muted per-field colors and a stronger two-cell range show length versus remaining capacity with minimal text.

- Pattern families: memory layout, cells, interior cell reference
- Principal objects: 10 (editorial count, not engine node count)
- Reading path: Three-field vertical slice descriptor points to the third cell in a five-byte horizontal array.
- Confirmation case: false. Audited now; may inform proposed future improvements.

## Attribution and interpretation

The real downloaded reference remains intact. Native attempts reinterpret its explanatory content; long explanatory prose is paraphrased, retaining the facts and relationships. Any representational loss is recorded in `audit.md`. No permission to publish is inferred from public availability. Original reference retention is for this requested study; publication review belongs to Codex.
