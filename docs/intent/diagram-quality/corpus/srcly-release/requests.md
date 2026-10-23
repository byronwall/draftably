# Follow-up requests

Color strategy: shade ramp (blue 100 → 900 along the flow), theme signal.

e1 (branch + recolor): "Show what happens when the release fails — make the failure path red and point at the runbook."

- node fail color=red, node runbook color=red shade=100; edges verify→fail "mismatch", wheel→fail "import error", fail→runbook

e2 (recolor): "Switch it to a dark theme for the slide deck."

- theme signal → theme midnight (shades should still read as a ramp)
