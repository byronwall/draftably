# Sequence design: validation record

**Result:** the design mission obtained the exact baseline, passed all 52 selected existing tests, reproduced four concrete defects through the real compiler/model/translator, and produced an actual baseline-rendered current-language alternative. The future designs remain proposals. Browser execution was blocked by Chromium provisioning; the delivered PNG companions are explicitly documented SVG rasterizations.

## 1. Baseline, access, and integrity

The fixed repository baseline is **`2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4`**, captured on **2026-10-30**. The supplied `sequence-source-packet.txt` is authoritative. Its source note was captured separately on that date and is design input rather than evidence that every criticism applies to this commit.

All **34 packet files were read in full across the research team**, including the complete source note. A pristine GitHub archive of the named commit was then downloaded into a temporary verification checkout. The packet’s **33 repository files matched the archive** after removing separator trailing newlines. The note was correctly excluded from this equality check. The same 33 files remained unchanged after verification. This establishes exact scoped source access; it does not claim that every file in the complete repository was read.

The supplied `baseline.png` is an actual render, not a redesign. Its delivered copy, `baseline-supplied.png`, was verified byte-identical. Both have SHA-256:

```text
c014d1e5809ea2d741487f71b96c09fa23bc4a6a9ea729a9f54092e0cb37cd1f
```

The public deployment was not used to establish baseline behavior. No product source was changed, committed, pushed, or deployed. Dependency installation and ordinary CLI build output stayed in the temporary checkout. Analytical probe modules were outside repository source and tests.

## 2. Environment and executed checks

| Item | Actual execution |
| --- | --- |
| Node | **v24.22.1**; package requires Node ≥22.21.0. |
| pnpm | **11.25.0**; package declares **11.9.0**. This tool-version difference is disclosed rather than presented as an exact environment match. |
| Dependency installation | `pnpm install --frozen-lockfile --ignore-scripts --store-dir <scratch-store>` succeeded. |
| Selected existing tests | **52 passed, 4 files passed**; Vitest reported 927 ms. |
| Baseline CLI | Real `inspect --json` and `inspect --svg` succeeded. |
| Current-language companion | Real `check`, JSON inspection, and SVG export succeeded: 4 nodes, 0 groups, 7 connections. |
| Additional probes | Real compiler, projection, model deletion, and translation modules executed from the pristine baseline. |

The exact test selection was:

```sh
pnpm exec vitest run tests/sequence.test.ts tests/edge-labels.test.ts tests/dsl.test.ts tests/translate.test.ts
```

The frozen install used the repository lockfile, and disabling lifecycle scripts limited installation side effects. Successful targeted tests and CLI compilation show that the required paths worked in this environment; they do not establish that every package lifecycle hook, installed-package workflow, or release gate was exercised.

**Not run:** full `pnpm check:fast`, `pnpm check`, engine/release/package suites, live editor interaction, file-session/browser undo proofs, performance benchmarks, accessibility audits, Safari/Firefox/touch tests, competing-tool execution, or a reader study. Proposed syntax was not compiled.

## 3. Observed baseline geometry

The real baseline CLI SVG has **741 × 554 logical units**, viewBox `-76 -124 741 554`. The supplied PNG is **1482 × 1108 raster pixels**. This is consistent with a 2× raster; it does not prove pixel-for-pixel equivalence with a newly generated image. Raster dimensions must not be mistaken for layout dimensions.

| Geometry | Observed value |
| --- | --- |
| Lane centers, User / Web app / Auth service / User store | **68, 249, 393, 537** |
| All four participant headers | **104 × 56** |
| Message rows m1–m7 | **92, 128, 164, 200, 236, 294, 330** |
| m5 self-loop return | **258** |
| Sequence panel | **x−36, y−20, w661, h410** |
| m5 label rectangle | **x433, y235.5, w147, h23** |

The self-label occupies x433..580 and crosses the User store lifeline at x537. It remains inside the panel’s right edge 625. The demonstrated defect is therefore a label obscuring another lane, **not clipping**.

The four-point self-loop is already attached at both ends. Continuous shafts, wrapped above-line message labels, measured participant widths, subdued header accents, authored phases, and named emphasis states also exist. These were source-audited and must not be advertised as wholly new capabilities. Relevant anchors are `src/dsl/compile.ts: participantWidth/sequenced`, `src/model/labels.ts: edgeLabelSize`, `src/model/routes.ts: messageRoute/drawRoutes`, `src/model/colors.ts: participantAccent`, and `src/cli/svg.ts: sequenceBackdrop/statesSvg`.

Exact-ref `src/model/bounds.ts: drawingBounds` includes the panel, route ink, and label boxes. A rightmost self-label can enlarge the outer export while escaping the inner panel. `src/model/frame.ts: diagramFrame` treats authored frame width as a minimum, not a fitting constraint.

