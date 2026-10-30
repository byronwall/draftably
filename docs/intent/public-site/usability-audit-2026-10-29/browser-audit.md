# Draftably published-site usability audit: independent browser evidence

Audit date: October 29, 2026, EDT. Target: https://byronwall.github.io/draftably/

Status: independent audit in progress. The separate Pro review is processing. This report preserves direct observations for later integration. It is not the completed Pro deliverable.

## Assessment

Draftably demonstrates a useful capability quickly: source becomes a diagram, and the diagram remains editable. The strongest product idea is the portable image that retains its source. Live documentation examples also support a good learning loop. A visitor can edit a docs example, continue in Playground, and open that source in the visual Editor.

The main weakness is continuity. The site has several editing surfaces, but their links, storage rules, examples, and learning paths do not form one dependable journey. Ordinary Editor links fail during client navigation. The landing demo does not transfer edited source. Playground breaks at phone and tablet widths. These failures outweigh the otherwise calm visual presentation.

The inferred audience is a developer or technical writer who wants diagrams under source control. A second audience is a browser-only visitor who wants to try the product before installing anything. Current onboarding serves the first audience much more clearly.

## Method and limits

The audit used ordinary visible links, buttons, menus, source entry, keyboard input, browser Back, reload, file download, and a file chooser. It did not use the editor debug API or change hidden application state.

Desktop interaction used signed-in Chrome at an actual viewport of **1512×697**. Responsive tests used an isolated browser at **390×844**, **768×900**, and **1440×900**. The Chrome viewport override did not change its measured viewport. Its screenshots must not be described as 1440×900. The isolated browser override did work.

The visible inventory includes four landing-demo tabs, eight landing gallery cards, 25 Playground examples, and 20 docs topics in five groups. The editor File menu also exposes 13 separate layout test cases. This pass directly examined the checkout architecture, sign-in sequence, order lifecycle, Kubernetes cluster, TCP header, and the cells examples in documentation. This covers nested architecture, sequence, state machine, and byte/bit/cell layouts. It does not cover all 25 examples.

Docs sampled directly: Get started, CLI details, Sequence diagrams, Cells, and Editing in the viewer. Search for `export png` was exercised with typing and Enter. Mobile Topics navigation and a diagram expansion were exercised. The audit also tested a custom two-node source, an invalid reference, a repaired source, and an edited docs example.

The browser-saved personal editor diagram was inspected without edits. Mutations used disposable scratch examples. Editor tests included selection, inspector label editing, connected-shape creation, undo, redo, source download, export-menu inspection, shortcuts, mobile More commands, and layout comparison. Comparison finished with six candidates in a reported 0.7 seconds. Applying the first candidate created one unsaved edit. Undo restored the scratch session to its original state. Timeline, brush, and a full keyboard-only creation journey remain to be tested.

An SVG download was verified on disk as `~/Downloads/docs-audit.svg`. The file chooser accepted that SVG for reopening; the source already matched, so this alone does not prove a fresh-state round trip. PNG export/reopening remains untested. A browser download-event timeout was a tooling issue: the downloaded file existed. It is not a product finding.

No representative users were observed. Scores are expert judgments based on the listed evidence. This is not a WCAG certification. Screen readers, touch gestures, pinch, reduced motion, browser text zoom, Safari, Firefox, offline behavior, and CLI installation were not tested.

## Provisional scorecard

| Category                         | Score /5 | Coverage | Basis                                                                                                   |
| -------------------------------- | -------: | -------- | ------------------------------------------------------------------------------------------------------- |
| Orientation and purpose          |        3 | Medium   | Clear source-to-diagram promise; unclear distinction between three editing surfaces.                    |
| Information architecture         |        3 | Medium   | Useful topic groups; duplicate CLI/theme labels and a technical onboarding route.                       |
| Learning flow                    |        3 | Medium   | Live examples work; installation precedes a browser-only first success.                                 |
| Diagram communication            |        3 | Medium   | Representative diagrams render; examples can begin clipped, and fitted mobile diagrams are tiny.        |
| Interactive examples             |        3 | High     | Docs-to-Playground transfer works; landing transfer and responsive Playground fail.                     |
| Navigation and wayfinding        |        2 | High     | Ordinary Editor links display the wrong application until reload.                                       |
| Visual hierarchy and readability |        4 | Medium   | Calm layout, useful code/drawing pairing; dense reference prose needs smaller teaching steps.           |
| Interaction quality              |        3 | Medium   | Undo/redo and connected creation work; fit and work-continuity problems recur.                          |
| Accessibility                    |        2 | Medium   | Search works with keys; expanded drawings leave focus behind the overlay; narrow icon links lose names. |
| Responsive experience            |        1 | High     | Playground source width collapses to 9px at both tested narrow sizes.                                   |
| Trust and coherence              |        2 | High     | Different storage and example models; edited landing work does not reach its destination.               |

