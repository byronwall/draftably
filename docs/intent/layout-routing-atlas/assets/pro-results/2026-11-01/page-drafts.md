# Page drafts: the complete layout and routing documentation

These are substantive proposed reader-facing drafts for baseline `af70d8317797d5a522acffdd604819376a3ec893`. Destination labels and **Integration note** callouts are editorial instructions for Codex. They are not claims of shipped product changes. Existing slugs stay intact; new guide pages use the current Markdown system.

**Integration order:** (1) Choose where the change belongs; (2) Choosing a layout; (3) engine controls and layout recipes; (4) routing/ports; (5) refinements and repair; (6) Compare, timeline/brush and CLI. Exact figure IDs resolve in `visual-atlas.md` and `atlas-manifest.json`. All full `draft` fences are separately validated.


---

# Layout page drafts

These are proposed reader-facing sections for the existing Markdown/live-example system at baseline `af70d8317797d5a522acffdd604819376a3ec893`. Text labelled **Baseline limitation** describes current behavior and should remain visible until the corresponding product fix ships. Notes labelled **Author integration note** are for Codex and should not appear in the finished reader page. The companion sources named in captions are in `examples/layout/`; full visual recipes and rendering status are in its manifest. All190 positive companions now have finite actual CLI output and real Draftably SVGs under `evidence/layout/svg`; the measured no-effect and warning cases are explained in `evidence/layout/review.md`. Existing `draft` fences can render the small inline examples immediately; no new documentation framework is required.

## Choosing a layout

**Destination:** replace and expand the existing Layout engines lesson; link from layout syntax, diagram kinds, and layout tools.

Start with the structure you want a reader to see. A process usually needs a clear reading direction. An organization chart needs parents centered over their descendants. A protocol exchange needs participant columns and chronological messages. A grouped architecture needs both the order between groups and useful placement inside them. Draftably has recipes for these different tasks.

A layout recipe puts objects somewhere. The router then finds paths between their final shapes. If the boxes already tell the right story and one wire is awkward, start with routing. If the boxes themselves hide the story, start here.

### Pick a recipe or an engine

The built-in recipes describe a visible arrangement directly:

| Arrangement you want | Start with | What it preserves |
|---|---|---|
| Dependencies progressing across or down the page | `layout root flow` | Directed rank order, with feedback edges returning against the main flow |
| A horizontal strip or a vertical list | `row` or `column` | Authored sibling order |
| A process crossing named responsibility bands | `layout root lanes` | Lane membership and shared process ranks |
| A chronological conversation | `layout root sequence` | Participant columns and edge declaration order as time |
| Touching fields, records, or proportional bit/byte layouts | `layout fields cells` | Cell order and spans inside one group |

An engine uses an objective or structural heuristic to arrange a general graph. Use `engine=` when a simple recipe does not provide the relationship you need. The engine and the built-in recipe named `flow` are different choices: `layout root flow` is a compiler recipe; `layout root engine=flow` is the Directional flow engine.

```draft
diagram "A ranked process" version=1
node receive "Receive"
node validate "Validate"
node reject "Reject"
node store "Store"
edge request receive -> validate
edge valid validate -> store "valid"
edge invalid validate -> reject "invalid"
layout root flow direction=right gap=48
```

**Visual VL18:** switch this unchanged graph between flow, row, and column. Flow can place branches in the same rank; row and column preserve the chosen sibling order and ignore dependencies for placement. Keep the node sizes and labels fixed.

### Ten engines, ten distinct intentions

The table describes how each engine works and a reason to try it. It is not a quality ranking. A good result depends on the graph, constraints, direction, and the amount of space you can use.

| File value / editor name | What it tries to organize | Try it when | Watch for |
|---|---|---|---|
| `compound-flow` / Compound flow | Dependency ranks across nested groups, with attention to actual connection endpoints | The order between groups matters as much as their internal order | Packing and group boundaries can make the result resemble layered; a long dependency still needs space |
| `boundary-align` / Boundary alignment | Alignment of endpoints connected across group boundaries | The groups are useful but cross-boundary connections make awkward steps | A cold file rebuild may substantially move groups; fewer crossings can cost more area |
| `compound-spring` / Compound spring | Preferred connection lengths across group boundaries | Connections should pull related parts of a grouped system closer | A short wire objective does not guarantee compact bounds or low crossing count |
| `tidy` / Local tidy | Link lengths, nearby alignments, and collision separation | An editor drawing is already close and needs a local improvement | In a file it rebuilds from canonical geometry; it does not remember yesterday's hand placement |
| `stress` / Stress descent | Distances suggested by graph shortest paths | The overall relationship structure matters beyond immediate neighbors | Direction constraints and shapes can prevent the ideal distances; this is a descent heuristic |
| `force` / Spring network | Attraction along links and repulsion between objects | A network needs more separation or a less rigid structure | More repulsion often enlarges the drawing; directed file defaults still influence the result |
| `flow` / Directional flow | Springs plus directed separation | You want flow without committing every sibling to rigid layered targets | At a shared cold start it may look close to tidy |
| `layered` / Layered + fold | Cycle breaking, ranks, within-rank order, then coordinates | A dependency graph should read in clear stages | Crossings are heuristic; long ranks may fold; a cycle still has a feedback edge |
| `tree` / Subtree tree | A spanning forest with room allocated to each subtree | A rooted hierarchy is the main structure | Extra cross-links remain visible but do not all become tree relationships |
| `grid` / Soft grid | A grid target, with collision repair and soft attraction | A small collection benefits from regular placement | Regular cells can make connection paths longer; it does not optimize all cell assignments globally |

**Visual VL01:** show the real attached grouped-services comparison on one graph and one shared scale. Include the complete source, the single changed layout line, dimensions, crossing count, bends, and route length. Retain the identical compound-flow and layered cases. Then link to separate flat-DAG, tree, nested, and network examples that expose mechanisms this graph does not.

In the supplied grouped-services example, compound-flow and layered produce the same recorded result. Boundary alignment removes the one crossing, while increasing area by about82% and route length by about48%. Compound spring also removes the crossing, with about91% more area and about12% more route length. These are different tradeoffs on this fixture. Choose the drawing that supports the reader's task, then inspect labels and paths at a readable size.

### A file rebuild and an editor improvement answer different questions

A file recipe is a repeatable cold rebuild. It starts from source, applies the selected engine, then the compiler's packing and refinements, and finally routing. It does not use the last canvas position as the preferred answer. Two file engines may converge to the same positions because they share an initial arrangement and the same direction or collision constraints.

An editor improvement starts from current geometry. It can favor stability, limit movement, respect manual edits, and work inside a selected scope. That makes a small boundary-alignment pass or a tidy pass valuable even when its cold file example is unremarkable. Read the Layout tools page for the exact controls governing movement and persistence.

Use a cold comparison to choose a source recipe. Use a synchronized before/after comparison to choose a local repair. Changing one setting on separately rebuilt pictures does not demonstrate the stability of a warm pass.

### Use several measures together

Crossings help identify difficult wire relationships. Bend count indicates how much a route turns. Total route length describes travel, while width and height tell you where the drawing will fit. None measures label legibility, whether a critical relationship is easy to find, or whether the visual grouping matches your argument.

When comparing engines, keep the graph, labels, sizes, and pins unchanged. Begin with the engine defaults. Change one parameter only after you can name the problem it is meant to improve. If two outputs are the same, keep both and read the applicability note. Equality is useful information.

## Engine controls

**Destination:** expand the existing layout reference with a complete parameter section, linked from every engine row. Add visual panels beside the relevant subsection rather than a single gallery of tiny images.

An engine recipe uses named attributes:

```draft
diagram "Explicit engine controls" version=1
node ingest "Ingest"
node parse "Parse"
node validate "Validate"
node store "Store"
edge ip ingest -> parse
edge pv parse -> validate
edge vs validate -> store
layout root engine=layered direction=right rank-gap=64 node-gap=32 fold=never
```

Distances are in diagram coordinates, the same units used for node width and height. A value of100 for a strength is the upper end of a heuristic coefficient; it is not a100-pixel distance and does not promise100% of an effect. Bounds, pins, and other constraints can dominate a coefficient.

The defaults below are the raw engine defaults used when a file attribute is absent, except for folding's compiler behavior. An independently declared child scope should use these same defaults; the baseline has a sibling-scope settings leak described under Scope, so write important values explicitly while reproducing that case.

### Space between ranks, siblings, and groups

**`rank-gap=12..220`, default52.** This is desired separation along the reading direction. In a rightward layout it mainly changes horizontal distance between dependency ranks; downward it changes vertical distance. Layered and tree target construction use it, and the shared direction constraint can also make it relevant to other engines with connected nodes. Larger values create room for links and labels and make long processes wider or taller. It is not a direct guarantee about every routed segment: unequal node sizes, feedback edges, group bounds, and channel reservations also consume space.

**Visual VL02:** low/default/high rank gap on the same branching DAG. Mark rank boundaries and measure one representative empty gap. Hold node gap and direction fixed. Read this spacing sweep together with the long-label routing/channel example when label-required space is the dominant constraint.

**`node-gap=4..160`, default24.** This is sibling separation used by collision repair and structural seeds. It is especially visible between nodes within a rank or grid. Increasing it can make dense drawings readable; it also enlarges scopes and can move a connection endpoint enough to change the route. Decreasing it does not authorize overlapping shapes or labels. All engines can read it, but some fixtures will already be farther apart than the requested gap.

**Visual VL04:** three spacing settings on the branching tree with a light collision-clearance overlay. If low and default remain equal because another constraint is larger, say so and show the actual distance.

**`group-gap=12..180`, default48.** This is separation between grouped siblings in the compound algorithms and the compiler's compound/layered packing. It makes space between containers, not padding inside them. Packed scopes currently share one common group gap for the whole drawing, using the largest applicable request and the busiest rank gap; this setting is not fully independent per scope. Cross-boundary traffic may require additional room. **Baseline limitation:** the final common packed gap is capped at96 on one compiler path, so the advertised180 maximum is not honored there. Do not interpret a flat high-end sweep as a rendering error.

**Visual VL03:** nested-services low/default/high with measured frame-to-frame distances. Keep group padding, node sizes, and edge labels identical. Annotate the effective96 cap on the affected packed path until fixed.

### How connections pull

**`edge-length=20..260`, default88.** This is a preferred connection distance for spring/stress objectives, not a maximum route length. Shape extents contribute to separation, and the router may detour around obstacles. It matters for tidy, flow, force, stress, and compound objectives; it is not the tree or grid target's spacing control. Increase it when connected objects feel compressed. Decrease it when an organic layout is too loose, while checking that labels and route entrances still have room.

**Visual VL07:** the same small cyclic/disconnected network at low/default/high. Show connection centers or endpoints and route length separately; a bend around a box is not the spring's target distance.

