/**
 * The account page: sign in with GitHub, see the balance, make and revoke API keys. Plain HTML
 * forms; the session cookie is SameSite=Lax, so another site can't post to them.
 */
import {
  createKey,
  endSession,
  finishSignIn,
  revokeKey,
  sessionAccount,
  startSession,
  startSignIn,
  type AuthEnv,
} from './auth';
import { balance, MONTHLY_GRANT, upsertAccount } from './credits';

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

const page = (title: string, body: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Draftably</title>
<style>
:root{color-scheme:light dark;--fg:#1d2433;--muted:#5b6475;--line:#d8dde6;--bg:#f7f7f4;--card:#fff;--accent:#2f5bd3}
@media (prefers-color-scheme:dark){:root{--fg:#e6e9ef;--muted:#9aa3b2;--line:#323a48;--bg:#15181e;--card:#1d222b;--accent:#7ea2ff}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
main{max-width:720px;margin:40px auto;padding:0 16px}
h1{font-size:22px;margin:0 0 4px}p.muted,.muted{color:var(--muted)}
section{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:16px 20px;margin:16px 0}
h2{font-size:15px;margin:0 0 8px}table{width:100%;border-collapse:collapse}
td,th{text-align:left;padding:6px 4px;border-top:1px solid var(--line);font-size:14px}th{color:var(--muted);font-weight:500}
code,pre{font:13px/1.45 ui-monospace,monospace}pre{background:var(--bg);padding:10px;border-radius:6px;overflow-x:auto}
button,.button{font:inherit;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:6px;padding:4px 12px;cursor:pointer;text-decoration:none}
.primary{background:var(--accent);border-color:var(--accent);color:#fff}input{font:inherit;padding:4px 8px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg)}
.big{font-size:28px;font-weight:600}
</style></head><body><main>${body}</main></body></html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        ...headers,
      },
    },
  );

const redirect = (to: string, cookie?: string) =>
  new Response(null, {
    status: 303,
    headers: { Location: to, ...(cookie ? { 'Set-Cookie': cookie } : {}) },
  });

interface KeyRow {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
}

async function accountPage(env: AuthEnv, account: { id: string; login: string }, newKey?: string) {
  const b = await balance(env.DB, account.id);
  const keys = (
    await env.DB.prepare(
      `SELECT id, label, created_at, last_used_at FROM keys WHERE account_id = ?1 AND revoked_at IS NULL ORDER BY created_at`,
    )
      .bind(account.id)
      .all<KeyRow>()
  ).results;
  const day = (s: string | null) => (s ? s.slice(0, 10) : 'never');
  return page(
    'Account',
    `<h1>Draftably render service</h1>
<p class="muted">Signed in as <b>${esc(account.login)}</b> · <form method="post" action="/logout" style="display:inline"><button>Sign out</button></form></p>
<section><h2>Credits</h2>
<div class="big">${(b.grant + b.bought).toLocaleString('en-US')}</div>
<p class="muted">${b.grant.toLocaleString('en-US')} left in this month's free ${MONTHLY_GRANT.toLocaleString('en-US')} (resets ${b.resetsAt}) · ${b.bought.toLocaleString('en-US')} bought.
An SVG costs 1, a PNG 2. Cache hits, validate and convert are free.</p></section>
${
  newKey
    ? `<section><h2>Your new key</h2><p>Copy it now; it is not shown again.</p><pre>${esc(newKey)}</pre>
<pre>curl -X POST ${'https://api.draftably.dev'}/v1/render \\
  -H "Authorization: Bearer ${esc(newKey)}" \\
  -H "Content-Type: application/json" \\
  -d '{"code": "node a \\"Web\\"\\nnode b \\"API\\"\\nedge e a -> b", "format": "svg"}'</pre></section>`
    : ''
}
<section><h2>API keys</h2>
${
  keys.length
    ? `<table><tr><th>Key</th><th>Label</th><th>Made</th><th>Last used</th><th></th></tr>${keys
        .map(
          k => `<tr><td><code>dft_${esc(k.id)}.…</code></td><td>${esc(k.label)}</td><td>${day(k.created_at)}</td><td>${day(k.last_used_at)}</td>
<td><form method="post" action="/account/keys/${esc(k.id)}/revoke"><button>Revoke</button></form></td></tr>`,
        )
        .join('')}</table>`
    : '<p class="muted">No keys yet.</p>'
}
<form method="post" action="/account/keys" style="margin-top:12px"><input name="label" placeholder="Label, such as laptop" maxlength="60"> <button class="primary">Make a key</button></form>
</section>`,
  );
}

/** `/login`, `/logout`, `/auth/github/callback` and `/account*`. Null for other paths. */
export async function handleAccount(req: Request, env: AuthEnv, url: URL) {
  const path = url.pathname;
  const ours =
    path === '/login' ||
    path === '/logout' ||
    path.startsWith('/auth/') ||
    path.startsWith('/account');
  if (!ours) return null;
  // Every change is a POST from this site's own pages. A browser always sends Origin on a POST,
  // so a form on another origin, even a sibling subdomain, is refused.
  if (req.method === 'POST' && req.headers.get('Origin') !== url.origin)
    return new Response('This form must be sent from this site.', { status: 403 });
  if (path === '/login') return startSignIn(env, url.origin);
  if (path === '/logout')
    return req.method === 'POST'
      ? redirect('/', await endSession(req, env.DB))
      : new Response('Sign out with the button on /account.', { status: 405 });
  if (path === '/auth/github/callback') {
    const done = await finishSignIn(req, env);
    if ('error' in done)
      return page(
        'Sign-in failed',
        `<h1>Sign-in failed</h1><p>${esc(done.error!)}</p><p><a href="/login">Try again</a></p>`,
        400,
      );
    const id = await upsertAccount(env.DB, done.user.id, done.user.login);
    return redirect('/account', await startSession(env.DB, id));
  }
  if (!path.startsWith('/account')) return null;
  const account = await sessionAccount(req, env.DB);
  if (!account) return redirect('/login');
  if (req.method === 'POST' && path === '/account/keys') {
    const form = await req.formData();
    const key = await createKey(env.DB, account.id, String(form.get('label') ?? ''));
    return accountPage(env, account, key);
  }
  const revoke = /^\/account\/keys\/([0-9a-f]{12})\/revoke$/.exec(path);
  if (req.method === 'POST' && revoke) {
    await revokeKey(env.DB, account.id, revoke[1]);
    return redirect('/account');
  }
  if (path === '/account') return accountPage(env, account);
  return new Response('Not found', { status: 404 });
}
