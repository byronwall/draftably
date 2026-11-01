/** Shared local loader. Requires the pinned checkout's installed Vite; performs no dependency install. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
export async function openRuntime() {
 const {values}=parseArgs({options:{repo:{type:'string'},out:{type:'string'},examples:{type:'string'},help:{type:'boolean',short:'h'}}});
 if(values.help){console.log('Usage: node SCRIPT.mjs --repo /path/to/pinned-draftably --out /path/to/output [--examples /path/to/artifact/examples]');process.exit(0);}
 if(!values.repo||!values.out)throw Error('--repo and --out are required. --repo must be the af70d8317797d5a522acffdd604819376a3ec893 checkout with installed dependencies.');
 const repo=path.resolve(values.repo),out=path.resolve(values.out),examples=path.resolve(values.examples??fileURLToPath(new URL('../examples/',import.meta.url)));
 const viteFile=path.join(repo,'node_modules/vite/dist/node/index.js');
 if(!fs.existsSync(viteFile))throw Error('Vite is not installed in --repo. Install the pinned checkout dependencies using its pnpm lockfile, then retry.');
 for(const sub of ['sources','svg','json','geometry'])fs.mkdirSync(path.join(out,sub),{recursive:true});
 const {createServer}=await import(pathToFileURL(viteFile).href);
 // ws:false is supported by the pinned Vite and avoids opening an unused HMR socket.
 const server=await createServer({root:repo,configFile:false,server:{middlewareMode:true,hmr:false,ws:false},appType:'custom',logLevel:'error'});
 const fixture=relative=>{const p=path.join(examples,relative);if(!fs.existsSync(p))throw Error('Missing companion: '+p);return p};
 return{server,repo,out,examples,fixture};
}