**`repulsion=0..100`, default45.** This is the Spring network engine's pairwise repulsion coefficient. Higher values push objects apart, competing with link attraction and compactness. It has no corresponding force in the other engines, even though the file parser accepts the attribute there. Zero removes this particular repulsion term; collision separation still prevents overlap. A larger value can improve crowded regions while making a network too large to read at the intended scale.

**Visual VL08:** a small network with disconnected nodes using force. Include a deliberately irrelevant `engine=tree repulsion=100` comparison as a clearly labelled no-effect case, not as another successful repulsion demonstration.

**`flow-strength=0..100`, default65.** This weights directional separation. Directional flow has its own soft directed objective; several other engines also read this value in the shared direction objective when respect-direction is enabled. That is why a setting can have an effect even when the editor does not show it among an algorithm's primary controls. **Zero does not turn off direction.** The solver retains a base coefficient and a directional projection. To study undirected warm behavior, use the editor's documented direction-respect control.

**Visual VL09:** the cold Directional flow DAG has only a small coordinate response. Its Stress descent network supplement includes a cycle and makes the shared direction objective clearer. Hold topology fixed within each of those two subseries. Highlight the forward constraints and the cycle-breaking edge in the network. Show low/default/high, then a separate editor before/after for direction-respect. Do not combine both changes in one causal sweep.

### Hierarchy-aware controls

**`boundary-pull=0..100`, default65.** Compound flow, Boundary alignment, and Compound spring use the actual endpoints of links that cross group boundaries. This strength determines how much those cross-parent links pull the movable sibling owners. A high value can align entry and exit regions but enlarge or shift groups. At zero, this cross-parent pull vanishes; same-parent link forces still have their own fixed contribution. It is irrelevant to the noncompound engines.

**Visual VL05:** two nested groups whose internal endpoints are offset. Freeze membership and show the endpoint-to-owner relationship with a temporary overlay. A warm before/after is often more instructive than a cold result because the repair is visible from the same initial positions.

**`hierarchy-sweeps=1..4`, default2.** A sweep revisits hierarchy levels so movement inside a group can inform movement between groups and vice versa. It is not the general iteration count and does not apply to noncompound engines. More sweeps can propagate a cross-boundary improvement farther; they can also take more work without improving the visible result. Use integer values. The baseline accepts fractional values and rounds them internally, a validation inconsistency rather than a useful extra control.

**Visual VL06:** a three-level compound graph at1,2,4 sweeps. Mark the deep endpoint whose connection crosses two ancestor boundaries. Report both movement and final bounds; do not imply that more sweeps always means fewer crossings.

### Alignment, compactness, and grid attraction

**`alignment=0..100`, default55.** Tidy and Directional flow favor nearby horizontal or vertical alignments. Boundary alignment uses it in its transverse endpoint correction. This is an objective weight, not the exact `align x`/`align y` constraint. Raising it can straighten nearby relationships; it can also lengthen other links or make a drawing less balanced. Tidy's alignment term only acts when the misalignment is already sufficiently close; it is not a command to make every edge horizontal. Boundary alignment retains a small base transverse correction at zero.

**Visual VL10:** the supplied cold Boundary alignment sweep plus the actual native warm Local tidy supplement described in `layout-warm-recipes.md`, with small and large offsets in the same starting document. Show how the same control can correct one and leave the other largely unchanged. Link to exact alignment refinements for a requirement that must hold.

**`compactness=0..100`, default35.** This pulls a layout toward its target shape and center. It is used by tidy, stress, force, compound-spring, and grid. The current engine excludes this force from flow, tree, layered, compound-flow, and boundary-align. Higher compactness competes with preferred link distance, repulsion, and collisions; it does not reduce node dimensions. More compact can mean denser routes or a change in aspect rather than a simple uniform shrink.

**Visual VL11:** force or stress on the same disconnected network at0,35,100. Keep edge length, repulsion, and aspect fixed, and show width and height separately. Include one no-effect engine state in the applicability explanation.

**`grid-strength=0..100`, default45.** Soft grid attracts objects toward assigned cells. A cold rebuild seeds a regular grid; a warm pass greedily assigns objects to nearby available cells. The value controls the soft pull after those targets exist. Zero leaves a small base attraction, so it is not an off switch. On a cold graph already at its targets, every value may produce the same output.

**Visual VL12:** first show the honest cold no-effect sweep if it occurs. Then use the exact warm-grid native JSON and executed model results in `layout-warm-recipes.md`; start from the same perturbed node positions and change only grid attraction. Keep the viewport, scope, movement limit, and stability fixed.

### Ordering, folding, target shape, and root

**`ordering=stable|crossings`, raw default stable.** In a warm layered pass, stable starts from current within-rank order; crossings permits barycentric reordering. Reordering can reduce crossings while making an edited diagram less familiar. **Baseline limitation:** cold file rebuilds run the same ordering branch for both values. An `order` statement still contributes an authored preference, but switching these two attributes alone cannot demonstrate the warm distinction in a file.

**Visual VL13:** retain an equal cold pair with an explicit “same cold behavior” caption, then use the exact warm-ordering starting JSON and its two executed bounded passes from `layout-warm-recipes.md`. Report crossings and object movement together.

**`fold=auto|never`.** Automatic folding gives a long ranked layout more than one band. It can turn an unreadably wide chain into a usable page, at the cost of wrap routes and a change in reading direction at the band boundary. Never keeps continuous ranks. The built-in flow recipe defaults to auto. For layered and compound-flow files, omission also permits compiler folding, even though the raw engine setting defaults to never. Write `fold=never` explicitly when continuous ranks matter. **Baseline limitation:** the editor's recipe serializer can omit this explicit never because it compares against the wrong default.

**Visual VL15:** one long chain, identical nodes and labels, auto versus never on a shared scale. Label the wrap edge and the sequence of ranks across bands. A second tall nested-group example belongs with the separate group-level fold control.

**`aspect=0.75|1|1.333|1.6|2`, default1.6.** These are width-to-height targets for engines that use them.1 is square,2 is twice as wide as high, and0.75 is taller than wide. Aspect informs grid seeding, applicable compactness objectives, and some engine fold scoring; it is not a promise about final exported bounds. Node sizes, topology, constraints, and compiler packing can dominate it. Nested scopes may use the space available inside their container. The editor also offers canvas, which follows the viewport and is not stored in a file.

**Visual VL14:** all five file states on the same grid/network family. Show the target ratio beside the measured ratio. Do not scale each output to an identical square frame without a shared-scale option: that would hide the change being taught.

**`root=<node-id>`.** Subtree tree uses a chosen start node for its spanning forest. Without one it starts from deterministic source nodes, then visits unvisited nodes, so disconnected components are still placed. A tree root changes the hierarchy used for positioning; it does not reverse edge arrows or delete cross-links. Choose a node inside the layout's scope. The baseline parser accepts an existing node outside that scope and then cannot use it as a local root, a limitation scheduled for validation repair.

**Visual VL43:** the same tree-like graph with three possible roots. Keep edge directions unchanged and highlight which links were used to construct the spanning tree. Include a disconnected component to show the forest behavior.

## Scope, direction, fit, and order

**Destination:** expand Layout in the DSL reference and add a linked conceptual section in Layout engines.

### Every layout belongs to a scope

`layout root ...` arranges the diagram's top level. `layout services ...` belongs to the boxed group named services. Each scope has at most one layout statement. Row, column, and built-in flow arrange direct children; an engine can work through nested groups while preserving their membership.

```draft
diagram "Local layout choices" version=1
group clients "Clients"
node desktop "Desktop" in=clients
node mobile "Mobile" in=clients
group services "Services"
node api "API" in=services
node jobs "Jobs" in=services
node cache "Cache" in=services
edge call desktop -> api
edge notify mobile -> api
edge enqueue api -> jobs
edge read api -> cache
layout root row gap=72
layout clients column gap=24
layout services engine=tree root=api direction=down
```

Without a root statement, the compiler uses flow with gap48. Without a group statement, an ordinary group uses column with gap24. If you write an explicit built-in recipe and omit its gap, the default is28. These are different contexts, so adding an apparently redundant `layout root flow` can change spacing. Gap is a requested edge-to-edge separation. Ordinary collision repair keeps at least12 units of clearance, so the accepted `gap=8` row example is widened to12; use cells for touching fields.

An ancestor engine governs nested framed groups that do not have their own layout statement. An explicit child recipe creates a boundary, including a child row or column. An ordinary nonengine parent recipe does not inherit down the tree. Node and group `in=` membership defines the tree, with root as the default and a maximum nesting depth of12.

**Baseline limitation:** settings from one explicitly laid-out sibling can currently leak into the next sibling's engine solve. The atlas includes a paired reproduction where reversing the order of two layout lines changes an otherwise independent group. This is a behavior defect, not useful authoring semantics. Use explicit critical parameter values for reproducibility until the fix ships.

### A group frame changes whether it is a layout container

`frame=box` is the normal group: its members are laid out inside a bounded container with a title and padding. `frame=soft` provides a visual region without introducing an independent layout scope. `frame=none` retains logical grouping without drawing that frame. Soft and frameless groups dissolve into their nearest framed ancestor for placement, so members can participate in the ancestor's ranks. Position refinements and independent layouts require a framed scope.

**Visual VL32/VL34:** use the same membership tree for box, soft, and none. Overlay the effective layout boundaries in a second view. Then show inherited engine behavior versus one explicit child recipe. Do not change membership while demonstrating frame style.

### Direction is a reading-axis choice

`direction=right` advances ranks horizontally; `direction=down` advances them vertically. `auto` is the default and resolves to right in the file compiler's fixed landscape context. It does not respond to the width of the web page displaying the SVG.

Row and column already choose horizontal and vertical placement, so their direction attribute does not rotate them. Sequence keeps participants horizontal. Ordinary cells can use direction to choose a row or a column when columns is absent; explicit columns and proportional-unit layouts have their own rules. Explicit direction can also inform routing, so identical node coordinates do not guarantee identical routing metadata.

**Visual VL16:** auto, right, and down on one branching graph. Label auto/right equality as expected in a cold file. A separate routing example should expose any reading-direction metadata difference without changing node geometry.

### Fit chooses between candidate arrangements

`fit=wide|slide|square|page|tall` is a root-level request for a target shape. Targets are2,1.78,1,0.77, and0.6 respectively. The compiler tries the written arrangement and right/down variants with automatic or continuous ranks, then chooses a candidate by its bounding-box aspect. It does not freely resize nodes, and it does not solve for an exact canvas width. A layout with only a few possible arrangements may have the same best candidate for several fit values.

Use fit when you are flexible about orientation or folding and know the space where the picture will live. Use explicit direction/fold when that reading order is part of the message. Lanes and sequence have no alternative candidate orientations in this search, so fit does not meaningfully rearrange them in the baseline. Row and column keep their fixed axes across candidate directions as well; fit does not turn a row into a column.

**Visual VL17:** all five fit values on one graph with both a long branch and a wide fan-out. Show the chosen direction/fold, actual bounds, and target ratio. Keep duplicate winning arrangements.

