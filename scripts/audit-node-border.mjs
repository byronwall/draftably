#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { scanNodeBorders } from './lib/node-border.mjs';

const args = process.argv.slice(2);
const check = args.includes('--check');
const roots = args.filter(a => a !== '--check');
if (roots.length !== 1) {
  console.error('Usage: pnpm audit:node-border <saved-render-directory> [--check]');
  process.exit(1);
}
const root = roots[0];
function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (entry.name.endsWith('.svg') || entry.name === 'metrics.json') yield full;
  }
}
let renders = 0,
  overlaps = 0,
  painted = 0,
  nearby = 0,
  checked = 0,
  edgeFree = 0;
const errors = [],
  inventory = [...files(root)];
for (const metricsPath of inventory.filter(f => path.basename(f) === 'metrics.json')) {
  for (const m of JSON.parse(fs.readFileSync(metricsPath, 'utf8'))) {
    const expectedFile = path.join(path.dirname(metricsPath), `${path.parse(m.file).name}.svg`);
    if (!fs.existsSync(expectedFile))
      errors.push(`${path.relative(root, expectedFile)}: missing SVG render`);
  }
}
for (const file of inventory.filter(f => f.endsWith('.svg'))) {
  renders++;
  const relative = path.relative(root, file);
  try {
    const scan = scanNodeBorders(fs.readFileSync(file, 'utf8'));
    errors.push(...scan.validationErrors.map(error => `${relative}: ${error}`));
    const metricsPath = path.join(path.dirname(file), 'metrics.json');
    const expected =
      fs.existsSync(metricsPath) &&
      JSON.parse(fs.readFileSync(metricsPath, 'utf8')).find(
        m => path.parse(m.file).name === path.parse(file).name,
      );
    if (!expected) errors.push(`${relative}: missing saved metrics`);
    else {
      checked++;
      const expectedRoutes = scan.expectedRouteIds?.length ?? expected.edges;
      const expectedNodes = scan.expectedNodeIds?.length ?? expected.nodes;
      if (!expectedRoutes) edgeFree++;
      if (scan.routes !== expectedRoutes || (expectedRoutes && scan.nodes !== expectedNodes))
        errors.push(
          `${relative}: routes ${scan.routes}/${expectedRoutes}, nodes ${scan.nodes}/${expectedNodes}`,
        );
    }
    for (const run of scan.findings) {
      if (run.kind === 'overlap') overlaps++;
      else if (run.kind === 'paint-overlap') painted++;
      else nearby++;
      console.log(JSON.stringify({ render: relative, ...run }));
    }
  } catch (error) {
    errors.push(`${relative}: ${error.message}`);
  }
}
if (!renders) errors.push('No SVG renders found');
console.error(
  JSON.stringify({
    renders,
    checked,
    edgeFree,
    overlaps,
    painted,
    nearby,
    blocked: 'unknown: saved SVG has no route status',
    errors,
  }),
);
if (errors.length || (check && (overlaps || painted))) process.exitCode = 1;
