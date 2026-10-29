from pathlib import Path
from collections import deque

from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'public/assets/environment/viridian/forest-atlas-source.png'
out=source.parent
cells={
 'grass':(0,0),'dirt':(1,0),'path_north':(2,0),'path_south':(3,0),'path_west':(4,0),'path_east':(5,0),'path_corner_nw':(6,0),'path_corner_ne':(7,0),
 'path_corner_sw':(0,1),'path_corner_se':(1,1),'tall_grass_a':(2,1),'tall_grass_b':(3,1),'tall_grass_c':(4,1),'bush_white':(5,1),'bush_pink':(6,1),'bush_blue':(7,1),
 'tree_light':(0,2),'tree_dark':(1,2),'tree_autumn':(2,2),'tree_cluster':(4,2),'tree_cluster_alt':(5,2),'ancient_tree':(6,2),'ancient_tree_right':(7,2),
 'flowers_white':(0,3),'flowers_pink':(1,3),'flowers_blue':(2,3),'flowers_yellow':(3,3),'flowers_mixed':(4,3),'mushrooms_red':(5,3),'mushrooms_purple':(6,3),
 'log':(0,4),'log_flowers':(1,4),'stump':(2,4),'rock_small':(3,4),'rock_medium':(4,4),'rock_large':(5,4),'rock_flowers':(6,4),
 'water':(0,5),'shore_north':(1,5),'shore_south':(2,5),'shore_west':(3,5),'shore_east':(4,5),'pond_nw':(5,5),'pond_ne':(6,5),'pond_corner':(7,5),
 'lilypads':(0,6),'lily':(1,6),'lily_flower':(2,6),'reeds':(3,6),'fern':(4,6),'fern_tall':(5,6),'forest_flower':(6,6),'broadleaf':(7,6),
 'grass_leaves':(0,7),'grass_rocks':(1,7),'grass_flowers':(2,7),'grass_mushrooms':(3,7),'forest_floor':(4,7),'root_arch':(5,7),'stump_large':(6,7),'hollow_log':(7,7),
}
img=Image.open(source).convert('RGBA')

def remove_background(tile:Image.Image)->Image.Image:
    """Remove only magenta-family pixels connected to a crop edge.

    The generated atlas uses a magenta key, but anti-aliased edge pixels are not
    all the exact key colour. Flooding from the outside preserves intentional
    pink/purple details inside a sprite while removing the complete colour halo.
    """
    px=tile.load(); width,height=tile.size
    seen=set(); queue=deque()
    def is_key(x:int,y:int)->bool:
        r,g,b,_=px[x,y]
        return r>105 and b>80 and r>g*1.45 and b>g*1.15
    for x in range(width):
        if is_key(x,0): queue.append((x,0))
        if is_key(x,height-1): queue.append((x,height-1))
    for y in range(height):
        if is_key(0,y): queue.append((0,y))
        if is_key(width-1,y): queue.append((width-1,y))
    while queue:
        x,y=queue.popleft()
        if (x,y) in seen or not is_key(x,y): continue
        seen.add((x,y)); px[x,y]=(0,0,0,0)
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0<=nx<width and 0<=ny<height and (nx,ny) not in seen:
                queue.append((nx,ny))
    return tile

for name,(col,row) in cells.items():
    x0=round(col*img.width/8)+2; x1=round((col+1)*img.width/8)-2
    y0=round(row*img.height/8)+2; y1=round((row+1)*img.height/8)-2
    tile=img.crop((x0,y0,x1,y1)).resize((128,128),Image.Resampling.NEAREST)
    tile=remove_background(tile)
    tile.save(out/f'{name}.png',optimize=True)
for name in ('grass','dirt'):
    tile=Image.open(out/f'{name}.png').convert('RGBA')
    # The decorative source cell has transparent foliage around its outside.
    # Crop its opaque interior into a repeatable fill for seamless terrain.
    fill=tile.crop((18,18,110,110)).resize((128,128),Image.Resampling.NEAREST)
    fill.save(out/f'{name}_fill.png',optimize=True)
left=Image.open(out/'ancient_tree.png').convert('RGBA')
right=Image.open(out/'ancient_tree_right.png').convert('RGBA')
ancient=Image.new('RGBA',(256,128),(0,0,0,0))
ancient.paste(left,(0,0),left); ancient.paste(right,(128,0),right)
ancient.save(out/'ancient_tree.png',optimize=True)
print(f'extracted {len(cells)+2} assets to {out}')
