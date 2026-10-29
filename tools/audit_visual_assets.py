from pathlib import Path
import re

from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
ATLAS=ROOT/'public/assets/environment/viridian/forest-atlas-source.png'
OUTPUT=ROOT/'docs/visuals/current-environment-atlas-coordinates.png'


def contact_sheet()->None:
    source=Image.open(ATLAS).convert('RGBA')
    scale=0.75
    image=source.resize((round(source.width*scale),round(source.height*scale)),Image.Resampling.NEAREST)
    draw=ImageDraw.Draw(image)
    font=ImageFont.load_default()
    cell_w=image.width/8
    cell_h=image.height/8
    for row in range(8):
        for col in range(8):
            x0=round(col*cell_w); y0=round(row*cell_h)
            x1=round((col+1)*cell_w); y1=round((row+1)*cell_h)
            draw.rectangle((x0,y0,x1-1,y1-1),outline=(255,255,255,220),width=1)
            label=f'{col},{row}'
            draw.rectangle((x0+2,y0+2,x0+28,y0+13),fill=(0,0,0,210))
            draw.text((x0+4,y0+3),label,font=font,fill=(255,255,255,255))
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    image.convert('RGB').save(OUTPUT,quality=94)
    print(f'contact sheet: {OUTPUT} ({source.width}x{source.height}, 8x8 generated atlas)')


def sprite_grounding_audit()->None:
    text=(ROOT/'src/content.ts').read_text(encoding='utf-8')
    block=text.split('export const SPRITE_FRAMES',1)[1].split('};',1)[0]
    pattern=re.compile(r'(\w+):\{width:(\d+),height:(\d+),frames:(\d+)\}')
    sprite_root=ROOT/'public/assets/pmdcollab/sprites'
    print('species       frame    alpha-bottom range  max-anchor')
    for name,width,height,frames in pattern.findall(block):
        width=int(width);height=int(height);frames=int(frames)
        image=Image.open(sprite_root/f'{name}.png').convert('RGBA')
        bottoms=[]
        for row in range(8):
            for col in range(frames):
                alpha=image.crop((col*width,row*height,(col+1)*width,(row+1)*height)).getchannel('A')
                bbox=alpha.getbbox()
                if bbox: bottoms.append(bbox[3])
        print(f'{name:13} {width:2}x{height:<2}   {min(bottoms):2}-{max(bottoms):2}               {max(bottoms)/height:.3f}')


if __name__=='__main__':
    contact_sheet()
    sprite_grounding_audit()
