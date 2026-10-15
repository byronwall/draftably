---
title: 'Diagram themes — shape brief'
slug: 'diagram-themes'
phase: shape
status: current
last_updated: '2026-10-15'
---

# Diagram themes — what we are adding

**Outcome:** Diagrams get deliberate colors, spacing, and type, with shared values that authors can adapt to a design system.

**Primary flow:** Open a diagram → choose a theme → adjust shared values when needed → save and export the same appearance.

## Feature scope

```text
Diagram appearance
├── PLANNED ADDITIONS
│   ├── Five professional presets
│   │   ├── Graphite: compact neutral base, green and ochre; proposed default
│   │   ├── Fieldnotes: editorial serif titles, paper, forest and clay
│   │   ├── Signal: cobalt, crisp sans titles, monospace annotations
│   │   ├── Mulberry: berry and lilac, generous padding, humanist sans titles
│   │   └── Midnight: dark surfaces, teal and coral, monospace titles
│   ├── Shared diagram values
│   │   ├── Canvas, extensible named colors, text, groups, connections, and borders
│   │   ├── Numeric shades 50–950 per built-in family; default 500
│   │   ├── Custom named families and shade values declared in the DSL
│   │   ├── Horizontal and vertical node content padding; rectangle radius
│   │   └── Title and annotation fonts, with matching size and line height
│   ├── Compact appearance control
│   │   ├── Choose a preset; adjust diagram-wide node padding
│   │   ├── Choose node/group color and shade in the inspector
│   │   └── Keep editor light/dark controls separate
│   └── Durable appearance
│       ├── Save theme and overrides in diagram source and JSON
│       ├── Edit palette and supported type roles through source
│       └── Preserve appearance in canvas, comparisons, SVG, and PNG
└── LATER POSSIBILITIES
    └── Font uploads, theme editor, automatic brand extraction, theme marketplace
```

## Behavior

| Situation | Expected result |
| --- | --- |
| A diagram has no appearance declaration | Use Graphite; do not infer appearance from editor mode. |
| The author chooses Fieldnotes | Diagram, group, and node titles use serif type. Annotations stay sans-serif. |
| The author changes a color or shade | Repaint without changing geometry. Keep distinct families and readable text. |
| A node omits its shade | Use the diagram default, initially 500. Color inheritance does not force shade inheritance. |
| A node references an undefined custom family or shade | Report a source error; keep the last valid drawing. |
| The author changes padding or type | Recalculate automatic sizes and layout from the same saved inputs. |
| A node has an explicit size or pin | Keep that authored constraint. Report text overflow without silent resizing or movement. |
| A larger title reaches a group boundary | Reserve enough header space; keep the title clear of children and borders. |
| The author selects another preset | Clear built-in overrides in one undoable edit. Keep custom color definitions and object references. |
| A source edit contains an invalid theme or value | Report the source line and keep the last valid drawing. |
| An agent or human edits theme/style declarations | Apply saved DSL values in the viewer, CLI, and exports without separate configuration. |

## Examples

Proposed source form, to finalize while extending the parser:

```text
theme fieldnotes padding-x=18 padding-y=12 radius=3 title-font=serif annotation-font=sans
theme-color blue fill="#405D48" stroke="#405D48" ink="#FFFFFF"
theme-color brand shade=100 fill="#EAF1ED" stroke="#9AB4A4" ink="#244431"
theme-color brand shade=800 fill="#244431" stroke="#244431" ink="#FFFFFF"
node context "Context" color=brand shade=100
node focus "Main step" color=brand shade=800
```

Keep existing color names and extend the palette beyond six families. Each built-in family has numeric shades: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, and 950. The exact additional families remain a visual decision. Lower numbers are lighter; higher numbers are darker, across all themes. Every shade defines fill, border, and readable text together. Contrast against the canvas determines emphasis; the scale does not reverse in dark themes.

Custom families use the same declarations. A referenced custom variant needs its own complete color triple. No automatic shade generator is required. A neutral default leaves stronger fills for emphasis; shades do not replace labels or notation.

Resolve preset defaults, then DSL overrides. Object declarations select color, shade, and shape. Omitted values inherit defaults. No separate configuration is required.

## Decisions and boundaries

**Appetite:** One diagram appearance model, five presets, and a small chooser. No editor redesign or per-node typography controls.

**Key decision:** Extend shared model values rather than make five independent CSS bundles. Sizing, rendering, and export must consume the same appearance. File source owns appearance; camera and editor mode remain view state.

**Key decision:** Use serif, sans-serif, and monospace roles with deterministic CLI/browser geometry. Exact fonts remain provisional.

**Boundary:** A palette-only change leaves padding and editorial type unresolved. Prove one complete theme first. Custom palette definitions stay in source.

**First proof:** One local Fieldnotes fixture through compilation, canvas, save/reopen, and both SVG paths.

**Try:** Use serif titles, different horizontal/vertical padding, multiline text, a diamond, and a nested group.

**Observe:** Compare CLI/browser geometry, actual text bounds, group headers, pinned nodes, and exported colors and type.

**Decide:** Continue to all five only when titles fit and geometry agrees. If font estimates fail, add static metrics for the selected fonts before expanding presets.

Revert failed slices before distribution. See the [implementation plan](implementation-plan.md) and [theme directions](theme-directions.md).
