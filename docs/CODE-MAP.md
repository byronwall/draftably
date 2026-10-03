# Code map
## Diagram Studio v7 · maintainable sources and interaction boundaries

`diagram-studio.html` is the executable release. Its source files are under `source/`. `python source/build.py` inserts the CSS and JavaScript into `shell.html`, producing the standalone file without a JavaScript build tool or network call. The build checks for unsafe inline script terminators.

This is still a plain-JavaScript prototype with shared global controller state, not a framework migration. The source split makes the modules inspectable and testable; it does not make their browser controllers independent. No repository changes or commits were made.

## 1. Runtime load order

| Source | Responsibility |
| --- | --- |
| `shell.html` and `styles.css` | Application structure, SVG layers, inspector panels, full-viewport comparison dialog, timeline deck, and brush controls. |
| `layout-engine.js` | DOM-free global layout, compound hierarchy, constraints, direction, start/end intent, metrics, and optional checkpoint recording. Exposes `LayoutLab`. |
| `routing-engine.js` | DOM-free automatic port/route search and diagnostics. Exposes `RouteLab`. |
| `explorer-engine.js` | Candidate configurations, parameter axes, scene projection, independent layout/routing candidates. Exposes `ExplorerLab`. |
| `sculpt-engine.js` | DOM-free timeline construction, checkpoint summaries, lookahead, local influence fields, and brush dabs. Exposes `SculptLab`. |
| `studio-app.js` | Document normalization, committed graph state, editing commands, renderer, camera, persistence, normal layout controls, exports, undo/redo, and public API. |
| `explorer-ui.js` | Grid/Overlay comparison, click correspondence, camera modes, candidate workers, applying a candidate, experiment export. |
| `sculpt-ui.js` | Timeline/brush transactions, pointer gestures, hover and ghost previews, local holds, bookmarking, replay, and temporal-history import/export. |

These are classic scripts, not ES module imports. The DOM-free engines also expose CommonJS exports for Node tests. The browser controllers deliberately reuse editor functions rather than introducing a second diagram renderer.

## 2. Committed document and render state

`D` in `studio-app.js` is the committed schema-2 document. `graph` contains nodes, edges and groups. `layout.nodes` contains geometry, manual markers and pins. `layout.edges` stores port constraints, route waypoints and label offsets. `layout.labels`, `layout.containers`, `layout.intent`, `styles`, `collapsed`, `settings`, `camera` and `theme` remain separate concerns.

`normalize` validates imports, stable IDs, references, hierarchy, geometry and finite settings. `migrateLegacy` extracts the old active graph from an obsolete saved-view document rather than resurrecting that user interface.

`S` holds selection, tool state, active drags, undo/redo, route caches and layout state. `S.animationNodes` is the old short animation buffer. **`S.sculptNodes` is the new render-only geometry override.** `geometryNode` reads it before ordinary geometry, while `snapshot()` and `diagramStudio.get()` still read D. This is the primary safety boundary for timelines and in-progress brush strokes.

`renderScene`, `renderNode`, `renderGroup`, `makeRoutes`, `renderEdges` and `renderOverlay` are reused by the new interactions. `sculptOverlay` appends non-interactive ghosts, motion guides, influence rings, and hold markers. Export removes the entire editor overlay layer. Rendered preview routes use `S.sculptRoutePrior` for a consistent prior-side context, and `S.pendingRouteResult` adopts the exact chosen routing on Keep.

## 3. Layout path recording

`LayoutLab.compute(input, opts)` still clones its input. New `opts.fixedIds` supplements ordinary pins and manual-position protection in the existing `direct`, `branch` and `fixed` tests. This protects held descendants against an ancestor translation without writing temporary pins into the document.

With `opts.trace`, the internal `captureTrace` records positions, iteration counter, phase and geometry metrics. It samples at an increasing stride and thins old samples near the 96-frame bound. Start and finish are forced captures. Intermediate samples avoid new overlap counts relative to the initial metric and avoid worsening frame spill. They are not guaranteed to monotonically improve every metric or preserve topology during motion between stops.

