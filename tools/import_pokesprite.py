"""Import the audited inventory subset unchanged, including source attribution."""
import hashlib
import io
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REVISION = 'c5aaa610ff2acdf7fd8e2dccd181bca8be9fcb3e'
BASE = f'https://raw.githubusercontent.com/msikma/pokesprite/{REVISION}/'
HELD = {
    'silkScarf':'silk-scarf', 'charcoal':'charcoal', 'mysticWater':'mystic-water',
    'miracleSeed':'miracle-seed', 'neverMeltIce':'never-melt-ice', 'blackBelt':'black-belt',
    'poisonBarb':'poison-barb', 'softSand':'soft-sand', 'sharpBeak':'sharp-beak',
    'twistedSpoon':'twisted-spoon', 'silverPowder':'silver-powder', 'hardStone':'hard-stone',
    'spellTag':'spell-tag', 'dragonFang':'dragon-fang', 'blackGlasses':'black-glasses',
    'metalCoat':'metal-coat', 'magnet':'magnet', 'leftovers':'leftovers',
    'scopeLens':'scope-lens', 'quickClaw':'quick-claw', 'bigRoot':'big-root',
    'luckyEgg':'lucky-egg', 'shellBell':'shell-bell', 'rockyHelmet':'rocky-helmet',
    'focusSash':'focus-sash', 'focusBand':'focus-band', 'floatStone':'float-stone',
    'muscleBand':'muscle-band', 'wiseGlasses':'wise-glasses', 'expertBelt':'expert-belt',
    'wideLens':'wide-lens', 'lightClay':'light-clay', 'bindingBand':'binding-band',
    'assaultVest':'assault-vest', 'safetyGoggles':'safety-goggles',
    'heavyDutyBoots':'heavy-duty-boots', 'lifeOrb':'life-orb', 'kingsRock':'kings-rock',
}
SELECTION = {key:f'items/hold-item/{name}.png' for key,name in HELD.items()}
SELECTION.update(zapPlate='items/plate/zap.png', pixiePlate='items/plate/pixie.png')
for key,name in {'hpUp':'hp-up','protein':'protein','iron':'iron','calcium':'calcium','zinc':'zinc','carbos':'carbos'}.items():
    SELECTION['vitamin:'+key] = f'items/medicine/{name}.png'
for key,name in {'potion':'potion','superPotion':'super-potion','hyperPotion':'hyper-potion','fullRestore':'full-restore','rareCandy':'rare-candy'}.items():
    SELECTION['consumable:'+key] = f'items/medicine/{name}.png'
for name in ('oran','sitrus','lum'):
    SELECTION['consumable:'+name+'Berry'] = f'items/berry/{name}.png'
for tier in ('xs','s','m','l','xl'):
    SELECTION['candy:'+tier] = f'items/exp-candy/{tier}.png'
for tier,name in enumerate(('poke','great','ultra'),1):
    SELECTION['ball:'+str(tier)] = f'items/ball/{name}.png'
for name in ('normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'):
    SELECTION['type:'+name] = f'misc/types/gen8/{name}.png'
# Pipeline reference art is shown in the asset audit, never offered as fake items.
SELECTION['reference:metalCoatEvolution'] = 'items/evo-item/metal-coat.png'
SELECTION['reference:oldAmber'] = 'items/fossil/old-amber.png'

def fetch(url):
    with urlopen(Request(url,headers={'User-Agent':'Pokemon-Survivors-asset-import'}),timeout=40) as response:
        return response.read()

cache = ROOT / 'test-results/pokesprite-tree.json'
tree = json.loads(cache.read_text()) if cache.exists() else None
if not tree or tree.get('revision') != REVISION:
    tree = {'revision':REVISION,'tree':json.loads(fetch(f'https://api.github.com/repos/msikma/pokesprite/git/trees/{REVISION}?recursive=1'))['tree']}
paths = {node['path'] for node in tree['tree'] if node['type']=='blob'}
for path in SELECTION.values():
    if path not in paths:
        raise ValueError('Unverified upstream sprite path: '+path)
sources = set(SELECTION.values())
for path in list(sources):
    outlined = path.replace('items/','items-outline/',1)
    if path.startswith('items/') and outlined in paths:
        sources.add(outlined)

destination = ROOT / 'public/assets/pokesprite'
def copy(path):
    data = fetch(BASE+path)
    with Image.open(io.BytesIO(data)) as image:
        width,height = image.size
        if path.startswith(('items/','items-outline/')) and image.convert('RGBA').getchannel('A').getextrema()[0] == 255:
            raise ValueError('Unexpected non-transparent sprite: '+path)
    target = destination / path
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(data)
    return {'path':path,'sha256':hashlib.sha256(data).hexdigest(),'width':width,'height':height}
with ThreadPoolExecutor(max_workers=8) as pool:
    imported = sorted(pool.map(copy,sorted(sources)),key=lambda item:item['path'])
metadata = {item['path']:item for item in imported}
registry = {}
for key,path in SELECTION.items():
    entry = {'normal':path,'width':metadata[path]['width'],'height':metadata[path]['height']}
    outlined = path.replace('items/','items-outline/',1)
    if path.startswith('items/') and outlined in sources:
        entry['outline'] = outlined
    registry[key] = entry
archive = ROOT / 'assets/pokesprite'
archive.mkdir(parents=True,exist_ok=True)
for name in ('license.md','readme.md','contributors.md'):
    (archive/name).write_bytes(fetch(BASE+name))
(archive/'imports.json').write_text(json.dumps({'repository':'https://github.com/msikma/pokesprite','revision':REVISION,'assets':imported,'registry':registry},indent=2)+'\n',encoding='utf-8')
output = ROOT/'src/data/pokespriteAssets.ts'
output.write_text('// Generated by tools/import_pokesprite.py; upstream notices in assets/pokesprite.\n'
                  'export const POKESPRITE_ASSETS:Record<string,{normal:string;outline?:string;width:number;height:number}>= '
                  +json.dumps(registry,indent=2)+';\n',encoding='utf-8')
print(f'Imported {len(imported)} verified PNGs for {len(registry)} asset mappings at {REVISION}.')
