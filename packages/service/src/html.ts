/**
 * The frame for the service's own HTML pages: the draftably.dev header and footer, with the API
 * marked in the header. One self-contained response: inline CSS, the logo inline, and no script
 * beyond the copy buttons.
 */

import { encodeSource } from '../../../src/lib/render-url';

export const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

const SITE = 'https://draftably.dev';
const GITHUB = 'https://github.com/byronwall/draftably';

// src/assets/logo.svg
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#6650d9"/><path d="M33 42h7a5 5 0 0 0 5-5V20" fill="none" stroke="#fff" stroke-width="7"/><rect x="11" y="30" width="24" height="24" rx="7" fill="#fff"/><rect x="37" y="9" width="16" height="15" rx="5" fill="#fff"/></svg>`;

export const COPY_ICON = `<svg class="copy-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.5v-.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h.5"/></svg>`;

// Tokens and rules copied from site/site.css (light) and src/styles/app.css (dark, the editor's
// dark theme). The site loads Inter from its own build; these pages fall back to the system font.
const CSS = `
:root{color-scheme:light;--bg:#f5f6f9;--surface:#fff;--line:#e3e6ec;--line-strong:#c9cfda;--text:#15171f;--muted:#5b6070;
--accent:#6650d9;--accent-hover:#5741c9;--accent-soft:#efebfd;--code:#eceef3;--code-hover:#e4e7ee;--danger:#b13c50;--danger-soft:#fbecef;--ok:#2d7a5c;
--font:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;--mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
--radius:6px;--page:1240px;--gutter:32px}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;--bg:#16171a;--surface:#1f2024;--line:#36373e;--line-strong:#50515a;--text:#e9e9e6;--muted:#a5a6ad;
--accent:#a898ff;--accent-hover:#bbaeff;--accent-soft:#2a2638;--code:#26272c;--code-hover:#2c2d33;--danger:#ff95a5;--danger-soft:#45262e;--ok:#86d6b9}}
*{box-sizing:border-box}
html,body{min-height:100%}
body{margin:0;display:flex;flex-direction:column;min-height:100vh;background:var(--bg);color:var(--text);font:500 15px/1.55 var(--font);-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}
a:hover{color:var(--accent-hover)}
:where(a,button,input):focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
code,pre{font-family:var(--mono);font-size:13px}
h1,h2{text-wrap:balance}p{text-wrap:pretty}
.wordmark{display:inline-flex;align-items:center;gap:8px;color:var(--text);font-weight:800;font-size:19px;letter-spacing:-.02em}
.wordmark:hover{color:var(--text)}
.logo{display:inline-block;flex:none;width:22px;height:22px}.logo svg{display:block;width:100%;height:100%}
.nav{display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:var(--page);width:100%;height:56px;margin:0 auto;padding:0 var(--gutter)}
.brand{display:flex;align-items:center;gap:10px;min-width:0}
.area{display:inline-flex;align-items:center;gap:10px;color:var(--accent);font-weight:700;font-size:15px;letter-spacing:-.01em;white-space:nowrap}
.area::before{content:'/';color:var(--line-strong);font-weight:500}
.area:hover{color:var(--accent-hover)}
.site-nav{display:flex;align-items:center;gap:24px;font-size:14px}
.site-nav a{display:inline-flex;align-items:center;gap:6px;min-height:24px;color:var(--muted);white-space:nowrap;transition:color 140ms}
.site-nav a:hover{color:var(--text)}
.site-nav a[aria-current=page]{color:var(--accent)}
.site-nav svg{width:14px;height:14px;fill:currentColor}
.site-nav .account{padding-left:24px;border-left:1px solid var(--line)}
main{flex:1;width:100%;max-width:var(--page);margin:0 auto;padding:28px var(--gutter) 0}
.col{max-width:760px}.wide-col{max-width:none}.col.narrow{max-width:520px}
h1{margin:0;font-size:34px;line-height:1.1;font-weight:800;letter-spacing:-.035em}
.lead{margin:10px 0 0;color:var(--muted);font-size:16px}
.lead b{color:var(--text);font-weight:600}
.page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.block{margin-top:36px}
.block h2{margin:0 0 10px;font-size:13px;font-weight:600;color:var(--muted);letter-spacing:0}
.note{margin:24px 0 0;padding:10px 14px;border-radius:var(--radius);background:var(--accent-soft)}
.note.error{background:var(--danger-soft);color:var(--danger)}
.muted{color:var(--muted)}
.nowrap{white-space:nowrap}
.balance{display:flex;align-items:baseline;gap:10px}
.big{font-size:56px;line-height:1;font-weight:800;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.unit{color:var(--muted);font-size:16px}
.meter{height:6px;margin:16px 0 14px;border-radius:3px;background:var(--line);overflow:hidden}
.meter span{display:block;height:100%;background:var(--accent);border-radius:3px}
.facts{display:grid;grid-template-columns:max-content 1fr;gap:4px 24px;margin:0;font-size:14px}
.facts dt{color:var(--muted)}.facts dd{margin:0;font-variant-numeric:tabular-nums}
.button{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 16px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--surface);color:var(--text);font:inherit;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;transition:border-color 140ms,background-color 140ms,color 140ms,transform 100ms}
.button:hover{border-color:var(--muted);color:var(--text)}
.button:active{transform:scale(.98)}
.button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.button.primary:hover{background:var(--accent-hover);border-color:var(--accent-hover)}
@media (prefers-color-scheme:dark){.button.primary,.button.primary:hover{color:#15171f}}
.button.small{height:32px;padding:0 12px;font-size:13px}
.button.quiet{border-color:transparent;background:none;color:var(--muted)}
.button.quiet:hover{background:var(--danger-soft);color:var(--danger)}
.row{display:flex;gap:8px;flex-wrap:wrap}
.input{height:40px;min-width:0;flex:1 1 220px;max-width:320px;padding:0 12px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--surface);color:var(--text);font:inherit;font-size:14px;transition:border-color 140ms,box-shadow 140ms}
.input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.packs{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.packs form{margin:0}
.packs .price{color:var(--muted);font-weight:500}
.keys{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}
.keys th{padding:0 12px 6px 0;color:var(--muted);font-size:13px;font-weight:500;text-align:left}
.keys td{padding:8px 12px 8px 0;border-top:1px solid var(--line);vertical-align:middle}
.keys td:last-child,.keys th:last-child{padding-right:0;text-align:right}
.keys .label{font-weight:600}.keys code{display:block;color:var(--muted);font-size:12.5px}
.keys form{margin:0}
.empty{margin:0;padding:14px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);color:var(--muted);font-size:14px}
.make{margin-top:16px}
.fresh{margin-top:36px;padding:18px 20px;border-radius:10px;background:var(--accent-soft)}
.fresh h2{margin:0;font-size:16px;font-weight:700;color:var(--text)}
.fresh p{margin:4px 0 12px;font-size:14px}
.fresh .try{margin:16px 0 6px}
.hint{margin:0;color:var(--muted);font-size:14px}
.form{margin-top:20px}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.codeline{display:flex;align-items:flex-start;gap:8px;padding:6px 6px 6px 12px;border-radius:var(--radius);background:var(--surface)}
.codeline code,.codeline pre{flex:1;min-width:0;margin:0;padding:5px 0;font-size:13px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
.codeline pre{overflow-wrap:break-word}
.copy-btn{display:inline-flex;flex:none;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:0;border-radius:var(--radius);background:none;cursor:pointer;transition:background-color 140ms,transform 100ms}
.copy-btn:hover{background:var(--code)}
.copy-btn:active{transform:scale(.94)}
.copy-btn:hover .copy-icon{stroke:var(--text)}
.copy-icon{flex:none;width:16px;height:16px;fill:none;stroke:var(--muted);stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round;transition:stroke 140ms}
.is-copied .copy-icon,.is-copied:hover .copy-icon{stroke:var(--ok);stroke-width:1.8;animation:copied 220ms ease-out}
@keyframes copied{from{transform:scale(.6)}}
.hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,560px);gap:48px;align-items:center}
.example{margin:0;min-width:0}
.example a{display:block}
.example img{display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:10px 10px 0 0;background:var(--surface)}
.example .codeline{border:1px solid var(--line);border-top:0;border-radius:0 0 10px 10px;align-items:center}
.example .codeline code{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted)}
.ref-group{display:grid;grid-template-columns:200px minmax(0,1fr);gap:0 32px;margin-top:40px}
.ref-group h2{margin:0;padding-top:12px;font-size:13px;font-weight:600;color:var(--muted)}
.ref{display:grid;grid-template-columns:220px minmax(0,1fr);margin:0;font-size:14px}
.ref dt,.ref dd{margin:0;padding:12px 0;border-top:1px solid var(--line)}
.ref dt{display:flex;align-items:baseline;gap:8px;padding-right:16px}
.ref dt code{font-size:13.5px;font-weight:600;color:var(--text)}
.ref .verb{min-width:34px;font:600 11px/1 var(--mono);color:var(--accent)}
.ref dd span{display:block}
.ref dd span+span{color:var(--muted)}
.ref dd code{color:var(--text);font-size:12.5px;overflow-wrap:break-word}
.ref-foot{margin:28px 0 0 232px;color:var(--muted);font-size:13px}
.recipe{margin:0;padding:12px 0;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}
.cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:0 64px;align-items:start}
.confirm{position:relative;display:inline-block}
.confirm summary{list-style:none}.confirm summary::-webkit-details-marker{display:none}
.confirm[open] summary{background:var(--danger-soft);color:var(--danger)}
.pop{position:absolute;right:0;top:calc(100% + 6px);z-index:10;width:280px;padding:14px;border:1px solid var(--line);border-radius:8px;background:var(--surface);box-shadow:0 8px 28px #24241f24;text-align:left;font-size:14px}
.pop p{margin:0 0 12px;overflow-wrap:anywhere}
.pop .row{justify-content:space-between}
.button.danger{background:var(--danger);border-color:var(--danger);color:#fff}
.button.danger:hover{filter:brightness(1.08)}
@media (prefers-color-scheme:dark){.button.danger{color:#15171f}}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}
.footer{display:flex;align-items:center;gap:14px;flex-wrap:wrap;max-width:var(--page);width:100%;margin:56px auto 0;padding:20px var(--gutter);border-top:1px solid var(--line)}
.footer .wordmark{font-size:16px}.footer .logo{width:18px;height:18px}
.footer-links{display:flex;flex-wrap:wrap;gap:4px 22px;margin-left:auto;font-size:13px}
.footer-links a{display:inline-flex;align-items:center;min-height:24px;color:var(--muted);transition:color 140ms}
.footer-links a:hover{color:var(--text)}
@media (max-width:1000px){.hero,.cols{grid-template-columns:minmax(0,1fr)}.hero{gap:28px}.ref-group{grid-template-columns:minmax(0,1fr)}.ref-group h2{padding:0 0 8px}.ref-foot{margin-left:0}}
@media (max-width:720px){.ref{grid-template-columns:minmax(0,1fr)}.ref dd{padding-top:0;border-top:0}.ref dt{padding-bottom:6px}:root{--gutter:16px}.site-nav{gap:16px}.site-nav .wide{display:none}.site-nav .account{padding-left:16px}
h1{font-size:28px}.big{font-size:48px}.keys .made{display:none}.footer-links{margin-left:0}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

// Copy buttons: data-copy holds the text. Confirms on the icon, so nothing moves. Confirm popovers
// (details.confirm) close on an outside click or Esc, one open at a time.
const SCRIPT = `document.addEventListener('click',e=>{const b=e.target.closest('[data-copy]');if(!b)return;
navigator.clipboard.writeText(b.dataset.copy).then(()=>{b.classList.remove('is-copied');void b.offsetWidth;b.classList.add('is-copied');
setTimeout(()=>b.classList.remove('is-copied'),1500)})});
document.addEventListener('click',e=>{for(const d of document.querySelectorAll('details.confirm[open]'))if(!d.contains(e.target)||e.target.closest('[data-close]'))d.open=false});
document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const d of document.querySelectorAll('details.confirm[open]')){d.open=false;d.querySelector('summary').focus()}});
document.addEventListener('toggle',e=>{const d=e.target;if(d.open&&d.matches('details.confirm')){for(const o of document.querySelectorAll('details.confirm[open]'))if(o!==d)o.open=false;d.querySelector('.pop button')?.focus()}},true)`;

/** A page in the API frame. `current` marks the header link for this page. */
export const page = (
  title: string,
  body: string,
  opts: { status?: number; current?: 'account' | 'home'; script?: boolean } = {},
) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Draftably API</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(LOGO)}">
<style>${CSS}</style></head><body>
<header class="nav"><div class="brand"><a class="wordmark" href="${SITE}"><span class="logo" aria-hidden="true">${LOGO}</span>draftably</a><a class="area" href="/api"${opts.current === 'home' ? ' aria-current="page"' : ''}>API</a></div>
<nav class="site-nav" aria-label="Site"><a href="${SITE}/docs">Docs</a><a class="wide" href="${SITE}/play">Playground</a><a class="wide" href="${SITE}/app/">Editor</a><a class="account" href="/account"${opts.current === 'account' ? ' aria-current="page"' : ''}>Account</a></nav></header>
<main id="main">${body}</main>
<footer class="footer"><a class="wordmark" href="${SITE}"><span class="logo" aria-hidden="true">${LOGO}</span>draftably</a><span class="muted" style="font-size:13px">Render API</span>
<span class="footer-links"><a href="/api">API reference</a><a href="${SITE}/docs">Docs</a><a href="${SITE}/play">Playground</a><a href="${SITE}/app/">Editor</a><a href="${GITHUB}" aria-label="GitHub">GitHub</a></span></footer>
${opts.script ? `<script>${SCRIPT}</script>` : ''}</body></html>`,
    {
      status: opts.status ?? 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        // No other site may frame these pages and hide what a button does.
        'Content-Security-Policy': "frame-ancestors 'none'",
      },
    },
  );

