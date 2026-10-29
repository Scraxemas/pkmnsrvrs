"""Extract the approved runtime subset from the user-supplied FRLG outdoor sheet.

Coordinates are expressed in native 16 px tile cells. The source remains intact in
``assets/source/frlg`` while the small runtime exports live under ``public``.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image


TILE = 16


TILES: dict[str, tuple[int, int, int, int]] = {
    "grass": (1, 0, 1, 1),
    "grass_detail_a": (0, 1, 1, 1),
    "grass_detail_b": (0, 2, 1, 1),
    "grass_flowers": (1, 348, 1, 1),
    "grass_leaves": (4, 348, 1, 1),
    "tall_grass": (2, 1, 1, 1),
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
        if pixels[x,y][:3] not in grass_palette:
            continue
        pixels[x,y]=(0,0,0,0)
        stack.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--runtime", type=Path, default=Path("public/assets/environment/viridian/frlg"))
    parser.add_argument("--archive", type=Path, default=Path("assets/source/frlg/outdoors-c.png"))
    args = parser.parse_args()

    image = Image.open(args.source).convert("RGBA")
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
        if name in GRASS_KEYED_SPRITES:
            asset=clear_connected_grass(asset,grass_palette)
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
    print(f"Extracted {len(TILES) + len(TREE_PARTS)} runtime assets -> {args.runtime}")


if __name__ == "__main__":
    main()
