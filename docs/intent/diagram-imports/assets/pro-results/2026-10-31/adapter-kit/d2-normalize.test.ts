import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { CompileResponse } from '@d2lang/d2';
import { compileD2Facts, d2ParentId, d2SourceFeatures, normalizeD2 } from './d2-normalize.js';

const fixtures = JSON.parse(readFileSync(new URL('../d2-probe-results.json', import.meta.url), 'utf8')).fixtures as Record<string, { result: CompileResponse }>;

test('D2 canonical quoted IDs keep distinct parents', () => {
  const f = normalizeD2(fixtures.quoted.result);
  assert.equal(f.ok, true);
  assert.deepEqual(f.items.map(x=>[x.sourceId,x.parentSourceId]), [ ['a',undefined], ['"a.b"',undefined], ['"a.b"."x.y"','"a.b"'], ['"a.b".inner','"a.b"'], ['"a.b".inner.z','"a.b".inner'] ]);
  assert.equal(f.edges[0].to, '"a.b"."x.y"');
});

test('D2 nested groups and parallel edge identity survive normalization', () => {
  const f = normalizeD2(fixtures.nested.result);
  assert.equal(f.ok, true);
  assert.equal(f.items.filter(x=>x.kind==='group').length, 1);
  assert.equal(f.items.filter(x=>x.kind==='node').length, 3);
  assert.equal(f.edges.length, 4);
  const repeats=f.edges.filter(e=>e.from==='service.api'&&e.to==='service.cache');
  assert.equal(repeats.length, 2);
  assert.notEqual(repeats[0].sourceId,repeats[1].sourceId);
  assert.ok(f.diagnostics.some(d=>d.code==='D2_SHAPE_APPROXIMATED'));
});

test('D2 sequence, tables, and multiple boards require family-specific mapping', () => {
  for (const [name, code] of [['sequence','D2_SEQUENCE_UNSUPPORTED'],['table','D2_COMPARTMENTS_UNSUPPORTED'],['boards','D2_BOARD_SELECTION_REQUIRED']]) {
    const f=normalizeD2(fixtures[name].result);
    assert.equal(f.ok,false);
    assert.ok(f.diagnostics.some(d=>d.code===code));
    assert.deepEqual(f.items,[]);
  }
});

test('D2 two-ended edges fail instead of becoming two native relationships', () => {
  const f=normalizeD2(fixtures.arrows.result);
  assert.equal(f.ok,false);
  assert.ok(f.diagnostics.some(d=>d.code==='D2_TWO_ENDED_ARROW_UNSUPPORTED'));
});

test('D2 backward-only arrows reverse native endpoint order', () => {
  const clone=structuredClone(fixtures.arrows.result);
  clone.diagram.connections=clone.diagram.connections.filter(e=>e.label!=='both');
  clone.graph.edges=clone.graph.edges.filter((_,i)=>i!==2);
  const f=normalizeD2(clone);
  assert.equal(f.ok,true);
  assert.deepEqual(f.edges.find(e=>e.label==='backward') && [f.edges[1].from,f.edges[1].to,f.edges[1].directed],['b','a',true]);
  assert.equal(f.edges.find(e=>e.label==='neither')?.directed,false);
});

test('D2 hidden arrowhead does not erase the semantic direction', () => {
  const f=normalizeD2(fixtures.hiddenDirection.result);
  assert.equal(f.ok,true);
  assert.equal(f.edges[0].directed,true);
  assert.equal(f.edges[0].from,'a');
  assert.equal(f.edges[0].to,'b');
  assert.ok(f.diagnostics.some(d=>d.code==='D2_ARROW_APPEARANCE_CHANGED'));
});

test('D2 links/icons are diagnostic-only and never retained in normalized facts', () => {
  const f=normalizeD2(fixtures.image.result);
  assert.equal(f.ok,true);
  assert.ok(f.diagnostics.some(d=>d.code==='D2_ACTIVE_RESOURCE_DROPPED'));
  assert.ok(!JSON.stringify(f.items).includes('https://'));
});

test('D2 malformed hierarchy fails closed', () => {
  assert.throws(()=>d2ParentId({id:'a.b',level:2},[{id:'z',level:1}]),/parent/);
});

test('D2 compiler source attributes cannot be paired with a different shape', () => {
  const clone=structuredClone(fixtures.nested.result);
  [clone.graph.objects[1],clone.graph.objects[2]]=[clone.graph.objects[2],clone.graph.objects[1]];
  const f=normalizeD2(clone);
  assert.equal(f.ok,false);
  assert.deepEqual(f.items,[]);
  assert.ok(f.diagnostics.some(d=>d.code==='D2_API_SHAPE'));
});

test('D2 scoped variables, classes, and parsed globs become a warned concrete snapshot', () => {
  const f=normalizeD2(fixtures.generative.result);
  assert.equal(f.ok,true);
  assert.deepEqual(d2SourceFeatures(fixtures.generative.result.graph.ast),['classes','globs','variables']);
  assert.equal(f.items.find(x=>x.sourceId==='cluster.a')?.label,'Inner');
  assert.equal(f.items.find(x=>x.sourceId==='outside')?.label,'Outer');
  assert.deepEqual(f.edges.map(x=>[x.from,x.to,x.label]),[['cluster.a','cluster.b','call']]);
  assert.ok(f.diagnostics.some(d=>d.code==='D2_PROGRAM_SNAPSHOT'&&d.severity==='warning'));
  assert.deepEqual(f.diagnostics.filter(d=>d.code==='D2_STYLE_DROPPED').map(d=>d.sourceId),['cluster.a','cluster.b']);
});

test('D2 source-feature detection never treats literal labels as rules', () => {
  const f=normalizeD2(fixtures.literalRules.result);
  assert.equal(f.ok,true);
  assert.equal(f.items[0].label,'vars classes * ${keep}');
  assert.deepEqual(d2SourceFeatures(fixtures.literalRules.result.graph.ast),[]);
  assert.ok(!f.diagnostics.some(d=>d.code==='D2_PROGRAM_SNAPSHOT'));
});

test('D2 configuration and null overrides report source-behavior loss', () => {
  const config=normalizeD2(fixtures.configuration.result);
  assert.ok(config.diagnostics.some(d=>d.code==='D2_CONFIG_IGNORED'));
  assert.ok(config.diagnostics.some(d=>d.code==='D2_CONFIG_DATA_DROPPED'));
  const removed=normalizeD2(fixtures.nullOverride.result);
  assert.deepEqual(removed.items.map(x=>x.sourceId),['a']);
  assert.equal(removed.edges.length,0);
  assert.ok(removed.diagnostics.some(d=>d.code==='D2_PROGRAM_SNAPSHOT'));
});

test('D2 future unknown semantic attributes fail rather than disappear', () => {
  const clone=structuredClone(fixtures.nested.result);
  (clone.graph.objects[0] as any).attributes.futureConstraint={value:'do-not-drop'};
  const f=normalizeD2(clone);
  assert.equal(f.ok,false);
  assert.deepEqual(f.items,[]);
  assert.ok(f.diagnostics.some(d=>d.code==='D2_ATTRIBUTE_UNSUPPORTED'));
});

test('D2 real compiler reports invalid input and imports without host access', async () => {
  for (const source of ['a: {\n','a: @missing\n']) {
    const f=await compileD2Facts(source);
    assert.equal(f.ok,false);
    assert.equal(f.diagnostics[0].code,'D2_PARSE_OR_COMPILE_ERROR');
  }
});
