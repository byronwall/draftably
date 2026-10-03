# Layout you can rewind
## Diagram Studio v7 · recorded journeys and local layout painting

The editor now has two complementary ways to refine an almost-finished diagram: a **layout timeline** and a **soft-edged layout brush**. Neither requires replacing the working diagram to inspect a possibility. The existing comparison Grid and Overlay remain available.

Open `diagram-studio.html` directly after extracting the ZIP. The editor has no runtime network dependency. The source and documentation are included beside it.

## 1. Inspect the journey, not just the destination

Click **Timeline** or press **Alt+T**. The selected approach runs from your current positions toward its computed finish, recording intermediate arrangements. A selected container scopes the run to its contents; selected siblings scope it to those objects; no selection means the whole diagram.

The initial slider position is your existing drawing. Drag the slider, use the arrow buttons, or use the native range control with Left/Right, Home and End. Hovering another point on the track temporarily previews that checkpoint; moving away returns to the chosen position. **Play** advances recorded steps and can be paused. It does not autoplay on opening, including when reduced motion is enabled.

**These are recorded solver checkpoints, not a linear morph between two endpoints.** The slider is discrete and samples the recorded path. Its step number is not a percentage of optimality and not an estimate of elapsed solver time. A warm settle is not identical to repeatedly pressing L: the normal small pass has positional anchoring and a movement cap that this run intentionally relaxes.

The run ends because movement settled, the objective plateaued, or the solver effort limit was reached. “Computed finish” therefore means the end of this configured computation, not a guarantee of the best drawing. Read the endpoint's stop label and the current checkpoint's overlap count.

### Keep your bearings

The default ghost is **Next meaningful change**: dashed future outlines and motion guides from a later checkpoint, chosen to show roughly 48 screen pixels of movement for at least one object when that much change remains. This is a perceptual lookahead, not a promise of improvement. Near the end it can show a smaller change.

Choose **Computed finish** to ghost the endpoint or **Off** to remove the overlay. The diagram at the selected checkpoint uses the normal node renderer and freshly routed connections. Ghosts are positional outlines; they do not add a second complete, labeled diagram over the first.

The camera does not jump as the slider moves. **Fit path** is an explicit one-time camera operation that fits the union of all recorded positions above the timeline controls. All subsequent slider stops use that same camera. Ordinary panning and zooming remain available.

### Nothing is saved until Keep

The visible geometry is a render-only buffer. The committed graph, browser diagram save, undo history, and public `get()` result retain the baseline while you scrub. Diagram export is deliberately blocked during the preview rather than silently exporting either a hidden baseline or an uncommitted state.

**Keep & edit** commits the selected checkpoint and its displayed routes as one undoable edit. **Keep & brush** does the same, then activates local restoration. Escape, closing the panel, or undoing an open preview discards it. Camera changes are navigation state and are not rolled back by cancel.

## 2. Keep the good 90%; repair the other 10%

A useful workflow is:

1. Open Timeline. Scrub until the area you care about still has the right shape.
2. Click **Bookmark for restore**. This records an exact geometry source, without committing it.
3. Scrub farther ahead, including all the way to the computed finish. Click **Keep & brush**.
4. Hold or drag over the unsatisfactory area. Only eligible shapes under the brush move toward the bookmark. Objects outside its footprint retain their new positions.
5. Leave **Hold restored nodes for the next layout** enabled to protect the touched nodes during the next Improve, Timeline, or comparison run. Use **Preview from here** to compute another journey from the repaired drawing.

Restoration is gradual, not an atomic replacement of a rectangular region. Each dab has a movement budget and a smooth falloff. It will not push through another shape merely to recover an earlier position. If the old position is no longer reachable because surrounding geometry changed, it may stop short; enlarge the brush, move the blocker, or return to an earlier full checkpoint. The UI reports a blocked local proposal.

The latest recorded path can also be reopened from **File → Reopen last layout timeline**, or **Last path** in the brush controls. Reopening does not rerun the solver. Changes to objects, connections, pins, or incompatible sizes require a new recording; a historical path must not overwrite a different graph. Manual position-only edits can coexist with the retained history.

## 3. Paint a local layout goal

Press **W** or click the brush in the top toolbar. The editable diagram remains visible. Hovering shows the influence footprint and a one-dab positional preview; hover never commits. Hold the pointer down to repeatedly apply small dabs, or drag to move the active area. Release commits the complete stroke as one undo entry. Escape, pointer cancellation, loss of capture, or window blur cancels an unfinished stroke.

| Brush | Local goal |
| --- | --- |
| Tidy nearby | Ease stretched links, align close neighbors, and relieve local crowding. |
| Nudge into flow | Apply stronger directional pressure while preserving the surrounding drawing. |
| Make space | Separate crowded rectangles without imposing a new global structure. |
| Restore from bookmark | Move toward positions in the selected restoration source. |
| Hold this area | Protect touched shapes from subsequent automated movement without changing their coordinates or exported pin flags. |

