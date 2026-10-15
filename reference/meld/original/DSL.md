# Meld DSL 0.1

This document describes the **implemented** language. More ambitious production ideas in the research report are not additional supported syntax.

## Lexical rules and identity

Use one complete statement per line. Indentation is cosmetic; it does not create a group or continue a statement. Blank lines are allowed. `#` and `//` start comments outside quoted strings. Strings use JSON double-quote escaping. An attribute is `key=value`, including `detail="A longer explanation"`.

Identifiers match `[A-Za-z_][A-Za-z0-9_.-]*`. Node/group IDs share one global namespace. Edge IDs and view IDs each have their own namespace. `root` is reserved as the outer layout scope. A dot in an identifier is just a character; it does **not** imply containment. Use `in=` explicitly.

References may point to later declarations. Duplicate IDs, duplicate attributes, duplicate layout declarations for the same scope/view, unsupported attributes, unknown references, and containment cycles are errors. Declaration order is a deterministic default ordering input. The editor preserves the location of an existing node declaration when renaming it.

All geometry units are logical CSS pixels. Numbers must be finite and within parser bounds. Pixel density affects raster display, not the compiler coordinates.

## The model

```text
diagram "A checkout, end to end" version=1

group platform "Platform" color=teal priority=10
group workers "Domain services" in=platform
node api "API gateway" in=platform detail="One entry point"
node orders "Orders" in=workers
node payments "Payments" in=workers
node db "Database" kind=database

edge dispatch api -> orders "create order" importance=10
edge charge orders -> payments "authorize" importance=9
edge persist orders -> db "persist" kind=data importance=8
```

The `diagram` statement is optional, and at most one is allowed. Only `version=1` is supported.

| Statement/attribute | Meaning and default |
|---|---|
| `node id "label"` | A leaf object; default parent is `root`. |
| `group id "label"` | A container; may itself have a parent group. |
| `in=groupId` | Direct containment. A parent must be `root` or a declared group. |
| `kind=service` | `group`, `service`, `app`, `database`, `queue`, `person`, `document`. Default group kind is `group`; node kind is `service`. All currently use card geometry. |
| `detail="..."` | Secondary node text. When absent, the kind is displayed. |
| `color=auto` | `auto`, `blue`, `teal`, `violet`, `orange`, `slate`. Auto inherits an ancestor palette or falls back to slate. |
| `priority=5` | Number from 1 to 10. Higher-priority groups are less attractive candidates for automatic collapse. |
| `edge id source -> target "label"` | Explicitly identified directed relationship. The label is optional. |
| `importance=7` | Number from 1 to 10. `edges=primary` retains values at least 7. |
| `kind=sync` on an edge | `sync`, `async`, or `data`; async uses a dashed route. |
| `from=auto to=auto` | Endpoint sides: `auto`, `left`, `right`, `top`, `bottom`. Not arbitrary port IDs or waypoints. |

The semantic model has one containment parent per object. The same object can appear in several named views, but this prototype does not support two separate instances of it within one composed/inset canvas.

## Layout recipes

```text
layout root flow direction=auto gap=48
layout platform column gap=28
layout workers row gap=24
layout workers grid columns=2 gap=32 view=brief
```

A layout statement is `layout scope algorithm [attributes]`. It controls the **direct children** of that scope. A group's internal layout is independent from its parent's recipe for arranging that group with its siblings.

Algorithms are `flow`, `row`, `column`, `grid`, and `radial`. Flow handles directed cycles through SCC condensation and assigns longest-path ranks. It does not implement global crossing minimization. Row and column use deterministic order. Grid sizes columns and rows from their members. Radial places boxes on a circle and runs the same refinement pass.

