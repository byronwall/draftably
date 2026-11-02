# Start here: draftably text diagram importers

**Recommendation:** import foreign text into a new native `.draft` source document, with a reviewable diagnostic report and ID mapping. Compile that native source for preview and editing. Save only the new native file. The foreign input remains unchanged and disconnected.

**Access confirmed:** [byronwall/draftably@dd2ababcbe3b9ac011bc23e652309c10cf31cd02](https://github.com/byronwall/draftably/tree/dd2ababcbe3b9ac011bc23e652309c10cf31cd02). Research date: 2026-10-31 UTC. The original checkout was not modified.

## Files

| File | Purpose |
|---|---|
| [draftably-importers-report.md](draftably-importers-report.md) | Decision first; all five research questions; native lifecycle, format semantics, parser/license/cost comparison, stable recommendations and primary-source evidence. |
| [draftably-importers-plan.md](draftably-importers-plan.md) | Ordered independently verifiable milestones, affected product files, tests, commands, documentation and risks. |
| [draftably-feature-mapping-and-fixtures.md](draftably-feature-mapping-and-fixtures.md) | Construct-level coverage tables and exact input/native examples, graph facts, failure cases and staged family fixtures. |
| [fixtures.json](fixtures.json) | Complete machine-readable input and expected result for all 38 checked fixtures. |
| [native-undirected.patch](native-undirected.patch) | Applicable native source/edit/render prerequisite for one undirected edge; not applied to the original repository. |
| [validation-results.md](validation-results.md) | Executed commands/results, measurements, environment and untested production gates. |
| [adapter-kit/README.md](adapter-kit/README.md) | Source index, setup, entry points, executable demo and limitations. Available inside the complete archive. |
| `draftably-importer-companions.zip` | Complete package: all documents above, TypeScript source/tests, lockfile, individual fixtures, probes and a SHA-256 manifest. No installed dependencies or generated dist files. |

The complete ZIP is the easiest way to preserve the relative links and runnable directory layout. Individual reports, fixture catalog, patch and validation record are also supplied separately.

## Working code versus future integration

Working partial importers:

- **DOT core:** scoped defaults/global identities, clusters, strict/non-strict multiplicity, brace sets/chains, labels, selected shapes/colors, side ports and honest dialect blockers.
- **Mermaid flowchart:** official guarded DB snapshot, nested groups, occurrence/explicit IDs, selected shapes/styles, safe label text, diagnostic losses; real Node worker timeout.
- **D2 ordinary graphs:** official compiler response normalization, quoted-ID hierarchy, resolved source-program snapshot, arrow/multiplicity semantics and native source; optional experimental compiler runtime.

Shared companions include format detection, collision-safe native IDs, source/output budgets, create-only validated output and a runnable research CLI. The code contains no foreign-format writer.

**Not completed:** production `draftably import` dispatch, scratch-session/UI/site integration, browser Mermaid hard CPU isolation, D2 production deadline/memory supervision, or additional diagram-family adapters. These are named milestones, not disguised pseudocode.

## Run the kit

```bash
cd adapter-kit
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm test
```

Tested with Node 24.22.1 and pnpm 11.25.0. The kit’s Node range comes from JSDOM 30.1.3 and is higher than the project’s baseline Node 22.21.0 floor. The report makes that an explicit packaging decision.

Example conversion using a trusted native checkout for validation:

```bash
DRAFTABLY_ROOT=/absolute/path/to/draftably \
  pnpm demo fixtures/dot/nested.dot --from dot --output /tmp/new-diagram.draft
```

The output must be a new lowercase `.draft` filename. The demo never opens the foreign input for writing and refuses existing destinations, including links. Some native outputs need the supplied undirected prerequisite applied in a separately reviewed worktree. Do not apply it automatically or assume an older native release accepts the new attribute.

## Executed evidence

- Clean frozen-lockfile install and strict TypeScript build passed.
- Final adapter run: **61 passing runner entries**, zero failures. This is 60 registered tests plus one facade smoke file with three assertion groups.
- Native prerequisite: **61 tests across five focused native suites**, passed separately in a disposable copy.
- Fixture corpus: **38 cases — eight ready, 14 needing review, 16 failed atomically**.
- Full native compile/project: 19 baseline outputs passed with three explicitly skipped prerequisites; all 22 passed on the patched copy; all 16 rejection snapshots verified.
- Six DOT cases preserved graph facts through an unrelated native label edit, print and reload.
- Real DOT/Mermaid demo conversions created separately validated native files.
- Controlled D2 compile/network checks used 17 fixtures; no input resource loads were observed.

See the validation record for the limits of these checks. No full product build, browser workflow, complete engine regression suite or installed CLI proof is claimed.

## Decisions Codex can take forward

Stable recommendation IDs and Build/Explore/Defer/Avoid classifications are in the report. The highest-value build order is native source contract → undirected persistence → DOT core/Mermaid flowchart → safe CLI → recoverable scratch/UI.

Keep D2 optional until operational costs and termination are proven. Add basic sequences and bounded nomnoml next, then field-aware DBML or other families based on real examples. Treat unsupported meaning as a visible diagnostic, never as an invisible deletion.

There is no missing repository source packet. The remaining questions are product/runtime choices: CLI Node floor, browser Mermaid execution isolation, optional D2 cost, and the next family to support.