`SculptLab.journey` invokes the selected method in warm-settle mode by default. It removes duplicate consecutive coordinate snapshots, ensures the first geometry equals the source and the last equals the actual returned document, computes checkpoint movement summaries, and creates the separate `diagram-studio-journey` envelope. `lookahead` finds the first later checkpoint with a meaningful screen-space displacement, or the final checkpoint if less remains.

`openJourney` freezes the baseline, options, local holds, route prior and document signature. `journeyCompute` runs the exact same engines in a Blob worker. A worker creation/startup failure falls back to the yielding main-thread engine. The generation counter and signature guard prevent stale completion from being adopted. Cancelling a worker terminates it; cancelling a fallback invalidates its result even if the asynchronous solver continues to finish.

`journeyScrub` changes the render buffer and selected index. A hover uses a separate `peek` index. `journeyBookmark` captures a restoration source without committing it. `journeyKeep` captures the displayed routes, clears preview state, adopts the chosen geometry, and calls `remember` once. The camera is preserved. `closeJourney` discards the override and leaves the committed graph unchanged.

`journeyFitPath` explicitly computes a union of the recorded rectangles and fits it above the timeline deck. Repeated scrubbing does not call Fit automatically.

## 4. Brush computation

`SculptLab.field` finds visible leaf shapes and computes smooth falloff by point-to-rectangle distance. Actual pins, pinned ancestors, selected manual protection and local holds are excluded. Expanded and collapsed containers are not brush movement targets.

`SculptLab.dab` always returns a cloned document. It chooses one local policy: spring/alignment tidy, stronger directed movement, rectangle separation, coordinate restoration, or protection-only hit testing. Exterior neighbors may contribute forces, but nodes outside the influence support are never moved. Directed pressure uses the lowest common container's direction; feedback edges are identified by the existing topology routine.

Movement is capped per shape by field weight, strength and step. `constrainedTarget` clips against the current parent interior without resizing it. New/worsened rectangle intersections are checked only for changed-versus-visible pairs; ancestry and starting areas are cached per dab. A bounded line search attenuates the proposal. The brush does not compare proposals against the whole graph's spring/stress energy.

The returned object includes `document`, `weights`, `locked`, `moved`, `maxDisplacement`, `blocked`, `attenuation` and `mode` when applicable. These diagnostics distinguish an empty field, protected target, geometric blockage and an accepted local change.

## 5. Brush gesture transaction

`SCULPT` owns tool preferences, the pointer, hover result, active stroke, restore source, local hold set and timers. `brushActivate` enters W mode. Hovering calls `sculptHoverAt`, which computes a prospective dab and displays its outline without writing D.

`brushStart` captures the committed baseline and signature. The stroke has its own `working` document. `sculptStrokeDab` advances that document; the renderer sees its geometry through `S.sculptNodes`. Pointer movement and an approximately 90-ms held-pointer timer request more dabs. Pointer-up adopts the entire working geometry once. `sculptCancelStroke` drops it on Escape, pointer cancellation, lost capture or blur.

`sculptRememberHolds` attaches the before/after local hold sets to the corresponding history entry. Protection-only changes receive their own entry even though the document snapshot is identical. `sculptHistory` restores the appropriate set on undo/redo. Local holds are deliberately not serialized into the graph. `sculptCheckDocument` prevents a hold/reference from leaking into a different diagram with coincidentally reused node IDs.

`sculptFixedIds` feeds the hold set into normal `runLayout`, the timeline, and `exConfig` → `ExplorerLab.candidate`. Protecting an area should not depend on which layout entry point the user chooses.

## 6. Durability and import/export

Ordinary committed diagram persistence retains the existing `diagram-studio-v5` key for continuity. UI preferences use their existing separate key. The new latest-history key is `diagram-studio-v7-last-journey`.

`sculptArchive` retains the recording in memory and writes it to the separate history key only below the serialization cap and when storage is available. `reopenJourney` checks compatibility before rendering an old recording against the current source. `sculptImportJourney` validates the history envelope, normalizes its baseline, checks IDs, finite coordinates, metrics, pins and bookmark indices, then opens it through an undoable document replacement.

