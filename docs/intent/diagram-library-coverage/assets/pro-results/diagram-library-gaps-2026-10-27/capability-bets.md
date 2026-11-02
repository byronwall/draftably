# Draftably capability bets

**Recommendation:** strengthen the existing source, editor and review contract before widening the notation catalog. Build comparison fidelity, shared relationship/field primitives, bounded sequence depth, and portable annotations/symbols. Explore structural views after their identity and geometry rules can be stated precisely.

This is a Strategy proposal against baseline `2995a98eef31803fa8669a7ada5c8f8892486bb7`, reviewed from the supplied packet. External sources were verified 2026-10-28 UTC / 2026-10-27 America/Indianapolis. Nothing below is implemented by this mission. Proposed `.draft` attributes and statements are **unimplemented design sketches**, not accepted syntax. Current approximations use the reviewed grammar. Competitor examples were checked against current documentation but were not run; the semantic-diff JavaScript also passed a syntax check. No visual or performance benchmark is claimed.

The companion `gap-analysis.md` contains the full 16-tool matrices, primary-source index, all dispositions and baseline file manifest. Evidence keys below use that index; direct primary links are supplied beside competitor examples.

## Ranking and decision rules

Score each dimension from 1–5: **J** concrete job value in the owner’s supplied examples/intent, **B** usefulness across current families, **F** fit with local readable source and deterministic editor/CLI behavior, **L** dependency leverage, **S** clarity of a small shippable slice. The sum is an ordinal decision aid, not a measurement. Cost and quality risk are separate 1–5 judgments, with 5 harder/riskier.

| Rank / stable ID | Score and disposition | Reason and boundary |
| --- | --- | --- |
| 1 / **BET-01** Comparison fidelity | J5 B5 F5 L5 S5 = **25/25**. **Build**. Cost3 / risk3. | Preserve trust in an existing strength and make new fields comparable. Detection and truthful old values are separate tasks. |
| 2 / **BET-02** Relationship ends and field rows | J5 B5 F5 L5 S4 = **24/25**. **Build**. Cost3 / risk3. | Shared meaning for schemas, architecture, class-like structures and interfaces. Avoid a database engine or complete UML metamodel. |
| 3 / **BET-03** Sequence depth | J5 B3 F5 L3 S4 = **20/25**. **Build**. Cost4 / risk4. | Explain alternatives and processing intervals within an existing native layout. Start with bounded fragments. |
| 4 / **BET-04** Portable annotations and symbols | J4 B5 F5 L4 S4 = **22/25**. **Build**. Cost3 / risk4. | Explain intent and recognize common roles without browser-only content. External images remain a separate asset-contract exploration. |
| 5 / **BET-05** Named structural views | J4 B4 F5 L3 S2 = **18/25**. **Explore**. Cost5 / risk5. | Reuse identity across audience views; hidden endpoints, ancestors, pins and aligned comparison make this larger than a filter menu. |

BET-03 precedes BET-04 in strategic rank because it deepens a particularly clear current job. The annotation slice of BET-04 is nevertheless an implementation dependency of BET-03 and can ship first. A one- or two-point difference is not precise enough to override dependencies or a confirmed owner priority.

## BET-01 — Make every comparison claim explicit and version-faithful

**Disposition:** Build. **Gap kind:** workflow correctness and shared model foundation. **Job:** “Show what this system change does, including values and containment, without forcing a reviewer to mentally align two unrelated pictures.”

### Evidence and why it is worth doing

