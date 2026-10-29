"""Extract the approved runtime subset from the user-supplied FRLG outdoor sheet.

Coordinates are expressed in native 16 px tile cells. The source remains intact in
``assets/source/frlg`` while the small runtime exports live under ``public``.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image, ImageOps


TILE = 16


TILES: dict[str, tuple[int, int, int, int]] = {
    "grass": (1, 0, 1, 1),
    "grass_detail_a": (0, 1, 1, 1),
    "grass_detail_b": (0, 2, 1, 1),
    "grass_flowers": (4, 0, 1, 1),
    "path_nw": (0, 26, 1, 1),
    "path_n": (1, 26, 1, 1),
    "path_ne": (2, 26, 1, 1),
    "path_w": (0, 27, 1, 1),
    "path_center": (1, 27, 1, 1),
    "path_e": (2, 27, 1, 1),
    "path_sw": (0, 28, 1, 1),
    "path_s": (1, 28, 1, 1),
    "path_se": (2, 28, 1, 1),
    "water_nw": (0, 52, 1, 1),
    "water_n": (1, 52, 1, 1),
    "water_ne": (2, 52, 1, 1),
    "water_w": (0, 53, 1, 1),
    "water": (1, 53, 1, 1),
    "water_e": (2, 53, 1, 1),
    "water_sw": (0, 54, 1, 1),
    "water_s": (1, 54, 1, 1),
    "water_se": (2, 54, 1, 1),
    "tree_edge": (5, 349, 3, 4),
    "forest_gate": (0, 575, 4, 4),
    "shrub_cluster": (4, 221, 4, 7),
}

GRASS_KEYED_SPRITES={"tree_edge","forest_gate","shrub_cluster"}

PROP_CROPS = {
    'bush': (5, 0, 1, 1),
    'sapling': (3, 2, 1, 3),
    'rock_small': (0, 34, 2, 2),
    'rock_medium': (3, 57, 2, 2),
}

# These are metatile parts, not rectangular sprites. The intervening rows are
# overlap variants for a continuous forest wall; including them repeats crowns
# and cuts off the tree. Assemble one cap, one crown, and one trunk instead.
TREE_PARTS = {
    "tree": ((32, 48), [((6, 1, 2, 1), (0, 0)), ((6, 3, 2, 2), (0, 16))]),
    "tree_cluster": ((48, 64), [
        ((1, 348, 1, 1), (16, 0)),
        ((0, 349, 3, 1), (0, 16)),
        ((0, 352, 3, 1), (0, 32)),
        ((3, 352, 3, 1), (0, 48)),
    ]),
}


def crop(image: Image.Image, spec: tuple[int, int, int, int]) -> Image.Image:
    x, y, width, height = spec
    return image.crop((x * TILE, y * TILE, (x + width) * TILE, (y + height) * TILE))


def clear_connected_grass(sprite: Image.Image, grass_palette: set[tuple[int, int, int]]) -> Image.Image:
    """Remove only grass-coloured pixels connected to the crop boundary."""
    result=sprite.copy()
    pixels=result.load()
    width,height=result.size
    stack=[(x,0) for x in range(width)]+[(x,height-1) for x in range(width)]+[(0,y) for y in range(height)]+[(width-1,y) for y in range(height)]
    visited:set[tuple[int,int]]=set()
    while stack:
        x,y=stack.pop()
        if (x,y) in visited or x<0 or y<0 or x>=width or y>=height:
            continue
        visited.add((x,y))
        if pixels[x,y][3] and pixels[x,y][:3] not in grass_palette:
            continue
        pixels[x,y]=(0,0,0,0)
        stack.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
    return result


def pad_sprite(sprite: Image.Image) -> Image.Image:
    bounds = sprite.getchannel('A').getbbox()
    if bounds is None:
        raise ValueError('Empty map prop')
    return ImageOps.expand(sprite.crop(bounds), border=2, fill=(0, 0, 0, 0))


def terrain_atlas(image: Image.Image, prefix: str) -> Image.Image:
    """Apply FRLG ground textures to seamless native-pixel adjacency masks."""
    atlas = Image.new('RGBA', (TILE * 16, TILE * 16))
    centre = crop(image, TILES['path_center' if prefix == 'path' else 'water'])
    ground = crop(image, TILES['grass'])
    from collections import Counter
    excluded = {p[:3] for tile in (centre, ground) for p in tile.getdata()}
    edge = crop(image, TILES[f'{prefix}_n'])
    rim = Counter(p for p in edge.getdata() if p[:3] not in excluded).most_common(1)[0][0]
    for mask in range(256):
        coverage = terrain_coverage(mask)
        tile = ground.copy()
        for y in range(TILE):
            for x in range(TILE):
                if not coverage[y][x]:
                    continue
                boundary = any(0 <= nx < TILE and 0 <= ny < TILE and not coverage[ny][nx]
                               for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
                tile.putpixel((x,y), rim if boundary else centre.getpixel((x,y)))
        atlas.alpha_composite(tile, ((mask % 16) * TILE, (mask // 16) * TILE))
    return atlas


def terrain_coverage(mask: int) -> list[list[bool]]:
    result = [[False] * TILE for _ in range(TILE)]
    for qx, qy, vertical, horizontal, diagonal in ((0,0,1,64,128),(1,0,1,4,2),(0,1,16,64,32),(1,1,16,4,8)):
        v, h = bool(mask & vertical), bool(mask & horizontal)
        for y in range(8):
            for x in range(8):
                dx, dy = (x if qx == 0 else 7-x), (y if qy == 0 else 7-y)
                if not v and not h:
                    filled = dx >= 2 and dy >= 2 and (dx >= 6 or dy >= 6 or (dx-5.5)**2+(dy-5.5)**2 <= 16)
                elif not v:
                    filled = dy >= 2
                elif not h:
                    filled = dx >= 2
                else:
                    filled = bool(mask & diagonal) or (dx+.5)**2+(dy+.5)**2 >= 4
                result[qy*8+y][qx*8+x] = filled
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--runtime", type=Path, default=Path("public/assets/environment/viridian/frlg"))
    parser.add_argument("--archive", type=Path, default=Path("assets/source/frlg/outdoors-c.png"))
    args = parser.parse_args()

    image = Image.open(args.source).convert("RGBA")
    # A single raw sRGB palette prevents ICC-tagged ground crops from changing
    # colour relative to assembled atlases and transparent props in browsers.
    image.info.clear()
    if image.size != (128, 9584):
        raise SystemExit(f"Unexpected source dimensions: {image.size}; expected 128x9584")

    args.runtime.mkdir(parents=True, exist_ok=True)
    args.archive.parent.mkdir(parents=True, exist_ok=True)
    if args.source.resolve()!=args.archive.resolve():
        shutil.copy2(args.source, args.archive)

    grass=crop(image,TILES["grass"])
    grass_pixels=grass.load()
    grass_palette={grass_pixels[x,y][:3] for y in range(grass.height) for x in range(grass.width)}
    for name, spec in TILES.items():
        asset=crop(image, spec)
        if name == 'grass_flowers':
            asset = pad_sprite(clear_connected_grass(asset, grass_palette))
        elif name in GRASS_KEYED_SPRITES:
            asset=clear_connected_grass(asset,grass_palette)
        asset.save(args.runtime / f"{name}.png")

    for name, spec in PROP_CROPS.items():
        prop = crop(image, spec)
        if name.startswith('rock'):
            # The samples sit in water. Keep the complete grey silhouette and
            # remove only the connected blue background.
            palette = {pixel[:3] for pixel in prop.getdata() if pixel[2] - pixel[0] > 48}
        else:
            palette = grass_palette
        pad_sprite(clear_connected_grass(prop, palette)).save(args.runtime / f'{name}.png')

    for prefix in ('path', 'water'):
        terrain_atlas(image, prefix).save(args.runtime / f'{prefix}_atlas.png')

    # The tuft in cell (2, 1) is only 12 pixels tall: the last four rows
    # belong to the tree underneath it on the source sheet. Keep the clean
    # foliage and centre it over matching ground instead of exporting the cap.
    tuft = crop(image, (2, 1, 1, 1)).crop((0, 0, TILE, 12))
    for name in ("tall_grass", "grass_leaves"):
        asset = grass.copy()
        asset.alpha_composite(tuft, (0, 2))
        asset.save(args.runtime / f"{name}.png")

    for name, (size, parts) in TREE_PARTS.items():
        tree = Image.new("RGBA", size)
        for spec, position in parts:
            tree.alpha_composite(crop(image, spec), position)
        tree = clear_connected_grass(tree, grass_palette)
        # Transparent padding keeps every silhouette inside its texture bounds.
        padded = Image.new("RGBA", (tree.width + 4, tree.height + 4))
        padded.alpha_composite(tree, (2, 2))
        padded.save(args.runtime / f"{name}.png")

    print(f"Archived {args.source} -> {args.archive}")
    print(f"Extracted {len(TILES) + len(TREE_PARTS) + len(PROP_CROPS) + 4} runtime assets -> {args.runtime}")


if __name__ == "__main__":
    main()