`min-width` and `min-height` request a minimum group frame size, from0 to10000. They are lower bounds, so content can make the group larger. They do not fix the node size. **Baseline limitation:** the parser also accepts them on root, where there is no frame that consumes the setting. Use them on boxed groups; root support requires a product decision.

`diagram ... width=160..8000` requests a minimum output-frame width; existing content can make the drawing wider. It is not the width available to the layout solver. A change in framing can make a drawing appear smaller without moving any node. The width example should show unchanged canonical coordinates alongside the changed export frame.

### Order is contextual

Declaration order is a stable starting preference. Row and column use direct sibling order. Cells fill in that order. Flow and engines may adjust within-rank order to reduce crossings. Sequence uses node order for participant placement and **edge declaration order for time**.

`order <scope> <ids...>` puts the listed direct siblings first, in that order; unlisted siblings follow. Use it when source organization should differ from the visible order. It is not a coordinate constraint and does not overrule every engine objective. All listed IDs must be direct layout siblings of the scope. Use each ID once.

```draft
diagram "A declared sibling order" version=1
node draft "Draft"
node review "Review"
node publish "Publish"
layout root row gap=40
order root review draft publish
```

**Visual VL35:** show declaration order, an explicit order, and a crossing-sensitive engine on the same graph. Highlight only the changed order line. For sequence, demonstrate top-level participants and grouped participants separately: grouped nodes stay together, and per-group order is not currently applied by sequence compilation.

## Lanes, sequence, and cells

**Destination:** expand the existing diagram-kind lessons and link their specialized rules from the layout reference.

### Swimlanes share process ranks

Lanes are for a process that crosses responsibility boundaries. Each direct child of root must be a boxed group; nodes belong inside those groups. The compiler gives lane contents common dependency ranks, so a step in one lane can line up with the corresponding stage in another.

```draft
diagram "Who handles the request" version=1
group customer "Customer"
node submit "Submit" in=customer
node receive "Receive" in=customer
group team "Team"
node review "Review" in=team
node answer "Answer" in=team
edge sent submit -> review
edge approved review -> answer
edge returned answer -> receive
layout root lanes direction=right gap=72
```

Rightward flow stacks horizontal bands; downward flow uses vertical bands. Rank spacing has an effective lower bound of56 in this recipe, even when the explicit gap is smaller. Equalized lane frames and global ranks determine final positions, so ordinary local position refinements can be overwritten. Nested group content can still have its own local layout. Start by changing direction, lane order, or dependencies before reaching for manual coordinates.

**Visual VL39:** right/down on the same process, then a matched low/high gap example. Mark one rank spanning two lanes and show the lane boundary. Keep actors and message labels fixed.

### Sequence uses source order as time

A sequence diagram arranges participants across the top and messages down the page. Each node is a participant. Each edge is one message, and edge declaration order is the message order. A self-edge creates a self-call. An async edge changes the message presentation, not its position in time.

```draft
diagram "Read a record" version=1
node app "App"
node api "API"
node database "Database"
edge request app -> api "request"
edge query api -> database "read"
edge check database -> database "validate"
edge row database -> api "row" kind=async
edge reply api -> app "reply" kind=async
phase access "Read" request query check
phase response "Respond" row reply
layout root sequence
```

Top-level boxed groups can gather participant columns into bands. Their members stay contiguous. Nested groups are not supported. Keep every band nonempty in the baseline: an empty band currently produces invalid bounds and should be rejected by a forthcoming validation fix.

`phase id "label" message...` shades the region from the earliest to the latest listed message. Each message may belong to at most one phase. Choose a contiguous run so the label describes everything in its envelope; listing scattered messages still includes the rows between them visually.

Participant spacing and message rows currently use compiler constants. General direction, gap, and position refinements do not provide sequence spacing controls even where the parser accepts them. A pin will not hold a participant at an arbitrary canvas coordinate after sequence compilation. Use participant and message order as the supported structural controls. Use node endpoints for messages; the semantics of group endpoints need tightening.

**Visual VL38:** one unchanged message set with two edge orders, an added self-call, a grouped version, and a phase overlay. Keep the time axis visible. Include a no-effect accepted-gap example in the limitations note until the parser starts rejecting it.

### Ordinary cells form a touching grid

Cells are children of a boxed group. They touch rather than using ordinary node gaps. With no columns setting, rightward cells occupy one row; downward cells occupy one column. `columns=` chooses an explicit row capacity and takes precedence over that direction convention. Use integers from1 to512.

```draft
diagram "A record" version=1
group record "Record"
node key "Key" in=record
node value "Value" in=record span=2
node state "State" in=record
node owner "Owner" in=record
layout record cells columns=3
```

A numeric `span` occupies that many columns. In ordinary cells it is clamped to the available column count. Node size requests contribute to the shared row/column dimensions; all the cells in a row must still line up. Position refinements are ignored because the cells recipe owns their placement. Use order, columns, span, and size rather than pinning an individual cell.

**Visual VL28/VL37:** one, two, and four columns on identical fields; then span1,2,4 with columns fixed. Overlay the slot grid so a larger field is explained as a span, not mistaken for a longer label. Use only integer columns and spans: the baseline parser fails to reject fractions and can produce invalid geometry.

A `shape=marker` node draws a seam before the following cell in a simple one-row/one-column ordinary cells arrangement. It does not occupy a normal slot. Markers are not permitted in a multi-column grid or a proportional-unit layout. Demonstrate the marker with the seam itself highlighted and the adjacent source line visible.

### Bits and bytes are proportional fields

Add `unit=bit` or `unit=byte` to give each column a physical-unit meaning. A bit layout defaults to32 columns with unit width24; a byte layout defaults to16 columns with unit width48. `unit-width=8..200` changes the diagram distance for one unit. It does not change the number of bits or bytes in a field.

```draft
diagram "A byte record" version=1
group packet "Packet"
node tag "Tag" in=packet span=1
node length "Length" in=packet span=2
node data "Data" in=packet span=var
layout packet cells unit=byte columns=8 unit-width=40 ruler=on
```

Numeric spans can continue across rows in unit layouts. `span=var` fills the rest of the current row. The ruler is on by default; `ruler=off` removes its numbers without changing field meaning. Long labels and spans can require more rows or height, so a unit-width sweep should show labels as well as cell boundaries.

Unit-width and ruler only have meaning with unit set. **Baseline limitation:** without unit, these attributes are silently ignored and their values are not even validated. Avoid using them as ordinary-grid controls. Unit layouts also determine field width independently of normal node size requests.

**Visual VL29/VL30/VL31:** bit versus byte, low/default/high unit width with span counts fixed, and ruler on/off. Include one fixed field, one field crossing a row, and a variable remainder. Label the units explicitly; otherwise a reader may confuse a larger field drawing with a larger data field.

## Refining a layout without losing its structure

**Destination:** expand existing refinements/layout-tools reference. Cross-link from the symptom guide and every editor operation that writes one of these statements.

Automatic layout establishes a useful base. Refinements express the places where the story needs more guidance. Use a relative relation when the diagram will grow; use a coordinate when a particular position is itself important.

### Near: put one thing beside another

`near target reference` defaults to `side=right gap=28 offset=0 strength=prefer`. The reference can be a direct sibling, or a descendant inside a sibling group when the relation needs to follow a particular internal object. The target remains in its own group.

```draft
diagram "A side note" version=1
node api "API"
node store "Store"
node note "Read path"
edge read api -> store
layout root flow gap=48
near note store side=below gap=24 offset=12
```

Side is right, left, above, or below. Gap, from0 to2000, is the empty distance between the relevant shape edges. Offset, from−100000 to100000, shifts the target perpendicular to the chosen side after centering it on the reference. For right/left, a positive offset moves downward; for above/below, a positive offset moves rightward.

Prefer asks for that placement but permits collision repair to relax it. Required turns the selected side and minimum gap into a constraint when feasible; it does not promise an exact offset or exact distance. Pins have priority. Use required for a real reading-order requirement, not to make a soft suggestion slightly stronger.

**Visual VL20/VL21/VL22:** all four sides on one two-object example, then gap and signed offset separately, then prefer/required in a deliberately crowded three-object scene. Show the requested relation and final measured relation; otherwise the difference between a preference and a minimum constraint is hard to see.

### Align: line up centers

`align x a b` gives objects the same x center, producing a vertical alignment. `align y a b` gives them the same y center, producing a horizontal alignment. These are center coordinates, not left/top edges. Members must be direct siblings, and the statement needs at least two distinct IDs.

The default strength is prefer. Required alignment joins the center variables as a constraint. If pins demand incompatible centers, the pins remain and the compiler reports the conflict. Unequal node sizes make the center rule visible, so do not demonstrate alignment only with identical squares.

**Visual VL23:** x/y and prefer/required on the same unequal-size pair, with center guides. The separate `align-pin-conflict.draft` companion supplies an infeasible two-pin example with its actual diagnostic and SVG. Keep this separate from the engine's alignment strength; that slider is a heuristic objective, not this exact relation.

### Nudge: offset the automatic answer

`nudge id dx=... dy=...` adds an offset to the base automatic position. Both values default to0 and permit−100000 through100000. A nudge follows changes in the base layout: if the graph grows and the node's automatic position moves, the same offset is applied to the new position.

A nudge is a preference. Collision separation can relax it. It is useful for a small visual adjustment that should stay relative to the algorithm's answer. It is less useful for placing an object beside a changing reference; near expresses that intent more directly.

**Visual VL25:** show the unrefined position as a ghost, then the final node and offset vector. Keep shared coordinates across the pair. A separately autofitted image can hide a pure translation.

### Stay: prefer a remembered local coordinate

`stay id x=... y=... weight=8` requests a position in the parent's content coordinates. X and y permit negative values from−100000 to100000; both default to0. Weight is a relative preference weight from1 to100. It is not a duration or percentage. A high-weight object resists movement more during collision repair, usually causing lower-weight neighbors to move farther.

Stays can yield to pins, required constraints, collisions, and group boundaries. The compiler also detects certain conflicting stale stays after growth and discards them so an old remembered arrangement does not permanently damage the new graph. A stay is therefore intentionally less absolute than a pin.

**Visual VL24:** the same crowded pair at weight1,8,100, plus the signed coordinate examples. Show the preferred coordinates, unrefined coordinates, and final coordinates. The interesting question is which object yields, not whether every high weight produces a visually different image.

### Pin: require an ordinary object's coordinate

`pin id x=... y=...` fixes an ordinary node or framed group to a parent-local coordinate. Both coordinates default to0 and accept0 through100000; unlike stay, negative pin coordinates are not accepted. Pins take precedence over ordinary alignment or near requirements, so an impossible set of constraints produces a diagnostic rather than silently moving a pin.

