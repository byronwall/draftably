---
title: "Rich node content — implementation plan"
slug: "rich-node-content"
phase: plan
status: current
last_updated: "2026-10-15"
---

# Rich node content — implementation plan

## Plan at a glance

Deliver five usable outcomes: file-authored images, pasted and portable originals, image inspection and management, searchable title icons, and complete exports. Each step extends the existing editor. No separate asset database or browser storage system is needed.

First prove that a real `.draft` file can describe attachments and an image node. Save another edit, reopen the file, and compare browser and CLI geometry. This must include normalization, which currently accepts only image data URLs. Adding parser attributes alone would leave undo, copy, and file edits unable to preserve content.

Next prove clipboard insertion and portable conversion against real temporary folders. Keep original bytes intact. Copy files before changing source links, then use the existing revision check to save. A failed source save can leave unused files; it must not destroy originals or imply success. This is simpler than a transaction across filesystem assets and source history.

Only after that proof passes, add the inspection viewer, attachment controls, and icon picker. Finish by verifying image materialization in exports and the installed CLI package. Browser proof uses realistic pointer and keyboard interaction. Focus automated tests on content loss, incorrect file resolution, stale writes, and geometry changes.

This plan implements the [shape brief](shape-brief.md). It does not authorize execution, publishing a package, or deployment.

## Implementation strategy

- **State:** Keep `image?: string` for an image node's source. Add an ordered `attachments?: string[]` for ordinary nodes. Store stable icon names in the existing style field. Keep resolved URLs, thumbnails, and image inspection state outside the saved document.
- **DSL:** Use the proposed `image=`, `icon=`, and repeated `attach node "path"` statements. Attachment statement order defines display order. Update syntax, projection, translation, deletion, and formatting together. Preserve comments and unrelated statements.
- **Geometry:** Reserve title, icon, and thumbnail space through shared deterministic measurements. Use explicit `size` for pasted image nodes. DSL-authored image nodes without a size get a fixed default. Loading, missing bytes, and image inspection never change layout. First attachment insertion can change source-derived size; image arrival cannot.
- **File seam:** Put original reads, uploads, and portable copying beside `src/server/file-session.ts`. Route requests through `src/server/workspace.ts`, using the selected diagram. Relative paths resolve from that file's directory; absolute paths remain absolute. Serve only supported image references declared by that diagram, including the last valid source when an edit is invalid. Avoid a generic arbitrary-file endpoint.
- **Save sequence:** Capture the target diagram and selected node before asynchronous decode/upload. Upload original bytes to collision-safe names under its `assets/`; then commit references through the normal source edit flow. Stop if the active diagram changes. Do not auto-retry attachment creation.
- **History:** Uploads and copies do not become history entries. Insertion, removal, first-image choice, icons, and portable link changes do. Undo changes references and leaves bytes intact.
- **Transition:** Enable each supported behavior only when it can persist. Until export support lands, refuse affected rich-content exports with a reason. Keep existing content-free diagrams usable. No version migration, compatibility framework, or feature flag system.
- **Rollback:** Use coherent commits. Portable conversion leaves source images untouched. Reverting a UI slice must not delete assets or rewrite diagrams. Do not downgrade files containing new syntax without an explicit user decision.

### Local loop and dependency proof

Use temporary fixtures, never Byron's working diagrams. No database or shared data target is involved. No browser proof has run during planning. Before execution, confirm dependencies and a Chromium executable are available.

Add `scripts/prove-rich-content.ts` and a `pnpm prove:rich` script as the image slice becomes runnable. Follow `scripts/prove-file-session.mjs`: create a temporary workspace, start the actual local server, drive the browser, and write evidence under `tmp/rich-content/`. Do not depend on debug APIs for user interaction checks.

During development, use `DIAGRAM_ROOT=/absolute/temp/folder pnpm dev`, then open `?file=rich.draft`. Run focused tests with `pnpm test:unit -- tests/dsl.test.ts tests/translate.test.ts tests/model.test.ts tests/workspace.test.ts`. The browser proof runs after `pnpm build`.

| Dependency | First proof | Required proof |
| --- | --- | --- |
| Local files and session HTTP | Real temporary files | Relative/absolute paths, original bytes, stale saves, missing files, and failed writes. A fake cannot prove path or copy behavior. |
| Browser images and SVG | Real browser and local images | Load/failure with fixed geometry, visible original detail, and later standalone exports. Canvas mocks cannot prove decoding. |
| Icon library and search metadata | Absent | In milestone 4, verify a real pinned catalog, related-term search, shared glyph rendering, and package contents. |

