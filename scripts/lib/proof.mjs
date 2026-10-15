/**
 * Shared harness for the browser proofs (`prove-file-session`, `prove-layout-tools`): starting
 * `draftably open` on a free port, waiting on the page, recording checks, and keeping enough
 * evidence after a failure to diagnose it from one run.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Start `draftably open` for a file and resolve once it prints its `Viewer:` URL. Port 0 picks a
 * free port, so proofs never collide with another worktree's viewer; pass the returned port back
 * to restart on the same URL.
 */
export function startViewer({ entry, file, cwd, port = 0 }) {
  const child = spawn(
    process.execPath,
    [entry, 'open', file, '--port', String(port), '--no-open'],
    { cwd, stdio: ['ignore', 'pipe', 'inherit'] },
  );
  return new Promise((resolve, reject) => {
    let text = '';
    child.stdout.on('data', chunk => {
      text += chunk;
      const url = text.match(/^Viewer: (\S+)/m)?.[1];
      if (url) resolve({ child, url, port: Number(new URL(url).port) });
    });
    child.once('exit', code => reject(Error(`draftably open exited with ${code}`)));
  });
}

export const stopViewer = ({ child }) =>
  new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill('SIGTERM');
  });

export async function waitFor(page, test, label, timeout = 4000) {
  const until = Date.now() + timeout;
  for (;;) {
    if (await page.evaluate(test).catch(() => false)) return true;
    if (Date.now() > until) throw Error(`Timed out waiting for ${label}`);
    await sleep(50);
  }
}

/**
 * Checks for one proof run. Screenshots and, after a failure, `failure.json` (failed checks, the
 * viewer's file state and the page console) go to `out`.
 */
export function createProof(out) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  const consoleLines = [];
  let page = null;

  return {
    out,
    check(name, ok, detail = '') {
      results.push({ name, ok, detail });
      console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
    },
    /** Record the page console so a failure report includes it. */
    watch(p) {
      page = p;
      p.on('console', m => consoleLines.push(`${m.type()}: ${m.text()}`));
      p.on('pageerror', e => consoleLines.push(`pageerror: ${e.message}`));
    },
    async shot(name) {
      await page.keyboard.press('1');
      await sleep(250);
      await page.screenshot({ path: path.join(out, name) });
    },
    /** Save failure evidence while the page is still open. Call before closing the browser. */
    async capture() {
      const failed = results.filter(r => !r.ok);
      if (!failed.length || !page) return;
      await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
      const state = await page
        .evaluate(() => window.diagramStudio?.fileState?.())
        .catch(error => ({ unavailable: error.message }));
      fs.writeFileSync(
        path.join(out, 'failure.json'),
        JSON.stringify({ failed, state, console: consoleLines.slice(-50) }, null, 2),
      );
    },
    /** Print the summary, naming each failed check, and set the exit code. */
    finish(file) {
      const failed = results.filter(r => !r.ok);
      const relative = path.relative(process.cwd(), out);
      const where = relative && !relative.startsWith('..') ? relative : out;
      console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
      for (const r of failed) console.log(`  FAILED: ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
      console.log(
        `Screenshots: ${where}/${failed.length ? ` (failure.png and failure.json)` : ''}`,
      );
      console.log(`Final file: ${file}`);
      process.exitCode = failed.length ? 1 : 0;
    },
  };
}