No average is provided. The primary navigation and responsive failures should be fixed before visual refinements.

## Journey results

| Journey and success criterion                         | Result                                       | Evidence                                                                                                            |
| ----------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Understand the offer, then enter the full Editor      | Failed by ordinary link; recovered by reload | Landing primary link and Docs Editor link both show landing UI at `/app/`.                                          |
| Edit a docs example, then continue in Playground      | Success                                      | `Docs audit` and `Edited in docs` appeared in source and drawing after transfer.                                    |
| Create source, then use the visual Editor             | Success                                      | Two nodes and one edge opened from Playground through an encoded source URL.                                        |
| Rename, add a connected shape, undo and redo          | Success for sampled actions                  | Inspector edit changed the drawing; undo restored Start; redo restored the edit; add created a third node and edge. |
| Find PNG export instructions with search              | Partial                                      | Keyboard search worked, but the top result led into technical CLI metadata details.                                 |
| Consult Docs and return through Playground navigation | Partial                                      | Source resets to checkout. Browser Back recovers the encoded-source history entry after it has settled.             |
| Edit source at phone/tablet width                     | Failed                                       | Source pane is 9px wide at both 390px and 768px.                                                                    |
| Expand a docs diagram and use its controls with keys  | Partial                                      | Overlay opens; Tab moves to a hidden underlying Copy button.                                                        |
| Continue landing-demo edits in Editor                 | Failed                                       | The destination refers to the stock checkout example, not the edited source.                                        |

## Findings

### U01 — P1: Editor links change the address but leave the landing page visible

**Observed.** At 1512×697, start on the landing page and click **Open the editor**. The address becomes `/draftably/app/`, but the landing heading, demo, and installation content remain. The same result occurred from the Docs header Editor link and from the landing demo's Editor link. This was repeated across entry points.

**Expected:** load the full visual Editor. **Recovery:** reload the address. The actual Editor then loads. This recovery is not disclosed to visitors.

**Effect:** the main conversion path appears to do nothing. Visitors may think the landing demo is the complete editor or that the application failed.

**Source evidence:** `site/main.tsx` has a wildcard Landing route. `site/SiteNav.tsx` and `site/landing/Landing.tsx` use ordinary anchors to `appUrl()`. The observed behavior is consistent with client-router interception across two separately built applications. Confirm the exact routing mechanism before fixing it.

**Build:** make application-boundary links perform a full navigation. Test landing CTA, site nav, gallery cards, and docs links with actual clicks.

**Acceptance:** each ordinary link loads Editor controls on its first click, without reload. Back returns to the originating surface.

**Evidence:** `editor-link-shows-landing.jpg`; `landing-edited-open-editor.jpg`.

### U02 — P1: Playground becomes unusable below the desktop breakpoint

**Observed.** At 390×844, open Playground from Docs. The drawing occupies the left 148.20px. The Source region begins at x=148.20 and has a width of **9px**. Both regions have a height of 332.63px. Most of the viewport is blank. The default diagram fits at 11%.

At 768×900, repeat with a fresh Playground load. The Source region remains **9px** wide, at x=291.84. Its height is 356.16px. The diagram fits at 24%. This is repeatable at two widths.

**Expected:** a usable source pane and drawing, stacked or switched on narrow screens. **Recovery:** use a desktop viewport or leave Playground for the visual Editor. No in-product repair was found.

