# Draftably — repair plan

**Status: proposed repairs; no implementation performed.** This report recommends staged work for Codex to review. Build means recommended for a plan, not authorized implementation. No repair, local build, CLI installation, or test-suite execution is claimed. The live interaction audit is reported in [usability-audit.md](usability-audit.md); finding priorities and dispositions are in [prioritized-fixes.md](prioritized-fixes.md). Source evidence is fixed at [`ca96d3babd05041aaa206509090d023b02b61b5b`](https://github.com/byronwall/draftably/tree/ca96d3babd05041aaa206509090d023b02b61b5b). **Deployment equality is unverified. The 390 px and 768 px browser tests are UNTESTED; all narrow-width acceptance checks below are proposed.**


**Late access update (~03:15 UTC):** During final verification, reloading the GitHub Pages Playground and landing routes redirected this browser to `draftably.dev`, where an upstream connection timeout prevented further validation. The observations below describe the earlier tested session; the current deployment has not been revalidated. See [E51](evidence/E51-late-redirect-timeout.jpg), [E52](evidence/E52-late-landing-redirect-timeout.jpg), and [session notes](evidence/session-notes.md). This is an access limit, not a claim of permanent outage or proof of the earlier failures' cause.

**Before implementation:** Reproduce the prioritized failures against the active deployment and record any already-resolved IDs. The fixed source baseline and earlier browser receipts remain the basis of this review; a new origin is not assumed to share identical behavior.


## Decision

Repair the transitions and the meaning of saved work before expanding features or restyling the product. Draftably already has compelling working pieces: editable source, a live compiler, visual editing, layout comparison, a broad example catalog, and editable exports. The product needs those pieces to carry the same diagram through a predictable journey.

The first repairs should make ordinary Editor links work, stop the Example→New path from making a false browser-save promise, and prevent mismatched source/image exports. Preserve edited source across handoffs immediately afterward. Responsive and keyboard repairs can ship in parallel where their failure is reproduced or the source defect has a narrow verified fix. Tutorial and toolbar refinements should follow those behavioral contracts so the new guidance describes reality.

The target journey uses the existing four surfaces:

1. **Landing:** see the promise and make one obvious source change; the current example remains the work being continued.
2. **Playground:** learn and edit source, see errors next to the affected line, preserve the last valid drawing with an explicit label, share a source link, and obtain a portable editable file.
3. **Editor:** refine visually, understand whether the document is an example scratch copy, a browser draft, or a local file, and know what actions persist it.
4. **Docs:** answer a task question without requiring installation, and return the current example to the larger surface. Introduce local CLI when writing to repository files is useful.

Do not create accounts, collaboration infrastructure, a new backend, or a parallel docs platform to solve these problems. Keep the existing compiler, language source, native controls, and two-build architecture where they serve the project.

## Evidence and implementation boundaries

Repository review covered **78 complete files plus selected sections of `site/site.css`**, for **79 distinct files examined**. All 37 explicitly named brief files were read. The populations include 20 generated docs topics, 25 source examples, 13 legacy JSON layout-test samples, and 64 test/harness files. Complete source samples cover 9/25 public examples, 1/13 legacy samples, and 10/61 unit-test files. These are source counts, not browser task counts.

**Observed:** ordinary site→Editor navigation can leave Landing displayed at an `/app/` address; direct entry works. A fresh third ordinary-click reproduction again left Landing displayed ([E40](evidence/E40-fresh-editor-link-still-landing.jpg)); reloading then opened the stock Editor example without the edited landing label ([E41](evidence/E41-handoff-refresh-stock-example.jpg)). Docs navbar→Playground and Docs edited-example→Playground transitions produced blank pages with dynamic-module errors ([E07](evidence/E07-playground-initial.jpg), [E20](evidence/E20-docs-transfer-blank.jpg)), while a later fresh Landing→Playground transition succeeded. Treat F02 as an observed intermittent/path/session failure, not a universal broken route. The audit also identified false-save/nonpersistence in Example→New (F03) and an invalid-source export mismatch (F04). Detailed starting states, exact actions, screenshots, repeatability, and limits belong to the audit's finding records.

**Positive control:** a valid source-mode Editor SVG reopened successfully through the landing chooser with all **three nodes and two edges** ([successful reopen E30](evidence/E30-landing-svg-reopened.jpg), [source and preview E31](evidence/E31-reopened-svg-source-and-preview.jpg)). E30 is a successful transition, not a route failure. Preserve that working path. The source-inferred incompatibility of some legacy JSON-only SVGs or image-only PNGs is a different mode/format question; it does not establish that landing SVG reopening is universally broken.

**Additional positive coverage:** all 20 published documentation topics were visited. The Editor comparison grid displayed six ready candidates with preview-only status, metrics, and recipes; applying Spring network succeeded, and Undo restored the preceding layout ([comparison evidence E35](evidence/E35-layout-comparison.jpg), [Undo evidence E38](evidence/E38-layout-undo.jpg)). These capabilities should be preserved.

**Evidence limits:** F05 is observed within the bounded sequence edited Landing→ordinary CTA→Landing at the Editor URL→Reload→stock Editor example; baseline source explains the stock-ID handoff. It does not establish how a repaired route would behave without the separate transfer repair. F08 is a concrete CSS-cascade inference with **390/768 px execution UNTESTED**. F09 combines UI observations with source-defined modes/formats: browser-mode SVG export showed “SVG export created” and reported a download event, but the artifact was inaccessible (`ENOENT`) and its bytes were not verified. Two file-path reopening attempts encountered `NotFoundError` and remained on Landing. That is an **INCONCLUSIVE file-access result**, not an observed format rejection. F12 is a design judgment about progression, not measured user comprehension. F14 is now an observed picker-caption mismatch after successful source/diagram Undo recovery; no loss was demonstrated. F15 clipboard/share feedback is **UNRANKED, validation only** because the full external-share outcome remains unknown.

The plan distinguishes three levels:

- **Behavioral repair:** reproduce a specific failure, fix it, and show the same normal user sequence succeeding.
- **Source-informed protection:** add a narrow contract around a concrete source inconsistency, such as retaining the exact source revision associated with an exported picture.
- **Design exploration:** validate labeling, hierarchy, and teaching choices with a few task attempts before committing to a large restructuring.

## Finding-to-milestone traceability

| Finding | Priority and evidence basis | Repair milestone |
| --- | --- | --- |
| F01 — Ordinary site→Editor route | P1, observed primary transition failure | M01 |
| F02 — Docs→Playground blank module failure | P1, observed; intermittent/path/session scope | M01, M09 |
| F03 — Example→New false-save/nonpersistence | P1, observed return-visitor failure | M02 |
| F04 — Invalid export image/source mismatch | P1, observed export/reopen defect | M03 |
| F05 — Edited landing source omitted from handoff | P2, observed CTA→Reload loss of edited label; source-grounded stock-ID mechanism | M04 |
| F06 — Docs Search/Zoom focus | P2, keyboard/focus findings; no screen-reader conformance claim | M06 |
| F07 — Editor Space activation interception | P2, control-activation finding | M06 |
| F08 — Responsive cascade | Provisional P2 validation item; source-inferred, 390/768 UNTESTED | M05 |
| F09 — Mode/format/storage coherence | P2, source plus UI evidence; source-SVG round trip succeeds; browser-SVG reimport inconclusive due to file access | M02 |
| F10 — Browser-first onboarding | P2, observed installation-first content plus heuristic sequencing judgment | M07 |
| F11 — Search vocabulary | P3, focused retrieval improvement | M07 |
| F12 — Layout/tool progression | P2, heuristic design judgment | M08 |
| F13 — Stale expanded preview | P3, stale-state explanation | M03 |
| F14 — Example-switch Undo leaves stale picker caption | P3, observed identity-label mismatch; edited source and drawing recover successfully | M04 |
| F15 — Clipboard/share feedback | UNRANKED, validation only; outcome unknown, not a confirmed defect | M04 |

## Milestone map

| Milestone | User-visible outcome | Sequencing |
| --- | --- | --- |
| M01 — Correct navigation | Ordinary activation reaches the intended surface; failed route loading has a recovery screen. | First. |
| M02 — Repair retention and mode transitions | New work is actually saved where the UI claims, and reopening follows a named format contract. | Start alongside M01; fix F03 before optional reorganization. |
| M03 — Export the right revision | Editable pictures reopen the exact source revision they depict. | Early P1 repair; independent of broad storage redesign. |
| M04 — Preserve handoffs and recovery | The text just edited continues into the next surface; example/copy actions have recoverable outcomes. | Immediately after reliable navigation; P3 work can be split off. |
| M05 — Verify and repair narrow layouts | Core source, diagram, navigation, and persistence status work at 390/768 px. | First perform the missing viewport tests; then ship narrow fixes. |
| M06 — Respect keyboard and focus | Native activation and overlay entry/exit behave predictably. | Independent small patches. |
| M07 — Teach the browser journey | Learning reaches a portable reopened result without installation. | After M01–M04 settle the behavioral promises. |
| M08 — Clarify Editor progression | Basic work and advanced layout tools have understandable entry points and mode limits. | Build labels/feedback; Explore substantial regrouping. |
| M09 — Protect the assembled site | The actual deployment artifact passes the repaired journeys. | Add regression checks with each fix; complete the gate before closing the repair program. |

Keep milestones independently reviewable. A PR should show its specific user-visible outcome and acceptance result. If one slice introduces a different risk—such as persistence migration or global shortcut changes—review it separately. No implementation is included in these reports.

## M01 — Correct navigation across the separate builds

**Findings: F01, F02. Disposition: Build.** This is the first primary-journey repair. Do not dilute it with typography or new feature work.

**Observed problem:** normal Editor links change the URL while Landing remains displayed, including the fresh third-click reproduction E40. Reload recovers the Editor document, but in the edited-demo sequence it opens the stock example and omits the changed label (E41). Reload is therefore not a source-preserving substitute for fixing the ordinary handoff. **Inferred mechanism, grounded in baseline source:** `site/main.tsx` installs a router with `/play`, `/docs/:slug?`, and a wildcard Landing route; the Editor exists as a separate static build under `app/`. Native same-origin anchors in `SiteNav`, Landing, and LiveEditor are not explicitly excluded from router interception. [Solid Router’s official documentation](https://github.com/solidjs/solid-router) describes native anchor interception and an opt-out such as `target="_self"`.

**Modules:** `site/main.tsx`; `site/SiteNav.tsx`; `site/draw.ts` (`appUrl`); `site/landing/Landing.tsx`; `site/live/LiveEditor.tsx`; docs link generation where it targets Editor; `vite.site.config.ts`; `scripts/site-pages.ts`. Keep the existing separate Editor build in `package.json`.

**Recommended change:** define one intentional navigation policy. Internal public-site links use the site router; Editor links load the Editor document. Centralize the latter so gallery, hero, footer, and nav do not drift. Verify the exact router version before choosing its documented opt-out. Do not solve this by opening every link in a new tab or by making `/app/` pretend to be another Landing route.

**Acceptance:**

- From a fresh Landing load, activate main CTA, nav Editor, hero continuation, and a gallery example by ordinary click. Each shows the Editor canvas and appropriate diagram identity.
- Repeat with keyboard Enter, direct navigation, and reload. The destination must agree across all three entry mechanisms.
- Back returns to the originating surface. It does not produce a misleading address/content combination.
- Test both configured base paths, `/draftably/` and `/`, against the complete built artifact.
- Add a graceful load-error surface for a failed lazy Playground import. It names the failed destination and offers a normal reload/retry route; it does not leave a blank document. E07's Docs navbar route reported missing `Playground-D4RxsDWh.js`; E20's Docs edited-example transfer reported missing `Playground-BU2uUc6A.js`. F02 later had a successful fresh Landing→Playground control, so investigate path/session and stale asset/HTML behavior without asserting a universal route failure or a proven deployment cause. Preserve any edited text before recommending a reload. E30/E31 are successful source-SVG reopening controls and must not be counted as these failures.

**Docs/examples:** no tutorial rewrite is needed to ship this fix; update any incorrect link descriptions. Use the existing Checkout example plus an ordinary gallery card.

**Main risk:** changing link interception can alter anchor scrolling, history, or base-path resolution. The validation must exercise actual links, not just direct `goto` calls. A minimal regression belongs in the same PR.

## M02 — Repair retention, name modes, and unify advertised reopening

**Findings: F03 (P1), F09 (P2). Disposition: Build the false-save correction, explicit modes, and supported-format compatibility; Explore any broader persistence redesign.** Do not require a new storage architecture before shipping truthful status and safe round trips.

**Observed retention failure (F03):** Example→New can promise a browser-saved diagram without providing the promised persistent result. This is an early repair, not a wording-only issue.

**Inferred mechanism from source:** `src/state/file-session.ts` enters source mode by disabling browser storage and replacing commit/history handlers. `src/components/StartScreen.tsx` calls `newDocument()` from the static New flow; `src/state/actions.ts:561–568` presents browser-save confirmation text regardless of the current source-session state. Review the whole mode transition before changing the message.

**Other source facts:** static Editor uses a single browser JSON slot; example/shared source sessions disable browser persistence and retain edits in memory; local CLI file sessions write `.draft` files. Status and commands differ. Static SVG includes legacy Editor JSON, source-mode SVG can include `.draft`, and static PNG is image-only. Landing's reader accepts embedded `.draft`, not legacy Editor JSON. These format/mode differences require a deliberate contract, not a generic “Save” promise.

**Observed format boundary:** browser-mode export displayed “SVG export created” and a download event reported a path. The artifact was not accessible for inspection (`ENOENT`), so its actual downloaded bytes and metadata were **not verified**. Subsequent landing reimport attempts using two file paths remained on Landing and produced `NotFoundError`; file access, rather than application format handling, was unresolved. Classify that round trip as **INCONCLUSIVE**. It does not confirm a live JSON-SVG compatibility defect. Keep the source-defined legacy-payload risk separate from that access limit. The successful source-SVG round trip in E30/E31 and the invalid Playground SVG in F04 have verified bytes; the browser-mode export does not.

**Modules:** `src/state/launch.ts`; `src/state/actions.ts` (`newDocument`, `openDocument`); `src/state/file-session.ts`; `src/state/document.ts`; `src/state/files.ts`; `src/state/commands.ts`; `src/components/Toolbar.tsx`; `src/components/ExampleBar.tsx`; `src/components/StartScreen.tsx`; `src/components/Menus.tsx`; `site/reopen.ts`; `site/play/ExamplePicker.tsx`; save/reopen documentation. Relevant regression seams include `tests/embed.test.ts`, `tests/file-session.test.ts`, and a real browser round-trip proof.

**Recommended first slice — F03:** make switching from an example/shared session to a new browser document a real, explicit state transition. Clean up the source session, its listeners, commit/history handlers, storage gate, and URL identity before claiming browser persistence. A deliberate clean-document navigation can be a simpler implementation if it preserves work and makes the requested New action unambiguous. Choose one approach; do not layer both unnecessarily. Never infer successful saving merely because the document changed or an old status remains.

The confirmation text must reflect the current mode and say what will be replaced. Preserve any existing browser copy until the user explicitly chooses the replacement. The implementation must not silently overwrite personal work to repair a scratch example's mode. This can ship as a small correction without introducing a multi-document database.

**Next slice — F09:** always display a short, concrete mode label:

| Mode | Status promise | Portable action |
| --- | --- | --- |
| Browser draft | Saved in this browser on this device; no disk-file claim. | Download editable diagram; name the actual format. |
| Example/shared copy | Changes currently live in this tab until explicitly retained or downloaded. | Keep as a browser draft and/or download source. |
| Local CLI file | Named local path plus saved/pending/error/conflict state. | Save/export from the file session. |

Preserve the user's existing browser copy when opening examples or imports. Adding “Keep in this browser” must make replacement or creation explicit; do not silently overwrite the single existing slot. If multiple browser drafts are introduced, treat migration and selection as a separate reviewable slice.

**Recommended compatibility slice:** preserve the already successful source-mode SVG→landing→Playground round trip, then recognize supported editable payloads at every advertised entry point. Source-based content goes to Playground or a source session; legacy Editor JSON/SVG should go to the Editor with preserved semantics. The latter is source-informed compatibility work; the successful source SVG is not evidence that every legacy format was tested. Do not force a lossy `.draft` conversion of features the text language cannot represent. Either make static PNG exports carry a supported editable payload or label them clearly as image-only and limit the reopening promise. Retain legacy SVG compatibility.

**Acceptance:**

- Start from an example, use New→Blank, confirm the mode-appropriate message, make a unique change, then refresh. The new browser document survives if the UI promised it was saved; the original stock example must not silently reappear.
- Static browser draft: create a disposable diagram, make a change, refresh, and reopen the Editor. Status names browser storage and the change survives.
- Example/shared copy: edit, inspect persistence status, choose an explicit retain/download action, refresh, and recover the edited version. The original browser copy is still accessible.
- Export/import matrix covers `.draft`, source SVG, source PNG, Editor JSON, legacy JSON-bearing SVG, image-only PNG, and unsupported ordinary images. Supported cases reopen correctly; unsupported cases explain what is missing without replacing the current work.
- Compare Ctrl/⌘S, Save/export menu, and Download `.draft`; command names and actual formats agree.
- Example→New→Blank starts the intended storage mode; it must not retain a hidden source-session mode that prevents normal browser persistence.
- Storage failure is surfaced without discarding the in-memory document. Multi-tab races and eviction remain separately identified tests, not assumed covered by a refresh check.

**Docs/examples:** one authoritative save/reopen page with a compact mode/format table, linked from Get started, CLI, Playground, and Editor help. Explain that a share link carries source in the URL and that the browser-only save belongs to the current origin/device. Do not imply cloud synchronization.

**Main risk:** incompatible source/JSON representations and the existing browser slot. Prioritize compatibility, explicit identity, and preservation before a migration or universal source exporter.

## M03 — Keep rendered images and embedded source consistent

**Findings: F04 (P1), F13 (P3). Disposition: Build.** A portable editable picture must reopen the content it visibly represents.

**Source fact:** Playground separately stores current source and last successful SVG. Error states keep the latter; SVG/PNG export currently pairs it with current source. F04 is an observed invalid-export mismatch; the audit contains its actual downloaded-file evidence. The baseline explains the mismatch by pairing current source with a retained prior picture. This finding does not negate the successful valid source-SVG round trip.

**Modules:** `site/play/Playground.tsx` (render completion, Download menu, `savePng`); `site/live/DiagramView.tsx` (stale state); `site/docs/Example.tsx` (retained valid SVG and expanded-preview launch); `site/docs/Zoom.tsx` (expanded drawing and stale/error context); `site/draw.ts`; `src/model/embed.ts` through its existing embedding/reader API; `site/reopen.ts`; `tests/embed.test.ts`; a new focused site interaction proof. The embed module is a real existing dependency; its internals should be reviewed by Codex before editing.

**Recommended change:** represent a successful compile as a single result that retains source, SVG, diagnostics, and a revision token. Image exports use that matching pair. While source is invalid or compilation is pending, either disable current-picture export with an explanation or explicitly offer the last valid revision with its matching source. A `.draft` download must remain available even when no drawing exists, because invalid text is still work to recover.

Do not remove the last good preview. It is useful. Add a plain status such as “Showing the last valid drawing” and identify the error separately; opacity alone is too ambiguous. Expanded docs drawings should retain the same stale-state explanation when they display a previous valid result.

**Acceptance:**

- Valid edit→SVG export→reopen yields the same labels, edges, and embedded source revision.
- Valid edit→invalid edge target→export attempt cannot create an editable image containing one revision's picture and another revision's source.
- Invalid input can always be downloaded as raw source and opened again for repair, even if no valid preview was ever produced.
- Rapid edit→export before compilation settles waits for or explicitly identifies the correct revision.
- PNG and SVG use the same contract. Error messages and controls remain usable by keyboard.
- Fix the invalid line and confirm that stale labeling clears only after the fresh drawing succeeds.
- In a live docs example, make a valid edit, introduce an invalid line, and activate Expand. The enlarged prior drawing must retain a clear “last valid drawing” explanation and the current error context; expanding must not make a stale result appear current. Close it, repair the line, and confirm both inline and expanded views show the newly successful revision.

**Docs/examples:** document “editable image” versus raw source recovery in the save/reopen guide. Include one deliberate invalid example in the tutorial and explain that the faded old drawing is a reference, not a successful render of the current text.

**Main risk:** over-disabling exports can prevent recovery. Keep the source-download path independent of render success and test initial-invalid, valid-then-invalid, and pending states separately.

## M04 — Carry current work across surfaces and expose recovery

**Findings: F05 (P2), F14 (P3); F15 is UNRANKED, validation only. Disposition: Build current-source handoff and picker-identity synchronization; verify the clipboard outcome before proposing a defect repair.** Separate this from route correctness so reviewers can see that both problems were solved.

**Observed plus inferred (F05):** editing the landing label succeeds. In the bounded E40→E41 sequence, the ordinary continuation left Landing displayed at the Editor URL, and Reload then opened the stock example without the edited label. **Source fact:** `site/live/LiveEditor.tsx` keeps mutable source but its continuation anchor passes only `appUrl(id())`. Playground's `openInEditor` already uses an encoded current-source hash and deliberate document navigation. Docs Example already computes a Playground link from current text. The route and current-source handoff each need an acceptance check; resolving only the former cannot establish that edits transfer.

**Observed recovery and residual mismatch (F14):** edited triage source containing “Audit ticket” survived hash reload. After switching to Sign-in sequence, Control+Z in the source editor restored the edited triage source and diagram, but the picker caption still read Sign-in sequence ([E45](evidence/E45-example-switch-undo-recovery.jpg)). The URL hash updated correctly; navigating to Docs and Back restored the matching triage picker and content, and Forward then Back also worked ([E46](evidence/E46-history-restores-edited-triage.jpg)). Preserve the working undo transaction and history recovery. The repair is the smaller identity-label synchronization, not a remedy for demonstrated text loss.

**Modules:** `site/live/LiveEditor.tsx`; `site/play/Playground.tsx` (`openInEditor`, `copyLink`, `writeHash`, `pickExample`, `pickerTitle`); `site/live/CodeEditor.tsx` (`replace` and source history); `site/docs/Example.tsx`; `site/docs/play-link.ts`; `src/lib/source-hash.ts`; `src/state/launch.ts`; `site/reopen.ts`. At baseline, `Playground.tsx:149–156` updates a separate example ID when replacing text and prefers that ID for the caption; `CodeEditor.tsx:345–348` replaces text through an undoable history transaction. Synchronize the displayed identity with restored content/history without discarding that transaction.

**Recommended change:** reuse a single current-source handoff contract. Pristine examples may retain compact example URLs; once edited, continuation must encode the current text. The action should explicitly say whether it continues the work in a source editor or a visual editor. Preserve user-written comments and identifiers in a source-based handoff. Avoid reconstructing source from rendered SVG when the original text is already available.

**Acceptance:**

- Edit a unique label on Landing, add a third node and an edge, then continue to Editor. Verify the edited title/label and topology. Download the source and verify those exact edits and the fixture comment remain.
- Repeat Docs→Playground→Editor. The visible preview and transferred source must identify the same diagram at every step.
- F14: edit triage with a unique label, wait for its hash update, reload, switch to Sign-in sequence, and press Control/⌘Z in the source editor. The edited triage source, drawing, URL, and picker identity must agree immediately. Preserve the already observed source/diagram recovery. Then verify Redo, Docs→Back, and Forward→Back against the same identity contract; the latter two navigation recoveries already succeeded in E46. Do not add a blanket discard confirmation or a new persistence system for this caption defect.
- F15 (**UNRANKED, validation only**): copy a link, paste it through a normal visible text field, and reopen it in a separate disposable tab. Confirm the exact edited source, then test clipboard-denial feedback where supported. Until that full sequence succeeds, call the share outcome unknown. If a feedback defect is then demonstrated, distinguish copied, refused, and manual-copy fallback states; do not assign a repair priority from the current uncertainty alone.
- Invalid source remains recoverable as text. The application must not silently fall back to a stock example because hash decoding or parsing failed. Distinguish an invalid shared payload from an intentionally selected example.
- After a file import, navigate to Docs and return. Test both `/play` and `/play/`; a sticky in-memory handoff must not overwrite a newer edited revision.

**Docs/examples:** add one short hint beneath the existing demo controls stating that continuation keeps edits. Do not add another landing section. The tutorial's sample should be small enough that a unique change is visibly traceable.

**Main risk:** asynchronous source encoding, route transitions, and in-memory `incoming` state can disagree about the current revision. Keep one authoritative revision during a handoff and test rapid edit→continue as well as a settled edit.

## M05 — Make the narrow layout functional

**Finding: F08, provisional P2. Disposition: Explore/validate first; Build the confirmed correction. The 390 px and 768 px browser tests were UNTESTED in this audit.**

**Source facts:** `.play-body` has a ≤900 px one-column rule followed by an unconditional three-column override. At narrow width, the splitter is hidden and the diagram is reordered. Shared navigation hides Editor/Examples at 820 px and hides GitHub text without giving its icon link an independent name. Editor hides save status at 720 px but does implement a dedicated five-tool mobile toolbar.

**Modules:** `site/site.css`; `site/SiteNav.tsx`; `site/play/Playground.tsx`; `site/live/DiagramView.tsx`; `site/docs/Docs.tsx`; `src/components/toolbar.css`; `src/components/Toolbar.tsx`; `src/components/ExampleBar.tsx`.

**Recommended change:** repair the CSS cascade so source and drawing are genuinely usable stacked panes at narrow widths. Preserve a visible route to the main task from each surface. Give icon-only links persistent accessible names. Keep a compact persistence status visible on phones. Preserve the existing mobile toolbar adaptation and test it before replacing it.

**Acceptance:**

- At 390×844 and 768×1024 CSS px, Landing, Docs, Playground, and Editor expose navigation and primary actions without a clipped control or a nearly zero-width editing track.
- In Playground, type a label, recover an error, reach Download, and continue to Editor. Scrolling one pane does not make the other permanently unreachable.
- Open Docs Topics, navigate, close it, and verify both scroll restoration and visible focus.
- Editor Add, Connect, Properties, Fit, More, and save state are available; overlays remain dismissible.
- Resize back to desktop and verify split persistence and canvas fit remain sensible.
- Inspect accessible names after text labels are visually hidden. Measure viewport and document dimensions from the actual browser state; a cropped screenshot is not responsive testing.

**Docs/examples:** no new general responsive-design guide. Include the same small tutorial fixture and the dense Kubernetes/TCP examples to check that controls remain usable even when the drawing needs pan/zoom.

**Main risk:** correcting one late CSS rule can expose assumptions elsewhere in the cascade. Use targeted narrow screenshots and interaction checks. Treat WCAG reflow separately: 390 px is product coverage; it is not the 320 px conformance threshold, and two-dimensional diagram content has different considerations from surrounding controls/prose.

## M06 — Preserve native keyboard behavior and overlay focus

**Findings: F06, F07 (P2). Disposition: Build the observed keyboard/focus corrections; Explore screen-reader behavior separately because it was not tested.**

**Source facts:** the Editor handles Space globally before native-control exceptions, while Docs Search/Zoom have weaker focus contracts than the native dialog component already used by Editor. CodeMirror intentionally binds Tab for indentation, so an actual escape sequence must be tested before claiming a trap.

**Modules:** `src/state/keyboard.ts`; `src/state/commands.ts`; `src/components/Dialogs.tsx`; `site/docs/Search.tsx`; `site/docs/Zoom.tsx`; `site/docs/Docs.tsx`; `site/live/CodeEditor.tsx`; `site/play/ExamplePicker.tsx`; focus styles in site/app stylesheets.

**Recommended change:** scope canvas shortcuts to the canvas or an explicitly active interaction mode. Keep native Space/Enter activation on buttons and normal Tab traversal. Use a coherent, named dialog pattern for modal docs overlays, reusing the existing native dialog approach where suitable. Decide whether search uses combobox/listbox semantics or ordinary links and make the whole interaction consistent; do not add isolated ARIA attributes without keyboard behavior.

**Acceptance:**

- Keyboard-only route: Landing→Docs→Search→result→live source→Playground→Editor core controls, with a visible focus location throughout.
- Search input receives focus; arrows move the intended active result; Enter opens it; Escape closes; focus returns to the search trigger.
- Expanded drawing has an accessible name, fit/close controls, keyboard exit, and return focus. Background controls do not receive invisible focus while covered.
- Space and Enter both activate a normal toolbar button without entering pan mode.
- Code editor Tab behavior has a disclosed escape route that works. Selected-canvas Tab behavior cannot silently prevent leaving the editing region.
- Error feedback identifies the offending line and is programmatically associated with its source editor. Screen-reader announcements require a separate actual assistive-technology test.

**Docs/examples:** concise keyboard help distinguishes text-editing, canvas-selection, connecting, and dialog modes. Preserve existing practiced shortcuts where possible; disclose any changed shortcut next to its action.

**Main risk:** fixing global handlers can break fast shape creation or connect-mode navigation. Protect those flows with explicit state-dependent checks instead of broadly removing keyboard support.

## M07 — Make learning and retrieval task-based

**Findings: F10 (P2), F11 (P3). Disposition: Build a focused browser-first tutorial and save/reopen retrieval; Explore broader reorganization.**

**Source facts:** Get started begins with installation; CLI and CLI details overlap; exact-text search indexes reference terminology but has no small synonym map; important layout/refinement topics lack live draft examples. The docs already have strong topic groups, anchors, previous/next, and editable examples.

**Modules:** `site/docs/pages/get-started.md`; `cli.md`; `themes.md`; `agent-skill.md`; `docs/DSL.md`; `site/docs/content.ts`; `site/docs/find.ts`; `site/docs/Example.tsx`; `site/docs/play-link.ts`; `src/model/examples.ts`; `skills/draftably/SKILL.md` if language guidance changes.

**Recommended change:** start Get started with a no-install exercise: change a label, add a node/edge, intentionally break one reference, recover, choose a layout, and save/reopen. Offer local CLI as a distinct next path with a stated benefit: edits save to repository files. Assign one canonical explanation to saving, layout choice, themes, and CLI usage, with references linking to it. Keep the comprehensive DSL tables for retrieval.

Add a small curated intent map for queries such as reopen, save in browser, undo, change direction, nested group, and visual editing. Retain exact searches such as `fold=never`; do not replace the search with a hosted AI service. Add one-concept live examples for refinements, routing, and layout; keep the larger examples as applications of those concepts.

**Acceptance:**

- A fresh browser can complete the guide through a portable reopened result without installing Node.
- Every instruction names a visible control and matches the current storage mode.
- A fixed search-query set returns an appropriate result and meaningful snippet; Enter activates it and the exact section is visible.
- Code copying includes current edited text where that is promised; Playground continuation preserves it.
- Deep-link reloads and previous/next retain the expected topic/anchor.
- Live examples compile through the existing docs test. A reviewer checks that each example's changed line explains the visible effect.

**Docs/examples:** use an existing two/three-node starter first, then nested Checkout, sequence, state, Kubernetes, and TCP/cells as purposeful follow-on choices. Explain what each kind is good for; adapt the existing agent skill's fit guidance rather than inventing a new taxonomy. Correct the skill's old example count separately.

**Main risk:** creating a second authoritative language description. Keep `docs/DSL.md` authoritative for syntax and update the skill alongside actual language changes; this audit does not require a syntax change.

## M08 — Clarify Editor progression without hiding its power

**Finding: F12 (P2 heuristic). Disposition: Build naming/mode feedback; Explore a substantial toolbar redesign.**

**Source facts:** Toolbar mixes drawing, Tidy, Automatic layout, Timeline, Brush, Compare, and routing. Many labels disappear below 1560 px. File menu's legacy samples are labeled Layout test cases and differ from the 25 source-example catalog. Inspector can expose actions that the current source mode cannot represent.

**Observed strength:** six comparison candidates reached Ready, the grid made preview status and metrics visible, Spring network Apply succeeded, and Undo restored the prior arrangement. F12 therefore concerns discoverability and progression around a working capability. Do not remove the comparison grid, recipes, metrics, or explicit Apply/Undo contract in pursuit of a simpler first screen.

**Modules:** `src/components/Toolbar.tsx`; `src/components/Menus.tsx`; `src/components/Inspector.tsx`; `src/components/FilesPanel.tsx`; `src/components/Dialogs.tsx`; `src/components/controls.tsx`; `src/state/commands.ts`; layout/comparison state only when necessary; relevant docs sections.

**Recommended change:** keep an unmistakable basic path: select/edit, add/connect, undo, fit, save/export. Test whether a clearly named advanced entry improves orientation while preserving existing shortcuts and direct access; do not relocate the working comparison tools wholesale on heuristic judgment alone. Explain the difference between adjusting current positions and replacing them with an automatic recipe. Before Apply, say what scope changes and that Undo restores it. Unsupported source-mode properties should show a local reason before the user attempts the action.

**Acceptance:**

- The basic practitioner fixture can be edited, connected, tidied, undone, exported, and reopened without needing to understand timeline or layout brush.
- Compare opens candidates with clear scope, preview versus committed state, Apply, and a reliable Undo path.
- Current mode visibly explains unsupported properties; no control appears to accept a change that is then silently ignored.
- Example catalog and layout-test cases remain distinguishable. Shared example labels agree across Landing, Playground, Docs, and Editor.
- Dense diagrams remain readable using fit/zoom and selective inspection; a simpler toolbar must not remove useful advanced control.

**Docs/examples:** one focused example for “Tidy existing positions,” one for “Try/compare a new layout,” and one optional advanced brush/timeline walkthrough. Avoid generic engine lists as the sole teaching tool.

**Main risk:** hiding valuable tools from existing users based on an expert heuristic review. Test proposed grouping with a few realistic tasks; the audit did not measure novice comprehension or expert efficiency.

## M09 — Protect the assembled public experience

**Findings: regression protection for ranked findings F01–F14, with early focus on F01–F04; F15 remains UNRANKED, validation only. Disposition: Build the confirmed repair checks.** Attach minimal regression coverage to each behavioral repair, then make the full assembled-site proof a deployment gate. Verify the unknown clipboard outcome separately before deciding whether any repair belongs in that gate.

**Source gap:** existing site unit tests validate compiler fences, highlighter coverage, and accidental CSS nesting. CI's browser proofs target the local CLI Editor. The planned `scripts/prove-site.mjs` and `prove:site` script do not exist at the baseline, and deployment builds/uploads without such a gate.

**Modules:** new focused proof using the existing `scripts/lib/proof.mjs` conventions; `package.json`; `.github/workflows/deploy.yml`; `.github/workflows/ci.yml`; `docs/CHECKS.md`; existing tests where pure functionality belongs. `scripts/shoot.mjs` remains the screenshot helper, not the interaction proof.

**Recommended proof scope:** serve the actual `dist-site` artifact with the public base and nested Editor assets. Use disposable fixtures, ordinary pointer/keyboard actions, and observable UI readiness. Do not call `window.diagramStudio` or another internal API to perform the user action being validated. Internal read-only diagnostics may help explain a failure after the visible task fails, but they do not substitute for it.

**Required check families:**

- Entry/navigation: ordinary click versus direct load for Landing, Docs, Playground, Editor, and example destinations; anchors; refresh; Back/Forward.
- Identity: unique edited text and topology survive each handoff.
- Revision safety: invalid and pending source cannot produce mismatched editable images.
- Retention: browser copy, example scratch, shared source, local file, and formats behave according to their stated promises.
- Inclusion: desktop, 768, 390; focus, native activation, dialog exit, and source-editor escape.
- Failure reporting: screenshot, current URL/surface, viewport, action step, relevant app-origin console error, and expected/observed state. Filter unrelated extension noise rather than hiding all errors.

**Acceptance:** the proof catches the original ordinary-click route failure, false-save mode transition, current-source transfer omission, invalid-export mismatch, and any confirmed narrow-column regression in controlled failing fixtures, then passes the repaired artifact. Each fixture failure must be actionable. No arbitrary timeout or hidden API can manufacture success. Run meaningful unit checks plus the relevant browser proof; avoid rerunning every unrelated engine suite merely to validate prose.

**Docs/examples:** describe exact proof coverage and exclusions in `docs/CHECKS.md`. A screenshot inventory is not a claim of successful tasks. Keep browser families, touch, assistive technology, and CLI installation limitations explicit until exercised.

**Main risk:** flakiness from waits, rendering, and shared state. Use isolated disposable browser state, preserve the user's existing copy, wait for a named ready/result state, and keep the fixture set small enough to run before deployment.

## Common fixture and validation contract

Use one disposable source fixture for transitions and recovery, plus existing complex examples. Do not mutate a personal diagram or publish any fixture. The following is proposed input, not an executed experiment:

```draft
diagram "Audit handoff" version=1
# Keep this comment through source handoffs.
node start "Audit start"
node review "Audit review"
edge next start -> review "Check"
```

For recovery, change only `review` on the edge target to an undeclared identifier. For transfer, rename the visible label to a unique audit token and add a third node/edge. Verify both text identity and visible structure. Restore validity before testing successful round trips; keep a separate invalid fixture to prove raw-source recovery.

| Fixture family | Purpose | Existing source |
| --- | --- | --- |
| Minimal audit graph | Transfer, invalid input, export identity, keyboard creation | Proposed fixture above |
| Nested architecture | Group boundaries and visual/source handoff | `examples/checkout.draft` |
| Flat decision flow | Branch labels and simple layout | `examples/support-triage.draft` |
| Sequence and state | Different diagram semantics | `login-sequence.draft`, `order-lifecycle.draft` |
| Dense hierarchy | Fit, selection, navigation, scoped layout | `kubernetes-cluster.draft` |
| Bit/cell layout | Specialized layout and export legibility | `tcp-header.draft`, `billing-schema.draft` |

Each repair review should include a before/after screenshot, the action trace, and the recovered artifact for the affected journey. Report repeated failures separately from a one-time observed failure. A source-only risk becomes a tested observation only when the normal UI sequence is actually executed and its result captured.

## Deferred and rejected work

- **Defer new diagram kinds and more examples.** The existing population already covers the required learning range; repair findability and flow first.
- **Avoid an account system, remote autosave service, or enterprise document model for this repair.** Explicit local/browser identity and portable files can address the present project scope.
- **Avoid a cosmetic redesign as the first milestone.** Visual polish cannot repair a link that reaches the wrong surface or an editable export with mismatched content.
- **Avoid forcing all browser documents through lossy source conversion.** Preserve legacy JSON semantics and make supported modes explicit.
- **Defer a new docs framework or AI search.** The existing source-driven docs, topic groups, and client search provide practical repair seams.
- **Explore broad toolbar simplification with users.** Keep powerful comparison/timeline/brush tools and measure task discoverability before moving them wholesale.
- **Do not add a proof that only directly loads each URL.** It would miss the primary ordinary-link failure already observed.

## Questions for focused user validation

These questions do not block the concrete first repairs:

- After making a landing edit, do visitors expect to continue in the source Playground or visual Editor, and which label makes that choice predictable?
- Can visitors explain where an example edit, a browser draft, and a local CLI file are saved after reading only their on-screen statuses?
- Does “Tidy positions” communicate preserving the current arrangement, and does “Automatic layout” communicate a different operation?
- Can a novice choose sequence, state, flow, or cells from task descriptions without learning the whole language first?
- Can a keyboard user leave the source editor and canvas selection modes without consulting external documentation?
- Does an explicit “last valid drawing” label prevent confusion during errors without distracting normal typing?

Use a handful of concrete task attempts with first-time and returning diagram users. Record success, recovery, and misconceptions; do not turn this into a demand gate for the repository owner's requested repairs.

## Completion criterion

The repair program is complete when a visitor can make a useful browser-only change, find help, recover from an invalid line, continue in the larger surface with the same work, deliberately retain or export it, and reopen it with a truthful persistence status. Before closing the repair program, the same ordinary flow must be exercised at 390 px and 768 px and by keyboard; those narrow-width checks remain UNTESTED in the present audit. Any unsupported browser, assistive technology, format, or local-file workflow remains named as an explicit limit rather than absorbed into an average score.


## Source reference index and access status

All implementation references in this plan resolve to the fixed baseline, not current `main`. The source review had connected GitHub access; the live audit had a real interactive desktop browser. Published/source equality is unverified, and the 390/768 px tests remain UNTESTED. No implementation is included. The full file inventory and browser evidence are in [usability-audit.md](usability-audit.md).

- Navigation/build boundary: [site/main.tsx](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/main.tsx), [SiteNav.tsx](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/SiteNav.tsx), and [package.json](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/package.json).
- Current-source transfer and render/export revision: [LiveEditor.tsx](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/live/LiveEditor.tsx) and [Playground.tsx](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/play/Playground.tsx).
- New-document and storage mode: [actions.ts](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/src/state/actions.ts), [file-session.ts](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/src/state/file-session.ts), and [document.ts](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/src/state/document.ts).
- Mode-specific import/export: [files.ts](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/src/state/files.ts) and [site/reopen.ts](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/reopen.ts).
- Responsive source evidence: [site/site.css](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/site/site.css). CSS inspection does not substitute for the missing narrow browser checks.
- Deployment validation gap: [deploy.yml](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/.github/workflows/deploy.yml), [ci.yml](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/.github/workflows/ci.yml), and [CHECKS.md](https://github.com/byronwall/draftably/blob/ca96d3babd05041aaa206509090d023b02b61b5b/docs/CHECKS.md).

The observable acceptance checks above are proposed future validation. They are not a claim that those repairs or all those tasks were executed during this audit.
