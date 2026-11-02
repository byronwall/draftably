# Supplemental browser receipts and artifact limits

These notes preserve browser outcomes whose transient screenshot/download files were not available at packaging time. They are transcriptions of the audit interaction, not reconstructed screenshots. All tests were in real interactive Chrome at 1363 × 936 CSS pixels, DPR 1, on 30 October 2026 UTC.

## E43 — Edited Playground refresh: observed earlier in the session

1. Open Support ticket triage from the Playground example picker.
2. Select `Ticket received` in the visible source and type `Audit ticket`.
3. The diagram visibly changes and the address acquires an encoded `#s=` source value.
4. Reload that address. The immediate accessibility snapshot is initially only the page container; the following observation shows the source and rendered triage with `Audit ticket` intact.
5. A screenshot of this state was displayed during the browser call, but its intended E43 JPEG/text files were not available in the final workspace. No nonexistent E43 image is supplied.

Subsequent independent saved evidence [E45](E45-example-switch-undo-recovery.jpg) shows the same edited source/render restored by source Undo, and [E46](E46-history-restores-edited-triage.jpg) shows it after Docs/Back/Forward navigation. These images do not, alone, prove the earlier reload action; the action record above supplies that context.

At approximately 03:15 UTC, a final reload attempt redirected the GitHub Pages Playground URL to `https://draftably.dev/play/#s=…` and displayed an upstream connection timeout. That later access condition is separately captured in [E51](E51-late-redirect-timeout.jpg) and does not establish a source-retention result at the new origin.

## E44 — Plain-browser SVG export/reimport: inconclusive file access

1. The unmodified plain `/app/` document displayed `Saved`, seven shapes, eight connections, and the title Automatic ports — review flow.
2. Save and export → Export SVG opened a preview. The dialog had no selection, Canvas background, and title/subtitle/key enabled.
3. Export SVG returned a download event/path and a visible `SVG export created` toast.
4. The returned file was not readable from the exported-file workflow; the later filesystem read reported `ENOENT`. No verified bytes for this plain-browser SVG are included.
5. Two landing file-picker attempts, using the staged/original path, left the landing page displayed. The browser console included `NotFoundError: A requested file or directory could not be found at the time an operation was processed.` An application error entry had timestamp `2026-10-30T03:00:27.861Z`.
6. No site message established that an accessible valid legacy SVG had been rejected. The task is therefore **inconclusive due to file access**, not an observed format incompatibility. Source review predicts different format contracts, which still need an actual interoperable artifact test.

[E44b](E44b-browser-svg-reopen-feedback.jpg) shows the unchanged landing view. [E50](E50-browser-mode-save-menu.jpg) independently records the browser mode's save/export wording. Browser-extension metadata errors were ignored as unrelated to Draftably.

The earlier `.draft` download action also returned a path that could not be read. The separate Copy Draftably source action succeeded, and its actual text is saved as [audit-lesson-copied-source.draft](audit-lesson-copied-source.draft).

## Verified artifact distinction

Two SVG byte artifacts are actually available and inspected:

- [audit-lesson-export.svg](audit-lesson-export.svg): valid source-mode Editor export, 82,430 bytes; reopened through Landing successfully with three nodes/two connections.
- [invalid-source-export.svg](invalid-source-export.svg): Playground export, 66,969 bytes; invalid current source embedded alongside the last valid picture.

Do not generalize the missing plain-browser download file to those two verified artifacts, or generalize the successful source-mode SVG to every export format.

## Late access update — approximately 03:15–03:16 UTC

Reloading the original GitHub Pages Playground address redirected to `https://draftably.dev/play/#s=…` with the encoded source still in the address. The browser displayed `upstream connect error or disconnect/reset before headers. reset reason: connection timeout`.

A separate reload of the original GitHub Pages landing route redirected to `https://draftably.dev/` and displayed the same connection-timeout text. [E51](E51-late-redirect-timeout.jpg) and [E52](E52-late-landing-redirect-timeout.jpg) preserve these states.

This is a late access limit in this browser. It is not evidence of bot detection, permanent site unavailability, the specific cause of earlier lazy-module errors, or verified behavior of the new deployment. The earlier tested session remains the basis for F01–F14; current deployment identity and current regression status are unverified.
