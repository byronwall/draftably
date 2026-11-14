# Sequence diagrams as explanations: design report

**Decision.** Build a small, explicit sequence layer over Draftably’s existing participants, edges, source editing, deterministic fonts, and SolidJS renderer. First repair the current order, phase, reference-cleanup, and label-envelope defects. Then make the default sequence an edited explanation: compact readable headers, measured message and local-action rows, bounded phase labels, visible scope and notation, and stable participant order. Keep all seven facts in the successful sign-in example; classify its local hash check explicitly, preserve its two informative returned values, and describe “signed in” as a presented outcome. Reuse named emphasis states for response-aware focus. Explore honest collapse and mobile context after the core contracts work. Do not replace the renderer, infer execution semantics from dashed strokes or proximity, or build the full UML notation catalog. “Build” in this report names proposed plan scope; it is not approval to implement or ship.

Baseline: **2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4**, captured 2026-10-30. Research verified during this mission. The source note was captured separately on 2026-10-30. This is a research and design deliverable; no product source changes, commits, pushes, or deployment were made.

## 1. Access, evidence, and the decision boundary

The supplied packet is authoritative. All **34 files** were read across the research team, including the entire source note. A pristine archive of the named commit was subsequently obtained to run bounded verification. Its **33 repository files** match the packet after removing the packet’s separator trailing newlines; the separately captured note is the thirty-fourth file. The source note is design input, not a record that every criticism still applies.

The actual baseline image was inspected as supplied. It is **1482 × 1108 raster pixels**. The real CLI SVG from the supplied commit is **741 × 554 logical units**, with viewBox −76,−124, 741, 554. Those dimensions are consistent with a 2× raster; treating 1482 as the underlying layout width would misdiagnose the reading-size problem. No pixel-perfect equivalence between a newly generated image and the supplied image is claimed.

Evidence labels used below:

- **Observed:** inspected in the supplied render or reproduced by executing the pristine baseline.
- **Source fact:** established by exact-baseline source, with module and symbol citations.
- **Inference:** a reasoned consequence or visual judgment, not an observed reader outcome.
- **Proposal:** recommended behavior, syntax, geometry, or tests that have not been implemented.

Additional exact-ref reads included font measurement, shape defaults, frame metrics, source-edit helpers, export bounds, document transactions, and file sessions. The full checkout was available for tests; that does **not** mean every repository file or every editor interaction was reviewed. Current public deployment behavior was not used as evidence for this commit.

The implementation plan and fixtures are companions to this report. The report resolves the product and algorithm choices; the plan specifies modules and acceptance contracts. Proposed-language files and SVG studies are visibly labeled, and are distinct from the supplied baseline and the actual current-language alternative.

## 2. What remains wrong: note-to-code gap map

The useful question is what remains after the baseline’s existing improvements. The following covers every substantive section of the note; statuses apply to the combined design concern, not merely to whether a keyword exists.

| Note section | Status and baseline evidence | Recommended disposition |
| --- | --- | --- |
| 1. Chronology needs an explanatory purpose | **Partially solved.** Titles, subtitles, notes and named states exist, but the login example’s subtitle identifies the notation rather than the takeaway. | State the delegation/responsibility takeaway and scope. Preserve authoring assistance as advice, not an inference engine. SEQ-09, 15. |
| 2. Keep the successful simple structure | **Already good.** Four participants, seven events, adjacent interparticipant exchanges, and no activation or branch clutter. | Preserve this structure and lane order. Do not add shapes, icons or branches for completeness. SEQ-15, 22. |
| 3. Quiet participant headers | **Partially solved.** Narrow widths and outlined accents exist; the note’s saturated-fill criticism is stale. All baseline headers are still 56 units tall. Auto-colored Web app receives a white outline. | Compact sequence-specific vertical padding; retain a contrast-correct neutral outline. SEQ-05, 08. |
| 4. Continuous lines and clear local work | **Mostly solved visually, incomplete semantically.** Labels already sit above continuous shafts. The self-message has four attached points. Its label still crosses the next lifeline, and a self-call cannot express a distinct local action. | Preserve continuous shafts; fix envelopes; add authored local actions. SEQ-03, 04, 12. |
| 5. Authored phases | **Partially solved.** Phase syntax and bands already exist. The login example does not use them. Phase membership can be noncontiguous, and phase boundaries do not alter row spacing. | Validate intervals and make phase headings/spacing participate in layout. SEQ-01, 08. |
| 6. Reading-size layout | **Partially solved.** Stored font metrics and wrapped sequence labels exist. There is no demonstrated fit/readability policy; diagram width is a minimum frame width. | Evaluate complete exports at 900/1000/1100 display widths, preserve readable type, and warn rather than silently shrinking. SEQ-08, 16, 26. |
| 7. Deliberate abstraction levels | **Missing as a sequence contract.** Every edge becomes a message, including local work and user-facing outcome. | Keep generic interactions as the safe default; explicitly author action and outcome meanings. Supply a separate brief overview. SEQ-10, 12, 15. |
| 8. Honest success scope and failure companion | **Supported by authoring primitives, missing from the example.** Existing subtitle/frame notes can say this today. Failure implementation details are absent. | Publish the success scope; provide an explicitly hypothetical failure scaffold with unknown continuation. SEQ-09, 15. |
| 9. Participant order and stability | **Partially solved.** Declaration/root-node order and contiguous group packing exist. Legal group IDs in root order and group-member order are ignored by the sequence pass. | Honor the existing hierarchy; preview any later suggestions. SEQ-02, 21. |
| 10. Avoid false timing/execution certainty | **Missing semantic distinction.** Rows are numeric drawing coordinates. Async is only a dash flag; no occurrence-level ordering model exists. | Make narrative order explicit; separate typed send/call/response; defer formal concurrency and measured time. SEQ-10, 20, 23, 24. |
| 11. Returns should carry useful information | **Current example already contains useful values.** User record and session token are informative; signed in is a human-facing result. No pair relationships exist. | Keep these facts and add explicit, optional pairing. Do not delete returns to meet an arrow-count target. SEQ-11, 12. |
| 12. Specific redesign | **Several proposed visual improvements are already present.** The remaining coherent change is narrative structure, local-action ownership, scope, and compactness. | Use the engineering proposal, not a new theme, as the target. SEQ-08, 09, 12, 15. |
| 13. Sometimes use another view | **A design choice, not a missing mandatory feature.** Draftably already serves several diagram families. | Choose an overview, dependency view, state machine, decision table, or measured trace by the reader’s question. SEQ-15, 23, 26. |
| 14. Renderer priorities | **Mixed.** Measurement, wrapping, phases and named emphasis already exist. Response-aware focus, semantic collapse, explicit actions and meaningful sequence diagnostics do not. | Build the narrow semantic and geometric core; explore collapse/mobile; avoid recovered semantics. SEQ-01–20, 24. |

