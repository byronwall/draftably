# Meld — diagram lab

A vanilla HTML/JavaScript experiment in **model + view + layout intent**. It implements the authoring loop requested in the brief: begin with automatic layout, refine a few relationships, add content, reflow a selected container, and persist either adaptable hints or exact boxes in the source.

## Open it

Open `meld-diagram-lab.html` in a modern desktop browser. Everything needed by the application is in that one file. There is no build step, account, server, framework, package installation, CDN, or runtime network dependency. The readable sources are included separately.

Managed browsers can block local HTML files. The automated Chromium tests in this environment injected the same document with Playwright `set_content` because its administrator policy blocks `file://` navigation. Application behavior and exports were tested; native opening of the file in an unmanaged browser, Safari, and Firefox was not verified here. Local-storage availability depends on browser policy. File exports do not depend on local storage.

The initial diagram is a checkout architecture. The **Guide** tab explains the controls. The **Outline** tab lets you select objects that are currently collapsed or omitted from a view.

## A five-minute walkthrough

1. Switch **Explore → Briefing → Small card**. The model remains the same. Static views use disclosure and, for the card, a different root layout. The viewport dimensions are compiler inputs, not merely CSS dimensions. The preview percentage is a separate screen-fitting scale.
2. Return to **Explore**. Drag the Payments box. In the inspector, the default drag mode is **Relative relationship**: the editor writes `near` with a sibling, side, gap, and offset. Try **Soft offset** or **Exact parent-local pin** to compare the alternatives.
3. Select the Domain services container. Change its layout to **Responsive grid** or **Vertical column**. The change applies to that container in this view; the parent still arranges it as a box.
4. Click **Add component**. This records soft stays for currently automatic boxes before adding a node and connection. Existing relative hints and pins remain. Click **Reflow scope** to clear view-local soft preferences inside the chosen scope while retaining constraints outside it.
5. Click **Checkpoint**, then **Verify ×20**. A checkpoint stores exact boxes. Verification compares complete canonical geometry, not just short fingerprints. Add another component: the old checkpoint becomes stale and the compiler falls back to live intent.

**Export DSL** saves the current authoring source. **Export SVG** saves a standalone, fixed-size SVG fitted to the selected viewport, not to the current pan/zoom camera. **Save project** includes source, selected view, and local undo history. **Import** accepts `.meld`, `.txt`, or the exported project JSON.

## Implemented

The DSL has stable node/group/edge identities, explicit containment, forward references, comments, named views, view-scoped layout overrides, and line-numbered validation errors. Unknown fields and duplicate declarations fail rather than being silently ignored.

There are five original layout implementations: directed flow, row, column, grid, and radial. Layout proceeds bottom-up inside nested groups, then arranges the resulting groups in their parent. Directed flow uses strongly connected components and longest-path ranks. It is not a production crossing-minimization implementation.

Refinements include sibling order, preferred/required center alignment, relative placement, fresh-base offsets, weighted stays, hard parent-local pins, node dimensions, and minimum container dimensions. Groups can be moved as units. Real pointer dragging round-trips to source.

Views include interactive/static mode, width/height, full/adaptive/overview detail, primary/all edges, focus, and explicit collapse state. Adaptive static views try group aggregation before accepting unreadable primary text. Edge redirection retains original edge identities and labels; omitted edges and hidden components are counted. The viewport rule is deliberately simple, not a general responsive-design optimizer.

Rendering uses SVG with deterministic orthogonal candidate routing, edge-label placement, pan/zoom, interactive group disclosure, selection, an inspector, an outline, source highlighting, and a bounded local undo history. Source text is escaped; the DSL has no script-evaluation or remote-resource primitive.

## The important limitations

**Scoped reflow is an authoring operation followed by a full deterministic compile.** This prototype does not have incremental dependency caching, a Worker scheduler, or a production partial-layout engine. It clears selected local preferences and records outside stays. Parent bounds and cross-boundary routes can still change.

Stays and relative hints are preferences, not promises that old coordinates never move. Overlap removal may move them. Hard pins are preserved; incompatible alignment or impossible overlap is diagnosed. The bounded heuristic refinement pass is not a complete feasibility solver and does not provide minimal unsatisfiable constraint sets.

