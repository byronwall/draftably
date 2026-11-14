# Sequence implementation plan

**Decision:** ship the existing sequence correctness repairs first, then a shared measured layout, then a small explicit sequence model and source-safe editing. Keep participant nodes and ordinary message edges. Add local actions, reviewed message meanings and reply relationships, authored scope, and event membership only where they improve the explanation. Keep formal branching, parallel regions, phase collapse, and mobile exploration as separately evaluated prototypes. This is a proposed implementation plan; no product code has been changed or approved to ship by this research mission.

**Fixed source baseline:** `2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4`. The attached source note was captured separately on 2026-10-30. `baseline.png` is the actual supplied render, never a redesign. Repository references below are to the supplied files and the small explicitly listed same-ref supplements.

## 1. Delivery boundaries and invariants

The implementation uses TypeScript, SolidJS/TSX, pnpm, and the existing pure model/DSL → reactive state → component boundary. CLI rendering consumes the same compiled measurements as the editor. `SourceDoc` remains authoritative in file mode. Every saved action must translate into a readable source change, recompile, and produce one undo entry. Geometry is a projection and never a replacement for semantic intent. These boundaries follow `docs/ARCHITECTURE.md`, `src/dsl/project.ts`, and `src/dsl/translate.ts`.

All milestones preserve:

- **Stable identities:** renaming a label does not change participant or event IDs. The sign-in keeps `user`, `app`, `auth`, `db` and `m1` through `m7`.
- **Explicit order:** source event order remains authored; lane order is declaration/order intent. No optimizer silently rearranges participants between companions.
- **Honest meaning:** spacing is ordinal, not elapsed time; a return is not a durability guarantee; async send is not completion; local work is not a network round trip.
- **Determinism:** source + resolved font metrics + layout settings produce identical geometry. No DOM font-load timing, viewport history, previous geometry, or randomized tie-break determines the picture.
- **Static comprehension:** title, scope, timing statement, notation key, and any hidden-event markers are visible in SVG/PNG. Hover can add detail but cannot carry the central explanation.
- **Source persistence:** new semantic fields survive parser → compiler → projection → normalization → targeted source edit → recompile → export-source extraction.
- **Parity:** interactive SolidJS, `StaticScene`, CLI SVG, and rasterized CLI PNG agree about content, text wrapping, arrows, bounds, and omissions.
- **Reviewable change:** source updates use existing transaction/revision semantics. External edits clear stale undo history rather than letting undo erase newer file work.

## 2. Milestones and dependencies

| Milestone | User-visible result | Dependency / principal risk |
| --- | --- | --- |
| M1 — repair current correctness (`SEQ-01`–`SEQ-06`) | Phases cannot overlap semantically; deleting a phased message works; explicit grouped lane order works; labels/self-loops stay in valid bounds; neutral headers remain visible; theme changes preserve meaning | Starts at baseline. Risk: stricter validation exposes sources whose current bands were misleading. |
| M2 — measure the whole explanation (`SEQ-07`, `SEQ-08`, `SEQ-15`, `SEQ-16`) | Compact, readable headers; bounded phase gutter; local label constraints; complete panel bounds; one shared display description | M1. Risk: changes to wrapping or padding alter existing screenshots and must be judged at actual export size. |
| M3 — explicit sequence meanings (`SEQ-10`–`SEQ-13`) | Reviewed reply/send/call/outcome semantics, local action, scope, stable ordered event model, lossless source edits | M2 geometry contract, M1 reference cleanup. Risk: new metadata can be lost at projection/normalization/translation unless landed together. |
| M4 — useful focus and complete exports (`SEQ-09`, `SEQ-14`) | Focus a message and its explicitly related events; named states save; exports show scope/key without hover | M3 semantics. Risk: generic node-focused states currently include all edges between focused endpoints and may over-highlight unrelated events. |
| M5 — evaluated exploration prototypes (`SEQ-17`–`SEQ-21`) | Honest phase collapse, retained mobile context, limited branch/parallel experiments, and reviewable reorder suggestions | Separate prototypes after M1–M4. Risk: hiding events or collapsing partial orders can create false conclusions. |

Each milestone can be merged independently once its own acceptance checks pass. M1 and M2 improve all existing sequence files without requiring new syntax. M3 is a complete vertical slice: do not ship parser support before saving and exporting can preserve the meaning. M5 is not a prerequisite for the useful engineering view.

## 3. M1 — make the existing contract correct

### 3.1 Why this is first

The supplied renderer already has wrapped above-line message labels, narrower participant widths, quiet header accents, four-point self-loops, participant column groups, and authored phase bands. Immediate work should repair concrete gaps in those capabilities, not reimplement them.

The decisive source evidence:

- Phase validation only checks known edge IDs and unique membership: `src/dsl/syntax.ts`, `validateReferences`, lines 1072–1089.
- Phase geometry spans minimum to maximum member event, allowing noncontiguous membership to visually include unrelated events: `src/dsl/compile.ts`, `sequenced`, lines 341–346.
- Deleting an edge only cleans focus states: `src/dsl/translate.ts`, lines 204–209. Same-ref `src/dsl/source-edits.ts`, `removeFromStates`, lines 103–109, confirms it does not clean phases.
- `sequenced` resolves root order against nodes only and does not use group order: `src/dsl/compile.ts`, lines 241–256. `validateReferences` requires order IDs to be direct children: `syntax.ts`, lines 1163–1169.
- Distant-message spacing divides required room by lane span but only updates the last gap: `compile.ts`, lines 268–277. This does not enforce the total interval constraint.
- Panel bounds derive from object bounds, while self-message route/label geometry is not included: `compile.ts`, lines 333–339; `src/model/routes.ts`, `messageRoute`.

### 3.2 Exact modules and changes

**`src/dsl/syntax.ts` — `validateReferences`:**

- Build `eventIndex` from current edge order for M1. Later M3 replaces the source with `sequence.eventOrder`.
- Require every phase's members to occupy a contiguous interval in that order. Existing duplicate membership and unknown-reference checks stay.
- Keep unphased messages legal. Sort phases by interval start for rendering; do not reorder events or rewrite phase membership without an explicit edit.
- In sequence mode, require every message endpoint to be a participant node. Generic graph edges to group frames remain supported.
- Reject empty participant bands with a line-specific diagnostic before nonfinite bounds can be computed. Do not invent a participant.
- Do not make nonempty participant count or diagram size an error. Those are authoring review prompts.

**`src/dsl/source-edits.ts` — targeted event-reference helper:**

- Add one narrow helper that removes event IDs from `phase` and `state` references and removes an empty phase declaration.
- Participant removal collects IDs of removed incident edges before deleting their statements, then cleans those event references.
- Keep comments and unrelated declarations untouched. An empty phase's inline comment may be retained as a standalone comment rather than discarded; choose one documented policy and test it. Recommended: preserve it as a standalone comment immediately where the phase was.
- Keep helper scope specific to existing event/phase/source needs. No generic schema migration framework.