| Layout attribute | Meaning |
|---|---|
| `direction=auto` | Flow orientation; `auto`, `right`, or `down`. Auto chooses right when width ≥ 700 and width/height > 1.12, otherwise down. It is not an aspect-ratio optimizer. |
| `gap=28` | Base spacing, from 8 to 300. An undeclared root recipe defaults to flow/gap 48; an undeclared group recipe defaults to column/gap 24. |
| `columns=auto` | Grid columns, `auto` or an integer from 1 to 20. Auto is estimated from available width. Other algorithms ignore it. |
| `min-width=0 min-height=0` | Minimum outer dimensions for an expanded container, each at most 10,000. Not upper bounds. Use them to reserve room. They have no useful effect on `root`, which is not rendered as a container. |
| `view=viewId` | Restrict the recipe to a view. Without this field, it is global. A view recipe replaces the entire global recipe for that scope rather than merging individual fields. |

Expanded groups use a 22-pixel side/bottom inset and a 48-pixel header/content offset. Group titles do not dynamically grow the header; long titles generate a warning. Defaults are intentionally visible and easy to replace in the core.

## View contracts

```text
view explore "Explore" mode=interactive width=1100 height=720 detail=auto edges=all
view brief "Briefing" mode=static width=960 height=540 detail=auto edges=primary min-font=11
view card "Small card" mode=static width=480 height=320 detail=auto edges=primary
layout root grid columns=2 gap=24 view=card
```

| View attribute | Meaning and default |
|---|---|
| `mode=interactive` | `interactive` or `static`. Interactive enables canvas drag, pan/zoom, and group disclosure. Static output assumes none of these affordances. |
| `width=1100 height=720` | Target viewport. Width 240–4,000; height 200–4,000. These are compiler inputs, independent of preview CSS scale. |
| `detail=auto` | `full`, `auto`, `overview`. Full retains all uncollapsed/in-scope objects. Overview collapses top-level groups. Adaptive static mode greedily considers group collapse to protect primary text. Interactive auto does not automatically collapse. |
| `edges=all` | `all` or `primary`. Primary keeps importance ≥ 7. |
| `min-font=11` | Target minimum after fit for 12-pixel primary node/group/edge text; allowed 8–24. Footer captions are smaller and are not covered by this budget. Overflow is reported rather than falsely guaranteed solvable. |
| `focus=none` | A node/group ID or `none`. Includes the selected subtree, immediate edge neighbors, and ancestor context. It is not an arbitrary query language. |
| `collapse=none` | Comma-separated group IDs or `none`. Explicit collapse is part of the source. A focused group and its ancestors are protected from collapse. |

A declared view defaults to `min-font=11`, no focus, and no explicit collapse. With no view declarations, a default interactive `explore` view is supplied.

Adaptive static disclosure evaluates bounded candidates and prefers useful fit improvements relative to group priority. It can fail to find a feasible or best summary. Use an explicit overview, focus, another view recipe, or a larger viewport when warned. Expanding a group in a static view via the inspector changes detail to full so the adaptive pass does not immediately collapse it again.

When groups collapse, edges attach to the outermost collapsed ancestor. Internal edges are omitted. Redirected parallel edges of the same kind are aggregated, with original edge IDs/labels retained. Edge filtering, internal suppression, and out-of-scope exclusions are counted separately. Full semantic outline/provenance is included in exported SVG metadata.

## Refinement statements

All refinement statements accept optional `view=viewId`. Without it, they apply globally. View-specific positional preferences override global positional preferences for the same object. A view-specific order/size overrides its global equivalent. Alignment declarations otherwise accumulate.

### Ordering and alignment

```text
order workers orders payments
align y orders payments strength=prefer view=explore
align x api queue strength=required view=explore
```

`order scope id...` lists direct children in preferred default order; unlisted children follow in declaration order. In flow layout, graph ranks still take precedence, so order is not a hard geometric left/right constraint.

`align x id...` aligns horizontal **centers**, not left edges. `align y id...` aligns vertical centers. The default strength is `prefer`; `required` unifies center variables. All members must be direct siblings. Conflicting pins win over incompatible alignment and produce an error diagnostic.

### Relative placement

```text
near payments orders side=right gap=32 offset=0 strength=prefer view=explore
```

