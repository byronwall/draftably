"""Build offline HTML readers from current Markdown. Requires Python mistune."""
from pathlib import Path
from html import escape, unescape
import re
import mistune

ROOT = Path(__file__).resolve().parents[1]
CSS = '''
:root{color-scheme:light;--ink:#23283a;--muted:#667084;--line:#dfe3ed;--accent:#5c4bce;--paper:#fff;--soft:#f6f7fb}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:28px}body{margin:0;background:var(--soft);color:var(--ink);font:16px/1.68 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
a{color:var(--accent);text-underline-offset:3px}a:hover{text-decoration-thickness:2px}.mast{border-bottom:1px solid var(--line);padding:15px 30px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:24px;font-size:13px}.brand{font-weight:750;letter-spacing:.03em;color:var(--ink);text-decoration:none}.mast nav{display:flex;gap:20px;flex-wrap:wrap}.layout{max-width:1370px;margin:auto;display:grid;grid-template-columns:250px minmax(0,950px);gap:38px;padding:38px 32px 80px;justify-content:center}.contents{position:sticky;top:24px;align-self:start;max-height:calc(100vh - 48px);overflow:auto;font-size:12.5px;line-height:1.45}.contents strong{display:block;text-transform:uppercase;letter-spacing:.12em;font-size:10px;color:var(--muted);padding:4px 10px 15px}.contents a{display:block;padding:6px 10px;color:var(--muted);text-decoration:none;border-radius:5px}.contents a:hover{background:#e9e8f5;color:var(--accent)}.contents .level3{padding-left:22px;font-size:12px}.paper{min-width:0;background:var(--paper);padding:48px 58px 64px;border:1px solid var(--line);border-radius:12px;box-shadow:0 7px 25px #23305204}h1{font-size:38px;line-height:1.12;letter-spacing:-.04em;margin:0 0 18px}h2{font-size:25px;line-height:1.25;letter-spacing:-.018em;margin:42px 0 16px}h1+h2{font-size:17px;font-weight:500;margin-top:0;color:var(--muted);letter-spacing:0}h3{font-size:18px;line-height:1.4;margin:32px 0 12px}p{margin:0 0 18px}li{margin-bottom:7px}ul,ol{padding-left:22px;margin:12px 0 22px}blockquote{border-left:3px solid var(--accent);padding:4px 20px;margin:24px 0;color:var(--muted)}code{font:0.87em ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-wrap:anywhere;background:#f1f2f7;border-radius:4px;padding:2px 4px}pre{background:#f5f6fa;border:1px solid var(--line);border-radius:8px;padding:18px;overflow-x:auto;line-height:1.6;margin:24px 0}pre code{padding:0;background:none;font-size:12px;overflow-wrap:normal}.table-wrap{overflow-x:auto;margin:22px 0}table{width:100%;border-collapse:collapse;font-size:13px;line-height:1.55}th{text-align:left;background:#f3f4f9;color:#40485b}td,th{border-bottom:1px solid var(--line);padding:12px 13px;vertical-align:top}tr:last-child td{border-bottom:none}img{display:block;max-width:100%;height:auto;margin:26px auto;border:1px solid var(--line);border-radius:8px}hr{border:0;border-top:1px solid var(--line);margin:34px 0}.footer{border-top:1px solid var(--line);padding-top:24px;margin-top:44px;font-size:12px;color:var(--muted)}:focus-visible{outline:3px solid #b3a8f0;outline-offset:3px}
@media(max-width:1000px){.layout{grid-template-columns:190px minmax(0,1fr);gap:20px;padding:25px 18px}.paper{padding:34px 30px}.contents{font-size:12px}}
@media(max-width:700px){.layout{display:block;padding:15px}.contents{display:none}.paper{padding:28px 22px}.mast{padding:15px 18px;align-items:flex-start}.mast nav{gap:8px;justify-content:flex-end}h1{font-size:30px}h2{font-size:22px}}
@media print{body{background:white;font-size:11pt}.mast,.contents{display:none}.layout{display:block;padding:0}.paper{padding:0;border:0;box-shadow:none}h2,h3{break-after:avoid}img,table,pre{break-inside:avoid}a{color:inherit}.footer{font-size:9pt}}
'''
class Reader(mistune.HTMLRenderer):
    def __init__(self):
        super().__init__(escape=False)
        self.headings=[]
        self.slugs=set()
    def heading(self,text,level,**attrs):
        plain=unescape(re.sub('<[^>]*>','',text))
        base=re.sub(r'[^a-z0-9]+','-',plain.lower()).strip('-') or 'section'
        slug=base;i=1
        while slug in self.slugs:
            i+=1;slug=f'{base}-{i}'
        self.slugs.add(slug)
        if level in (2,3): self.headings.append((level,plain,slug))
        return f'<h{level} id="{slug}">{text}</h{level}>\n'

def build(path):
    renderer=Reader()
    markdown=mistune.create_markdown(renderer=renderer,plugins=['table','strikethrough'])
    src=path.read_text(encoding='utf-8')
    body=markdown(src)
    body=body.replace('<table>', '<div class="table-wrap"><table>').replace('</table>','</table></div>')
    title=next((line.lstrip('# ').strip() for line in src.splitlines() if line.startswith('# ')),path.stem)
    in_docs=path.parent.name=='docs'
    prefix='' if in_docs else 'docs/'
    app='../diagram-studio.html' if in_docs else 'diagram-studio.html'
    links=[('Release guide','CHANGES-v7.html'),('Intent','INTENT-DUMP.html'),('Parameters','PARAMETERS.html'),('Code','CODE-MAP.html')]
    nav=''.join(f'<a href="{prefix+href}">{label}</a>' for label,href in links)
    toc=''.join(f'<a class="level{level}" href="#{slug}">{escape(text)}</a>' for level,text,slug in renderer.headings)
    out=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)} · Diagram Studio v7</title><style>{CSS}</style></head><body><header class="mast"><a class="brand" href="{app}">DIAGRAM STUDIO / 07</a><nav aria-label="Documentation">{nav}</nav></header><div class="layout"><aside class="contents" aria-label="On this page"><strong>On this page</strong>{toc}</aside><main class="paper">{body}<footer class="footer">Diagram Studio v7 · Offline documentation · <a href="{path.name}">Markdown source</a> · <a href="{app}">Open the editor</a></footer></main></div></body></html>'''
    output=path.with_suffix('.html');output.write_text(out,encoding='utf-8')
    print(f'[docs] {output.relative_to(ROOT)}: {len(out.encode()):,} bytes')

if __name__=='__main__':
    for path in [ROOT/'README.md',*sorted((ROOT/'docs').glob('*.md'))]:build(path)
