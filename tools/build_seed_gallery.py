"""Contact sheet from actual Playwright-managed Chromium environment captures."""
from pathlib import Path
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
shots=ROOT/'test-results/screenshots'
seeds=[1,7,42,1337,2026,12345,24680,90210,500123,876543]
output=Image.new('RGB',(2000,508),'#102018')
draw=ImageDraw.Draw(output)
for i,seed in enumerate(seeds):
    with Image.open(shots/f'v036-seed-{seed}.png') as source:
        image=source.convert('RGB').resize((400,225),Image.Resampling.NEAREST)
    x,y=(i%5)*400,(i//5)*254
    draw.text((x+10,y+7),f'VIRIDIAN FOREST  |  SEED {seed}',fill='#ffe1a0')
    output.paste(image,(x,y+26))
path=shots/'v036-ten-seed-gallery.png'
output.save(path)
print(path)

# Preserve an actual pre-v0.3.6 capture when available, alongside the two new
# browser captures. Never synthesize a supposed historical screenshot.
before=shots/'v036-baseline-rocks.png'
if not before.exists():before=ROOT/'docs/qa/v036/baseline-rocks.png'
if before.exists():
    comparison=Image.new('RGB',(1440,302),'#102018')
    labels=[('BEFORE 86f00d6: aquatic rocks on grass',before),
            ('AFTER: dry FRLG rocks on grass',shots/'v036-feature-landRock.png'),
            ('AFTER: water rocks restricted to ponds',shots/'v036-feature-waterRock.png')]
    pen=ImageDraw.Draw(comparison)
    for i,(label,source) in enumerate(labels):
        pen.text((i*480+8,10),label,fill='#ffe1a0')
        with Image.open(source) as capture:
            comparison.paste(capture.convert('RGB').resize((480,270),Image.Resampling.NEAREST),(i*480,32))
    destination=shots/'v036-rock-classification-before-after.png'
    comparison.save(destination)
    print(destination)
