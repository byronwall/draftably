# draftably — prioritized fixes

**Audit date:** 30 October 2026 UTC. **Published target:** <https://byronwall.github.io/draftably/>. **Repository baseline:** [`ca96d3babd05041aaa206509090d023b02b61b5b`](https://github.com/byronwall/draftably/tree/ca96d3babd05041aaa206509090d023b02b61b5b).

**Status: review and proposal only.** No implementation, commit, push, deployment, or repository modification was performed. Build means recommended work for a future plan; it is not authorization to implement. Source and deployed-build equality remain unverified. Detailed browser sequences, starting states, screenshots, and limits are in [usability-audit.md](usability-audit.md); implementation sequencing belongs in [repair-plan.md](repair-plan.md).


**Late access update (~03:15 UTC):** During final verification, reloading the GitHub Pages Playground and landing routes redirected this browser to `draftably.dev`, where an upstream connection timeout prevented further validation. The observations below describe the earlier tested session; the current deployment has not been revalidated. See [E51](evidence/E51-late-redirect-timeout.jpg), [E52](evidence/E52-late-landing-redirect-timeout.jpg), and [session notes](evidence/session-notes.md). This is an access limit, not a claim of permanent outage or proof of the earlier failures' cause.

**Before implementation:** Reproduce the prioritized failures against the active deployment and record any already-resolved IDs. The fixed source baseline and earlier browser receipts remain the basis of this review; a new origin is not assumed to share identical behavior.


## Priority decision

Repair the paths between surfaces and the meaning of retained work first. draftably can render, teach, visually edit, and reopen a useful diagram. The audit successfully carried a three-node, two-edge source diagram through Editor SVG export and back through the landing import into Playground. That working path is worth preserving. It coexists with four primary failures: ordinary Editor links can leave the wrong surface displayed; Playground transfers can become blank; New from an example makes a false saving promise and loses new work on refresh; and an error-state SVG can combine a previous drawing with invalid current source.

Treat those as release-blocking repairs for the advertised journey. Make small keyboard and focus fixes alongside them. Publish browser-first teaching after the behavior it describes is dependable. Explore broad Editor reorganization with concrete tasks; do not hide useful layout capabilities merely because there are many controls.

The audit does not establish frequency across all visitors, devices, or sessions. Reach below describes which tasks and users encounter the affected surface, not a measured percentage. Desktop interactions were tested; **390px and 768px layout were not interactively verified**. F08 remains a source-informed validation item. No user study, screen-reader certification, or WCAG conformance assessment is claimed.

## How to read this register

Severity follows the brief: **P0** unsafe or total failure; **P1** primary journey blocked; **P2** recurring friction or exclusion; **P3** local friction; **P4** refinement. No P0 is assigned. A workaround does not erase a P1 when ordinary, advertised behavior fails.

Evidence labels remain separate: **Observed** means the interaction or artifact was tested; **Heuristic** means a product judgment; **Inferred** means a proposed explanation supported by source or related evidence; **Proposed** means future behavior. Effort is relative: **S** a localized change and regression check; **M** several connected modules or states; **L** a persistence/format policy change needing migration decisions. These are planning estimates, not promised durations.

| ID | Problem | Severity | Disposition | Reach | Effort |
| --- | --- | --- | --- | --- | --- |
| F01 | Ordinary site → Editor links show Landing at an Editor address | P1 | Build | Main entry and example continuation | S–M |
| F02 | Playground transfer intermittently ends in a blank surface | P1 | Build | Docs navigation and learning continuation | M; cause unresolved |
| F03 | New from an example promises saving but loses work on refresh | P1 | Build | Example-led creation and return visits | M–L |
| F04 | Error-state SVG contains mismatched picture and source revisions | P1 | Build | Editable export and later reopening | M |
| F05 | Landing continuation targets the original example after editing | P2 | Build | Visitors who customize the live demo | S–M |
| F06 | Docs Search and Zoom allow focus behind their overlays | P2 | Build | Keyboard navigation and documentation use | S–M |
| F07 | Editor Space shortcut intercepts native button activation | P2 | Build | Keyboard users at core Editor controls | S |
| F08 | Responsive cascade may collapse Playground source into a tiny track | Provisional P2 | Explore, then Build if confirmed | Narrow-screen authoring; not live-tested | S–M |
| F09 | Save, storage, and editable formats have different mode contracts | P2 | Build in bounded slices | All users retaining or moving work | M–L |
| F10 | Get started teaches installation before the browser journey | P2 | Build after behavioral repairs | First-time learners | M |
| F11 | Search has no useful answer for “reopen” | P3 | Build | Returning users seeking retention help | S |
| F12 | Advanced layout tools need clearer entry, scope, and reversibility | P2 heuristic | Explore; Build local explanations | Novices and occasional Editor users | M |
| F13 | Expanded docs preview drops the stale/error context | P3 | Build | Learners expanding a preview during errors | S |
| F14 | Undo restores the prior diagram but leaves the new example label | P3 | Build | Playground users comparing examples | S |

