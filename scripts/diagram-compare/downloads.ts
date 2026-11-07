/** Publish the study's source files and a deterministic ZIP. Run with --check to detect stale copies. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32 } from 'node:zlib';

const root = fileURLToPath(new URL('../../', import.meta.url));
const study = path.join(root, 'docs/evaluations/agent-diagrams');
const output = path.join(root, 'site/public/evaluations/agent-diagrams');
const results = JSON.parse(fs.readFileSync(path.join(study, 'results.json'), 'utf8')) as {
  cells: { source: string }[];
};
const sources = results.cells.map(cell => cell.source).sort();
assert.equal(new Set(sources).size, sources.length, 'Study sources must have unique paths.');
const files = new Map<string, Buffer>();
const archive = new Map<string, Buffer>();
for (const source of sources) {
  const bytes = fs.readFileSync(path.join(study, source));
  files.set(`source/${source}.txt`, bytes);
  archive.set(source, bytes);
}
for (const [source, name] of [
  ['REPORT.md', 'report.txt'],
  ['README.md', 'study-setup.txt'],
  ['prompt.txt', 'prompt.txt'],
  ['prompt-tooled.txt', 'prompt-tooled.txt'],
  ['tasks.json', 'tasks.json'],
  ['results.json', 'results.json'],
]) {
  const bytes = fs.readFileSync(path.join(study, source));
  files.set(name, bytes);
  archive.set(name, bytes);
}
for (const name of fs.readdirSync(path.join(root, 'scripts/diagram-compare/references')).sort()) {
  const bytes = fs.readFileSync(path.join(root, 'scripts/diagram-compare/references', name));
  files.set(`references/${name}`, bytes);
  archive.set(`references/${name}`, bytes);
}

// Store bytes without compression to keep the ZIP identical across Node/zlib versions.
const local: Buffer[] = [];
const directory: Buffer[] = [];
let offset = 0;
for (const name of [...archive.keys()].sort()) {
  const data = archive.get(name)!;
  const filename = Buffer.from(name);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(33, 12); // 1980-01-01
  header.writeUInt32LE(crc32(data), 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(filename.length, 26);
  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50);
  entry.writeUInt16LE(20, 4);
  header.copy(entry, 6, 4, 30);
  entry.writeUInt32LE(offset, 42);
  directory.push(entry, filename);
  local.push(header, filename, data);
  offset += header.length + filename.length + data.length;
}
const central = Buffer.concat(directory);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50);
end.writeUInt16LE(archive.size, 8);
end.writeUInt16LE(archive.size, 10);
end.writeUInt32LE(central.length, 12);
end.writeUInt32LE(offset, 16);
files.set('sources.zip', Buffer.concat([...local, central, end]));

for (const [name, bytes] of files) {
  const file = path.join(output, name);
  if (process.argv.includes('--check')) {
    assert.ok(
      fs.existsSync(file) && fs.readFileSync(file).equals(bytes),
      `${name} is missing or stale. Run pnpm docs:assets.`,
    );
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
  }
}
console.log(
  `${process.argv.includes('--check') ? 'Checked' : 'Wrote'} ${files.size} study downloads; ZIP contains ${archive.size} files.`,
);
