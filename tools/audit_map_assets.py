"""Review every runtime map export and its source coordinates at native scale."""

import argparse
import re
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT / 'test-results/map-audit')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    registry = (ROOT / 'src/environmentAssets.ts').read_text().split('} as const')[0]
    names = sorted(set(re.findall(r":'([^']+)'", registry)))
    width, height = 240, 200
    contact = Image.new('RGBA', (width * 6, height * ((len(names) + 5) // 6)), '#72c9a6')
    draw = ImageDraw.Draw(contact)
    for i, name in enumerate(names):
        image = Image.open(ROOT / 'public/assets/environment/viridian' / f'{name}.png').convert('RGBA')
        scale = min(4, 184 / image.width, 156 / image.height)
        image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.NEAREST)
        x, y = (i % 6) * width, (i // 6) * height
        draw.text((x + 8, y + 8), name, fill='#102019')
        draw.rectangle((x + 26, y + 34, x + 214, y + 192), outline='#294a39')
        contact.alpha_composite(image, (x + (width - image.width) // 2, y + 36 + (156 - image.height) // 2))
    contact.save(args.output / 'runtime-contact.png')

    source = Image.open(ROOT / 'assets/source/frlg/outdoors-c.png').convert('RGBA')
    page_height = 256
    count = (source.height + page_height - 1) // page_height
    overview = Image.new('RGBA', (6 * 256, ((count + 5) // 6) * 544), '#182018')
    draw = ImageDraw.Draw(overview)
    for i in range(count):
        x, y = (i % 6) * 256, (i // 6) * 544
        page = source.crop((0, i * page_height, 128, min(source.height, (i + 1) * page_height)))
        draw.text((x + 4, y + 4), f'tile rows {i * 16}-{i * 16 + 15}', fill='white')
        overview.alpha_composite(page.resize((256, page.height * 2), Image.Resampling.NEAREST), (x, y + 24))
    overview.save(args.output / 'source-overview.png')
    print(f'Reviewed {len(names)} runtime textures; contact sheets: {args.output}')


if __name__ == '__main__':
    main()
