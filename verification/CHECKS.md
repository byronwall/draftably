# Verification ledger
## Diagram Studio v7 · final assembled application

**Result: 249 engine assertions and 91 Chromium browser assertions passed.** The counts are individual assertions, not that many unique end-to-end workflows. The v6 regression suites were rerun against the v7 artifact; this ledger does not reuse their previous results as evidence.

| Suite | Passed | Evidence |
| --- | ---: | --- |
| Layout, intent, constraints and routing regression | 195 | `geometry.cjs` / `geometry-results.json` |
| Recorded journey and brush geometry | 54 | `sculpt-geometry.cjs` / `sculpt-geometry-results.json` |
| Editing and comparison browser regression | 40 | `browser_checks.py` / `browser-results.json` |
| Timeline, brush, history and persistence-adapter browser scenarios | 51 | `sculpt-browser.py` / `sculpt-browser-results.json` |

Browser: **Chromium 144.0.7559.96**. Uncaught page errors in both completed browser runs: **0**.

SHA-256 of the tested application:

```text
444542bc9ce2e681d48f204fac11e54f309ba01089b9d8c9923b861e525b9c2d
```

## What was actually exercised

The scripts inject the exact shipped HTML into fresh Chromium pages. They use actual SVG/DOM rendering, workers, mouse presses and drags, keyboard events, native range controls, and application data assertions. They do not replace the application layout or routing algorithms with stubs.

The new browser suite supplies an **explicit localStorage test adapter** to inspect stored bytes and reload them into a fresh application. This verifies save/restore logic, but does **not** verify native file-origin localStorage permissions or persistence. The inherited regression suite has no storage adapter. Browser storage availability can differ between these test contexts and an actual local browser.

A separate native file-navigation probe produced **ERR_BLOCKED_BY_ADMINISTRATOR**; see `environment-results.json`. This is an environment block, not a passing native startup check. No native download destination was verified. PNG checks inspect the returned PNG blob; editable SVG is checked for committed metadata and exclusion of transient UI.

A deliberately denied Worker constructor exercised the local timeline fallback. The app recovered with usable checkpoints. Worker cancellation and a simulated concurrent semantic edit were also tested to verify that late or stale results cannot overwrite the working document.

## New behavior coverage

Recorded journeys were computed with **all eleven active algorithms**. Every path began at the exact authored geometry and ended at the actual solver result. All tested coordinates were finite; histories remained within 96 checkpoints. The same source/settings reproduced the same recorded geometry. Pin and local-hold positions were checked across every recorded frame, including inherited container movement.

Brush checks verify feathering, exact non-movement outside the footprint, weighted motion caps, unchanged graph/settings/container dimensions, no new or increased rectangle collisions, pinned ancestors, empty-brush no-ops, missing restore IDs, and 80 repeated local dabs. These assertions concern rectangular geometry; they do not prove optimal routing or a globally better drawing.

The principal user workflow was exercised with real pointer/keyboard input: record a path, bookmark an earlier checkpoint, keep a later result, restore only part of it with a held brush stroke, undo and redo both the geometry and its temporary holds, then generate another path that protects the repaired area at every checkpoint. That workflow intentionally does not undo the whole later layout merely to recover one area.

The timeline controls fit without horizontal overflow at **1024 × 768** and **1440 × 900**. The regression suite additionally checks six-way comparison grids at **1920 × 1080**. Both browser suites use reduced motion. Timeline playback is explicitly requested, never started automatically. Normal-motion transitions and physical gesture hardware are not covered.

## Broad drawing-quality sweep

Five existing fixtures × eleven algorithms = **55 final drawing cases**. These are measured outcomes, not a claim of perfect drawings or a verdict on the quality of every intermediate checkpoint.

| Metric | Cases with a residual | Total reported residuals |
| --- | ---: | ---: |
| Node overlaps | 0 | 0 |
| Blocked routes | 0 | 0 |
| Insufficient parallel-segment gaps | 0 | 0 |
| Edge crossings | 12 | 28 |
| Non-feedback backward-order relationships | 14 | 26 |

A local brush may make a global metric worse by design. Collision/containment protections and explicit pins are not optional, but reducing global energy is not an acceptance rule for a user's local repair. Local restoration may stop short of a prior coordinate if its former space is now occupied. Existing conflicts are not proof of solver or router malfunction; they can reflect incompatible constraints, finite frames, or the limits of the heuristic.

The small-fixture engine timing observation in `sculpt-geometry-results.json` excludes browser routing and rendering. It is **not** a production frame-rate benchmark or large-graph performance claim.

## New browser assertion inventory

