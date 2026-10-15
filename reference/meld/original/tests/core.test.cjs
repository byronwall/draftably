'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {performance}=require('node:perf_hooks');
const cp=require('node:child_process');
const M=require('../src/meld-core.js');
const root=path.resolve(__dirname,'..'),results=[];
function test(name,fn){const t=performance.now();try{fn();results.push({name,passed:true,ms:+(performance.now()-t).toFixed(2)});console.log('PASS',name);}catch(e){results.push({name,passed:false,error:e.stack});console.error('FAIL',name,e.message);}}
const examples=Object.fromEntries(['commerce','pipeline','constraints'].map(n=>[n,fs.readFileSync(path.join(root,'examples',n+'.meld'),'utf8')]));
const minimal='diagram "A small graph"\nnode a "Input"\nnode b "Output"\nedge e a -> b "flows"\nlayout root row gap=48\nview explore "Explore" width=900 height=500\n';
function geom(src,view='explore'){return M.geometry(M.compile(src,view));}
function box(s,id){return s.nodes.find(n=>n.id===id);}
function noOverlap(s){for(let i=0;i<s.nodes.length;i++)for(let j=i+1;j<s.nodes.length;j++){const a=s.nodes[i],b=s.nodes[j];if(a.parent===b.parent)assert.ok(!(a.x+a.w>b.x+.1&&b.x+b.w>a.x+.1&&a.y+a.h>b.y+.1&&b.y+b.h>a.y+.1),a.id+' overlaps '+b.id);}}
test('SHA-256 matches Node crypto for ASCII, Unicode, and multiblock inputs',()=>{const crypto=require('node:crypto');for(const text of ['','abc','héllo 🌿','a'.repeat(5000)])assert.equal(M.sha256(text),crypto.createHash('sha256').update(text).digest('hex'));});
test('Quoted strings preserve comments and escaped quotes',()=>{const m=M.parse('node a "a # b // c \\"x\\""'.replaceAll('\\\\"','\\"'));assert.ok(m.nodes[0].label.includes('# b // c'));});
test('Forward references and declaration identity',()=>{const m=M.parse('edge e a -> b\nnode b "B"\nnode a "A"');assert.equal(m.edges[0].target,'b');});
test('Unknown references have line diagnostics',()=>assert.throws(()=>M.parse('node a "A"\nedge e a -> no'),/Line 2: Unknown node\/group no/));
test('Unknown fields rejected',()=>assert.throws(()=>M.parse('node a "A" foo=bar'),/Unknown node attribute/));
test('Duplicate IDs rejected',()=>assert.throws(()=>M.parse('node a "A"\nnode a "B"'),/Duplicate node/));
test('Duplicate attributes rejected',()=>assert.throws(()=>M.parse('node a "A" in=root in=root'),/Duplicate attribute/));
test('Containment cycles rejected',()=>assert.throws(()=>M.parse('group a "A" in=b\ngroup b "B" in=a'),/Containment cycle/));
test('Cross-scope relative hints rejected',()=>assert.throws(()=>M.parse('group g "G"\nnode a "A" in=g\nnode b "B"\nnear a b'),/sibling-scoped/));
test('Relative placement cycles rejected',()=>assert.throws(()=>M.compile(minimal+'near a b\nnear b a'),/Relative-placement cycle/));
test('Invalid viewport rejected',()=>assert.throws(()=>M.parse('view v "V" width=100'),/Expected a number/));
test('Containment is bottom-up and encloses every child',()=>{for(const name of Object.keys(examples)){const s=M.compile(examples[name]);s.nodes.forEach(n=>{if(n.parent!=='root'){const p=box(s,n.parent);assert.ok(n.x>=p.x+22-.1&&n.y>=p.y+48-.1);assert.ok(n.x+n.w<=p.x+p.w-21.9&&n.y+n.h<=p.y+p.h-21.9);}});}});
test('Every example/view is reproducible across 30 fresh parses',()=>{for(const source of Object.values(examples))for(const v of M.parse(source).views){const expected=geom(source,v.id);for(let i=0;i<30;i++)assert.equal(geom(source,v.id),expected);}});
test('Reproducible in three fresh Node processes',()=>{const code=`const M=require(${JSON.stringify(path.join(root,'src/meld-core.js'))});console.log(M.geometry(M.compile(${JSON.stringify(examples.commerce)})));`;const expected=cp.execFileSync(process.execPath,['-e',code],{encoding:'utf8'});for(let i=0;i<2;i++)assert.equal(cp.execFileSync(process.execPath,['-e',code],{encoding:'utf8'}),expected);});
test('Comments and blank lines do not affect input/geometry',()=>{const a=M.compile(minimal),b=M.compile('# header\n\n'+minimal+'\n# footer');assert.equal(a.inputKey,b.inputKey);assert.equal(M.geometry(a),M.geometry(b));});
test('Unrelated view edits do not affect selected geometry/key',()=>{const a=M.compile(examples.commerce,'explore'),b=M.compile(examples.commerce.replace('width=480 height=320','width=500 height=340'),'explore');assert.equal(a.inputKey,b.inputKey);assert.equal(M.geometry(a),M.geometry(b));});
for(const algorithm of ['flow','row','column','grid','radial'])test(algorithm+' layout reproducibility/non-overlap',()=>{let src='group g "A group"\nlayout g '+algorithm+' gap=36\n';for(let i=0;i<7;i++){src+=`node n${i} "Node ${i}" in=g\n`;if(i)src+=`edge e${i} n${i-1} -> n${i}\n`;}const s=M.compile(src);noOverlap(s);assert.equal(geom(src),geom(src));});
test('Directed cycles handled by SCC condensation',()=>{const s=M.compile(minimal.replace('layout root row','edge back b -> a\nlayout root flow'));noOverlap(s);assert.equal(s.nodes.length,2);});
test('View-scoped layout overrides global recipe',()=>{const src=minimal+'layout root column view=explore';const s=M.compile(src);assert.equal(box(s,'a').x,box(s,'b').x);assert.ok(box(s,'b').y>box(s,'a').y);});
test('Explicit order survives rerender',()=>{const s=M.compile(minimal+'order root b a');assert.ok(box(s,'b').x<box(s,'a').x);});
test('Required alignment unifies center variables',()=>{const s=M.compile(examples.constraints);const a=box(s,'worker'),b=box(s,'queue');assert.equal(a.x+a.w/2,b.x+b.w/2);});
test('Required separation is respected when feasible',()=>{const s=M.compile(minimal+'near b a side=below gap=90 strength=required');const a=box(s,'a'),b=box(s,'b');assert.ok(b.y-a.y-a.h>=89.9);});
test('Hard pin remains exactly parent-local',()=>{const s=M.compile(minimal+'pin a x=30 y=60');assert.equal(box(s,'a').localX,30);assert.equal(box(s,'a').localY,60);});
test('Unsatisfiable pinned overlap is diagnosed, not silently moved',()=>{const s=M.compile(minimal+'pin a x=0 y=0\npin b x=0 y=0');assert.ok(s.diagnostics.some(d=>d.code==='overlap'));assert.equal(box(s,'a').x,0);assert.equal(box(s,'b').x,0);});
test('Conflicting required alignment and pins is diagnosed',()=>{const s=M.compile(minimal+'pin a x=0 y=0\npin b x=400 y=0\nalign x a b strength=required');assert.ok(s.diagnostics.some(d=>d.code==='pin-align-conflict'));assert.equal(box(s,'a').localX,0);assert.equal(box(s,'b').localX,400);});
test('View-local position preference overrides global pin',()=>{const s=M.compile(minimal+'pin b x=600 y=200\nnudge b dx=0 dy=0 view=explore');assert.equal(box(s,'b').localX,232);});
test('Nudges are fresh-base offsets, never cumulative',()=>{const src=minimal+'nudge b dx=10 dy=28';const a=M.compile(src);for(let i=0;i<10;i++)assert.equal(box(M.compile(src),'b').localY,28);assert.equal(box(a,'b').localX,242);});
test('Soft stays preserve an unconflicted insertion',()=>{const src=minimal+'stay a x=0 y=0 weight=8\nstay b x=232 y=0 weight=8\nnode c "New"\nedge added b -> c';const s=M.compile(src);assert.equal(box(s,'a').localX,0);assert.equal(box(s,'b').localX,232);noOverlap(s);});
test('Static small card adapts without losing semantic model',()=>{const m=M.parse(examples.commerce),s=M.layout(m,'card');assert.ok(s.hidden>0);assert.equal(m.nodes.length,12);assert.equal(s.semanticNodeCount,8);assert.ok(s.fit.scale*12>=s.view['min-font']-.1);assert.ok(s.automatic.length>0);});
test('Full static detail warns when viewport is insufficient',()=>{const s=M.compile(examples.commerce,'explore',{mode:'static',width:240,height:200,detail:'full'});assert.ok(s.diagnostics.some(d=>d.code==='viewport-overflow'));});
test('Interactive auto does not silently collapse content',()=>{const s=M.compile(examples.commerce,'explore',{width:300,height:240});assert.equal(s.hidden,0);assert.equal(s.automatic.length,0);});
test('Collapse redirects and aggregates parallel edges with provenance',()=>{const src='group g "G"\nnode a "A" in=g\nnode b "B" in=g\nnode c "C"\nedge e1 a -> c "one"\nedge e2 b -> c "two"\nview explore "V" collapse=g';const s=M.compile(src);assert.equal(s.edges.length,1);assert.deepEqual(s.edges[0].members,['e1','e2']);assert.equal(s.edges[0].label,'2 links');});
test('Primary-edge policy discloses filtered edge count',()=>{const src=minimal+'edge low b -> a importance=1';const s=M.compile(src,'explore',{edges:'primary'});assert.equal(s.edgeStats.filtered,1);assert.equal(s.edges.length,1);});
test('Focus includes immediate neighbors, not the entire graph',()=>{const src=minimal+'node c "C"\nnode isolated "Not connected"\nedge e2 b -> c';const s=M.compile(src,'explore',{focus:'a'});assert.ok(s.nodes.some(n=>n.id==='b'));assert.ok(!s.nodes.some(n=>n.id==='isolated'));assert.ok(!s.nodes.some(n=>n.id==='c'));});
test('Checkpoint replays complete serialized geometry exactly',()=>{const a=M.compile(examples.commerce);const b=M.compile(examples.commerce+'\n'+M.snapshotText(a));assert.equal(b.checkpoint,'replayed');assert.equal(M.geometry(a),M.geometry(b));});
test('Checkpoint invalidates on content changes',()=>{const a=M.compile(minimal),src=minimal+M.snapshotText(a)+'\nnode c "New"';const b=M.compile(src);assert.equal(b.checkpoint,'stale');assert.ok(b.nodes.some(n=>n.id==='c'));});
test('Checkpoint invalidates on viewport changes',()=>{const a=M.compile(minimal),b=M.compile(minimal+M.snapshotText(a),'explore',{width:1200});assert.equal(b.checkpoint,'stale');});
test('Checkpoint invalidates on intent changes',()=>{const a=M.compile(minimal),b=M.compile(minimal+M.snapshotText(a)+'\nnudge b dy=20');assert.equal(b.checkpoint,'stale');});
test('Orphaned cached boxes do not block model edits',()=>{const s=M.compile('node a "A"\nnode b "B"'),cached='node a "A"\n'+M.snapshotText(s);assert.equal(M.compile(cached).checkpoint,'stale');});
test('Routes are orthogonal and start/end on source/target boundaries',()=>{const s=M.compile(examples.commerce);s.edges.forEach(e=>{for(let i=1;i<e.points.length;i++)assert.ok(e.points[i].x===e.points[i-1].x||e.points[i].y===e.points[i-1].y);});});
test('Examples have no unresolved layout/route warnings',()=>{for(const source of Object.values(examples))for(const v of M.parse(source).views)assert.deepEqual(M.compile(source,v.id).diagnostics.filter(d=>d.level!=='info'),[]);});
// Benchmarks are measurements, not a product performance guarantee.
const benchmarks=[];
for(const name of Object.keys(examples))for(const v of M.parse(examples[name]).views){const times=[];M.compile(examples[name],v.id);for(let i=0;i<20;i++){const t=performance.now();M.compile(examples[name],v.id);times.push(performance.now()-t);}times.sort((a,b)=>a-b);benchmarks.push({example:name,view:v.id,objects:M.parse(examples[name]).nodes.length,edges:M.parse(examples[name]).edges.length,warmMedianMs:+times[10].toFixed(2),p95Ms:+times[19].toFixed(2),runs:20});}
const report={runtime:process.version,platform:process.platform,engine:M.VERSION,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,tests:results,benchmarks};
fs.writeFileSync(path.join(__dirname,'golden-geometry.json'),JSON.stringify(Object.fromEntries(Object.entries(examples).flatMap(([name,source])=>M.parse(source).views.map(v=>[name+':'+v.id,geom(source,v.id)]))),null,2));
fs.writeFileSync(path.join(__dirname,'core-results.json'),JSON.stringify(report,null,2));console.log(`\n${report.passed} passed, ${report.failed} failed. Benchmark results: tests/core-results.json`);if(report.failed)process.exitCode=1;