Code anchors for this map: [compile.ts: participantWidth and sequenced][B1]; [labels.ts: MESSAGE_WRAP, edgeLabelType, edgeLabelLines, edgeLabelSize][B2]; [routes.ts: drawRoutes and messageRoute][B3]; [syntax.ts: parseModel and validateReferences][B4]; [types.ts: SequenceLayout][B5]; [colors.ts: drawnSwatch and participantAccent][B6]; [svg.ts: sequenceBackdrop and statesSvg][B7]; [login-sequence.draft][B8]; [DSL sequence reference][B9].

### 2.1 The most valuable immediate fixes are correctness fixes

**Observed: phase bands can visually claim unlisted events.** A phase containing e1 and e3 and a second containing e2 are accepted without diagnostics. With rows 92, 128, 164, the first band occupies y65..172 and the second y101..136. The source memberships are disjoint, but the picture overlaps them. The cause is validation of membership without contiguity, followed by a min/max rectangle. Reject the skipped event or require two separate phases. Do not invent nested narrative semantics.

**Observed: a valid grouped order is ignored.** With A and C inside G, and B at root, “order root g b” compiles but draws B, A, C. Group IDs are valid direct children in the parser, yet sequenced resolves the root order against nodes only. Conversely, “order root a b c” is invalid when A/C are group children; it is not a valid counterexample. Fix the existing hierarchical order vocabulary rather than introducing another order command.

**Observed: deleting a phased edge cannot complete.** The real model deletion followed by translateEdit removes e1, leaves e1 in the phase, and fails revalidation with “Unknown message e1 in phase p.” The file-session path rejects the edit instead of saving corrupt source. The user-visible problem is an edit that snaps back. Add narrow cleanup of phase references and remove empty phases in the same transaction. Exact-ref source-edits.ts confirms the existing cleanup only handles named states and ordinary object references. [B4], [B10], [B11]

**Observed: a distant label constraint is unsatisfied in valid source.** Section 5 gives the exact counterexample. This is not an argument for a general-purpose constraint solver; one forward recurrence resolves the width requirement.

**Source fact: choosing a theme can remove explanation metadata.** actions.chooseTheme replaces the appearance object with theme, overrides and custom colors. Browser-document mode loses its other appearance fields. In file mode, translation removes the subtitle and explicit heading width; unchanged note/legend/state declarations can return during projection. Preserve unrelated fields directly. Do not claim that every note or legend is deleted from the source. [B12], [B10]

These fixes form milestone one. They do not depend on adding local actions or formal notation.

## 3. The coherent product design

The sequence should answer a stated question at a chosen level of detail. For this example: **the web app delegates credential verification, and the auth service owns the stored-record lookup and local password check.** This is an engineering responsibility explanation with a human-facing endpoint.

The recommended presentation has four layers:

1. **Visible framing:** title, one-sentence takeaway, success-only scope, and an order-not-time statement.
2. **Quiet cast:** consistent participant headers, stable lanes, and subordinate lifelines.
3. **Readable story:** three authored sections, continuous arrows, informative returned values, and an explicit local-action row.
4. **Optional exploration:** focus that preserves context; later collapse that visibly declares hidden events.

This does not require a color for every role. The proposed engineering figure uses one restrained accent for the Verify section and local action, with meaning supplied in text. Group bands remain available when an actual boundary matters; this four-role example does not need additional containers.

### 3.1 Preserve the seven facts

| Event | Source fact retained | Proposed treatment |
| --- | --- | --- |
| m1 | User → Web app: submit email + password | Generic interaction, two-line label when necessary. |
| m2 | Web app → Auth service: verify credentials | Generic interaction; no newly inferred blocking contract. |
| m3 | Auth service → User store: load user | Generic interaction. |
| m4 | User store → Auth service: user record | Explicit narrative response to m3. |
| m5 | Auth service → itself: check password hash | Authored local action owned by Auth service; not an inferred network request. |
| m6 | Auth service → Web app: session token | Explicit narrative response to m2. |
| m7 | Web app → User: signed in | User-facing outcome interaction, not a claim that a human receives a network token. |

The fact mapping comes from the supplied example and full note. The redesign does not add cookies, token storage, a token format, a session-issuance component, database writes, retries, a specific protocol, measured delay, or durable persistence. An action is only converted from a self-message when the author chooses that meaning; arbitrary self-calls retain their call-shaped loop.

### 3.2 Viable alternatives

| Option | Where it succeeds | Why it is not the complete recommendation |
| --- | --- | --- |
| Author a better example using only current syntax | Immediate, small, reversible; scope, phases, compact padding and manual wrapping work today. The supplied current-language companion actually compiles. | It needs a width workaround for the local loop, cannot preserve message semantics, and does not fix broken order/phase edits. |
| Extend ordinary edges with more flags only | Cheap for styling; reuses selection and graph operations. | Local actions remain fake edges; source phase semantics still disappear into layout; flags tend to be lost at projection/normalization boundaries. |
| **Small hybrid, recommended** | Keeps the useful graph/editor foundation while explicitly owning event order, local actions, phase membership, response identity and scope. | Requires deliberate parser/project/normalize/translate work and a small action-selection path. That cost is necessary and bounded. |
| Dedicated UML sequence document and renderer | Appropriate for a protocol-modeling product requiring occurrence events, execution specifications and nested fragments. | Rebuilds too much of this personal project for the explanatory need; a second editing/rendering stack becomes the main risk. |
| Delegate layout to another sequence renderer | Could gain a broad notation catalog quickly. | Would still need source editing, selection, undo, font, export and persistence integration; current-language round trips and deterministic parity become adapters rather than direct code. |
| Replace the detailed view with only a three-panel overview | Excellent for the one-sentence story and mixed audiences. | Does not let an engineer trace individual senders, receivers and returned values as quickly. Keep it as a companion. |

The task-specific criteria are responsibility accuracy, scope honesty, readable labels at use size, stable comparisons, source/editor fidelity, and implementation size. Feature count and minimum area are secondary.

## 4. Language and model: explicit meaning without a second product

### 4.1 Ranked semantic needs

**Build now:** generic interactions; explicit synchronous calls only when authored; asynchronous sends; narrative replies with stable optional pairing; local actions; human-facing outcomes; existing authored phases; explicit scope and visible notation; event order preserved through all editing paths.

