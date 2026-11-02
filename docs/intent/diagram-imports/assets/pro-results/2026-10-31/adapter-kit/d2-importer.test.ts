import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { CompileResponse } from '@d2lang/d2';
import { d2FactsToNative, importD2Experimental } from './d2-importer.js';
import { normalizeD2, type D2Facts } from './d2-normalize.js';

const fixtures = JSON.parse(readFileSync(new URL('../d2-probe-results.json', import.meta.url), 'utf8')).fixtures as Record<string, { result: CompileResponse }>;
const facts = (name: string) => normalizeD2(fixtures[name].result);

test('D2 nested topology emits the exact native snapshot and stable source-ID mappings', () => {
  const r = d2FactsToNative(facts('nested'), 'D2 nested');
  assert.equal(r.status, 'needs-review'); // Native model lacks the cylinder shape.
  assert.equal(r.nativeSource, readFileSync(new URL('../fixtures/d2/nested.draft', import.meta.url), 'utf8'));
  assert.equal(r.facts?.objects.filter(o => o.kind === 'group').length, 1);
  assert.equal(r.facts?.objects.filter(o => o.kind === 'node').length, 3);
  assert.equal(r.facts?.edges.length, 4);
  assert.equal(r.facts?.objects.find(o => o.label === 'API')?.parent, 'service');
  assert.deepEqual(r.facts?.layouts, [{scope:'root',kind:'flow',direction:'right'},{scope:'service',kind:'flow',direction:'right'}]);
  assert.equal(r.facts?.edges.filter(e=>e.from==='service.api'&&e.to==='service.cache').length,2);
  assert.equal(new Set(r.facts?.edges.map(e=>e.id)).size,4);
  assert.ok(r.ids.some(id=>id.kind==='edge'&&id.foreign==='service.(api -> cache)[1]'));
  assert.deepEqual(r.requires,[]);
});

test('D2 escaped dotted IDs keep separate native containment and connection identities', () => {
  const r=d2FactsToNative(facts('quoted'),'D2 quoted');
  assert.equal(r.status,'ready');
  assert.equal(r.nativeSource,readFileSync(new URL('../fixtures/d2/quoted.draft',import.meta.url),'utf8'));
  assert.equal(r.ids.find(x=>x.foreign==='"a.b"')?.native,'_u22_a.b_u22_');
  assert.equal(r.facts?.objects.find(x=>x.label==='Leaf')?.parent,'_u22_a.b_u22_');
  assert.equal(r.facts?.edges[0].to,'_u22_a.b_u22_._u22_x.y_u22_');
  assert.equal(r.facts?.objects.length,5);
});

test('D2 arrows preserve meaning and gate the missing native undirected-source feature', () => {
  const r=d2FactsToNative(facts('arrowSubset'),'D2 arrowSubset');
  assert.equal(r.status,'ready');
  assert.deepEqual(r.facts?.edges.map(e=>[e.from,e.to,e.directed,e.label]),[
    ['a','b',true,'forward'],['b','a',true,'backward'],['a','b',false,'neither'],['a','b',true,'parallel'],
  ]);
  assert.deepEqual(r.requires,['IMP-02-native-undirected']);
  assert.match(r.nativeSource!,/directed=false/);
});

test('D2 appearance losses are explicit; dashed links and diamond nodes retain editable meaning', () => {
  const r=d2FactsToNative(facts('styles'));
  assert.equal(r.status,'needs-review');
  assert.equal(r.facts?.objects.find(o=>o.label==='B')?.shape,'diamond');
  assert.equal(r.facts?.edges[0].dashed,true);
  assert.ok(r.diagnostics.some(d=>d.code==='D2_STYLE_DROPPED'&&d.foreignIds?.includes('a')));
});

test('D2 generated topology imports its resolved facts and requires review of inactive rules', () => {
  const r=d2FactsToNative(facts('generative'),'D2 generative');
  assert.equal(r.status,'needs-review');
  assert.equal(r.facts?.objects.length,4);
  assert.equal(r.facts?.edges.length,1);
  assert.equal(r.facts?.objects.find(o=>o.id==='cluster.a')?.shape,'diamond');
  assert.ok(r.nativeSource!.includes('"Inner"'));
  assert.ok(!r.nativeSource!.includes('${name}'));
  assert.ok(r.diagnostics.some(d=>d.code==='D2_PROGRAM_SNAPSHOT'&&d.impact==='semantics'));
});

test('D2 unsupported families, two-ended arrows, and bad fact invariants produce no native source', () => {
  for (const name of ['boards','sequence','table','arrows']) {
    const r=d2FactsToNative(facts(name));
    assert.equal(r.status,'failed');
    assert.equal(r.nativeSource,undefined);
  }
  const invalid: D2Facts={ok:false,title:'',items:[],edges:[],direction:'down',diagnostics:[]};
  assert.equal(d2FactsToNative(invalid).status,'failed');
  const absent=facts('nested');
  absent.edges[0].to='missing';
  assert.equal(d2FactsToNative(absent).status,'failed');
  const duplicate=facts('nested');
  duplicate.items.push(duplicate.items[0]);
  assert.equal(d2FactsToNative(duplicate).status,'failed');
});

test('D2 untrusted resource strings have no active native field', () => {
  const r=d2FactsToNative(facts('image'));
  assert.equal(r.status,'needs-review');
  assert.ok(!r.nativeSource!.includes('https://'));
  assert.ok(r.diagnostics.some(d=>d.impact==='security'));
  const md=d2FactsToNative(facts('markdownImage'));
  assert.ok(md.facts?.objects[0].label.includes('https://')); // Literal native text; never an <img>.
  assert.ok(md.diagnostics.some(d=>d.code==='D2_LABEL_MARKUP_LITERAL'));
});

test('D2 experimental entrypoint rejects oversized source before initializing the compiler', async () => {
  const r=await importD2Experimental('a'.repeat(262145));
  assert.equal(r.status,'failed');
  assert.equal(r.diagnostics[0].code,'IMPORT_INPUT_LIMIT');
  assert.equal(r.nativeSource,undefined);
});
