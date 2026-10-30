# draftably usability audit: reviewed result

The core authoring tools work. The weakest parts are the transitions between editing surfaces and the promises about retained work. Fix those contracts before a broad redesign.

This review combines the [independent browser audit](browser-audit.md) with [Pro's full report](../assets/pro-results/2026-10-29-usability/usability-audit.md). The [repair plan](repair-plan.md) states the next work. The [issue register](issues.md) prevents duplicate tracking.

## What the evidence says

| Surface       | Assessment                                                                                                                        | Evidence                                                                                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing       | The headline and live source demonstrate the value well. The original continuation failed and omitted edits.                      | Both auditors reproduced these defects. Their tracking issues #250/#251 are now closed. A collection-time click reached Editor without reload.                                                                |
| Docs          | Strong reference breadth; weaker beginner progression and task retrieval. Overlay focus needs repair.                             | Pro visited all 20 topics. Both passes exercised live examples and search. Search/expanded drawings let focus reach hidden content.                                                                           |
| Playground    | A useful desktop source workspace. The initial narrow layout and export revision contract failed.                                 | Independent tests measured a 9px source pane at 390px and 768px. Pro inspected an exported SVG with mismatched source and picture. #249/#256 are now closed; current main contains the corresponding repairs. |
| Editor        | Label editing, connected creation, layout comparison, Apply, and Undo work. New-document mode and keyboard activation still fail. | Pro completed a three-node/two-edge SVG round trip. Collection-time checks reproduced the false New saving promise and Space interception.                                                                    |
| Whole product | Several useful tools share a brand but expose different document, storage, and format rules.                                      | Bare browser copy, scratch example, encoded source, and local files make different promises. Explain those differences at New, Save, Export, and Reopen.                                                      |

The initial scorecards are historical expert judgments, not user-study measurements. Do not apply their old scores to the latest deployment. Several fixes landed while Pro worked.

## Coverage and collection

The independent pass tested Chrome at 1512×697 and an isolated browser at 390×844, 768×900, and 1440×900. Pro operated cloud Chrome at 1363×936. Pro could not resize its browser. Its responsive limit does not erase the independent narrow-width observations.

Pro visited 20 documentation topics and rendered seven complete public examples from the 25-item catalog. It tested source editing, invalid input, recovery, visual authoring, layout comparison, Undo/Redo, refresh/history, and a source-bearing SVG round trip. It read 79 source files at the requested baseline. These are separate populations and activities.

The original bundle contains 127 files, including three reports and 49 screenshots. All 125 manifest entries passed byte-count and SHA-256 checks. README and the manifest itself are the two unlisted files. Every original was preserved unchanged. See the [asset index](assets-index.md). ZIPs remain ignored working files.

## Findings that change the next decision

**New is a real retention defect, not only unclear copy.** From Checkout, File → New diagram → Blank diagram claims browser saving. The new blank draft still carries Example Checkout identity and its URL. A renamed test draft disappears on refresh. Pro observed this, and collection reproduced it at `https://draftably.dev/app/?example=checkout`. Track [#305](https://github.com/byronwall/draftably/issues/305), separate from the ordinary scratch-reload warning in #265.

**Space activation remains broken.** Focus File and press Space: the menu stays closed. Enter opens it. The global handler prevents Space before checking canvas scope. Both Pro and collection observed this. Track [#306](https://github.com/byronwall/draftably/issues/306).

**Documentation overlays need one complete focus contract.** Search and expanded drawings both allow hidden background focus. Search also loses Escape handling after focus leaves its subtree. Track both under [#254](https://github.com/byronwall/draftably/issues/254). An expanded stale drawing also drops its error context; that separate status defect is [#308](https://github.com/byronwall/draftably/issues/308).

**Blank Playground transitions were intermittent.** Pro captured two failed dynamic imports and successful reload recovery. The independent pass had successful transfers. Keep the incident and missing error surface in [#304](https://github.com/byronwall/draftably/issues/304). The exact delivery cause remains unknown. Do not describe it as a universal outage or assert a cache cause.

## Recommendation dispositions

| Pro ID                           | Decision                                              | Reason and tracking                                                                                                                                   |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01: Editor navigation           | Build completed elsewhere; verify                     | #250 closed. Current main changes document-boundary links. A collection-time ordinary click succeeded.                                                |
| F02: Blank Playground transfer   | Build recovery; investigate cause                     | #304. Preserve incoming source through a failed lazy load. Current recurrence is unconfirmed.                                                         |
| F03: False New save promise      | Build                                                 | #305. Reproduced at the active domain; establish a truthful document/session transition.                                                              |
| F04: Mixed export revisions      | Build completed elsewhere; verify                     | #256 closed. Current main blocks invalid/pending image exports while retaining raw-source download. Preserve this bounded fix.                        |
| F05: Landing source transfer     | Build completed elsewhere; verify                     | #251 closed. Current main carries edited source. No second implementation is needed.                                                                  |
| F06: Overlay focus               | Build                                                 | #254. Search and Zoom share the same missing focus lifecycle.                                                                                         |
| F07: Space activation            | Build                                                 | #306. Scope canvas panning without overriding native buttons.                                                                                         |
| F08: Responsive cascade          | Confirmed historically; fix completed elsewhere       | U02 supplied actual 390/768 evidence. #249/#259 closed; source now has mobile pane tabs and stable names. Latest narrow behavior needs its own proof. |
| F09: Storage/format contract     | Build labels and tested guidance; Explore conversions | #264. Do not add compatibility layers or migrations without a concrete need and product decision.                                                     |
| F10: Browser-first lesson        | Build                                                 | #258. Finish a browser exercise through retained/reopened work before introducing local CLI setup.                                                    |
| F11: Reopen search               | Build                                                 | #261. Add task vocabulary and useful guidance; preserve exact DSL search.                                                                             |
| F12: Layout progression          | Explore grouping; Build local explanations            | #307. Keep the working preview, metrics, Apply, Undo, and shortcuts.                                                                                  |
| F13: Expanded stale context      | Build                                                 | #308. Expanding a previous valid drawing must not make it appear current.                                                                             |
| F14: Picker identity after Undo  | Build completed elsewhere; verify                     | #248 closed. Current `shownExample()` checks current source before naming the example. Do not turn successful Undo into a data-loss claim.            |
| F15: Copy-link clipboard         | Explore only                                          | Evidence is inconclusive. Do not file a confirmed defect from a tooling clipboard result.                                                             |
| U09: Return to learning surfaces | Build compact navigation                              | #260. Preserve current work when consulting help.                                                                                                     |
| U11: Catalog and blank start     | Explore consistent entry points                       | #262. Keep curated examples distinct from layout test cases.                                                                                          |
| U12: Teaching introductions      | Build completed elsewhere; verify                     | #263 closed. Do not duplicate the task-introduction work.                                                                                             |

Defer broad visual redesign, more examples, and a replacement docs platform. Avoid account systems, remote autosave infrastructure, and universal format conversion for this audit. They do not solve the demonstrated defects at this project's scale.

## Reconciliation against current state

The requested source baseline is `ca96d3babd05041aaa206509090d023b02b61b5b`. Collection fetched `origin/main` at `d6f359d`. Source changes confirm repairs for ordinary Editor links, edited landing transfer, Playground fitting, invalid export blocking, draft recovery, narrow panes, and accessible names. The closed issues support that status. They are not all independently retested here.

The GitHub Pages URL now redirects to `https://draftably.dev/`. Pro saw a late timeout there. Collection later loaded it successfully and reached Editor by ordinary click. The earlier timeout is a dated access limit, not a current outage claim.

Collection checked the decisive New and Space findings against baseline source, current main, and the active UI. It checked the invalid SVG specimen's metadata and Pro's console evidence. Original reports retain their source references and caveats. No follow-up message was needed.

The audit branch changes reports and evidence only. It does not implement fixes, merge, or deploy.

## Limits and open decisions

No participant study, screen-reader run, physical touch test, Safari/Firefox trial, storage-eviction trial, or full format matrix was completed. PNG and plain-browser SVG reopening remain incompletely tested. Product-displayed timings are not performance benchmarks.

Decide whether hosted New creates a retained browser draft or an explicit scratch session. Either choice must preserve the previous browser copy and match the visible promise. Decide the intended phone tasks before broader mobile design work. Test layout labels with concrete tasks before moving advanced controls.

[Pro conversation](https://chatgpt.com/c/6ae3f47c-fdec-83e9-b04d-cd8e9c170f2c). [Original priorities](../assets/pro-results/2026-10-29-usability/prioritized-fixes.md). [Original nine-milestone plan](../assets/pro-results/2026-10-29-usability/repair-plan.md).