- **Passed** — v7 boots in Edit with the new tools visible.
- **Passed** — Alt T records more than two real solver checkpoints.
- **Passed** — Opening the timeline does not alter committed geometry or history.
- **Passed** — Title and layout controls are disabled while geometry is only a preview.
- **Passed** — Native keyboard End previews the computed finish.
- **Passed** — Native Home and arrows scrub one recorded checkpoint at a time.
- **Passed** — Hover peeks without changing the chosen slider stop.
- **Passed** — Leaving hover restores the chosen stop.
- **Passed** — Scrubbing never writes candidate geometry to document or storage.
- **Passed** — Diagram export cannot accidentally save an uncommitted timeline preview.
- **Passed** — Explicit Fit path provides one unchanged camera across slider stops.
- **Passed** — Computed-finish ghost is drawn without modifying live data.
- **Passed** — Ghost can be disabled.
- **Passed** — Explicit playback advances recorded states and pauses.
- **Passed** — Bookmark captures an exact restore source.
- **Passed** — Timeline controls fit without horizontal scrolling at 1024×768.
- **Passed** — Timeline controls fit without horizontal scrolling at 1440×900.
- **Passed** — Keep & brush commits exactly the shown coordinates as one undo entry.
- **Passed** — Kept route polylines match the chosen preview.
- **Passed** — Timeline application never persists local holds or invocation scope in diagram settings.
- **Passed** — Keep & brush begins restoration from the bookmarked step.
- **Passed** — Leaving the timeline restores disabled editor controls.
- **Passed** — Brush hover shows eligibility without mutating geometry.
- **Passed** — Holding a stroke previews local motion without committing during the gesture.
- **Passed** — A held local-restore stroke changes a subset, with exactly one undo entry.
- **Passed** — Restored nodes get temporary local holds, not pins.
- **Passed** — Undo restores the entire stroke and its local holds.
- **Passed** — Redo restores both stroke geometry and local holds.
- **Passed** — Comparison generation receives the current local holds.
- **Passed** — Further restoration can reach already-held nodes.
- **Passed** — Escape cancels an in-flight brush stroke with no undo entry or leaked edit.
- **Passed** — Bracket keys resize the active brush rather than toggling side panels.
- **Passed** — Space-drag in brush mode pans without altering objects.
- **Passed** — The next global timeline protects locally restored nodes at every checkpoint.
- **Passed** — Cancel timeline preserves the working document and history.
- **Passed** — A finished path can be reopened without rerunning the solver.
- **Passed** — Invalid timeline metrics are rejected before changing the working document.
- **Passed** — A recorded path cannot smuggle movement of a pinned object through import.
- **Passed** — A saved timeline round-trips through import, retaining checkpoints.
- **Passed** — Hold brush changes protection without moving or pinning nodes.
- **Passed** — Protection-only stroke is undoable.
- **Passed** — Protection-only stroke is redoable.
- **Passed** — Repeated Escape returns to Edit after brush and timeline modes.
- **Passed** — SVG export contains committed graph metadata but no brush UI or local-hold adornments.
- **Passed** — PNG export still produces an actual PNG blob.
- **Passed** — Changing documents clears local holds and stale restore sources.
- **Passed** — Escape cancels an in-progress timeline worker without late adoption.
- **Passed** — Stale candidate guard preserves a concurrent semantic edit.
- **Passed** — Worker denial falls back to a usable local timeline.
- **Passed** — Committed geometry restores on a fresh boot with the explicit storage adapter.
- **Passed** — No uncaught browser errors in new timeline and brush scenarios.

## Retained regression coverage

The 40 browser regression assertions cover Edit as the default, rapid connected-node creation, start/end hint semantics and undo, invalid-reference rejection, multi-selection dragging, background panning, independent container resizing, six-candidate generation, all three comparison camera modes, click-anchored overlays, layer visibility and opacity, keyboard anchoring, SVG serialization, exact candidate application and one-step undo, routing-only candidates, stale-result protection, and two-axis parameter grids. Consult the JSON inventory for each individual check.

## Not run / not established

Native local-file startup and file-origin persistence; native download destinations; physical Mac trackpad and Option-key behavior; physical touch gestures; Firefox or Safari; a comprehensive screen-reader/accessibility audit; exhaustive security review; maximum-size graph performance; crash recovery beyond the tested save/restore paths; cloud or collaborative editing. Earlier features outside the named regression assertions were not exhaustively re-audited.

Session local holds do not survive a reload or document switch. Use actual pins for persistent protection. Saved timeline files retain their run constraints as provenance but do not reactivate those temporary holds on import. The editor itself has no runtime network dependency; documentation references may link to online sources.

## Reproduce

Run from the extracted release folder. Node 22+, Python, Python Playwright, and an existing Chromium executable are required for checks, not for using the standalone app. The documentation builder also uses Python `mistune`.

```bash
# Build exactly what the browser tests consume.
python source/build.py
python source/build_docs.py

# Check the computational model and the interactive application.
node verification/geometry.cjs
node verification/sculpt-geometry.cjs
python verification/browser_checks.py
python verification/sculpt-browser.py

# Report native navigation separately; a policy block is not a passing check.
python verification/environment-check.py

# Create the byte-level manifest and verify the final ZIP CRCs.
python source/package.py
```

Browser scripts accept `CHROMIUM=/path/to/chromium` for a different browser executable. `STUDIO_NATIVE=1` opts the retained browser regression script into native file navigation in an unrestricted environment. The new brush/timeline script intentionally remains an injected-HTML test with a named storage adapter.
