# Draftably usability audit — 30 October 2026 UTC

Start with usability-audit.md, then prioritized-fixes.md and repair-plan.md.

The reports contain the scope, confidence labels, exact reproduction receipts, fixed GitHub source baseline, and explicit limits. Relative evidence links work after extracting this ZIP.

The evidence folder contains browser screenshots and state/content captures, two verified SVG exports, a copied .draft source specimen, and supplemental session notes. Early text captures may be accessibility diffs. Stable replacements are named with a b suffix where immediate screenshots captured an earlier paint. Those transient images are excluded.

invalid-source-export.svg is an intentional diagnostic specimen: its picture is from the last valid render but its embedded source includes the deliberately invalid missing endpoint. It is evidence of F04, not a recommended diagram to reuse.

audit-lesson-export.svg is the verified successful source-preserving SVG round trip. audit-lesson-copied-source.draft was obtained through Copy Draftably source; it does not prove the separate Download .draft action succeeded.

390px and 768px were not tested. At the final access check around 03:15 UTC, the supplied GitHub Pages routes redirected to draftably.dev and this browser received an upstream timeout. Current deployment behavior is not revalidated. No implementation was performed.

manifest.json records sizes and SHA-256 values for packaged report/evidence files.
