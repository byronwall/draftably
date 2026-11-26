/**
 * The account page: sign in with an emailed link, see the balance, make and revoke API keys. Plain HTML
 * forms in the site's frame (html.ts); the session cookie is SameSite=Lax, so another site can't post
 * to them.
 */
import {
  cleanEmail,
  createKey,
  endSession,
  loginTokenEmail,
  revokeKey,
  sendLoginLink,
  sessionAccount,
  startSession,
  useLoginToken,
  type AuthEnv,
} from './auth';
import { balance, MONTHLY_GRANT, upsertAccount } from './credits';
import { copyButton, esc, page } from './html';
import { checkoutUrl, PACKS, paidCreditsOn, type StripeEnv } from './stripe';

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

const n = (x: number) => x.toLocaleString('en-US');
/** `2026-12-01…` as `Dec 1, 2026`. */
const longDay = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
async function accountPage(
  env: AuthEnv & StripeEnv,
  origin: string,
  account: { id: string; email: string },
  newKey?: string,
  bought = false,
) {
  const b = await balance(env.DB, account.id);
  const keys = (
    await env.DB.prepare(
      `SELECT id, label, created_at, last_used_at FROM keys WHERE account_id = ?1 AND revoked_at IS NULL ORDER BY created_at`,
    )
      .bind(account.id)
      .all<KeyRow>()
  ).results;
  const day = (s: string | null) => (s ? longDay(s) : 'Never');
  const curl = newKey
    ? `curl -X POST ${origin}/v1/render \\
  -H "Authorization: Bearer ${newKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"code": "node a \\"Web\\"\\nnode b \\"API\\"\\nedge e a -> b", "format": "svg"}'`
    : '';
  const left = Math.max(0, Math.min(100, (b.grant / MONTHLY_GRANT) * 100));
  return page(
    'Account',
    `<div class="page-head"><div><h1>Account</h1>
<p class="lead">Signed in as <b>${esc(account.email)}</b></p></div>
<form method="post" action="/logout"><button class="button small">Sign out</button></form></div>
${bought ? '<p class="note"><b>Thanks.</b> Your credits appear here once Stripe confirms the payment, usually within seconds.</p>' : ''}
${
  newKey
    ? `<section class="fresh"><h2>Your new key</h2><p>Copy it now; it is not shown again.</p>
<div class="codeline"><code>${esc(newKey)}</code>${copyButton(newKey, 'Copy the key')}</div>
<p class="try">Try it:</p>
<div class="codeline"><pre>${esc(curl)}</pre>${copyButton(curl, 'Copy the command')}</div></section>`
    : ''
}
<div class="cols"><div><section class="block"><h2>Credits</h2>
<div class="balance"><span class="big">${n(b.grant + b.bought)}</span><span class="unit">credits</span></div>
<div class="meter" title="${n(b.grant)} of ${n(MONTHLY_GRANT)} free credits left"><span style="width:${left.toFixed(1)}%"></span></div>
<dl class="facts"><dt>Free this month</dt><dd>${n(b.grant)} of ${n(MONTHLY_GRANT)} left · <span class="nowrap">resets ${longDay(b.resetsAt)}</span></dd>
<dt>Bought</dt><dd>${n(b.bought)} · never expire</dd>
<dt>Cost</dt><dd>An SVG costs 1, a PNG 2. Cache hits, validate and convert are free.</dd></dl></section>
${
  paidCreditsOn(env)
    ? `<section class="block"><h2>Buy credits</h2><p class="hint">Bought credits never expire. The monthly grant is spent first.</p>
<div class="packs">${PACKS.map(
        p => `<form method="post" action="/account/buy"><input type="hidden" name="pack" value="${p.id}">
<button class="button">${n(p.credits)} credits <span class="price">$${(p.cents / 100).toFixed(2)}</span></button></form>`,
      ).join('')}</div></section>`
    : ''
}
</div><section class="block"><h2>API keys</h2>
${
  keys.length
    ? `<table class="keys"><tr><th>Key</th><th class="made">Made</th><th>Last used</th><th><span class="sr-only">Revoke</span></th></tr>${keys
        .map(
          k => `<tr><td><span class="label">${esc(k.label)}</span><code>dft_${esc(k.id)}.…</code></td><td class="made">${day(k.created_at)}</td><td>${day(k.last_used_at)}</td>
<td><details class="confirm"><summary class="button small quiet">Revoke</summary><div class="pop"><p>Revoke <b>${esc(k.label)}</b>? Anything that uses it gets 401 from now on.</p>
<form method="post" action="/account/keys/${esc(k.id)}/revoke" class="row"><button type="button" class="button small" data-close>Keep it</button><button class="button small danger">Revoke key</button></form></div></details></td></tr>`,
        )
        .join('')}</table>`
    : '<p class="empty">No keys yet. A key lets the REST API and the MCP server spend these credits.</p>'
}
<form method="post" action="/account/keys" class="row make"><input class="input" name="label" placeholder="Label, such as laptop" maxlength="60" aria-label="Key label"><button class="button primary">Make a key</button></form>
</section></div>`,
    { current: 'account', script: true },
  );
}

