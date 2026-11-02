# Final cycle rejected: negative pin

The third refinement tried to match the reference left-offset renderer stack, but `pin renderer x=-40` is invalid: native pin x must be 0..100000. All four commands exited 1; this is an authoring error. The three-cycle limit is exhausted. The final published v2 restores the earlier validated source and its corresponding render, geometry, and validation manifest. The alternate v1 is more compact and can be the better communication choice; no fourth edit was made.