**[ and ]** change radius while the brush is active; outside brush mode they keep their existing sidebar shortcuts. **L** applies one dab at the last canvas pointer position, or canvas center when none exists. Hold **Alt** while painting to restore temporarily; in Hold mode, Alt removes local holds. **Space-drag** pans. Escape exits to Edit after first cancelling an active stroke.

Local holds appear as teal outlines. They are session-owned protection, not semantic data and not ordinary pins. They participate in undo and redo. Clear them with **Clear holds**; explicit pins are unaffected. A restore stroke can continue through its own temporary local holds, so the first dab does not lock out the next dab. Explicit pins and pinned ancestors always win.

### The influence field

Radius is measured in **screen pixels**, so it feels the same at different zoom levels. The engine converts it to world coordinates for that invocation. Distance is measured to the shape's rectangle, not only its center: touching a box makes it eligible even when its center is farther away.

At the center the influence is strongest. The outer band uses a smoothstep falloff. At and beyond the radius the influence is exactly zero. Strength affects both the intended motion and its per-dab cap. The footprint includes a core outline and an outer ring; eligible objects receive a faint tint. Protected objects are reported separately.

A stroke changes visible leaf shapes. It does **not** translate or resize containers, reparent a shape, expand collapsed content, or move hidden descendants. This deliberately avoids accidentally dragging an entire subsystem when the cursor grazes its frame. Use the ordinary container tools or a scoped timeline for that operation.

### Local preference can beat the global objective

Brush dabs are not accepted or rejected using the whole diagram's layout energy. A local repair may lengthen a remote connection or make a global score worse. That is allowed. The safety boundary is geometric: preserve pins and protected geometry, preserve containment, cap movement, and do not introduce or enlarge rectangle collisions. A line search attenuates a proposed move when nearby shapes block it.

This is not a promise of collision-free edge routing. Edges are recalculated by the existing router after the positions change; crossing, port, and lane constraints can still conflict. It is also not a guarantee that motion between sampled frames is collision-free. The slider shows discrete recorded arrangements, not a continuously constrained morph.

## 4. Reversibility and durability

An accepted timeline checkpoint is one geometry transaction. A whole paint stroke is one transaction. Protection-only strokes are also undoable, and undo/redo restores their local hold set together with geometry when applicable. A cancelled stroke creates no entry. Bookmarks and preview navigation do not pollute the diagram's history.

The last timeline is kept separately from the graph save. When browser storage permits and the serialized history is below 3.5 MB, it is also saved under a separate history key. Larger histories remain in the tab. A new timeline replaces the last stored path; this is not an unbounded project history system. Local holds do not persist across reloads or document switches—use ordinary pins for permanent protection.

**File → Save layout timeline** downloads a JSON history containing the baseline document, recorded geometries, bookmarks, parameters, run constraints, and report. Run constraints are history provenance, not permanent pins or ordinary diagram settings. Open that file through the ordinary file importer to restore the recording. Import validates the baseline and checkpoints before replacing the editor. This file can contain the complete diagram and embedded image data; treat it as an editable project artifact, not an anonymous screenshot.

Normal JSON, editable SVG, and PNG exports remain. They contain committed diagram state, not brush UI, ghosts, the whole timeline, or transient holds. Normal SVG still contains the editable document metadata. PNG is image-only.

## 5. Parameters and implementation limits

Default timeline effort is 640 iterations per local solve. Recording is bounded to at most 96 checkpoints; older samples are thinned when necessary, retaining the original start and exact final output. Internals may evaluate more states than appear on the slider. The reported iteration number is the solver's counter, while the slider uses recorded-checkpoint index.

The brush defaults to radius 190 screen pixels, strength 35%, softness 75%, and a per-dab maximum of 18 world pixels before strength/falloff. With the default strength, the strongest part of a dab is bounded to 6.3 world pixels. While held, dabs are requested about every 90 milliseconds; actual cadence depends on solver/rendering cost and pointer events. The total distance of a long stroke is not capped at 6.3 pixels. Release to finish a stroke; do not confuse a per-dab budget with a per-stroke budget.

This release does not add another global layout algorithm. It changes how the existing eleven approaches can be inspected and combined with local human preferences. The brushes use original local spring, directional, separation, and restore steps. They are not packaged production force-layout libraries.

## 6. Verification

Current executable results and qualifications are in `verification/CHECKS.md`. Tests exercise both DOM-free geometry and real Chromium pointer/keyboard behavior against the built HTML. The native file-navigation attempt was blocked by browser policy, so the browser suite injects the exact HTML into a fresh page. Persistence assertions use an explicit test adapter and do not establish native file-origin persistence.

Physical Mac gestures, Firefox/Safari, and large production graphs remain unverified. The supported examples are not proof that all graphs, all local repairs, or all global layouts are attractive. The tool's purpose is to make those differences visible and reversible rather than to conceal them behind a single “best layout” score.
