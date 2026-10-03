"""Assemble the single-file offline editor. No minifier or network needed."""
from pathlib import Path
ROOT = Path(__file__).resolve().parent
html = (ROOT / 'shell.html').read_text()
html = html.replace('{{styles}}', '<style>\n' + (ROOT / 'styles.css').read_text() + '\n</style>')
for name in ['layout-engine', 'routing-engine', 'explorer-engine', 'sculpt-engine', 'studio-app', 'explorer-ui', 'sculpt-ui']:
    source = (ROOT / (name + '.js')).read_text()
    assert '</script' not in source.lower(), f'Unsafe inline script terminator in {name}'
    html = html.replace('{{' + name + '}}', '<script id="' + name + '">\n' + source + '\n</script>')
assert '{{' not in html or '{{styles}}' not in html
output = ROOT.parent / 'diagram-studio.html'
output.write_text(html)
print(f'[build] {output.name}: {len(html.encode()):,} bytes')
