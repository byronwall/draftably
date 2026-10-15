# Five initial diagram themes

These are proposed art directions. The [comparison sheet](theme-preview.svg) shows the same flow in each theme. It is a concept drawing, not a capture of implemented themes.

## Consider and contrast

Choose how the initial collection will vary color, typography, and node spacing while supporting design-system matching.

Scores are design judgments, not measured results. Zero means the approach fails the stated outcome; ten means it strongly serves it.

| Approach                                | Distinct color identities                               | Useful padding variation                  | Shared design-system changes                               |
| --------------------------------------- | ------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| Recolor the current six pastels         | 3 — retains the same pale treatment                     | 1 — retains current spacing               | 4 — central colors help, but spacing remains scattered     |
| Five independent style bundles          | 9 — each can have its own visual rules                  | 9 — each can set its own geometry         | 3 — unrelated rules make shared brand changes harder       |
| Five presets over shared diagram tokens | 9 — supports neutral, filled, warm, and dark treatments | 9 — each supplies explicit content insets | 9 — one color and spacing vocabulary supports every preset |

**Choice:** Five presets over shared diagram tokens.

**Why:** This provides both visual variety and a small surface for design-system changes. Independent presets remain useful examples.

**Watch:** Shared tokens must include geometry. CSS variables alone will not change compiler sizing or text wrapping.

**Next:** Prove the same small diagram with one token set before designing a large settings interface.

## Initial collection

All padding values below are horizontal / vertical in diagram units. Radius values apply to rectangles. Shapes keep their meaning.

Each palette includes canvas, neutral node, text, primary fill/text, and secondary fill/text. Primary and secondary indicate visual emphasis, not success or failure. Warning and error colors must remain separate.

| Theme          | Character and best use                                                                          | Canvas / neutral / text           | Primary fill / text   | Secondary fill / text | Padding / radius      |
| -------------- | ----------------------------------------------------------------------------------------------- | --------------------------------- | --------------------- | --------------------- | --------------------- |
| **Graphite**   | Compact, precise, mostly neutral. Architecture and dense system maps.                           | `#F5F5F2` / `#FFFFFF` / `#24292B` | `#334C49` / `#FFFFFF` | `#E8C879` / `#352B17` | **12 / 8**, radius 4  |
| **Fieldnotes** | Editorial serif titles, warm paper, forest and clay. Process explanations and operating flows.  | `#F7F2E8` / `#FFFCF5` / `#302E28` | `#405D48` / `#FFFFFF` | `#AC543A` / `#FFFFFF` | **18 / 12**, radius 3 |
| **Signal**     | White ground with strong cobalt and restrained orange. Product and service diagrams.            | `#FFFFFF` / `#F1F4F8` / `#172B4D` | `#234BCD` / `#FFFFFF` | `#F1BC75` / `#452C12` | **16 / 10**, radius 6 |
| **Mulberry**   | Pale mauve ground, deep berry, and dusty lilac. Presentation diagrams with fewer, larger steps. | `#F7F3F6` / `#FFFCFE` / `#352A35` | `#713E61` / `#FFFFFF` | `#D6C5DF` / `#3B2947` | **22 / 14**, radius 8 |
| **Midnight**   | Dark ink with teal and coral. Dark reports and technical presentations.                         | `#172428` / `#24363B` / `#EDF3EF` | `#8BC5B7` / `#152F2A` | `#DF9C82` / `#38251F` | **16 / 12**, radius 5 |

### Graphite — proposed default

Use white nodes for ordinary steps. Reserve deep green for the focal step and ochre for a distinct branch or output. Use thin gray-green outlines and dark neutral connections. Compact padding supports larger diagrams without turning every node into a colored card. The neutral base should accept a brand accent without changing every surface.

### Fieldnotes — editorial

Use warm neutral nodes with selective forest and clay fills. Give labels more vertical space than Graphite. Keep corners nearly square and omit shadows. Use serif diagram, group, and node titles, with small sans-serif connection labels and annotations. This theme should feel like a carefully printed process sheet. Warmth comes from the whole palette, not from a beige canvas behind the current pastels.

### Signal

Use neutral ordinary nodes and solid cobalt for important steps. Orange supports a second visual category. Keep borders crisp and connections dark blue-gray. Moderate padding supports short technical labels and multiline service names. Strong fill contrast creates hierarchy without requiring every service to receive a different hue.

### Mulberry

Use the largest padding profile in this collection, with quiet neutral nodes and selective berry fills. Lilac provides a softer second category. Keep text dark on pale surfaces. This is the presentation option; it must not force larger spacing into dense architecture diagrams. Avoid gradients, decorative shadows, and ornamental typography.

### Midnight

Use dark neutral nodes, brighter text and connections, and restrained teal and coral fills. Group surfaces should remain distinct from both canvas and nodes. This is a full diagram theme, not an inversion filter. Its palette must remain consistent when the diagram is exported against its own dark background.

## Typography across the collection

These font stacks are proposals. Use available system fonts for the concept; settle font packaging during shaping.

| Theme      | Diagram, group, and node titles   | Connection labels and annotations |
| ---------- | --------------------------------- | --------------------------------- |
| Graphite   | Neutral sans-serif: Arial         | Arial                             |
| Fieldnotes | Editorial serif: Georgia          | Arial                             |
| Signal     | Crisp sans-serif: Arial           | Monospace: Courier New            |
| Mulberry   | Humanist sans-serif: Trebuchet MS | Trebuchet MS                      |
| Midnight   | Monospace: Courier New            | Arial                             |

Keep titles readable at diagram scale. Do not use serif only for the theme picker name. The drawing itself must express the editorial direction. Exact families remain provisional; serif titles in the editorial theme are required.

## Shared behavior to shape next

Recommend a small theme definition: canvas, node and group surfaces, text, borders, connections, accent pairs, content insets, rectangle radius, title font, and annotation font. Allow palette and padding overrides independently so a brand color does not force a different density.

The existing hue names remain available. Extend beyond those six families and support file-defined names such as `brand`. Each built-in family supplies numeric shades: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, and 950 with coordinated fill, stroke, and text. Lower numbers are lighter and higher numbers darker; do not reverse the scale for dark themes. Shade is an independent node/group choice, with 500 as the default. Preserve distinct authored families. Custom families define the variants they use directly in the DSL. The concept sheet shows selected fills only; it does not display the full expanded palette or shade range.

Use one source for padding and font metrics in label wrapping, icon placement, node sizing, and layout. Include font family in measurement cache keys. Recheck sizes after fonts load. Handle diamonds and ellipses by their usable interior area. Honor explicit sizes and pins; expose an overflow conflict rather than silently moving authored geometry. These are proposed behavior rules to settle during shaping.

## First visual proof

Render one fixture with short and multiline labels, a long word, an icon, a diamond, a nested group, and connection labels. Compare all five themes at the same scale. Check both automatic sizing and explicit node sizes. Include serif titles and verify that font metrics match rendered text.

Accept the collection only if its identities remain distinct, text fits, and color differences do not carry meaning alone. Check text contrast against the final rendered colors. Reopen the source and compare its exported SVG with the canvas. The concept sheet shows palette and type direction only; it does not prove these behaviors.
