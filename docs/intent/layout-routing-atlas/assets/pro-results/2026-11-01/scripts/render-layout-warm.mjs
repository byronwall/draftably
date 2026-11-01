import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {openRuntime} from './editor-runtime.mjs';
const {server,out,fixture}=await openRuntime();
const save = (name, data) => fs.writeFileSync(path.join(out, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
try {
  const [{compile}, {projectScene, canonicalGeometry}, {LayoutLab}, {RouteLab}, {ExplorerLab}, {renderSvg}] = await Promise.all([
    '/src/dsl/compile.ts', '/src/dsl/project.ts', '/src/engines/layout-engine.js', '/src/engines/routing-engine.js', '/src/engines/explorer-engine.js', '/src/cli/svg.ts',
  ].map(file => server.ssrLoadModule(file)));
  const families = [
    {id: 'VL10', name: 'alignment', algorithm: 'tidy', key: 'alignment', values: [0,55,100], maxMove: 48, stability: 65, iterations: 32},
    {id: 'VL12', name: 'grid', algorithm: 'grid', key: 'gridStrength', values: [0,45,100], maxMove: 48, stability: 65, iterations: 32},
    {id: 'VL13', name: 'ordering', algorithm: 'layered', key: 'ordering', values: ['stable','crossings'], maxMove: 192, stability: 0, iterations: 96},
  ];
  const rows = [];
  const render = (name, document, details) => {
    const geometry = canonicalGeometry(document);
    for (const n of geometry.nodes) for (const key of ['x','y','w','h']) if (!Number.isFinite(n[key])) throw Error(`${name}:${n.id}.${key} nonfinite`);
    for (const route of geometry.routes) for (const p of route.points) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw Error(`${name}:${route.id} nonfinite route`);
    const routing = RouteLab.compute(ExplorerLab.sceneInput(document), {...document.settings.routing, previous: []});
    const svg = renderSvg(document);
    const size = /width="([\d.]+)" height="([\d.]+)"/.exec(svg);
    save('json/'+name+'.json', document); save('svg/'+name+'.svg', svg); save('geometry/'+name+'.json', geometry);
    const row = {name, document: 'json/'+name+'.json', svg: 'svg/'+name+'.svg', geometry: 'geometry/'+name+'.json', geometry_sha256: hash(geometry), metrics: {width: +size[1], height: +size[2], crossings: routing.report.crossings, bends: routing.report.bends, length: routing.report.length}, ...details};
    rows.push(row); return row;
  };
  for (const family of families) {
    const source = fs.readFileSync(fixture('layout-warm/warm-'+family.name+'-start.draft'),'utf8');
    save('sources/warm-'+family.name+'-start.draft', source);
    const scene = await compile(source), baseline = projectScene(scene);
    family.startSource = 'sources/warm-'+family.name+'-start.draft';
    family.startJson = 'json/warm-'+family.name+'-before.json';
    family.diagnostics = scene.diagnostics;
    render('warm-'+family.name+'-before', baseline, {visual_ids: [family.id], operation: 'shared starting document', source: family.startSource});
    const common = {...LayoutLab.defaults, algorithm: family.algorithm, direction: 'RIGHT', mode: 'pass', warmStart: true, settle: false, maxMove: family.maxMove, stability: family.stability, iterations: family.iterations, fold: 'never', respectDirection: true, respectManual: false, growContainers: false, nodeGap: 24, rankGap: 52, edgeLength: 88, compactness: 35, aspect: '1.6', scope: 'all', selected: [], fixedIds: [], viewport: {w: 1440,h: 1000}};
    family.options = common;
    for (const value of family.values) {
      const options = {...common, [family.key]: value};
      const result = await LayoutLab.compute(structuredClone(baseline), options);
      render('warm-'+family.name+'-'+value, result.document, {visual_ids: [family.id], operation: 'one bounded native pass', parameter: family.key, value, options, report: result.report, source: family.startSource, startingJson: family.startJson});
    }
    const rects = rows.filter(r => r.visual_ids.includes(family.id)).flatMap(r => JSON.parse(fs.readFileSync(path.join(out,'geometry',r.name+'.json'),'utf8')).nodes);
    const x = Math.min(...rects.map(r=>r.x)), y = Math.min(...rects.map(r=>r.y));
    family.commonWorldRectangle = {x,y,w:Math.max(...rects.map(r=>r.x+r.w))-x,h:Math.max(...rects.map(r=>r.y+r.h))-y};
  }
  const evidence = {baseline:'af70d8317797d5a522acffdd604819376a3ec893', execution:'Actual baseline compile/projectScene, LayoutLab.compute, canonicalGeometry, RouteLab.compute and renderSvg loaded by Vite SSR. Native model results, not editor UI screenshots.', reproduction:'node scripts/render-layout-warm.mjs --repo /path/to/pinned-draftably --examples /path/to/artifact/examples --out /path/to/output', routing:'Actual exported scenes route with previous:[], without UI route-cache history.', families, rows};
  save('model-render-results.json', evidence);
  console.log(JSON.stringify({rows:rows.map(({name,parameter,value,metrics,geometry_sha256})=>({name,parameter,value,metrics,geometry_sha256})),families:families.map(({id,name,diagnostics})=>({id,name,diagnostics}))},null,2));
} finally { await server.close(); }
