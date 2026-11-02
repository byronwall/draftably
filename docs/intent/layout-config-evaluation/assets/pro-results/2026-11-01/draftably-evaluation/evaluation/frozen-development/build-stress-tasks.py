"""Optional scale checks; zero quality weight, fixed methods chosen before these trials."""
import json,pathlib,datetime
root=pathlib.Path(__file__).resolve().parents[1]
m=json.loads((root/'corpus/manifest.json').read_text())
tasks=[]
for c in m['extras']:
 if c['kind']!='optional-scale':continue
 for name,layout in [('current',None),('force',{'engine':'force','direction':'RIGHT','keepFit':True}),('layered',{'engine':'layered','direction':'RIGHT','keepFit':True})]:
  tasks.append(dict(id=f'Scale-{c["id"]}-{name}',stage='optional-scale',caseId=c['id'],family='scale',split='development',kind='source',sourcePath=c['path'],layout=layout,tag='optional-zero-quality-weight',timeoutMs=15000))
(root/'evaluation/tasks/optional-scale.json').write_text(json.dumps(tasks,indent=2)+'\n')
(root/'data/scale-design-freeze.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'trials':len(tasks),'methods':['current source','force RIGHT defaults','layered RIGHT defaults'],'qualityWeight':0,'purpose':'Separate layout completion from full routing/export scale tails; no tuning or portfolio credit.'},indent=2)+'\n')
print('optional-scale',len(tasks))
