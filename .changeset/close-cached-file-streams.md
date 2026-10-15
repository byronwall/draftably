---
'draftably': patch
---

Close live file-update streams when leaving a diagram and reconnect when a cached page is restored. This prevents rapid diagram switching from exhausting browser HTTP connections and stalling navigation.
