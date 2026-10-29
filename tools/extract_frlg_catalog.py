"""Export every source tile, reviewed complete props, and a searchable catalog.

Raw cells retain exact source pixels. Section labels are explicitly distinguished
from verified object identities; a cell in a building is never called a complete
building. Complete runtime props are exported separately with transparent margins.
"""

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw

from extract_frlg_tiles import TILE, TILES, TREE_PARTS, PROP_CROPS, crop, clear_connected_grass, pad_sprite

ROOT = Path(__file__).resolve().parents[1]

# x, y, width, height, kind, group, descriptive name. Smaller verified regions
# take precedence over broad sheet-section labels below.
REGIONS = [
    (1,0,1,1,'terrain','grass','grass_base'),
    (0,1,2,2,'terrain','grass','grass_speckles'),
    (4,0,1,1,'prop_parts','flowers','red_flower_cluster'),
    (5,0,1,1,'prop_parts','shrubs','round_shrub'),
    (2,0,2,1,'prop_parts','signs','town_sign'),
    (6,0,2,1,'prop_parts','buildings','window_pair'),
    (2,1,4,1,'prop_parts','foliage','grass_and_tree_overlap'),
    (2,2,6,3,'prop_parts','trees','tree_crown_and_trunk'),
    (0,5,4,4,'prop_parts','buildings','poke_mart'),
    (0,9,4,4,'prop_parts','buildings','pokemon_center'),
    (4,5,4,8,'prop_parts','buildings','town_house'),
    (0,13,8,10,'terrain','cliffs','brown_cliff'),
    (0,23,5,3,'terrain','cliffs','cliff_and_ledge'),
    (5,23,3,3,'terrain','grass','pale_grass_patch'),
    (0,26,3,3,'terrain','paths','dirt_path'),
    (3,26,3,3,'terrain','paths','sand_path'),
    (6,26,2,3,'prop_parts','fences','stone_fence'),
    (0,29,4,3,'prop_parts','fences','wood_fence'),
    (4,29,3,3,'prop_parts','fences','stone_fence'),
    (0,32,8,7,'terrain','water_and_sand','coastal_water_and_sand'),
    (0,34,2,2,'prop_parts','rocks','coastal_rock_pile'),
    (0,39,5,5,'prop_parts','buildings','gym_building'),
    (5,39,3,3,'prop_parts','hedges','hedge_corner'),
    (0,44,2,2,'prop_parts','signs','gym_and_town_sign'),
    (2,44,3,3,'terrain','stairs','outdoor_stairs'),
    (5,44,3,3,'terrain','pavement','town_pavement'),
    (0,52,3,3,'terrain','water','pond_shore'),
    (3,52,5,3,'terrain','water','pond_cliff_and_island'),
    (0,55,5,2,'terrain','pavement','stone_pavement'),
    (5,55,3,2,'prop_parts','bridges','wood_deck'),
    (0,57,8,20,'terrain','coast_and_water','ocean_cliff_and_sand'),
    (3,57,2,2,'prop_parts','rocks','coastal_boulder'),
    (5,89,3,2,'prop_parts','shrubs','town_shrub_variants'),
    (0,200,6,3,'terrain','paths','town_sand_and_grass'),
    (2,203,1,1,'prop_parts','foliage','complete_grass_tuft'),
    (0,204,8,3,'terrain','water','pond_wall_and_water'),
    (0,221,8,8,'prop_parts','trees','broadleaf_tree_and_hedge'),
    (3,229,5,1,'terrain','water','pond_edge'),
    (0,288,8,16,'terrain','cliffs','canyon_cliff'),
    (0,304,8,44,'prop_parts','ship_interiors','ship_room_and_deck'),
    (0,348,1,1,'review','forest','source_separator'),
    (1,348,1,1,'prop_parts','trees','forest_tree_cap'),
    (2,348,1,1,'terrain','flowers','repeating_flower_ground'),
    (3,348,1,1,'terrain','pavement','brick_ground'),
    (4,348,1,1,'prop_parts','foliage','grass_and_tree_overlap'),
    (0,349,3,4,'prop_parts','trees','forest_tree_crown_overlap'),
    (3,349,5,4,'prop_parts','forest_parts','forest_fence_trunk_and_canopy'),
    (0,353,3,1,'terrain','paths','forest_path'),
    (0,354,8,46,'terrain','caves','cave_floor_wall_and_rock'),
    (0,400,8,16,'terrain','ice','ice_floor_wall_and_rock'),
    (0,416,8,16,'terrain','mountain','mountain_floor_and_wall'),
    (0,432,8,16,'terrain','volcanic','volcanic_floor_and_wall'),
    (0,448,8,5,'prop_parts','trees','autumn_forest_parts'),
    (0,453,8,43,'terrain','limestone','limestone_floor_wall_and_rock'),
]

