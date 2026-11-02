/** Read-only CSV handoff verification through the documented Artifact Tool API.
 * Run a copy in an OS tmp directory with node_modules linked to the primary
 * runtime. No workbook or CSV value is modified and no XLSX is requested.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {Workbook} from '@oai/artifact-tool';
const root=path.resolve(process.argv[2]??'.');
const file=path.join(root,process.argv[3]??'inventory.csv');
const csv=await fs.readFile(file,'utf8');
const workbook=await Workbook.fromCSV(csv,{sheetName:'Inventory'});
const sheet=workbook.worksheets.getItem('Inventory');
const matrix=sheet.getUsedRange().values;
const headers=matrix[0].map(String);
const rows=matrix.slice(1).filter(r=>r.some(v=>v!==null&&v!==''));
const required=['recommendation_id','category','name','user_job','surfaces','default','range',
 'effective_conditions','decision','replacement','implementation_retention','witness_case',
 'marginal_gain_loss','runtime_impact','uncertainty','source_symbols'];
const missingHeaders=required.filter(x=>!headers.includes(x));
const ids=rows.map(r=>r[headers.indexOf('recommendation_id')]);
const decisions=rows.map(r=>r[headers.indexOf('decision')]);
const allowed=new Set(['Keep','Merge','Automate','Hide','Remove']);
const badDecisions=decisions.filter(x=>!allowed.has(x));
const emptyRequired=[];
for(let i=0;i<rows.length;i++)for(const key of required){
 const value=rows[i][headers.indexOf(key)];
 if(value===null||value===undefined||String(value).trim()==='')emptyRequired.push({row:i+2,id:ids[i],column:key});
}
const inspection=await workbook.inspect({kind:'table',sheetId:'Inventory',range:'A1:E4',include:'values',tableMaxRows:4,tableMaxCols:5,maxChars:2500});
const result={at:new Date().toISOString(),file:path.relative(root,file),
 sha256:crypto.createHash('sha256').update(csv).digest('hex'),
 engine:'@oai/artifact-tool Workbook.fromCSV; read-only; no Excel export or alteration',
 records:rows.length,columns:headers.length,uniqueRecommendationIds:new Set(ids).size,
 duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i),missingHeaders,badDecisions,emptyRequired,
 decisionCounts:Object.fromEntries([...allowed].map(x=>[x,decisions.filter(v=>v===x).length])),
 inspection:inspection.ndjson,
 passed:rows.length===175&&new Set(ids).size===175&&!missingHeaders.length&&!badDecisions.length&&!emptyRequired.length};
await fs.writeFile(path.join(root,'data/analysis/inventory-csv-validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,inspection:undefined}));
if(!result.passed)process.exitCode=1;
