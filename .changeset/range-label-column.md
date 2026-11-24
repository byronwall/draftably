---
'draftably': patch
'@draftably/runtime': patch
---

A code range's label no longer covers code. When a range has a label, the code node keeps a label column on its right: the code wraps before it, and every label starts at the same x, level with its range's first line. Labels on next-door or shared lines stack onto free rows, and a label longer than about 170px ends with `…`.