BANDS = [
    (0,76,'outdoor_basics'),(77,127,'town_buildings'),(128,191,'city_and_harbour'),
    (192,220,'city_buildings_and_ground'),(221,229,'forest_broadleaf'),
    (230,287,'city_large_structures'),(288,303,'canyon'),(304,347,'ship_interior'),
    (348,353,'forest'),(354,399,'caves'),(400,415,'ice_cave'),(416,431,'mountain'),
    (432,447,'volcanic_cave'),(448,495,'autumn_forest_and_limestone'),
    (496,527,'town_and_cave_entrances'),(528,575,'island_town_and_cliffs'),
    (576,598,'island_structures_and_ground'),
]


def label_cell(col, row, tile):
    if all(pixel[:3] == (0,0,0) or pixel[3] == 0 for pixel in tile.getdata()):
        return 'blank','source_placeholders','black_or_transparent','verified'
    matches = [r for r in REGIONS if r[0] <= col < r[0]+r[2] and r[1] <= row < r[1]+r[3]]
    if matches:
        r = min(matches, key=lambda r:r[2]*r[3])
        role = f'part_{row-r[1]:02}_{col-r[0]:02}' if r[2]*r[3] > 1 else 'cell'
        return r[4],r[5],f'{r[6]}_{role}','region'
    section = next(name for start,end,name in BANDS if start <= row <= end)
    # Buildings share tiles with ground/roof/decoration. Retain an honest section
    # label until those cells have a verified semantic boundary.
    return 'review',section,f'{section}_sheet_part','section_only'