**Explore later:** a single local alternative, and a small parallel region with explicit operands. These deserve real structure if added. An ordinary phase called “Parallel” must never acquire concurrency meaning.

**Defer:** activation bars, object creation/destruction, state invariants, gates, lost/found message notation, arbitrary fragment nesting, and measured timing. These may be useful for a specific future task; they are not required to improve the present explanation.

### 4.2 Proposed language — NOT supported at the supplied commit

The complete source is also supplied as sign-in-proposed-language.draft. Existing phase and node/edge spellings are reused. New spellings are message, reply-to, action and scope.

~~~draft
diagram "Successful password sign-in" version=1
subtitle "The web app delegates credential verification to the auth service."
scope "Valid credentials; error paths omitted."

node user "User"
node app "Web app"
node auth "Auth service"
node db "User store"

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
~~~

The compiler emits the narrative order-not-time caption as part of every sequence export. Scope is author-supplied and optional for generic diagrams, but this example supplies it. A missing scope is an informational review prompt, not proof that a diagram is incorrect.

### 4.3 Semantics and rendering contract

| Meaning | What the author asserts | Rendering and limits |
| --- | --- | --- |
| explicit interaction | An exchange belongs at this point in the narrative. | Solid open arrow. No blocking, processing-completion or cross-lifeline synchronization claim. |
| call | The depicted caller waits for the operation’s return in the authored context. | Solid filled arrowhead and used-notation key. It does not serialize unrelated threads. |
| send | The depicted sender does not wait for a response to this send. | Solid open arrow with visible “async” qualifier; no completion or durable-delivery claim. |
| reply | A returned result is depicted; reply-to optionally names the preceding exchange. | Dashed open arrow. Pairing to interaction is an informal response; pairing to call may describe its return. This smaller notation is not advertised as full UML conformance. |
| outcome | A result is presented to the target role. | Ordinary directed interaction, described in the visible key as a presented result. No invented transport boundary. |
| action | The named participant performs local work. | Measured box on its own lane with top/bottom lifeline attachment; no request-return loop or implied duration. |

New sequence-message creation writes message=interaction. Existing untyped solid exchanges have the same neutral display, while unclassified legacy edges retain their existing stroke. The same open arrow is intentionally available for an unspecified interaction and an explicit send, so the visible “async” qualifier is required on sends. The export key lists only used distinctions. Color must not be the only way to identify a kind.

Source edge order is **narrative row order**. It is not a timestamped trace or a universal happens-before relation among all activities in all lanes. The source asserts send/receive direction of the depicted interaction; it does not establish how long processing lasted. Phase boundaries are editorial separators, not joins or barriers. Full occurrence-event semantics remain outside the Build scope.

For a future parallel prototype, each operand must own an ordered event list, with cross-operand dependencies authored separately. Interleaving must not be guessed from shared y coordinates. A future alternative needs explicit guards and operand membership, not overlapping phases. These requirements establish a safe design boundary; the proposed production grammar does not yet include alt or par.

### 4.4 Small hybrid data ownership

The following is a proposed type contract, not repository implementation. It deliberately references ordinary edge payloads rather than duplicating sender/receiver/label data.

~~~ts
type SequenceMessageKind =
  | "interaction" | "call" | "send" | "reply" | "outcome";

interface SequenceSpec {
  eventOrder: string[];         // All message and action IDs, source-line order.
  messages: Record<string, {   // EXPLICIT classifications only; payload stays on edges.
    kind: SequenceMessageKind;
    replyTo?: string;           // Earlier interaction/call/send with reversed endpoints.
  }>;
  actions: Array<{
    id: string;                // Globally unique event ID.
    participantId: string;     // Existing graph node ID.
    label: string;
  }>;
  phases: Array<{
    id: string;
    label: string;
    eventIds: string[];         // Contiguous and disjoint.
  }>;
  scope?: string;
}

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
~~~

Store authored SequenceSpec on the parsed model and Diagram; store derived geometry on layout.sequence. Existing graph nodes remain participants, and graph edges remain message payloads. Do not create invisible graph nodes to hold actions. Do not store a second independently editable participant-order list; order intent stays in source declarations and order statements, and the compiled layout publishes its effective order.

SequenceSpec.eventOrder is authoritative for mixed message/action rows; the order of the actions array is not a second ordering authority. Graph edge order is its message-only projection. An unclassified legacy edge appears in eventOrder but has no messages-map entry. Its existing literal kind/style stays on the edge/source; typed painting applies only to an explicit entry. An explicit message=interaction is therefore distinct from an unclassified dashed legacy edge. Store no second copy of sender, receiver or message label in SequenceSpec. Normalization must retain and validate the semantic record; it must not reconstruct it from numeric rows or rectangles. This directly addresses the current SequenceLayout, which only retains panel/phase geometry, and current projection, which reduces edge kind to dashed. [B4], [B5], [B13], [B14]

### 4.5 Reply identity and legacy async

Pairing is explicit. The target must exist, precede the reply, be explicitly classified as interaction, call or send, and have reversed endpoints. An unclassified legacy target must be reviewed before it can receive an explicit pair link. No nearest reverse-arrow or activation-stack guess is allowed. An unpaired explicit reply remains legal with an informational diagnostic; external context may have been omitted. Multiple replies may reference the same exchange. The link establishes response identity, not a terminal state, total completion, or a delivery guarantee; no protocol state machine is implied. Invalid pairing is an error, not an auto-repair.

The documentation conflict is concrete: docs/DSL.md:230 describes kind=async as the usual dashed reply mark; skills/draftably/SKILL.md:183 prescribes it for replies, while the same skill at line 279 recommends it for events, queues and background work. Parsing/projection preserves a dashed stroke, not those distinct meanings. [B4], [B9], [B20]

Current kind=async is **not** retroactively redefined. It remains an unclassified dashed legacy interaction with a sequence-specific diagnostic explaining the ambiguity. The author can choose reply or send. Explicit classification removes the old kind attribute in the same edit. Existing generic graphs retain their styling vocabulary. There is no need for a DSL version fork, migration service, broad compatibility layer, or parallel schema family.

Unrelated label edits must not rewrite an ambiguous source into an asserted meaning. Preserve legacy kind spelling through targeted AST edits and retain the authored literal as legacyKind?: "sync" | "async" | "data" on parsed/projected edge data through normalization and translation. Do not fill it when absent. Reject new typed classification together with legacy kind styling; an intentional classification edit removes that old attribute in the same transaction. Current sync and data both becoming non-dashed must not become an excuse to claim a semantically lossless round trip.

