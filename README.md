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

Double-click `Launch Pokemon Survivors.bat` on Windows to select an available
local port and open the browser. New runs receive fresh seeds. Add `?seed=12345`
to replay a specific forest, or combine it with `?debug=1&seed=12345`. Upgrade cards
support clicking, 1/2/3, arrow focus, and Enter. The top blue bar displays EXP;
damaged Pokémon show a small overhead HP bar that hides after full healing.

See [the v0.3.6 world and UI report](docs/V036_WORLD_AND_UI.md) for the ten-seed
gallery, asset classification, campsite/cliff features, and browser validation.

The [v0.3.7 menu redesign](docs/V037_MENU_REDESIGN.md) uses the supplied Viridian
Forest background and location artwork. Menu controls support mouse, keyboard,
and controller. Settings save reduced motion, damage numbers, and screen shake;
fullscreen reports the browser's actual state. Audio and later Kanto stages are
clearly labeled as future content.

The latest [v0.3.8 title screen](docs/V038_CENTERED_MENU.md) centers the logo and
arcade controls over an animated forest. Play opens Single Player / Multiplayer
mode selection; multiplayer is explicitly unavailable. Personal bests and saved
totals are in Research → Statistics. The report includes actual animation footage.

## FRLG asset library

The complete supplied tileset is extracted into [assets/extracted/frlg](assets/extracted/frlg/README.md). Open its `index.html` locally to browse all 4,792 native cells, complete props, and reusable terrain. Names include dimensions and source coordinates; unverified semantic identities are explicitly labeled for review. Complete assembled props are separated from raw prop parts.

Regenerate the runtime subset with `python tools/extract_frlg_tiles.py assets/source/frlg/outdoors-c.png`, then the complete library with `python tools/extract_frlg_catalog.py`. Both require Pillow. Run `python tools/test_map_assets.py` for lossless extraction, prop-margin, and terrain-seam verification.
