/**
 * Who is calling: an API key (`Authorization: Bearer dft_<id>.<secret>`) for the REST API, MCP
 * and keyed image URLs, or a session cookie for the account page. Sign-in is GitHub OAuth only.
 */
export interface AuthEnv {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (text: string) =>
  hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
const randomToken = (bytes: number) => {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...b))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/** A new key for `account`. The full key is shown once; only its hash is stored. */
export async function createKey(db: D1Database, account: string, label: string) {
  const id = hex(crypto.getRandomValues(new Uint8Array(6)).buffer);
  const secret = randomToken(24);
  await db
    .prepare(
      `INSERT INTO keys (id, account_id, hash, label, created_at) VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(id, account, await sha256(secret), label.slice(0, 60) || 'key', new Date().toISOString())
    .run();
  return `dft_${id}.${secret}`;
}

export async function revokeKey(db: D1Database, account: string, id: string) {
  await db
    .prepare(`UPDATE keys SET revoked_at = ?1 WHERE id = ?2 AND account_id = ?3`)
    .bind(new Date().toISOString(), id, account)
    .run();
}

/** The account behind a request's bearer key: undefined with no key, null with a bad one. */
export async function keyAccount(req: Request, db: D1Database, ctx: ExecutionContext) {
  const header = req.headers.get('Authorization');
  if (!header) return undefined;
  const m = /^Bearer dft_([0-9a-f]{12})\.([\w-]{20,64})$/.exec(header.trim());
  if (!m) return null;
  const row = await db
    .prepare(`SELECT account_id, hash FROM keys WHERE id = ?1 AND revoked_at IS NULL`)
    .bind(m[1])
    .first<{ account_id: string; hash: string }>();
  if (!row || row.hash !== (await sha256(m[2]))) return null;
  ctx.waitUntil(
    db
      .prepare(`UPDATE keys SET last_used_at = ?1 WHERE id = ?2`)
      .bind(new Date().toISOString(), m[1])
      .run(),
  );
  return { account: row.account_id, key: m[1] };
}

const SESSION = 'dft_session';
const cookie = (req: Request, name: string) =>
  req.headers
    .get('Cookie')
    ?.split(/;\s*/)
    .find(c => c.startsWith(name + '='))
    ?.slice(name.length + 1);

/** The signed-in account, from the session cookie. */
export async function sessionAccount(req: Request, db: D1Database) {
  const id = cookie(req, SESSION);
  if (!id) return undefined;
  const row = await db
    .prepare(
      `SELECT a.id, a.login FROM sessions s JOIN accounts a ON a.id = s.account_id
       WHERE s.id = ?1 AND s.expires_at > ?2`,
    )
    .bind(await sha256(id), new Date().toISOString())
    .first<{ id: string; login: string }>();
  return row ?? undefined;
}

/** The redirect to GitHub's sign-in, with a state cookie that the callback checks. */
export function startSignIn(env: AuthEnv, origin: string) {
  const state = randomToken(16);
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', `${origin}/auth/github/callback`);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', ''); // the public profile is enough
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': `dft_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=600`,
    },
  });
}

/**
 * GitHub's redirect back: check the state, trade the code for a token, read the user, and start a
 * 30-day session. Returns the GitHub user, or an error message.
 */
export async function finishSignIn(req: Request, env: AuthEnv) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code'),
    state = url.searchParams.get('state');
  if (!code || !state || state !== cookie(req, 'dft_state'))
    return { error: 'The sign-in link expired. Try again.' };
  const token = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/auth/github/callback`,
    }),
  }).then(r => r.json<{ access_token?: string }>());
  if (!token.access_token) return { error: 'GitHub did not accept the sign-in. Try again.' };
  const user = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'User-Agent': 'draftably-render-service',
      Accept: 'application/vnd.github+json',
    },
  }).then(r => r.json<{ id?: number; login?: string }>());
  if (!user.id || !user.login) return { error: 'GitHub did not return a profile.' };
  return { user: { id: user.id, login: user.login } };
}

/** A session cookie for `account`, stored by hash like keys. */
export async function startSession(db: D1Database, account: string) {
  const id = randomToken(24);
  const expires = new Date(Date.now() + 30 * 86400_000);
  await db
    .prepare(`INSERT INTO sessions (id, account_id, expires_at) VALUES (?1, ?2, ?3)`)
    .bind(await sha256(id), account, expires.toISOString())
    .run();
  return `${SESSION}=${id}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 86400}`;
}

export async function endSession(req: Request, db: D1Database) {
  const id = cookie(req, SESSION);
  if (id)
    await db
      .prepare(`DELETE FROM sessions WHERE id = ?1`)
      .bind(await sha256(id))
      .run();
  return `${SESSION}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