In file compilation, pins are applied after the engine arrangement. They can keep the pinned final position exact without making the engine arrange all other nodes around that location during its initial solve. Expect to inspect routes and overlaps after adding one. Specialized recipes such as sequence own their coordinates and do not honor arbitrary participant pins in the same way.

**Visual VL26:** two coordinate choices on a shared origin, a pin inside a moved group, and one pin/alignment conflict. Mark the parent content origin so local coordinates are not mistaken for global canvas coordinates.

### Size: change the shape the layout must fit

`size id width=... height=...` applies to nodes. Width accepts40 through1200; height accepts24 through1200 or auto. On a size statement, omitted width defaults164 and omitted height defaults56. With no size statement, the compiler sizes the shape from its label and shape rules. `height=auto` preserves automatic text fitting while requesting a width.

Shape matters. Box and pill use rectangular bounds; circle and diamond need different visible outlines, and a diamond uses a square extent based on the larger requested dimension. Text nodes fit their own presentation. Ordinary cells use size as input to aligned row/column dimensions; proportional bit/byte fields use their unit geometry instead.

**Visual VL27/VL41:** width and height sweeps with one long label, then box/pill/circle/diamond/text using identical content. Show the collision rectangle only as an optional explanatory overlay. The shape demonstration belongs in layout because visible outlines, label fitting, and route attachment can change the space required.

### Repair by symptom

| What looks wrong | First useful question | Try | Check after the change |
|---|---|---|---|
| The process is too wide | Is continuous left-to-right reading essential? | Down direction, auto fold, or a root fit target | Wrap reading order, feedback detours, labels |
| Boxes crowd one rank | Is spacing or topology causing the crowding? | Node gap; explicit size only if the text needs it | Overall height, port density, shared channels |
| Groups are well formed but their wires zigzag | Can the connected endpoints align across boundaries? | A warm Boundary alignment pass or a nested scope recipe | Group movement, area, new detours elsewhere |
| An engine slider does nothing | Does this engine and context read it? | Check applicability; compare a warm pass when relevant | Whether constraints already dominate the result |
| A source edit rearranged too much | Are you rebuilding or improving existing geometry? | A scoped editor pass, declared order, or relative refinements | What persists when the source is reopened |
| One note needs to follow a node | Is the relationship relative? | Near with side/gap/offset | Growth and group-boundary behavior |
| Two objects must line up | Do you mean centers or edges? | Align x/y, required only when necessary | Unequal sizes and pin conflicts |
| A pin seems ignored | Is a special recipe replacing positions? | Use that recipe's order/span/participant controls | Actual diagnostics and final coordinates |
| Wires are bad but boxes are clear | Which routing tradeoff is causing the path? | Routing selection, ports, or channel reservation | Crossings versus length, clearances, title bands |

**Author integration note:** link each remedy to the exact atlas control IDs, and link the final row to the routing page rather than repeating its controls. Preserve clear baseline-limit callouts until behavior fixes land; remove them with the corresponding release, examples, and regression tests. Keep `docs/DSL.md` and `skills/draftably/SKILL.md` synchronized, and include a changeset for shipped reference/examples/source changes.

## Arrange before-and-after export panels

**Destination:** expand `docs/DSL.md` → Side by side; cross-link from the diagram-width/fit/aspect explanation and from the interactive Compare lesson. Controls L076–L078, visual VL46.

A `compare` statement composes two exported panels from one drawing with change marks. It does not run two layout engines. Draftably first lays out the merged source, then draws a before panel without added objects and an after panel without removed objects. A changed label can show its `was=` text in the before panel. Unchanged objects keep the same merged coordinates, making the panels easy to compare.

```draft
diagram "One layout, two versions" version=1
compare "Current" "Proposed" direction=auto aspect=1.6
node gateway "Gateway"
-node legacy "Legacy"
+node service "Service"
node storage "Storage"
-edge old_in gateway -> legacy
-edge old_out legacy -> storage
+edge new_in gateway -> service
+edge new_out service -> storage
layout root flow direction=down fold=never gap=40
```

Change marks touch the declaration name: `+node` and `-edge`, with no intervening space. The statement accepts zero, one, or two quoted panel labels. Bare `compare` uses Before and After. With no compare statement, a marked file shows one merged change drawing. The editor canvas and canonical JSON remain the merged drawing; SVG/PNG export draws the composed panels. Do not confuse this statement with the interactive Compare layouts experiment.

**`compare ... direction=auto|right|down`**, default auto, chooses panel orientation. Right puts the two panels next to each other and preserves row alignment; down stacks them and preserves column alignment. This direction is independent of `layout root ... direction=` inside the diagram. Each panel can trim unused space along the composition axis without moving its objects.

**`compare ... aspect=0.25..8`**, default1.6, is a numeric width-to-height target for the complete exported image. Unlike engine aspect's five allowed values, this accepts any finite number in range. With auto direction, the renderer compares stacked and side-by-side frame ratios and chooses the closer one in log space; a tie keeps the stacked candidate. It does not rescale shapes or guarantee the target ratio. With an explicit right/down direction there is only one candidate, so aspect does not change the orientation.

**Visual VL46:** first compare merged/no-panel with the default labelled panels; then hold labels and graph fixed for auto/right/down; then use0.25/1.6/8 with auto fixed. A separate pair holds right fixed while changing aspect, demonstrating the intentional no-effect case. Every source companion retains the same canonical node/route geometry. On the supplied graph the merged export is448×409, stacked panels448×785, and side-by-side panels692×433. Auto at1.6 chooses side-by-side;0.25 chooses stacked;8 still chooses side-by-side. Those are two finite layout candidates, not continuous stretching.

The statement is already documented in Side by side, but it belongs in the complete layout choice map because it controls a separate composition stage. Keep its labels, direction, and numeric aspect separate from engine settings and from the interactive Compare display controls.


---

# Proposed routing page drafts

Review status: prose describes the pinned baseline unless a **Proposed product change** note says otherwise. Visual references are exact companion filenames; the host lesson should embed those sources using existing `draft` fences. All supplied `.draft` companions were compiled and SVG-exported at the pinned baseline. A label saying “source variant” must remain when compilation is allowed to move geometry. Facts below are grounded in `coverage.csv` and `evidence/routing/results.json`; keep code citations in contributor/review notes rather than interrupting every reader paragraph.

## Destination: `/docs/routing` — replace `docs/DSL.md` → `## Routing`

### Route a line, then decide which cost matters

Layout places shapes. Routing connects those shapes with horizontal and vertical segments. Start by deciding what is wrong with the drawing:

| What looks wrong | First control to try | What to watch beside it |
| --- | --- | --- |
| Lines cross even though their endpoints are in a sensible order | `crossing-penalty` | Added length, bends and awkward entry sides. |
| A line zigzags unnecessarily | `bend-penalty` | Crossings or a longer detour may increase. |
| A line runs too close to an unrelated box | `clearance`, then `standoff` | A hard buffer can close a narrow corridor. |
| Parallel routes look like a single thick line | `edge-gap`, then `parallel-penalty` | Port capacity and the width of the available corridor. |
| Routes overlap for a long distance | `shared-penalty` | A common endpoint may still need a short shared stub. |
| Many lines bunch on one face of a small box | `port-gap`; enlarge the box if needed | Automatic fans compress when the requested spacing cannot fit. |
| A crowded fan needs another side | `fanout-penalty` or an explicit `from=` / `to=` | A line that hooks around a far side can be worse than crowding. |
| Rounded elbows look wrong for this diagram | `corner-radius=0` | This changes drawing style, not the route's bends or crossing count. |

A routing setting is a preference or constraint for the whole diagram. It is not a promise that every metric improves. Compare a small set of values and keep the result that reads clearly.

```draft
diagram "Routing: distance from an obstacle" version=1
# Smaller vertical padding keeps labels readable inside the intentionally short fixed boxes.
theme drafting padding-y=4
# Fixed rectangles: change only the routing line for a causal comparison.
node a "Start"
size a width=100 height=40
pin a x=40 y=160
node block "Obstacle"
size block width=100 height=120
pin block x=240 y=120
node b "End"
size b width=100 height=40
pin b x=440 y=160
edge e a -> b from=right to=left
routing clearance=10
# Row is intentional: suppress automatic flow skip/return lanes while pins freeze geometry.
layout root row
```

**Try it:** change `clearance` to4,10,then30. The three rectangles stay fixed. Look at the distance between the horizontal detour and the obstacle. Then change only `corner-radius` to0: the elbow changes appearance, but its route points stay the same.

The pins in this example are deliberate. In a diagram file, changing `edge-gap`, `port-gap` or `standoff` can also change the space the compiler reserves for connections inside groups. That source variant may move shapes. The router itself never moves them. The [Ports and lanes](/docs/ports-and-lanes) lesson shows both kinds of comparison.

### One routing line; defaults are optional

A file may have one `routing` statement:

```text
routing crossing-penalty=900 edge-gap=24 corner-radius=0
```

Omitted settings use the defaults below. Values outside the allowed range are errors with source line numbers. Distances are **world pixels**: zooming the view does not change them.

| File attribute / Editor label | Default and allowed values | Unit |
| --- | --- | --- |
| `clearance` / Shape clearance |10;4–30 | World-pixel obstacle buffer. |
| `standoff` / source only |20;0–40 | World-pixel preference band. |
| `port-gap` / Port spacing |16;6–28 | Preferred world-pixel distance between ports. |
| `edge-gap` / Parallel edge gap |16;4–48 | Preferred world-pixel lane pitch. |
| `bend-penalty` / Bend cost |32;0–100 | Length-equivalent cost per bend. |
| `crossing-penalty` / Crossing cost |360;0–1200 | Length-equivalent cost per crossing. |
| `shared-penalty` / Shared-path cost |8;0–20 | Cost per overlapping world pixel. |
| `parallel-penalty` / Lane separation cost |18;0–60 | Cost per weighted lane-spacing deficit. |
| `port-stability` / Keep previous sides |20;0–150 | Cost per changed endpoint side. |
| `fanout-penalty` / Spread fan-out |50;0–160 | Cost for additional edges on a crowded or unsuitable side. |
| `passes` / Routing passes |3;use integers1–5 | Initial construction plus a budget of additional reroute rounds. |
| `corner-radius` / Corner radius |6;0–16 | Requested world-pixel radius at a bend. |

`Shared-path cost` and `Routing passes` appear under **Advanced routing**. `standoff` currently has no menu slider or Compare axis; edit it in source or use `vary --try standoff=0,20,40`.

**Proposed product change:** add a `Standoff from boxes and borders` slider and Compare axis. This draft does not present that control as already available.

### Keep a line clear of shapes: `clearance`

`clearance` expands the obstacles used to find a route. A line passing a box or an unrelated group's frame must stay outside that expanded rectangle. The small terminal segment attached to its own source or destination is exempt so the line can reach the shape.