F15 remains reserved for uncertain clipboard feedback. It is not promoted to a ranked finding: incomplete checks must not become failure claims.

## A. Primary journey blockers

### F01 — Make ordinary Editor links load the Editor document

**Evidence and reach.** Observed on the desktop landing page: the main Editor CTA and example continuation changed the address into `/draftably/app/` or its example URL while Landing remained visible. Loading the same Editor destination directly worked. A third ordinary-CTA failure was reproduced from a fresh landing tab; reloading the changed address then loaded Editor. See [E03](evidence/E03-editor-link-still-landing.jpg), [E05](evidence/E05-main-editor-cta-still-landing.jpg), [E04](evidence/E04-editor-direct-checkout.jpg), and the audit's E40–E41 repeat record. This affects the main advertised entry. Do not infer every link location was independently tested.

**Disposition: Build.** The address and visible product must agree before improving onboarding copy. Source establishes separate site and Editor builds. The public router has a wildcard Landing route, while app links are ordinary anchors. This is consistent with interception at the document boundary, but deployed-cause equality is still an inference. See [`site/main.tsx`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/main.tsx#L10), `site/SiteNav.tsx`, `site/draw.ts`, and the landing/demo callers.

**Proposed fix.** Centralize an Editor link that deliberately loads the separate document. Keep site-internal navigation under the site router. Verify the installed router's supported opt-out before implementation. Do not make all navigation open new tabs or add another Landing fallback for `/app/`.

**Acceptance.** Ordinary pointer activation and keyboard Enter on main CTA, nav Editor, hero continuation, and gallery card show Editor with the correct identity. Direct entry and reload agree. Back returns to the origin without a misleading URL/content pair. Test the complete built artifact at `/draftably/` and the supported root base. The regression must click real links; direct navigation alone would miss this bug.

**Effort/risk:** S–M. The code change may be small; risk is history, base-path, and anchor regression. Keep F05 source preservation as a separate check.

### F02 — Give Playground transfers a dependable destination and recoverable load failure

**Evidence and reach.** Two entries from Docs into Playground failed with blank content and different missing hashed-module errors: navigation failed on `Playground-D4RxsDWh.js` [E07](evidence/E07-playground-initial.jpg), and the edited-example continuation failed on `Playground-BU2uUc6A.js` [E20](evidence/E20-docs-transfer-blank.jpg), with [console evidence](evidence/E20-docs-transfer-console.json). The later landing SVG import succeeded; E30 is a success record, not a failed-reopen receipt. This is **intermittent or path/session-dependent**, not evidence that Playground is globally unavailable. Direct loading also provided a recovery route in the audit.

**Disposition: Build.** Diagnose the delivery boundary and provide a useful failure surface. [`site/main.tsx`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/main.tsx#L10) lazy-loads Playground; build and route-output seams include `vite.site.config.ts`, `scripts/site-pages.ts`, and deployment assembly. Missing modules alone do not establish whether stale HTML, asset retention, base paths, caching, or another delivery issue caused the failures.

**Proposed fix.** Inspect the failing artifact references and assembled output. Add a bounded load-error view with Retry/Reload and a way to preserve incoming source. Recovery must not silently replace the learner's edited example with the default. Correct the demonstrated delivery defect once identified.

**Acceptance.** Repeat Docs → Playground and landing import → Playground in fresh and already-open sessions, with trailing-slash variants and Back/Forward. Both the destination and current source must appear. Simulate an unavailable lazy asset: show an understandable failure, preserve source, and recover on retry. Test the deployed artifact rather than only a development server.

**Effort/risk:** M, with diagnosis uncertainty. Avoid an unconditional reload loop or a broad cache purge that merely hides the failing state.

### F03 — Make New from an example establish a real new-document session

**Evidence and reach.** One tested sequence from Checkout used File → New diagram → Blank diagram. Its confirmation stated that the current diagram was saved in this browser and Undo could restore it. Accepting left a blank document under the Example Checkout context; after the audit rename and refresh, original Checkout returned. See [E27](evidence/E27-example-new-misleading-save-prompt.jpg), [E28](evidence/E28-new-remains-example.jpg), and [E29](evidence/E29-new-diagram-refresh-resets.jpg). This is an observed-once failure in a core creation path, not a claim of universal autosave failure. The detailed audit should retain the timing of the Undo check.

**Disposition: Build.** Fix the session transition and false promise together. [`actions.newDocument()`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/src/state/actions.ts#L561) supplies unconditional browser-save copy. `StartScreen.tsx`107–113 invokes it while the source session remains active. `file-session.begin()`629–641 disables browser storage and installs source history; the example URL remains the refresh instruction.

**Proposed fix.** A single transition must own document identity, URL, persistence, and history. Finish pending edits, offer truthful handling of the unsaved example, preserve the independent prior browser draft, end/invalidate the source session, create the new document, and show the actual storage result. Calling `closeFileSession()` alone is insufficient: it clears handlers but does not reverse `document.ts`242–243's storage disablement.

**Acceptance.** Example → New → edit → refresh retains the new diagram under the promised mode. Checkout identity is gone. Cancel preserves the example. The previous browser draft remains recoverable. Download/reopen and Undo match their labels. Cover both existing and empty browser storage.

**Effort/risk:** M–L. The single browser slot makes accidental replacement the main risk. A truthful new scratch session is an interim mitigation, not a complete durable-save repair.

### F04 — Export an image and editable source from the same successful revision

**Evidence and reach.** In Playground, an invalid edit retained the last valid drawing. Download remained available, and the inspected [exported SVG](evidence/invalid-source-export.svg) paired that previous image with invalid current source. See [E11](evidence/E11-playground-invalid.jpg) and [E12](evidence/E12-invalid-export-menu.jpg). This breaks an editable artifact's core promise. The tested artifact was SVG; PNG and rapid edit/export timing remain additional validation cases, not observed failures.

**Disposition: Build.** Preserve last-valid preview behavior while removing the inconsistent export. [`Playground.tsx`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/play/Playground.tsx#L118) retains SVG after errors; Download checks SVG existence, and SVG/PNG actions combine it with current `source()` at lines 320–332.

**Proposed fix.** Store a successful render as one versioned object containing source, SVG, and revision. Image export should use a successful current revision, or explicitly offer the last valid revision with its matching source. Keep raw `.draft` download available so invalid work can still be retained. Distinguish “Download current source” from “Export last valid drawing” when those differ.

**Acceptance.** Valid export/reopen reproduces both text and picture. After an invalid edit, no ordinary image export silently mixes revisions. Rapid edit → Download during compilation has the same guarantee. If last-valid export is offered, its filename/status explains the revision and reopening restores that valid source. Test SVG and PNG separately. Preserve the successful three-node/two-edge source SVG round trip already demonstrated in [E31](evidence/E31-reopened-svg-source-and-preview.jpg).

**Effort/risk:** M. The main risk is disabling recovery downloads or introducing an async race while correcting the mismatch.

## B. Focused fixes that can ship independently

### F05 — Preserve the edited landing source during continuation

**Evidence and reach.** The audit changed Web app to Audit portal on Landing [E02](evidence/E02-landing-label-edited.jpg), while the continuation target remained `?example=checkout`. A fresh repeat changed the label to Audit second portal, clicked the CTA, encountered F01, and then reloaded the changed address. Editor opened stock Web app; the edited label was gone. Thus handoff loss is **observed in the reload recovery path**, while ordinary uninterrupted continuation remains blocked. See the audit's E40–E41 repeat record and the earlier direct-target [E04](evidence/E04-editor-direct-checkout.jpg).

**Disposition: Build.** Fix alongside routing, with separate acceptance. [`LiveEditor.tsx`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/live/LiveEditor.tsx#L14) owns mutable source, but its continuation at line 68 passes only the example ID. Playground already has a current-source encoded handoff at lines 227–229.

**Proposed fix.** Reuse a shared current-source transfer contract. Pristine examples may keep compact ID links; edited examples must carry the actual text. Preserve comments and source identifiers. The CTA should tell visitors whether they are continuing visually or in the source Playground.

**Acceptance.** After F01 is repaired, change a unique label, add a node/edge, and continue by ordinary click. Editor, downloaded source, and reopened diagram retain all changes. Repeat from docs and Playground. Invalid source requires an explicit recoverable state rather than silent substitution with the original example.

**Effort/risk:** S–M. Encoding and navigation are already present elsewhere. Risk lies in async encoding, very large source, and accidentally changing the compact pristine-example path.

### F06 — Keep docs overlay focus within the visible task

**Evidence and reach.** Search Shift+Tab moved to the underlay Edit this page link; Escape then stopped closing until focus returned. Zoom retained focus on its trigger, and Tab reached hidden Edit in playground; Escape still closed. See [E15](evidence/E15-search-focus-behind-overlay.jpg) and [E18b](evidence/E18b-expanded-preview-hidden-focus.jpg). These are observed keyboard behaviors, not untested screen-reader findings or proof of a total keyboard trap.

**Disposition: Build.** [`Search.tsx`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/docs/Search.tsx#L40) handles Escape only inside its nonmodal container; Zoom has a window listener but no initial-focus management. Extract a lightweight shared native-dialog primitive following `src/components/Dialogs.tsx`57–90, rather than importing the whole Editor UI into docs.

**Proposed fix.** Supply an accessible name, sensible initial focus, inert underlay, contained Tab/Shift+Tab, consistent cancel behavior, and focus return. Choose one coherent result pattern: a properly associated combobox/listbox, or ordinary linked results. The current unassociated listbox should not remain merely for styling.

**Acceptance.** Search input and visible Zoom controls receive initial focus. Background links cannot receive focus while open. Escape works from every overlay control. Closing returns to the trigger; choosing a result moves into the destination appropriately. Cover empty, populated, and no-result search states.

**Effort/risk:** S–M. Preserve route selection, query retention, pointer zoom, and Escape behavior. Screen-reader testing remains a separate validation task.

### F07 — Preserve Space activation on Editor buttons

**Evidence and reach.** One keyboard attempt focused File with Tab; Space did nothing, while Enter opened the menu [E25](evidence/E25-editor-space-does-not-open.jpg). This is a recoverable but standard keyboard interaction failure on a primary control. It was not reproduced twice.

**Disposition: Build.** [`keyboard.ts`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/src/state/keyboard.ts#L105) excludes editable text controls, then globally prevents Space and enters pan state at lines 107–110. Its canvas-scope calculation comes later; its native button exception only protects Enter.

**Proposed fix.** Restrict temporary Space-pan to the canvas or an explicitly defined canvas gesture context. Leave native activation keys untouched on buttons and other interactive controls, and respect already-handled events. Do not remove useful canvas panning to fix toolbar activation.

**Acceptance.** File, Export, and representative toolbar buttons activate with Space and Enter without entering pan state. Menus, dialogs, and text fields retain their own key behavior. Canvas Space-drag still pans, keyup releases it, and focus stays understandable. Test an actual focused button, not just dispatching a command directly.

**Effort/risk:** S. The localized guard is straightforward; shortcut regression is the principal risk. Broader canvas Tab behavior should be evaluated independently rather than folded into an untested trap claim.

### F11 — Give “reopen” a useful documentation result

**Evidence and reach.** The docs query `reopen` produced no results [E14](evidence/E14-docs-reopen-no-results.jpg). Other searches and keyboard result opening worked, so this is a vocabulary/content gap rather than a generally broken search engine.

**Disposition: Build.** [`find.ts`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/docs/find.ts#L26) requires every literal term to match section content. The baseline guides and DSL do not use `reopen`.

**Proposed fix.** Add an authoritative browser save/reopen topic and a small curated mapping for common intents such as reopen, resume, browser save, download, and editable image. Preserve exact attribute queries such as `fold=never`. Connect this content to F09 rather than documenting a misleading uniform storage promise.

**Acceptance.** `reopen`, `save in browser`, and `export` return relevant task guidance; exact DSL terms still work. Snippets name the mode/format distinctions. Arrow/Enter selection lands on the correct section, and Back returns predictably.

**Effort/risk:** S, dependent on settled F09 wording. Avoid broad fuzzy matches that make precise language queries worse. An AI search service or a new indexing platform is unnecessary.

### F13 — Carry stale-preview context into expanded docs diagrams

**Evidence and reach.** Invalid docs source showed an error and dimmed last-valid preview. Expand then showed the previous Architecture drawing at full opacity without the stale/error context [E18b](evidence/E18b-expanded-preview-hidden-focus.jpg). Repairing the source restored a valid example [E19](evidence/E19-docs-repaired-example.jpg). This is local ambiguity during a recoverable learning task, hence P3.

**Disposition: Build.** [`Example.tsx`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/docs/Example.tsx#L40) retains a successful SVG; `Zoom.tsx` receives the SVG without its validity context. Keep the last-valid preview, which helps recovery.

**Proposed fix.** Pass revision/error state into Zoom and label the image “Last valid drawing” while current text is invalid. Include a concise return-to-source route and the line reference. Do not make a stale expanded diagram appear to validate the current text.

**Acceptance.** Introduce an error, expand, and identify the stale state without leaving the overlay. Return, repair, and expand again: the notice clears and the new drawing appears. This check complements F06 focus handling but is independently reviewable.

**Effort/risk:** S. Avoid covering useful drawing detail with a large error panel or conflating a stale preview with an exportable current revision.

### F14 — Keep the example label aligned with Undo recovery

**Evidence and reach.** Observed once: editing Support ticket triage to Audit ticket updated the URL and survived reload. After choosing Sign-in sequence, focusing source, and pressing Control+Z, the edited triage source and diagram returned, but the picker still said Sign-in sequence. The URL correctly returned to the restored source hash. See E45 in the audit evidence index. Back from Docs restored both the edited diagram and correct picker; Forward and Back also worked (E46). This is a local label mismatch, **not data loss**.

**Disposition: Build a small synchronization fix.** Preserve the working Undo. [`Playground.tsx`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/play/Playground.tsx#L149) updates `exampleId` separately from the undoable editor replacement; `pickerTitle()` favors that ID over current source.

**Proposed fix.** Include example identity in the replacement's undo/redo state, or derive the visible current-document title from restored source and label any template origin separately.

**Acceptance.** Edit one example, choose another, Undo, then Redo: source, preview, picker identity, and URL agree at each step. Preserve the successful reload and Back/Forward recovery.

**Effort/risk:** S. Keep the distinction between a document's current title and its originating template clear; do not discard source history to repair the label.

## C. Validate the responsive risk before calling it an observed failure

### F08 — Resolve the narrow Playground cascade and verify narrow navigation

**Evidence and reach.** This is **source-only**. No actual 390px or 768px browser result supports a responsive pass or failure. [`site.css`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/site.css#L1383) declares a one-column Playground below 900px, then a later unconditional rule at lines 1822–1824 restores three columns. Combined with the hidden splitter, the source pane may occupy the 9px track. This is a concrete cascade conflict, not a screenshot observation.

**Disposition: Explore immediately; Build the narrow repair once verified.** Open Playground at 390 and 768 CSS px, inspect usable pane geometry, edit source, recover an error, and activate core controls. Check shared navigation and accessible names as well: the narrow rule hides labels, including the GitHub label, and hides Editor/Examples nav items. Editor save status also disappears below 720px.

**Proposed fix.** Scope desktop columns to the desktop condition or place the responsive override after them. Keep a practical source/preview order and a discoverable route to hidden navigation. Give icon-only links stable accessible names and retain meaningful persistence status. Avoid a complete mobile redesign before confirming the actual break.

**Acceptance.** At 390px/768px and desktop, source text occupies a usable track, controls remain reachable, and the page has no unintended horizontal overflow. Editing, search, transfer, and saving status remain operable. Test desktop splitter persistence after resizing back.

**Effort/risk:** S–M. The fix may be small; device/browser variation and stored split settings are the main risks. The existing CSS structural test does not evaluate cascade or usability.

## D. Structural work that makes the product coherent

### F09 — Name the storage mode and make editable-format promises consistent

**Evidence and reach.** Live states differed: plain `/app/` showed Saved; Checkout was Example/not on disk; the shared-source lesson showed unsaved example state. A source Editor SVG containing three nodes/two edges **successfully reopened** through Landing in Playground [E31](evidence/E31-reopened-svg-source-and-preview.jpg). In plain-browser mode, the UI reported Export created and a download event supplied a path, but reading that path returned filesystem `ENOENT`; the artifact bytes were unavailable. Two reimport attempts were inconclusive because tool file access raised `NotFoundError`; the interface remained unchanged. These are access limits, not proof of a completed download artifact or product format rejection. Only [invalid-source-export.svg](evidence/invalid-source-export.svg) and [audit-lesson-export.svg](evidence/audit-lesson-export.svg) had verified SVG bytes. Do not turn mode confusion into a claim that all SVG interoperability fails.

**Disposition: Build in bounded slices.** First make the current modes explicit; then improve persistence/format coherence. Source shows static JSON browser storage, in-memory source examples, and local files. Save diagram exports JSON even in a source session; Download .draft is separate. Static SVG embeds legacy JSON, while source images can embed `.draft`. The potential landing rejection of legacy-only SVG remains **source-inferred**, not live-proved. See [`files.ts`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/src/state/files.ts#L45), `Menus.tsx`275–298, `commands.ts`339–368, and `site/reopen.ts`.

**Proposed fix.** Use visible Browser draft / Unsaved example / Local file states, an explicit Save editable draft action, and concise format-specific export labels. Publish a tested matrix covering JSON, `.draft`, source SVG/PNG, legacy SVG, and image-only PNG. Preserve legacy imports; do not force lossy source conversion to create a superficial single-format story.

**Acceptance.** For each supported mode/format, create, edit, export, close, reopen, and compare content. Unsupported combinations explain why and offer a viable route. Refresh behavior matches status. Mobile retains that status. Browser storage failure is reported truthfully. The already-working source SVG path remains green.

**Effort/risk:** M–L. Split status/copy from migration work. Main risk is overwriting the independent browser draft or promising durability the implementation does not provide.

### F10 — Teach the complete browser journey before installation

**Evidence and judgment.** Get started visibly begins with installation [E06](evidence/E06-docs-get-started.jpg). The site nevertheless offers immediate source and visual editing. The judgment is that this sequence adds avoidable work for a browser visitor; no study measured comprehension or abandonment.

**Disposition: Build after F01–F04 and F09 contracts settle.** [`get-started.md`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/docs/pages/get-started.md#L7) begins with Node/npm/pnpm, then a local `.draft`. Preserve CLI instructions, but introduce them as an explicit path for working with files in a repository.

**Proposed fix.** Begin with a small browser exercise: rename a node, add a connection, see a recoverable syntax error, continue visually, save, and reopen. Explain Playground as source editing and Editor as visual editing before asking the visitor to choose. Follow with one layout before/after and a small diagram-kind choice guide. Keep deep reference topics and advanced CLI material discoverable.

**Acceptance.** A fresh visitor can follow the written exercise without installing tools or guessing a storage mode. Every screenshot and link matches the current interface. The exercise ends with a reopened editable diagram. Local setup remains documented separately with consistent standalone versus repository command examples.

**Effort/risk:** M. Avoid growing the landing page with unrelated sections or duplicating save guidance in several places. Instructional copy must follow repaired behavior, not conceal unresolved failures.

### F12 — Clarify advanced layout choices before reorganizing the Editor

**Evidence and judgment.** The source and visible Editor expose basic drawing alongside Tidy, Automatic layout, comparison, timeline, brush, routing, and diagnostic samples. Compare layouts was successfully tested on Checkout: six computed candidates appeared with approaches, recipes, metrics, and the clear instruction “Preview only · Apply to keep.” Applying Spring network produced an unsaved edit; Undo restored the prior arrangement and confirmed the reversal. See E35–E38 in the audit evidence index. This is a strong feature to preserve. The P2 judgment concerns discovery, terminology, and learning progression; it is not a claim that comparison is broken. Billing example search and Enter selection also worked.

**Disposition: Explore the hierarchy; Build small local explanations.** [`Toolbar.tsx`](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/src/components/Toolbar.tsx#L55), `Menus.tsx`, `Inspector.tsx`, and help are the seams. File → Layout test cases uses a different legacy collection from Start's source examples. Some source-mode operations cannot be stored, so controls also need mode-aware explanation.

**Proposed fix.** Extend the comparison tool's clear preview/apply/undo contract to other layout entry points. State what each action affects and preserves. Distinguish task examples from diagnostic test cases. Offer a compact path through Select → Edit → Tidy/Compare → Accept/Undo → Save while retaining direct access for experienced users. Test naming before moving whole tool families.

**Acceptance.** On a simple flow and dense architecture, a person can predict whether an action changes selection or the whole diagram, inspect the result, and restore the prior arrangement. Unsupported controls explain the mode limitation. Existing shortcuts and advanced tools remain available. Conduct focused user tasks to assess discovery; do not claim the audit measured it.

**Effort/risk:** M exploration, then scoped implementation. The risk is hiding valuable power tools or equating visual minimalism with easier work.

## E. What to defer or avoid

| Disposition | Idea | Reason and reconsideration condition |
| --- | --- | --- |
| Defer | Broad visual redesign and toolbar relocation | It does not repair navigation or retention. Reconsider after F12 task evidence identifies a specific hierarchy failure. |
| Defer | More example volume | Twenty-five source examples already cover varied diagrams. First improve selection guidance and teaching around the existing set. |
| Defer | New docs platform or AI search | Current topic generation and literal search have direct repair seams. Reconsider only after curated content/query work proves insufficient. |
| Avoid | Accounts, remote autosave backend, enterprise document infrastructure | Current failures can be addressed with explicit local/browser state and portable files. No user need in this audit justifies that scope. |
| Avoid | Hiding all advanced tools to make the toolbar look simpler | Preserve effective layout power; validate discoverability and mode explanations instead. |
| Avoid | Discarding invalid source or exporting a silently substituted original | Recovery requires preserving the user's current text and naming the last valid drawing. |
| Avoid | Treating direct-URL smoke tests as proof of the journey | They miss the observed ordinary-click failure. Use real controls and cross-surface transfers. |
| Avoid | Declaring responsive or accessibility compliance from source inspection | F08 needs real narrow-view interaction; focus findings need their own regression checks and assistive-technology coverage. |

## Sequencing and completion gate

Ship F01/F02 navigation reliability, F03 session correctness, and F04 revision-safe exports first. F05–F07 can proceed as small independent repairs. Validate F08 early so a real narrow-screen blocker does not wait behind content work. Deliver F09 status/format clarity in bounded slices, then F10/F11 tutorial/retrieval updates. F13/F14 are small contextual fixes; F12 broader hierarchy remains an evidence-led exploration.

Attach meaningful browser checks to each repair using the existing lightweight repository approach. Validate the combined published artifact, not just isolated components. The completion journey is: make a first browser change → find help → recover from an invalid line → continue with the same source → refine visually → deliberately retain/export → reopen the same editable diagram. Check normal clicks, direct loads, refresh, Back/Forward, keyboard operation, and actual 390px, 768px, and desktop layouts. Preserve failure screenshots and concise console output.

The present review supplies evidence and a decision order. It does not authorize implementation, substitute for a user study, or establish untested behavior. Keep open questions explicit: which Editor terms novices understand, how return visitors interpret saving, how narrow layouts behave, and which legacy formats need migration support. Those uncertainties should shape focused validation while the demonstrated primary failures are repaired.
