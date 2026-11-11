# Theming

A diagram has three layers of color: the drawing, the viewer's frame and controls, and the
editor's panels. The page's color scheme drives the drawing; CSS properties color the rest.

## Dark pages

The drawing follows the page's color scheme, with no option. Each element reads its own computed
`color-scheme`, which it inherits from the page, and falls back to the system's
`prefers-color-scheme`. On a dark page, the diagram and the editor's canvas draw dark:

```css
:root {
  color-scheme: light dark; /* follow the system */
}
.app.dark {
  color-scheme: dark; /* or force it for one part of the page */
}
```

A change switches the drawing at once, with no new layout: a system change, or a class your page
toggles.

- **Keep one diagram light.** Set its scheme with CSS: `draft-diagram { color-scheme: light; }`.
  The same works on `draft-editor`.
- **Pick a look in the source.** A `theme` line in the `.draft` source wins over the page, for
  example `theme blueprint`. See [Themes](#themes).
- **Static SVG.** `renderSvg` draws the same colors for the same input, whatever the page. See
  [Render SVG](#render-svg).

## Frame colors

The viewer's frame, toolbar and outline read these properties. Set them on the element or any
ancestor; your values win over the defaults.

| Property              | Default                | Used for                       |
| --------------------- | ---------------------- | ------------------------------ |
| `--draft-bg`          | `#fff`                 | Frame, toolbar and outline     |
| `--draft-ink`         | `#1e293b`              | Text                           |
| `--draft-border`      | `#cbd5e1`              | Frame and button borders       |
| `--draft-focus`       | `#2563eb`              | Focus ring                     |
| `--draft-shadow`      | `rgb(15 23 42 / 0.12)` | The outline's shadow on focus  |
| `--draft-warning-ink` | `#9a3412`              | Diagnostics text               |
| `--draft-warning-bg`  | `#fff7ed`              | Diagnostics on a stale drawing |

```css
@media (prefers-color-scheme: dark) {
  draft-diagram {
    --draft-bg: #0f172a;
    --draft-ink: #e2e8f0;
    --draft-border: #334155;
    --draft-warning-ink: #fdba74;
    --draft-warning-bg: #431407;
  }
}
```

## The editor's panels

The editor's panels, toolbar and selection read their own properties, set on `draft-editor`.
`data-theme="dark"` on the element selects the dark set. A framework component passes the
attribute through: `<DraftEditor data-theme="dark" />`. [Editor colors](#editor-colors) lists
every property.

## A dark page, start to finish

```css
.app.dark {
  color-scheme: dark; /* the drawings */
  background: #020617;
  color: #e2e8f0;
  --draft-bg: #0f172a; /* the viewer's frame and controls */
  --draft-ink: #e2e8f0;
  --draft-border: #334155;
  --draft-focus: #38bdf8;
  --draft-warning-ink: #fdba74;
  --draft-warning-bg: #431407;
}
```

```html
<main class="app dark">
  <draft-diagram source="…"></draft-diagram>
  <draft-editor data-theme="dark" source="…"></draft-editor>
</main>
```

Each framework page builds this page as a complete app: [React](#react), [Solid](#solid),
[Vue](#vue), [Svelte](#svelte) and [plain HTML](#plain-html).
