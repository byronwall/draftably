---
title: 'Diagram themes — implementation plan'
slug: 'diagram-themes'
phase: plan
status: current
last_updated: '2026-10-15'
---

# Diagram themes — implementation plan

## Plan at a glance

Prove Fieldnotes first because its serif titles expose the main sizing problem. Carry one theme through source, compiler, browser, and export before adding four more. This gives a useful editorial diagram without building the whole collection first.

The repository separates appearance across fixed palettes, CSS, SVG components, and a second CLI renderer. It also separates compiler line counting from browser text measurement. Adding a picker first would hide these differences. The first milestone must make them agree for one real diagram.

Next, complete the five presets and source overrides. Then add the compact chooser and diagram-wide padding controls through the existing edit and undo paths. Keep source editing as the first customization surface. A theme editor is unnecessary for proving design-system matching.

This is a plan, not execution. No application checks have run for these proposed changes. The concept sheet was rendered and inspected. Planning validation is separate from product verification.

## Implementation strategy

- **First proof:** One saved Fieldnotes diagram displays serif titles with correct padding and matching CLI/browser geometry.
- **Primary seam:** A shared resolved appearance object supplies color, content insets, radius, and title/annotation type metrics.
- **Fast local loop:** `pnpm exec vitest run tests/dsl.test.ts tests/translate.test.ts tests/model.test.ts`, then a dedicated local viewer for a temporary fixture copy.
- **Local dependencies:** Existing Vite, Solid, Vitest, and Playwright. No remote theme service, account, database, or deployment.
- **Rollout and rollback:** Commit by milestone. Revert a failed slice before distributing new source declarations. Missing appearance selects Graphite; do not maintain old and new renderers as separate supported versions.

### Font and geometry proof

The compiler promises deterministic geometry. Preserve that promise. First move wrapping and line-count rules into a shared pure helper with explicit font profile, size, weight, and line height. Start with conservative deterministic width budgets per font profile. The browser must render those same line breaks.

Use real browser bounds to test fit; those measurements do not feed compilation. If estimates clip supported fixture text or waste unacceptable space, generate static advance metrics from the selected local font files. Use those tables in both environments. Do not add a runtime font parser or server/browser measurement split.

System font stacks in the concept sheet are illustrative. Verify the license and distribution rights of selected fonts before vendoring. Use one local serif, sans, and mono family, adding another sans only if Mulberry needs it. Load local fonts before browser proof and PNG export. SVG output must carry the selected font through an embedded subset or another verified self-contained representation. Font packaging and SVG fidelity are real local dependency proofs; mocks cannot establish them.

### Safe proof target

This checkout has no `node_modules`. Several local servers exist, but none was verified as a safe test instance. During execution, install with `pnpm install --frozen-lockfile`. Use a copy of a committed fixture under `tmp/`, then start an owned viewer on a free port. Do not reuse an unrelated running session or edit a personal diagram. The existing `scripts/prove-file-session.mjs` already demonstrates temporary source copies and server cleanup.

Milestone 1 adds `examples/theme-proof.meld`. After `pnpm build`, copy it to `tmp/theme-proof.meld`. Start it with `pnpm meld open tmp/theme-proof.meld --port 5199 --no-open` after confirming that port is free. Use the printed viewer URL. Change an invalid theme name, a long title, and a pinned node in this copy to reproduce the named failure cases.

## Milestone 1: A saved editorial diagram renders correctly

Add Fieldnotes end to end, using source selection before a picker exists.

- Extend `src/model/types.ts`, `styles.ts`, and `document.ts` with diagram appearance and validated defaults. Keep the existing light/dark field for editor mode.
- Add `examples/theme-proof.meld` with the representative shapes, titles, group, explicit size, and pin used throughout this plan.
- Add one theme declaration to `src/dsl/syntax.ts`. Carry it through `compile.ts` and `project.ts`. Appearance belongs to the compiled source, not `ViewState`.
- Make `src/model/labels.ts` and compiler `leafSize` share padding and wrap rules. Include font identity in any width cache. Keep explicit sizes exact; report overflow through existing diagnostics.
- Derive group header clearance in compilation and `src/model/graph.ts` from title metrics. Cover frame calculations and routing geometry that use header constants.
- Apply Fieldnotes to `NodeView.tsx`, `GroupView.tsx`, `EdgeView.tsx`, `parts.tsx`, and scene CSS. Scope diagram tokens to drawing surfaces so editor mode remains independent. Include comparison and static scenes.
- Update `src/cli/svg.ts` to consume shared shape and label geometry. It currently hard-codes light colors, rectangle nodes, and single-line titles. Support the fixture's diamond, wrapped titles, group titles, and connection labels without a second layout policy.
- Update `src/state/files.ts` and `src/lib/svg-export.ts` so exported backgrounds, fonts, text, and strokes match the drawing. Include appearance in JSON and editable SVG metadata.
- Verify source → compile → canvas → save/reopen → CLI SVG and browser SVG. Check one PNG after font loading. Use actual text bounds and compare canonical geometry. Keep only focused tests for wrap/size constraints, deterministic geometry, and persistence.

### Desired end state

A source-selected Fieldnotes diagram has serif node and group titles, correct interior spacing, and matching exports. Short text, multiline text, a long word, a diamond, and nested groups fit. Explicit sizes and pins remain authored constraints. If the metric decision fails, resolve it here before adding presets.