Increase clearance when a line is too close to an unrelated box. Do not raise it just to spread parallel lines; use `edge-gap` for those. A narrow gap can become impassable when the buffer grows. If fixed port sides leave no route within the search budget, the drawing reports a blocked route; check the diagnostic before treating a visible fallback as valid.

Visual `V-R01`: `clearance-4.draft`, `clearance-10.draft`, `clearance-30.draft`. The additional `narrow-corridor-clearance-4/10/30` set has a 28 px gap. At4 and10 the route is a 360 px straight line; at30 the gap closes and the route detours for648 px with4 bends. Draw a thin outline for the expanded obstacle only while explaining this control. Keep rectangle coordinates, dimensions, sides and every other setting unchanged.

### Prefer more breathing room: `standoff`

`standoff` penalizes a line that runs parallel and close to a box or group border. A line may run closer if the total route cost favors it. A value of0 removes this preference; `clearance` still applies.

The setting describes the width of a cost band, not a guaranteed separation. The router balances this against route length, bends, crossings and port choices. Increasing standoff can leave the drawing unchanged or choose a different compromise; it need not move every line farther away. Group borders carry a stronger cost because a line following a frame can look like part of the frame.

Visual `V-R02`: `standoff-0.draft`, `standoff-20.draft`, `standoff-40.draft`; annotate the *measured* nearest distance, including an unchanged or nonmonotonic result. The `no-effect-standoff-*.draft` files fix both endpoint sides and expose a no-effect case. Do not redraw that example to manufacture a visible difference.

### Make room at the endpoints: `port-gap`

A port is the point where a line touches a shape. `port-gap` asks the router to space multiple ports on the same side. Initial port pitch usually takes the larger of `port-gap` and `edge-gap`, so lowering `port-gap` below an unchanged larger `edge-gap` may do nothing.

A side has finite room. When the preferred pitch will not fit, an automatic fan can use a tighter pitch; a very small side can be more crowded still. Diamond ports use their vertices. If the drawing cannot give several arrowheads enough room, a taller or wider node can help more than a larger number.

Visual `V-R03`: `port-gap-6.draft`, `port-gap-16.draft`, `port-gap-28.draft`. The fixed `edge-gap=4` makes the port setting observable. Mark port positions and show the box face at a readable scale.

### Separate parallel lines: `edge-gap` and `parallel-penalty`

`edge-gap` is the preferred pitch between parallel runs. It also helps choose candidate lanes, space ports, plan fold turns and reserve room around groups. It is not a hard exclusion zone. Near a crowded fan, some lines can remain closer.

`parallel-penalty` says how much the router should pay to reduce a spacing deficit. A long close run costs more than a short one. For a pair of segments, the deficit grows with their overlapping length and with how far their separation falls below `edge-gap`. The router treats close sibling lines in a fan differently from independent routes because the former must meet the same shape.

Raise the distance first when the requested lanes are too close; raise the cost when the router can make room but still chooses a cramped route. If a corridor is physically too narrow, move a shape or increase layout spacing. A larger penalty cannot create free space.

Visuals `V-R04` and `V-R08`: use the separate `edge-gap-4/16/48` and `parallel-penalty-0/18/60` companions. Show both endpoint and corridor separation. The `equal-metrics-edge-gap-*` set keeps 1 crossing, 6 bends and 960 px of line at all three values, yet the middle run of edge`bc` changes position. Look at the path as well as the score.

### Trade detours against simpler routes: `bend-penalty`

The route score includes its length plus a cost for bends. With `bend-penalty=32`, saving one bend is worth32 units of route length in that part of the score. The complete choice also includes crossings, shared runs, spacing, side conventions and bounded search. It is not a guarantee that the globally shortest or lowest-bend drawing will be found.

A high bend cost can replace several short turns with a long detour or a crossing. A zero cost removes this particular penalty, but finishing passes can still simplify unnecessary steps. Always view the complete route before accepting a lower bend count.

Visual `V-R05`: `bend-penalty-0.draft`, `bend-penalty-32.draft`, `bend-penalty-100.draft`. Display crossings, bends and length together. The companion is designed to expose a real tradeoff instead of showing three already-straight lines.

### Spend length to avoid a crossing: `crossing-penalty`

A crossing is a geometric intersection of routes. A shared endpoint is connectivity, not itself a crossing. `crossing-penalty` adds cost when a candidate crosses another route. Raising it makes detours more attractive, but the router can retain crossings because of constraints, other costs or its bounded search.

First check whether swapping sibling order would remove the crossing without a detour. If it would, a layout change usually gives the clearer drawing. Then try a small sweep such as0,360,1200 on fixed geometry. A high-cost result with no crossings but long loops is not automatically the better explanation of the system.

Visual `V-R06`: the `crossing-penalty-*` companions. Keep their explicitly chosen sides so the topology of the comparison is clear. Display the unchanged low/default result honestly and show the longer high-cost route at the same scale.

### Distinguish overlap from proximity: `shared-penalty`

Two routes share a path when they lie on the same segment. This differs from being parallel but merely close. `shared-penalty` charges each world pixel of positive-length overlap. Common-end edges can therefore pay a shared-path cost even though their exact common terminal is not counted as a crossing.

The `shared-penalty-*` fixture deliberately uses a very small hub and disables the parallel penalty. Raising the shared-path cost shortens the common run. It cannot separate three routes at an identical fixed terminal until they have left the box, so a short common stub remains.

Visual `V-R07`: overlay the shared segment with one clear annotation. Show shared length alongside the ordinary metrics. Use the `no-effect-shared-penalty-*` set to explain that a graph without overlapping runs offers nothing for this setting to change.

### Keep automatic sides steadier: `port-stability`

`port-stability` is a cost for choosing a different side from the prior route. It never locks a side; use `from=` or `to=` when a side must stay fixed.

In a native editor document, the earlier drawing can supply those prior sides. A saved diagram file is rendered deterministically without routes from an earlier editing session. Its refinement rounds still compare against the initial routes created in that same computation, so the setting can affect a cold file result too.

During a drag, a quicker routing mode tries to preserve the earlier sides and does less refinement. Assess the settled drawing after the drag finishes. For a native Compare experiment, start every candidate from the same prior-route set, not from the route produced by the previous candidate.

Visual `V-R09`: use `port-stability-0/20/150` to show within-compute behavior. These supplied panels are cold file renders without prior-session history; they do not claim to demonstrate native history across edits.

### Spread a fan only when the side is crowded: `fanout-penalty`

An automatic fan normally leaves through a side facing its destinations. If that side has enough room, adding another line there need not incur a fan-out penalty. Endpoints aligned with an explicit reading direction also receive special treatment. This keeps ordinary trees from scattering branches onto far sides just because several children share a parent.

`fanout-penalty` matters most when a side is crowded or unsuitable. A large value may move an edge to another side, but an explicit `from=` or `to=` still wins. If the desired result is an exact side, author the side instead of searching for a penalty value that happens to select it.

Visual `V-R10`: use `fanout-penalty-0/50/160` with the small hub; show its port capacity. Pair it with the roomy `no-effect-fanout-penalty-*` set. A no-effect result is expected when the charged condition is absent.

### Allow more reroute attempts: `passes`

Use integer values1–5. The first construction pass creates the routes. Additional rounds revisit problematic edges and keep accepted improvements; the loop can stop early if there is nothing left to repair.

This setting does not turn off every finishing stage. Even at1, settled routing can attempt paired crossing repair, separate close internal segments and tidy ports or small steps. A higher number can leave the output exactly unchanged after the useful repairs are exhausted. The displayed pass count currently reflects the configured budget, not a count of completed work.

Visual `V-R11`: `passes-1.draft`, `passes-3.draft`, `passes-5.draft`. Keep the equal3/5 result. Explain that the setting is a bounded work budget, not a quality level.

### Change only the elbow style: `corner-radius`

`corner-radius=0` draws square bends. Larger values round the SVG path. A bend with short neighboring segments uses a smaller radius so the rounding fits; a straight line has no corner to round.

The underlying route points remain the same. Crossings, polyline bends and route length therefore do not improve when you round a corner. Sequence self-message loops can be rounded too, although ordinary sequence messages bypass obstacle routing.

Visual `V-R12`: `corner-radius-0/6/16`. Crop to one elbow, overlay its unchanged polyline only when useful, and retain a full-route view for context.

### Presets reset the entire routing configuration

**Balanced** restores all12 defaults. **Fewer crossings** also starts from all defaults, then sets:

```text
routing crossing-penalty=900 shared-penalty=9 port-stability=10
```

A preset replaces your custom routing values; it is not an incremental patch. For example, a custom `edge-gap=28` returns to16. Save or compare the current source if you want to keep those choices. **Fewer crossings** names a preference, not a guaranteed outcome.

**Reroute now** keeps the current settings and fixed sides. It clears route state and refreshes the drawing; a deterministic file can look identical afterward. **Use auto ports on selection** releases both fixed sides for selected edges, or for edges touching selected shapes when no edges are selected. These are different operations.

## Destination: `/docs/ports-and-lanes` — new `## Ports and lanes` in `docs/DSL.md`

### Choose where a line enters, then let it find a path

`from=` chooses the source side and `to=` the destination side. Each accepts `auto`, `left`, `right`, `top` or `bottom`. An explicit side is a routing constraint, not a gentle preference. It does not choose an exact position along that side.

```draft
diagram "Routing: explicit sides" version=1
# Fixed rectangles: change only the routing line for a causal comparison.
node a "Start"
size a width=140 height=80
pin a x=40 y=80
node b "End"
size b width=140 height=80
pin b x=420 y=240
edge e a -> b to=top
# Row is intentional: suppress automatic flow skip/return lanes while pins freeze geometry.
layout root row
```

**Try it:** cycle `to=` through all five values while keeping `from=auto` (omitted here). Then return `to=auto` and cycle `from=`. The source and target choices answer different questions. Avoid taking the full25-choice product: one side at a time reveals the mechanism.

In the Editor, select an edge and open **Ports → From / To**. The Inspector shows the resolved automatic sides beneath the selectors. **Use auto ports** clears both fixed choices. Alt-drawing from a visible port can choose a fixed side; ordinary connections remain automatic.

If an explicitly chosen side points into an obstacle, the router may report a blocked route. Try automatic sides or create room at that face. A large crossing penalty cannot make an impossible exit usable.

### A frame endpoint and a member endpoint mean different things

Connect to a boxed group's ID when the line should end at the group's frame. Connect to a member's ID when it should enter the group and reach that member. Soft and frameless groups have no boundary on which a connection can end, so their IDs cannot be edge endpoints. A group cannot connect to one of its own descendants as if it were a separate shape.

Cells have another special case. A cell with an exposed left, right or bottom outline side can be reached through that side. A top-only cell faces the title band, so it has no such free side. When a cell has no eligible free side—including a fully interior cell— the drawing uses an outside routing stub followed by a segment across the intervening cells. That crossing segment points at the interior field. The supplied interior-cell example still reports an `edge-through-node` warning for the intervening cell`h`; show that warning with the example. The outer-cell companion has no such warning. Its interior counterpart also illustrates a metric boundary: the CLI reports26 units for the routed portion, while the complete drawn polyline is78 after its cell-entry extension is appended. Do not compare that value as if it measured the entire visible wire.

