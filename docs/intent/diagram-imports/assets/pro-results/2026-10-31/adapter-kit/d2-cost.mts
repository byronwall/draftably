import { performance } from 'node:perf_hooks';
import { stat, readFile, realpath, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const importStarted = performance.now();
const { D2 } = await import('@d2lang/d2');
const importMs = performance.now() - importStarted;
const packageRoot = await realpath(new URL('./node_modules/@d2lang/d2/', import.meta.url));
const files = [];
for (const name of ['dist/browser/index.js','dist/node-esm/index.js','dist/node-esm/worker.js','dist/node-esm/d2.wasm','dist/node-esm/wasm_exec.js']) {
  const path = packageRoot + '/' + name;
  files.push({ name, bytes:(await stat(path)).size, gzipBytes:gzipSync(await readFile(path)).length });
}
const source = 'a: A\nb: B\na -> b: hello\n';
const runs = [];
for (let i=0; i<3; i++) {
  const started=performance.now();
  const d2=new D2();
  try {
    await d2.compile(source,{layout:'dagre',themeID:0,sketch:false});
    const coldMs=performance.now()-started;
    const warm=performance.now();
    await d2.compile(source,{layout:'dagre',themeID:0,sketch:false});
    runs.push({coldMs,warmMs:performance.now()-warm});
  } finally {await d2.dispose();}
}
const result={node:process.version,platform:process.platform,arch:process.arch,package:'@d2lang/d2@0.1.34',importMs,files,runs,method:'One local Node process; three sequential fresh worker initializations and two-node/one-edge compile per worker, then repeated compile. Cold starts include WASM load/init and layout, exclude npm import. Gzip levels use Node defaults. Not a browser benchmark or statistically representative performance claim.'};
console.log(JSON.stringify(result,null,2));
await writeFile(new URL('./d2-cost-results.json',import.meta.url),JSON.stringify(result,null,2));
