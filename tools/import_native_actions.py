"""Import genuine PMDCollab action frames with source timing and shadow anchors.

Source sprite pixels are only translated onto common cells, never redrawn or
resized. Full upstream XML, individual credits and policy are retained.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen
import hashlib
import io
import json
import math
import xml.etree.ElementTree as ET

from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
REPO='https://github.com/PMDCollab/SpriteCollab'
SPECIES={1:'bulbasaur',2:'ivysaur',3:'venusaur',4:'charmander',5:'charmeleon',6:'charizard',7:'squirtle',8:'wartortle',9:'blastoise'}
ARCHIVE=ROOT/'assets/pmdcollab/actions';OUT=ROOT/'public/assets/pmdcollab/actions'

def fetch(url):
    with urlopen(Request(url,headers={'User-Agent':'Pokemon-Survivors-animation-import'}),timeout=45) as response:return response.read()


def main():
    recorded=ARCHIVE/'source.json'
    revision=json.loads(recorded.read_text(encoding='utf-8'))['revision'] if recorded.exists() else json.loads(fetch('https://api.github.com/repos/PMDCollab/SpriteCollab/commits/master'))['sha']
    base=f'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/{revision}/'
    ARCHIVE.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
    for filename in ['LICENSE.md','README.md','credit_names.txt']:(ARCHIVE/filename).write_bytes(fetch(base+filename))
    def species(entry):
        dex,name=entry;path=f'sprite/{dex:04d}/';xml=fetch(base+path+'AnimData.xml');tree=ET.fromstring(xml)
        archive=ARCHIVE/name;archive.mkdir(exist_ok=True);(archive/'AnimData.xml').write_bytes(xml);(archive/'credits.txt').write_bytes(fetch(base+path+'credits.txt'))
        available={a.findtext('Name'):a for a in tree.findall('./Anims/Anim')}
        result={};audit={'species':name,'dex':dex,'availableActions':list(available),'actions':{}}
        for category,candidates in [('physical',['Attack','Strike','Swing']),('special',['Shoot','Charge','DeepBreath','Attack']),('hurt',['Hurt','Pain','Cringe'])]:
            selected=next((n for n in candidates if n in available),None)
            if selected is None:continue
            action=available[selected];actual=selected;seen=set()
            while action.findtext('CopyOf'):
                if actual in seen:raise ValueError('Cyclic action alias')
                seen.add(actual);actual=action.findtext('CopyOf');action=available[actual]
            width=int(action.findtext('FrameWidth'));height=int(action.findtext('FrameHeight'));durations=[int(v.text) for v in action.findall('./Durations/Duration')]
            image_bytes=fetch(base+path+actual+'-Anim.png');shadow_bytes=fetch(base+path+actual+'-Shadow.png')
            image=Image.open(io.BytesIO(image_bytes)).convert('RGBA');shadow=Image.open(io.BytesIO(shadow_bytes)).convert('RGBA');count=image.width//width;rows=image.height//height
            if rows!=8 or count!=len(durations):raise ValueError(f'Unexpected layout {name}/{actual}')
            frames=[];up=down=left=right=0
            for row in range(8):
                for frame in range(count):
                    cell=(frame*width,row*height,(frame+1)*width,(row+1)*height);im=image.crop(cell);sh=shadow.crop(cell)
                    points=[(x,y) for y in range(height) for x in range(width) if sh.getpixel((x,y))==(255,255,255,255)]
                    if len(points)!=1:raise ValueError(f'Missing native shadow marker {name}/{actual}/{row}/{frame}')
                    ax,ay=points[0];bounds=im.getbbox()
                    if bounds:
                        left=max(left,ax-bounds[0]);right=max(right,bounds[2]-ax);up=max(up,ay-bounds[1]);down=max(down,bounds[3]-ay)
                    frames.append((im,ax,ay))
            cell_w=math.ceil((max(left,right)+4)*2/8)*8;anchor_x=cell_w//2;anchor_y=math.ceil((up+4)/8)*8;cell_h=math.ceil((anchor_y+down+4)/8)*8
            sheet=Image.new('RGBA',(count*cell_w,8*cell_h))
            for i,(im,ax,ay) in enumerate(frames):
                # Full source padding may exceed a normalized cell. Pasting that
                # transparent rectangle would erase its neighboring frame.
                bounds=im.getbbox()
                if bounds:sheet.paste(im.crop(bounds),((i%count)*cell_w+anchor_x-ax+bounds[0],(i//count)*cell_h+anchor_y-ay+bounds[1]))
            target=OUT/f'{name}-{category}.png';sheet.save(target,optimize=True)
            metadata={'path':f'assets/pmdcollab/actions/{name}-{category}.png','action':selected,'sourceAction':actual,'frameWidth':cell_w,'frameHeight':cell_h,'frames':count,'directions':8,'durations':durations,'durationSeconds':sum(durations)/60,'hitFrame':int(action.findtext('HitFrame') or 0),'rushFrame':int(action.findtext('RushFrame') or 0),'returnFrame':int(action.findtext('ReturnFrame') or count-1),'anchorX':anchor_x,'anchorY':anchor_y,'native':True,'repeat':0,'sourceSha256':hashlib.sha256(image_bytes).hexdigest(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
            result[category]=metadata;audit['actions'][category]={**metadata,'source':path+actual+'-Anim.png','shadowSource':path+actual+'-Shadow.png'}
        (archive/'audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8');return name,result,audit
    with ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(species,SPECIES.items()))
    data={name:actions for name,actions,_ in results}
    provenance={'repository':REPO,'revision':revision,'policy':'Upstream CC BY-NC submission policy; individual original frames credited to CHUNSOFT where recorded. Pokémon and original game sprites retain their rights holders. No commercial clearance is claimed.','processing':'Native authored frame pixels translated without resampling onto common cells aligned by upstream per-frame white shadow marker; source durations preserved at60Hz.','species':{name:audit for name,_,audit in results}}
    (ARCHIVE/'source.json').write_text(json.dumps(provenance,indent=2)+'\n',encoding='utf-8')
    source='// Generated by tools/import_native_actions.py; upstream credits/policy in assets/pmdcollab/actions.\nexport interface NativeAction {path:string;action:string;sourceAction:string;frameWidth:number;frameHeight:number;frames:number;directions:number;durations:number[];durationSeconds:number;hitFrame:number;rushFrame:number;returnFrame:number;anchorX:number;anchorY:number;native:boolean;repeat:number;sourceSha256:string;sha256:string;}\nexport const NATIVE_ACTIONS:Readonly<Record<string,Partial<Record<\'physical\'|\'special\'|\'hurt\',NativeAction>>>>='+json.dumps(data,indent=2)+';\n'
    (ROOT/'src/data/nativeActions.ts').write_text(source,encoding='utf-8');print(json.dumps({'revision':revision,'species':len(results),'actions':sum(len(a) for _,a,_ in results)}))


if __name__=='__main__':main()
