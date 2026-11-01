# Portable raw routing reproduction

`reproduce-routing.mjs` reads only the36 known flat, pinned numeric routing companions and imports `RouteLab` from the exact reviewed checkout. It does not parse arbitrary `.draft`, perform DSL layout, or render SVG. The bundled actual CLI evidence remains authoritative for those steps.

Run from the downloaded artifact directory:

```sh
node reproduce-routing.mjs \
  --repo /absolute/path/to/draftably \
  --fixtures examples/routing \
  --output /absolute/path/to/reproduced-routing.json \
  --verify-cli-results evidence/routing/results.json
```

The script accepts paths independently of its own location, requires no third-party dependencies, verifies the reviewed router's SHA-256, rejects unsupported fixture grammar, checks that input rectangles do not mutate, and writes a JSON report. With `--verify-cli-results`, it additionally requires matching source hashes, compiled rectangle arrays and route point arrays for all36 fixtures. Millisecond timings in raw reports are diagnostics, not a performance ranking.

This exact portable command was executed during final QA, with36/36 matching the actual CLI evidence. The run is recorded in `work/routing-validation/reproduced-portable.json` before packaging.
