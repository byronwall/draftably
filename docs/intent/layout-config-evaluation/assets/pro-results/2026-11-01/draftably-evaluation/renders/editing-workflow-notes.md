# Editing workflow diagram

`editing-workflow.mmd` is a proposed product interaction, not an observed user journey or an executed hybrid-policy experiment. `editing-workflow.svg` and `editing-workflow.png` provide a precise three-path overview of the same dispatch contract. Their replay source is `evaluation/render-editing-workflow.py`; the SVG is standalone and the optional PNG uses Inkscape. The PNG was visually inspected at its native 1400 × 940 size for text clipping, contrast, and connector alignment.

Appearance changes retain geometry. A bounded warm pass and a source rebuild have different inputs, protection semantics, and writeback paths. Direction or format requests use source rebuilding; bounded Separate/Improve runs are not credited as satisfying those requests. Sequence, lanes, and cells remain explicit authored structures.

The review step checks actual output and declared constraints. An unchanged direction setting is not evidence of an unchanged drawing, and a changed setting is not evidence that reorientation occurred. When `fit=` is active, the current compiler may search both directions; the preview must make that tradeoff visible.

Keeping the current drawing after a failed alternative does not certify that the current drawing is valid. Existing diagnostics remain visible. This diagram does not introduce a new soft-score fallback, new geometry metric, or an automatic engine selector.

Save a warm result as an arrangement, and save a rebuild as a source recipe. The integration acceptance tests cover preview/Discard, one-step Undo, source preservation, and reopened geometry. Their proposed combination is not inferred from numerical stability measurements on unlike cold and warm states.
