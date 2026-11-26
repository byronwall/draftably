/**
 * The render service in local workerd (`wrangler dev --env proof`) on a fresh local D1, for the
 * service proofs. Two fixture accounts: `poor` holds 20 credits, `rich` 100,000. Their keys are
 * fixtures for the proofs only. `state` is the folder for D1 and the cache, so a run never touches
 * the database `pnpm service:dev` uses, and two proofs can run at once.
 */
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const KEYS = {
  poor: 'dft_aaaaaaaaaaaa.proof-secret-poor-0123456789',
  rich: 'dft_bbbbbbbbbbbb.proof-secret-rich-0123456789',
};

export async function startService(state: string) {
  const port = 8787 + Math.floor(Math.random() * 1000);
  const base = `http://127.0.0.1:${port}`;
  const d1 = (...args: string[]) =>
    execFileSync(
      'pnpm',
      ['exec', 'wrangler', 'd1', ...args, '--local', '--env', 'proof', '--persist-to', state],
      { cwd: 'packages/service', encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
  const sql = (command: string) =>
    JSON.parse(d1('execute', 'DB', '--json', '--command', command))[0].results as Record<
      string,
      number
    >[];
  fs.rmSync(path.join('packages/service', state), { recursive: true, force: true });
  d1('migrations', 'apply', 'DB');
  const month = new Date().toISOString().slice(0, 7),
    now = new Date().toISOString();
  const hash = (key: string) => createHash('sha256').update(key.split('.')[1]).digest('hex');
  sql(
    `INSERT INTO accounts (id, email, grant_left, grant_month, bought, created_at) VALUES
     ('poor', 'poor@example.com', 20, '${month}', 0, '${now}'), ('rich', 'rich@example.com', 0, '${month}', 100000, '${now}');
     INSERT INTO keys (id, account_id, hash, label, created_at) VALUES
     ('aaaaaaaaaaaa', 'poor', '${hash(KEYS.poor)}', 'proof', '${now}'),
     ('bbbbbbbbbbbb', 'rich', '${hash(KEYS.rich)}', 'proof', '${now}');`,
  );

  const dev = spawn(
    'pnpm',
    [
      'exec',
      'wrangler',
      'dev',
      '--local',
      '--persist-to',
      state,
      '--env',
      'proof',
      '--port',
      String(port),
      '--ip',
      '127.0.0.1',
    ],
    { cwd: 'packages/service', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const out = { log: '' };
  dev.stdout.on('data', d => (out.log += d));
  dev.stderr.on('data', d => (out.log += d));
  const stop = () => dev.kill('SIGTERM');
  process.on('exit', stop);

  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return { base, sql, stop, out };
    } catch {
      // not listening yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw Error('wrangler dev did not start:\n' + out.log);
}