No emulator, cloud sandbox, credentials, or deployed proof is needed. Real local integration is the final environment. Inject failures with missing files, a path occupied by a directory, and a source edit before save. Use one narrow throwing copy seam only if a partial-copy failure cannot be reproduced reliably.

## Milestone 1: File-authored images survive edits and reopening

Prove the file contract before clipboard work or a new viewer.

- Extend `src/model/types.ts`, `document.ts`, and `edits.ts` to retain image references and ordered attachments through normalization and copied fragments. Validate supported raster data and local path strings at their actual boundaries; do not store server URLs as source paths.
- Extend `src/dsl/syntax.ts`, `compile.ts`, `project.ts`, `source-edits.ts`, and `translate.ts`. Reject attachments to missing or unsupported targets with source lines. Deleting a node removes its attachment statements. Do not remove unrelated restrictions on bends or labels.
- Add referenced-image reads to the file session and workspace routing. Use the same handler in Vite and `draftably open`. Missing bytes produce image diagnostics and a stable placeholder, not a compile failure that hides the graph.
- Extend `NodeView.tsx` and shared label/content measurements for the first thumbnail and image node. Check box and diamond content fit first; cover all supported ordinary shapes before declaring the slice complete. Reserve image slots before loading. Rendering must not mutate the graph.
- Add a few cases to existing DSL, translation, normalization, and workspace tests: ordered round-trip, unrelated edit preservation, deletion, relative/absolute resolution, and missing-image geometry. Start the browser proof fixture with two attachments, one image node, and a connected ordinary node.

### Desired end state

- A file-authored image diagram renders, accepts an unrelated edit, and survives reload and server restart.
- Browser and CLI geometry agree before load, after load, and with a missing image.
- No image is silently lost through normalization or a source edit.

## Milestone 2: Paste originals and move a portable diagram folder

Complete the persistence proof before adding inspection and picker polish.

- Update `src/state/files.ts`, `keyboard.ts`, commands, and the file-session client. Preserve original upload bytes; generate smaller previews separately. Keep PNG, JPEG, WebP, and GIF handling and the existing input size limit. Do not convert originals through canvas.
- Paste onto exactly one ordinary selected node appends an attachment. Empty, multiple, group, or image-node selection creates an image node. Keep native text paste. Copy within a diagram preserves references. Cross-diagram fragments carry their source base and rebase paths to the same files; do not build a cross-workspace asset copier.
- If there is no writable diagram, offer the existing local Save as file flow and require another paste after saving. On the static site, explain that local editing is required. Do not claim an unsaved image is attached.
- Add “Make portable” to the file menu. Collect current diagram image references, copy external originals into its `assets/`, and build one source rewrite. Keep references already within that folder. Handle filename collisions without overwrite. Reuse a copy for repeated references to the same resolved file within this operation.
- Apply the rewrite through existing source history and revision checks. A copy failure leaves source unchanged. A conflict keeps the proposal for existing conflict recovery. Leftover unused files are acceptable; report success only after source save completes.
- Extend workspace tests for unchanged source on copy failure and stale revision; verify original hashes and image order. Extend the browser proof: paste a screenshot larger than 2,048 pixels, reopen, make portable, stop the server, move the folder, restart, and resolve every image.

### Desired end state

- Pasted originals survive save/reopen without lost detail or overwritten files.
- The moved diagram folder resolves every attachment and image node without its earlier location.
- Failed copying or saving leaves useful original references and a clear recovery path.

## Milestone 3: Inspect and manage attached images

- Add a focused image viewer alongside existing dialogs. Reuse camera math where practical. Start fitted; support drag pan, cursor-centered wheel zoom, fit, actual pixels, previous/next, and close. Switching images fits the new image. Viewer zoom does not write the diagram.
- Add the inspector attachment list with open, remove, and make first. A thumbnail click opens inspection; dragging the node body still moves it. Image-node single-click selects; an Open image action and double-click inspect it.
- Keep graph gestures and keyboard shortcuts inactive while inspecting. Provide labelled controls, visible focus, Escape close, focus return, and keyboard pan/zoom. Do not let thumbnail pointer events start a graph drag.
- Use the real browser proof for thumbnail click versus drag, keyboard-only access, multiple-image navigation, full-resolution text inspection, and missing-image recovery. Check dense layouts at a wide desktop and laptop width. Verify ordinary image-node operations: resize, connect, group, pin, duplicate, delete, undo, and redo.

