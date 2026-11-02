/** Unblind only completed, frozen judgment files; no algorithms are executed. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {bundleRoot} from './adapter.mjs';
const phases=process.argv.includes('--heldout')?['routing','development','heldout']:['routing','development'];
if(phases.includes('heldout')&&!fs.existsSync(path.join(bundleRoot,'data/policy-freeze.json')))throw Error('Heldout remains locked.');
const rows=new Map();
for(const file of fs.readdirSync(path.join(bundleRoot,'data')).filter(x=>x.endsWith('.jsonl'))){
 if(!phases.includes('heldout')&&file.includes('heldout'))continue;
 for(const line of fs.readFileSync(path.join(bundleRoot,'data',file),'utf8').split('\n').filter(Boolean)){
  const r=JSON.parse(line);if(r.id&&r.metrics&&!rows.has(r.id))rows.set(r.id,r);
 }
}
const out=[],sources=[];
const ratio=(a,b)=>Math.max(a,b)/Math.max(1e-9,Math.min(a,b));
for(const phase of phases){
 const file=path.join(bundleRoot,'data',`visual-judgments-${phase}.json`);if(!fs.existsSync(file))continue;
 const text=fs.readFileSync(file,'utf8'),judgments=JSON.parse(text),key=JSON.parse(fs.readFileSync(path.join(bundleRoot,'data',`visual-key-${phase}.json`)));
 sources.push({phase,file:`data/visual-judgments-${phase}.json`,sha256:crypto.createHash('sha256').update(text).digest('hex'),recordedAt:judgments.recordedAt??judgments.frozenAt,reviewer:judgments.reviewer});
 for(const j of judgments.judgments){
  const k=key.find(k=>k.id===j.id),a=rows.get(k.A),b=rows.get(k.B);if(!a||!b)throw Error('Missing canonical completed row '+j.id);
  const am=a.metrics,bm=b.metrics;
  const predict=w=>am.hardValid!==bm.hardValid?(am.hardValid?'A-better':'B-better'):Math.abs(am.weightingScores[w]-bm.weightingScores[w])<=1?'same':am.weightingScores[w]<bm.weightingScores[w]?'A-better':'B-better';
  const practical=am.hardValid&&bm.hardValid&&Math.abs(am.weightingScores.balanced-bm.weightingScores.balanced)<=1&&ratio(am.area,bm.area)<=1.1&&ratio(am.routeLength,bm.routeLength)<=1.1;
  out.push({...j,phase,A:k.A,B:k.B,selectionReason:k.selectionReason,
   metricsA:{hardValid:am.hardValid,hardDefects:am.hardDefects,requiredIntentFailures:am.requiredIntentFailures,balanced:am.weightingScores.balanced,traceable:am.weightingScores.traceable,direct:am.weightingScores.direct,area:am.area,routeLength:am.routeLength,crossings:am.crossings,bends:am.bends,labels:am.labelDefects},
   metricsB:{hardValid:bm.hardValid,hardDefects:bm.hardDefects,requiredIntentFailures:bm.requiredIntentFailures,balanced:bm.weightingScores.balanced,traceable:bm.weightingScores.traceable,direct:bm.weightingScores.direct,area:bm.area,routeLength:bm.routeLength,crossings:bm.crossings,bends:bm.bends,labels:bm.labelDefects},
   symmetricPracticalEquivalence:practical,predictions:Object.fromEntries(['balanced','traceable','direct'].map(w=>[w,predict(w)])),
   pairWithinPracticalBandButVisualDifference:practical&&j.verdict!=='same',
   selectedMetricReversal:predict('balanced')!=='same'&&j.verdict!=='same'&&predict('balanced')!==j.verdict});
 }
}
const counts=Object.fromEntries(['A-better','B-better','same'].map(v=>[v,out.filter(x=>x.verdict===v).length]));
const agreement=Object.fromEntries(['balanced','traceable','direct'].map(w=>[w,{exactThreeWayAgreement:out.filter(x=>x.predictions[w]===x.verdict).length,total:out.length,numericPreferenceVisualTie:out.filter(x=>x.predictions[w]!=='same'&&x.verdict==='same').length,numericTieVisualPreference:out.filter(x=>x.predictions[w]==='same'&&x.verdict!=='same').length,reversal:out.filter(x=>x.predictions[w]!=='same'&&x.verdict!=='same'&&x.predictions[w]!==x.verdict).length}]));
const result={at:new Date().toISOString(),sources,pairs:out.length,counts,agreement,
 withinBandPairs:out.filter(x=>x.symmetricPracticalEquivalence).length,withinBandVisualDifferences:out.filter(x=>x.pairWithinPracticalBandButVisualDifference).map(x=>x.id),
 limitation:'One expert model; selected/overlapping diagram pairs, not independent users or a population-accuracy estimate. DI is a diagnostic, not ground truth. Symmetric pair band check differs from profile-oracle candidate acceptance.',judgments:out};
const dest=path.join(bundleRoot,'data/analysis');fs.mkdirSync(dest,{recursive:true});
fs.writeFileSync(path.join(dest,phases.includes('heldout')?'visual-agreement-all.json':'visual-agreement-development.json'),JSON.stringify(result,null,2)+'\n');
const lines=['# Visual review and metric disagreements','',`**Measured:** ${out.length} matched production-render pairs were inspected under hidden candidate identities. ${counts['A-better']} favored A, ${counts['B-better']} favored B, and ${counts.same} were ties. Judgments were frozen before the keys were read.`,
 '', 'The reviewer was one expert model, not independent human validation. Every required PNG was opened. Detail renders are documented in the phase narratives. Several pairs reuse a graph to isolate a control, so pair counts are not counts of independent graph discoveries or users.',
 '', '## Rendering and blinding','', 'All sheets use the shipped production SVG renderer, font metrics, routing and label placement, then the unchanged repository screenshot tool. A deterministic SHA-256 shuffle (seed `blind-20261101-<pair>`) places candidates left/right. Public manifests omit method identities; separate key files disclose them after review. Missing or timed-out full routes cannot be manufactured into a complete comparison.',
 '', '## Agreement with diagnostic weights','', '| Weighting | Same three-way verdict | Numeric preference / visual tie | Numeric tie / visual preference | Opposite preference |','| --- | ---: | ---: | ---: | ---: |'];
for(const [w,s]of Object.entries(agreement))lines.push(`| ${w} | ${s.exactThreeWayAgreement}/${s.total} | ${s.numericPreferenceVisualTie} | ${s.numericTieVisualPreference} | ${s.reversal} |`);
lines.push('',`The symmetric development-style band (balanced score within1, area within10%, route length within10%, both hard-valid) contains ${result.withinBandPairs} reviewed pairs. Visual preferences inside it: ${result.withinBandVisualDifferences.join(', ')||'none'}. This is a targeted calibration check, not an empirical claim that all changes inside the band are unnoticeable. The profile-dependent oracle rule remains separately specified in evaluation-method.md.`,
 '', 'The numerical weights deliberately remain frozen. The ledger below keeps disagreement evidence rather than silently adjusting heldout scores. Honest crossings can be preferable to long detours; corner rounding can matter in appearance while the polyline is identical; a concise path can still detach its label from its owner.',
 '', '## Pair ledger','', '| Pair / production image | Split | A | B | Judgment | Severity | Confidence | Balanced DI A / B | Reason |','| --- | --- | --- | --- | --- | ---: | ---: | --- | --- |');
const clean=s=>String(s??'').replaceAll('|','/').replaceAll('\n',' ');
for(const j of out)lines.push(`| [${j.id}](renders/blinded/${j.id}.png) | ${j.split} | ${j.A} | ${j.B} | ${j.verdict} | ${j.severity} | ${j.confidence} | ${j.metricsA.balanced} / ${j.metricsB.balanced} | ${clean(j.reason)} |`);
lines.push('', '## Defect ledger','', '| Pair | Side | Severity | Cause | Observation |','| --- | --- | ---: | --- | --- |');
for(const j of out)for(const d of j.defects??[])lines.push(`| ${j.id} | ${clean(d.side)} | ${d.severity??'—'} | ${clean(d.cause)} | ${clean(d.description??d.observation)} |`);
lines.push('', '## Evidence files','', ...sources.map(s=>`- [${s.file}](${s.file}) — frozen SHA-256 ${s.sha256}.`),'- [Development selection rule](data/visual-selection-development.json) records seeded family samples and unrenderable draws.','- Keys, public manifests, phase narratives and full SVGs remain in the bundle.','');
fs.writeFileSync(path.join(bundleRoot,'visual-review.md'),lines.join('\n'));
console.log(JSON.stringify({pairs:out.length,counts,agreement,withinBandPairs:result.withinBandPairs,withinBandVisualDifferences:result.withinBandVisualDifferences}));