`near object reference` requires two different direct siblings. Side is `right` (default), `left`, `above`, or `below`. Gap defaults to 28 and accepts 0–2,000. Offset defaults to 0 and shifts the orthogonal center alignment. Dependencies must be acyclic.

A preferred relation establishes a starting position and resistance to movement; non-overlap and required constraints may adjust it. With `strength=required`, **the side and minimum gap** are enforced when feasible. The orthogonal offset remains a preference. Add a required center alignment separately when both axes must be constrained. This is not a general two-dimensional equality solver.

The browser's Relative drag mode infers a noncyclic nearest sibling, side, minimum gap, and center offset. It falls back to a nudge when no suitable sibling exists. This is an editable interpretation of a drag, not perfect intent inference.

### Offsets, stays, and pins

```text
nudge payments dx=16 dy=24 view=explore
stay orders x=0 y=0 weight=8 view=explore
pin gateway x=30 y=50 view=explore
```

A `nudge` is an offset from the fresh automatic base for the same input. Repeated rendering never adds it to the previous output. It uses a fixed preference weight in this prototype.

A `stay` stores a preferred parent-content-local position. Its weight defaults to 8 and can be 1–100. Coordinates must be nonnegative. Stays are explicit geometry seeds, not hard locks. They make preservation across a later edit reproducible.

A `pin` stores a hard parent-content-local position. Coordinates must be nonnegative. Pinning a group moves its subtree, while pinning a child constrains it relative to the group's content origin. Pins do not freeze other objects.

Do not intentionally combine several positional hint types for the same object/view. The parser permits distinct types; processing order is stay, nudge, near, then pin, followed by constraint refinement. The editor replaces competing positional records for its active view instead of accumulating them.

**Add component** records stays for automatic objects (and refreshes existing stays), retains authored near/nudge/pin hints, and appends a new node plus an edge from the last leaf sibling when one exists. **Reflow scope** removes only view-local soft near/nudge/stay/alignment inside the selected subtree; required constraints, global hints, order, and pins remain. It captures outside stays and recompiles the full model.

### Dimensions

```text
size api width=220 height=90 view=explore
layout workers grid columns=2 min-width=600 min-height=350 view=explore
```

`size` applies to leaf nodes. Width is 80–1,200 and defaults to 184. Height is 48–1,200 and defaults to 72. Text can make the actual height larger than requested. For groups, use minimum layout dimensions instead. The inspector's **+ Room** action adds 100 pixels to the current outer width and height as minimums.

## Exact checkpoints

The Checkpoint command generates this shape; the key below is schematic and must be replaced by a real 64-character SHA-256 key:

```text
snapshot explore key=<64-hex-character-input-key> engine=meld-0.1
box explore api x=280 y=48 width=184 height=64
box explore orders x=302 y=180 width=184 height=64
```

Use the generated output, not the placeholder. There is one snapshot declaration per view and one box per visible object in that view. Box coordinates are **absolute diagram/world** coordinates, unlike parent-local pins/stays. Width/height are exact cache geometry. Routes are recomputed deterministically from replayed boxes and current edge inputs.

The key covers the canonical model, applicable layouts/hints, selected view context, and engine version. Comments and source line numbers do not affect it. Relevant content or viewport changes invalidate the checkpoint. Stale boxes for deleted objects are allowed so they do not prevent normal model edits. The cache is ignored when key, engine, visible IDs, or box count no longer matches.

A checkpoint is generated, optional geometry—not a semantic substitute for `near`, `order`, or other adaptable intent. Store portable author preferences as those smaller statements. Manual edge path/label checkpoint records are not implemented.

## Errors and reproducibility

Malformed source fails with a line diagnostic. The editor keeps the last valid preview and disables layout mutations until the source is valid. Constraint conflicts and routing/viewport quality problems appear as scene diagnostics rather than parser errors. They are not proofs that no possible layout exists: the solver is bounded and heuristic.

Reproducibility is tested by comparing full canonical geometry across fresh parses and runtimes. The short geometry fingerprint is for inspection only. Exact raster/font identity across operating systems is outside the prototype's guarantee.
