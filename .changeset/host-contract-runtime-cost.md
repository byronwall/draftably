---
'@draftably/runtime': minor
'@draftably/editor': minor
---

A page of diagrams costs less. A viewer-only page loads about 11 KB gz of JavaScript on the main thread before it draws, down from about 124 KB: the compiler loads only for `execution: { mode: 'main' }`. Every viewer on a page shares a pool of at most min(4, cores − 1) render workers. Work that a newer update replaced leaves the queue before a worker sees it, a timeout counts from when a worker takes the job and stops only that worker, and an idle worker stops after 30 seconds; 20 diagrams updated 20 times start four workers, not 420. A source update to a drawn 28-box diagram commits in about 120 ms, down from about 730 ms. Viewers share one copy of each font face and one constructable stylesheet, which needs no nonce under a strict CSP; the editor's CSS is a constructable sheet too. The viewer reads its size from a `ResizeObserver` instead of measuring on each camera move. The viewer's frame colors are public `--draft-*` properties that a host sets on the element or any ancestor.
