# Independent review of infrastructure cases E01–E10

Reviewed all ten final full `comparison.png` sheets, final `v2.draft` files, `review.json` ratings and narrative `audit.md` dimensions/iteration evidence. This was a second visual/source review, not a second renderer implementation. No native stage was edited.

## Findings requiring qualification

1. **E05, response-style legend.** The final note says solid arrows mean request/invocation and dashed arrows mean the response path. However, `edge lambda_return lambda -> api constraint=false from=right to=left` is solid. The HTTP duplex exchange is preserved in direction, and the TCP client-response path is explicitly labeled/dashed, but the broad legend has an exception. The audit should acknowledge that exception and avoid an unqualified semantic-completeness 5; a conservative 4 is reasonable. This is an authored encoding ambiguity, distinct from the real absence of per-edge color/two-headed arrows. No source change is requested after the cycle limit.

2. **E08, record-stack meaning.** The original record panels have thin stacked plates. It is reasonable to read these as collection/record multiplicity; that interpretation is an inference, not an explicit count in the source. The audit currently describes absent stacks with “decorations” and gives semantics 5 in all stages. Prefer acknowledging the lost collection cue and qualifying the score, or explicitly state that semantic completeness is restricted to the illustrated schema, named customer, six field/value identifiers and two reads. Semantic 4 is a conservative alternative. Do not imply a count of underlying records from the number of visible plates.

3. **Authoring scale versus missing controls.** E03 uses 1200-unit bands, E04 repeats 620-unit minimum panel heights, E05 spans 1480 units with large 200–330-unit component widths, and E08 retains a 360-unit left panel and a comparison at y=480. These choices contribute directly to small text at equal publication width. The missing independent font/label controls are real, but a statement that “the renderer made the text small” would overstate causation. Existing audits mostly acknowledge the oversized panels; keep this explicit in the combined gap narrative.

These points were sent to `/root` and `/root/infra_corpus` for disposition. They do not require another native trial.

## Per-case disposition

| Case | Independent result |
|---|---|
| E01 TLS | Semantic 4 is appropriately qualified: six flights survive, but ACK/ClientHello spans a TCP/TLS boundary and native rows do not encode transit time. v0 readability “comparable” is defensible because names/directions are clear. |
| E02 retries | Semantic 5 for v2 is defensible. Equal-width event boxes have x positions 0,120,240,480,960 in all three client scopes, preserving simultaneous columns and 1:1:2:4 interval ratios. Missing continuous tracks/guides affect visual grammar and authoring cost, not the explicit timing data. |
| E03 Blackbird | Semantic 5 for refined versions is defensible: eight labels, four shards, search containment and both support captions remain. No dependency arrows were invented. Small text is partly author-selected wide geometry. |
| E04 migration | Semantic 5 is defensible: all four states and nineteen component instances remain; Pause intentionally removes one output and Reroute reverses replication. Pill versus cylinder is an acknowledged fidelity/symbol difference in a clearly named database context. |
| E05 Fluid | Qualify solid/dashed legend exception as above; per-edge colors and duplex geometry are accurately reported missing. The audit correctly records the dark-note failure and native swatch workaround. |
| E06 Chrome | Semantic 3 correctly accounts for missing illustrated thread/responsibility content. The audit is candid that v1 communicates better than the restored tall v2, and preserves the failed negative-pin third cycle. |
| E07 HTTP/2 | Semantic 5 for refined versions is defensible: three resource paths versus a single bundle and bidirectional meaning remain through paired edges and explicit titles. Do not confuse doubled route count with a change in TCP connection count. Quality 3/fidelity 3 reflect the visual cost. |
| E08 record compare | Qualify lost stack/collection cue as above. Named schema and both reads remain; type hierarchy and record compactness are materially weaker. |
| E09 journal | Semantic 4 correctly limits the claim: memberships and incremental fading remain, but geometry, overlap, octagon/freeform shape and current-state border are substituted. No inappropriate semantic 5. |
| E10 security | Semantic 5 is defensible: three layers, nine component titles and nine mechanism captions are present, with no invented edges. Notes-as-captions are a supported, visibly approximate workaround. |

The final checked review/audit cycle counts agree: E05/E06/E08/E09 have three cycles; the other six have two. Earlier review files were being updated while this review began; only the final agreement is used here.

## Adjacent detail verification

All 24 adjacent crop rectangles (reference, v0 and v2 for E23–E30) were checked against the intrinsic PNG dimensions: positive dimensions, nonnegative origins, and no right/bottom overflow. All eight generated `details/comparison.png` sheets were then viewed.

- E23 shows the supernova remnant branch and returned material; native layout differences require a broader v0 crop.
- E24 shows the atmospheric evidence and positive/negative collectors, exposing default ellipse wrapping.
- E25 shows groundwater, soil and human-use geography against the reduced abstract network.
- E26 shows the first diamond, source sloped phase words and the composite native-label compromise.
- E27 shows the technical recovery loop hierarchy and its native orthogonal replacement.
- E28 shows the Croydon loop, overlapping service colors, stop symbols and the disconnected native text-node segments.
- E29 shows severity branches and icon-plus-prose versus box treatment.
- E30 shows the continuous interphase band versus the visibly split native soft tint.

The crops are meaningful diagnostic details. They sometimes clip neighboring context at their edges, as expected for details; every complete reference/native image and full comparison remains available. No crop conceals the principal missing mechanism. No corrective detail render is required from this review.

## Final disposition from infrastructure owner

The infrastructure owner incorporated both qualifications without editing native sources: E05 v2 semantic completeness is now 4 with the neutral HTTP duplex legend exception stated; E08 semantic completeness is 4 throughout and the possible collection/record multiplicity cue is acknowledged. E03/E04/E05/E08 audits now explicitly separate chosen oversized panels from missing local text controls. The findings above remain as the review trail, with these dispositions resolving the requested audit changes.
