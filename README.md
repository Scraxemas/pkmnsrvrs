# Pokémon Survivors

Clean-slate browser vertical slice built with TypeScript, Phaser 3, Vite, pnpm, and Vitest.

## Run

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

Current slice: Bulbasaur, Charmander, and Squirtle content records; deterministic 30 Hz simulation; automatic moves; seeded spawning; XP/level progression; elite and boss encounters; eight-direction PMD animation; asset-rendered Viridian Forest terrain; shared flow-field navigation; and a playable WASD/arrow-key arena. Add `?debug=1` for collision, velocity, facing, and simulation diagnostics.

## FRLG asset library

The complete supplied tileset is extracted into [assets/extracted/frlg](assets/extracted/frlg/README.md). Open its `index.html` locally to browse all 4,792 native cells, complete props, and reusable terrain. Names include dimensions and source coordinates; unverified semantic identities are explicitly labeled for review. Complete assembled props are separated from raw prop parts.

Regenerate the runtime subset with `python tools/extract_frlg_tiles.py assets/source/frlg/outdoors-c.png`, then the complete library with `python tools/extract_frlg_catalog.py`. Both require Pillow. Run `python tools/test_map_assets.py` for lossless extraction, prop-margin, and terrain-seam verification.
