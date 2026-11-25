# Diagram-adjacent ideas: where else the layout engine can go

Checked 2026-11-24 against draftably 0.18.0. Planning task: TASK-0081. Brainstorm only; nothing is
planned.

Draftably's real assets are a deterministic layout and router, a text format agents write well,
change marks and compare panels, emphasis states, timelines, cells and byte layouts, code nodes
with line ranges, exports that carry their source, importers (Mermaid, DOT, D2), and an embed
runtime. Each idea below reuses most of these and adds one input or one output.

A pattern from the quick market scan: most adjacent tools generate a diagram from a real source
(Terraform state, Kubernetes manifests, traces, code imports) but stop at a picture. KubeDiagrams,
Inframap, Rover and TerraVision draw infrastructure; Codegraph, Depwire and Graphify build code
graphs for agents; Langfuse, Arize and Honeycomb draw agent traces. They agree on one lesson: a
full graph is a hairball, and the value is in what you group, fold and hide. Draftably already has
groups, soft groups, states and `vary` for exactly that.

## Generate diagrams from real sources

1. **Code maps from imports.** `draftably map src/` reads TS/JS/Python imports and draws modules
   grouped by folder, with soft groups and `fit=` to avoid the hairball. Run it again with
   `--since main` and changed modules get change marks.
2. **Architecture diff on every PR.** A GitHub Action renders the code map (or any `.draft` in the
   repo) before and after the PR as `compare` panels and posts the image as a comment. The image
   carries its source, so a reviewer can open it in the viewer.
3. **Infrastructure from IaC.** Import `terraform show -json`, Kubernetes manifests, Helm output or
   `docker-compose.yml` into groups (VPC, cluster, namespace) with icons. A `terraform plan` maps
   straight onto `+`, `-` and `~` marks, which none of the tools above draw.
4. **Live database schemas.** `draftably import postgres://…` reads the catalog and writes the new
   table bodies, foreign keys included. Two snapshots, or a migration file, give a schema diff
   with added and dropped columns marked.
5. **API maps.** OpenAPI and GraphQL schemas become type tables (the table layout) and
   endpoint-to-type graphs. A breaking-change check could show removed fields as `-` rows.
6. **Data lineage.** A dbt `manifest.json`, an Airflow or Dagster DAG becomes a pipeline diagram.
   An emphasis state per model ("what breaks if `orders` changes") highlights everything
   downstream.
7. **Package and monorepo graphs.** `pnpm-workspace` or a lockfile draws packages and their
   dependencies. `pnpm why <pkg>` becomes a state that highlights the path that pulls a package in.

## Explain behavior from traces

8. **Traces as sequence diagrams.** An OpenTelemetry trace (JSON export) becomes a sequence
   diagram with services as participants, or a timeline with spans as bars. Today trace tools
   show waterfalls; a sequence diagram explains a slow request better in a postmortem.
9. **Agent run maps.** A Claude Code transcript, LangGraph run or OTel GenAI trace becomes a
   sequence of agent, tools and files, with the code nodes showing the edits. "What did the agent
   do" is a question Byron's own tooling asks every day.
10. **State machines from code.** XState configs, Redux reducers, or a TypeScript union of states
    with a transition table become a state diagram. Generated from code, it cannot drift.

## New outputs from the same drawing

11. **Slides from states.** `draftably present file.draft` turns each `state` line into a slide,
    with the same layout and animated focus changes between them. One file becomes a talk, like
    IcePanel flows, with no second tool.
12. **Code walkthroughs.** Code nodes, ranges and edges across several files, stepped through by
    states, give a guided tour of a call path. An LSP call hierarchy (`draftably calls fn`) could
    write the first draft.
13. **Live status maps.** The embed runtime binds node color and `count=` to live data (health
    checks, queue depth), so a service map becomes a status page. Layout stays fixed, because
    colors never move boxes.
14. **Accessible text output.** `draftably describe` writes a structured text version: groups,
    each path in reading order, notes. It serves screen readers, alt text, and agents that need a
    diagram's meaning without the image.

## Other domains that are graphs or grids

15. **Project plans from task files.** Planning tasks and GitHub issues with "blocked by" links
    become a dependency graph with the critical path highlighted, plus a timeline view of the same
    tasks. Byron's TASK files already carry `(after: W1)` links.
16. **Knowledge maps.** Markdown notes with `[[wiki links]]` (Obsidian, Visual Notes) become a
    concept map, grouped by folder or tag. The stress engine draws link networks; states show one
    topic's neighborhood.
17. **Rack and floor layouts.** A server rack is a byte layout with a different unit:
    `cells unit=u columns=1` with spans per device draws a rack elevation, and lines join ports
    across racks. Home-lab and data-center docs need exactly this.
18. **Railroad syntax diagrams.** A grammar (EBNF, a regex, a CLI's flags) becomes a railroad
    diagram: sequences run left to right, choices stack, loops return. Draftably could draw its own
    DSL reference this way.
19. **Branching stories and dialog trees.** Twine, ink or Yarn scripts become a story graph with
    choices as edges and chapters as groups. Game writers check reachability and dead ends;
    `check` could warn on unreachable passages.
20. **Family trees and stakeholder maps.** GEDCOM files draw a family tree on the tree engine with
    couples as joined pairs. The same idea, with roles and influence, gives a stakeholder map for a
    project or a sale.

## Where to start

The strongest fits reuse the most and serve developers first: **1–2** (code map and PR diff), **3**
(IaC with change marks) and **8–9** (traces and agent runs). Each is an importer plus existing
drawing, and each has a change-mark story that competing tools lack.

## Sources

- [KubeDiagrams paper](https://arxiv.org/html/2505.22879v1), [TerraVision](https://pypi.org/project/terravision/),
  [Inframap](https://docsearch.algolia.com/mcp/docs/repo/cycloidio/inframap),
  [Terraform visualization roundup](https://dev.to/pandey-raghvendra/terraform-visualization-5-ways-to-see-what-your-code-actually-builds-o1l)
- [Graphify](https://www.infoq.com/news/2026/09/graphify-codebase-exploration/),
  [Codegraph](https://github.com/optave/ops-codegraph-tool/wiki),
  [Depwire](https://socket.dev/npm/package/depwire-cli),
  [Codebase-Memory paper](https://arxiv.org/html/2603.27277v1)
- [Langfuse agent graphs](https://langfuse.com/docs/observability/features/agent-graphs.md),
  [Arize agent trajectory](https://arize.com/docs/ax/instrument/agent-trajectory),
  [Honeycomb agent timeline](https://www.honeycomb.io/blog/instrumenting-ai-agents-agent-timeline-opentelemetry-guide)
