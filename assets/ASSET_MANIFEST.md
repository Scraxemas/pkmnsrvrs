# Asset manifest

## v0.3.7 menu presentation

- User-supplied `viridian_forest_main_menu.jpg` and `FL_Viridian_Forest_card.png`
  are imported byte-for-byte under `public/assets/menu`. They serve as menu
  background and location-card artwork only.
- `assets/menu-imports.json` records original names, dimensions, roles, and hashes.
- Attribution/licensing beyond the user's supplied files was not provided. The
  import does not assert new redistribution rights.
- Local pixel typography: Google Fonts Silkscreen Regular/Bold, with original
  SIL Open Font License retained at `src/ui/fonts/OFL-Silkscreen.txt`.

## Pokémon sprites and portraits

- Source: [PMD Sprite Repository](https://sprites.pmdcollab.org/), mirrored from [PMDCollab/SpriteCollab](https://github.com/PMDCollab/SpriteCollab)
- License/policy: the repository documents CC BY-NC 4.0 for submitted community material and requires appropriate credit; review individual `credits.txt` records before redistribution.
- Imported runtime records: Bulbasaur, Ivysaur, Venusaur, Charmander, Charmeleon, Charizard, Squirtle, Wartortle, Blastoise, Caterpie, Metapod, Butterfree, Weedle, Kakuna, Beedrill, Pidgey, Pidgeotto, Pikachu, Oddish, and Bellsprout.
- Imported files: `public/assets/pmdcollab/sprites/*`, `public/assets/pmdcollab/portraits/*`.
- Upstream paths: `sprite/{dex}/Walk-Anim.png`, `portrait/{dex}/Normal.png`.

## Map source registry

- Source: [pokemon-asset-master](https://github.com/Scraxemas/pokemon-asset-master)
- Local checkout: `assets/external/pokemon-asset-master-repo`
- Use: map-building source registry, upstream revisions, tooling, and license boundaries. The repository intentionally does not vendor ROM-derived artwork.
- Current stage: the registry supplies map-authoring provenance and license boundaries. Its public checkout contains no redistributable Nintendo map artwork, so no ROM/decomp graphics are copied into this project.

## FireRed/LeafGreen outdoor environment sheet

- User-supplied source: `pokemon_tileset_fire_red_leaf_green_outdoors_c_by_ozotwo_d7dmotm.png` (128 × 9584, 8 × 599 native 16 px cells).
- Archived source: `assets/source/frlg/outdoors-c.png`.
- Filename attribution: `ozotwo`; the original DeviantArt page and its usage terms could not be independently recovered during this import.
- Runtime exports: `public/assets/environment/viridian/frlg/*.png`.
- Extraction: `tools/extract_frlg_tiles.py`; crops exact native cells and clears only border-connected pixels from the known grass palette on object sprites.
- Audit: `tools/audit_frlg_sheet.py`; emits coordinate-labelled pages and a candidate-metatile sheet under `test-results/frlg-sheet-audit`.
- Current use: 2× integer-scaled grass, detail cells, nine-piece dirt paths, nine-piece pond shoreline/water, single trees, tree clusters, and the ancient-tree landmark.
- v0.3.6: complete dry boulders from native cells `(0,13,3,3)`, a whole-formation small variant, and a nine-piece cliff atlas. Aquatic gray rock crops are restricted to pond terrain. Source selection and transparent grass removal are reproducible in `extract_frlg_tiles.py`; the source sheet remains unchanged.
- Rights status: imported at the project owner's direction for this fan project. Pokémon and the FireRed/LeafGreen artwork remain property of their respective rights holders. This manifest records provenance; it does not claim a commercial redistribution license.

## Original campsite and flower pixel artwork

- Project-authored SVG source: `public/assets/environment/viridian/original`.
- Tents, camp logs, supplies, reeds, and white/yellow/pink flowers use original code-authored pixel shapes and transparent backgrounds, rasterized by Phaser's SVG loader.
- Flower source generator: `tools/make_forest_variants.py`. Runtime contact-sheet rendering: `tools/render_svg_assets.mjs` through Chromium.
- Upgrade illustrations are original Phaser drawing commands in `src/upgradeScene.ts`.
- These additions do not alter Pokémon sprite attribution or the supplied FRLG sheet's rights status.

## Retired generated Viridian atlas

- The project-owned generated atlas remains under `public/assets/environment/viridian` as archival material.
- It is no longer used for base grass, paths, water, or trees.
- Master: `public/assets/environment/viridian/forest-atlas-source.png`; extraction tool: `tools/extract_forest_atlas.py`.

Do not remove attribution or treat these assets as commercially cleared. Keep the asset source, revision, and approval state updated as the content pipeline expands.