// The live example on `/api`: this service drawing a picture of itself.
const EXAMPLE = `diagram "How a render works" version=1

node src "Diagram source"
node api "draftably.dev/api" color=violet
node img "Image in your page" shape=pill

edge enc src -> api "GET /api/svg/{encoded}"
edge out api -> img "cached at the edge"

layout root flow gap=48
`;

const GROUPS: [RegExp, string][] = [
  [/^GET \/api\/(svg|png|edit)[/?]/, 'Image URLs'],
  [/^(GET|POST)\s+\/api\/(link|d\/|v1\/share)/, 'Short links'],
  [/^(GET|POST)\s+\/api\/v1\//, 'REST API'],
  [/^\/mcp/, 'MCP server'],
  [/^\/account/, 'Account'],
];

// Code-like tokens inside a description line: JSON bodies, {encoded}, ?query=values, dft_ keys,
// snake_case tool names, file names and links.
const TOKEN =
  /(https?:\/\/\S+|\{[^{}\n]*\}|\?\w+=[\w|]+|\bdft_\S*|\b[a-z]+(?:_[a-z]+)+\b|<file\.draft>|"pako:"|base64url\([^)]*\)+)/g;
const inline = (line: string) =>
  line
    .split(TOKEN)
    .map((part, i) =>
      i % 2 === 0
        ? esc(part)
        : /^https?:/.test(part)
          ? `<a href="${esc(part)}">${esc(part.replace(/^https?:\/\//, ''))}</a>`
          : `<code>${esc(part)}</code>`,
    )
    .join('');

