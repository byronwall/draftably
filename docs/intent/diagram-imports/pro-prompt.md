# Read-only diagram syntax importers

https://github.com/byronwall/draftably

Ref: `dd2ababcbe3b9ac011bc23e652309c10cf31cd02` (main). Mode: Design and implementation research.

## Mission

How should draftably import Mermaid, Graphviz DOT, D2, and other widely used text diagram syntaxes into its native diagram model so people can open, view, and edit their meaning in draftably? Give us the mapping and code needed to build the importers. The user wants to read these formats only. Writing back or exporting to those formats is not a goal.

Act as a diagram language and compiler engineer. Prefer practical breadth and fidelity, with honest diagnostics for unsupported constructs. Compare mature parsers and explain their license, browser and Node compatibility, maintenance, bundle and runtime cost, and whether they expose usable structured data. Do not assume all syntaxes describe the same diagram kinds.

## Access check

First confirm you can read the repository at the exact ref above. If you cannot access the decisive code, stop and name the smallest missing source packet. Do not pretend to have reviewed an inaccessible ref.

## Read at minimum

- `AGENTS.md`, `README.md`, `package.json`, `docs/ARCHITECTURE.md`, `docs/DSL.md`, `docs/CHECKS.md`.
- `src/model/types.ts`, `src/model/document.ts`, `src/state/files.ts`, `src/state/file-session.ts`, `src/state/launch.ts` and relevant open/import controls.
- `src/dsl/syntax.ts`, `src/dsl/compile.ts`, `src/dsl/project.ts`, `src/dsl/translate.ts`, `src/cli/main.ts`, `src/server/file-session.ts` and representative `.draft` examples and tests.
- Discover related existing plans or importers before proposing another abstraction.

## Questions, in priority order

1. What should import mean in this product? Trace source text through detection, parsing, semantic mapping, layout and opening in the browser and CLI. Decide whether the result should be a native `.draft` source, a `Diagram`, or a combination. Explain how it becomes editable, saved, and disconnected from the original input. Cover file types, paste, failure and loss reporting; never overwrite the foreign source.
2. For Mermaid, DOT, and D2, map their important constructs to the actual native model and DSL. Cover nested groups, IDs, labels, edge directions and multiplicity, shapes, styles, layout direction, and format-specific semantics. Identify diagram families the native model cannot faithfully represent and how a user sees that limitation. Give concrete source-to-native examples and expected graph facts.
3. Which additional major text-based diagram formats should be prioritized, and why? Compare popularity evidence and parser feasibility; avoid claiming full language coverage from a small subset. Recommend an explicit supported feature matrix and staged coverage.
4. Which existing parsers or compiler APIs should be used for each format? Compare options using current primary sources. Consider client-only operation, CLI packaging, licenses and transitive dependencies, syntax errors, malicious or untrusted input, and format features requiring external files, network access, plugins or executable code. Identify where a small focused parser is justified.
5. Give a buildable implementation plan and code companions. Include working TypeScript adapter code or precise patches for the highest-value importers where feasible, parser integration, fixtures and meaningful tests, CLI and UI touch points, dependencies and commands. State explicitly what is complete, partial, or pseudocode. Include expected results for malformed input, unsupported semantics and representative nontrivial diagrams.

## Evidence and boundaries

Cite repository paths and symbols for product claims; cite current primary source documentation, source repositories, or licenses with URLs for external claims. Distinguish facts, inferences and proposals. Flag missing evidence. Use TypeScript and pnpm. Keep dependencies and architecture proportionate to this personal project. Support reading foreign formats only; do not design foreign-format writers or round-trip synchronization. The existing native format remains writable. Do not run untrusted input or load external resources silently.

## Deliverables

Provide downloadable Markdown files: (1) a report with a one-paragraph decision first and answers to each question, (2) an ordered implementation plan with independently verifiable milestones, affected files, tests, examples, documentation and risks, and (3) a feature mapping and fixtures with input and expected output. Provide any useful source code companions as downloadable files, with setup and limitations. Give each recommendation a stable ID and classify it Build, Explore, Defer, or Avoid with a short reason. Link every file in the final response; a ZIP is optional. If files cannot be created, provide their complete content inline. Codex will verify the result against current code and own all repository changes. End with access status, files read, checked facts versus proposals, links, and open questions.
