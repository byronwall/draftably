/**
 * Credits live in D1. A spend is one guarded UPDATE, so parallel calls can't overdraw: D1 runs
 * writes one at a time, and the WHERE clause refuses a spend the balance can't cover. The grant
 * resets on the first spend of a new month.
 */
import type { Format } from './draw';

/** Free credits each account gets every month. */
export const MONTHLY_GRANT = 1000;

/** What a render costs. Validate, convert, the guide and cache hits are free. */
export const COST: Record<Format, number> = { svg: 1, png: 2 };

export interface Balance {
  grant: number;
  bought: number;
  /** The first day of next month (UTC), when the grant resets. */
  resetsAt: string;
}

const month = (d = new Date()) => d.toISOString().slice(0, 7);
const nextMonth = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);

/** The statement that starts a new month's grant; harmless within the month. */
const resetGrant = (db: D1Database, account: string) =>
  db
    .prepare(
      // Only forward: a request that read last month's date can't reset this month's grant.
      `UPDATE accounts SET grant_left = ?1, grant_month = ?2 WHERE id = ?3 AND grant_month < ?2`,
    )
    .bind(MONTHLY_GRANT, month(), account);

/**
 * Take `n` credits from the grant first, then bought credits. Returns the balance left, or null
 * when the account can't cover it (nothing is taken then).
 */
export async function spend(db: D1Database, account: string, n: number, ref: string) {
  const now = new Date().toISOString();
  const [, spent] = await db.batch<{ grant_left: number; bought: number }>([
    resetGrant(db, account),
    // SQLite reads every right-hand side from the row before the update.
    db
      .prepare(
        `UPDATE accounts
         SET grant_left = max(grant_left - ?1, 0), bought = bought - max(?1 - grant_left, 0)
         WHERE id = ?2 AND grant_left + bought >= ?1
         RETURNING grant_left, bought`,
      )
      .bind(n, account),
    db
      .prepare(
        `INSERT INTO ledger (account_id, delta, reason, ref, created_at)
         SELECT ?1, ?2, 'render', ?3, ?4 WHERE changes() = 1`,
      )
      .bind(account, -n, ref, now),
  ]);
  const row = spent.results[0];
  return row ? { grant: row.grant_left, bought: row.bought, resetsAt: nextMonth() } : null;
}

export async function balance(db: D1Database, account: string): Promise<Balance> {
  const [, read] = await db.batch<{ grant_left: number; bought: number }>([
    resetGrant(db, account),
    db.prepare(`SELECT grant_left, bought FROM accounts WHERE id = ?1`).bind(account),
  ]);
  const row = read.results[0];
  return { grant: row?.grant_left ?? 0, bought: row?.bought ?? 0, resetsAt: nextMonth() };
}

/** A new account with this month's grant, or the existing one for this GitHub user. */
export async function upsertAccount(db: D1Database, githubId: number, login: string) {
  const id = crypto.randomUUID();
  const row = await db
    .prepare(
      `INSERT INTO accounts (id, github_id, login, grant_left, grant_month, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT (github_id) DO UPDATE SET login = excluded.login
       RETURNING id`,
    )
    .bind(id, githubId, login, MONTHLY_GRANT, month(), new Date().toISOString())
    .first<{ id: string }>();
  return row!.id;
}
