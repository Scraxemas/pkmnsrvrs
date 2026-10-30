"""Normalize ORIGINAL generated pixel-art sources; never synthesize move artwork.

Requires Pillow. Source generations stay outside the repository. The committed
manifest records prompts, source hashes, output hashes and exact processing.
Run: python tools/process_move_icons.py --source-root <generated_images folder>
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / "docs/qa/v043"
MANIFEST = ROOT / "assets/moves/generation-manifest.json"
REPRESENTATIVES = ["scratch", "ember", "bubble", "razorLeaf", "metalClaw", "poisonPowder"]
PARAMETERS = {
    "canvas": [32, 32], "subject_max_extent": 26, "source_alpha_threshold": 192,
    "cell_coverage_threshold": 0.35, "opaque_colors": 12,
    "color_sampling": "modal quantized source color per logical pixel cell",
    "alpha": "binary, transparent RGB cleared", "presentation_resampling": "nearest",
}


def registry():
    result = subprocess.run(["node", str(ROOT / "tools/export_move_registry.mjs")],
                            cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def normalize(path: Path, style="A"):
    """Reconstruct a logical grid using hard coverage and modal color clusters.

    Input must already be generated pixel art. We don't blur or average an
    illustration. Palette clustering and a modal cell vote retain its blocks;
    thresholded cell coverage removes alpha fringes without black mattes.
    """
    src = Image.open(path).convert("RGBA")
    if src.getchannel("A").getextrema()[0] == 255:
        raise ValueError(f"Source has no transparent alpha: {path}")
    mask = src.getchannel("A").point(lambda a: 255 if a >= PARAMETERS["source_alpha_threshold"] else 0)
    bbox = mask.getbbox()
    if not bbox:
        raise ValueError(f"Empty source: {path}")
    src, mask = src.crop(bbox), mask.crop(bbox)
    width, height = src.size
    # Quantize only visible pixels, so transparent black never takes palette slots.
    visible = [rgb[:3] for rgb, a in zip(src.getdata(), mask.getdata()) if a]
    strip = Image.new("RGB", (len(visible), 1)); strip.putdata(visible)
    color_count, extent = {"A": (12, 26), "B": (20, 28), "C": (6, 24)}[style]
    palette = strip.quantize(colors=color_count, method=Image.Quantize.MEDIANCUT)
    quant = src.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE).convert("RGB")
    scale = extent / max(width, height)
    grid_w, grid_h = max(1, round(width * scale)), max(1, round(height * scale))
    out = Image.new("RGBA", (32, 32))
    left, top = (32-grid_w)//2, (32-grid_h)//2
    for y in range(grid_h):
        for x in range(grid_w):
            cell = (round(x*width/grid_w), round(y*height/grid_h),
                    round((x+1)*width/grid_w), round((y+1)*height/grid_h))
            cell_mask = list(mask.crop(cell).getdata())
            if sum(bool(a) for a in cell_mask) / len(cell_mask) < PARAMETERS["cell_coverage_threshold"]:
                continue
            colors = [rgb for rgb, a in zip(quant.crop(cell).getdata(), cell_mask) if a]
            rgb = Counter(colors).most_common(1)[0][0]
            out.putpixel((left+x, top+y), (*rgb, 255))
    return out


def font(size):
    for path in ["C:/Windows/Fonts/consola.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size=size)


def board(size, title, subtitle):
    out = Image.new("RGB", size, "#101820"); d = ImageDraw.Draw(out)
    d.text((24, 16), title, font=font(24), fill="#f1f5ed")
    d.text((24, 50), subtitle, font=font(13), fill="#b7c8bd")
    return out


def preview(out, icon, x, y, scale=1):
    size = 32 * scale
    d = ImageDraw.Draw(out)
    cell = 4 * scale
    for yy in range(0, size, cell):
        for xx in range(0, size, cell):
            d.rectangle((x+xx, y+yy, x+xx+cell-1, y+yy+cell-1), fill="#26323b" if (xx//cell+yy//cell)%2 else "#303e48")
    im = icon.convert("RGBA").resize((size, size), Image.Resampling.NEAREST)
    out.paste(im, (x,y), im)


def sheets(moves):
    reps = REPRESENTATIVES
    names = {m["id"]: m for m in moves}
    out = board((990, 1210), "Move icon style comparison", "Original AI generations / native 32px and 4x nearest / checkerboard indicates transparency")
    d = ImageDraw.Draw(out)
    titles = ["A / Classic inventory", "B / Fantasy abilities", "C / Minimalist pixels"]
    for col, title in enumerate(titles):
        d.text((col*330+24, 88), title, font=font(18), fill="#a9debb" if col==0 else "#d4dde3")
        for row, mid in enumerate(reps):
            y = 130 + row*176; x = col*330+24
            d.text((x, y), names[mid]["name"], font=font(16), fill="#f1f5ed")
            path = QA / "styles" / "ABC"[col] / f"{mid}.png"
            if path.exists():
                icon = Image.open(path)
                preview(out, icon, x+8, y+62, 1); preview(out, icon, x+100, y+27, 4)
    out.save(QA / "style-comparison.png")
    rows = math.ceil(len(moves)/4)
    out = board((1080, 90+rows*218), "Complete move icon library", "Style A / every registered move / 32px native + 4x nearest / original generated artwork")
    d = ImageDraw.Draw(out)
    for i, m in enumerate(moves):
        x, y = 24+(i%4)*270, 94+(i//4)*218
        d.text((x, y), m["name"], font=font(18), fill="#f1f5ed")
        d.text((x, y+25), m["type"], font=font(14), fill="#a9bfc8")
        path = ROOT / "public/assets/moves" / f"{m['id']}.png"
        if path.exists():
            icon=Image.open(path); preview(out,icon,x+8,y+92); preview(out,icon,x+88,y+56,4)
    out.save(QA / "all-move-icons.png")
    pairs = [("scratch","silk-scarf"),("ember","charcoal"),("bubble","mystic-water"),("razorLeaf","miracle-seed"),("metalClaw","metal-coat"),("poisonPowder","poison-barb")]
    out=board((900,800),"Moves beside existing held items", "Matching 32px canvases and 4x nearest / existing PokéSprite items retain their original pixels")
    d=ImageDraw.Draw(out)
    for i,(mid,item) in enumerate(pairs):
        x,y=24+(i%3)*300,100+(i//3)*342
        d.text((x,y),names[mid]["name"],font=font(17),fill="#f1f5ed")
        d.text((x,y+24),f"vs {item.replace('-',' ').title()}",font=font(14),fill="#b7c8bd")
        for k,path in enumerate([ROOT/"public/assets/moves"/f"{mid}.png",ROOT/"public/assets/pokesprite/items/hold-item"/f"{item}.png"]):
            if path.exists():
                icon=Image.open(path); preview(out,icon,x+k*142,y+67,4); preview(out,icon,x+48+k*142,y+225)
    out.save(QA/"move-item-comparison.png")


def gallery(moves):
    cards="".join(f'<article data-type="{m["type"]}"><h2>{m["name"]}</h2><p>{m["type"]} · {m["id"]}</p><div><img width="32" height="32" src="../../../public/assets/moves/{m["id"]}.png"><img width="128" height="128" src="../../../public/assets/moves/{m["id"]}.png"></div></article>' for m in moves)
    (QA/"index.html").write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>v0.4.3 move art review</title><style>body{background:#101820;color:#eef3ee;font:16px system-ui;margin:32px}a{color:#a9debb}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}article{background:#202c34;padding:20px;border-radius:8px}article div{display:flex;gap:32px;align-items:center}img{image-rendering:pixelated;background:repeating-conic-gradient(#303e48 0% 25%,#26323b 0% 50%) 0/16px 16px}h2{font-size:18px}p{color:#b7c8bd}nav{display:flex;flex-wrap:wrap;gap:20px;margin:24px 0}</style><h1>Move art / v0.4.3</h1><p>Original AI-generated pixel art. Style A selected. Native 32px and 4× nearest previews.</p><nav><a href="style-comparison.png">Three styles</a><a href="all-move-icons.png">Full sheet</a><a href="move-item-comparison.png">Moves + items</a><a href="upgrade-before-after.png">Before + after</a><a href="move-hud.png">Game HUD</a><a href="art-direction.md">Art direction and references</a></nav><main>'''+cards+'</main></html>',encoding="utf-8")


def main():
    parser=argparse.ArgumentParser();parser.add_argument("--source-root",type=Path)
    parser.add_argument("--allow-partial",action="store_true",help="Only for work-in-progress candidate review")
    parser.add_argument("--sheets-only",action="store_true",help="Rebuild review sheets from committed final PNGs")
    args=parser.parse_args(); data=json.loads(MANIFEST.read_text(encoding="utf-8"));moves=registry()
    if args.sheets_only:
        required=[ROOT/"public/assets/moves"/f"{m['id']}.png" for m in moves]
        required += [QA/"styles"/style/f"{mid}.png" for style in "ABC" for mid in REPRESENTATIVES]
        if any(not path.is_file() for path in required):raise ValueError("Cannot build complete gallery: required PNGs are missing")
        sheets(moves);gallery(moves);return
    if not args.source_root: parser.error("--source-root is required unless --sheets-only is used")
    valid={m["id"] for m in moves}; records=[]
    seen=[(e["style"],e["id"]) for e in data["generations"]]
    if len(seen)!=len(set(seen)):raise ValueError("Duplicate move/style entries")
    missing=valid-{e["id"] for e in data["generations"] if e["style"]=="A"}
    if missing and not args.allow_partial:raise ValueError(f"Missing generated production icons: {sorted(missing)}")
    missing_comparison={(style,mid) for style in "ABC" for mid in REPRESENTATIVES}-set(seen)
    if missing_comparison and not args.allow_partial:raise ValueError(f"Missing comparison candidates: {sorted(missing_comparison)}")
    for entry in data["generations"]:
        if entry["id"] not in valid: raise ValueError(f"Unknown move {entry['id']}")
        source=args.source_root/entry["sourceFile"]
        icon=normalize(source, entry["style"])
        target=QA/"styles"/entry["style"]/f"{entry['id']}.png"
        target.parent.mkdir(parents=True,exist_ok=True);icon.save(target,optimize=True)
        if entry["style"]=="A":
            target=ROOT/"public/assets/moves"/f"{entry['id']}.png"
            target.parent.mkdir(parents=True,exist_ok=True);icon.save(target,optimize=True)
        entry["sourceSha256"]=hashlib.sha256(source.read_bytes()).hexdigest()
        entry["outputSha256"]=hashlib.sha256(target.read_bytes()).hexdigest()
        entry["sourceSize"]=list(Image.open(source).size)
        entry["processingOverrides"]={"A": {"opaque_colors":12,"subject_max_extent":26}, "B": {"opaque_colors":20,"subject_max_extent":28}, "C": {"opaque_colors":6,"subject_max_extent":24}}[entry["style"]]
        colors=Counter(icon.getdata());visible=sum(n for rgba,n in colors.items() if rgba[3])
        records.append({"id":entry["id"],"style":entry["style"],"colors":sum(1 for rgba in colors if rgba[3]),"opaquePixels":visible,"bounds":icon.getbbox()})
    data["processing"]=PARAMETERS;data["moves"]=moves
    MANIFEST.write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    QA.mkdir(parents=True,exist_ok=True)
    (QA/"pixel-audit.json").write_text(json.dumps(records,indent=2)+"\n",encoding="utf-8")
    sheets(moves);gallery(moves)
    print(json.dumps({"processed":len(records),"runtimeIcons":len(list((ROOT/'public/assets/moves').glob('*.png'))),"processing":PARAMETERS}))


if __name__=="__main__":main()