Visual `V-R22`: `endpoint-frame`, `endpoint-member`, `endpoint-outer-cell`, and `endpoint-inner-cell`. Highlight only the changed endpoint ID and the point where the line terminates.

### Keep feedback from ranking the graph

A retry or feedback edge can affect the order of a flow. Use `constraint=false` when the edge should be drawn without ranking or pulling the nodes:

```text
edge retry result -> start "retry" constraint=false
```

This preserves the meaning and drawing of the feedback edge. It can still need space for a route or an automatic channel. Reversing the edge would change the meaning of the connection; it is not a substitute for this setting.

Visual `V-R15`: compare `feedback-grouped-ranking.draft` with `feedback-grouped-drawn-only.draft`. Turning off the feedback edge's ranking changes the drawing from413×967 to552×682. Its node rectangles then exactly match `feedback-grouped-no-edge.draft`. The simple pair `feedback-constrained.draft` / `return-lanes.draft` remains identical: a flag need not change every graph.

### Return lanes and fold lanes are automatic plans

A top-level flow can route a skip above the band and a return below it. For a downward flow, the corresponding lanes sit beside the column. The planner uses a free exterior side, then nests eligible lanes so shorter spans sit inside longer ones. It does not assign every long edge a lane: fixed sides, blocked exterior space, repeated endpoint use and group endpoints can prevent one.

When a long flow folds into bands, a wrap edge can get a lane in the gap between successive bands. A source blocked from that gap may leave beyond the end of its row; a target behind a group title may be entered before the next row starts. These plans aim to make the reading order visible.

You do not author these lanes with waypoint coordinates. They are derived from the layout. Setting `from=` or `to=` on an edge opts it out of automatic lane planning; dragging an endpoint across its lane can invalidate the plan. The ordinary router then handles the edge.

Visuals `V-R16–17`: show `return-lanes` beside `return-lanes-down`; compare its `fixed-side` variant; show `wrap-lanes` beside `wrap-lanes-never`. Annotate one lane and its relation to the band gap. Do not expose every internal lane constant as a user setting.

### A group's padding is not always enough for traffic

Some connections must travel inside a group beside a row of members or between nested tiers. The compiler can reserve an extra channel for that traffic. Channel width depends on `standoff` and the larger of `edge-gap` / `port-gap`. The compiler first places the graph, estimates traffic, and places it again with the chosen channels. It limits the added overall drawing area and may drop lightly used reservations.

This is why a routing source edit can change a grouped drawing's size or move siblings. Compare `channel-reservations.draft` with its `standoff-0` and `standoff-40` versions as **source variants**. Show group dimensions and node displacement along with route metrics. Use the flat pinned routing examples when the question is how the router changes a path at fixed geometry.

### A title band is a crossing with rules

The text of a group title is an obstacle. The rest of the title band is also treated specially: a route can pass straight into or out of a member's top, while ordinary horizontal travel along the band is discouraged or prevented. A very long detour can trigger an exception that crosses the band without crossing the title text.

In `title-band-top.draft`, the upper member has a direct top entry. In `title-band-lower.draft`, the target is lower in the group; the line generally travels around the band. `title-band-long-title.draft` shows why a longer title changes the usable entry space. A ruler-like overlay should distinguish the title text rectangle from the entire band.

### Native bends and label offsets

A native editor document can store explicit route waypoints and label offsets in JSON. A `.draft` file cannot store those two kinds of edits at this baseline. Select fixed port sides or change the layout when the result must round-trip through `.draft`.

For a native document:

1. Select edge `e` and give it the label `connect` in the Inspector.
2. Double-click its line at world coordinate (300, 120), then drag the waypoint to (300, 200). A waypoint must stay outside nodes; the editor allows up to 40 per edge.
3. Alt-drag the label upward from its automatically chosen position, then save this state as native JSON.
4. Reopen that saved JSON and verify the waypoint, label text and offset persist.
5. Double-click the waypoint to remove it. To test **Reset bends** independently, reload the saved state and use that command on the selected edge.

Reproducible start for `V-R21`: open `ports-base.draft`; choose **Save diagram** to export the JSON snapshot. Open a fresh `/app/` without a file/example/share-source URL, then **File → Open diagram** (`Ctrl/Cmd O`) and import that JSON. Perform the steps above on edge`e`. Starting a fresh native session matters: importing a JSON while still in the file session does not change what the `.draft` format can preserve.

**Proposed product change:** show this availability distinction in the Inspector before advertising the gestures. Adding waypoint syntax is a separate feature proposal.


---

# Proposed reader-facing editor and CLI pages

These drafts target the pinned baseline. The surrounding report contains code evidence and proposed product fixes; text in **Integration note** blocks is for Codex, not finished reader copy. Figure placeholders refer to exact examples and action recipes in `visual-atlas.md`. Ordinary code blocks below are supported current source/CLI syntax. New atlas viewer controls are not presented as shipped UI.

## Destination: `site/docs/pages/choose-a-layout.md` introductory sections

# Choose where the change belongs

A good first step is to name the defect. A tangled connection, a badly placed box, and a drawing that is too wide need different controls. Change the smallest part that explains the problem, then inspect the result at the same scale.

| What is wrong | Start here |
|---|---|
| One box is on the wrong side of its neighbor | Drag it or add a `near` refinement |
| Siblings are in an inconvenient order | Change the declaration order or a scope's `order` line |
| Boxes are well placed, but a line takes an awkward route | Compare router settings or explicit edge sides |
| Most positions are useful, but a small region is uneven | Tidy positions or the layout brush |
| A group accumulated too many manual placements | Reflow that group |
| The arrangement is too wide or too tall | Compare direction and an appropriate fit/aspect choice |
| The graph's structure is not clear | Compare engines on the same graph |

A layout operation moves boxes. Routing chooses paths between boxes. A file's compiler can also reserve room for those paths, so changing routing settings in a source-backed diagram can affect its layout. Use the frozen-geometry routing examples when you want to see the router by itself.

### A rule and a position answer different questions

An engine recipe tells Draftably how to arrange the scope every time the file compiles:

```draft
node source "Source"
node parse "Parse"
node validate "Validate"
node publish "Publish"
edge a source -> parse
edge b parse -> validate
edge c validate -> publish
layout root engine=layered direction=right fold=never
```

If another node is added, the recipe runs again. A `stay` or `near` is a preference layered over that arrangement. A `pin` holds an exact position and can prevent an otherwise useful move.

The Editor's **Preview automatic layout** writes a proposed recipe and compiles it before showing the preview. Keeping it replaces the scope's recipe and removes soft placement refinements inside that scope. Pins, sizes and nested groups' own layout lines stay. Read the proposed line in **Layout options → In the file** before keeping it.

**Tidy positions**, a kept timeline frame and a brush stroke start from the current coordinates. Their results depend on where the objects already were. In a `.draft` file these operations write `stay` positions for moved objects and anchors around them. They do not create a recipe that reruns the same gesture later.

> Figure V-E08: one graph, rebuild source diff versus pass source diff. Highlight the removed soft positions in the rebuild and the added stays in the pass.

### Keep the comparison fair

Compare engines on one unchanged graph, with the same labels, object dimensions, nested recipes, pins, routing settings and collapsed state. Use one world scale. A large drawing individually fitted into a small card can look as compact as the baseline even when its area is almost twice as large.

Then use a graph that reveals the mechanism: a branching tree for subtree spacing, a nested service graph for cross-container endpoints, a long chain for folding, or disconnected nodes for packing. One graph is a fair comparison; it is not a universal ranking.

Two choices may produce the same drawing. That is useful evidence. They may share the same cold starting arrangement; the requested condition may already be satisfied; a pin or frame may block movement; or the setting may not apply in that execution context. Inspect the actual source and effective settings before assuming an algorithm is broken.

## Destination: `docs/DSL.md` → `## Layout tools` replacement/expansion

# Improve the current drawing

Use a pass when the existing arrangement is valuable. Use a rebuild when a new arrangement is the goal. Both can be previewed and undone, but they save different information to a `.draft` file.

### Tidy positions and small passes

**Tidy positions** (**L**) runs the currently selected layout approach as a bounded pass. The command name does not force the `tidy` engine. Check **Layout options → Advanced layout settings → Approach** when comparing results.

The **Diagram type** shortcuts select engines: **Flow** selects Compound flow (`compound-flow`), **Nested architecture** selects Boundary alignment (`boundary-align`), and **Compact grid** selects Soft grid (`grid`). **Custom approach** indicates another engine selected in Advanced settings. Changing a shortcut prepares an operation; it does not itself rearrange the diagram. In particular, this Flow shortcut is neither the built-in `flow` recipe nor the Directional flow engine.

For overlaps, choose **Separate overlaps**. It moves colliding padded rectangles and leaves clean regions alone. A pin, frame or movement cap can leave an overlap unresolved; it does not promise a globally minimum movement. Separate can be used as a bounded repair in a source file, with the result saved as positions, but cannot be saved as an `engine=` recipe.

Scope comes from the current selection unless the Layout lab's Scope field overrides it:

- Nothing selected: the whole diagram.
- One group selected: inside that group.
- Selected nodes: those selected siblings.
- **Selection + one-hop neighbours**: selected objects and directly connected neighbors. They must still belong to one container for this local solve. A connection crossing into another group may make the selection invalid; select a container or use Whole diagram instead.

A scope is a set of objects the operation may solve, not the current visible viewport. Pins, frame limits and local holds still apply inside it.

| Pass setting | Meaning and useful starting sweep |
|---|---|
| Maximum move / action | World-pixel displacement cap for one operation. Default 48; UI 8–192. Try 8,48,192 from the same baseline. Parent and child moves share the total budget. |
| Stay near this arrangement | Soft resistance to leaving current coordinates. Default 65, range 0–100. Try 0,65,100. This is not a pin. |
| Solver effort | Internal steps for the bounded pass. Default 32; UI 8–96. Try 8,32,96 with the same movement cap. More steps do not authorize more total motion. |

The engine accepts a wider range than some sliders: maximum move 4–300 and pass iterations 4–160. These are editor/engine settings, not `.draft` engine-recipe attributes. They describe the operation that creates an arrangement. The file stores the resulting positions.

A pass can end with overlaps or a forward-order conflict if a pin, fixed frame or movement cap prevents a safe repair. More effort cannot make an impossible geometry feasible. Read the operation's warning before increasing another number.

> Figure V-E04: same rough arrangement, three displacement-cap values with displacement arrows and one pinned node. Keep the camera fixed.

### Protection and room to move

