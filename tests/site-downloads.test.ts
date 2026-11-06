import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';

it('keeps published sources and the ZIP in sync with the study', () => {
  const script = path.join(__dirname, '../scripts/diagram-compare/downloads.ts');
  expect(() =>
    execFileSync(process.execPath, [script, '--check'], { stdio: 'pipe' }),
  ).not.toThrow();
});

it('opens the download with a standard ZIP reader', () => {
  const zip = path.join(__dirname, '../site/public/evaluations/agent-diagrams/sources.zip');
  execFileSync('unzip', ['-t', zip], { stdio: 'pipe' });
  const prompt = fs.readFileSync(
    path.join(__dirname, '../docs/evaluations/agent-diagrams/prompt.txt'),
  );
  expect(execFileSync('unzip', ['-p', zip, 'prompt.txt']).equals(prompt)).toBe(true);
});
