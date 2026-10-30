"""Reconstruct original ImageGen pixel art into icons and four-frame VFX atlases.

Individual completed generations can be processed while later jobs run. The
finalize command collates exact prompts/hashes and builds a browsable gallery.
Large source generations remain outside Git, under Codex generated_images.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from html import escape
from collections import Counter
from pathlib import Path
from PIL import Image, ImageDraw
from process_move_icons import ROOT, font, preview, board, registry, normalize

QA=ROOT/'docs/qa/v050'
JOBS=ROOT/'assets/moves/v050-jobs'


def gameplay_gallery():
    """Link real browser captures without requiring a separately curated file list."""
    excluded={'all-move-icons.png','vfx-frame-gallery.png'}
    groups=[('Native attacks and regression review',[]),('Gameplay, progression and combat',[])]
    for path in sorted(QA.glob('*.png')):
        if path.name in excluded or path.name.startswith(('vfx-','source-')):continue
        title=path.stem.replace('-',' ').replace('_',' ')
        group=0 if any(word in path.stem for word in ('animation','attack','scratch','signature')) else 1
        groups[group][1].append(f'<article><h3>{escape(title)}</h3><a href="{path.name}"><img loading="lazy" src="{path.name}" alt="{escape(title)}"></a></article>')
    sections=''.join(f'<h2>{title}</h2><main class="captures">{"".join(cards)}</main>' for title,cards in groups if cards)
    clips=''.join(f'<article><h3>{escape(path.stem.replace("-"," "))}</h3><video controls preload="metadata" src="{path.name}"></video><a href="{path.name}">Open recording</a></article>' for path in sorted(QA.glob('*.webm')))
    gifs=''.join(f'<article><h3>{escape(path.stem.replace("-"," "))}</h3><a href="{path.name}"><img loading="lazy" src="{path.name}" alt="{escape(path.stem)}"></a></article>' for path in sorted(QA.glob('*.gif')) if not path.name.startswith('vfx-'))
    audits=''.join(f'<li><a href="{path.name}">{escape(path.stem.replace("-"," "))}</a></li>' for path in sorted(QA.glob('*.json')) if not path.name.startswith('source-'))
    if clips:sections+='<h2>Recorded gameplay</h2><main class="captures">'+clips+'</main>'
    if gifs:sections+='<h2>Animation comparisons</h2><main class="captures">'+gifs+'</main>'
    if audits:sections+='<h2>Validation and structured audits</h2><ul>'+audits+'</ul>'
    return sections


def grid(source, size, colors=20):
    source=source.convert('RGBA'); mask=source.getchannel('A').point(lambda a:255 if a>=160 else 0)
    visible=[p[:3] for p,a in zip(source.getdata(),mask.getdata()) if a]
    if not visible:return Image.new('RGBA',size)
    strip=Image.new('RGB',(len(visible),1));strip.putdata(visible)
    palette=strip.quantize(colors=colors,method=Image.Quantize.MEDIANCUT)
    quant=source.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGB')
    out=Image.new('RGBA',size);w,h=source.size;tw,th=size
    for y in range(th):
        for x in range(tw):
            box=(round(x*w/tw),round(y*h/th),max(round((x+1)*w/tw),round(x*w/tw)+1),max(round((y+1)*h/th),round(y*h/th)+1))
            alpha=list(mask.crop(box).getdata())
            if sum(bool(a) for a in alpha)/len(alpha)<.3:continue
            rgb=Counter(c for c,a in zip(quant.crop(box).getdata(),alpha) if a).most_common(1)[0][0]
            out.putpixel((x,y),(*rgb,255))
    return out


def isolate_vfx_frames(raw, fw, fh):
    """Separate authored keyframes at actual empty gutters, never guessed quarters.

    Source ImageGen sheets have unequal frame widths despite the equal-cell
    prompt. Their three widest fully transparent vertical gutters separate the
    four chronological subjects. We retain all particles inside each group,
    center each group horizontally, and use one global Y crop and one scale for
    every frame, preserving the authored windup/impact size progression/baseline.
    """
    w,h=raw.size;alpha=raw.getchannel('A').point(lambda a:255 if a>=160 else 0)
    bounds=alpha.getbbox()
    if not bounds:raise ValueError('Empty VFX source')
    occupied=[alpha.crop((x,0,x+1,h)).getbbox() is not None for x in range(w)]
    gutters=[];start=None
    for x in range(bounds[0],bounds[2]):
        if not occupied[x] and start is None:start=x
        elif occupied[x] and start is not None:
            gutters.append((start,x));start=None
    gutters=sorted(sorted(gutters,key=lambda gap:gap[1]-gap[0],reverse=True)[:3])
    if len(gutters)!=3 or any(b-a<max(3,w//250) for a,b in gutters):
        raise ValueError('VFX needs explicit review: cannot find three isolated frame gutters')
    cuts=[0,*[(a+b)//2 for a,b in gutters],w]
    boxes=[]
    for n in range(4):
        region=alpha.crop((cuts[n],0,cuts[n+1],h)).getbbox()
        if not region:raise ValueError('Empty isolated VFX frame')
        boxes.append((cuts[n]+region[0],bounds[1],cuts[n]+region[2],bounds[3]))
    max_width=max(box[2]-box[0] for box in boxes);height=bounds[3]-bounds[1]
    scale=min((fw-4)/max_width,(fh-4)/height)
    canvas_w=max(max_width,math.ceil((fw-4)/scale));canvas_h=max(height,math.ceil((fh-4)/scale))
    frames=[]
    for box in boxes:
        isolated=raw.crop(box);canvas=Image.new('RGBA',(canvas_w,canvas_h))
        canvas.paste(isolated,((canvas_w-isolated.width)//2,(canvas_h-isolated.height)//2))
        frames.append(grid(canvas,(fw-4,fh-4),24))
    metadata={'method':'three widest fully transparent alpha-projection gutters; horizontally centered subjects and shared vertical baseline/scale',
              'sourceFrameBoxes':[list(box) for box in boxes],
              'sourceGutters':[list(gap) for gap in gutters],
              'sourceCuts':cuts,'sharedCanvasSize':[canvas_w,canvas_h],
              'maxSubjectSourceWidth':max_width,'sharedSourceY':[bounds[1],bounds[3]],
              'sharedScale':scale,'preservesRelativeFrameSizes':True,'retainsAllParticlesInsideEachGroup':True}
    return frames,metadata


def process(entry, source_root):
    data=json.loads(entry.read_text(encoding='utf-8'));source=source_root/data['sourceFile']
    if data['kind']=='icon':
        result=normalize(source,'A');target=ROOT/'public/assets/moves'/f"{data['id']}.png"
        settings={'canvas':[32,32],'colors':12,'maxSubjectExtent':26,'alphaThreshold':192,'cellCoverage':.35,'sampling':'modal palette cluster / no interpolation'}
    else:
        raw=Image.open(source).convert('RGBA');w,h=raw.size
        if raw.getchannel('A').getextrema()[0]==255:raise ValueError('VFX source lacks actual transparent alpha')
        fw,fh=data['frameWidth'],data['frameHeight']
        frames,isolation=isolate_vfx_frames(raw,fw,fh)
        result=Image.new('RGBA',(fw*4,fh))
        for n,frame in enumerate(frames):result.paste(frame,(n*fw+2,2))
        target=ROOT/'public/assets/vfx'/f"{data['id']}.png"
        settings={'frameWidth':fw,'frameHeight':fh,'frames':4,'layout':'horizontal','colorsPerFrame':24,'alphaThreshold':160,'cellCoverage':.3,'isolation':isolation,'sampling':'modal palette clusters / fixed frame canvas'}
    target.parent.mkdir(parents=True,exist_ok=True);result.save(target,optimize=True)
    data.update(tool='Codex built-in image_gen.imagegen',model='not exposed',sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),sourceSize=list(Image.open(source).size),output=target.relative_to(ROOT).as_posix(),outputSha256=hashlib.sha256(target.read_bytes()).hexdigest(),processing=settings)
    entry.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps({'id':data['id'],'kind':data['kind'],'output':data['output'],'size':result.size}))


def finalize():
    entries=[json.loads(p.read_text(encoding='utf-8')) for p in sorted(JOBS.glob('*.json'))]
    moves=registry();known={m['id'] for m in moves}
    missing=[mid for mid in known if not (ROOT/'public/assets/moves'/f'{mid}.png').is_file()]
    if missing:raise ValueError(f'Missing move icons: {missing}')
    if any('outputSha256' not in e for e in entries):raise ValueError('Some generations not processed')
    manifest={'version':'0.5.0','created':'2026-10-30','tool':'Codex built-in image_gen.imagegen','existingIcons':'v0.4.3 original fourteen retained byte-for-byte','generations':entries,'moves':moves}
    (ROOT/'assets/moves/v050-generation-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    QA.mkdir(parents=True,exist_ok=True)
    rows=(len(moves)+5)//6;out=board((1440,90+rows*180),'v0.5.0 / complete move icon library','Native 32px + 4x nearest / existing icons preserved / original ImageGen pixel art')
    d=ImageDraw.Draw(out)
    cards=[]
    for i,m in enumerate(moves):
        x,y=24+(i%6)*240,94+(i//6)*180
        d.text((x,y),m['name'],font=font(15),fill='#f1f5ed');d.text((x,y+20),m['type'],font=font(12),fill='#a9bfc8')
        icon=Image.open(ROOT/'public/assets/moves'/f"{m['id']}.png")
        preview(out,icon,x,y+76);preview(out,icon,x+64,y+42,4)
        cards.append(f'<article><h2>{m["name"]}</h2><p>{m["type"]}</p><img width="32" height="32" src="../../../public/assets/moves/{m["id"]}.png"><img width="128" height="128" src="../../../public/assets/moves/{m["id"]}.png"></article>')
    out.save(QA/'all-move-icons.png')
    fx=[e for e in entries if e['kind']=='vfx'];sheet=board((1400,90+len(fx)*160),'Animated VFX / four distinct generated keyframes','Separate combat assets / fixed frame canvases / nearest-neighbor previews')
    d=ImageDraw.Draw(sheet)
    for i,e in enumerate(fx):
        y=94+i*160;d.text((24,y),e['id'],font=font(17),fill='#f1f5ed')
        im=Image.open(ROOT/e['output']);fw,fh=e['frameWidth'],e['frameHeight']
        for n in range(4):
            frame=im.crop((n*fw,0,(n+1)*fw,fh)).resize((fw*2,fh*2),Image.Resampling.NEAREST)
            sheet.paste(frame,(180+n*(fw*2+14),y),frame)
        frames=[im.crop((n*fw,0,(n+1)*fw,fh)).resize((fw*3,fh*3),Image.Resampling.NEAREST) for n in range(4)]
        frames[0].save(QA/f"vfx-{e['id']}.gif",save_all=True,append_images=frames[1:],duration=[90,90,100,100],loop=0,disposal=2)
    sheet.save(QA/'vfx-frame-gallery.png')
    vfx_cards=''.join(f'<article><h2>{e["id"]}</h2><img src="vfx-{e["id"]}.gif"></article>' for e in fx)
    html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>v0.5.0 move system review</title><style>body{background:#101820;color:#eef3ee;font:16px system-ui;margin:32px}a{color:#a9debb}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}article{background:#202c34;padding:16px;border-radius:8px;min-width:0}img{image-rendering:pixelated;margin:8px;background:repeating-conic-gradient(#303e48 0% 25%,#26323b 0% 50%) 0/16px 16px;max-width:100%;object-fit:contain}h2{font-size:22px;margin-top:36px}h3{font-size:17px}p{color:#b7c8bd}nav{display:flex;flex-wrap:wrap;gap:20px;margin:24px 0}.captures{grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr))}.captures img{width:100%;margin:0}.captures video{width:100%;display:block;margin-bottom:12px}li{margin:8px 0}</style><h1>v0.5.0 / move system and combat art</h1><p>Actual browser captures, recorded native animation playback, original generated artwork, and reproducible validation audits. Open images for full resolution.</p><nav><a href="../../V050_MOVE_SYSTEM.md">Implementation report</a><a href="all-move-icons.png">All icons</a><a href="vfx-frame-gallery.png">VFX frame sheet</a></nav>'''+gameplay_gallery()+'<h2>Move icons</h2><main>'+''.join(cards)+'</main><h2>Combat animation components</h2><main>'+vfx_cards+'</main></html>'
    (QA/'index.html').write_text(html,encoding='utf-8')
    print(json.dumps({'moves':len(moves),'newGenerations':len(entries),'vfx':len(fx)}))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--entry',type=Path);p.add_argument('--source-root',type=Path);p.add_argument('--finalize',action='store_true');a=p.parse_args()
    if a.finalize:finalize()
    else:process(a.entry,a.source_root)
