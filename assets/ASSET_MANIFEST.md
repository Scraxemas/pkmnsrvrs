# Asset manifest

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

## Viridian environment atlas

- Source: project-owned original raster generated for Pokémon Survivors on 2026-10-29 with OpenAI image generation, then reviewed and processed locally.
- Master: `public/assets/environment/viridian/forest-atlas-source.png` (8 × 8 layout).
- Runtime exports: `public/assets/environment/viridian/*.png` (61 extracted cells plus two seamless 128 × 128 terrain fills).
- Extraction: `tools/extract_forest_atlas.py`; crops cells, applies nearest-neighbor scaling, and removes only border-connected magenta key pixels.
- Use: grass and forest-floor variants, dirt paths, trees, logs, flowers, pond/water details, and landmarks for the Viridian Forest renderer.
- Status: approved as the temporary project-owned environment, but **not FireRed/LeafGreen artwork**. The v0.3.2 audit found no approved FRLG tileset in this workspace, `D:\Projects`, or the source registry. Authentic FRLG replacement remains blocked on a user-supplied, documented, redistributable asset source; no ROM/decomp graphics will be imported as a substitute.
- Coordinate contact sheet: `docs/visuals/current-environment-atlas-coordinates.png` (labels are `column,row`).

Do not remove attribution or treat these assets as commercially cleared. Keep the asset source, revision, and approval state updated as the content pipeline expands.
