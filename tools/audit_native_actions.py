"""Audit visibility and provenance of every imported native runtime frame."""
import json
from pathlib import Path
from PIL import Image
from process_move_icons import ROOT

source=json.loads((ROOT/'assets/pmdcollab/actions/source.json').read_text(encoding='utf-8'))
records=[]
for species,audit in source['species'].items():
    for kind,action in audit['actions'].items():
        image=Image.open(ROOT/'public'/action['path']).convert('RGBA')
        w,h,n=action['frameWidth'],action['frameHeight'],action['frames'];empty=[]
        for row in range(8):
            for frame in range(n):
                if not image.crop((frame*w,row*h,(frame+1)*w,(row+1)*h)).getbbox():empty.append([row,frame])
        records.append({'species':species,'kind':kind,'nativeAction':action['sourceAction'],'source':action['source'],'frames':n,'directions':8,'emptyRuntimeCells':empty,'sourceSha256':action['sourceSha256'],'runtimeSha256':action['sha256']})
target=ROOT/'docs/qa/v050/native-action-audit.json';target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(json.dumps({'revision':source['revision'],'actions':records},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'actions':len(records),'emptyCells':sum(len(r['emptyRuntimeCells']) for r in records),'affected':[{k:r[k] for k in ['species','kind','emptyRuntimeCells']} for r in records if r['emptyRuntimeCells']]}))
