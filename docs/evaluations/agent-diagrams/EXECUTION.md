# Execution record and deviations

The protocol was committed as `2997711` before initial generation. Renderer source remains the
pinned product baseline `afac5d088a8b5a5791373a66300a869a62ee1af5`; the later commit only adds
protocol material. The renderer metadata records the current checkout commit as well.

## Generation continuity

Five workflow cells and four architecture cells (Mermaid, Draftably, D2, DOT) survived a platform
maintenance recovery. They were not regenerated. Architecture SVG and all five state cells were
then produced in six fresh agent contexts from the same handoff template and same references.
No context saw another format's output or render feedback. Both batches used the platform's
inherited configuration; model ID and exact continuity are unavailable. Consequently the report
must not call this a verified same-model experiment. All fifteen sources are real returned agent
outputs, not ideal reference diagrams authored by the evaluator.

Model inference times, token counts, seed, temperature and prices were unavailable. File-system
write times are not used as inference timings. Source hashes and sizes are recorded in results.json.
The 200-line response limit applies to the original source bytes, not formatter-expanded output.

## Rendering

Nine Draftably/D2/DOT attempts used native shell adapters. Each succeeded. Graphviz emitted
font-cache warnings, retained in its stderr logs. A D2 smoke probe using an inherited
`--input-type` option failed before real cells; normal file-based Node invocation worked.

The sandbox prevented launching Chromium (`socket: Operation not permitted`). This is an
infrastructure failure, not a Mermaid or SVG syntax result. Attempts to serve a fallback to the
existing browser were also blocked by isolated network namespaces. No browser render or visual
inspection is claimed from those attempts.

A read-only GitHub Actions workflow is provided to run all fifteen originals with native
renderers and the repository's `pnpm shoot` capture tool. It uploads SVGs, PNGs, diagnostics and
exact environment metadata as an artifact. The final report will use those actual artifacts.
Until they return, browser rendering and image review remain pending.

## Interpretation

Manual source audit and rendered-image review are separate. Both are agent judgments, not human
review or automated semantic/overlap proofs. Group counts refer to required membership pairs,
not shape-element counts. No single aggregate winner is inferred from these fifteen samples.
The original protocol remains unchanged so execution deviations are visible beside it.