## Milestone 2: Five presets support design-system changes from source

- Complete Graphite, Fieldnotes, Signal, Mulberry, and Midnight in the shared preset data. Extend beyond the current six color families. Give every built-in family curated numeric shades: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, and 950, each with fill, stroke, and ink. Include group surfaces, connections, and text pairs. Set Graphite as the default.
- Add bounded source overrides for palette slots, canvas/text/connection colors, horizontal/vertical padding, rectangle radius, and supported title/annotation font profiles. Use one theme line and color declarations keyed by family and shade. Omitted shade means 500. Reject duplicate family/shade declarations and invalid values with line errors.
- Make every supported appearance default overridable directly in the DSL. Resolve preset defaults, then file overrides; retain existing object color/shape declarations. Omitted fields inherit. No browser-only appearance settings or separate theme file may be required.
- Replace fixed palette membership checks across `model/types.ts`, `document.ts`, `styles.ts`, `dsl/syntax.ts`, `project.ts`, and `translate.ts` with lookup against the resolved theme plus file-defined named families. Carry an explicit shade on node/group styles. Keep `color=auto` family inheritance; default shade is separate, initially 500.
- Permit new names such as `brand` in DSL color definitions. A referenced custom variant requires fill, stroke, and ink; partial field overrides are allowed for built-in variants. Reject unknown references with source-line diagnostics. Persist family and shade in JSON and editable SVG metadata.
- Keep override fields direct and finite. Do not introduce a general token-expression language, inheritance chain, or arbitrary CSS support.
- Persist appearance through JSON normalization, source formatting, projection, and file sessions. Preserve comments and unrelated statements through existing source-edit helpers.
- Expand the same temporary fixture into all five themes. Include two distinct families, shades 100, 500, and 800 of one built-in family, and a new custom family with shades 100, 500, and 800. Verify that color and shade changes leave canonical geometry unchanged. Test omitted shade resolving to 500, invalid stops, numeric ordering, missing custom variants, and explicit shade save/reopen. Verify light-to-dark ordering across the complete built-in ramps. Check each at the same scale; include actual serif titles in Fieldnotes and mono titles in Midnight.
- Check text contrast, title/group clearance, edge-label backgrounds, and distinctions in grayscale. Existing concept contrast checks cover only 15 proposed node pairs, not the finished palettes.

### Desired end state

All five presets are visually distinct. An agent or human can add named colors and select shades, padding, radius, and supported type profiles directly in the DSL. Reopening and both export paths preserve those choices. Repeated compilation produces matching geometry without browser storage or downloaded fonts.

## Milestone 3: Authors can choose and refine appearance in the viewer

- Add a compact appearance popover near existing diagram actions in `Menus.tsx` and `commands.ts`. Offer five names with small representative previews and two diagram-wide padding controls. Keep editor mode separately labeled.
- Route changes through `src/state/actions.ts` transactions. Extend `src/dsl/translate.ts` and source-edit helpers so file mode saves theme selection and supported overrides honestly.
- Extend `Inspector.tsx` swatches to read resolved built-in and custom families instead of fixed `COLOR_KEYS`. Add a compact numeric shade selector, ordered numerically, that shows available stops and defaults to 500. Persist both choices through existing style edits and source translation.
- Selecting a preset clears built-in overrides in the same undoable edit. Keep custom color definitions and object references. Adjusting padding keeps current palette overrides. Show saved status through the existing file banner and error path.
- Recalculate automatic layout for metric changes while honoring source sizes, pins, and refinements. Palette-only changes must not move nodes. Keep the current camera usable.
- Verify keyboard selection, undo/redo, external source updates, save/reopen, and invalid theme edits against the dedicated temporary file. Confirm standalone browser documents too.
- Capture the five themes and the chooser under project `tmp/`. If creating a PR during execution, attach screenshots with `gh` under the repository rules.

### Desired end state

An author can choose any preset, adjust padding, undo the change, and reopen the file with the same result. Color and shade changes leave geometry unchanged. Custom colors remain usable after switching themes. Editorial typography remains visible in the drawing and exported output.

## Cross-cutting verification

After focused checks pass, run `pnpm check`. Update the existing file-session proof only for theme persistence, geometry, and exports; avoid duplicating its full test sequence. Run `pnpm release:check` if the change affects packaged CLI assets, as expected for fonts and SVG output. Update `docs/DSL.md`, `docs/ARCHITECTURE.md`, and package documentation for supported appearance fields and font packaging.

Browser proof requires an owned service and fixture copy. It has not run during planning. Do not treat the hand-drawn concept sheet as implementation evidence.

## Open decisions and spikes

1. **Font fit and distribution:** In milestone 1, select licensed local families and test width budgets against browser text bounds. Output: shipped families, one deterministic wrap policy, and a verified SVG font representation. If budgets fail, use static metrics. If a family cannot be distributed, choose another licensed family while keeping Fieldnotes serif.

## Below the cut line

Font uploads, arbitrary CSS, token expressions, remote font services, per-node type or padding controls, a full theme editor, automatic brand extraction, new layout algorithms, and a theme marketplace. No compatibility service, dual renderer, deployment, or production migration is required.