**Source evidence:** `site/site.css` first sets one column under `max-width: 900px`. A later unconditional `.play-body` rule sets three columns to `var(--split) 9px 1fr`. This explains the measured 9px source track after the mobile drawing order changes.

**Build:** resolve the CSS cascade and verify pane order, dimensions, header controls, scrolling, and source entry at 390, 768, and both sides of 900px.

**Acceptance:** both panes have usable width; source entry and error repair work; no unintended blank tracks remain.

**Evidence:** `playground-narrow.jpg`, `playground-768.jpg`, measured region rectangles above.

### U03 — P1: The editable landing demo links to the stock example

**Observed.** Replace the hero source with `diagram "Landing audit" version=1` and one node labeled `My landing edit`. Wait for that title and label in the rendered diagram. Click the adjacent **Open in the editor** link. Its destination remains `/app/?example=checkout`. After the U01 reload workaround, Editor opens **Checkout architecture**, not the edited source.

**Expected:** continue the diagram currently visible. **Recovery:** manually copy source into Playground, then use its working transfer button. The landing demo does not explain this recovery.

**Source evidence:** `site/live/LiveEditor.tsx` renders the link with `appUrl(id())`, independent of its `source()` signal. The docs example transfer already carries current source, showing a more coherent pattern exists.

**Build:** carry current source through the demo's primary continuation action. Preserve the stock example as a reset action.

**Acceptance:** edit a label and add a node in each hero tab, continue, and see those changes in Editor.

**Evidence:** `landing-edited-open-editor.jpg`, `landing-edit-lost-after-reload.jpg`.

### U04 — P2: New examples can open clipped at the wrong zoom

**Observed.** At 1440×900, switch from TCP header to Order lifecycle. The latter opens at 90%, clipping the right-hand states and routes. **Fit to view** changes it to 73%. Switch from Sign-in sequence to Kubernetes cluster. The cluster opens at 111%, with most of the nested structure outside the frame. Fit changes it to 60%.

**Expected:** fit each newly selected example to its completed drawing. **Recovery:** click the percentage control, whose accessible name is Fit to view. Work is preserved.

**Effect:** a curated example initially appears incomplete. Visitors must diagnose camera state before evaluating diagram quality.

**Source context:** `Playground.pickExample` changes `fitKey`, and `DiagramView` coordinates pending fitting with SVG updates. Treat the precise update-order cause as unconfirmed.

**Build:** fit once after the selected example's final SVG dimensions are available. Keep the camera stable for edits to the same example.

**Acceptance:** repeat small-to-large and large-to-small example switches. All drawing bounds begin inside the frame, and manual edits retain the camera.

**Repeatability:** observed on two different switches. **Evidence:** paired `example-order-lifecycle*.jpg` and `example-kubernetes*.jpg`.

### U05 — P2: Expanded documentation diagrams leave keyboard focus behind the overlay

**Observed.** On the Cells page at 390×844, activate the first **Expand the drawing** button. The overlay shows Fit and Close. Focus remains on the underlying expansion trigger. Press Tab: the active element is a **Copy** button in the page behind the overlay.

**Expected:** focus enters the expanded view and remains in its controls until closed. **Recovery:** pointer-click Close. Escape is advertised and implemented, but was not independently exercised in this pass.

**Effect:** keyboard users operate invisible background content while the diagram covers the screen. Screen-reader dialog context is also absent in the inspected accessibility snapshot.

**Source evidence:** `site/docs/Zoom.tsx` portals a generic div, hides body overflow, and handles Escape/0 globally. It does not establish a dialog, move focus, trap focus, or restore focus.

**Build:** use the existing dialog behavior or add the required focus lifecycle. Add keyboard zoom/pan controls where needed.

**Acceptance:** activation focuses a visible overlay control; Tab/Shift+Tab stay inside; Escape closes; focus returns to the trigger.

**Repeatability:** one direct keyboard test, supported by source. **Evidence:** `docs-expanded-narrow.jpg` and active-element observation.

### U06 — P2: Consulting Docs and returning through navigation resets Playground

**Observed.** Create source titled Audit persistence with a node Keep this work. Wait until the URL contains encoded source. Click Docs, then the header Playground link. Checkout architecture replaces the work. No resume choice appears.

