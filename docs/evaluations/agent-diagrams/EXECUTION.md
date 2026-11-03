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

The read-only GitHub Actions run 41554667774 rendered all fifteen originals successfully and
captured all full-size/display-width images plus three contact sheets. Canonical images come
from that single environment. Its synthetic merge commit 7e0507cfab268adbfc03c3827db6469982b687ef
was compared with PR head 68b8c213d97a15f53e68c0f3b6a643f745511030 through GitHub: no changed files,
so the renderer source matched the pinned-baseline-derived branch. Future runs explicitly
checkout the PR head. Local protocol commit 2997711 was published as equivalent-tree remote
commit 9e3b28b; the local freeze preceded generation, public publication followed generation.

## One optional repair response

Every cell receives one fresh isolated repair context with its own initial source, task,
format reference, native renderer diagnostics and the same five-dimensional image-review
policy. Each may view its own display-width image and may retain the source unchanged. No
competitor output, browsing, renderer feedback or second attempt is available. The cap remains
one response and 200 source lines. Initial source stays immutable; complete repaired source,
feedback, prompt and decision are stored alongside it. Second uniform CI run 41568855771 measured all returned sources: fourteen rendered,
architecture/Mermaid failed native parsing. The original failed CI conclusion is preserved. The evaluator does not silently select between initial and repaired drawings.

## Interpretation

Manual source audit and rendered-image review are separate. Both are agent judgments, not human
review or automated semantic/overlap proofs. Group counts refer to required membership pairs,
not shape-element counts. No single aggregate winner is inferred from these fifteen samples.
The original protocol remains unchanged so execution deviations are visible beside it.

## Final verification and cleanup

The repository's existing Check run 41568855743 at head
2873433741c8dc7582012f6231a57c357645ebba completed successfully, including the standard site-proof
job with the comparison journey: landing navigation, fifteen loaded original images, desktop
and mobile widths, and no document overflow. The final journey also checks the fourteen linked
repaired SVGs. The final commit can be verified by the same standard Check workflow.

The temporary diagram-rendering workflow was used only to obtain actual evidence while local
Chromium was blocked; it is removed from the final changes, along with its CI-only capture
orchestration script. The normal repository checks remain. Local native replay, immutable source
and rendering evidence, the comparison UI proof and the captured workflow provenance are retained.
There is no permanent expected-failure CI gate or new recurring workflow.