### 4.6 Source/editor round trips and undo

“Lossless” means preserving event identities, order, classifications, pair references, phase membership, scope, explanatory text, existing node/edge/group change marks, comments, and unrelated source statements. Local-action change marks are outside the first vertical slice and must be rejected explicitly rather than silently dropped. The formatter can normalize whitespace; byte identity of every edit is not promised. Undo does promise restoration of the recorded before-source.

The path is parser → model → compiler → projection → normalization → editor transaction → targeted translation → validation → recompile. A field added only to a TSX component or layout record will not survive that path. The exact-ref file-session implementation confirms source-based history and validation before saving. [B10], [B13], [B14], [B15]

Required actions:

- Add/delete/relabel an event; maintain phase and pairing references atomically.
- Move an event by changing source event order. Reject moves that create noncontiguous phases or invalid forward pair references unless the same explicit operation repairs them.
- Reorder a participant by changing the existing root/group order intent; never save a meaningless y coordinate, near, or pin.
- Change message classification, pairing, action ownership, and scope in one deliberate transaction each.
- Preserve stable selection by event ID after recompilation.
- Finish pending inline text edits before a reorder. Treat camera and temporary focus as exploration, not semantic edits.
- Keep comments attached under a documented simple rule: inline comments travel with their statement; a directly preceding comment run travels with it unless separated by a blank line. Section-level comments do not silently migrate across boundaries.
- Deleting an action cleans phase membership; deleting a participant also deletes or explicitly reassigns its action rows. No dangling references.
- A theme change preserves explanation metadata, and source undo restores the exact prior source.

Two additional exact-ref paths matter. src/cli/edit.ts:removeIds has the same phase-cleanup omission as editor translation, so CLI deletion must share the fix. Its renameId must also maintain any new reply-to reference. src/dsl/compare.ts currently compares node/group/edge payloads and cannot honestly report semantic-only, action, or scope changes. In particular, copied newer scope text could otherwise appear unmarked or on both sides of a comparison. In the first semantic release, reject before/after comparison when either input contains explicitly typed messages, actions, or new authored scope with an explicit unsupported-comparison diagnostic; retain existing legacy graph comparisons and ordinary static exports. Extending semantic comparison can follow later without silently reporting “unchanged.” [B21], [B22]

## 5. Deterministic layout that meets its constraints

### 5.1 Baseline geometry and what it proves

The baseline has lane centers **68, 249, 393, 537**, four **104×56** headers, message rows **92, 128, 164, 200, 236, 294, 330**, and a self-loop returning at **258**. Its panel is x=−36, y=−20, w=661, h=410. The m5 label is x=433, y=235.5, w=147, h=23; it covers x433..580, crossing the User store lifeline at x537. It remains inside this panel’s right edge 625. Therefore the observed defect is ownership/clearance, **not clipping**.

Ordinary message labels are measured and wrapped at 168 units of text width, with a 16-unit horizontal label-box allowance. Their boxes end one unit above the shaft. The self-loop is already (x, y),(x+36, y),(x+36, y+22),(x, y+22). The compiler only adds horizontal label constraints for distinct endpoints, so the side label is unreserved. [B1], [B2], [B3]

The outer drawingBounds includes the panel, route points, and label rectangles. A rightmost self-label may extend the overall export instead of being cut off. Inner-panel containment still needs a repair. diagramFrame treats heading width as a **minimum**, so diagram width=1000 is not a fit-to-1000 command. [B16], [B17]

### 5.2 Exact distant-label counterexample

This source is supported and actually checked at the baseline:

~~~draft
diagram "Distant message label constraint counterexample" version=1
theme drafting padding-y=4
node a "A"
node b "B"
node c "C"
size a width=40 height=32
size b width=40 height=32
size c width=40 height=32
edge e a -> c "MMMMMMMMMMMMMMMMMMM"
order root a b c
layout root sequence
~~~

It produces centers **36, 116, 212**. The wrapped label is **176×40**, with 14 M characters on the first line and five on the second. The intended width requirement is **176+16=192**. The actual endpoint span is **212−36=176**, short by **16**. The current code only makes the last adjacent gap at least 192/2=96, assuming the previous gap contributes another 96; it contributes 80.

This defect is easy to miss with ordinary 104-unit headers, whose minimum two-gap distance masks it. The valid 40-unit explicit widths expose it without overflowing the short participant labels. An earlier hypothetical width 20 would be invalid; the delivered fixture uses 40.

**M1 correction:** for every message spanning i<j, require c[j] ≥ c[i]+L+16, using the actual earlier center. In this exact fixture, c becomes **36, 116, 228**. The last gap is 112 and the full span 192. The label box then begins 44 and ends 220, leaving eight units at each endpoint. L is the existing padded label-box width, not raw text ink; the additional 16 is intentional endpoint clearance.

### 5.3 Horizontal algorithm

Use a small forward difference-constraint pass, with no optimizer dependency and no random or viewport-dependent input.

1. Resolve participant order from existing hierarchical author intent.
2. Measure compact headers and every event label with the bundled font tables.
3. Create adjacent minimum constraints from header half-widths, a 40-unit base gap, and explicit group-boundary padding.
4. In M1, add every interparticipant span constraint described above.
5. Add right-side self-loop constraints: next lane ≥ owner +36+4+labelWidth+8. For a rightmost loop, add the same ink extent to the panel bound. A terminal lane is not a reason to clip.
6. Solve constraints in increasing lane index, taking the maximum lower bound from already placed lanes.
7. Quantize outward consistently at the final geometry boundary; validate the resulting clearances after rounding.

Proposed pseudocode:

~~~ts
const centers = Array<number>(participants.length);
centers[0] = leftInset + widths[0] / 2;

for (let j = 1; j < centers.length; j++) {
  let x = centers[j - 1] + adjacentMinimum[j - 1];

  for (const constraint of endingAt[j]) {
    x = Math.max(x, centers[constraint.from] + constraint.distance);
  }

  centers[j] = roundOutward(x);
}

assertAllRequiredDistances(centers, constraints);
~~~

With constraints indexed by their ending lane, solving costs **O(P+E)** time and **O(P+E)** space, excluding text measurement. It leaves earlier lanes fixed when a later interval grows and shifts only the necessary suffix. It does not promise all x coordinates remain identical after arbitrary relabeling.

