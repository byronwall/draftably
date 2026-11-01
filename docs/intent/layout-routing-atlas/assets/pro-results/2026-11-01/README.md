# Draftably layout and routing review

**Start with [report.md](report.md), then open [atlas-preview.html](atlas-preview.html).** The preview is self-contained and works offline; its sources, real SVG exports and parameter metadata are embedded. Wide diagrams use stacked common-scale views, with synchronized horizontal panning and optional explanatory overlays. Original downloads preserve the exact Draftably SVG bytes.

Baseline: `af70d8317797d5a522acffdd604819376a3ec893` from the attached source ZIP. No repository source changes, commits or pushes were made. Codex should verify and integrate the proposed work in `codex/layout-routing-visual-docs` using a complete checkout.

## Deliverables

| File | Purpose |
| --- | --- |
| [report.md](report.md) | Decision, complete review, design alternatives, evidence, limits and integration choices |
| [coverage.csv](coverage.csv) | 197 canonical entries:194 controls/operations plus three derived behaviors; stable IDs and source/visual mapping |
| [visual-atlas.md](visual-atlas.md) | 105 numbered visual families and four justified nonvisual groups, exact sources, changes, observations and statuses |
| [atlas-preview.html](atlas-preview.html) | Offline visual review of the actual outputs, including24 native model renders |
| [atlas-manifest.json](atlas-manifest.json) | Machine-readable control, state, source, geometry, metric, reference, hash and status cross-reference |
| [page-drafts.md](page-drafts.md) | More than16,000 words of destination-labeled reader-facing copy, complete parameter explanations and13 validated live-example fences |
| [implementation-plan.md](implementation-plan.md) | Small shippable content, renderer, behavior and integration milestones with exact files and gates |
| [recommendations.md](recommendations.md) | 34 stable decisions:27 Build, three Explore, one Defer and three Avoid |
| [run-atlas.py](run-atlas.py) | Portable dependency-free Python driver for artifact integrity and real baseline CLI reproduction |
| [scripts/README.md](scripts/README.md) | Portable native model/serializer/Compare and warm-layout probes |

The package includes **323 positive `.draft` companions**, **10 isolated defect repros**, **one deliberate infeasible-constraint diagnostic**, **359 actual Draftably SVG assets**, the supplied PNG comparison, and new CLI-generated radius PNGs. Generated counts and hashes in [evidence/artifact-counts.json](evidence/artifact-counts.json) are authoritative. Some SVGs are starting documents, diagnostic examples or repeated evidence; they are not359 independent public controls.

## Reproduce

Install the exact baseline's dependencies with its frozen pnpm lockfile. From this extracted review directory:

```sh
# Check all delivered references, source hashes and SVG frames without running Draftably.
python3 run-atlas.py --structural-only --out /absolute/path/to/structure-check

# Recompile all 323 positive companions with the real baseline CLI.
python3 run-atlas.py \
  --repo /absolute/path/to/pinned-draftably \
  --out /absolute/path/to/new-atlas-run \
  --jobs 3

# Reproduce13 native editor/timeline/brush model outputs.
node scripts/render-editor-model.mjs \
  --repo /absolute/path/to/pinned-draftably \
  --examples /absolute/path/to/this-review/examples \
  --out /absolute/path/to/new-native-evidence

# Reproduce11 native alignment/grid/ordering outputs.
node scripts/render-layout-warm.mjs \
  --repo /absolute/path/to/pinned-draftably \
  --examples /absolute/path/to/this-review/examples \
  --out /absolute/path/to/new-warm-evidence
```

The runner requires Node and pnpm for the actual CLI. It installs nothing and does not edit the source companions; the repository's normal launcher can refresh generated `dist-cli/` output. Keep `--out` outside this review package. The primary runner excludes `repros/`, `expected-diagnostics/` and archived `editor-probes/` from the positive gate. Probe runners have explicit contracts in their README. Existing `pnpm shoot` and CLI PNG/vary export need a browser; SVG export does not.

From the repository root, inspect one source directly:

```sh
pnpm draftably check /absolute/path/to/this-review/examples/routing/crossing-penalty-1200.draft --metrics
pnpm draftably inspect /absolute/path/to/this-review/examples/routing/crossing-penalty-1200.draft --svg
pnpm draftably vary /absolute/path/to/this-review/examples/routing/corner-radius-6.draft \
  --try corner-radius=0,6,16 --out /absolute/path/to/new-radius-run
```

## Evidence boundaries

- [Final positive CLI ledger](evidence/final-cli-reproduction.json):323 inputs,969 successful check/inspect/SVG commands and17 frozen routing subcomparisons. Warnings are retained, not erased.
- [Supplied engine reproduction](evidence/engine-reproduction.json):all ten engine outputs match the attached metrics.
- [Complete radius CLI export](evidence/cli-vary-radius/variants.json):all PNGs and the contact sheet were produced by the unmodified CLI. The coarse same-as tag is retained even when corner appearance differs.
- [Browser viewer proof](evidence/preview-qa/results.json):the offline artifact's actual interactions and viewport checks. This is separate from native Editor UI verification.
- [Source/access ledger](evidence/files-read.md) and [published-site observations](evidence/live-observations.md):exact access and actions.
- [Full-checkout command logs](evidence/checks/):formatting, omitted corpus/reference/release assets and initial socket restrictions prevent claiming a clean full release gate from the packet. Two socket-dependent suites passed on a permitted rerun.

Keep source/native/cold/warm/pass/routing contexts separate while integrating. Preserve observed no-effect outputs. Update `skills/draftably/SKILL.md` with DSL documentation changes and add the required changeset for shipped source/example/reference changes. The optional new capabilities in Explore/Defer are not prerequisites for completing the atlas.
