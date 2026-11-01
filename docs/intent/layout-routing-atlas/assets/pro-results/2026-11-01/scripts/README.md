# Reproduce editor model and persistence evidence

These scripts load the actual baseline modules from a supplied Draftably checkout. They do not install dependencies, modify its source, invoke a browser, or substitute another renderer. Use source revision `af70d8317797d5a522acffdd604819376a3ec893` with its pnpm dependencies already installed. Node 22 or newer is appropriate for the pinned project.

Place this folder at `scripts/` beside the artifact’s `examples/` folder. `--repo` and `--out` are required. `--examples` is optional and defaults to `../examples/` relative to the scripts. The explicit form works from any working directory:

```sh
node scripts/probe-editor.mjs \
  --repo /absolute/path/to/pinned-draftably \
  --examples /absolute/path/to/review/examples \
  --out /absolute/path/to/new-evidence/probes

node scripts/probe-editor-persistence.mjs \
  --repo /absolute/path/to/pinned-draftably \
  --examples /absolute/path/to/review/examples \
  --out /absolute/path/to/new-evidence/persistence

node scripts/render-editor-model.mjs \
  --repo /absolute/path/to/pinned-draftably \
  --examples /absolute/path/to/review/examples \
  --out /absolute/path/to/new-evidence/model
```

`probe-editor.mjs` proves the fold serializer mismatch; source-Compare ignored axes; source/native value-clamp differences; fixed-port release mismatch; explicit/omitted direction metadata; and coarse vary equality for corner radius. It saves exact source and actual SVG companions. Its `vary()` call exercises the actual CLI implementation module, but is not a completed `draftably vary` command/export. The unmodified command’s mandatory PNG export additionally needs Chrome.

`probe-editor-persistence.mjs` calls the actual generic edit translator and scene projection for container direction/padding and snap/badge preferences. It executes a bounded tidy pass, writes stays and surrounding anchors as the file session does, recompiles, and records numerical drift. It also proves scoped recipe cleanup and generates native JSON projections of the supplied editor fixtures. No browser interaction is claimed.

`render-editor-model.mjs` is standalone: it compiles the exact editor starting source itself, runs cold/warm/bounded tidy, records a complete warm timeline, and performs one dab in each of the five brush modes. Every SVG comes from `src/cli/svg.ts:renderSvg`. It saves input/result JSON, canonical geometry, solver options, metrics and common world rectangles. The brush reference is captured before the specified browse-node perturbation; every mode starts from the same perturbed document. Protect-mode holds are recorded as session metadata, not falsely added to the diagram JSON.

The renderer routes each exported scene without previous route-cache history. These are genuine native model renders, not editor screenshots or proofs of UI history, toast messages, viewport interaction, or browser storage. `createdAt`, run timing and generated report duration may vary; compare canonical geometry hashes and documented tolerances, not whole JSON byte identity.

All three scripts were smoke-run using arguments against the pinned checkout and packaged example layout. All 13 native-model geometry hashes matched the original runs. The helper sets Vite’s supported `server.ws=false`, so the read/compile runtime does not need an HMR listening socket.

## Warm parameter comparisons

`render-layout-warm.mjs` compiles the three exact `examples/layout-warm/` starting sources, saves their native JSON, and runs one bounded pass for every alignment, grid-strength, and ordering value in families VL10, VL12 and VL13. Every value restarts from its family's identical document; the script records all options, the exact start source, common world rectangles, finite-coordinate checks, canonical geometry hashes, actual routing metrics, solver reports and actual SVGs.

```sh
node scripts/render-layout-warm.mjs \
  --repo /absolute/path/to/pinned-draftably \
  --examples /absolute/path/to/review/examples \
  --out /absolute/path/to/new-evidence/layout-warm
```

The portable warm script was smoke-run against the pinned checkout: all 11 native-model geometry hashes match the recorded atlas results; stderr is empty. These runs establish warm model behavior, not browser UI behavior. The required-alignment/pin conflict is a separate expected diagnostic source under `examples/layout-warm/expected-diagnostics/`; it is intentionally excluded from this positive parameter renderer and from happy-path validation. Its recorded diagnostic results are in `evidence/layout-warm/diagnostic-results.json`.
