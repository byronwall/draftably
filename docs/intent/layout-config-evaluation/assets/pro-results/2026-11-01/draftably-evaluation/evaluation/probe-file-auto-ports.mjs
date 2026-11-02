/** Post-seal applicability probe, not a geometry-quality experiment.
 * Executes exact AST-extracted source functions against real parser/settings helpers.
 * No product edit, compiler call, layout call, policy change, or heldout data access.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineRoot = process.env.DRAFTABLY_BASELINE ? path.resolve(process.env.DRAFTABLY_BASELINE) : path.resolve(root, '../baseline');
const out = path.join(root, 'data/analysis/file-auto-ports-probe');
fs.mkdirSync(out, { recursive: true });
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const json = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n');
const ts = (await import(pathToFileURL(path.join(baselineRoot, 'node_modules/typescript/lib/typescript.js')))).default;
const sources = Object.fromEntries(['src/state/comparison.ts', 'src/state/file-session.ts', 'src/dsl/layout-edits.ts', 'src/engines/explorer-engine.js'].map(p => [p, fs.readFileSync(path.join(baselineRoot, p), 'utf8')]));
function extract(file, name) {
  const parsed = ts.createSourceFile(file, sources[file], ts.ScriptTarget.Latest, true);
  const node = parsed.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert(node?.body, `Missing actual source function ${name}`);
  return { file, name, firstLine: parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1,
    lastLine: parsed.getLineAndCharacterOfPosition(node.end).line + 1,
    bodySha256: sha(node.body.getText(parsed)), textSha256: sha(node.getText(parsed)), text: node.getText(parsed) };
}
const extracted = [extract('src/state/comparison.ts', 'candidateSource'), extract('src/state/file-session.ts', 'sourceWithRouting'), extract('src/state/file-session.ts', 'sourceScope')];
const fixturePath = path.join(root, 'corpus/routing/route-20.draft');
const geometryPath = path.join(root, 'data/geometry/D-freeze-route-20.json.gz');
const fixture = fs.readFileSync(fixturePath, 'utf8');
const geometryBytes = fs.readFileSync(geometryPath);
const baseline = JSON.parse(zlib.gunzipSync(geometryBytes)).doc;
assert.equal(baseline.layout.edges.e0.fromSide, 'top');
assert.equal(baseline.layout.edges.e0.toSide, 'left');
const declaration = {
  declaredAt: new Date().toISOString(), phase: 'post-seal implementation-applicability probe',
  purpose: 'Test whether the current file-mode Release explicit ports checkbox changes the emitted source. Distinguish the raw Explorer routing API, where this option is implemented.',
  decisionScope: 'UI-RELEASE-PORTS only; no algorithm/configuration selection, scoring changes, heldout fitting, or default change.',
  hypotheses: ['Exact file candidateSource false/true produce byte-identical source and preserve explicit authored sides.', 'Actual sourceWithRouting/setRouting edit a scalar routing setting but leave edge side attributes alone.', 'Raw Explorer candidate false/true differ in explicit side configuration.'],
  frozenPolicySha256: sha(fs.readFileSync(path.join(root, 'data/policy-freeze.json'))),
  sources: Object.fromEntries(Object.entries(sources).map(([p, s]) => [p, sha(s)])),
  functions: extracted.map(({ text, ...metadata }) => metadata),
  fixture: { path: 'corpus/routing/route-20.draft', sha256: sha(fixture), existingGeometry: 'data/geometry/D-freeze-route-20.json.gz', geometrySha256: sha(geometryBytes), origin: 'development routing fixture; pre-existing fixed positions' },
  plannedCalls: { sourceCandidate: 3, directSourceWithRouting: 1, directSetRouting: 1, router: 2, layout: 0, compiler: 0 },
  constraints: ['No product files changed', 'No source compilation', 'Only two small uncached raw router calls', 'No quality superiority claim from this probe', 'No heldout outcome files read']
};
json('design.json', declaration);
fs.writeFileSync(path.join(out, 'extracted-functions.ts'), extracted.map(x => `// ${x.file}:${x.firstLine}-${x.lastLine}; body SHA256 ${x.bodySha256}\n${x.text}`).join('\n\n') + '\n');

// The declaration above is persisted before executing any product function.
const { createServer } = await import(pathToFileURL(path.join(baselineRoot, 'node_modules/vite/dist/node/index.js')));
const server = await createServer({ configFile: false, root: baselineRoot, logLevel: 'error', server: { middlewareMode: true, hmr: false, watch: null, fs: { strict: false } }, appType: 'custom' });
let routerCalls = 0, layoutCalls = 0, fileOn = true;
let originalRoute, originalLayout, router, layout;
const checks = [];
function check(label, predicate) { checks.push({ label, pass: Boolean(predicate) }); assert(predicate, label); }
try {
  const [syntax, layoutEdits, routerModule, layoutModule, explorerModule] = await Promise.all([
    '/src/dsl/syntax.ts', '/src/dsl/layout-edits.ts', '/src/engines/routing-engine.js', '/src/engines/layout-engine.js', '/src/engines/explorer-engine.js'
  ].map(p => server.ssrLoadModule(p)));
  router = routerModule.RouteLab; layout = layoutModule.LayoutLab;
  originalRoute = router.compute; originalLayout = layout.compute;
  router.compute = (...args) => { routerCalls++; return originalRoute(...args); };
  layout.compute = () => { layoutCalls++; throw Error('Probe forbids layout calls'); };
  const transpiled = ts.transpileModule(extracted.map(x => x.text).join('\n\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const make = new Function('exports', 'fileMode', 'localSource', 'readSource', 'setRouting', 'printSource', 'RouteLab', 'LayoutLab', 'sourceWithRecipe', transpiled + '\nreturn {candidateSource,sourceWithRouting,sourceScope};');
  const actual = make({}, () => fileOn, fixture, syntax.readSource, layoutEdits.setRouting, syntax.printSource, router, layout, () => { throw Error('Probe forbids recipe/compile branch'); });
  const spec = { id: 'ancillary-source-applicability', label: 'Clearance 4', patch: { clearance: 4 } };
  const config = { mode: 'routing', run: 'rebuild', scope: 'all', priorRoutes: [] };
  const beforeDocument = JSON.stringify(baseline);
  const sourceFalse = actual.candidateSource(baseline, spec, { ...config, autoPorts: false });
  const sourceTrue = actual.candidateSource(baseline, spec, { ...config, autoPorts: true });
  const routingSettings = router.settings({ ...baseline.settings.routing, ...spec.patch });
  const helperSource = actual.sourceWithRouting(routingSettings);
  const directDocument = syntax.readSource(fixture);
  layoutEdits.setRouting(directDocument, routingSettings);
  const directSource = syntax.printSource(directDocument);
  const edges = text => syntax.readSource(text).lines.filter(x => x.command === 'edge').map(x => syntax.printStatement(x));
  const originalEdges = edges(fixture), emittedEdges = edges(sourceTrue);
  const withoutRouting = text => text.split('\n').filter(x => !/^routing(?:\s|$)/.test(x)).join('\n');
  check('Exact candidateSource emits byte-identical text for autoPorts false/true', sourceFalse === sourceTrue);
  check('Extracted sourceWithRouting and actual imported setRouting match file candidate text', sourceTrue === helperSource && sourceTrue === directSource);
  check('Positive scalar source edit inserts clearance=4', /^routing .*\bclearance=4(?:\s|$)/m.test(sourceTrue));
  check('Source output preserves every authored edge statement', JSON.stringify(originalEdges) === JSON.stringify(emittedEdges));
  check('Explicit top/left edge sides remain in source', emittedEdges.some(x => /edge e0 .*from=top to=left/.test(x)));
  check('All non-routing source lines are unchanged after normal printing', withoutRouting(sourceTrue) === withoutRouting(syntax.printSource(syntax.readSource(fixture))));
  fileOn = false;
  check('Actual fileMode guard returns null outside file mode', actual.candidateSource(baseline, spec, { ...config, autoPorts: true }) === null);
  check('Source-only probe performs zero router and zero layout calls', routerCalls === 0 && layoutCalls === 0);
  fs.writeFileSync(path.join(out, 'file-mode-auto-ports-false.draft'), sourceFalse);
  fs.writeFileSync(path.join(out, 'file-mode-auto-ports-true.draft'), sourceTrue);

  const raw = [];
  for (const autoPorts of [false, true]) {
    const started = performance.now();
    const candidate = await explorerModule.ExplorerLab.candidate(baseline, spec, { ...config, autoPorts });
    const elapsedMs = performance.now() - started;
    fs.writeFileSync(path.join(out, `raw-explorer-auto-ports-${autoPorts}.json.gz`), zlib.gzipSync(JSON.stringify(candidate)));
    raw.push({ autoPorts, elapsedMs, e0Config: candidate.document.layout.edges.e0,
      allEdgeConfigs: candidate.document.layout.edges, routingSha256: sha(JSON.stringify(candidate.routing)),
      resultKeys: Object.keys(candidate.routing) });
  }
  check('Raw Explorer false retains explicit authored sides', raw[0].e0Config.fromSide === 'top' && raw[0].e0Config.toSide === 'left');
  check('Raw Explorer true releases both explicit authored sides', raw[1].e0Config.fromSide === 'auto' && raw[1].e0Config.toSide === 'auto');
  check('Exactly two actual uncached router calls and zero layout calls', routerCalls === 2 && layoutCalls === 0);
  check('Source and raw branches preserve their input document', JSON.stringify(baseline) === beforeDocument);
  const result = { ...declaration, completedAt: new Date().toISOString(), scriptSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
    execution: { routerCalls, layoutCalls, compilerCalls: 0, compilerCallEvidence: 'No compiler entrypoint is imported or called by the probe; routing-only candidate path and its exact source functions are shown in extracted-functions.ts.', rawTiming: 'Two ancillary calls under concurrent experiment load; not a latency benchmark' },
    source: { falseSha256: sha(sourceFalse), trueSha256: sha(sourceTrue), byteIdentical: sourceFalse === sourceTrue, originalEdges, emittedEdges },
    raw, checks, passed: checks.filter(x => x.pass).length, failed: checks.filter(x => !x.pass).length,
    conclusion: 'Measured no-op in the current file routing-comparison source branch. The same autoPorts option is active in raw Explorer routing. Remove the ineffective checkbox only in that file-source context; retain explicit side controls and raw capability. A future release-ports file action would require an actual source edge edit and separate acceptance tests.' };
  json('result.json', result);
  console.log(JSON.stringify({ output: out, passed: result.passed, failed: result.failed, routerCalls, layoutCalls, sourceByteIdentical: result.source.byteIdentical, rawConfigChanged: JSON.stringify(raw[0].e0Config) !== JSON.stringify(raw[1].e0Config) }, null, 2));
} finally {
  if (router && originalRoute) router.compute = originalRoute;
  if (layout && originalLayout) layout.compute = originalLayout;
  await server.close();
}
