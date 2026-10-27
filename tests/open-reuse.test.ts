import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli/main';
import { runningViewers } from '../src/cli/open';
import { cliVersion } from '../src/cli/skill';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'draftably-viewers-')),
  folder = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'draftably-folder-')));
fs.writeFileSync(path.join(folder, 'a.draft'), 'diagram "A" version=1\nnode a "A"\n');
process.env.DRAFTABLY_HOME = home;
afterEach(() => vi.restoreAllMocks());

const record = (pid: number, version = cliVersion()) => {
  fs.mkdirSync(path.join(home, 'viewers'), { recursive: true });
  fs.writeFileSync(
    path.join(home, 'viewers', `${pid}.json`),
    JSON.stringify({ pid, port: 5199, root: folder, version, started: '' }),
  );
};

async function run(...argv: string[]) {
  let out = '';
  vi.spyOn(console, 'log').mockImplementation((...p) => void (out += p.join(' ') + '\n'));
  return { code: await main(argv), out };
}

describe('open with a running viewer', () => {
  it('drops records of viewers that stopped', () => {
    record(2 ** 22 + 12345);
    expect(runningViewers()).toEqual([]);
    expect(fs.readdirSync(path.join(home, 'viewers'))).toEqual([]);
  });

  it('reuses the viewer serving the folder and prints its URL', async () => {
    record(process.pid);
    const { code, out } = await run('open', path.join(folder, 'a.draft'), '--no-open');
    expect(code).toBe(0);
    expect(out).toContain('Viewer: http://127.0.0.1:5199/?file=a.draft');
    expect((await run('open', '--status')).out).toContain(`${folder}  draftably ${cliVersion()}`);
  });

  it('says how to replace a viewer from another version', async () => {
    record(process.pid, '0.0.1');
    const { out } = await run('open', folder, '--no-open');
    expect(out).toContain('A viewer from draftably 0.0.1');
    expect(out).toContain('open --replace');
  });
});