Draftably already matches objects by ID, emits change marks and renders aligned panels. The issue is completeness. `objectKey` currently retains label, parent, color, shade and shape for equality; `edgeKey` retains endpoints, label, dash and sides. `href`, `count`, `span`, `frame`, `fold`, object type, edge `constraint`, and statement-level changes do not have a complete comparison contract. `was` stores the old label only. Moved groups intentionally retain their new parent in both panels, with a warning. A newly added schema field or note property would inherit those blind spots unless comparison is made a design obligation. [DR-07](gap-analysis.md#dr-07), [DR-08](gap-analysis.md#dr-08)

**Inference:** the right abstraction is a semantic/presentation delta plus version-aware data, followed by layout and painting. Adding equality fields is necessary but insufficient: marking a span as changed still does not display the old span in the before panel. This is a focused improvement to existing modules, with unusually high leverage for every later bet.

### Competitor example: a semantic delta independently of rendering

The separate [bpmn-js-differ](https://github.com/bpmn-io/bpmn-js-differ) package distinguishes changed attributes, additions, removals and layout changes. [bpmn-moddle](https://github.com/bpmn-io/bpmn-moddle) parses XML into the model. This is **E**, not native aligned-panel support in bpmn-js. It supplies a useful architectural precedent, not a claim that Draftably should adopt BPMN.

Prerequisites: Node with ESM support, `bpmn-js-differ@3.2.0` and `bpmn-moddle@10.3.1`. Save as `semantic-diff.mjs` and run `node semantic-diff.mjs` after installing those packages in an isolated project.

```js
import { BpmnModdle } from 'bpmn-moddle';
import { diff } from 'bpmn-js-differ';

const before = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  id="Definitions_1" targetNamespace="https://example.test/process">
  <bpmn:process id="Process_1">
    <bpmn:task id="Task_review" name="Review" />
  </bpmn:process>
</bpmn:definitions>`;
const after = before.replace('name="Review"', 'name="Approve"');

async function parse(xml) {
  const { rootElement } = await new BpmnModdle().fromXML(xml);
  return rootElement;
}
const changes = diff(await parse(before), await parse(after));
console.log(JSON.stringify({
  changed: changes._changed.Task_review.attrs.name,
  addedIds: Object.keys(changes._added),
  removedIds: Object.keys(changes._removed),
  layoutChangedIds: Object.keys(changes._layoutChanged)
}, null, 2));
```

Expected, not runtime-verified: old/new name values and empty add/remove/layout arrays. The example has no graphical DI, so it does not test geometry. The official differ README’s malformed loader was corrected using the current moddle API. Package execution was blocked by the environment’s registry connection restriction; only JavaScript syntax was checked.

### Current Draftably approximation / reproducer

Save this as `before.draft` and make `after.draft` by changing only `count=2` to `count=3`:

```text
diagram "Worker fleet" version=1
compare "Before" "After"
node worker "Worker" count=2
layout root row
```

From a complete checkout at the exact baseline, use the reviewed CLI form (an unpinned published package may differ):

```sh
pnpm draftably compare before.draft after.draft --write comparison.draft
pnpm draftably inspect comparison.draft --svg comparison.svg
```

Source inspection predicts no changed mark for this count-only edit: `count` is absent from `objectKey`. Moreover, the merged source retains the new count, so old/new fidelity is not restored by the two-panel frame. A manual `~node` can label a change, but `was` only supplies an old label and cannot express the old count. This is an existing-feature gap, not a missing comparison feature.

### Proposed `.draft` contract

**Proposal: keep the first slice’s syntax unchanged.** The same `compare "Before" "After"` declaration and CLI should either render a faithful comparison or report which differences cannot yet be faithfully represented. There is no user-value case for adding a new arrow grammar or a second comparison command merely to fix field coverage.

```text
# PROPOSED BEHAVIOR; syntax already exists.
# The comparison output must retain both count values or diagnose the limitation.
diagram "Worker fleet" version=1
compare "Before" "After"
```

Any future serialized old/new-value representation remains a Design decision. Prefer a small versioned comparison payload or two explicit source snapshots over a growing list of ad hoc `was-*` attributes. Do not silently make ordinary `.draft` files depend on hidden browser history. Treat semantic, presentation and layout-intent differences separately: `href`/field type and `fold`/routing settings need not have the same visual treatment.

### Small slices, modules and proof

1. **B01.1 — Capability and diff policy.** Enumerate retained model fields and statement types in one reviewable policy. Add detection for current omissions, classify meaning versus presentation, and emit diagnostics where historical painting is incomplete. Main seams: `src/dsl/compare.ts`, `src/dsl/syntax.ts`, `src/cli/main.ts`; extend `tests/compare.test.ts`. No new grammar required.
2. **B01.2 — Faithful values and containment.** Preserve both versions’ values/parents before deriving shared geometry. Keep unchanged identities aligned; define when a changed shape must have two representations. Main seams: comparison IR, `src/model/status.ts`, `src/cli/svg.ts`, `src/dsl/project.ts` and the panel renderer called by SVG. The panel module is referenced but not supplied; inspect it in Codex before implementation.
3. **B01.3 — Make it a language-extension gate.** Every later model field declares its comparison policy. Update `docs/DSL.md`, CLI help, the authoring skill and `checkout-change.draft` so users understand marks, panels and layout comparisons as different operations.

**Proof cases:** already-detected shape/dashed/side changes retain old values; same-ID node→group; count 2→3; hyperlink destination changes with identical label; bit span 4→8; frame box→soft; layout-only fold/constraint changes; group moved with a nested child and external edge; label and parent changed together; unchanged routes retained when feasible; already marked input rejected; source-bearing export/extract retains the comparison payload. A visual before panel must show old content, not just an old heading. Changing source order in a sequence must be recognized as an interaction change even when edge IDs and labels are unchanged.

**Stop condition:** if version-faithful values require redesigning the whole editor, ship the bounded detection/diagnostic slice first. Do not weaken truthful labeling to preserve a perfect-looking alignment claim.

**Immediate next action:** write a field/statement policy table and four minimal failing comparison fixtures against this commit. **Design question:** which changes are semantic versus presentation-only, and what common frame can preserve old values and old group membership without misleading the reader?

## BET-02 — Add relationship endpoints and typed field rows

**Disposition:** Build. **Gap kind:** shared primitives plus ER/class notation depth. **Job:** “Explain what an edge means and which field or interface it joins, without encoding that meaning in prose or arbitrary coordinates.”

### Evidence and value

Draftably already has cell IDs as endpoints, nested groups, automatic routing and source-side hints. That is a strong base. Its one arrowhead, free edge label and plain cell text cannot distinguish association, inheritance, composition or cardinality precisely. [DR-02](gap-analysis.md#dr-02), [DR-06](gap-analysis.md#dr-06), [DR-10](gap-analysis.md#dr-10)

[Mermaid ER](https://mermaid.js.org/syntax/entityRelationshipDiagram.html) supplies types, key markers and cardinality; [D2 SQL tables](https://d2lang.com/tour/sql-tables/) supplies addressable rows, with exact row connections documented for ELK/TALA. [Graphviz ports](https://graphviz.org/doc/info/shapes.html) show that structured attachment can exist without database semantics. These precedents favor a reusable core plus optional small domain roles. A key marker alone still does not identify an FK target or prove a database constraint exists.

### Competitor example

Save as `schema.mmd`; with the official Mermaid CLI installed, run `mmdc -i schema.mmd -o schema.svg`.

```text
erDiagram
  CUSTOMER ||--o{ ORDER : places
  CUSTOMER {
    int id PK
    string email UK
  }
  ORDER {
    int id PK
    int customer_id FK
  }
```

The language separates type, name, key role and multiplicity. This is native notation, not validation of an actual database. The example does not claim that the `FK` marker binds to a particular target column.

### Current Draftably approximation

```text
diagram "Orders schema" version=1
group customers "Customer"
node customer_id "id (PK)" in=customers
node customer_type "int" in=customers
layout customers cells columns=2

group orders "Order"
node order_customer "customer_id (FK)" in=orders
node order_type "int" in=orders
layout orders cells columns=2

edge places customer_id -> order_customer "1 to 0..many"
layout root flow direction=right gap=96
```

This is useful and source-compatible. Key/type/cardinality strings are unvalidated text. Reordering or renaming a field should continue to use its stable ID, not its row index.

### Proposed `.draft` syntax — unimplemented

```text
diagram "Orders schema" version=1
group customers "Customer" role=entity
node customer_id "id" in=customers role=field data-type=int key=pk
layout customers cells columns=1

group orders "Order" role=entity
node order_id "id" in=orders role=field data-type=int key=pk
node order_customer "customer_id" in=orders role=field data-type=int key=fk
layout orders cells columns=1

edge places customer_id -> order_customer "places" source-cardinality=one target-cardinality=zero-or-many
layout root flow direction=right gap=96
```

`role`, `data-type`, `key` and the cardinality attributes are new proposals. A field row would have measured name/type/key regions inside one existing cell node. It would not require manufacturing unstable child IDs for each visible word. The first schema slice should validate legal cardinality values and field containment/references; it should not claim SQL type compatibility, schema migrations or database correctness.

Generic endpoints should be independently useful:

```text
# PROPOSAL: same edge grammar; explicit endpoint attributes.
edge implements service -> contract "implements" end-head=triangle-open
edge owns aggregate -> part "contains" start-head=diamond-filled end-head=none
```

Default `->` behavior must remain unchanged. Semantic cardinality should select its glyphs; contradictory manual marker overrides should produce a diagnostic. Do not let a cosmetic marker silently change relationship semantics.

Named ports are a later optional slice using explicit IDs, not overloaded side strings:

```text
# PROPOSAL: role-specific interface attachment, beyond existing left/right hints.
port request on=api side=left direction=in
edge call client -> api "HTTPS" to-port=request
```

### Small slices, modules and proof

1. **B02.1 — Endpoint vocabulary.** Add a small shared source/target marker set and endpoint labels, with measured marker bounds and route termination. Update `ModelEdge`/parser, model types, `src/model/routes.ts`, SVG and browser rendering, source translation and comparison policy. Start with none, existing arrow, open triangle and diamond; add cardinality markers when semantics are ready.
2. **B02.2 — Stable field rows and cardinality.** Extend cell content metadata and measurement, reusing `src/dsl/cells.ts` and the cells compilation path. Add key/type roles and cardinality validation. Keep generic cells unchanged. Use the billing schema as the acceptance example.
3. **B02.3 — Named ports only with a demonstrated interface job.** Add a port model, ID references, editor selection and explicit source rewriting. Cell IDs already solve some field attachment jobs; do not introduce ports merely to duplicate those IDs.

**Proof cases:** long field name/type; reorder rows without retargeting edges; rename an ID through `mv`; two references to one field; self-reference; row wrap and edge congestion; reversed edge with endpoint semantics; missing port; direction mismatch; selected/collapsed group; old/new key or multiplicity shown faithfully. Check CLI/browser/SVG/PNG geometry and non-color comprehensibility.

**DSL/skill/docs changes:** document endpoint defaults and precedence, field versus generic-cell roles, source editing examples, limitations of key markers, and a migration-free path for existing two-cell schema files. Add small ER and interface examples; avoid claiming complete UML support.

**Main risks:** marker/label collisions, source clutter, field measurement destabilizing surrounding layout, and confusing semantic relations with decorative glyphs. **Dependencies:** BET-01 field policy before new persisted metadata; shared measured text from BET-04 can be reused but is not required for plain field rows.

**Immediate next action:** shape one ER relation and one interface relation with the same endpoint model. **Design question:** should generic endpoint metadata ship first with optional entity/field roles, or does the first schema release need a narrowly validated role model?

## BET-03 — Deepen the existing sequence layout

**Disposition:** Build. **Gap kind:** notation depth. **Job:** “Explain alternative outcomes, repeated work and active processing without making the reader infer them from captions.”

### Evidence and value

The current sequence geometry already handles participants, ordered messages, self calls, participant bands and phase bands. It lacks activations, notes and combined fragments. `kind=async` is a line-style shortcut and the shipped example uses it for replies. Preserve that legacy visual meaning; do not silently reinterpret it as a UML asynchronous call. [DR-02](gap-analysis.md#dr-02), [DR-04](gap-analysis.md#dr-04)

Current phases are not fragments: messages can be assigned to a phase without being contiguous, while compilation draws the band from its first to last row. A phase can therefore visually enclose intervening messages not listed in it. Fragment nesting needs a stronger interval contract than the current phase membership check. This is a Design constraint, not a request to reclassify the native basic sequence capability as absent.

### Competitor example

[Mermaid sequence syntax](https://mermaid.js.org/syntax/sequenceDiagram.html) explicitly supports activation, notes and alternatives. Save as `request.mmd`; run `mmdc -i request.mmd -o request.svg`.

```text
sequenceDiagram
  participant Client
  participant API
  Client->>API: Submit request
  activate API
  Note over Client,API: The request includes an access token
  alt Token accepted
    API-->>Client: 200 OK
  else Token rejected
    API-->>Client: 401 Unauthorized
  end
  deactivate API
```

The diagram expresses branches, a processing interval and attached prose. It does not execute or prove the authentication logic.

### Current Draftably approximation

```text
diagram "Request outcomes" version=1
subtitle "Replies below are alternatives; the band does not encode branching."
node client "Client"
node api "API"
edge request client -> api "submit token"
edge accepted api -> client "if accepted: 200 OK" kind=async
edge rejected api -> client "if rejected: 401" kind=async
phase result "Alternative outcomes (annotation only)" accepted rejected
layout root sequence
```

The current picture places both returns in order and labels the intended interpretation. A phase is a band, not an alternative-path semantic structure. A separate text node would become another participant, so it cannot act as a proper sequence note.

### Proposed `.draft` syntax — unimplemented

```text
diagram "Request outcomes" version=1
node client "Client"
node api "API"
node store "Token store"
edge request client -> api "submit token" message=call
edge lookup api -> store "lookup" message=call
edge accepted store -> api "valid" message=return
edge rejected store -> api "invalid" message=return
edge reply api -> client "reply" message=return

phase result "Token lookup" accepted rejected kind=alt
phase yes "valid token" accepted in=result
phase no "invalid token" rejected in=result
activation work api start=request end=reply
node token_note "Includes an access token" role=note attach=request side=right
layout root sequence
```

This sketches extending `phase` with typed parents/branches rather than a separate block-arrow mini-language. A dedicated fragment declaration is an alternative to evaluate in Design; do not commit to phase overloading without the interval proof. `message`, hierarchical/typed phases, `activation` and attached notes are all new. Stable message IDs define intervals; line numbers do not.

For the first slice, branches must be contiguous and disjoint, nested intervals cannot cross, references must exist, and activations must have ordered boundaries on the correct participant. Plain existing phase bands retain their meaning. New `message=return` and `message=async` must be separate semantics; the old `kind=async` stays a documented dashed-style legacy form until an explicit migration is chosen.

### Small slices, modules and proof

1. **B03.1 — One attached note and one bounded alternative.** Reuse the annotation primitive from BET-04. Permit a flat alternative with named branch ranges; reject crossing/noncontiguous branches. Change parser/IR and `sequenced` layout together with both render paths. Avoid nesting in the initial release.
2. **B03.2 — Loop and activation intervals.** Add one level of nesting and lifeline activation geometry only after message-row allocation remains clear. Source reorder/delete operations must rewrite or diagnose referenced intervals.
3. **B03.3 — Reassess advanced breadth.** Parallel fragments, creation/destruction, lost/found messages and comprehensive UML interaction rules remain Explore/Defer until a concrete diagram needs them.

**Modules:** `src/dsl/syntax.ts`, `src/dsl/compile.ts` sequence path, shared scene/model types, `src/model/routes.ts` message geometry, `src/cli/svg.ts`, source reference helpers and translator. Inspect the actual browser sequence/edge renderer in the repository before modifying it. Extend `tests/sequence.test.ts`, reference-edit tests, comparison tests and an export proof.

**Proof cases:** one success/failure branch; nested retry; self-call during activation; a long note spanning participants; noncontiguous phase members; disjoint ID sets whose row bands overlap; message deletion at an activation boundary; reorder with stable IDs; contradictory legacy/new message styles; compare a branch addition with unchanged participants.

**DSL/skill/docs changes:** rename documentation distinctions to participant bands, phase bands and fragments; explain legacy dashed messages and new semantic message kinds; add one small example showing why a fragment differs from a phase. **Risks:** vertical growth, note collisions, ambiguous nesting, misleading concurrency and fragile source editing. Keep the first proof deliberately small.

**Dependencies:** BET-01 for new statement/delta policies; BET-04 attached-note measurement; endpoint vocabulary from BET-02 where message glyphs require it. **Immediate next action:** define an interval/branch validator for three paper examples before choosing syntax. **Design question:** can phases be extended coherently, or should fragments be a separate explicit declaration while preserving the single line-oriented language?

## BET-04 — Make annotations and symbols portable in source

**Disposition:** Build a bounded core; Explore external assets as REC-07. **Gap kind:** shared primitives and workflow. **Job:** “Put the explanation beside the component and keep it attached, legible and recoverable when another person or agent edits the diagram.”

### Evidence and value

Text nodes, hyperlinks, badges and themes already exist. Browser icons/images exist in the broader editor model but are excluded from `.draft` and rejected by the translator. A useful release must close the whole authoring/export loop, not merely turn on a drawing branch. Existing primitive intent references rich-node work, so this bet should consolidate that effort rather than create a duplicate implementation. [DR-02](gap-analysis.md#dr-02), [DR-10](gap-analysis.md#dr-10), [DR-11](gap-analysis.md#dr-11), [DR-12](gap-analysis.md#dr-12), [DR-15](gap-analysis.md#dr-15)

[D2 text objects](https://d2lang.com/tour/text/) provide Markdown/code/math content and [its icon support](https://d2lang.com/tour/icons/) makes architecture vocabulary concise. [Diagrams’ node catalog](https://diagrams.mingrammer.com/docs/guides/node) demonstrates recognizable provider symbols. The proposed Draftably subset should be much smaller: measured plain/inline text, attached notes, and a few bundled symbols. That scope supports explanation without importing a document-layout engine or maintaining every cloud asset.

### Competitor example

Save as `annotation.d2`; with D2 installed, run `d2 annotation.d2 annotation.svg`.

```text
direction: right
api: Request API
policy: |md
  **Retry policy**

  - Retry temporary failures.
  - Stop after three attempts.
|
api -> policy: operational note {
  style.stroke-dash: 3
}
```

This is a formatted text object connected to its subject. It does not claim a special semantic attachment/placement guarantee. It deliberately avoids remote assets, making the smallest useful content example self-contained.

### Current Draftably approximation

```text
diagram "Retry policy" version=1
node api "Request API"
node policy "Retry temporary failures.\nStop after three attempts." shape=text
edge explanation api -> policy "note" kind=async constraint=false
layout root row gap=64
near policy api side=right gap=64
```

The note is an ordinary node and edge. It may enter graph layout/routing and has no note-specific attachment or source metadata. It is still a valid workaround; calling notes wholly impossible would ignore this utility.

### Proposed `.draft` syntax — unimplemented

```text
diagram "Retry policy" version=1
node api "Request API" icon=service
node policy "**Retry policy**\nRetry temporary failures.\nStop after `3` attempts." role=note attach=api side=right label-format=markdown
layout root flow
```

The proposed initial Markdown subset is inline emphasis/code plus explicit line breaks. Lists, nested blocks, tables and arbitrary HTML are not implied by `label-format`; choose a clear restricted name if the subset would otherwise mislead users. An attached note should have a source ID, stable subject reference, measured dimensions and a defined contribution to container sizing. Its leader should not become a causal graph edge by accident.

The `icon` proposal starts with bundled, versioned IDs such as service/database/person/queue. General images require a separate declaration/resolution design, intrinsic dimensions and a way to embed assets with exported source. A relative local path is insufficient once the SVG is shared elsewhere. Treat “source extracted but image missing” as a portability failure, not a successful round trip.

### Small slices, modules and proof

1. **B04.1 — Anchored plain-text note.** Retain note role/attachment in the model, measure it in the shared compiler, route any leader outside causal flow, and support source editing/export/comparison. This is the prerequisite for sequence notes.
2. **B04.2 — Small measured text subset and bundled icons.** Reuse the same text metrics in CLI/browser. Define icon dimensions and fallback/error behavior. Preserve plain labels and old shapes unchanged.
3. **B04.3 — External asset spike.** Inspect the existing rich-node branch/PR, then prove local image loading, sanitization as appropriate, deterministic sizing, export embedding, extraction and missing-asset errors. Keep general images in Explore until that full loop works.

**Modules:** `src/dsl/syntax.ts`, shared model/scene types, measurement/appearance modules called by compile, `src/dsl/compile.ts`, route/annotation geometry, `src/dsl/translate.ts`, `src/cli/svg.ts`, `src/state/files.ts` and file-session source embedding. The font/label renderer internals are not in the packet; Codex must inspect them before fixing the implementation seam.

**Proof cases:** move/reparent/delete the subject; note attached to a group or message; long text in a narrow layout; no causal edge introduced; dark/light and monochrome output; keyboard focus and descriptive export; source edit/undo/reopen; exported SVG opened without network; source extracted into a clean folder; missing or changed asset; comparison of note content and attachment. No browser-only DOM measurement may alter canonical geometry.

**DSL/skill/docs changes:** document the exact text subset, attachment semantics, source-safe asset types, offline behavior, extraction behavior and unsupported content. Add one architecture note example and one sequence note. **Risks:** nondeterministic fonts/asset dimensions, oversized note boxes, hidden network dependency, export differences and source bloat.

**Dependencies:** BET-01 policies; no need to wait for named views or full ER. **Immediate next action:** inspect the referenced rich-node work and agree on one plain attached note as the smallest shared slice. **Design question:** what content can the shared measurement pipeline support exactly, and what must an image export carry so recovery really reconstructs the diagram?

## BET-05 — Explore named structural views of one model

**Disposition:** Explore. **Gap kind:** workflow and architecture breadth. **Job:** “Explain the same system to different readers without copying objects or losing their identity across edits.”

### Evidence and value

Draftably’s emphasis states are already useful: they change attention while preserving geometry. They do not hide structure or define architecture views, and the parser rejects `view`. Copying files can create separate diagrams but requires manual synchronization. [DR-02](gap-analysis.md#dr-02), [DR-09](gap-analysis.md#dr-09)

[Structurizr filtered views](https://docs.structurizr.com/dsl/cookbook/filtered-view/) show a genuine shared model with named projections. [yFiles folding](https://docs.yworks.com/yfiles-html/dguide/folding/) distinguishes master and view graphs and explicitly maps projected endpoints. [D2 scenarios](https://d2lang.com/tour/scenarios/) show inherited variants, which are different from a semantic before/after report. These are architectural references, not a request to adopt their runtimes.

### Competitor example

Save as `workspace.dsl` in a dedicated directory. With Docker installed, the current [local quickstart](https://docs.structurizr.com/local/quickstart) uses `docker run -it --rm -p 8080:8080 -v /absolute/path/to/workspace-directory:/usr/local/structurizr structurizr/structurizr local`; replace the host path with that directory and open `http://localhost:8080`. The official Structurizr playground can also render the DSL. The model is declared once, with two filtered projections. The complete filter is explicit because Structurizr hides the base view from the selectable list after filters are created.

```text
workspace {
  model {
    customer = person "Customer"
    checkout = softwareSystem "Checkout"
    payments = softwareSystem "Payments" {
      tags "External"
    }
    customer -> checkout "Places order"
    checkout -> payments "Charges card"
  }
  views {
    systemLandscape "base" {
      include *
      autoLayout lr
    }
    filtered "base" exclude "External" "internal"
    filtered "base" include "Element,Relationship" "complete"
  }
}
```

The comparison is about identity and projection. It does not prove that a visual edit rewrites the DSL; Structurizr’s visual layout is saved separately in workspace JSON.

### Current Draftably approximation

```text
diagram "Checkout views" version=1
node customer "Customer"
node checkout "Checkout"
node payments "Payments"
edge order customer -> checkout "places order"
edge charge checkout -> payments "charges card"
state internal "Internal focus" customer checkout order
state complete "Complete" customer checkout payments order charge
layout root flow
```

`inspect --states` can present aligned emphasis panels, but Payments remains context in the internal focus. This is not a structural omission. Separate files can hide it, but duplicate model content.

### Proposed `.draft` syntax — unimplemented

```text
diagram "Checkout views" version=1
node customer "Customer"
node checkout "Checkout"
node payments "Payments"
edge order customer -> checkout "places order"
edge charge checkout -> payments "charges card"

view internal "Internal" include=customer,checkout edges=induced layout=shared
view complete "Complete" include=all edges=induced layout=shared
layout root flow
```

This sketches a small ID-based projection before a predicate language. `edges=induced` means retain only edges with both endpoints present; excluded relationships should be disclosed in view metadata/diagnostics where omission could mislead. `layout=shared` means derive positions from the full model; it may leave gaps. It does not promise compactness. An eventual compact option would intentionally recompute layout and must not be confused with aligned comparison.

For nesting, Design must define ancestor closure and whether selecting a group includes its descendants. For ports, notes and cells, inclusion must preserve the required owner or produce a diagnostic. A hidden object still exists in the master model. Deletion from the model and exclusion from a view are different edits.

### Exploration stages, modules and proof

1. **B05.1 — Projection contract on paper and fixtures.** Define selected IDs, ancestor closure, boundary edges, attachment ownership, view identity and geometry policy. Use one flat model and one nested architecture model. No public grammar yet.
2. **B05.2 — Read-only export spike.** Derive views from one compiled model with stable master IDs. Compare a shared-layout projection with a compact layout. Keep source editing in the master view. Check how existing emphasis and compare panels interact.
3. **B05.3 — Commit only after the proof.** If the source/export/user mental model holds, add explicit source view declarations and selection UI. Includes, reusable multi-file models, tag queries, interactive folding persistence and a C4 type system remain separate decisions.

**Likely seams:** `src/dsl/syntax.ts`, a pure projection layer adjacent to `src/dsl/project.ts`, `src/cli/main.ts`, `src/cli/svg.ts`, source reference editing and eventual UI selection state. Keep semantic master data separate from visibility. Do not make filtered browser state the canonical model.

**Proof cases:** A→B→C with B hidden never invents A→C; hidden edge endpoint; selected child with excluded ancestor; omitted group with visible descendant; note/port whose owner is absent; deleted selected ID; renamed view; pinned hidden node; expanded/collapsed group; two views sharing a field ID; compare across versions with view membership changes. Inspect whether a compact view can misleadingly resemble a semantic deletion.

**DSL/skill/docs changes if promoted:** define view closure and geometry before documenting convenience examples; teach agents when to use emphasis versus structural projection; state which edit modes are permitted; preserve existing `state` semantics. **Risks:** hidden relationships, inconsistent IDs, duplicate layout ownership, complicated compare semantics and premature multi-file composition.

**Dependencies:** BET-01 identity/history contract and BET-02 endpoint ownership. BET-04 notes add a useful attachment test. **Immediate next action:** produce two fixture views with explicit inclusion and edge rules, then assess whether the owner needs pruning or simply stronger emphasis. **Design question:** preserve the full model’s positions, compact each view, or expose both as deliberately different modes?

## Delivery gates and scope boundaries

The first implementation plan should name **one** shippable slice, not start all five bets at once. Every slice should carry parser/model, measurement/rendering, visual-source translation, comparison policy and documentation together where applicable. Use the repository’s `docs/CHECKS.md` gates and visual proofs when Codex integrates the work; their historical descriptions are not test results from this research.

- **Gate A:** no silently dropped authored semantics, and diagnostics distinguish unsupported from invalid.
- **Gate B:** repeat compilation and CLI/browser geometry agree on the same explicit inputs; changed-input stability is evaluated separately.
- **Gate C:** a meaningful edit proof exercises rename, reorder, move, delete, undo, external source edit and reopen for the new construct.
- **Gate D:** SVG/PNG and embedded-source recovery preserve meaning; accessible descriptions and non-color signals are checked for the affected primitive.
- **Gate E:** docs and the authoring skill state native support, approximation and deliberate limits accurately. Existing examples remain valid unless a migration is explicitly designed.

These are proposed acceptance criteria for consequential new semantics, not newly executed tests or a request for an enterprise quality process.

## Defer and avoid

Keep full BPMN, comprehensive UML/statecharts, Gantt/timing scheduling, broad journey/requirements/board semantics and general charts deferred. Explore lightweight state markers, local images, small reuse mechanisms and PDF only when a concrete job justifies them. Avoid a runtime/framework rewrite, arbitrary embedded HTML/JavaScript, repository-analysis/collaboration backends, and import compatibility as prerequisites. The detailed stable REC-06–REC-21 dispositions and reasons are in `gap-analysis.md`.

**Access status:** exact packet baseline available and sufficient for this Strategy review. **Facts checked:** all 77 supplied files plus current primary sources for exactly 15 alternatives. **Proposals:** the five ranked bets, scores, syntax sketches, stages and acceptance proofs. **Outstanding decisions:** diff field policy/history representation, generic versus schema-specific endpoint roles, sequence interval grammar, portable content contract and view geometry. Codex owns repository integration and implementation.

