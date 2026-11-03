#!/usr/bin/env node
/** Browser fallback for environments where a new Chromium process cannot launch. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = 'docs/evaluations/agent-diagrams/cells';
const page = `<!doctype html><html><head><title>Native diagram evaluation</title><style>body{font:16px system-ui;margin:24px;background:white;color:#172033}button{padding:12px}article{border:1px solid #bbb;padding:16px;margin:24px 0;max-width:960px}article svg{max-width:960px;width:100%;height:auto}pre{white-space:pre-wrap}</style></head><body><h1>Native diagram evaluation</h1><button id="run">Render browser cells</button><pre id="status">Ready</pre><div id="results"></div><script type="module">
import mermaid from '/node_modules/mermaid/dist/mermaid.esm.min.mjs';
mermaid.initialize({startOnLoad:false,securityLevel:'strict',deterministicIds:true,deterministicIDSeed:'diagram-comparison'});
const tasks=['workflow','architecture','state'];
const results=document.querySelector('#results');
async function save(task,tool,data){const r=await fetch('/save/'+task+'/'+tool,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!r.ok)throw Error(await r.text());}
document.querySelector('#run').onclick=async()=>{document.querySelector('#run').disabled=true;try{for(const task of tasks)for(const tool of ['mermaid','svg']){const ext=tool==='mermaid'?'mmd':'svg';const url='/'+${JSON.stringify(base)}+'/'+task+'/'+tool+'/initial.'+ext;const source=await (await fetch(url)).text();const startedAt=new Date().toISOString();const start=performance.now();let svg,error;try{if(tool==='mermaid')svg=(await mermaid.render('comparison-'+task,source)).svg;else{const xml=new DOMParser().parseFromString(source,'image/svg+xml');if(xml.querySelector('parsererror')||xml.documentElement.localName!=='svg')throw Error('Invalid SVG XML');svg=source;}}catch(e){error=String(e);}await save(task,tool,{svg,error,startedAt,durationMs:performance.now()-start,userAgent:navigator.userAgent});document.querySelector('#status').textContent=task+'/'+tool+': '+(error||'success');}location.href='/gallery';}catch(e){document.querySelector('#status').textContent=String(e);}};
</script></body></html>`;
async function gallery() {
  let html =
    '<!doctype html><html><head><title>Initial native renders</title><style>body{font:16px system-ui;background:white;color:#172033;margin:24px}article{margin-bottom:32px;border:1px solid #bbb;padding:16px;width:960px}img{width:960px;height:auto;display:block}</style></head><body><h1>Initial native renders</h1>';
  for (const task of ['workflow', 'architecture', 'state'])
    for (const tool of ['mermaid', 'draftably', 'd2', 'dot', 'svg']) {
      const dir = base + '/' + task + '/' + tool;
      let result;
      try {
        result = JSON.parse(await fs.readFile(path.join(root, dir, 'initial/render.json'), 'utf8'));
      } catch {
        // A missing attempt remains visibly pending.
      }
      html +=
        '<article id="' +
        task +
        '-' +
        tool +
        '"><h2>' +
        task +
        ' / ' +
        tool +
        '</h2>' +
        (result?.status === 'success'
          ? '<img src="/' +
            dir +
            '/initial/output.svg" alt="' +
            task +
            ' ' +
            tool +
            ' initial output">'
          : '<pre>' + String(result?.error || 'Pending').replaceAll('<', '&lt;') + '</pre>') +
        '</article>';
    }
  return html + '</body></html>';
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') {
      res.setHeader('Content-Type', 'text/html');
      return res.end(page);
    }
    if (url.pathname === '/gallery') {
      res.setHeader('Content-Type', 'text/html');
      return res.end(await gallery());
    }
    if (
      req.method === 'POST' &&
      /^\/save\/(workflow|architecture|state)\/(mermaid|svg)$/.test(url.pathname)
    ) {
      const [, , task, tool] = url.pathname.split('/');
      let body = '';
      for await (const chunk of req) body += chunk;
      const data = JSON.parse(body);
      const dir = path.join(root, base, task, tool, 'initial');
      await fs.mkdir(dir, { recursive: true });
      try {
        await fs.access(path.join(dir, 'render.json'));
        res.writeHead(409);
        return res.end('Attempt already exists');
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
      const ext = tool === 'mermaid' ? 'mmd' : 'svg';
      const source = await fs.readFile(path.join(dir, '../initial.' + ext), 'utf8');
      const result = {
        schemaVersion: 1,
        tool,
        sourcePath: base + '/' + task + '/' + tool + '/initial.' + ext,
        status: data.error ? 'failed' : 'success',
        renderer:
          tool === 'mermaid'
            ? 'Mermaid native browser renderer'
            : 'Raw SVG, unchanged, loaded in existing Chromium',
        rendererVersion: tool === 'mermaid' ? '12.2.0' : data.userAgent,
        browserUserAgent: data.userAgent,
        execution:
          'Existing cloud browser; new Chromium process unavailable (socket EPERM). Same native renderer, no source changes.',
        startedAt: data.startedAt,
        durationMs: data.durationMs,
        durationScope:
          'Browser render/parse wall time only, unlike shell adapters. Not comparable across adapters.',
        sourceBytes: Buffer.byteLength(source),
        sourceLines: source.replace(/\n$/, '').split('\n').length,
        error: data.error || null,
      };
      if (data.svg) {
        await fs.writeFile(path.join(dir, 'output.svg'), data.svg);
        result.svgPath = base + '/' + task + '/' + tool + '/initial/output.svg';
        result.svgBytes = Buffer.byteLength(data.svg);
      }
      await fs.writeFile(path.join(dir, 'stdout.log'), '');
      await fs.writeFile(path.join(dir, 'stderr.log'), data.error || '');
      await fs.writeFile(path.join(dir, 'render.json'), JSON.stringify(result, null, 2) + '\n');
      return res.end('Saved');
    }
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) throw Error('Outside root');
    const mime =
      {
        '.svg': 'image/svg+xml',
        '.mjs': 'text/javascript',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
      }[path.extname(file)] || 'text/plain';
    res.setHeader('Content-Type', mime);
    res.end(await fs.readFile(file));
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
});
server.listen(4178, '0.0.0.0', () =>
  console.log('Browser evaluation: http://localhost:4178 ; gallery: http://localhost:4178/gallery'),
);