**Recovery:** browser Back can restore the encoded-source Playground history entry after source has settled. A very fast departure before the 400ms URL update can lose that recovery path. The rapid-departure case was observed but requires a focused timing test before a broader data-loss claim.

**Expected:** the main navigation returns to the current working diagram, or clearly offers resume versus a fresh example.

**Source evidence:** `Playground.startingSource()` reads incoming source, hash, example query, then checkout. `SiteNav` always links to bare `/play`. The split ratio is stored, but the current source is not restored from that route.

**Build:** preserve a clear working-session entry across docs visits. Keep a deliberate New/example path separate.

**Acceptance:** type source, consult docs, return through the visible nav, and retain it. Repeat with refresh, Back, and forward navigation.

**Evidence:** `playground-own-source.jpg`, `playground-work-reset-after-docs.jpg`.

### U07 — P2: Get started makes installation look like the required first step

**Observed content; heuristic effect.** `/docs` opens Get started. Its first instruction is Install, with Node 22.21 and package commands. The page promises a first editor result in about two minutes. Browser-only trial is not presented as an equal first path, despite the working live example and Playground link farther down.

At phone width, this is especially mismatched: a visitor sees terminal prerequisites before reaching the usable demonstration.

**Build:** begin with a minimal browser exercise. Follow it with two explicit next steps: continue in browser, or save files locally with the CLI. Explain where work is saved before asking for a mode switch.

**Acceptance:** a new visitor can make and retain a diagram without installing Node, then explain why they might install the CLI.

**Evidence:** Get started text and `docs-narrow.jpg`. This is a learning-flow judgment, not measured abandonment.

### U08 — P2: Narrow navigation exposes an unnamed GitHub link

**Observed.** At 390px, the header GitHub icon appears in the accessibility snapshot as an unnamed link. At desktop width, visible GitHub text supplies its name. The Playground Theme combobox also loses its accessible name when the label text is hidden.

**Effect:** nonvisual users cannot identify these destinations or the theme control reliably. Pointer users must infer the icon meaning.

**Build:** give icon-only links and controls persistent accessible names independent of responsive text.

**Acceptance:** the same useful names appear in accessibility inspection at 390, 768, and 1440px.

**Source context:** `SiteNav` hides its text span responsively and marks the SVG `aria-hidden`. **Evidence:** narrow landing/docs/Playground snapshots and screenshots.

### U09 — P2: The editor lacks an obvious path back to the product's learning surfaces

**Observed; heuristic effect.** Landing, Docs, and Playground share a site header. The visual Editor replaces it with drawing tools. Its File menu offers creation, layout test cases, light/dark, and shortcuts. No Docs or Playground return action was found there or in the shortcuts dialog. The Close example link returns to `/app/`, not to the originating surface.

**Effect:** a visitor who needs a language answer or wants to return to source must use browser history. This compounds U06 and makes Editor feel like a separate product.

**Build:** add a compact, visible learning/return route that preserves current work. Avoid adding another full navigation row to the dense toolbar.

**Acceptance:** from a modified scratch example, reach the relevant help and return without losing edits. State any source-editing limitation before the transition.

**Coverage:** inspected header, File menu, shortcuts, and scratch banner; not every editor panel. Do not claim no such route exists anywhere.

### U10 — P3: Search can retrieve implementation detail before task guidance

**Observed.** Search `export png` returns six sections. The first is CLI details → Source in exported images. Enter opens a section about embedded source, PNG chunks, and SVG metadata. An actual `inspect --png` command appears in a separate result. No browser export task guide appears among these results.

**Strength:** search focuses its input, marks matches, supports Enter, and deep-links correctly. Preserve these behaviors.

**Build:** add a short export/reopen guide with browser and CLI steps. Tune task queries toward action instructions before format internals.

**Acceptance:** export png, save diagram, and reopen image each return an actionable first result for browser visitors.

**Evidence:** `docs-search-export-png.jpg`; `/docs/command-line?q=export%20png#source-in-exported-images`.

### U11 — P3: Parallel example catalogs obscure the next learning step

