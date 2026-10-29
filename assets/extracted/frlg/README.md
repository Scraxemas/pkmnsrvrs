# FRLG outdoor tiles and props

Source: the user-supplied Ozotwo FireRed/LeafGreen outdoor sheet, archived at `assets/source/frlg/outdoors-c.png`.

All **4,792 native 16x16 cells** (8 columns x 599 rows) are exported, including placeholders. Reassembling them reproduces every source pixel exactly. Open **index.html** for searchable previews.

- `tiles/terrain/`: source cells in identified terrain regions (grass, paths, water, cliffs, cave floors, etc.).
- `tiles/prop_parts/`: individual cells belonging to trees, buildings, fences, signs, rocks, and other objects. These are **parts**, not standalone props.
- `tiles/review/`: named by sheet section and exact row/column where an individual object boundary has not been verified. These labels deliberately do not invent an object identity.
- `tiles/blank/`: black/transparent source placeholders, retained for complete coverage.
- `props/`: reviewed, assembled, standalone trees, shrubs, rocks, flowers, tall grass, and signs. PNG names include actual native dimensions. Transparent margins protect their silhouettes.
- `parts/buildings/`: larger modular building samples. These are explicitly partial assemblies, not verified standalone buildings.
- `terrain/`: ready-to-use terrain, including 16x16 grass, a 32x32 grass metatile, and 48x48 dirt/pond samples.
- `manifest.json`: dimensions, type, classification status, source coordinates, composition, and content bounds.

Counts by kind: {"blank": 151, "prop": 10, "prop_parts": 652, "review": 2374, "terrain": 1624}.

No complete log has been verified in this source sheet. No tree/fence fragment is mislabeled as a log. This catalog contains source artwork and mechanical assemblies only, without AI-generated replacements.

Regenerate with `python tools/extract_frlg_tiles.py assets/source/frlg/outdoors-c.png`, then `python tools/extract_frlg_catalog.py`.