### Desired end state

- Users can inspect every original, remove attachments, and choose the displayed image.
- Pan/zoom and graph operations remain distinct, and history retains the intended content.

## Milestone 4: Find and save title icons

- Resolve the catalog spike below, then add one pinned icon source and local search metadata. Keep interface icons unchanged. Use one name-to-SVG lookup for canvas and CLI output. Do not maintain parallel framework and CLI glyph catalogs.
- Extend DSL icon support and round-trip translation. Unknown names keep their source value, show a diagnostic, and render a neutral placeholder. No silent substitution with another meaningful icon.
- Replace the inspector's small select with a compact anchored picker. Search names and related terms above a fixed-size scrollable grid. Render only the visible portion or bounded batches; do not mount the entire catalog as a large SVG DOM.
- Show the current choice and Remove icon. Provide arrow navigation, Enter selection, Escape close, focus return, useful icon-name disclosure, and an empty-result state. Reserve title space across box, pill, circle, diamond, text, and image nodes, including external image captions.
- Verify search with related terms from the chosen metadata. Check selected icon → save/reload → undo/redo, long titles, and glyph output in both renderers. Measure the built catalog size and opening/search behavior before adding loading machinery.

### Desired end state

- Users can discover an icon visually or by related words and save it beside the node title.
- The same stable name produces the same glyph in the editor and CLI.

## Milestone 5: Export and package the complete rich diagram

- Materialize referenced visible images before SVG serialization in `src/state/files.ts`, `src/lib/svg-export.ts`, and `comparison-export.ts`. Convert export commands to await image bytes where needed. Embed the visible preview at suitable quality; preserve original references and all attachments in editable metadata. Keep server URLs out of metadata.
- Update `src/cli/svg.ts` and its call in `main.ts` to resolve paths from the input diagram and embed visible images and glyphs. Do not broaden this work into complete renderer unification.
- Verify exported SVG without the server, browser PNG rasterization, Compare SVG, and CLI SVG. A missing image must produce an explicit failure or labelled placeholder; never silently disappear. Reload editable SVG/JSON metadata in the local workflow with the correct source base. If the base cannot be recovered, require a saved diagram location before resolving relative paths.
- Update `docs/DSL.md`, `docs/ARCHITECTURE.md`, package documentation, and relevant third-party notices in `scripts/build-cli.ts`. Document asset ownership, path bases, portable conversion, and undo leaving files intact. Add one representative example and the changeset required by release conventions.
- Run `pnpm check`, then `pnpm cli:build` and `pnpm cli:pack-check`. Run the rich-content proof with the built package entry as well as the source checkout. Save screenshots of node content, image inspection, and picker under `tmp/`; attach them to the implementation PR using `gh --attach`.

### Desired end state

- Current browser and CLI exports visibly preserve images and icons.
- The installed package serves assets and includes its icon data and license notices.
- All agreed product behavior has observed proof; only then assess initiative completion.

## Open decisions and spikes

1. **Icon catalog packaging, before milestone 4.** Confirm a pinned source supplies SVG data and usable search terms, with its license. [Lucide's official guide](https://lucide.dev/guide/solid) confirms Solid support; it does not prove a shared CLI catalog or bundled search metadata. Prefer one generated local catalog from pinned upstream assets. If metadata is absent, generate a small checked-in term index from upstream metadata and add a few local synonyms. Do not add a remote search service or second icon family.
2. **Content fit, within milestone 1.** Compare title, icon, and thumbnail bounds for ordinary shapes using representative short and long titles. Output deterministic content insets and minimum sizes. If a thumbnail does not fit a shape, enlarge its deterministic minimum or use an explicit saved size; never change the shape or wait for image dimensions to settle layout.

## Below the cut line

- Cloud assets, image editing, SVG image attachments, and general rich text.
- Asset database, automatic cleanup, reference counting, and background image processing.
- Workspace-wide portable archives or a second browser persistence model.
- General attachment reordering/replacement, icon favorites/recents, and multiple icon libraries.
- Compatibility migrations, speculative retries, runtime feature flags, and deployment work.

The most likely failure is an apparently complete preview that loses references through normalization, history, or export. The early round-trip proof and final standalone exports are the gates against that outcome.