**Observed; heuristic effect.** Landing advertises 25 examples and shows eight cards. Playground exposes the 25 in a searchable title picker. The full Editor File menu instead prominently exposes 13 Layout test cases, including Overlap repair and Feedback & islands. These have a different purpose from polished product examples.

The picker is useful, but a beginner's two-node start is hidden behind a button titled Checkout architecture. A new visitor must discover that a document-title control is also the new/open/example control.

**Build:** expose a small New action and make the curated gallery consistent. Keep engineering test cases under a clearly secondary area.

**Acceptance:** a visitor can start blank or pick the same named example from each surface without learning separate catalogs.

### U12 — P3: Reference pages describe renderer details before the learner's task

**Observed content; heuristic effect.** Sequence diagrams begins with a long paragraph about participant order, lifelines, message wrapping width, self-messages, and sizing before the first runnable example. Cells combines the concept, geometry rules, edge behavior, editor operations, database tables, and binary layouts on one page. Editing in the viewer primarily maps gestures to source statements and disk revisions.

These details are useful reference material. They do not provide a short task sequence for someone learning to make or repair a diagram.

**Build:** add a short purpose statement and one concrete exercise before deep rules. Link specialized reference details below. Use page summaries and task headings to support scanning.

**Acceptance:** each page supports a one-sentence purpose, a minimal runnable example, and one suggested edit with a visible expected result.

**Evidence:** `docs-sequence.jpg`, Cells and Editing in the viewer inspected content.

### U13 — P3: Saved-work models require more explanation than their labels provide

**Observed labels; inferred confusion risk.** The standalone Editor says Saved. A source/example session says Example · not on disk and later Example · unsaved edits. Playground retains source in a URL hash and offers Copy link/Download. The CLI instructions describe automatic disk saves. The scratch banner explains its own mode well, but there is no shared explanation of all four cases.

**Build:** use consistent status language that says where work is retained. Provide one concise save/share/reopen guide and link it from export controls.

**Acceptance:** users can identify whether closing a tab, reopening a bare URL, moving hosts, or sharing a link preserves their current work.

This finding does not assert that the existing Saved indicator loses browser data. That behavior was not tested on the user's personal diagram.

## Strengths to preserve

- The headline states the core benefit in ordinary language.
- Side-by-side code and drawing explain the text-to-diagram relationship directly.
- Edited docs source transfers correctly to Playground, and Playground transfers correctly to Editor.
- Diagnostics identify an error line, and clicking the diagnostic focuses source. Invalid source retains a dimmed last-good drawing.
- The scratch-copy banner changes after edits and tells the user to save a file.
- Undo/redo and connected-shape creation worked in the sampled visual editing journey.
- Search supports keyboard selection and deep links. Mobile Topics exposes the full topic inventory and closes after a selection.
- Example descriptions explain the diagram type, not just its subject.
- The mobile Editor has a compact Add/Connect/Properties/Fit/More toolbar. It adapts more deliberately than Playground.
- Comparison explicitly says Preview only · Apply to keep, and exposes queued/computing status.
- SVG and PNG export menus explain that source is included and images can reopen. The downloaded SVG existed on disk.

## Recommended order

1. **Build:** fix U01, U02, and U03. Prove primary navigation, phone/tablet source editing, and source transfer first.
2. **Build:** fix U04–U06 and U08. Restore predictable camera state, accessible overlays, persistent names, and working-session continuity.
3. **Build:** revise onboarding and the save/export guide. Explain browser versus local-file modes before advanced language details.
4. **Explore:** a compact common product shell and one curated example catalog. Prototype the return path without expanding the editor toolbar.
5. **Defer:** decorative polish until the journey works. Preserve the existing calm layout and fast direct feedback.
6. **Avoid:** replacing the docs framework as a response to these findings. The problems are specific content, navigation, state, and CSS defects.

## Evidence storage

Screenshots are in ignored `tmp/evals/website-experience-audit/2026-10-29/`. They will be attached to the final audit PR with `gh --attach`. They are not source assets and must not be committed. Original Pro result materials will be preserved separately as required by the Pro handoff skill.

The next integration pass must reconcile this report with Pro's findings, complete or explicitly bound remaining journeys, and record a final repair plan.