**M2 distant labels:** a wide message’s centered label can cross an intermediate lifeline even when its endpoints are far enough apart. Prefer a clear slot between crossed neighboring lifelines. Choose once on header-only base geometry: among slots already fitting L+16, choose nearest the full-span midpoint, ties left; if none fits, choose the midpoint-nearest slot and widen that gap. Freeze the choice before solving. Replace the full-span requirement with this stronger local slot requirement; the slot lies inside the span and therefore satisfies the span too. Place the label at that slot’s center above the continuous full message shaft.

Naively scanning crossed slots costs O(sum of message span lengths), worst **O(P×E)**. That is acceptable for these small diagrams. Do not claim the entire planner is linear or introduce interval trees to optimize a negligible cost. This policy prevents a distant label from expanding every lane and avoids repeatedly reselecting slots after geometry changes.

For the narrow three-lane fixture, M1 centers 36, 116, 228 are the exact correctness target. The later slot policy is a deliberate different contract: a tied first slot receives distance 192, producing centers 36, 228, 308. These are separate milestone expectations, not inconsistent goldens.

### 5.4 Local-action and self-loop envelopes

A centered local-action box reserves **both** sides of its owner lane: neighboring-center distance must cover half the action width plus eight units of clearance. The action interrupts only its own lifeline, with visible top/bottom attachment. Its body does not contain a call-shaped arrow. A large action on the first or last lane expands the appropriate panel side.

Retain actual self-calls as loops. Their side label may be longer than the 22-unit loop drop. Row spacing must use the union of path and label bounds, not merely “add 22 after every self-message.”

**Analytical counterexample:** a three-line self-label of height 57 is centered at row+11 and ends at row+39.5. The current next normal row can be row+58. A following 23-high label starts at row+34, overlapping the self-label by **5.5 units**. This is an analytically derived fixture, distinct from the executed baseline probes. The current sequence tests do not cover it.

### 5.5 Vertical algorithm and phase gutters

For each event, compute an envelope relative to its row. Ordinary labels have upper extent labelHeight+4 and lower extent 4 under the proposed four-unit label/shaft gap. A self-loop has:

- upper extent max(4, labelHeight/2−11);
- lower extent max(26, 11+labelHeight/2).

A local action’s upper/lower extents are half its measured box height. Include stroke and arrowhead extent in these calculations; the constants above assume the stated marker envelope.

Inside a phase, position the next row at the larger of previousRow+28 and previousInkBottom+5+nextUpperExtent. Round outward. A self-row at 100 with labelHeight 57 and an ordinary next labelHeight 23 requires the next row at **172**, giving at least five units between label boxes. Using only a fixed pitch does not meet this requirement.

Phases own layout, not just background paint:

- Preserve contiguous source membership; render phases in event order.
- Cap the **text gutter at 96 logical units**, with 12 units of inset on each side, for a 120-unit total gutter. Wrap the title using stored metrics; hard tokens break using the existing word-piece/character fallback. No ellipsis.
- Give phase content eight units of top/bottom padding and **16 units between phases**.
- Phase height is the maximum of its event ink extent plus padding and its wrapped title height plus 16.
- If a long title makes a short phase taller, expand the phase before placing the next one. Do not let the title intrude into an unrelated phase.
- Unphased events remain legal and keep their place; grouping is never inferred from spacing.
- A phase boundary carries no duration or synchronization semantics.

Bottom-align participant headers to a common header baseline. A one-line 32-high and three-line 64-high pair should have y=32 and y=0 respectively, both ending at 64. This avoids making every header tall while keeping lifeline starts aligned. Honor explicit author sizes and surface real overflow. Compact padding is a sequence-specific default; do not globally shrink ordinary graph nodes.

### 5.6 Panel bounds, paint, and deterministic parity

Measure the complete figure: participant labels, group titles, event labels, actions, loop paths, arrowheads, phase headings, scope, title, legend and explanatory footer. The inner sequence panel must contain its own sequence ink plus 20 units of padding; the outer frame also contains explanatory chrome. For zero participants and no groups, retain source layout intent and omit derived sequence geometry, reusing the existing finite empty-document bounds. Empty declared participant groups receive an actionable error. Never pass an empty member set into min/max. The plan specifies the existing rectUnion empty fallback rather than adding another empty-state renderer. [B23]

Reuse stored advance widths and wrapping. Do not measure the DOM to determine layout. Actual font-render checks remain useful for verifying that the stored metrics match bundled font assets. Theme changes may need local spacing when metrics change, but must preserve authored order; do not overpromise immutable coordinates across different typefaces.

Create one narrow sequence geometry/paint helper, shared by CLI and Solid. It should decide route/action bounds, dash, marker, label lines, stroke width, phase text and neutral-header treatment. It is not a generic rendering framework. Current sequenceBackdrop is already shared by importing CLI markup into TSX, while edge markers/widths and participant strokes have small duplicate differences. Persistent paint must agree; selection handles and hit targets may remain UI-only. [B7], [B18]

## 6. Reading size and mobile exploration

At a 1000-pixel display width, the actual baseline’s 12.5-unit message type scales to about **16.9 px** (12.5×1000/741). At 900 it is 15.2 px, and at 1100 it is 18.6 px. Thus the baseline is not intrinsically unreadable merely because its attached raster is 1482 pixels wide. Its avoidable cost is the 56-unit header height, unstructured sequence, ambiguous self-label and absent scope.

The checked current-language alternative is **834 × 581 logical units**, rasterized to **1668 × 1162**. Its unchanged 12.5-unit message type becomes **14.99 px at 1000 px**, **13.49 px at 900**, and **16.49 px at 1100**. It uses a short subtitle plus a visible scope/timing/notation note, explicit wrapping of the self-loop label, and a store-width workaround. It improves framing and phases today, but its greater width demonstrates why a better authored example alone does not solve layout.

The engineering proposal is authored at **1000×766**, with 17-pixel message labels and 40-pixel headers. At 900 display width, message type is 15.3 px; at 1100, 18.7 px. These are design targets for a proof, not a universal minimum font standard. The proposal spends some space on scope, phases and a key rather than claiming that every improvement reduces total area.

The 1000-wide drawing scaled to a 390-pixel phone would make 17-pixel type about 6.6 pixels. That is not an acceptable exploration design. Explore horizontal navigation at readable scale, a sticky participant strip, and a focus detail that names both endpoints when one is offscreen. Keep a full-diagram overview or breadcrumb to show where the current row belongs. An SVG export must remain understandable without that interface.

Target-width diagnostics should report effective text size at the chosen display width and the event or title causing expansion. They should offer local wrapping, a shorter authored label, an overview, or a separate scenario. Do not silently reduce type, reorder participants, fold a sequence into an ambiguous multirow lane layout, or truncate the meaningful part of a message.

## 7. What established work contributes