## 4. Reproduced counterexamples

### 4.1 Distant-label constraint: valid source, insufficient span

The following fixture was actually checked and exported by the baseline. Width 40 is supported; width 20 would be invalid.

```text
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
```

Observed centers are **36, 116, 212**, with adjacent distances **80 and 96**. The label wraps into 14 M characters and five M characters. Its box is **176 × 40**, at x36, y39. The intended requirement is the padded label width plus `SEQ_LABEL_RUN`: **176 + 16 = 192**. Actual A→C span is **176**, short by **16**. Current `check` reports OK.

`src/dsl/compile.ts: sequenced` constrains only the final adjacent gap to 192/2=96, although the earlier gap is 80. The proposed M1 recurrence uses the actual earlier center and gives **36, 116, 228**: total span 192, label x44..220, and eight units of endpoint clearance.

The later M2 label-slot policy is a different, **unimplemented** contract. With header-only base geometry and its documented tie-left rule, it assigns the label to the first crossed gap, giving proposed centers **36, 228, 308**. M1 and M2 expected values are analytically specified acceptance targets, not observed outputs of changed product code.

### 4.2 Valid hierarchical order is ignored

This fixture also compiles without diagnostics:

```text
group g "Related"
node a "A" in=g
node b "B"
node c "C" in=g
order root g b
layout root sequence
edge e1 a -> b "message"
```

The valid root order asks for G before B, implying A, C, B with the current member order. Actual lanes are **B, A, C**. The sequence pass resolves root order IDs against nodes and overlooks the group ID. This is distinct from `order root a b c`, which the parser correctly rejects because A is not a direct child of root. See `src/dsl/syntax.ts: validateReferences` and `src/dsl/compile.ts: sequenced`.

### 4.3 Interleaved phase memberships become overlapping bands

Executed source:

```text
node a "A"
node b "B"
node c "C"
edge e1 a -> b "first"
edge e2 b -> c "second"
edge e3 c -> a "third"
phase p "Outer narrative" e1 e3
phase q "Interleaved narrative" e2
layout root sequence
```

The baseline accepts it without diagnostics. Rows are **92, 128, 164**. Phase P is **y65, h107**, spanning 65..172; Q is **y101, h35**, spanning 101..136. Q therefore lies inside P despite the disjoint declared event memberships. Duplicate membership validation is not sufficient to guarantee contiguous narrative phases. Proposed rejection or explicit split-phase authoring is not implemented.

### 4.4 Deleting a phased edge leaves an invalid reference

The analytical module projected the preceding source, cloned the document, applied `src/model/edits.ts: deleteObjects(after, ['e1'])`, and passed before/after documents through actual `src/dsl/translate.ts: translateEdit` and `printSource`.

Translation removed the e1 declaration but retained:

```text
phase p "Outer narrative" e1 e3
```

Actual `checkSource` rejected the result:

```text
DslError: Line 6: Unknown message e1 in phase p; a phase lists edge IDs.
```

This is an executed compiler/model/translator reproduction. Source inspection of `src/state/file-session.ts: handleEdit/snapBack` establishes that this invalid edit would be rejected and the valid source shown again. It was **not** reproduced through interactive browser gestures, and no invalid source was saved.

## 5. Final current-language companion

`sign-in-current-language.draft` uses only supported baseline syntax. It preserves four participants and seven facts, adds three authored phases, applies compact vertical padding, wraps the hash-check label, and explicitly sizes the store header to reserve space. A short subtitle gives the takeaway; a supported generic frame note carries success scope, order-not-time wording, and dashed-result notation.

The final real CLI output is **834 × 581** logical units; its PNG is **1668 × 1162** pixels. The store center is 626, and the self-label spans 502..616, leaving **10 logical units** of clearance. All participant headers are 32 units tall; the store’s 144-unit width is an explicit authoring workaround rather than a renderer fix.

Messages remain 12.5 logical units. At whole-image display widths 900, 1000, 1100 pixels, their effective size is **13.49, 14.99, 16.49 pixels** respectively. The original baseline is about 16.87 pixels at 1000, but lacks the added framing and phase explanation. The alternative is not claimed to make every metric better; it demonstrates useful improvements already available through authoring.

The final source passed `check` and both inspections. Its raster was visually inspected for lane identification, label clearance, phase boundaries, scope visibility, and retention of the seven facts. The raw CLI SVG remains authoritative for generated geometry.

## 6. Browser limitation and visual artifact provenance

The documented command `pnpm shoot examples/login-sequence.draft tmp/sequence-verification.png` was attempted. It stopped because the expected Chromium executable was absent. Installing the locked Playwright 1.64.0 headless shell—browser 156.0.8078.4, revision 1248—failed when its download repeatedly returned invalid or truncated ZIP data. No browser screenshot, live editor proof, or browser/PNG parity proof was obtained. This is an environment limitation rather than a failing renderer assertion.