**`src/cli/edit.ts` — `removeIds`:** use the same helper for `draftably rm`, including incident messages removed with a participant. The exact-ref implementation currently cleans only states (lines 69–90), so fixing the editor alone would leave a second path broken. Its `renameId` already updates unquoted phase arguments (lines 98–102); retain that behavior and add a focused fixture rather than building another rename engine.

**`src/dsl/translate.ts` — deletion and sequence edit intent:**

- Route message deletion and participant incident-edge deletion through the helper.
- Prevent participant movement from saving ineffective `near`, `stay`, `nudge`, or `pin` in sequence mode. M1 may disable free position dragging with a clear explanation; a lane reorder command should use explicit `order` source edits.
- Continue permitting ordinary label/style edits. Do not alter generic graph dragging.

**`src/dsl/compile.ts` — `sequenced`:**

- Resolve top-level slots consisting of ungrouped participants and participant groups. The default group slot occurs where its first member appears, preserving today's documented default.
- Apply `order root` to these slots. Expand each group using `order <group>` when present, otherwise member declaration order.
- Respect existing hierarchy validation; do not add new participant-order syntax in M1.
- Replace the distant-label calculation with the actual interval inequality: `center[b] - center[a] >= measuredLabelWidth + endpointClearance`.
- Add self-loop route and label extents to spacing and bounds. A self-loop near the rightmost lane can expand the panel without requiring a fake lane. An interior self-loop must not cover the next lane's lifeline/labels.
- Keep existing constants and style for this milestone where possible. M1's purpose is valid geometry, not compact redesign.

**`src/model/routes.ts`, `src/model/labels.ts`:** expose or reuse the same exact measured self-message extent needed by `sequenced`; do not independently recalculate it using a different font or constant. The measured bounds must agree with the path/label actually drawn. If a minimal helper extraction is needed, keep it pure and shared.

**Neutral participant contrast (`SEQ-05`):** repair the default neutral participant's outline in `NodeView.tsx` and `src/cli/svg.ts` through a shared appearance/notation value. A neutral Web app header must not receive a white outline against a near-white fill. Preserve intentionally authored accents; this is a default-contrast correction, not a theme redesign. Verify it in each supplied theme and in the static scene.

**`src/state/actions.ts` — `chooseTheme` (`SEQ-06`):** preserve existing appearance metadata while changing only the preset, preset overrides, and built-in color overrides. The current implementation replaces the entire object with `{theme, overrides, colors}` (lines 365–372), dropping heading, notes, legend, states, config and comparison metadata from the intermediate document. Use a direct narrow update/spread that retains those fields. Test both JSON/browser persistence and file-mode source translation; no theme action should erase the authored scope/title/subtitle or saved focus states. One Undo restores the old theme while all metadata stays intact.

### 3.3 Worker starting procedure

1. Reproduce the six semantic/ordering cases below against the exact checkout before editing.
2. Add tests for the failures and implement phase/reference/order fixes in their existing modules.
3. Add the supplied interval and self-loop geometry cases; implement actual interval constraints and complete bounds.
4. Re-run only the targeted suites while iterating. Examine the actual sign-in render at 900, 1, 000, and 1, 100 px; do not infer readability solely from a large screenshot.
5. Update the DSL guide and agent skill to describe actual grouped order, phases as consecutive narrative events, ordinary notes, and the distinction between order and time. Do not introduce future syntax in current-language examples.
6. Add a changeset and run required gates when the change is ready. No additional design session is necessary to start this work.

### 3.4 Exact semantic acceptance fixtures

**M1-A — grouped order respects both scopes**

```draft
group g "Group"
node a "A" in=g
node z "Z"
node b "B" in=g
order root z g
order g b a
layout root sequence
```

- With both order statements: participant order exactly `['z', 'b', 'a']`.
- Reverse the root order to `order root g z` while keeping group order: exactly `['b', 'a', 'z']`. This case catches the existing bug that ignores the group ID and incorrectly promotes the named root node.
- With only root order: exactly `['z', 'a', 'b']`.
- With only group order: exactly `['b', 'a', 'z']`.
- With no explicit order: exactly `['a', 'b', 'z']`, preserving current group-at-first-member behavior.
- The group band contains only `a,b`; no lane or event ID changes.

**M1-B — reject interleaved phase membership**

```draft
node a "A"
node b "B"
edge m1 a -> b "First"
edge m2 b -> a "Middle"
edge m3 a -> b "Last"
phase outer "Outer" m1 m3
phase inner "Inner" m2
layout root sequence
```

Expected: error on the `phase outer` line naming skipped `m2`. The error explains “Include it or split the phase.” No overlapping phase rectangles are emitted. Accept a phase member list as a membership set; its drawn interval and event order use source-event order. Preserve the written member-list order for unrelated edits. A deliberate membership edit writes surviving/new members in source-event order.

**M1-C — deleting a phase member preserves valid source**

Initial events `m1,m2,m3`, phase `phase p "P" m1 m2 m3`. Deleting `m2` through the editor/source translator yields surviving event order `[m1,m3]` and `phase p "P" m1 m3`; compile succeeds. Deleting the final remaining member removes the phase declaration. Deleting a participant cleans every removed incident message from phases. Unrelated comments and IDs remain unchanged.

**M1-D — sequence group endpoints are invalid**

```draft
group g "G"
node a "A" in=g
node b "B"
edge m1 g -> b "Wrong endpoint"
layout root sequence
```

Expected: error at `m1`, naming group `g` and asking for a participant. The same source using an ordinary graph layout remains legal.

**M1-E — empty participant band has finite behavior**

```draft
group empty "Empty"
node a "A"
layout root sequence
```

Expected: actionable validation error on `empty`; no `NaN`, `Infinity`, negative panel width, or invalid SVG. For a sequence with no participants and no bands, retain the authored layout intent but return before computing sequence geometry; leave layout.sequence absent until a participant exists. The existing src/model/geometry.ts:rectUnion empty fallback is finite: {x:70,y:160,w:240,h:160}. Reuse that empty-document behavior so deleting the last participant remains possible. An empty declared band still receives the actionable error above.

**M1-F — source says what a drag does**

A free sequence participant move cannot leave an apparently saved `near`, `nudge`, `stay`, or `pin` that disappears on recompile. If M1 disables it, it produces no source edit and no undo entry. If explicit lane reordering is included, the resulting `order` statement is visible and one Undo restores it.

### 3.5 Geometry acceptance

The baseline research executed a valid distant-label counterexample, not merely a hypothetical formula. Its source uses three explicit `40×32` participant headers, `theme drafting padding-y=4`, and a label of nineteen `M` characters from A to C. The actual measured label is `176×40`, split into fourteen and five `M` characters. Baseline centers are `[36,116,212]`: A→C spans 176 while the compiler's own requirement is `176+16=192`. The minimum M1 correction keeps the first two centers and sets C to 228, yielding `[36,116,228]` and an exact 192-unit endpoint interval. This is the fixed expected-value test for the interval bug; do not use an invalid width 20 fixture because the parser's minimum explicit width is 40.

