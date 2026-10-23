# Follow-up requests

Source: `~/Projects/video-to-context` (README: local FFmpeg, Parakeet or whisper.cpp, contact
sheet, HTML report, optional `--run-llm`, and the yes/no prompt to install a missing dependency).

Kind / layout / color strategy / theme: data pipeline with two decisions that rejoin, layered
down, semantic (primary ends, amber artifacts, slate external tools, red failure path) /
graphite.

e1 (branch): "Show what happens when the transcriber isn't installed."

- New node `install` (red) with an edge out of the transcriber and a retry edge back.
- expects: keeps-order; below install transcriber.