const loginForm = (note = '', status = 200) =>
  page(
    'Sign in',
    `<div class="col narrow"><h1>Sign in to Draftably</h1>
<p class="lead">We email you a link that signs you in. A new address gets a new account with 1,000 free credits a month.</p>${note}
<form method="post" action="/login" class="row form"><input class="input" type="email" name="email" autofocus required maxlength="254" placeholder="you@example.com" autocomplete="email" aria-label="Email"><button class="button primary">Email me a link</button></form></div>`,
    { status, current: 'account' },
  );

const failed = (message: string, status = 400) =>
  page(
    'Sign-in failed',
    `<div class="col narrow"><h1>Sign-in failed</h1><p class="lead">${esc(message)}</p>
<div class="actions"><a class="button primary" href="/login">Try again</a></div></div>`,
    { status, current: 'account' },
  );

/** `/login`, `/logout`, `/auth/verify` and `/account*`. Null for other paths. */
export async function handleAccount(req: Request, env: AuthEnv & StripeEnv, url: URL) {
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
  if (path === '/login') {
    if (req.method !== 'POST') return loginForm();
    const email = cleanEmail(String((await req.formData()).get('email') ?? ''));
    if (!email) return loginForm('<p class="note error">That is not an email address.</p>', 400);
    const ip = req.headers.get('CF-Connecting-IP') ?? 'local';
    const tooMany = () =>
      failed('Too many sign-in emails. Wait a few minutes, then try again.', 429);
    if (!(await env.LOGIN_LIMIT.limit({ key: ip })).success) return tooMany();
    try {
      if (!(await sendLoginLink(env, email, url.origin))) return tooMany();
    } catch (error) {
      console.error('sign-in email failed', error);
      return failed('We could not send the email. Try again later.', 503);
    }
    // The same answer for every address, so the form doesn't tell which ones have accounts.
    return page(
      'Check your email',
      `<div class="col narrow"><h1>Check your email</h1><p class="lead">We sent a sign-in link to <b>${esc(email)}</b>. It works once, for 15 minutes.</p>
<p class="hint" style="margin-top:20px">Wrong address? <a href="/login">Use another one</a>.</p></div>`,
      { current: 'account' },
    );
  }
  if (path === '/logout')
    return req.method === 'POST'
      ? redirect('/', await endSession(req, env.DB))
      : new Response('Sign out with the button on /account.', { status: 405 });
  if (path === '/auth/verify') {
    // Mail scanners open GET links, so only the button's POST spends the token.
    // The page names the account, so a person who opens someone else's link sees whose it is.
    if (req.method !== 'POST') {
      const token = url.searchParams.get('token') ?? '';
      const email = await loginTokenEmail(env.DB, token);
      if (!email) return failed('This sign-in link was used already or has expired.');
      return page(
        'Sign in',
        `<div class="col narrow"><h1>Sign in to Draftably</h1><p class="lead">Sign in as <b>${esc(email)}</b>?</p>
<form method="post" action="/auth/verify" class="actions"><input type="hidden" name="token" value="${esc(token)}"><button class="button primary">Sign in</button></form></div>`,
        { current: 'account' },
      );
    }
    const email = await useLoginToken(env.DB, String((await req.formData()).get('token') ?? ''));
    if (!email) return failed('This sign-in link was used already or has expired.');
    return redirect('/account', await startSession(env.DB, await upsertAccount(env.DB, email)));
  }
  if (!path.startsWith('/account')) return null;
  const account = await sessionAccount(req, env.DB);
  if (!account) return redirect('/login');
  if (req.method === 'POST' && path === '/account/keys') {
    const form = await req.formData();
    const key = await createKey(env.DB, account.id, String(form.get('label') ?? ''));
    return accountPage(env, url.origin, account, key);
  }
  if (req.method === 'POST' && path === '/account/buy') {
    const form = await req.formData();
    const to = await checkoutUrl(env, account.id, String(form.get('pack') ?? ''), url.origin);
    return to ? redirect(to) : new Response('No such pack.', { status: 400 });
  }
  const revoke = /^\/account\/keys\/([0-9a-f]{12})\/revoke$/.exec(path);
  if (req.method === 'POST' && revoke) {
    await revokeKey(env.DB, account.id, revoke[1]);
    return redirect('/account');
  }
  if (path === '/account')
    return accountPage(env, url.origin, account, undefined, url.searchParams.has('bought'));
  return new Response('Not found', { status: 404 });
}