/**
 * The plain-text reference as sections of endpoint rows. It reads the same text curl gets, so the
 * two can't drift: an endpoint starts a line, its description sits from column 26, and indented
 * lines continue it.
 */
function reference(text: string) {
  const rows: { at: string; lines: string[] }[] = [];
  let footer = '';
  // The no-install recipe comes before the first endpoint line. It is prose and an example, not
  // endpoint rows, so it draws as preformatted text.
  const lines = text.split('\n').slice(1);
  const first = lines.findIndex(l => /^(GET|POST|\/)/.test(l));
  const recipe = lines.slice(0, first).join('\n').trim();
  // "Connect over MCP" is per-client steps, also prose, so it draws the same way.
  const connectAt = lines.indexOf('Connect over MCP');
  const versionAt = lines.findIndex(l => /^Version /.test(l));
  const connect =
    connectAt > 0
      ? lines
          .slice(connectAt + 1, versionAt)
          .join('\n')
          .trimEnd()
      : '';
  if (connectAt > 0) lines.splice(connectAt, versionAt - connectAt);
  for (const raw of lines.slice(first)) {
    if (!raw.trim()) continue;
    if (/^Version /.test(raw)) {
      footer = raw;
      continue;
    }
    const at = raw.slice(0, 26).trim();
    const rest = raw.slice(26).trim();
    if (at) rows.push({ at, lines: rest ? [rest] : [] });
    else {
      // The text wraps at 80 columns. Rejoin a wrapped sentence; a finished one, or a ?query line,
      // starts a new paragraph.
      const lines = rows.at(-1)?.lines;
      const prev = lines?.at(-1);
      if (lines && prev && !/[.)}>]$/.test(prev) && !prev.startsWith('?') && !rest.startsWith('?'))
        lines[lines.length - 1] = `${prev} ${rest}`;
      else lines?.push(rest);
    }
  }
  const sections: { title: string; rows: typeof rows }[] = [];
  for (const row of rows) {
    const title = GROUPS.find(([re]) => re.test(row.at))?.[1] ?? '';
    if (sections.at(-1)?.title !== title) sections.push({ title, rows: [] });
    sections.at(-1)!.rows.push(row);
  }
  const intro = recipe
    ? `<section class="ref-group"><h2>No install</h2><pre class="recipe">${inline(recipe)}</pre></section>`
    : '';
  return `${intro}${sections
    .map(
      s =>
        `<section class="ref-group"><h2>${esc(s.title)}</h2><dl class="ref">${s.rows
          .map(r => {
            const [verb, path] = r.at.includes(' ') ? r.at.split(/\s+/) : ['', r.at];
            return `<dt>${verb ? `<span class="verb">${esc(verb)}</span>` : ''}<code>${esc(path)}</code></dt><dd>${r.lines
              .map(l => `<span>${inline(l)}</span>`)
              .join('')}</dd>`;
          })
          .join('')}</dl></section>`,
    )
    .join(
      '',
    )}${connect ? `<section class="ref-group"><h2>Connect over MCP</h2><pre class="recipe">${inline(connect)}</pre></section>` : ''}<p class="ref-foot">${inline(footer)}</p>`;
}