These are current official documentation and original-paper checks, not hands-on benchmarks of competing tools. The conclusions in the “apply” column are design judgments.

| Primary source | Verified capability or result | Apply to Draftably |
| --- | --- | --- |
| Mermaid sequence documentation and configuration [S1], [S2] | Explicit participant order, notes, alternative/parallel blocks, and separately specified shaft/async-arrow forms. Wrapping is configurable; the configuration documents wrap as false by default. | Keep authored order and explicit meaning. Offer a good measured default instead of exposing a large settings catalog. Do not infer reply from dotted styling. |
| PlantUML sequence documentation [S3] | Editorial dividers, multiline/wrapped labels, grouped interactions, and return targeting the most recent activation. Teoz has separate parallel placement and message-span controls. | Adopt plain editorial phase separators. Use explicit response IDs instead of making an activation stack the only pairing mechanism. Avoid copying every fragment or actor shape. |
| D2 sequence documentation [S4] | Ordinary object/connection syntax gains sequence-specific scope and declaration-order rules; it supports groups, notes and self-messages. | Reusing graph primitives is viable. A group’s title still does not prove execution semantics. |
| C4 dynamic guidance [S5] | Selective dynamic diagrams can use sequence or free-form collaboration presentation with numbered interactions. | Choose the view for the question. Do not require a sequence for every feature. |
| OMG UML 2.5.1 [S6] | §17.4 distinguishes async arrows, replies and event-occurrence ordering; §17.6 distinguishes weak, strict and parallel composition. Absolute lifeline distances are not semantic durations. | Be precise about the smaller narrative contract. Phase bands are not execution operators, and a lower row is not a global completion barrier. |

The UML check used the official normative PDF, including printed pp 572–577 and 583–584. Its web reader failed on the large PDF, so relevant clauses were read from the downloaded official document. In particular, formal event ordering is richer than a list of message rows. The recommended small model deliberately does not claim full UML conformance.

### 7.1 Verify the note’s studies, and limit their claims

**Nickerson and Corter, 2009 [S7].** The original author-hosted paper confirms the note’s figures: **6/28 versus 17/25** correct. Fifty-three participants were randomly assigned one of two orders of a five-component sequence, then answered a topology-partition multiple-choice question; the reported comparison was χ²(1)=11.662, p<.001. This supports treating lane order as consequential for that task. It does not establish universal comprehension gains, faster reading, benefits of dynamic reordering, or a need to change this already-adjacent four-role example.

**Sharp and Rountev, 2005 [S8].** The original six-page paper explains how zoom can lose endpoints or fragment boundaries, and presents filtering, fragment placeholders and contextual views. Its experience section concerns the authors’ exploration of about 200 reverse-engineered Java-library diagrams. It is **not a controlled participant comprehension study**, and the paper leaves quantifying feature benefits to future experiments. It motivates preserving context; it does not prove that this proposed mobile or collapse design works.

**Kutar, Britton and Barker, 2002 [S9].** Their original study used 124 first-year computing students across six scenarios. It found no significant accuracy effect for sequence versus collaboration diagram type (p=.72), while scenario mattered (p<.001). This is a useful restraint on universal diagram rankings, not a direct evaluation of Draftably or the present layout.

No study was found that establishes 900–1100 pixels as an optimal standard, proves that three phases automatically reduce cognitive load, or validates these mockups. Those are testable design choices.

### 7.2 Focus, collapse, and comparison

Named emphasis states and static state exports already exist. Build response-aware focus by using explicit pairing and including the selected event’s endpoints; preserve all lane positions. A visible caption states the focus. Unrelated context may dim but should remain legible enough to trace the surrounding story. Selection must not silently invent a reply link. [B7], [B19]

For a collapse prototype, leave a visible replacement band such as **“Verify ·3 events hidden (m3–m5)”**, retain original event numbering 1, 2, 6, 7, and identify the involved participants and hidden fact labels. The summary box is not a message. A named view may later persist collapse intent for export; temporary exploration should remain separate from semantic edits. Never route a synthetic direct arrow through a collapsed phase as if it were a real interaction.

Stable order and stable coordinates are different promises. Independent files with the same lane order can have different x coordinates because their labels differ. Exact companion alignment requires shared measured horizontal constraints or intentionally authored common geometry. The supplied mockups deliberately share lane centers 230, 450, 670, 880. A generalized cross-file view-inheritance system is unnecessary for the first implementation.

### 7.3 When another diagram better serves the reader

These are task-specific design recommendations, not claims that one notation universally outperforms another. C4 explicitly treats dynamic views as selective aids to explaining particular interactions. [S5]

| Reader's question | Prefer | What the sequence would obscure |
| --- | --- | --- |
| Which components depend on which others? | A dependency/component view or a numbered collaboration view. | Repeated time rows can hide the topology the reader needs. |
| What are the three main responsibilities in this story? | The brief three-section overview. | Detailed send/return tracing adds work when only the takeaway matters. |
| Which outcomes follow each condition? | A decision table, or a small explicit branching flow. | A success-only sequence does not establish coverage of errors or combinations. |
| Which states may this entity enter? | A state machine with named transitions. | Message exchanges alone do not define legal lifecycle states. |
| Where is measured latency spent? | An instrumented trace or timing view with real timestamps and units. | Narrative vertical distance has no duration semantics. |
| Who sends what, in which authored order? | The engineering sequence. | This is the task the proposed view serves directly. |

## 8. Visual companions and how to read them

The file set has distinct evidence categories:

- **baseline-supplied.png:** the user’s actual render, copied without modification.
- **sign-in-current-language.draft/.svg/.png:** an authored improvement using the supported baseline language; checked and exported by the real baseline CLI. It uses a retained self-loop, an explicit line break, compact padding and an explicit store-width workaround. It is not the original example.
- **sign-in-engineering-proposal.svg/.png:** original manual design study for the recommended semantic presentation, with all seven facts.
- **sign-in-overview-proposal.svg/.png, sign-in-failure-companion-proposal.svg/.png, sequence-collapse-proposal.svg/.png:** original companion studies. Collapse is an Explore item.
- **sign-in-proposed-language.draft:** clearly marked future syntax; not compiled.
- **visual-spec.json:** exact mockup geometry and text bounds; not a golden output of an implemented renderer.

The engineering view visibly says valid credentials/error paths omitted and order rather than elapsed time. The User lane is explicitly abstract. It makes the hash-check owner clear while retaining user record and session token. The final result remains Web app → User.

The brief overview retains all seven facts in three prose cards. It is useful when the question is “what are the three major things happening?” Its intentionally reduced visual notation does not claim protocol details.

