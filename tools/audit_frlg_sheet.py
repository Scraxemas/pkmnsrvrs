"""Create coordinate-labelled review pages for the supplied FRLG outdoor sheet.

The source is intentionally read from outside the repository. This lets us inspect
and map the user-supplied artwork without silently adding third-party art to git.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


TILE_SIZE = 16
ROWS_PER_PAGE = 32
SCALE = 4

CANDIDATES = {
    "grass": (1, 0, 2, 1),
    "dirt-3x3": (0, 26, 3, 29),
    "pond-3x3": (0, 52, 3, 55),
    "tree-a": (2, 1, 4, 5),
    "tree-b": (4, 1, 6, 5),
    "tree-c": (6, 1, 8, 5),
    "forest-tree": (0, 349, 3, 353),
    "forest-edge": (5, 349, 8, 353),
    "forest-gate": (0, 575, 4, 579),
    "shrubs": (4, 221, 8, 228),
}


def write_candidate_sheet(image: Image.Image, output: Path) -> None:
    cards: list[tuple[str, Image.Image]] = []
    for name, (left, top, right, bottom) in CANDIDATES.items():
        crop = image.crop((left * TILE_SIZE, top * TILE_SIZE, right * TILE_SIZE, bottom * TILE_SIZE))
        cards.append((name, crop.resize((crop.width * SCALE, crop.height * SCALE), Image.Resampling.NEAREST)))

    card_width = 300
    card_height = 360
    sheet = Image.new("RGBA", (card_width * 3, card_height * 3), "#182018")
    draw = ImageDraw.Draw(sheet)
    for index, (name, crop) in enumerate(cards):
        column = index % 3
        row = index // 3
        x = column * card_width
        y = row * card_height
        draw.text((x + 12, y + 10), f"{name} {CANDIDATES[name]}", fill="white")
        sheet.alpha_composite(crop, (x + (card_width - crop.width) // 2, y + 44))
    sheet.save(output / "candidate-metatiles.png")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    image = Image.open(args.source).convert("RGBA")
    if image.width % TILE_SIZE or image.height % TILE_SIZE:
        raise SystemExit(f"Sheet must align to {TILE_SIZE}px tiles, got {image.size}")

    columns = image.width // TILE_SIZE
    rows = image.height // TILE_SIZE
    args.output.mkdir(parents=True, exist_ok=True)

    write_candidate_sheet(image, args.output)

    for first_row in range(0, rows, ROWS_PER_PAGE):
        last_row = min(first_row + ROWS_PER_PAGE, rows)
        crop = image.crop((0, first_row * TILE_SIZE, image.width, last_row * TILE_SIZE))
        crop = crop.resize((crop.width * SCALE, crop.height * SCALE), Image.Resampling.NEAREST)

        margin_left = 92
        margin_top = 36
        page = Image.new("RGBA", (crop.width + margin_left, crop.height + margin_top), "#182018")
        page.alpha_composite(crop, (margin_left, margin_top))
        draw = ImageDraw.Draw(page)
        draw.text((8, 8), f"FRLG outdoors C | tile rows {first_row}-{last_row - 1}", fill="white")

        for column in range(columns + 1):
            x = margin_left + column * TILE_SIZE * SCALE
            draw.line((x, margin_top, x, page.height), fill=(255, 255, 255, 58), width=1)
            if column < columns:
                draw.text((x + 25, 18), str(column), fill="#ffe16b")

        for row in range(first_row, last_row + 1):
            y = margin_top + (row - first_row) * TILE_SIZE * SCALE
            draw.line((margin_left, y, page.width, y), fill=(255, 255, 255, 58), width=1)
            if row < last_row:
                draw.text((8, y + 25), str(row), fill="#9fe59f")

        page.save(args.output / f"rows-{first_row:03d}-{last_row - 1:03d}.png")

    print(f"source={args.source}")
    print(f"pixels={image.width}x{image.height}")
    print(f"tiles={columns}x{rows}")
    print(f"pages={(rows + ROWS_PER_PAGE - 1) // ROWS_PER_PAGE}")
    print(f"output={args.output}")


if __name__ == "__main__":
    main()
