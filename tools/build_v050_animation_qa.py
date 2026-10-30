"""Compose captured browser frames only; never fabricate Pokémon action frames.

Run after the v050 Playwright animation audit. Intermediates default to ignored
test-results/; V050_QA_WORKDIR can isolate them from other test runners. Compact
review artifacts are retained in docs/qa/v050/.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import os

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'docs/qa/v050'
WORK=Path(os.environ.get('V050_QA_WORKDIR',ROOT/'test-results'))
FRAMES=WORK/'v050-animation-frames'
FORMS=[('charmander','Scratch'),('charmeleon','Metal Claw'),('charizard','Dragon Claw'),('bulbasaur','Vine Whip'),('ivysaur','Power Whip'),('venusaur','Power Whip')]
FACINGS=['south','southeast','east','northeast','north','northwest','west','southwest']

def font(size):
    for path in [Path('C:/Windows/Fonts/consola.ttf'),Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]:
        if path.exists():return ImageFont.truetype(str(path),size)
    return ImageFont.load_default(size=size)

def canvas(size):return Image.new('RGB',size,'#11191e')

def caption(image,xy,label,size=16):ImageDraw.Draw(image).text(xy,label,font=font(size),fill='#e8f4e8')

def source(species,facing,index):
    video=WORK/'v050-video-frames'/species/f'{index:02d}.png'
    path=video if facing=='east' and video.exists() else FRAMES/species/facing/f'{index:02d}.png'
    return Image.open(path).convert('RGB')

def main():
    QA.mkdir(parents=True,exist_ok=True)
    animation=[]
    for index in range(12):
        frame=canvas((1260,720))
        for cell,(species,move) in enumerate(FORMS):
            x,y=cell%3*420,cell//3*360
            caption(frame,(x+12,y+9),f'{species.title()} / {move}')
            frame.paste(source(species,'east',index),(x,y+40))
        animation.append(frame)
    animation[0].save(QA/'starter-signature-animations.gif',save_all=True,append_images=animation[1:],duration=90,loop=0,optimize=True)
    families=[('fire',FORMS[:3]),('bulbasaur',FORMS[3:])]
    if (WORK/'v050-video-frames/blastoise/00.png').exists():families.append(('water',[('squirtle','Tackle'),('wartortle','Water Gun'),('blastoise','Hydro Pump')]))
    for family,forms in families:
        sheet=canvas((840,642))
        caption(sheet,(14,10),'Recorded gameplay / native action frames + move VFX',19)
        for row,(species,move) in enumerate(forms):
            y=50+row*194
            caption(sheet,(12,y),f'{species.title()} / {move}',17)
            for index in range(4):sheet.paste(source(species,'east',index).resize((210,160),Image.Resampling.NEAREST),(index*210,y+28))
        sheet.save(QA/f'{family}-family-attack-animation.png')
    sheet=canvas((1680,1190))
    caption(sheet,(12,8),'Eight directions / genuine native attack playback in actual gameplay',21)
    for col,facing in enumerate(FACINGS):caption(sheet,(col*210+12,43),facing,16)
    for row,(species,move) in enumerate(FORMS):
        y=75+row*184
        caption(sheet,(12,y),f'{species.title()} / {move}',15)
        for col,facing in enumerate(FACINGS):sheet.paste(source(species,facing,0).resize((210,160),Image.Resampling.NEAREST),(col*210,y+22))
    sheet.save(QA/'attack-directions.png')
    comparison=[]
    for index in range(12):
        frame=canvas((840,370));caption(frame,(12,10),'BEFORE / legacy walk frames + Graphics',15);caption(frame,(432,10),'AFTER / native Attack frames + pixel VFX',15)
        frame.paste(Image.open(FRAMES/'legacy-scratch'/f'{index:02d}.png').convert('RGB'),(0,50));frame.paste(source('charmander','east',index),(420,50));comparison.append(frame)
    comparison[0].save(QA/'attack-before-after.gif',save_all=True,append_images=comparison[1:],duration=90,loop=0,optimize=True)
    comparison[2].save(QA/'attack-before-after.png')
    families=[]
    for index in range(12):
        frame=canvas((840,1110))
        for row,(species,move,legacy_dir) in enumerate([('charmander','Scratch','legacy-scratch'),('bulbasaur','Vine Whip','legacy-bulbasaur'),('squirtle','Tackle','legacy-squirtle')]):
            y=row*370;caption(frame,(12,y+9),f'{species.title()} / {move} — BEFORE',15);caption(frame,(432,y+9),'AFTER / native frames + pixel VFX',15)
            frame.paste(Image.open(FRAMES/legacy_dir/f'{index:02d}.png').convert('RGB'),(0,y+50));frame.paste(source(species,'east',index),(420,y+50))
        families.append(frame)
    families[0].save(QA/'all-families-before-after.gif',save_all=True,append_images=families[1:],duration=90,loop=0,optimize=True)
    families[2].save(QA/'all-families-before-after.png')
    print('Created six-form animated comparison, starter-family sheets, eight-direction audit and all-family before/after GIF/PNG.')

if __name__=='__main__':main()