**Editor passes and native engine runs hold pins fixed.** In those operations a pinned descendant also anchors its containing group. A source file’s pin is a required coordinate relative to its parent’s content origin; moving that parent during a cold rebuild can change the child’s world position while preserving its local pin. Keep this distinction visible when comparing a file rebuild with a pass. A pin protects automatic placement; it does not prevent an intentional direct drag by the author.

**Treat Manual markers as fixed** defaults off. When on, manually positioned objects receive protection in editor engine operations. A manual marker is weaker than a permanent pin when this setting is off. In a file, soft refinements such as `stay` can give way when constraints require it; they are not interchangeable with a hard `pin`.

**Allow containers to grow right / down** defaults off for editor operations. A fixed frame can block a move that would fit if the frame grew. Turn growth on only when expanding the frame is acceptable; inspect sibling displacement and area afterward. Source compilation fits groups through its own rules, so this editor preference is not a portable file recipe field.

**Respect arrow direction** defaults on for editor engine operations. It encourages forward edges to follow the reading direction. Feedback edges from cycles remain visible. Turn it off to permit folded ranks when that is a better presentation; pins and frames still win. This preference is not a current `.draft` attribute.

**Target aspect → Match canvas** uses the editor viewport as an approximate shape target. Its ratio is clamped from 0.5 to 3. The `.draft` format uses fixed numeric aspect choices so files do not depend on a reader's browser window. For a portable result, choose a numeric aspect or a file fit rule.

> Integration note: until ED-01/ED-02 are fixed, do not claim these unsupported file-rebuild controls are honored. Reader examples should use supported source settings directly or a native/current-geometry operation and show the source diff.

### Ask for a preferred start and finish

In a native JSON document, select a shape and choose **Start here** or **End here**. Each role names one shape; assigning the same shape to the other role clears its earlier role. **Clear** removes a role without changing edges or pinning anything. A newly assigned Start begins at Top left and End at Bottom right. When reassigning a role through the Inspector, its existing preferred area is retained.

The **Preferred area** choices refer to regions of the drawing:

| Region | Start | End |
|---|---|---|
| Top left, Top center, Top right | Available | Available |
| Left center, Right center | Available | Available |
| Center · branch both ways | Available | Unavailable |
| Bottom left, Bottom center, Bottom right | Available | Available |

Use Center for a start whose branches should spread in both directions. These are soft placement preferences; pins, container boundaries and incompatible connections can prevent the requested region. Inspect the intent satisfaction report, then decide whether the preference is useful. Intent does not change which nodes an edge connects.

In Compare, click a shape and use **Use clicked shape as start/end**, then choose its area and Generate. That command resets the selected role to its corner default; existing candidate cards do not change until regeneration. Intent is copied from the current document when Compare opens and applied with the chosen native candidate.

Source-backed files do not have a persistent intent directive. Their direct Start/End commands are unavailable. The current file-rebuild Compare branch still exposes intent without using it; treat that as a baseline product limitation. A warm or bounded operation may use intent while computing, but the file retains resulting positions, not the preference itself.

> Figure V-E15: every allowed Start and End region on the same cycle-and-branches fixture, plus a pinned-start failure case. A region legend explains the request; a full-size result shows how closely it was satisfied.

### Set a container’s native layout preferences

For a selected native container, **Arrange contents** chooses **Follow diagram**, **Left to right**, or **Top to bottom** (`inherit`, `RIGHT`, `DOWN`). It is a direction preference used by a subsequent layout operation. **Inner padding** reserves space within the frame, from 12 to 80 world pixels, default 24. Increasing padding reduces usable space at a fixed frame size and can block a pass unless growth is allowed.

**Fit contents** shrinks or expands the frame around its current children; it does not rearrange them. For a clear comparison, enlarge a frame first, then fit it. A normal resize cannot shrink a container across its children. Compare the frame edge and child coordinates independently.

At this baseline, Arrange contents and Inner padding are visible in a source file’s Inspector but have no source translation: they reset after reprojection. Fit contents is unavailable there. Edit the group’s own `layout` direction to express a file rule, and use `min-width`/`min-height` when a portable minimum frame reservation is needed. There is no general per-container `padding=` directive to substitute.

> Figure V-E13: three native direction states, padding 12/24/80, and an enlarged frame fitted to unchanged children; pair them with the file source/reprojection no-effect proof.

### Preview, compare before, keep, discard

**Preview tidy** shows a bounded pass without immediately saving it. **Preview automatic layout** (**Shift L**) shows a cold rebuilt arrangement. During either preview:

- Hold **Hold before** to see the earlier arrangement at the same camera position. Release to return to the preview.
- Select **Keep layout** to commit.
- Select **Discard** or use Undo to abandon the preview.
- Beginning another ordinary edit currently accepts the preview first. Discard explicitly if the preview should not be kept.

For a file rebuild, only the whole diagram or one container can be saved as a layout recipe. A loose selection cannot become its own recipe. Use a pass to adjust selected siblings.

In a browser JSON document, **Capture checkpoint** records the current document for this session. **Restore checkpoint** gives each experiment the same starting point. These checkpoints are not saved views and are unavailable in file mode; file Undo already steps through source versions.

### Clear manual preferences with the right scope

**Clear manual markers** removes soft placement refinements for selected objects in a file. **Reflow group** removes soft refinements inside a whole group and lets its existing recipe arrange the contents again; objects around the change receive anchors. Neither should be used as a substitute for explicitly removing a hard pin.

For direct manual edits, **Align** changes the selected objects' positions to share left edges, top edges, horizontal centers or vertical centers. **Distribute** spaces a selection horizontally or vertically. These are edits to the arrangement, not automatic constraints that will reapply after every source change.

**Snap to nearby shapes** aligns centers while dragging within a 5-screen-pixel tolerance; Ctrl/Cmd temporarily suppresses it. It is separate from an engine's grid attraction. **Show manual position badges** changes the visual markers without moving objects.

Collapsing a group is also a view operation in a `.draft` file, not a layout fold rule. It changes visible endpoints and which descendants a current-geometry operation sees. Keep collapsed state fixed in a comparison.

## Destination: `site/docs/pages/compare-layouts.md`

# Compare layouts and routes

Compare creates alternatives from one captured starting document. The original stays in place until a candidate is applied. Open **Compare layouts** with **Alt E**, or use **Routing options → Compare ports & routes**.

### Pick a question before generating

Use **Different approaches** when the arrangement's structure is unclear. Use **Parameter grid** when one mechanism needs tuning. A one-parameter sweep is easier to interpret; add a second axis when it tests an actual interaction.

Compare opens with six approaches selected: Compound flow, Layered + fold, Directional flow, Subtree tree, Stress descent and Spring network. This is a starting sample, not the complete engine inventory. The ten file engines can be selected explicitly. Separate overlaps is an eleventh editor repair operation; it cannot be stored as a file recipe.

For a parameter grid, type one to six comma-separated values per axis. A second axis must use a different parameter. The product of the two axes must be at most 12. After changing settings, select **Generate** or **Regenerate**: already displayed cards remain the previous experiment until then. **Stop** leaves completed candidates available.

### Understand the starting point

| Starting point | What the experiment asks |
|---|---|
| Rebuild & settle | What arrangement does this approach choose from a cold start? In a file/example, this compiles the proposed source recipe. |
| Current positions → settle | How far can this approach improve the current arrangement when not limited to one small pass? |
| One bounded pass | What useful local repair fits inside the current movement cap? |

Warm and pass results depend on current coordinates. Applying them to a `.draft` writes an arrangement of soft stays. A file rebuild applies a source recipe and removes soft placement refinements inside its scope.

Compare's Scope defaults to **Whole diagram**, even when something was selected. Selected IDs and the selected container are captured when Compare opens. Close and reopen it to capture another selection. A file rebuild can target root or one container; a loose selection needs a warm or pass operation.

Native settled solves offer maximum effort 320,640 or 1200 steps per solve, default 640. This is an upper bound, not a promise to use that many steps or to find a global optimum. A run can stop because it settled, reached an objective plateau, or reached the limit. Pass mode instead uses the pass-iteration preference and movement cap.

> Integration note: source-backed rebuild ignores the present maximum-effort/intent controls; hide or label them until ED-02 is fixed. Do not publish the native effort selector as a file recipe guarantee.

### Compare routes without confusing two changes

**Ports & routes** normally holds the native document's rectangles fixed and changes routing settings. A source-backed file candidate recompiles the file, which can reserve room for connections and alter geometry. The atlas therefore uses frozen pinned flat examples to teach isolated route costs, followed by separate examples of layout–routing interaction.

**Release fixed port sides** is intended to change explicit sides back to automatic in native routing experiments. At this baseline it does not alter edge attributes in source-backed candidates. To make that change in a file, edit or remove the edge's `from=` and `to=` attributes before comparing.

Some sweep presets are representative values rather than low/default/high values. For example, Compare's starting routing grid uses edge gap 10,18,28 and bend cost 16,64; the router defaults are 16 and 32. Mark the actual default explicitly in a teaching comparison.

### Inspect at one scale

Use **Grid navigation → Synced** to compare the same world position and scale across cards. **Same clicked object** centers one identity in every panel; the drawings are translated for inspection but not reshaped. **Independent cameras** are useful to explore detail, but an independently fitted view can hide area differences.

Select **Overlay** for small positional or routing differences. Click a node or group to choose the visual anchor. Emphasize one layer to read its labels; other layers show their geometry. Layer visibility, opacity and **Show labels in every layer** only change the comparison display. Applying an emphasized layer keeps its original coordinates, not the overlay translation.

Use **Enlarge** for one readable candidate, especially on a narrow screen. Return to the grid to keep the others in view. A tiny contact sheet is an overview; it is not enough to judge port entry, label clearance or subtle bends.

> Figure V-E21: one compact and one larger result at common scale, then the misleading individually fitted view. Keep dimensions visible in both.

### Apply and retain the evidence

Select **Apply** only after checking the drawing, metrics, source changes and warnings. It is one undoable edit. If the editor changed after Compare captured its baseline, Apply refuses the stale candidate; reopen Compare from the new document.

**Save visible format as SVG** exports the current grid or overlay. **Save experiment JSON** includes the frozen baseline, configuration and completed candidate documents. Exporting does not apply a result and does not create a permanent named view in the application.

Identical-looking candidates can be valid. Before concluding that a setting has no effect, check whether the effective source actually changed, whether the parameter applies to that mode/algorithm, and whether geometry or rendering was compared. A corner-radius change can alter the visible path without changing route vertices or the bend count.

## Destination: `site/docs/pages/timeline-and-brush.md`

# Keep a useful step, then repair a local area

The layout timeline records actual intermediate arrangements. The brush changes a nearby region. Together they let a useful area survive while the rest of the drawing improves.

### Record and inspect a path

Open **Layout timeline** (**Alt T**). It starts from the current drawing, using the chosen approach and the scope implied by the selection. Recording does not edit the diagram. The first frame is the starting arrangement; the last is the computed finish.