PNG companions were instead produced using **Sharp/libvips SVG rasterization**. The project’s bundled Inter WOFF 2 files were decoded to TTF with fontTools/Brotli in scratch and resolved through local fontconfig aliases. This avoids a casual font substitution; it does not make libvips rendering identical to Chromium.

| Companion | Provenance and final PNG dimensions |
| --- | --- |
| `baseline-supplied.png` | Unmodified supplied actual render; 1482×1108. |
| `sign-in-current-language.png` | Actual baseline CLI SVG rasterized at 2×; 1668×1162. |
| `sign-in-engineering-proposal.png` | Original manually authored design SVG; 1000×766. |
| `sign-in-overview-proposal.png` | Original manually authored three-card explanation; 1000×650. |
| `sign-in-failure-companion-proposal.png` | Hypothetical comparison scaffold with unknown continuation; 1000×790. |
| `sequence-collapse-proposal.png` | Original exploration mockup with three hidden events counted; 1000×736. |

All companion PNGs were visually inspected. The three proposed sequence mockups place m1 at y260. Future SVGs and `visual-spec.json` are inspectable design studies, not golden outputs from an implemented future renderer. `sign-in-proposed-language.draft` remains explicitly unsupported future syntax.

## 7. Source persistence and other proof boundaries

Source review, rather than browser execution, confirmed these contracts:

- `src/state/document.ts: transact/commit` records a changed document once; source sessions replace snapshot history with source history.
- `src/state/file-session.ts: handleEdit/showSource/historyStep` validates translated source, reprojects, and restores recorded source for undo/redo. External revisions reset local history.
- `src/state/actions.ts: chooseTheme` replaces the appearance object. Ordinary browser-document mode loses optional explanation metadata. In file mode, `src/dsl/translate.ts` removes subtitle and explicit width; unchanged note/legend/state declarations can return during projection. No claim is made that every source annotation is deleted.
- `src/state/actions.ts: toggleCollapse` treats container collapse as transient view state in file mode. This does not implement narrative phase collapse.
- `src/state/debug-api.ts: diagnostics` exposes the browser snapshot history depth, not the separate file-session history depth. Future file proofs should check exact source restoration and `canUndo`/`canRedo`.

Marker, persistent stroke-width, and neutral-outline discrepancies identified in the report are source-based findings. Their repair and browser parity are proposed work. The three-line self-label overlap case, compact bottom-aligned headers, semantic actions, response-aware focus, bounded phase gutters, honest collapse, and mobile exploration also remain proposed or analytically specified, not implemented or user-tested.

## 8. Reproduction appendix

Use a pristine checkout of the fixed commit and the delivered source files. The following run sheet reproduces the executed test selection and CLI checks; its last command describes the attempted browser route and requires a working Chromium installation. The three small source fixtures above can be saved under `tmp/` and inspected in the same way. Do not compile the future-language example as though it were supported.

```sh
# In a pristine checkout of 2f210ce4aa92593d7cafa9c514bb4ab3808dd2a4.
# The recorded run used Node 24.22.1 and pnpm 11.25.0; the package declares pnpm 11.9.0.
sequence_assets_dir=/absolute/path/to/downloaded-assets
sequence_store_dir=/absolute/path/to/scratch-pnpm-store
mkdir -p tmp
pnpm install --frozen-lockfile --ignore-scripts --store-dir "$sequence_store_dir"

# Existing tests: the recorded execution passed 52 of 52.
pnpm exec vitest run tests/sequence.test.ts tests/edge-labels.test.ts tests/dsl.test.ts tests/translate.test.ts

# Actual baseline geometry and SVG.
node scripts/draftably.mjs inspect examples/login-sequence.draft --json > tmp/baseline-geometry.json
node scripts/draftably.mjs inspect examples/login-sequence.draft --svg > tmp/baseline.svg

# Supported authored alternative.
node scripts/draftably.mjs check "$sequence_assets_dir/sign-in-current-language.draft"
node scripts/draftably.mjs inspect "$sequence_assets_dir/sign-in-current-language.draft" --svg > tmp/current-language.svg

# Attempted during the mission; blocked by Chromium provisioning, not a test failure.
pnpm shoot examples/login-sequence.draft tmp/sequence-verification.png
```

## 9. Complete packet read inventory

```text
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
```

Additional exact-ref reads covered font measurement/data, shape defaults, DSL frame constants, source-edit helpers, export bounds/framing, document state, file sessions, and targeted model-edit/build/screenshot paths used by the probes. The separate design report identifies source symbols and primary research. This validation record establishes which claims were executed, source-audited, visually inspected, or left as proposals; it does not convert proposed acceptance tests into completed work.