Normal exports are handled by `exportDocument` → `exportSVG` / `exportPNG`. An active timeline or uncommitted stroke blocks normal diagram export. Brush controls and ghosts are never exported as diagram content. Timeline export is explicit and can contain the full source diagram, image data and all recorded coordinates.

No download destination is verified merely because a Blob was constructed. The browser suite checks serialization and PNG Blob production separately from native download behavior.

## 7. Public API additions

The existing `window.diagramStudio` API remains. New methods are:

```javascript
// Record the selected layout from committed positions; wait until it is ready.
await diagramStudio.timeline({ algorithm: 'flow', maxIterations: 640 });
const history = diagramStudio.getJourney();
console.info('[timeline]', history.frames.length, history.report.termination);

// Select an exact recorded checkpoint. This is preview, not a document write.
diagramStudio.scrub(Math.floor((history.frames.length - 1) / 2));
diagramStudio.bookmarkFrame();

// Keep the endpoint, then restore only an area from the bookmark.
diagramStudio.scrub(history.frames.length - 1);
diagramStudio.keepFrame({ brush: true });

// Brush tool configuration, or one programmatic local dab.
diagramStudio.brush({ mode: 'restore', radius: 140, strength: 45 });
const result = diagramStudio.brushDab({
  mode: 'tidy',
  point: { x: 640, y: 320 }, // World coordinates.
  worldRadius: 180,
  strength: 35,
});
console.info('[brush]', result.moved, result.maxDisplacement, result.blocked);

// Ordinary undo/redo work for the accepted frame and the complete stroke.
diagramStudio.undo();
diagramStudio.redo();
diagramStudio.clearLocalHolds();
```

`timelineState()` reports preview indices, stop reports, bookmarks, brush settings, eligible/protected IDs and local holds. `cancelTimeline()` discards the preview. `get()` continues to return committed state while the timeline is open. Normal `set()` / import invalidates an open preview instead of allowing later completion to overwrite the replacement.

## 8. Migration boundaries

The most important extraction is a **transaction coordinator**, not another algorithm registry. Preserve the distinction between committed data, temporal recording, render-only geometry, restoration source and session protection. Those states have different lifetimes and different undo behavior.

Move the pure engines into typed modules first. Model timeline and stroke controllers as explicit states such as idle, computing, inspecting, painting and committing. Keep worker cancellation/generation checks at every asynchronous boundary. Avoid tying data persistence to a reactive render buffer; a store update caused by scrubbing must not be mistaken for a source edit.

Replace the current global hooks with explicit interfaces for geometry projection, route computation, history commands, document identity, view camera and diagnostics. Keep keyboard/tool routing centralized so a key cannot both paint and activate a second global command. Preserve Escape priority: cancel active stroke, cancel preview, exit transient tool, clear selection.

Local holds are not a replacement for a general constraint system. A production version might persist them as editing-session intent, but should distinguish them from pins and semantic graph data. A richer history model could retain multiple branches and selective undo; the current release deliberately retains one latest recording plus ordinary command history.

## 9. Verification entry points

`verification/geometry.cjs` exercises the inherited layout/routing constraints and broad sample cases. `verification/sculpt-geometry.cjs` exercises path endpoints, recording determinism, bounded sample memory, influence continuity, source immutability, outside-field identity, pins, held descendants, repeated dabs and collision safety.

`verification/browser_checks.py` covers existing editor/comparison interactions. `verification/sculpt-browser.py` covers native range keyboard handling, hover peeking, preview isolation, exact Keep, temporal restore, held strokes, cancellation, undo/redo of holds, history replay/import, ordinary exports and adapter-based boot restoration.

The tests operate on the actual rebuilt artifact. Read the current ledger for counts, browser policy restrictions and unverified environments. Geometry tests do not establish continuous animation safety, attractive output for every graph, physical-device behavior, or production performance.

## Recorded history validation

`sculptValidateJourney` is shared by explicit history import and the separate last-path storage loader. It validates frames, finite metrics, and pin invariants before adoption. Invocation-only constraints (`fixedIds`, selection, scope, solver effort) are recorded under the history artifact's `execution` field, never copied into ordinary diagram settings. Importing a recording does not reactivate its session-owned local holds.
