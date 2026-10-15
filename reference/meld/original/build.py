#!/usr/bin/env python3
"""Build the standalone file from readable vanilla sources. Python standard library only."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent
text=(root/'src/template.html').read_text()
replacements={'/*__CSS__*/':(root/'src/meld.css').read_text(),'/*__CORE__*/':(root/'src/meld-core.js').read_text(),'/*__UI__*/':(root/'src/meld-ui.js').read_text(),'/*__EXAMPLES__*/':json.dumps({p.stem:p.read_text() for p in sorted((root/'examples').glob('*.meld'))},ensure_ascii=False).replace('</','<\\/')}
for key,value in replacements.items():
    text=text.replace(key,value)
(root/'meld-diagram-lab.html').write_text(text)
print(f'Built {root / "meld-diagram-lab.html"} ({len(text.encode()):,} bytes)')