A separate source-derived long-self-label case has label height 57 and loop drop 22. The self-label bottom is `row+39.5`; the following normal row currently occurs at `row+58`, whose 23-high label begins at `row+34`. The overlap is exactly 5.5 units. Reserve complete vertical envelopes, including the side label, instead of only the loop drop. M1 can retain the baseline one-unit label/shaft gap and use eight units of ink clearance: the next upper extent is 24, so ceil(139.5+8+24)=172. M2 changes those spacing defaults to four and five respectively, retaining the same exact next-row result for this fixture. Under the chosen target contract—four units from message label to shaft and five units between event ink—the exact self row 100 requires the next ordinary row at 172. Section 4.2 supplies the arithmetic. This is an analytical acceptance fixture; unlike the distant-label counterexample, it was not claimed as an executed browser reproduction.

The following fixed-metric fields make the acceptance cases reproducible without depending on arbitrary text substitutions. They are inputs/expectations for the proposed pure layout tests, not already passing tests:

| Fixture | Exact input fields | Required result |
| --- | --- | --- |
| Distant span, M1 | `widths=[40,40,40]`, `firstCenter=36`, `baseGap=40`, message `from=0,to=2,labelWidth=176,endpointClearance=16` | Centers `[36,116,228]`; last gap 112; message span 192; centered label box `x=44..220`, eight units from each endpoint. |
| Same label, M2 slot policy | Same headers and metrics; base centers `[36,116,196]`; choose slot once before solving; midpoint tie goes left | Slot index 0; centers `[36,228,308]`; gaps `[192,80]`; label `x=44..220`; full arrow still spans lane 0 to lane 2. |
| Interior self-message | Owner center 200; loop excursion 36; side-label offset 4; label width 147; next-lane clearance 8 | Loop turn x236; label `x=240..387`; next lane center at least 395. A weaker header gap cannot override this. |
| Last-lane self-message | Same self-message, no later lane; full ink union's rightmost x387; panel padding 20 | Inner panel's right boundary at least 407. If other ink extends farther, use that farther bound plus 20. |
| Large centered local action | Three 40-wide headers; first center 36; baseline gap 40; action width 240 on middle lane; clearance 8 on both sides | Centers `[36,164,292]`; action spans `x=44..284`; eight units from both neighboring lifelines. |
| Three-line self-label followed by ordinary label | Self row 100, self label height 57, loop drop 22; next label height 23; shaft gap 4; event ink gap 5; minimum row increment 28 | Previous ink bottom 139.5; next upper extent 27; next row `ceil(max(128,139.5+5+27))=172`; next label top 145; clearance 5.5. |
| Multiline participant header | Header heights `[32,64]`; common bottom 64 | Header y positions `[32,0]`; both lifelines start at 64. |
| Long phase title | Gutter text width 96, side padding 12; title three lines at 17 each; event ink height 20; phase vertical padding 8 per side | Total gutter width 120; title height 51; phase height `max(20+16,51+16)=67`; next phase begins 83 units after this phase's top with a 16-unit inter-phase gap. |

The self/phase fixtures deliberately supply measured dimensions. Separate font tests verify that real strings produce the expected dimensions under the bundled fonts. Keeping these layers separate makes a font update distinguishable from a broken constraint solver.

The contract to test is precise even before choosing the M2 defaults:

- Every adjacent header pair clears by its required gap.
- Every inter-participant label's endpoint interval satisfies its measured width plus reserved endpoint clearance, regardless of how many lanes it spans.
- Self-message route/label bounds fit inside the panel and do not collide with an unrelated lifeline.
- Empty or invalid structures never produce nonfinite coordinates.
- The current sign-in's participant and event orders remain exact.
- Phase membership is a contiguous event interval and its geometry encloses exactly those rows plus its own padding.

### 3.6 Tests, docs, acceptance, risk

Extend `tests/sequence.test.ts` and `tests/translate.test.ts`; reuse `tests/edge-labels.test.ts` for measured label/path consistency. Add normalization assertions to `tests/dsl.test.ts` only where changed fields need them. Keep these tests about user-visible invariants, not mirrors of the implementation loop.

Update `docs/DSL.md` and `skills/draftably/SKILL.md` in the same change. Remove the stale blanket claim that sequence notes are unsupported; distinguish ordinary scope notes from missing interaction-fragment notes. Product code/example edits need a changeset under `AGENTS.md`. Main risk: existing interleaved phases become invalid; preserve the source and report precise fixes, never silently infer new phase boundaries.

## 4. M2 — one measured layout for an edited explanation

### 4.1 Scope and module boundary

Extract the sequence-specific measuring/placing code into proposed `src/dsl/sequence-layout.ts`, called once by `compile.ts`. The module is pure TypeScript. It takes the parsed participants/events/phases, resolved appearance, and explicit layout options; returns a small compiled sequence display description. Do not introduce a generic rendering framework or a new layout engine dependency.

Extend existing `SequenceLayout` in `src/model/types.ts` or a narrow referenced type to contain the measurements both renderers need:

```ts
interface SequenceLayout {
  panel: Rect;
  participantIds: string[]; // Derived effective order; source declarations/order remain authoritative.
  headers: Record<string, {
    rect: Rect;
    textLines: string[];
    lifelineX: number;
    lifelineTop: number;
    lifelineBottom: number;
  }>;
  events: Record<string, {
    row: number;
    bounds: Rect;
    label: { lines: string[]; rect: Rect } | undefined;
    points: Point[];
    // M3 may add an action rectangle and notation descriptor here.
  }>;
  phases: Array<{
    id: string;
    label: string;
    labelLines: string[];
    gutter: Rect;
    band: Rect;
  }>;
}
```

This is proposed data shape, not current code. The semantic event membership stays outside these rectangles. Avoid storing redundant geometry when an existing route/label structure can be referenced directly; the decisive contract is a single shared result, not the exact spelling of every field.

### 4.2 Layout behavior

- **Headers:** use compact sequence-specific padding/height, measured multiline text, common bottom alignment, and subdued neutral outlines. Preserve explicit authored shape/style when meaningful. Give a default neutral participant a visible outline; a neutral white-on-white stroke must not make one participant appear absent or special.
- **Lane order:** use M1's explicit hierarchy. Do not optimize message length automatically. Any suggested alternate order is previewed and saved only by an explicit source action.
- **Label widths:** measure from bundled font metrics; wrap at the selected sequence text width; never silently elide text. A long label expands only the interval or row it constrains. Long unbreakable identifiers need a deterministic fallback and an overflow diagnostic if readability cannot be maintained.
- **Distant-lane constraints:** use actual endpoint distance, not equal distribution over all gaps. Keep unconnected lane gaps at their minimum unless another constraint requires them.
- **Self-message:** reserve both the route's excursion and its side label. For the final lane, expand the panel bounds. For an interior lane, require clearance from the next lane; no line may run under the label.
- **Phase gutter:** use a bounded measured width and wrapped phase labels. A long phase name must not push every lane arbitrarily right. Phase names are narrative headings, not UML operator tabs.
- **Rows:** reserve the full measured label and action extent plus consistent breathing room. Add extra spacing only at authored phase boundaries. Do not recover phases from gaps and do not imply duration with proportional spacing.
- **Panel bounds:** union participant/group bounds, lifelines, all message/self-loop paths, all labels/actions, phase gutter, and panel padding. Export frame bounds also include title, scope, and legend.
- **Reading size:** treat approximately 900–1, 100 px as a review target, not a universal minimum or standard. If a difficult diagram does not fit legibly, expose that fact and offer a companion view/scrolling exploration instead of shrinking every label below the chosen reading threshold.

