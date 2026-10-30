# Asset manifest

## v0.3.10 evolution metadata

- Existing portrait PNGs, forest art, logo, sprites, and map art remain unchanged.
- Ancestry metadata comes from the pinned [PokeAPI species CSV](https://github.com/PokeAPI/pokeapi/blob/f38eb24b70f8462976154f534e79bf2bdd7af847/data/v2/csv/pokemon_species.csv).
  It supplies parent relationships only and creates no playable definitions or
  artwork. Single-stage, Legendary, and Mythical species receive no special
  exclusion rule; unavailable later-generation babies remain region-gated.
- Original CSV, revision/hash provenance, and upstream license are retained in
  `assets/data/pokeapi`. The generated runtime parent map is
  `src/data/evolutionParents.ts`; import script: `tools/import_evolution_families.py`.

## v0.3.9 character roster

- Roster tiles and large previews reuse the existing PMDCollab portrait PNGs.
  Bulbasaur, Charmander, and Squirtle are byte-identical to the prior release;
  no portrait, sprite, forest background, or logo was replaced or regenerated.
- Catalogue metadata references the 20 existing imported portrait species.
  Unknown National Dex slots use a code-authored question-mark panel and request
  no portrait. Broken portrait requests produce an explicit fallback and warning.
- UI frames, stat bars, favorite markers, and transitions are HTML/CSS. Their
  presentation does not grant playable unlocks or introduce new character art.

## v0.3.8 menu atmosphere and icons

- The existing forest background, location card, and custom logo remain the same
  byte-identical imports recorded in `menu-imports.json`.
- New main-menu icons are original 24-pixel code-authored SVG rectangles in
  `src/ui/pixelIcons.ts`; no external icon pack is used.
- Pixel leaves, pond ripple marks, and cached sun-shaft gradients are generated
  by the decorative TypeScript controllers. Foliage/water masks use native image
  coordinates and colors from the supplied JPG; small local texture offsets
  animate their interiors. The image framing, trunks, and pond banks stay fixed.
  These effects are presentation-only and never become gameplay terrain.

## v0.3.7 menu presentation

- User-supplied `viridian_forest_main_menu.jpg` and `FL_Viridian_Forest_card.png`
  are imported byte-for-byte under `public/assets/menu`. They serve as menu
  background and location-card artwork only.
- `assets/menu-imports.json` records original names, dimensions, roles, and hashes.
- User-supplied `logo.png` is preserved as `public/assets/menu/pokemon-survivors-logo.png`
  and replaces the main-menu text title. Its transparency and 202 × 100 aspect ratio are retained.
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
- Move and mastery illustrations are original Phaser drawing commands in `src/upgradeScene.ts`. Item and vitamin illustrations use the PokéSprite import below.
- These additions do not alter Pokémon sprite attribution or the supplied FRLG sheet's rights status.

## Retired generated Viridian atlas

- The project-owned generated atlas remains under `public/assets/environment/viridian` as archival material.
- It is no longer used for base grass, paths, water, or trees.
- Master: `public/assets/environment/viridian/forest-atlas-source.png`; extraction tool: `tools/extract_forest_atlas.py`.

Do not remove attribution or treat these assets as commercially cleared. Keep the asset source, revision, and approval state updated as the content pipeline expands.

## PokéSprite inventory import — v0.4.0

- Source: [msikma/pokesprite](https://github.com/msikma/pokesprite), pinned revision [`c5aaa610ff2acdf7fd8e2dccd181bca8be9fcb3e`](https://github.com/msikma/pokesprite/tree/c5aaa610ff2acdf7fd8e2dccd181bca8be9fcb3e).
- Runtime: `public/assets/pokesprite/`; 146 exact upstream PNGs, 82 logical asset mappings. Normal and available white-outlined versions retain their original transparent pixels and dimensions. No hotlinks, redrawing, background removal or recompression.
- Exact paths, dimensions and SHA-256 hashes: [`pokesprite/imports.json`](pokesprite/imports.json). Registry: `src/data/pokespriteAssets.ts`. Reproducible importer: `tools/import_pokesprite.py`; validates selected filenames against the pinned upstream Git tree before downloading.
- Categories: `items/hold-item`, `items-outline/hold-item`, `items/plate`, `items/exp-candy`, `items/medicine`, `items/berry`, `items/ball`, with available outlined counterparts; `misc/types/gen8` for all 18 type badges. The evolution Metal Coat and Old Amber in `items/evo-item` / `items/fossil` are reference entries for the content-pipeline asset audit, never offered as additional held items.
- Use: 40 held-item illustrations and four-slot HUD, six slotless vitamin icons, eight world consumables, five EXP Candy tiers, three ball rewards and type badges. Pokémon sprites and portraits continue to use the existing PMD sources.
- Upstream notices are archived without modification: [`pokesprite/license.md`](pokesprite/license.md), [`pokesprite/readme.md`](pokesprite/readme.md), [`pokesprite/contributors.md`](pokesprite/contributors.md).
- The upstream README assigns the programming code and other non-sprite content to its MIT license, and identifies the sprite images as © Nintendo/Creatures Inc./GAME FREAK Inc. The upstream author and contributor notices are retained in the archived README and contributors file. These PNGs are **not independently MIT-licensed artwork**. This fan-project import records provenance and attribution, without claiming commercial redistribution clearance.
