# Agent diagram comparison: preregistered protocol

Frozen before generation, 2026-11-03. Source baseline: afac5d088a8b5a5791373a66300a869a62ee1af5.

Three tasks in `tasks.json`, five formats (Mermaid, Draftably, D2, Graphviz DOT, raw SVG): 15 cells, one sample each. These are workflow, grouped architecture and cyclic state diagrams, not comprehensive format coverage. The task text is byte-identical across formats. Only the format adapter, extension and bounded syntax reference change.

## Generation

Each cell is a fresh native collaboration agent with `fork_turns: none`, the same inherited platform model/configuration, one task, no competitor outputs and no repository exploration. The platform does not expose a verified model ID, seed, temperature, token usage or controllable token cap to this harness: record these as unavailable, not guessed. Each agent may read exactly its prompt and supplied reference, then write one source and a short explanation. No renderer or browser feedback on first pass. Same budget: one response, at most 200 source lines, no external documentation. The curated, committed references are small syntax adapters, not exhaustive official docs; this measures this specific agent-plus-reference setup, including unfamiliar-language risk.

Initial outputs remain immutable. Every cell receives one optional repair response with its own source, renderer diagnostics and a common visual-feedback policy; no competitor results. No layout searches, helper agents or hidden edits. A successful first pass can remain unchanged. Distinguish initial/final results and record repair decisions. Wall time, where measured by orchestration, includes platform scheduling and is not an inference-speed benchmark. No token/cost estimates. No reruns or selection of best candidates.

## Native renderers

Pinned repository Draftably source baseline above; Mermaid 12.2.0, D2 npm 0.1.34, system Graphviz dot (record actual version), direct SVG in Chromium (record actual version). No cross-format imports. Defaults and native format options are allowed. Generated SVG/PNG artifacts are real renderer outputs; failures and diagnostics are retained. The same displayed image width is used for visual comparison, with full-resolution sources available. Render wall times include adapter overhead and must not be advertised as comparative renderer performance.

## Scoring, fixed before outputs

Report source-semantic audit counts separately: exact nodes, directed edges, exact nonempty edge labels, group membership, extra/duplicate nodes and edges. Verify source structure manually; label source checks as agent judgments, not automatic proof of visible semantics. Also inspect actual rendered images: source semantics alone cannot prove visual semantics. Rendering success is a measured binary per initial and final attempt.

Visual agent-review scores are 0 (material failure), 1 (usable with visible issues), 2 (clear): text readable at 960px display width; unintended node/text overlap; edge ambiguity/occlusion; grouping/layout coherence for the task; whitespace/compactness. Inspect full-size images too and explicitly name observed defects. No composite winner or statistically significant claims from this sample. Editability is a qualitative native-source assessment plus measured source bytes/lines; line count is not a quality score or measured editing effort. Report repair response count, missing timing/token data honestly.

## Limits and publication

One agent/configuration, one sample per task/format, curated references, non-blinded evaluator and native renderer differences limit generalization. A syntax failure is evidence about this setup, not an assertion that the language cannot represent the task. No fabricated costs, timing, overlap detector precision or human review. Report Draftably limitations and competitor strengths. Docs and landing-page additions stay in a draft PR; no merge or deployment.