#### Selected constants and deterministic solver

| Parameter | Chosen value | Scope |
| --- | --- | --- |
| Minimum gap between adjacent header edges | 40 logical units | Retains the baseline spacing floor; explicit group-boundary padding adds to it. |
| Message-label endpoint clearance | 8 per side, 16 total | Added to the already padded label-box width. |
| Self-loop excursion / drop | 36 / 22 | Preserve current loop dimensions; measure its full side label too. |
| Self-loop label offset / next-lane clearance | 4 / 8 | Label starts four units after the loop's outer vertical segment. |
| Local-action neighbor clearance | 8 per side | Applied to half the full measured action-box width on each side. |
| Ordinary label-to-shaft gap | 4 | Shared by all renderers. |
| Minimum inter-event ink clearance / minimum row increment | 5 / 28 | Content envelopes can require more. |
| Phase text gutter / inset on each side | 96 / 12 | Total gutter 120; text wraps within 96. |
| Phase content padding / gap between phases | 8 top and bottom / 16 | A title may expand its own phase. |
| Inner panel padding | 20 | Around the complete sequence ink union. |
| Compact one-line participant height | 32 | Sequence-specific default; measured multiline headers grow and bottom-align. |

Keep explicit authored sizes and surface genuine overflow. The 32-unit header is a chosen native default; the manual engineering mockup uses 40-pixel headers at its own presentation scale and is not a production golden.

The manual visual study also uses a 14-pixel top inset in its own artwork. The proposed native layout contract uses 20 units of inner-panel padding. Those are intentionally separate artifacts: the hand-authored mockup settles the explanatory design; the fixed-metric fixtures settle the implementation's geometry.

Index each horizontal lower-bound constraint by its ending lane. M1 adds full-span label constraints; M2 replaces each distant label's full-span constraint with its chosen clear-slot constraint. This is a staged change, not a pair of product modes or parallel schema versions.

```ts
// Proposed algorithm only. Distances already include required clearance.
const centers = Array<number>(participantIds.length);
centers[0] = leftInset + headerWidths[0] / 2;

for (let to = 1; to < centers.length; to++) {
  let x = centers[to - 1] + adjacentMinimum[to - 1];

  for (const constraint of endingAt[to]) {
    x = Math.max(x, centers[constraint.from] + constraint.distance);
  }

  centers[to] = Math.ceil(x); // Outward rounding preserves lower bounds.
}

// Proposed acceptance check: validate actual distances after rounding.
assertAllRequiredDistances(centers, constraints);
```

Header widths and font measurements can retain their native fractional precision; outward rounding applies when placing the constrained boundary. Recheck constraints after any final coordinate quantization. The plan does not require the renderer to change every existing value to integer units.

The chosen horizontal algorithm is deliberately small:

1. Measure participant headers and establish their base adjacent gaps without message labels.
2. For an adjacent-lane label, constrain that gap directly.
3. For a distant-lane label, inspect the intervening slots between neighboring lifelines. Prefer a slot already wide enough at the base header arrangement; among adequate slots choose the midpoint nearest the message span midpoint, breaking ties to the left. If none fits, choose the nearest-midpoint slot with the same tie-break and expand only that slot. Do not reselect after expansion.
4. The chosen slot's required width is label width plus both label-side clearances. This **replaces**, rather than supplements, that label's whole-span constraint. The arrow still connects its original endpoints; the label is placed in a clear slot so it cannot mask an intervening lifeline.
5. A centered local action constrains both adjacent intervals by its half-width plus 8 units. A local action at the outermost lane contributes its exposed half-width to panel bounds.
6. Merge all requirements on each interval by maximum, then place centers with one prefix-sum pass. Groups add their declared band-boundary padding. No global lane permutation is attempted.

Naive slot planning costs `O(sum of message lane spans)` and the final interval solve costs `O(n+m)` after constraints are collected; text measurement adds linear work in the supplied text. With the existing 500-object/1, 200-edge limits, this is preferable to a solver dependency or iterative optimization. Tie-breaking is source/order-based, not ID spelling.

The phase gutter has **96 logical units for text plus 12 units on each side: 120 total**. Wrap the title within the text width; ensure phase height is the maximum of event ink height plus 16 and title height plus 16. Put 16 units between authored phase bands. A long title enlarges only its own phase. These are chosen defaults for the prototype/corpus, not claims about universal readability.

For vertical placement, every event supplies upper/lower ink extents relative to its route row. Under the chosen marker envelope, an ordinary label of height H has upper extent `H+4` and lower extent 4. A self-loop's upper extent is `max(4,H/2-11)` and lower extent `max(26,11+H/2)`. The constants include the four-unit path/arrowhead envelope and the 22-unit return drop. A local action uses half its complete measured box height on both sides, including its stroke. If a different marker requires more ink, measure the larger envelope; never hide it behind the constant.

```ts
// Proposed vertical algorithm for neighboring events within one phase.
const nextRow = Math.ceil(Math.max(
  previous.row + 28,
  previous.row + previous.lower + 5 + next.upper,
));
```

Thus a self row 100 with H57 has lower 39.5; the following H23 ordinary label has upper 27. The next row is `ceil(max(128,100+39.5+5+27))=172`. Its label top is 145 and the prior label bottom 139.5, leaving 5.5 units. This is the exact expected target fixture; the baseline's row 158 and 5.5-unit overlap are the defect being repaired.

Place phases as complete measured blocks: after positioning their event envelopes with the within-phase rule, include eight units above and below, expand to the title's minimum if needed, then begin the next phase 16 units below that block. Do not merely add 16 to a row while allowing a taller phase title to intrude. Put the first authored phase 16 units below the common participant-header bottom; its first event ink begins at least eight units below the band top. For leading unphased events, keep at least five units between the header row and their ink, while maintaining the 28-unit minimum row increment. These explicit starting rules keep first-row labels clear of multiline headers.

Compute panel bounds last from the union of header/group rectangles, lifelines, all event paths/labels/actions and phase gutter, then add 20 units on each side. Heading, scope, used-notation key and the built-in order-only timing caption belong to the outer explanatory frame and must also be measured. Never derive the panel only from participant rectangles.

### 4.3 Renderer parity

`src/cli/svg.ts` (`sequenceBackdrop`, message rendering), `Lifelines.tsx`, `EdgeView.tsx`, `NodeView.tsx`, and `StaticScene.tsx` should consume the same measured lines, routes, bounds and notation values. Keep framework-specific markup separate; share the values rather than duplicating layout formulas. `src/state/scene.ts` must not recompute sequence label widths with a separate camera-dependent path. `src/model/routes.ts` should treat compiled sequence routes as authoritative for sequence events.