Drag the **Recorded layout step** slider, use Previous/Next, or jump to either endpoint. Hovering over the track peeks at a different frame; leaving returns to the chosen frame. **Play** visits recorded checkpoints. These checkpoints are not equal percentages of progress and do not represent a percentage of optimality.

Choose a ghost:

- **Next meaningful change** shows a later recorded state with enough visible displacement to be informative.
- **Computed finish** shows the final arrangement behind the selected step.
- **Off** leaves only the selected frame.

Select **Fit path** once to fit all recorded arrangements with one steady camera. A changing camera can disguise motion, so use this view when judging how far objects move.

**Cancel** or Escape closes the unkept timeline. Undo first cancels an open timeline rather than applying any frame. To keep the selected frame, choose **Keep & edit**. In a file, this writes soft stays and anchors as one arrangement change.

### Bookmark a good region

If a middle frame has a useful local arrangement, select **Bookmark for restore**. This makes that frame the brush's reference without committing it. Use its saved bookmark button to jump back to that recorded frame. Move to a later frame and choose **Keep & brush**. The brush can restore selected areas toward the bookmarked coordinates while other areas retain their newer layout.

The reference is a set of positions. Restore does not resurrect deleted nodes, resize containers, or recreate graph relationships. Missing IDs have nothing to restore. Pins remain protected.

**Reopen last layout timeline** or the brush's **Last path** reopens a compatible archive. It must still match the document and graph, with compatible dimensions and pins. If those changed, record a new path. A bookmark may still restore matching nodes even when the complete timeline can no longer be reopened.

**Save layout timeline** downloads the baseline and actual frames as JSON. The browser keeps a small latest archive when storage is available; a large archive can remain session-only. Save the file when it needs to outlive the browser session.

### Choose a brush mechanism

Open the **Layout brush** with **W**. Hover to preview. Press **L** for one dab, or hold/drag to paint repeated dabs. A completed stroke is one Undo step. Escape cancels an in-progress stroke; it does not keep the preview.

| Brush | What it tries to change |
|---|---|
| Tidy nearby | Shorten stretched connections, align nearby neighbors and separate padded rectangles |
| Nudge into flow | Add pressure for forward edges to follow the current reading direction |
| Make space | Separate nearby shapes without using connections as the main objective |
| Restore from bookmark | Move eligible nodes toward the saved reference coordinates |
| Hold this area | Add session protection for later editor layout operations; geometry stays put |

The brush operates on visible leaf shapes. It does not directly resize or translate containers. It avoids adding or worsening rectangle overlaps and can attenuate or block a proposed move near obstacles. A pinned container protects its descendants. “Nothing moved” can mean there were no eligible shapes, the reference already matched, or the safe motion was blocked.

### Set radius, strength and soft edge

- **Radius:** 40–600 **screen pixels**, default 190. The same brush covers more world space when zoomed out. Use [ and ] to change its size. A shape can be affected when its rectangle touches the brush; its center need not be inside.
- **Strength:** 1–100%, default 35. It scales movement per dab. Repeated dabs accumulate, so compare strengths using one dab from the same baseline.
- **Soft edge:** 0–100%, default 75. It controls the transition from the full-strength center region to zero influence at the outer edge. More softness makes a smaller full-strength core and a broader falloff.

At default settings, the internal 18-world-pixel step and 35% strength give a maximum center dab budget of 6.3 world pixels before obstacle constraints. The internal step is not a current public slider. Radius and movement use different coordinate systems; keep zoom fixed in a numerical comparison.

> Figure V-E29: radius 40/190/600, then strength 1/35/100, then softness 0/75/100 as three independent sweeps. Highlight eligible rectangles and actual displacement, not just a brush disk.

### References and holds

**Use current** captures the current arrangement as the restore reference. It moves nothing. Capture it before the change you might want to restore.

**Hold restored nodes for the next layout** defaults on. Restored nodes become local holds so later editor engine operations keep them. These holds are undoable session constraints, not saved `.draft` pins. **Clear holds** removes them without changing explicit pins.

Hold Alt to temporarily restore while using a movement brush. In **Hold this area**, Alt removes holds. **Preview from here** leaves the brush and records a new warm timeline from the current arrangement.

For persistent protection after reopening a file, use a pin. A session hold cannot be encoded by a cold file recipe and should not be treated as one.

## Destination: `docs/DSL.md` → `### Layout variants` expansion and `site/docs/pages/cli.md` link

# Compare file variants from the command line

`vary` changes source settings, recompiles the diagram, measures it and saves the alternatives. It leaves the input untouched until `--apply` is used. Every candidate starts from the same original source, including its refinements.

The following run sheet uses a disposable copy for Apply. Run it from the pinned checkout, setting the artifact directory once:

```sh
atlas_dir=/absolute/path/to/unpacked-review
mkdir -p tmp/atlas

# Inspect the starting source and geometry.
pnpm draftably check "$atlas_dir/examples/editor/editor-compare-start.draft" --metrics
pnpm draftably inspect "$atlas_dir/examples/editor/editor-compare-start.draft" --json --metrics > tmp/atlas-base.json

# Compare all ten file engines. One axis keeps the sweep within the 12-cell limit.
pnpm draftably vary "$atlas_dir/examples/editor/editor-compare-start.draft" \
  --try engine=compound-flow,boundary-align,compound-spring,tidy,stress,force,flow,layered,tree,grid \
  --budget 60s --out tmp/atlas-engines

# A route-cost experiment on a separate frozen geometry fixture.
pnpm draftably vary "$atlas_dir/examples/routing/crossing-penalty-0.draft" \
  --try crossing-penalty=0,360,900 --out tmp/atlas-crossings

# A target shape changes suggestions and ranking, not the file by itself.
pnpm draftably vary "$atlas_dir/examples/editor/editor-compare-start.draft" \
  --fit slide --prefer compact --out tmp/atlas-fit

# Review variants.json and the images before choosing a saved variant.
# Applying best may keep v0 when no candidate meets the conservative improvement rule.
cp "$atlas_dir/examples/editor/editor-compare-start.draft" tmp/review-copy.draft
pnpm draftably vary tmp/review-copy.draft --out tmp/review-copy-variants
pnpm draftably vary tmp/review-copy.draft --apply best --out tmp/review-copy-variants
```

The sources in this run sheet are complete companions in the downloadable package. The `vary` command writes a PNG contact sheet, individual PNGs and `variants.json`; it needs an installed Chrome/Chromium for that export. SVG inspection and the bundled model-render scripts do not need Chrome.

### Suggestions, exact sweeps and a broader grid

Plain `vary` uses the graph's shape to choose suggestions. It may try engines and directions, rank ordering, more room for long labels, a stricter router, or source-specific changes such as softening eligible containers or dropping a refinement blamed for a conflict. Review the exact line edits; “vary” does not mean engine-only.

`--try key=a,b,c` asks for those values in that order. Add at most one second `--try` axis; the first varies fastest and the product must be at most 12. Explicit sweeps retain duplicate results so ineffective changes remain visible. `--grid` uses layered, compound-flow and flow in both directions, plus tree when the detected graph is a tree. It is not the complete ten-engine comparison.

The 28 accepted `--try` keys are:

| Family | Exact keys |
|---|---|
| Engine and reading direction | `engine`, `direction` |
| Engine parameters | `rank-gap`, `group-gap`, `node-gap`, `boundary-pull`, `hierarchy-sweeps`, `edge-length`, `repulsion`, `flow-strength`, `alignment`, `compactness`, `grid-strength`, `ordering`, `fold`, `aspect` |
| Routing parameters | `clearance`, `port-gap`, `edge-gap`, `bend-penalty`, `crossing-penalty`, `shared-penalty`, `parallel-penalty`, `port-stability`, `fanout-penalty`, `passes`, `corner-radius`, `standoff` |

Each parameter uses its file range or categorical states from the canonical parameter tables. A setting may still be irrelevant to the selected engine or fixture; acceptance is not a promise of a visible change. `--try root=...` is not supported; use explicit source fixtures for tree-root comparisons. A bare key uses known sweep steps; `standoff` needs an explicit list such as 0,20,40 because no default sweep steps are registered.

### Scope and fit

`--scope groupId` changes that framed group's layout line. Soft/frameless groups have no independent layout scope. A changed group size can move other objects when its parent is recompiled; scope does not freeze external coordinates. Routing settings are global: an explicit routing sweep still affects the whole file even when `--scope` was given.

`--fit wide|slide|square|page|tall` changes which candidates are suggested and how the finished image is ranked. Targets are 2,1.78,1,0.77 and 0.6 respectively. This is a goal for the variant search, not an engine `aspect` setting and not a persistent `layout fit=` statement. Inspect candidate edits to see what source was actually changed.

### Read the recommendation as a tradeoff rule

Warnings rank first. Without `--fit`, a recommendation must not add crossings or area while claiming an improvement (reducing warnings has its documented exception for area). With fit, the result may grow by at most half when it improves the target-shape tradeoff. `--prefer` chooses whether eligible alternatives emphasize fewer crossings, compactness or stability; it does not waive the recommendation guard.

A zero-crossing layout can therefore remain unrecommended because it is much larger. Compare the actual drawing before accepting the tradeoff. The contact sheet is a quick index; enlarge individual files for ports and clearances.

`moved` compares visible node/group rectangle centers after subtracting the minimum x/y of each drawing. A uniform translation of the whole image does not count as movement. `same as` uses a coarse geometry fingerprint; it does not prove that every SVG pixel is identical. Rounded corners are a simple case where route vertices can match while the rendered path differs.

### Continue and apply safely

`--from vN` searches near a variant from the previous run; `--from best` resolves the previous recommendation through the same saved-variant lookup. Use the same `--out` folder that contains that previous `variants.json`; the command reads it before replacing the output. Copy the folder aside first if it is part of a review record. The new output assigns new IDs, so “earlier v2” is not necessarily the new v2.

`--budget` stops starting candidates after the time allowance; it does not interrupt a candidate already computing. The manifest records how many were skipped. `--limit` controls how many differing suggestions are retained; it does not trim an explicit sweep. Use a generous measured budget for a published atlas and record any incomplete run.

**Output controls.** `--out` selects the output folder; by default it is `<input-name>.vary/` beside the file. `--json` changes stdout to the saved JSON manifest and still produces the PNGs. `--no-source` disables the source embedded in those PNGs; it does not alter the diagram. These are artifact choices rather than layout controls.

`--apply vN` or `--apply best` checks that the source still matches the measured run, changes the recorded lines, and checks the result. It preserves other comments, IDs and refinements. This differs from Editor source rebuild, which removes soft placements inside the rebuilt scope. CLI Apply has no Editor Undo; keep a copy or version-control diff.

For a stubborn refinement, `check --hints` compares raw and final positions, including objects pushed by another object's refinement. `format --drop-stale` prints a cleaned source first; add `--write` only when the listed removals are intended. A warning means inspect the drawing; ordinary `check` exits 1 for errors, not every warning.
