# Diagram Studio v7

**Extract the ZIP and open `diagram-studio.html`.** No install, server, account, or runtime network connection is needed by the editor. The ZIP includes the complete standalone app, its rebuildable source, documentation, examples, browser captures, and executable checks.

## Start with these two tools

**Timeline · Alt+T** runs the selected layout from the current drawing toward a computed finish and records intermediate states. Scrub, hover to peek, play/pause, and bookmark a point worth keeping. A ghost shows the next meaningful change or the final arrangement. Use **Fit path** once for a consistent overview. **Keep & edit** commits one undoable checkpoint; Escape discards the preview.

**Layout brush · W** previews an influence field on hover. Hold or drag to tidy, encourage flow, make space, restore an area from a bookmark, or protect an area without selecting every shape. **[ / ]** changes radius, **Alt** temporarily restores, **Space** pans, and **L** applies one local dab. A whole stroke is one undo entry.

## The “keep the good part” workflow

Open Timeline → bookmark the last point where a particular area looks right → keep a later state with **Keep & brush** → brush that area toward the bookmark. The rest of the diagram keeps its new layout. Leave local protection enabled to keep repaired nodes fixed during the next layout; **Preview from here** starts another journey.

Restore is bounded and obstacle-aware. It can stop short when a former position is occupied. Pins and container boundaries take precedence. The end of a timeline is a computed stopping point, not a mathematical guarantee of the best layout.

The latest path can be reopened from File → Reopen last layout timeline. File → Save layout timeline exports a replayable JSON history. Ordinary diagram exports remain JSON, editable SVG, and PNG.

## Existing controls remain

Edit is the default and repeated-Escape destination. N → title → Tab builds connected steps. C stays in connection mode. H selects Pan; background/Space-drag pans. L makes a bounded improvement pass outside brush mode. Shift+L previews a deterministic rebuild. Compare / Alt+E opens the full-viewport comparison grid and click-anchored overlay. Eleven layout approaches, nested containers, start/end hints, pins, routing settings, and the keyboard-shortcut panel remain available.

## Documentation

[Release guide](docs/CHANGES-v7.html) · [INTENT dump](docs/INTENT-DUMP.html) · [Parameters](docs/PARAMETERS.html) · [Code map](docs/CODE-MAP.html).

Each reader also has an editable Markdown source. The v6 guide remains as a historical reference. No prior PDF or Word book is relabeled as updated.

## Rebuild and check

The app build uses Python's standard library. Documentation generation uses Python `mistune`. Geometry checks use Node 22+. Browser checks use Python Playwright and an existing local Chromium executable; the app itself needs none of those dependencies.

```bash
# Run from the extracted release directory.
python source/build.py
python source/build_docs.py
node verification/geometry.cjs
node verification/sculpt-geometry.cjs
python verification/browser_checks.py
python verification/sculpt-browser.py
python source/package.py
```

Read `verification/CHECKS.md` for observed results and unverified environments. Browser policy blocked native file navigation in this environment; browser checks injected the exact built HTML. Storage tests use a named test adapter, not native file storage. Physical gestures, Safari/Firefox, and production-scale performance are not claimed as verified.

`MANIFEST.sha256` records every packaged file other than the manifest itself. The packaging script checks archive CRCs. No font files are bundled. No repository files or commits were changed.