Extend `project.ts`'s canonical geometry proof so labels/actions/phase gutter participate, or add an explicit `sequenceGeometry` record alongside the existing node/route record. The current `CanonicalGeometry` only lists node rectangles and route points; that cannot detect mismatched label wrapping. Do not remove existing geometry consumers gratuitously.

### 4.4 Corpus and proof

Use the small corpus named in the research report, including: the baseline sign-in; a first-row multiline label; a distant-lane long label; adjacent long labels with unequal lane widths; first/interior/last-lane self-messages; multiple multiline headers; long phase label; grouped explicit order; single participant with only local/self work; unphased events between phases; empty/invalid phase examples; and related success/failure companions with fixed lanes.

For every valid fixture check all bounds are finite, complete, nonoverlapping where required, and equal across CLI/editor/static renderers. For the actual sign-in, retain all seven facts and verify readable text at 900, 1, 000, and 1, 100 px. Inspect the SVG itself and a PNG produced from it; a matching JSON record is necessary but not sufficient visual proof.

Main risk: renderer parity can appear correct for paths while labels differ. Require a browser proof that compares text lines and bounding boxes as well as node/path coordinates, using the existing proof infrastructure and `window.diagramStudio.ready()`.

## 5. M3 — explicit meanings and a small hybrid sequence model

### 5.1 Product decision

Keep nodes/groups/edges and existing stable IDs. Add a sequence semantic record with event order, local actions, explicit message meanings/relationships, phases, and scope. Do not force a local action into a self-edge or participant node. Do not replace the whole application model with UML occurrence events. Do not interpret legacy `kind=async` automatically.

The supported Build grammar will be deliberately small:

```text
edge <id> <sender> -> <receiver> ["label"] [message=interaction|call|send|reply|outcome] [reply-to=<message-id>]
action <id> <participant-id> "label"
scope "text"
phase <id> "label" <event-id>...
```

These are **proposed additions**, except the existing `edge`/`phase` forms. The supplied baseline parser does not accept `message`, `reply-to`, `action`, or `scope`.

### 5.2 Exact meanings

| Type | Meaning authored by choosing it | What it must not imply |
| --- | --- | --- |
| `interaction` | Directed interaction; default for existing untyped solid arrows | Blocking, asynchronous transport, delivery guarantee, or completion |
| `call` | Synchronous invocation; sender awaits return from that invocation | CPU activity, elapsed duration, durable state, or that every return must be shown |
| `send` | Asynchronous send; sender does not synchronously await its result | Delivery or downstream completion |
| `reply` | Response/result; optionally related to one explicit earlier message | Measured latency, unique terminal completion, successful persistence |
| `outcome` | Directed presentation of the shown result from sender to receiver | A network response to a human, token storage, or an implementation boundary not in the source |
| `action` | Work belongs to one participant at this place in the explanation | Self-call, network exchange, measured execution interval |

`scope` is authored explanatory text, not a boolean proof of coverage. The renderer does not infer exclusions from it. It is visible in every export. Independently, the narrative sequence compiler always emits a visible order-only timing caption: **“Spacing shows order, not elapsed time.”** The sample scope is exactly **“Valid credentials; error paths omitted.”** Keeping these separate prevents an unrelated scope edit from accidentally removing the timing caveat. Phase remains a narrative interval, never a branch, transaction or parallel construct.

### 5.3 Proposed model; single semantic owner

```ts
type SequenceMessageKind =
  | 'interaction'
  | 'call'
  | 'send'
  | 'reply'
  | 'outcome';

interface SequenceMessage {
  kind: SequenceMessageKind;
  replyTo?: string;
}

interface SequenceAction {
  id: string;
  participantId: string;
  label: string;
}

interface SequencePhase {
  id: string;
  label: string;
  eventIds: string[];
}

interface SequenceSpec {
  eventOrder: string[]; // Every message-edge/action ID exactly once, in source order.
  messages: Record<string, SequenceMessage>; // Explicit classifications only; edge payload stays in graph.edges.
  actions: SequenceAction[];
  phases: SequencePhase[];
  scope?: string;
}

interface Diagram {
  // Existing graph, layout, appearance, settings, etc. stay.
  sequence?: SequenceSpec;
}
```

Use the equivalent narrow field on parsed `Model`. Read edge/action statements in file order to construct `eventOrder`, even when `layout root sequence` appears later. Never derive the sequence from sorted y coordinates. Keep generic edge label/from/to exactly once; `messages` holds only sequence metadata. Add actions to sequence-aware entity lookup/selection directly, not to participant nodes.

The compiler derives `layout.sequence.participantIds` from node/group/order statements, not a second editable order property. `Diagram.layout.sequence` contains M2's geometry only. `SequenceSpec` must survive normalization/persistence independently of that geometry. Store source line mapping separately in parser metadata for diagnostics; do not serialize line numbers as semantic identity.

The `messages` map contains **only explicit classifications**. An existing edge with no `message=` is absent from the map, even though its display reads as an unspecified interaction. Preserve its existing `kind` literal/style through targeted source edits. `eventOrder` still references every message and action, including unclassified legacy messages. A newly created message may write `message=interaction` explicitly; that does not authorize silently classifying pre-existing source.

Retain the small authored discriminator `legacyKind?: 'sync' | 'async' | 'data'` on parsed/projected edge data when the source actually contains `kind=`; `dashed` remains the existing drawing value. Carry that field through `normalize` and source translation without filling it when absent. This is literal preservation, not a second semantic model. Reject contradictory new typed classification plus legacy style in sequence source; an explicit classification edit removes the old literal/style attribute in the same transaction. Unrelated label edits preserve it. Generic graph styling continues to use its existing meaning.

### 5.4 Parser/validation details

**`src/dsl/syntax.ts`:**

- Add the two edge attributes and new `action`/`scope` statement cases.
- `scope` accepts exactly one nonempty quoted argument and no attributes; at most one; only valid in sequence mode.
- `action` takes stable ID, participant ID, quoted nonempty label; endpoint must be a node. The initial action grammar does not take change marks or `was`; reject them explicitly. Existing node/group/edge change marks retain their current behavior. Do not add speculative action status fields until difference rendering can preserve both event forms honestly.
- Every event ID is unique across sequence messages and actions. Also prevent event/participant identity ambiguity in sequence selection; the current source parser has separate node and edge ID sets while `normalize` uses a global set, so sequence validation must not let an ambiguous ID through.
- Every event occurs exactly once in `eventOrder`; every message ref resolves to an edge; every action anchor resolves to a participant. Every phase uses event IDs and remains contiguous/disjoint in that order.
- `reply-to` is allowed only on `message=reply`; target must be an earlier message event; sender and receiver must reverse that message's endpoints. Reject action/phase references and forward references in the ordered explanation.
- The referenced message must have an **explicit** classification of `interaction`, `call`, or `send`. An unclassified legacy target requires author review and an explicit classification before it can be paired; no nearest-type or style inference fills the map. Reject targets whose kind is `reply` or `outcome`. Do not require a blocking call and do not synthesize a reply when none is shown.
- Multiple authored replies may reference one source message. This relation is a response relationship, not an implicit unique terminal-completion record.
- An unpaired reply is legal in a partial diagram. It receives no automatic pair focus. If the author wants to say the request is outside scope, they write that in `scope`.

