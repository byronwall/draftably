/**
 * Who is calling: an API key (`Authorization: Bearer dft_<id>.<secret>`) for the REST API, MCP
 * and keyed image URLs, or a session cookie for the account page. Sign-in is a link sent by email.
 */
export interface AuthEnv {
  DB: D1Database;
  /** Cloudflare Email Service; sends the sign-in links. */
  EMAIL: SendEmail;
  EMAIL_FROM: string;
  /** Sign-in emails per IP. The per-address cap is in D1 (`sendLoginLink`). */
  LOGIN_LIMIT: RateLimit;
}

import { note, span } from './obs';

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

/** The account behind an API key (`dft_<id>.<secret>`), or null for anything else. */
export async function checkKey(db: D1Database, token: string) {
  const m = /^dft_([0-9a-f]{12})\.([\w-]{20,64})$/.exec(token);
  if (!m) return null;
  const row = await span('auth.key', {}, async s => {
    const row = await db
      .prepare(`SELECT account_id, hash FROM keys WHERE id = ?1 AND revoked_at IS NULL`)
      .bind(m[1])
      .first<{ account_id: string; hash: string }>();
    const ok = !!row && row.hash === (await sha256(m[2]));
    s.setAttribute('found', ok);
    return ok ? row : null;
  });
  if (!row) return null;
  return { account: row.account_id, key: m[1] };
}

export const touchKey = (db: D1Database, id: string) =>
  db
    .prepare(`UPDATE keys SET last_used_at = ?1 WHERE id = ?2`)
    .bind(new Date().toISOString(), id)
    .run();

/** The account behind a request's bearer key: undefined with no key, null with a bad one. */
export async function keyAccount(req: Request, db: D1Database, ctx: ExecutionContext) {
  const header = req.headers.get('Authorization');
  if (!header) return undefined;
  // The scheme is case-insensitive (RFC 9110); the key itself is matched exactly.
  const who = await checkKey(db, /^bearer\s+(\S+)$/i.exec(header.trim())?.[1] ?? '');
  if (who) ctx.waitUntil(touchKey(db, who.key));
  return who;
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
      `SELECT a.id, a.email FROM sessions s JOIN accounts a ON a.id = s.account_id
       WHERE s.id = ?1 AND s.expires_at > ?2`,
    )
    .bind(await sha256(id), new Date().toISOString())
    .first<{ id: string; email: string }>();
  if (row) note({ payer: 'session', account: row.id });
  return row ?? undefined;
}

const LINK_MINUTES = 15;
/** Links one address may get in 15 minutes (a link's life), so the form can't flood an inbox. */
const MAX_LINKS = 5;

/** A plausible address, lowercased, or null. The mail server decides the rest. */
export const cleanEmail = (raw: string) => {
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email) ? email : null;
};

/**
 * Mail a one-use sign-in link to `email`. Only the token's hash is stored. False, and nothing
 * sent, when the address already got `MAX_LINKS` links that have not expired. The cap is one
 * statement, so it holds across Cloudflare locations and parallel requests.
 */
export async function sendLoginLink(env: AuthEnv, email: string, origin: string, next?: string) {
  const token = randomToken(32);
  const hash = await sha256(token);
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + LINK_MINUTES * 60_000).toISOString();
  const [, added] = await env.DB.batch([
    env.DB.prepare(`DELETE FROM login_tokens WHERE expires_at <= ?1`).bind(now),
    env.DB.prepare(
      `INSERT INTO login_tokens (hash, email, expires_at) SELECT ?1, ?2, ?3
       WHERE (SELECT count(*) FROM login_tokens WHERE email = ?2) < ?4`,
    ).bind(hash, email, expires, MAX_LINKS),
  ]);
  if (!added.meta.changes) return false;
  // `next` returns the browser to an app's authorization after sign-in (oauth.ts).
  const link = `${origin}/auth/verify?token=${token}${next ? `&next=${encodeURIComponent(next)}` : ''}`;
  // A failed send must not hold one of the address's links. The cleanup hangs on the send's own
  // promise, so a send that throws at once leaves the row, as before tracing.
  await span('login.email', {}, () =>
    env.EMAIL.send({
      to: email,
      from: { email: env.EMAIL_FROM, name: 'Draftably' },
      subject: 'Sign in to Draftably',
      text: `Open this link to sign in to Draftably:\n\n${link}\n\nIt works once, for ${LINK_MINUTES} minutes. If you did not ask for it, ignore this email.\n`,
      html: `<p>Open this link to sign in to Draftably:</p><p><a href="${link}">Sign in to Draftably</a></p><p>It works once, for ${LINK_MINUTES} minutes. If you did not ask for it, ignore this email.</p>`,
    }).catch(async error => {
      await env.DB.prepare(`DELETE FROM login_tokens WHERE hash = ?1`).bind(hash).run();
      throw error;
    }),
  );
  return true;
}

/** The address a sign-in token is for, if it can still be used. Spends nothing. */
export async function loginTokenEmail(db: D1Database, token: string) {
  const row = await db
    .prepare(
      `SELECT email FROM login_tokens WHERE hash = ?1 AND used_at IS NULL AND expires_at > ?2`,
    )
    .bind(await sha256(token), new Date().toISOString())
    .first<{ email: string }>();
  return row?.email ?? null;
}

/** Spend a sign-in token: its email if it is known, unused and unexpired; else null. */
export async function useLoginToken(db: D1Database, token: string) {
  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `UPDATE login_tokens SET used_at = ?2
       WHERE hash = ?1 AND used_at IS NULL AND expires_at > ?2 RETURNING email`,
    )
    .bind(await sha256(token), now)
    .first<{ email: string }>();
  return row?.email ?? null;
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
