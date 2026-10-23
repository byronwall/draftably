---
'draftably': patch
---

Returns and skips in a flow take planned lanes outside their row (or column): out of the side
facing the lane, along it, and into the target's side that faces back toward the source, one port
gap off centre. The router also prefers a line into a perpendicular side over a U-turn into the
same side it left from.