**Legacy `kind=async`:** keep its existing dashed appearance and untyped interaction meaning unless explicitly reviewed. Add a targeted `sequence-ambiguous-kind` warning. The warning explains that the attribute currently controls dashes and asks the author to classify a reply or async send only when known. No schema version fork and no automatic conversion. When an author chooses a typed message, remove contradictory legacy `kind` styling in the same edit. Generic graph `kind` remains its current behavior.

### 5.5 Proposed sign-in source

This is **future-language source**, not accepted by the supplied baseline:

```draft
# PROPOSED FUTURE LANGUAGE. NOT SUPPORTED by commit 2f210ce4.
# Editorial source for sign-in-engineering-proposal.svg; not a renderer-equivalent artifact.
# Manual visual design coordinates are specified in visual-spec.json.
diagram "Successful password sign-in" version=1
subtitle "The web app delegates credential verification to the auth service."
scope "Valid credentials; error paths omitted."

node user "User"
node app "Web app"
node auth "Auth service"
node db "User store"

# An interaction is an authored exchange, with no synchronous/blocking claim.
edge m1 user -> app "submit email + password" message=interaction
edge m2 app -> auth "verify credentials" message=interaction
edge m3 auth -> db "load user" message=interaction
edge m4 db -> auth "user record" message=reply reply-to=m3
action m5 auth "check password hash"
edge m6 auth -> app "session token" message=reply reply-to=m2
edge m7 app -> user "signed in" message=outcome

phase submit "Submit" m1 m2
phase verify "Verify" m3 m4 m5
phase result "Return" m6 m7
order root user app auth db
layout root sequence

# Proposed compiler always emits an order-only timing caption for narrative sequences.
# This source intentionally claims neither cookie handling, durable storage, token format,
# session issuance location, exact protocol, blocking behavior nor measured duration.
```

The exact expected semantic record has four participants, six graph edges, one local action, and seven event IDs:

```json
{
  "eventOrder": ["m1", "m2", "m3", "m4", "m5", "m6", "m7"],
  "messages": {
    "m1": {"kind": "interaction"},
    "m2": {"kind": "interaction"},
    "m3": {"kind": "interaction"},
    "m4": {"kind": "reply", "replyTo": "m3"},
    "m6": {"kind": "reply", "replyTo": "m2"},
    "m7": {"kind": "outcome"}
  },
  "actions": [{"id": "m5", "participantId": "auth", "label": "check password hash"}],
  "phases": [
    {"id": "submit", "label": "Submit", "eventIds": ["m1", "m2"]},
    {"id": "verify", "label": "Verify", "eventIds": ["m3", "m4", "m5"]},
    {"id": "result", "label": "Return", "eventIds": ["m6", "m7"]}
  ],
  "scope": "Valid credentials; error paths omitted."
}
```

There are no `call` or `send` events in this example because the supplied evidence does not establish those execution modes. `m7` is an explicit directed outcome from Web app to User, preserving who presents the result. Nothing adds cookie handling, token storage, session issuance, invalid-user responses, or persistence guarantees.

### 5.6 Exact source/editor/persistence work

**Projection and normalization:** `src/dsl/project.ts` copies the semantic record without losing phase members or action anchors. `src/model/document.ts` validates and retains it; `normalize(projectScene(scene))` must retain meaning. `types.ts` and sequence-aware lookup code give local actions a selectable entity type. Do not “fix” missing actions by materializing participant nodes.

**Basic rendering is part of this slice:** M3 must draw every new type, the authored scope, and a compact key for the notation it actually uses before it is considered shippable. M4 expands that contract across focus/export states and interaction accessibility. Do not expose a source `scope` or message type that is saved but invisible in the actual export.

**Targeted source operations:** add narrow sequence operations in proposed `src/dsl/sequence-edits.ts` if `source-edits.ts` would become crowded. These functions operate directly on `SourceDoc`, with `state/actions.ts`/file-session transactions calling them. Avoid geometry-diff inference for event meaning or membership.

- Add event before/after a selected event, including action/edge interleaving. Do not always append after the last edge as the generic translator currently does.
- Change message type or explicit pair by attributes, preserving ID/label/comment.
- Convert a self-message to an action only on an explicit author command. Keep its ID, label, phase/focus references and inline comment.
- Reorder an event by moving its statement. Require explicit phase membership changes when crossing a phase boundary; do not infer them from the dragged y position.
- Rename an event ID atomically across phases, pair references and focus states. Label edits never rename IDs.
- Delete an event, clean memberships, and remove an empty phase. A surviving reply whose source is deleted becomes unpaired with an explicit review note; do not automatically delete a meaningful result.
- Delete a participant and its own actions/incident messages, then clean all dependent references in one source transaction.
- Edit scope through the source command and include it in export. A transient tooltip is not persistence.

**CLI edits:** extend `src/cli/edit.ts` with `action.<id>` lookup and the action's label argument index (2), use the same deletion/reference helper, and update `reply-to` attributes during `renameId` (the current key list only includes `in` and `root`). A command that cannot preserve action semantics must reject the operation before writing; it must not treat an action's participant ID as its label.

**Difference comparison guard:** same-ref `src/dsl/compare.ts` only recognizes node/group/edge declarations and its `edgeKey` has no sequence semantics (lines 19–25, 42–49). In this first semantic slice, explicitly reject before/after difference comparison when **either input** uses typed message semantics, local actions, **or an authored `scope` statement**, with a clear statement that semantic sequence differences are not yet supported. Plain legacy sequence comparisons remain as today; static layout candidates and normal source exports still work. Do not silently mark a call→send change unchanged, discard a removed action, show a self-call→local-action conversion as the same event form in both panels, or copy the newer scope into a misleading before panel. Full semantic difference rendering is a later bounded addition; source preservation and normal edit history are already required now.

**History:** use existing `state/document.ts` / `state/file-session.ts` transaction and revision flow. One accepted source action is one undo step, regardless of how many references it updates. Undo/redo restores source and recompiles semantics/geometry. A rejected semantic edit makes no source/history change. External revisions retain the existing conflict behavior; do not add an alternative history mechanism.

### 5.7 Acceptance cases

