"""Check terrain seams, complete props, and lossless full-sheet coverage."""

import hashlib
import json
import unittest
from pathlib import Path

from PIL import Image

from extract_frlg_tiles import terrain_coverage, crop, clear_connected_grass, pad_sprite, TILES

ROOT=Path(__file__).resolve().parents[1]
DIRECTIONS=[(0,-1,1),(1,-1,2),(1,0,4),(1,1,8),(0,1,16),(-1,1,32),(-1,0,64),(-1,-1,128)]


class MapAssetTests(unittest.TestCase):
    def test_grass_keeps_the_complete_native_lower_leaves(self):
        with Image.open(ROOT/'assets/source/frlg/outdoors-c.png') as source:
            image=source.convert('RGBA')
            palette={pixel[:3] for pixel in crop(image,TILES['grass']).getdata()}
            expected=pad_sprite(clear_connected_grass(crop(image,(2,203,1,1)),palette))
        with Image.open(ROOT/'public/assets/environment/viridian/frlg/tall_grass.png') as actual:
            self.assertEqual(actual.size,expected.size)
            self.assertEqual(actual.convert('RGBA').tobytes(),expected.tobytes())
            alpha=actual.getchannel('A')
            self.assertGreater(sum(alpha.getpixel((x,actual.height-3))>0 for x in range(actual.width)),0)

    def test_all_native_tiles_rebuild_source_exactly(self):
        root=ROOT/'assets/extracted/frlg'
        manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
        source=ROOT/manifest['source']
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),manifest['source_sha256'])
        entries=[e for e in manifest['entries'] if e['id'].startswith('tile_r')]
        self.assertEqual(len(entries),4792)
        self.assertEqual(len({e['id'] for e in entries}),4792)
        rebuilt=Image.new('RGBA',(128,9584))
        for entry in entries:
            with Image.open(root/entry['path']) as tile:
                self.assertEqual(tile.size,(16,16))
                rebuilt.paste(tile,tuple(entry['source_rect'][:2]))
        with Image.open(source) as original:
            self.assertEqual(rebuilt.tobytes(),original.convert('RGBA').tobytes())

    def test_standalone_props_have_whole_silhouettes_and_no_stray_fragments(self):
        root=ROOT/'assets/extracted/frlg'
        manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
        for entry in manifest['entries']:
            if entry['kind']!='prop':continue
            with self.subTest(entry=entry['name']),Image.open(root/entry['path']) as image:
                alpha=image.getchannel('A')
                bounds=alpha.getbbox()
                self.assertIsNotNone(bounds)
                self.assertGreaterEqual(bounds[0],2)
                self.assertGreaterEqual(bounds[1],2)
                self.assertLessEqual(bounds[2],image.width-2)
                self.assertLessEqual(bounds[3],image.height-2)

    def test_all_terrain_adjacencies_connect_across_shared_edges(self):
        for vertical in (False,True):
            centres=((0,0),(0,1)) if vertical else ((0,0),(1,0))
            positions=sorted({(cx+dx,cy+dy) for cx,cy in centres for dx,dy,_ in DIRECTIONS}-set(centres))
            for bits in range(1<<len(positions)):
                cells=set(centres)|{p for i,p in enumerate(positions) if bits&(1<<i)}
                masks=[sum(bit for dx,dy,bit in DIRECTIONS if (cx+dx,cy+dy) in cells) for cx,cy in centres]
                a,b=[terrain_coverage(mask) for mask in masks]
                edge_a=a[-1] if vertical else [row[-1] for row in a]
                edge_b=b[0] if vertical else [row[0] for row in b]
                self.assertEqual(edge_a,edge_b,(vertical,masks))


if __name__=='__main__':unittest.main()
