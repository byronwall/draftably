# draftably usability repairs: reviewed plan

This is a plan for review. It does not authorize implementation. Read the [summary and dispositions](summary.md), [issue register](issues.md), and [original Pro plan](../assets/pro-results/2026-10-29-usability/repair-plan.md).

Several historical failures were fixed while the audit ran. Start each slice by checking its current tracking issue and deployed behavior. Skip repairs already proved complete. Do not rebuild the baseline defects on this report branch.

## 1. Verify the current journey

Use the active `https://draftably.dev/` deployment and an isolated audit diagram. Confirm ordinary Editor entry, edited-source continuation, Docs transfer, example fitting, invalid export blocking, and narrow pane operation. Cover desktop, 390px, and 768px. Record the actual viewport.

These map to closed issues #248–#251, #256–#257, and #259. Collection already confirmed ordinary Editor entry. Current main contains the other repairs; that source check is not a complete deployed browser proof.

If a lazy module fails, preserve the source and show recovery. Track diagnosis and the failure surface in [#304](https://github.com/byronwall/draftably/issues/304). Inspect the actual failing response before choosing a deployment fix.

**Modules:** `site/main.tsx`, `SiteNav.tsx`, `Playground.tsx`, `DiagramView.tsx`, build assembly, and deploy workflow. **Risk:** fixing an assumed cache cause without evidence. **Proof:** normal clicks and controlled failed-load recovery; direct URL checks alone are insufficient.

## 2. Correct New-document mode and retention

Resolve [#305](https://github.com/byronwall/draftably/issues/305) before promising durable browser work. One direct transition must own the source-session exit, URL identity, storage choice, and history behavior. Preserve the prior browser copy. Use mode-derived confirmation text.

**Modules:** `src/state/actions.ts`, `file-session.ts`, `document.ts`, `launch.ts`, and `StartScreen.tsx`. **Proof:** example → New → rename/add → refresh matches the promised persistence. Cancel retains the example. Existing browser work remains recoverable. **Risk:** silently replacing the single browser slot.

Keep the separate scratch-reload warning in #265 distinct. Do not add a multi-document database merely to fix New.

## 3. Repair native activation and overlay focus

Resolve [#306](https://github.com/byronwall/draftably/issues/306) by limiting Space-pan to the canvas gesture context. Resolve [#254](https://github.com/byronwall/draftably/issues/254) for Search and Zoom together: initial focus, inactive underlay, contained navigation, Escape, and return focus.

**Modules:** `src/state/keyboard.ts`, `site/docs/Search.tsx`, `Zoom.tsx`, and the existing dialog pattern. **Proof:** Space/Enter on native buttons; canvas Space-drag; Tab/Shift+Tab/Escape in empty/results/no-results search and expanded drawings. **Risk:** breaking practiced creation/connect shortcuts. Add only focused regression coverage.

## 4. Preserve stale-preview context

Resolve [#308](https://github.com/byronwall/draftably/issues/308). Pass validity context from the docs example into Zoom. Name the picture as the last valid drawing while the current source has errors. Clear the notice after successful repair.

**Modules:** `site/docs/Example.tsx` and `Zoom.tsx`. **Proof:** valid → invalid → Expand → return/repair → Expand. **Risk:** hiding useful drawing content with excessive error UI. Preserve the last-good preview.

## 5. Explain storage and supported editable artifacts

Resolve [#264](https://github.com/byronwall/draftably/issues/264) in bounded slices. Name browser draft, unsaved example, source link, and local file at the relevant controls. State the actual downloaded format and reopen target.

**Modules:** toolbar/banner/menu labels, `commands.ts`, `files.ts`, and one save/reopen guide. **Proof:** a small supported-mode matrix using disposable content; compare visible status with refresh and reopened output. **Risk:** promising universal interchange without testing it.

Explore any conversion or migration separately. The audit does not justify new compatibility layers or force all legacy documents through source conversion.

## 6. Complete the browser-first lesson and retrieval

Resolve [#258](https://github.com/byronwall/draftably/issues/258) and [#261](https://github.com/byronwall/draftably/issues/261). Start with a no-install edit, an error and repair, visual continuation, export, and reopen. Offer local CLI as the explicit route to repository files. Make reopen/resume/export queries find the relevant task.

**Modules:** `site/docs/pages/get-started.md`, the new save/reopen guide, `content.ts`, and `find.ts`. **Proof:** follow only the written controls in a fresh session through a reopened editable result; retain exact DSL searches. **Risk:** duplicating the syntax reference. Keep `docs/DSL.md` authoritative.

Preserve the task-introduction work already closed in #263 and crossing guide in #275.

## 7. Explain layout choices before restructuring tools

Use [#307](https://github.com/byronwall/draftably/issues/307) for local scope, preview, and Undo explanations. Explore broader grouping through task attempts. Preserve working comparison pictures, recipes, metrics, Apply, and shortcuts.

**Modules:** toolbar/menu/inspector labels and Layout tools docs. **Proof:** on a simple flow and a nested architecture, users can choose an action, predict scope, and reverse it. **Risk:** hiding useful capability based only on expert judgment. #274 owns automatic-preview fitting separately.

## 8. Connect help, source, and curated starters

Resolve [#260](https://github.com/byronwall/draftably/issues/260) with a compact learning/return route. Explore [#262](https://github.com/byronwall/draftably/issues/262) to make a blank start and curated examples consistent. Keep diagnostic samples secondary.

**Modules:** Editor menus/help, source return actions, and example entry points. **Proof:** consult help and return to modified work; start blank and find the same named example across surfaces. **Risk:** adding more toolbar clutter or losing work during a mode change.

## 9. Protect the repaired assembled experience

Attach meaningful checks to each behavioral repair. Then add a small production-artifact journey proof using existing proof conventions. Exercise ordinary links, edited-source identity, invalid export recovery, New persistence, keyboard focus, and representative narrow layouts.

**Modules:** proof script, package scripts, deployment check, and `docs/CHECKS.md`. **Proof:** the old failure sequence fails before its fix and succeeds afterward. Keep screenshots, the failed step, URL, and relevant console error. **Risk:** a large flaky test matrix. Use few fixtures and observed readiness states.

Keep broader format/browser/assistive-technology coverage explicit as untested until exercised. Do not add accounts, remote autosave, a docs-framework replacement, or a visual redesign to this repair program.