1. Future sign-in compiles to the exact semantic record above. m5 remains m5 and does not add a fifth participant.
2. Rename m4's label; `message=reply reply-to=m3` stays exact and is not rewritten as `kind=async`.
3. Convert m5 from self-edge to action; phase verify keeps `[m3,m4,m5]`; one Undo restores the original self-edge source and geometry; one Redo restores the action.
4. Insert an action after m3; it appears before m4 in source and event order, not at the end of the edge list.
5. Move m4 after m6 without editing phase membership; the proposed action is rejected if it violates phase contiguity. No partial save or extra undo entry remains.
6. `reply-to=m5` rejects because m5 is an action. `reply-to=m6` from m4 rejects because m6 is later. A reply with non-reversed endpoints rejects with both message IDs. A target whose explicit type is `reply` or `outcome` also rejects. A legacy unclassified target requires explicit author classification before pairing; validation does not infer `interaction` merely to accept the reference. Two valid authored replies to the same earlier explicit interaction are accepted and remain two responses, with no automatic terminal-completion claim.
7. Legacy `kind=async` remains visually dashed and semantically unspecified with a warning, including after unrelated label edits. No reply pair is invented.
8. A source containing explicit `message=call` retains that semantics through projection, normalization, editor save, source extraction and reopen. It is visually distinguished by the chosen notation contract.
9. Browser storage and file-mode reload both retain actions, phases, scope and pair references. If clipboard/copy commands support these entities, they must remap every reference; otherwise disable partial copying that would lose meaning until an explicit support slice is added.
10. A PNG/SVG export embeds the exact current source, including scope and message meaning; extracting and reopening recreates all seven events.
11. `pnpm draftably mv examples/login-sequence.draft m3 load_user` updates m4's `reply-to`, phase membership and event identity together; `pnpm draftably rm examples/login-sequence.draft action.m5` removes m5 from its phase and focus sets. Action label edits change the quoted text, never the anchor participant.
12. Before/after comparison fails explicitly when either input contains typed messages, actions, or `scope`, without producing a misleading marked drawing. Include a **scope-only edit fixture**: two otherwise identical legacy-style sequence sources have scopes “Success only.” and “Success and failure.” The command rejects rather than showing the new scope as unchanged context in both panels. Also test scope present in only the before input and only the after input. Ordinary rendering/export and static layout previews remain supported. This limitation is documented with the new grammar.

Docs: update `docs/DSL.md`, `skills/draftably/SKILL.md`, sequence example(s), and the relevant architecture paragraph. Include a changeset. Main risk: a semantically complete parser with an incomplete translator creates apparently successful edits that erase meaning. Land the vertical slice together.

## 6. M4 — focus that follows authored meaning; exports that stand alone

### 6.1 Build on existing state support

Current named `state` declarations are useful and already exported; they are not a missing feature. Extend them only as needed to reference local actions and to focus individual sequence events. Selecting two participant nodes must not implicitly focus every exchange between them when the intent is one message/response pair. Keep normal graph state behavior unchanged.

Recommended behavior:

- Selecting message m3 can focus m3, its sender/receiver, and explicitly paired reply m4, while keeping faint lane context and other events in place.
- Selecting m5 focuses the Auth service and its local action; it does not highlight every auth interaction merely because it shares the participant.
- A named state stores an explicit event focus set, or a saved sequence-aware focus command resolves a reviewed pairing to that set. It must not change if a nearby reverse arrow is added.
- Lane positions, event rows and panel bounds remain identical under focus. Dim context remains visible; focus is not omission.
- Keyboard and pointer interactions select the same semantic entity. Escape clears transient focus. Saving a named focus state is one source transaction.

### 6.2 Visible export context

Always draw the authored title/subtitle/scope and notation key in static exports. Generate the notation key mechanically from the types actually present; it describes glyphs, never invents event meaning. A generic legacy dashed interaction must be called an unclassified dashed interaction, not an async operation or reply. If that wording is unwieldy, direct the author to resolve the warning before a polished export, while still allowing export of the current source.

Use a compact key for the chosen notation: ordinary directed interaction; explicit synchronous call when present; explicit async send when present; reply; local action; outcome. Do not add absent types or a complete UML legend. For an untyped message and an async send that otherwise share an open arrow, add a concise visible async cue on the send rather than relying on hover.

Scope and timing prose must survive focus exports. An export of a state gets a visible state label, preserving current `--state`/`--states` conventions. A focused view is not a proof that faded events did not occur.

Accessibility (`SEQ-09`) includes an SVG title/description connected to the image, meaningful participant/event names, keyboard access to the same focus actions, and an ordered text equivalent that retains scope and omissions. Dashed/solid stroke or hue alone must not carry the only distinction between message types. A local-action label must be readable as an event on Auth service even when the visual glyph is not perceived. Add only the description/list needed for equivalent understanding; this is not a separate documentation app.

### 6.3 Modules and proof

`src/model/appearance.ts` / existing state helpers, sequence-aware focus lookup, `src/state/scene.ts`, `src/state/actions.ts`, `src/state/debug-api.ts`, `Lifelines.tsx`, `EdgeView.tsx`, proposed local-action component, `StaticScene.tsx`, `src/cli/svg.ts`, and current source-edit/normalization paths. Inspect the exact existing `withState` helper before coding; do not assume generic endpoint-based closure matches sequence intent.

Tests: explicit m3/m4 pairing focus; unrelated reverse edge remains dim; local action focus; no geometry change under focus; state survives source save/undo/reload; static key/scope present in CLI and browser exports. Use existing browser proof infrastructure, not an ad hoc standalone script. Main risk: over-highlighting changes the apparent causal story while passing geometry checks.

## 7. M5 — exploration prototypes, separated from Build

### 7.1 Honest phase collapse

Prototype a collapsed phase that keeps the same participant order and shows a visible marker such as `Verify — 3 events hidden`. Its summary is authored; if no summary exists, show only phase name/count. Do not synthesize “verified”, “committed”, or “completed” from the first/last message. Keep the boundary interactions necessary to orient the story when the author explicitly chooses them, and count hidden events accurately. A self-message or local action counts as one event, not several line segments.

Collapsed view state is distinct from editing the source. If export supports the collapsed view, the marker must be visible in SVG/PNG and embedded source remains complete. Never export a compressed gap that makes omitted events look absent. A legend that exists only when expanded is insufficient.

### 7.2 Mobile context

Prototype horizontal exploration with pinned participant labels, a retained current phase label, and a small location cue. Keep arrow endpoint context available when a message spans beyond the viewport. Do not shrink a 1, 000 px engineering diagram to a phone width and call it readable. Test actual scroll/zoom combinations, not a desktop screenshot scaled down. A brief separate overview may be the phone's initial view, but it must clearly say it omits engineering exchanges.

### 7.3 Alternatives and parallel regions

Prototype only against a concrete difficult corpus case. Use explicit authored operands/guards/membership; keep them separate from narrative phases. Specify branch order, lack of cross-branch ordering, send-before-receive constraints if occurrences are represented, and whether the join means waiting for all branches. Do not infer parallelism from equal rows or async style. Do not add full `alt`/`par` grammar to the Build milestones merely for feature completeness.

The sign-in failure companion should stop or label the unknown response behavior when supplied evidence runs out. It may illustrate the known decision point with an explicitly hypothetical condition, but it must not invent a token/error protocol or promise how authentication is implemented.

### 7.4 Reader-question gate

Use a small formative review with realistic reading tasks. This is a design-quality gate, not an external-demand or adoption prerequisite; Byron's intended use is already the demand.

Questions should include:

- Who checks the password hash? Expected: Auth service.
- What does User store return? Expected: user record.
- What does Auth service return to Web app in the successful path? Expected: session token.
- Does this picture establish token storage, cookie handling, durable persistence or elapsed time? Expected: no.
- Which errors does the successful view cover? Expected: none; error paths are omitted by scope.
- In a failure companion, did participant order change? Expected: no.
- In a collapsed Verify phase, how many events are hidden and can the visible picture prove those events completed? Expected: exact count; no invented completion claim.
- Does an asynchronous send prove delivery/completion? Expected: no.
- For a parallel prototype, which event orders are required and which are unspecified? Expected: exactly the authored constraints, not a total order from vertical alignment.

Compare baseline, minimally repaired current-language view, recommended engineering view, and brief overview using these tasks. Counterbalance order where feasible and record errors/confidence as well as reading time. Do not report study outcomes until actually run. A compact diagram wins only if readers retain the important facts and avoid false inferences. If collapse or fragments create repeated inference errors, simplify or defer them while retaining M1–M4.

## 8. Current-language source companion

This source uses **only syntax supported by the supplied baseline**. It is an authored improvement using current capabilities, not an assertion that its output matches the future mockup. The phase bands and scope text are supported now; exact compact header/local-action/typed-reply treatment requires the later plan.

```draft
# AUTHORED ALTERNATIVE using syntax supported by supplied commit 2f210ce4.
# This is not the supplied baseline and not the future local-action mockup.
# kind=async is the baseline's legacy spelling for a dashed stroke, not evidence of async execution.
diagram "Successful password sign-in" version=1
subtitle "The app delegates credential verification."
note "Valid credentials; error paths omitted. Spacing shows order, not elapsed time. Dashed arrows show results." width=640
theme drafting padding-y=8

node user "User" color=slate
node app "Web app" color=slate
node auth "Auth service" color=slate
node db "User store" color=slate

# Baseline-only workaround: the self-label needs 10px clear of the next lifeline.
# This enlarges one header because baseline has no separate self-label gap constraint.
size db width=144 height=32

edge m1 user -> app "submit email + password"
edge m2 app -> auth "verify credentials"
edge m3 auth -> db "load user"
edge m4 db -> auth "user record" kind=async
edge m5 auth -> auth "check password\nhash"
edge m6 auth -> app "session token" kind=async
edge m7 app -> user "signed in" kind=async

phase submit "Submit" m1 m2
phase verify "Verify" m3 m4 m5
phase result "Return" m6 m7
order root user app auth db
layout root sequence
```

The legacy `kind=async` spelling is deliberately preserved because that is the supported dashed style. The visible authored note prevents pretending it establishes asynchronous execution. The future-language companion replaces those style-only facts after explicit semantic review.

The final current-language companion was actually checked and rendered by the baseline CLI. Its participant headers are 32 units high; the explicit store width 144 is a temporary authoring workaround that leaves 10 logical units between the m5 label and the store lifeline. The final SVG is 834×581 logical units and its rasterized PNG is 1668×1162 pixels. At a display width of 1, 000 pixels, its 12.5-unit message type is about 14.99 pixels (`12.5 × 1000 / 834`). The PNG was made by standard SVG rasterization with the bundled font, not a browser screenshot. The arbitrary header widening is intentionally removed once M1/M2 can reserve self-label clearance independently.

## 9. Validation run sheet for the implementation worker

These are **future worker commands**, not checks performed during this research. Use a full checkout at the fixed baseline or a consciously reconciled later head; the supplied packet omits dependencies and proof infrastructure. Extend the existing proof harness for sequence fixtures before treating its result as sequence coverage. Do not copy an unmodified generic file proof result and call it proof of new sequence semantics.

The flags in this run sheet were checked against the pristine baseline's actual entrypoint, `src/cli/main.ts`: `inspect --png`, `--scale`, and `--max-width` are documented there and implemented by `maybePng`. The baseline has no `src/cli/index.ts`. Audit flags `--base`, `--sets`, and `--shots` are verified in `scripts/audit-compare.mjs`; the other commands are existing `package.json` scripts. `--max-width` caps raster output width; it is not a layout-width setting or a guarantee of readable type.

```sh
# Install the repository's declared toolchain/dependencies in the implementation checkout.
pnpm install

# During M1/M2/M3 work: target the affected semantics, translation and label invariants.
pnpm exec vitest run tests/sequence.test.ts tests/translate.test.ts tests/edge-labels.test.ts tests/dsl.test.ts
pnpm check:fast

# Review the authored example with the repository's existing screenshot path.
pnpm shoot examples/login-sequence.draft tmp/sequence.png
pnpm draftably inspect examples/login-sequence.draft --png tmp/sequence-900.png --max-width 900
pnpm draftably inspect examples/login-sequence.draft --png tmp/sequence-1000.png --max-width 1000
pnpm draftably inspect examples/login-sequence.draft --png tmp/sequence-1100.png --max-width 1100

# Build before real browser proofs; extend the existing proof script with the sequence fixture.
pnpm build
pnpm prove:file
pnpm prove:themes

# Layout changes need before/after review against the intended baseline.
pnpm audit:compare --base 2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4 --sets examples --shots

# Required final repository gate before any future push by the implementation owner.
pnpm check
pnpm skill:check
pnpm changeset:check
```

Run only the checks needed for the milestone and the required repository gate; do not repeatedly broaden testing without a concrete remaining risk. `docs/CHECKS.md` owns exact proof/audit behavior. The browser API must await `window.diagramStudio.ready()` before geometry/export reads. Product code or example changes need a changeset; language changes need both the DSL guide and agent skill in the same change. This research mission does not authorize feature implementation, commits, pushes, or deployment. Read-only baseline checks and analysis probes are distinct from implementing this plan.

## 10. Open implementation decisions already bounded

- **Exact measured defaults:** chosen in section 4.2 and its acceptance fixtures. Revisit only when corpus/reader evidence identifies a concrete failure.
- **Legacy message classification:** unresolved old dashed messages stay unresolved. The renderer can warn and preserve them; author review chooses semantics.
- **Failure behavior:** absent authentication details remain absent. Companion views label hypothetical scope and unknown continuation visibly.
- **Formal fragments:** no Build commitment. The prototype must first define truthful order/join semantics and demonstrate readable static output.
- **Mobile:** an exploration prototype, not a promise that desktop export becomes readable by automatic shrink-to-fit.

## 11. Access and verification status

The accompanying design report records source analysis, supplied-render inspection, external research, and original visual mockup checks. The accompanying sequence-validation.md records 52 passing baseline tests across the four supplied suites, actual CLI exports, and exact pure-module probes. The new implementation acceptance tests, full repository gates, interactive browser/file-session proofs and reader experiments in this plan remain proposals. Browser provisioning was blocked; a standard rasterization of the actual CLI SVG is not a browser parity proof. This plan was prepared from the exact 34-file packet plus named exact-ref supplements, not a claim of a full repository audit. Exact geometry expectations in this plan are proposed implementation acceptance criteria; the mockups are inspected editorial designs, not outputs or production golden files of an implemented renderer.

