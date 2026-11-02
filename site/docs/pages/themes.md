# Themes

A `theme` line picks one of five presets. A theme changes fonts, padding and colors. The structure
stays, and boxes resize to fit, so some boxes move. Here is one file drawn in each of them.

```draft themes
group edge "Edge" color=blue
node web "Web app" in=edge
node gw "API gateway" in=edge
group core "Services" color=mint
node orders "Orders" in=core
node pay "Payments" in=core shape=pill
node db "Postgres" color=violet
edge e1 web -> gw "HTTPS"
edge e2 gw -> orders "create order"
edge e3 orders -> pay "charge" kind=async
edge e4 orders -> db "persist"
legend blue "Public entry points"
legend violet "Data stores"
```

## Pick a theme

A file with no `theme` line uses `drafting`. The sample above has no `theme` line, so a copy of it
draws in `drafting`. To pick another theme, write its line first in the file:

```text
theme fieldnotes
```

In the Editor, select **Appearance**, the palette at the right of the toolbar. Then select a theme.
The Editor writes the `theme` line for you.

| Theme        | Character                                                       |
| ------------ | --------------------------------------------------------------- |
| `drafting`   | Navy ink on cool paper, drafting blue and marker gold. Compact. |
| `fieldnotes` | Editorial: serif titles on warm paper, indigo and terracotta.   |
| `signal`     | Color-blind-safe Okabe–Ito hues on white.                       |
| `ink`        | Sumi ink tones, indigo and a vermilion seal, generous padding.  |
| `blueprint`  | Dark: white lines on blueprint blue, monospace titles.          |

The `theme` line also takes overrides such as `padding-x=`, `radius=` and `title-font=`, and
`theme-color` lines change or add color families. [Themes and colors](#themes-and-colors) lists
them all.