/** `/api` for a browser: the plain-text reference, framed. Clients that don't ask for HTML get the text. */
export async function homePage(text: string) {
  const url = `/api/svg/${await encodeSource(EXAMPLE)}`;
  return page(
    'Render API',
    `<div class="hero"><div><h1>Render API</h1>
<p class="lead">Draw Draftably and Mermaid diagrams from an image URL, a REST call or an MCP tool.</p>
<div class="actions"><a class="button primary" href="/account">Get an API key</a><a class="button" href="${SITE}/docs">Language docs</a></div></div>
<figure class="example"><a href="${url}"><picture><source media="(prefers-color-scheme: dark)" srcset="${url}?scheme=dark"><img src="${url}" alt="Diagram source goes to draftably.dev with GET /api/svg/{encoded}, which returns an image for your page, cached at the edge." width="560"></picture></a>
<figcaption class="codeline"><code>&lt;img src="${SITE}${esc(url)}"&gt;</code>${copyButton(`<img src="${SITE}${url}">`, 'Copy the image tag')}</figcaption></figure></div>
${reference(text)}`,
    { current: 'home', script: true },
  );
}

export const copyButton = (text: string, label: string) =>
  `<button type="button" class="copy-btn" data-copy="${esc(text)}" aria-label="${label}" title="${label}">${COPY_ICON}</button>`;
