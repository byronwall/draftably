import { spawnSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const proofDir = path.join(root, 'tmp/markdown-package-proof');
const result = JSON.parse(readFileSync(path.join(proofDir, 'consumer.json'), 'utf8')) as {
  consumer: string;
};
const proof = spawnSync(process.execPath, ['interactive-browser.mjs'], {
  cwd: result.consumer,
  encoding: 'utf8',
});
const log = `${proof.stdout ?? ''}${proof.stderr ?? ''}`;
writeFileSync(path.join(root, 'tmp/markdown-browser-proof.log'), log);
process.stdout.write(log);
if (proof.error) throw proof.error;
if (proof.status !== 0) {
  process.exitCode = proof.status ?? 1;
} else {
  copyFileSync(
    path.join(result.consumer, 'out/interactive-enhanced.png'),
    path.join(proofDir, 'interactive-enhanced.png'),
  );
}
