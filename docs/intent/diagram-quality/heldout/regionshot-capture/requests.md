# Follow-up requests

Source: `~/Projects/whiteboard` (RegionShot, `intent.md` "Application lifecycle", "Global entry points" and "Copy-on-close moved to staged Escape").

Kind / layout / color strategy / theme: state lifecycle with three return edges, flow right, shade ramp (blue 100 → 800) / fieldnotes, no groups.

e1 (branch): "Show what happens when the clipboard copy fails: the window stays open so the work isn't lost."

- New red node `keepopen` and an async side edge from `copy`.
- expects: keeps-order; near keepopen copy 120.