Relative placement, alignment, and order operate between **direct siblings**. Cross-hierarchy semantic edges are supported, but arbitrary cross-container child alignment is not. Place the containing groups relative to one another, or use a shared layout scope.

The router is heuristic. Routes can overlap each other; a label can be displaced from its segment; complicated diagrams can still be unattractive. Manual edge waypoints, draggable labels, port ordering, multiple inset views on one canvas, continuous zoom-triggered levels of detail, custom shape drawing, sequence diagrams, and swimlanes are not implemented. All object kinds currently use card-like geometry.

The compiler is synchronous. A 100-node/99-edge synthetic example took about 81 ms median in the measured Node run; browser painting is additional. The parser limits of 250 objects, 800 edges, 12 containment levels, and 300,000 source characters are guardrails, **not** a promise of responsive behavior at those limits.

Geometry uses fixed character budgets and 1/16-pixel coordinate rounding, not font measurements from the DOM. Fonts are system fonts. Long group titles can be shortened in the header with a diagnostic; the full title remains in the outline/metadata. Unusual fonts, wide Unicode glyphs, and raster antialiasing can differ between platforms. The determinism claim concerns the tested compiler's geometry, not universal pixel-identical screenshots.

## Determinism and persistence

The core does not use time, randomness, DOM measurement, network data, or unrecorded previous-frame positions. A render depends on the model, applicable view/layout/hints, explicit viewport context, and engine version. A nudge is always applied to a fresh automatic base, so it does not accumulate across renders.

Exact checkpoints contain a SHA-256 key for the canonical applicable input plus generated `box` records. Matching checkpoints replay boxes and deterministically reroute edges. A changed model, hint, viewport, or engine invalidates the cache. Checkpoints are generated data, not the preferred way to express future layout intent. The shorter displayed geometry fingerprint is FNV-1a and is only a debugging convenience; `Verify` compares complete geometry strings.

Adding content can change the result. **Repeatability for identical input is different from stability under edits.** Explicit soft stays make the latter an input policy rather than an accident of the current browser session. The status bar reports surviving objects moved in parent-local versus world coordinates.

The History tab retains up to 60 materialized source states for local undo/redo. It is not a CRDT, append-only durable audit log, multi-user collaboration service, or replay dependency. Exporting the current DSL is sufficient to reconstruct a view without that history.

## Files and development

`research.html` / `research.md` contain the researched comparison and architecture recommendation. `DSL.md` is the exact prototype language reference. `AGENT.md` explains safe agent authoring. `examples/` contains three editable sources and static SVG outputs. `src/` contains the original core, UI, CSS, and template.

Rebuild the one-file application with the Python standard library:

```sh
python build.py
```

Headless use requires Node.js, but no npm packages:

```sh
node meld.cjs examples/commerce.meld --view card --check
node meld.cjs examples/commerce.meld --view explore --verify
node meld.cjs examples/commerce.meld --view explore > scene.json
node meld.cjs examples/commerce.meld --view explore --snapshot > checkpoint.txt
```

The last command prints a generated cache block; replace an existing cache for that view rather than appending a duplicate declaration.

Tests:

```sh
node tests/core.test.cjs
node tests/stress.cjs
python tests/browser.test.py
```

The browser test requires Python Playwright and Chromium; set `CHROMIUM_PATH` when necessary. Run the core test first to generate the cross-runtime geometry fixtures. Tests are not application runtime dependencies.

The delivered run passed **45 core tests and 26 browser integration tests**. Reports include methods, runtime versions, exact results, and measured timings. They cover real pointer dragging, source mutation, declaration-order-preserving rename, snapshot idempotence/invalidation, collapse/aggregation, exports/import, input escaping, responsive application layout, fresh-process repeatability, and agreement between Node and Chromium for every example/view.

This is an original experimental implementation, not a wrapper around or fork of Mermaid, D2, Reladraw, ELK, or another layout library. See `LICENSE` for the code license and the research report for external source references.