def write_image(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.info.clear()
    image.save(path, optimize=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source',type=Path,default=ROOT/'assets/source/frlg/outdoors-c.png')
    parser.add_argument('--output',type=Path,default=ROOT/'assets/extracted/frlg')
    args = parser.parse_args()
    source = Image.open(args.source).convert('RGBA')
    cols, rows = source.width//TILE,source.height//TILE
    if source.size != (128,9584):
        raise SystemExit(f'Expected 128x9584 source; got {source.size}')
    entries = []
    for row in range(rows):
        for col in range(cols):
            tile = crop(source,(col,row,1,1))
            kind,group,name,status = label_cell(col,row,tile)
            name = f'{name}_r{row:03}_c{col:02}_16x16'
            relative = Path('tiles')/kind/group/f'{name}.png'
            write_image(tile,args.output/relative)
            entries.append(dict(id=f'tile_r{row:03}_c{col:02}',name=name,kind=kind,group=group,
                                semantic_status=status,path=relative.as_posix(),width=16,height=16,
                                source_rect=[col*16,row*16,16,16],standalone=False))

    runtime = ROOT/'public/assets/environment/viridian/frlg'
    props = [('tree','trees','conifer_tree'),('tree_cluster','trees','broadleaf_tree'),
             ('sapling','trees','small_tree'),('bush','shrubs','round_shrub'),
             ('rock_small','rocks','rock_pile'),('rock_medium','rocks','boulder'),
             ('grass_flowers','flowers','red_flower_cluster')]
    for key,group,name in props:
        image = Image.open(runtime/f'{key}.png').convert('RGBA')
        relative = Path('props')/group/f'{name}_{image.width}x{image.height}.png'
        write_image(image,args.output/relative)
        parts = TREE_PARTS[key][1] if key in TREE_PARTS else [(PROP_CROPS[key] if key in PROP_CROPS else TILES[key],(0,0))]
        entries.append(dict(id=name,name=name,kind='prop',group=group,path=relative.as_posix(),
                            width=image.width,height=image.height,standalone=True,semantic_status='verified',
                            source_parts=[dict(cells=list(spec),destination=list(dest)) for spec,dest in parts],
                            padding=2,content_bounds=list(image.getchannel('A').getbbox())))

    background={p[:3] for spec in (TILES['grass'],TILES['grass_detail_a'],TILES['grass_detail_b']) for p in crop(source,spec).getdata()}
    for name,group,spec in [('poke_mart','buildings',(0,5,4,4)),('pokemon_center','buildings',(0,9,4,4)),
                            ('red_town_sign','signs',(2,0,1,1)),('brown_town_sign','signs',(3,0,1,1))]:
        image=pad_sprite(clear_connected_grass(crop(source,spec),background))
        modular=group=='buildings'
        if modular:name+='_modular_sample'
        relative=Path('parts' if modular else 'props')/group/f'{name}_{image.width}x{image.height}.png'
        write_image(image,args.output/relative)
        entries.append(dict(id=name,name=name,kind='prop_parts' if modular else 'prop',group=group,path=relative.as_posix(),width=image.width,height=image.height,
                            standalone=not modular,semantic_status='region' if modular else 'verified',source_cells=list(spec),padding=2,
                            content_bounds=list(image.getchannel('A').getbbox())))

    # A complete transparent tuft is a prop; its native background cell is a
    # terrain tile. Do not trim the lower leaves to fit the earlier bad sample.
    tuft = Image.open(runtime/'tall_grass.png').convert('RGBA')
    grass = crop(source,TILES['grass'])
    relative = Path('props/foliage')/f'grass_tuft_{tuft.width}x{tuft.height}.png'
    write_image(tuft,args.output/relative)
    entries.append(dict(id='grass_tuft',name='grass_tuft',kind='prop',group='foliage',path=relative.as_posix(),
                        width=tuft.width,height=tuft.height,standalone=True,semantic_status='verified',
                        source_rect=[32,3248,16,16],padding=2,content_bounds=list(tuft.getchannel('A').getbbox())))
    for key in ('grass','grass_detail_a','grass_detail_b','tall_grass'):
        image = crop(source,(2,203,1,1)) if key=='tall_grass' else Image.open(runtime/f'{key}.png').convert('RGBA')
        relative = Path('terrain/grass')/f'{key}_16x16.png'
        write_image(image,args.output/relative)
        entries.append(dict(id=key,name=key,kind='terrain',group='grass',path=relative.as_posix(),width=16,height=16,standalone=True,semantic_status='verified'))
    patch = Image.new('RGBA',(32,32))
    for x,y in ((0,0),(16,0),(0,16),(16,16)):
        patch.alpha_composite(grass,(x,y))
    relative = Path('terrain/grass/grass_patch_32x32.png')
    write_image(patch,args.output/relative)
    entries.append(dict(id='grass_patch_32',name='grass_patch_32x32',kind='terrain',group='grass',path=relative.as_posix(),width=32,height=32,standalone=True,semantic_status='verified',assembly='2x2 repetition of source grass cell (1,0)'))
    for key,spec in [('dirt_path_panel',(0,26,3,3)),('pond_panel',(0,52,3,3))]:
        image = crop(source,spec)
        relative = Path('terrain')/('paths' if key.startswith('dirt') else 'water')/f'{key}_48x48.png'
        write_image(image,args.output/relative)
        entries.append(dict(id=key,name=key,kind='terrain',group=relative.parts[1],path=relative.as_posix(),width=48,height=48,source_cells=list(spec),standalone=True,semantic_status='verified'))

    # Verify coverage by rebuilding the entire sheet from the exported cells.
    rebuilt = Image.new('RGBA',source.size)
    for entry in entries[:cols*rows]:
        x,y,_,_ = entry['source_rect']
        with Image.open(args.output/entry['path']) as tile:
            rebuilt.paste(tile,(x,y))
    if rebuilt.tobytes() != source.tobytes():
        raise SystemExit('Lossless reconstruction failed')
    counts = dict(Counter(entry['kind'] for entry in entries))
    manifest = dict(schema_version=1,source=args.source.relative_to(ROOT).as_posix(),source_sha256=hashlib.sha256(args.source.read_bytes()).hexdigest(),
                    native_tile_size=16,source_width=128,source_height=9584,columns=cols,rows=rows,
                    raw_tile_count=cols*rows,lossless_reconstruction=True,counts=counts,entries=entries)
    (args.output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    readme = f'''# FRLG outdoor tiles and props

Source: the user-supplied Ozotwo FireRed/LeafGreen outdoor sheet, archived at `{manifest['source']}`.

All **{cols*rows:,} native 16x16 cells** ({cols} columns x {rows} rows) are exported, including placeholders. Reassembling them reproduces every source pixel exactly. Open **index.html** for searchable previews.

- `tiles/terrain/`: source cells in identified terrain regions (grass, paths, water, cliffs, cave floors, etc.).
- `tiles/prop_parts/`: individual cells belonging to trees, buildings, fences, signs, rocks, and other objects. These are **parts**, not standalone props.
- `tiles/review/`: named by sheet section and exact row/column where an individual object boundary has not been verified. These labels deliberately do not invent an object identity.
- `tiles/blank/`: black/transparent source placeholders, retained for complete coverage.
- `props/`: reviewed, assembled, standalone trees, shrubs, rocks, flowers, tall grass, and signs. PNG names include actual native dimensions. Transparent margins protect their silhouettes.
- `parts/buildings/`: larger modular building samples. These are explicitly partial assemblies, not verified standalone buildings.
- `terrain/`: ready-to-use terrain, including 16x16 grass, a 32x32 grass metatile, and 48x48 dirt/pond samples.
- `manifest.json`: dimensions, type, classification status, source coordinates, composition, and content bounds.

Counts by kind: {json.dumps(counts,sort_keys=True)}.

No complete log has been verified in this source sheet. No tree/fence fragment is mislabeled as a log. This catalog contains source artwork and mechanical assemblies only, without AI-generated replacements.

Regenerate with `python tools/extract_frlg_tiles.py assets/source/frlg/outdoors-c.png`, then `python tools/extract_frlg_catalog.py`.
'''
    (args.output/'README.md').write_text(readme,encoding='utf-8')
    html = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>FRLG Tile & Prop Catalog</title><style>
body{font:15px system-ui;background:#16231c;color:#e6f0e9;margin:0}header{position:sticky;top:0;padding:18px 24px;background:#102018;z-index:1}h1{font-size:24px;margin:0 0 8px}input,select{font:inherit;padding:10px;margin:4px;background:#253b2c;color:white;border:1px solid #52785b;border-radius:4px}input{width:min(500px,70vw)}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:12px;padding:24px}.card{background:#24392b;border:1px solid #4b6351;border-radius:6px;padding:12px;overflow-wrap:anywhere}.preview{display:grid;place-items:center;height:148px;background-color:#70c8a0;background-image:linear-gradient(45deg,#ffffff16 25%,transparent 25%,transparent 75%,#ffffff16 75%),linear-gradient(45deg,#ffffff16 25%,transparent 25%,transparent 75%,#ffffff16 75%);background-size:16px 16px;background-position:0 0,8px 8px}.preview img{image-rendering:pixelated;max-width:100%;max-height:144px}h2{font-size:14px}small{color:#b8cfbf}.tag{font-size:12px;color:#ffe398}.more{display:block;margin:20px auto;padding:12px 30px}a{color:#a8dcb3}</style>
<header><h1>FRLG tiles & complete props</h1><div id="summary"></div><input id="search" placeholder="Search name, group, row, or column"><select id="kind"><option value="all">All assets</option><option value="prop">Complete props</option><option value="terrain">Terrain</option><option value="prop_parts">Prop parts</option><option value="review">Needs semantic review</option><option value="blank">Blank cells</option></select><select id="group"><option value="all">All groups</option></select><div id="count"></div></header><main id="grid"></main><button id="more" class="more">Show more</button>
<script id="manifest" type="application/json">MANIFEST_DATA</script><script>
const data=JSON.parse(document.getElementById('manifest').textContent),grid=document.getElementById('grid'),search=document.getElementById('search'),kind=document.getElementById('kind'),group=document.getElementById('group');let shown=120;
document.getElementById('summary').textContent=`${data.raw_tile_count.toLocaleString()} native cells · 128 × 9584 source · every source pixel verified`;
for(const name of [...new Set(data.entries.map(e=>e.group))].sort()){const option=document.createElement('option');option.value=name;option.textContent=name;group.append(option)}
function render(){const q=search.value.trim().toLowerCase(),items=data.entries.filter(e=>(kind.value==='all'||e.kind===kind.value)&&(group.value==='all'||e.group===group.value)&&JSON.stringify(e).toLowerCase().includes(q));grid.replaceChildren();document.getElementById('count').textContent=`${items.length} matching assets · showing ${Math.min(shown,items.length)}`;
for(const e of items.slice(0,shown)){const card=document.createElement('article');card.className='card';const preview=document.createElement('a');preview.className='preview';preview.href=e.path;preview.target='_blank';const img=document.createElement('img');img.src=e.path;img.alt=e.name;img.loading='lazy';img.width=e.width*Math.min(4,144/e.height);img.height=e.height*Math.min(4,144/e.height);preview.append(img);const h=document.createElement('h2');h.textContent=e.name;const type=document.createElement('div');type.className='tag';type.textContent=`${e.kind} · ${e.width}×${e.height} · ${e.standalone?'standalone':'source part'}`;const meta=document.createElement('small');meta.textContent=`${e.group} · ${e.semantic_status}${e.source_rect?' · source '+e.source_rect.join(', '):''}`;card.append(preview,h,type,meta);grid.append(card)}document.getElementById('more').hidden=shown>=items.length}
for(const input of [search,kind,group])input.addEventListener('input',()=>{shown=120;render()});document.getElementById('more').onclick=()=>{shown+=240;render()};render();</script></html>'''
    html=html.replace('.more{display:block;', '.more[hidden]{display:none}.more{display:block;')
    (args.output/'index.html').write_text(html.replace('MANIFEST_DATA',json.dumps(manifest).replace('</','<\\/')),encoding='utf-8')
    print(json.dumps(dict(output=str(args.output),raw_tiles=cols*rows,counts=counts,lossless_reconstruction=True)))


if __name__ == '__main__':
    main()
