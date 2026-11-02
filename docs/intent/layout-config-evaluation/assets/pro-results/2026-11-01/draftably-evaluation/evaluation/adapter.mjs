/** Execute the unchanged shipped compiler, engines, router and SVG renderer in process.
 * Baseline path can be supplied for a fresh extraction; no product source is patched.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

export const bundleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const baselineRoot = process.env.DRAFTABLY_BASELINE
  ? path.resolve(process.env.DRAFTABLY_BASELINE)
  : path.resolve(bundleRoot, '../baseline');

export async function createAdapter() {
  const { createServer } = await import(pathToFileURL(path.join(baselineRoot, 'node_modules/vite/dist/node/index.js')));
  const server = await createServer({
    configFile: false, root: baselineRoot, logLevel: 'error',
    server: { middlewareMode: true, hmr: false, watch: null, fs: { strict: false } },
    appType: 'custom',
  });
  const modules = await Promise.all([
    '/src/dsl/compile.ts', '/src/dsl/project.ts', '/src/model/routes.ts',
    '/src/engines/layout-engine.js', '/src/engines/routing-engine.js',
    '/src/cli/svg.ts', '/src/dsl/syntax.ts', '/src/dsl/layout-edits.ts',
    '/src/model/document.ts', '/src/engines/explorer-engine.js', '/src/engines/sculpt-engine.js',
  ].map(p => server.ssrLoadModule(p)));
  const [compiler, projection, routing, layout, router, svg, syntax, layoutEdits, model, explorer, sculpt] = modules;
  let reports = [];
  let engineCalls = 0;
  const compute = layout.LayoutLab.compute;
  // Instrumentation observes calls and outputs; algorithm options and code are unchanged.
  layout.LayoutLab.compute = async (...args) => {
    engineCalls++;
    const result = await compute(...args);
    reports.push(result.report);
    return result;
  };

  function route(doc, previous = [], options = {}, useCache = true) {
    const { vg, rects } = projection.visibleRects(doc);
    const input = routing.routeInput(doc, vg, rects);
    const started = performance.now();
    const settings={ ...doc.settings.routing, ...options, previous };
    const key=crypto.createHash('sha256').update(JSON.stringify([input,settings])).digest('hex');
    const cacheFile=path.join(bundleRoot,'data/route-cache',key+'.json.gz');
    const hit=useCache&&fs.existsSync(cacheFile)?JSON.parse(zlib.gunzipSync(fs.readFileSync(cacheFile))):null;
    // Cached identical geometry is shared across trials. Timing batches explicitly bypass it.
    const result = hit?hit.result:router.RouteLab.compute(input, settings);
    const routingMs = performance.now() - started;
    if(useCache&&!hit){fs.mkdirSync(path.dirname(cacheFile),{recursive:true});const temp=cacheFile+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temp,zlib.gzipSync(JSON.stringify({result,routingMs})));fs.renameSync(temp,cacheFile);}
    const labelStarted = performance.now();
    const drawnRoutes = routing.drawRoutes(doc, vg, rects, result);
    const labelMs = performance.now() - labelStarted;
    if (!previous.length && !Object.keys(options).length) routing.rememberRoutes(doc, vg, rects, result);
    return { input, result, drawnRoutes, rects, vg, routingMs, labelMs, routingCacheHit:!!hit, routingCachedOriginalMs:hit?.routingMs??null, routeCacheKey:key,actualRouterCalls:hit?0:1 };
  }

  async function source(source, opts = {}) {
    reports = [];
    const beforeCalls = engineCalls;
    const started = performance.now();
    const scene = await compiler.compile(source);
    const compileMs = performance.now() - started;
    const errors = scene.diagnostics.filter(d => d.level === 'error');
    if (errors.length) throw Object.assign(Error(errors.map(e => e.message).join('; ')), { diagnostics: scene.diagnostics });
    const doc = projection.projectScene(scene, opts.view ?? {});
    if (opts.routing) doc.settings.routing = router.RouteLab.settings({ ...doc.settings.routing, ...opts.routing });
    opts.onLayout?.({doc,scene,reports:[...reports],engineCalls:engineCalls-beforeCalls,compileMs,source});
    const routed = opts.skipRouting ? {} : route(doc, opts.previous ?? [], opts.routeOptions ?? {},opts.useCache!==false);
    return { doc, scene, ...routed, reports: [...reports], engineCalls: engineCalls - beforeCalls,
      compileMs, totalMs: performance.now() - started, source };
  }

  async function warm(doc, opts = {}) {
    reports = [];
    const beforeCalls = engineCalls;
    const started = performance.now();
    const { routing: routingPatch, previous, skipRouting, routeOptions, onLayout, useCache, ...layoutOptions } = opts;
    const output = await layout.LayoutLab.compute(doc, layoutOptions);
    const compileMs = performance.now() - started;
    if (routingPatch) output.document.settings.routing = router.RouteLab.settings({ ...output.document.settings.routing, ...routingPatch });
    onLayout?.({doc:output.document,reports:[...reports],engineCalls:engineCalls-beforeCalls,compileMs});
    const routed = skipRouting ? {} : route(output.document, previous ?? [], routeOptions ?? {},useCache!==false);
    return { doc: output.document, ...routed, reports: [...reports], engineCalls: engineCalls - beforeCalls,
      compileMs, totalMs: performance.now() - started };
  }

  function render(result) {
    if (result.result) routing.rememberRoutes(result.doc, result.vg, result.rects, result.result);
    return svg.renderSvg(result.doc);
  }
  return { server, compiler, projection, routing, layout: layout.LayoutLab, router: router.RouteLab,
    syntax, layoutEdits, model, explorer: explorer.ExplorerLab, sculpt, source, warm, route, render,
    close: () => server.close() };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const adapter = await createAdapter();
  try {
    const file = process.argv[2] ?? path.join(baselineRoot, 'examples/web-app-components.draft');
    const output = await adapter.source(fs.readFileSync(file, 'utf8'));
    const target = process.argv[3] ?? path.join(bundleRoot, 'renders/access-production.svg');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, adapter.render(output));
    console.log(JSON.stringify({ file, nodes: output.doc.graph.nodes.length, edges: output.drawnRoutes.length,
      engineCalls: output.engineCalls, compileMs: output.compileMs, routingMs: output.routingMs,
      labelMs: output.labelMs, diagnostics: output.scene.diagnostics, target }, null, 2));
  } finally { await adapter.close(); }
}
