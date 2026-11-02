#!/usr/bin/env node
/** Optional reproducible browser fallback, not a product modification.
 * Install `npm install --prefix <runtime> @sparticuz/chromium@153.0.0` first.
 * node evaluation/setup-browser.mjs <runtime> <playwright-browser-cache> [baseline-root]
 * Normal Playwright chromium installation remains preferred. Runtime flags/environment are logged.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createBrotliDecompress } from 'node:zlib';
const [runtime,cache,baseline=path.resolve('../baseline')]=process.argv.slice(2);
if(!runtime||!cache){console.error('Usage: node setup-browser.mjs <runtime> <playwright-cache> [baseline-root]');process.exit(2);}
const browserPackage=path.resolve(runtime,'node_modules/@sparticuz/chromium');
const metadata=JSON.parse(fs.readFileSync(path.join(browserPackage,'package.json'),'utf8'));
const browsers=JSON.parse(fs.readFileSync(path.join(baseline,'node_modules/playwright-core/browsers.json'),'utf8')).browsers;
const dest=path.resolve(cache,'runtime/chromium');fs.mkdirSync(path.dirname(dest),{recursive:true});
await pipeline(fs.createReadStream(path.join(browserPackage,'bin/chromium.br')),createBrotliDecompress(),fs.createWriteStream(dest));
fs.chmodSync(dest,0o755);
for(const name of ['chromium','chromium-headless-shell']){
 const info=browsers.find(b=>b.name===name);if(!info)continue;
 const parent=path.resolve(cache,`${name.replaceAll('-','_')}-${info.revision}`);
 const rel=name==='chromium'?'chrome-linux64/chrome':'chrome-headless-shell-linux64/chrome-headless-shell';
 const target=path.join(parent,rel);fs.mkdirSync(path.dirname(target),{recursive:true});
 if(fs.existsSync(target))fs.unlinkSync(target);fs.symlinkSync(dest,target);
 fs.writeFileSync(path.join(parent,'DEPENDENCIES_VALIDATED'),'');
}
console.log(JSON.stringify({package:'@sparticuz/chromium',version:metadata.version,executable:dest,bytes:fs.statSync(dest).size,PLAYWRIGHT_BROWSERS_PATH:path.resolve(cache),note:'Headless fallback; not a claim of full stock Chromium fidelity. Inspect screenshot/proof logs.'},null,2));