The failure companion is deliberately **hypothetical**. It reuses the success prefix as an illustrative assumption, marks failure at the hash check as a scenario assumption, and shows unknown continuation for the auth response and user-facing result. The supplied source does not establish those facts. Inventing a 401, a generic error message, a retry, or token suppression would make the comparison look complete without evidence. A verified failure companion should replace the unknowns after implementation evidence is supplied. The visual still proves that the same participant positions can be maintained.

The manual engineering/failure/collapse studies share exact centers and measured text boxes, but they are not production geometry goldens: for example, their header-to-panel-top gap is 14 display pixels, while M2 proposes 20 native units of inner ink padding. Their 17-pixel labels and 40-pixel headers are presentation choices; the implementation fixtures specify native geometry separately. The proposed SVGs embed the supplied project’s Inter fonts and have accessible title/description elements. Their PNGs are standard SVG rasterizations. They are inspectable design artifacts, not screenshots of implemented future functionality.

## 9. Proof corpus and reader questions

sequence-fixtures.json contains exact baseline cases and proposed expected values, with execution status per fixture. The meaningful corpus is small but adversarial:

1. Original seven-event sign-in.
2. Adjacent long label.
3. Distant long label with valid small participants.
4. Self-message beside another lane.
5. Rightmost self-message and panel containment.
6. Tall multiline self-message before another labeled event.
7. Noncontiguous/interleaved phases.
8. Deleting a phased edge or participant.
9. Valid hierarchical root/group ordering.
10. Multiline participant headers.
11. Long phase title beside a short phase.
12. Label-slot selection where an off-center gap already fits.
13. Explicit async send followed by unrelated work.
14. Explicit paired responses, including non-stack order and invalid endpoints.
15. Theme change and source undo with scope/notes/states.
16. Honest phase collapse and exported hidden-event counts.

Geometry invariants:

- Every required center distance holds after rounding.
- An event label belongs to its own event and does not cross another lane under the selected policy.
- Self and action extents fit both their row envelope and the inner panel.
- Phase memberships are disjoint contiguous intervals; their text and event ink fit their band.
- Headers share a bottom line; measured multiline titles fit without truncation.
- All visible ink, markers and explanatory text fit the export bounds.
- Equal source plus equal font/theme context produces equal geometry in CLI and editor.
- Focus does not change geometry; collapsed views preserve horizontal geometry.
- Source edits preserve identities, explicit meanings, comments and all unrelated content.
- No visual form alone claims duration, durable persistence or unverified failure behavior.

Reader questions and expected answers:

| Question | Expected answer |
| --- | --- |
| Who checks the password hash? | Auth service. |
| What does User store return? | A user record. |
| What returns to Web app? | A session token; storage/format is unspecified. |
| Does the User directly receive that token here? | The figure only says Web app presents a signed-in outcome to User. |
| Does this cover all sign-in failures? | No; the scope is successful credentials, with omitted errors. |
| Is the hash check a network round trip? | The proposed action denotes local work; a self-call and local action are distinct authored choices. |
| Can row spacing tell which operation is slow? | No. |
| Does an async send prove the receiver finished? | No. |
| What happens after failure in the companion? | The supplied evidence does not say. |
| How much is hidden by collapsed Verify? | Three events, m3–m5; the summary is not a new message. |

An exploratory review with several readers can record correctness, wrong inferences, time, confidence, and preference. Counterbalance baseline/proposal order and keep the facts/questions fixed. This is product validation, not an outside-demand gate or a promised statistically significant study. Geometry catches clipping; reader answers catch confidently invented semantics.

Likely regressions deserve targeted tests: lost phase references on delete; reply identity lost during normalization; long phase text dominating width; a theme erasing scope; moved lanes on focus; source comments left behind by reorder; label-slot oscillation; a large local action covering the left neighbor; a collapse removing asynchronous caveats; CLI markers differing from Solid; and a long subtitle reducing effective message type despite a compact body.

## 10. Shippable sequence

The separate implementation plan is the worker contract. Its sequence is:

1. **M1—existing correctness:** phase/reference integrity, hierarchical order, endpoint/empty-band validation, actual interval constraints, self envelopes, neutral outline, metadata preservation.
2. **M2—measured explanation layout:** narrow shared sequence geometry/paint helper, compact headers, bounded wrapped phase gutters, clear distant-label slots, complete bounds, CLI/Solid paint parity.
3. **M3—source-owned semantics:** message kinds, explicit reply links, actions, outcomes, scope, event order, normalization, editing and source-history contracts.
4. **M4—explanation workflow:** response-aware named focus, visible used-notation key and scope, accessible description, maintained examples and comparison companions.
5. **M5—bounded exploration:** honest phase collapse and mobile context; optionally one local alternative or parallel-region prototype only after the core model is reliable.

Every product/example/DSL change needs the repository’s changeset and documentation updates. DSL changes also update skills/draftably/SKILL.md. Preserve existing TypeScript/SolidJS/pnpm architecture. Run the targeted suite while iterating, then the documented broader gates before integration. Do not turn a local sequence change into a rewrite of general routing or graph layout.

## 11. Checks performed, limits, and open questions

**Performed:** complete 34-file packet/source-note review; supplied image inspection; exact-ref supplemental reads; archive integrity comparison; frozen dependency install in a temporary pristine checkout; **52 passing tests across sequence, edge-labels, DSL and translation suites**; actual baseline CLI JSON/SVG export; actual current-language companion check/export; exact distant-spacing, valid grouped-order, overlapping-phase and phased-deletion probes; SVG geometry/text-bound checks; rasterization and visual inspection of companions.

**Not performed:** product implementation; future-syntax compilation; full check:fast/check/release gates; live editor interaction; browser/file-session source/undo proof; browser/PNG parity proof; Safari/Firefox/touch testing; accessibility audit; competing-tool execution; reader study; performance benchmark.

The documented pnpm shoot path was attempted. Chromium was absent and the locked Playwright browser download returned invalid/truncated ZIP data. No browser proof was obtained. The PNG companions use **Sharp/libvips SVG rasterization with the project’s bundled fonts**; this is explicitly not a substitute claim of browser parity.

Open questions are narrow and nonblocking:

- The proposed 32-unit native compact-header default and 96-unit phase-text width (120-unit total gutter) need final visual judgment across all themes and longer real titles.
- Are explicit call semantics needed often enough to expose immediately in the inspector, or should they begin in source with a small advanced control? The data model can support them without activation bars.
- Does a task-specific label slot improve long-message reading versus a centered label with interrupted lifelines? The chosen default is the clear slot; retain the alternative only for a focused comparison.
- Which real failure behavior should replace the companion’s unknown continuation? That cannot be established from this success-path source.
- Does the mobile prototype need a sticky participant strip alone, or also an endpoint detail panel? The current evidence motivates testing, not a claimed answer.
- Should saved collapsed views be authored only through named state extensions or through a small dedicated view declaration? Keep this out of the first production grammar.

## 12. File/read inventory

Packet files read in full across the team:

~~~text
AGENTS.md
README.md
package.json
docs/intent/diagram-quality/FEEL.md
docs/intent/diagram-quality/RUBRIC.md
docs/intent/diagram-quality/NEXT.md
docs/ARCHITECTURE.md
docs/CHECKS.md
docs/DSL.md
skills/draftably/SKILL.md
examples/login-sequence.draft
src/dsl/syntax.ts
src/dsl/compile.ts
src/dsl/project.ts
src/dsl/translate.ts
src/model/types.ts
src/model/document.ts
src/model/routes.ts
src/model/labels.ts
src/model/colors.ts
src/model/appearance.ts
src/cli/svg.ts
src/components/scene/Lifelines.tsx
src/components/scene/EdgeView.tsx
src/components/scene/StaticScene.tsx
src/components/scene/NodeView.tsx
src/state/scene.ts
src/state/actions.ts
src/state/debug-api.ts
tests/sequence.test.ts
tests/edge-labels.test.ts
tests/dsl.test.ts
tests/translate.test.ts
docs/intent/sequence-explanations/source-note.md
~~~

Additional exact-baseline source: model/fonts.ts, model/font-metrics.json, model/styles.ts, dsl/frame.ts, dsl/source-edits.ts, model/bounds.ts, model/frame.ts, state/document.ts, state/file-session.ts, cli/edit.ts, dsl/compare.ts, the model/geometry.ts:rectUnion empty fallback, and targeted model.edits/probe and screenshot/build paths used for execution. Full font-metrics data was loaded for measurement; it is data, not a claim that every numeric advance was manually inspected.

## 13. Sources

### Repository sources (fixed baseline)

[B1]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/dsl/compile.ts
[B2]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/labels.ts
[B3]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/routes.ts
[B4]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/dsl/syntax.ts
[B5]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/types.ts
[B6]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/colors.ts
[B7]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/cli/svg.ts
[B8]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/examples/login-sequence.draft
[B9]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/docs/DSL.md
[B10]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/dsl/translate.ts
[B11]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/dsl/source-edits.ts
[B12]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/state/actions.ts
[B13]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/dsl/project.ts
[B14]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/document.ts
[B15]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/state/file-session.ts
[B16]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/bounds.ts
[B17]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/frame.ts
[B18]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/components/scene/EdgeView.tsx
[B19]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/appearance.ts
[B20]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/skills/draftably/SKILL.md
[B21]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/cli/edit.ts
[B22]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/dsl/compare.ts
[B23]: https://github.com/byronwall/draftably/blob/2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4/src/model/geometry.ts

Important symbol/line anchors: compile.ts 203–355; labels.ts 149–178; routes.ts 682–694 and 769–802; syntax.ts 724–749, 1063–1109, 1163–1169; translate.ts 173–209, 272–278, 481–704; types.ts 264–268; document.ts 330–371; actions.ts 365–372; svg.ts 232–255, 361–448; source-edits.ts 83–109; bounds.ts 29–44; frame.ts 37–61; state/document.ts 132–167; file-session.ts 431–478, 600–618. Line ranges refer to the original baseline file, not packet line numbers.

### Current primary documentation and original research

- **S1:** [Mermaid sequence syntax](https://mermaid.js.org/syntax/sequenceDiagram.html).
- **S2:** [Mermaid sequence configuration schema](https://mermaid.js.org/config/schema-docs/config-defs-sequence-diagram-config.html) and [SVG accessibility guidance](https://mermaid.js.org/config/accessibility.html). Accessibility guidance supports adding authored SVG title/description; visible scope is still required.
- **S3:** [PlantUML sequence diagrams](https://plantuml.com/sequence-diagram). Teoz-specific behaviors are identified as such above.
- **S4:** [D2 sequence diagrams](https://d2lang.com/tour/sequence-diagrams/).
- **S5:** [C4 dynamic diagrams](https://c4model.com/diagrams/dynamic).
- **S6:** [OMG UML 2.5.1 specification landing page](https://www.omg.org/spec/UML/2.5.1) and [official normative PDF](https://www.omg.org/spec/UML/2.5.1/PDF), chapter 17, especially §§17.3.3.1, 17.4.3.1, 17.4.3.5, 17.4.4.1, 17.6.3.10–12.
- **S7:** Nickerson, J.V.; Corter, J.E. (2009), [Clarity from Confusion: Using intended interactions to design information systems](https://www.tc.columbia.edu/faculty/jec34/faculty-profile/files/ntendedinteractionstodesigninformationsystems..pdf), AMCIS, especially pp 7–8.
- **S8:** Sharp, R.; Rountev, A. (2005), [Interactive Exploration of UML Sequence Diagrams](https://citeseerx.ist.psu.edu/document?doi=f7309c396b3bc0ff17cd0f8acf30a89e1eef26c2&repid=rep1&type=pdf), especially §§2–4, 6. The original PDF was read after direct web-reader access failed.
- **S9:** Kutar, M.; Britton, C.; Barker, T. (2002), [A Comparison of Empirical Study and Cognitive Dimensions Analysis in the Evaluation of UML Diagrams](https://www.ppig.org/files/2002-PPIG-14th-kutar.pdf), PPIG, §§4–5.

Research PDFs are linked to their original hosts and are not repackaged in the asset ZIP.


[S1]: https://mermaid.js.org/syntax/sequenceDiagram.html
[S2]: https://mermaid.js.org/config/schema-docs/config-defs-sequence-diagram-config.html
[S3]: https://plantuml.com/sequence-diagram
[S4]: https://d2lang.com/tour/sequence-diagrams/
[S5]: https://c4model.com/diagrams/dynamic
[S6]: https://www.omg.org/spec/UML/2.5.1/PDF
[S7]: https://www.tc.columbia.edu/faculty/jec34/faculty-profile/files/ntendedinteractionstodesigninformationsystems..pdf
[S8]: https://citeseerx.ist.psu.edu/document?doi=f7309c396b3bc0ff17cd0f8acf30a89e1eef26c2&repid=rep1&type=pdf
[S9]: https://www.ppig.org/files/2002-PPIG-14th-kutar.pdf
