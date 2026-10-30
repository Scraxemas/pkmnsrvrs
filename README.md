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

The [v0.3.8 title screen](docs/V038_CENTERED_MENU.md) centers the logo and
arcade controls over a forest with local leaf sway, pond ripples, and sun shafts.
The camera stays fixed. Play opens Single Player / Multiplayer
mode selection; multiplayer is explicitly unavailable. Personal bests and saved
totals are in Research → Statistics. The report includes actual animation footage.

The [v0.3.9 character roster](docs/V039_CHARACTER_ROSTER.md) replaces the
large partner cards with a scrollable portrait grid and selected-partner panel.
Original PMD portraits, actual level-one stats and starting moves, discovery and
unlock states, sorting, filters, and saved favorites are supported. One Select
button continues to Stage Selection. Only the three existing starters are
playable; other catalogue slots do not grant new characters.

The [v0.3.10 corrections](docs/V0310_CHARACTER_CORRECTIONS.md) restrict
Character Selection to registered base forms, remove roster numbers, and keep
the complete portrait/move/stat summary visible without right-panel scrolling.
Hover no longer changes selection. The separate Pokédex retains the numbered
151-species grid, evolved discoveries, and family information. Saves and artwork
are preserved; the same three starters remain playable.

The [v0.4.0 item and candy overhaul](docs/V040_ITEMS_AND_CANDIES.md) adds
40 functional held items, actual local PokéSprite artwork, four item HUD slots,
slotless consumables, and five EXP Candy sizes with smooth homing. Every Pokémon
attracts nearby candy from 64 units; Magnet increases that to 289 at Rank 5.
Zap Plate supplies Electric damage, and Lucky Egg supplies bonus EXP. Cards show
the exact shared effect formulas. See the report for balance, provenance and QA.

The [v0.4.1 progression and upgrade polish](docs/V041_MOVE_PROGRESSION.md)
unlocks 3 → 4 → 5 move slots through evolution, preserves starter-move ranks through
the three evolution chains, and guarantees an existing-build improvement in the
draft whenever one is available. Selection now pauses the whole gameplay scene;
280 × 394 cards sit over a lighter overlay. The HUD shows locked future slots,
and world consumables use smaller sprites. Held items remain limited to four.

The latest [v0.4.2 Kanto adventure atlas](docs/V042_CAMPAIGN_ATLAS.md) replaces
the stage grid with a left-to-right 20-stop journey and seven vertical side trails.
Drag, wheel, keyboard and controller navigation keep the selected destination in
view beside its information panel. Future locations remain previews; Viridian
Forest is the only playable stage. Legacy progress and starter selection remain
compatible, and the production build is tested under a repository subpath.

The [Stage Art follow-up](docs/STAGE_ART.md) adds the supplied location artwork to
all 27 map cards and detail panels, with lazy loading and original-file provenance.

## FRLG asset library

The complete supplied tileset is extracted into [assets/extracted/frlg](assets/extracted/frlg/README.md). Open its `index.html` locally to browse all 4,792 native cells, complete props, and reusable terrain. Names include dimensions and source coordinates; unverified semantic identities are explicitly labeled for review. Complete assembled props are separated from raw prop parts.

Regenerate the runtime subset with `python tools/extract_frlg_tiles.py assets/source/frlg/outdoors-c.png`, then the complete library with `python tools/extract_frlg_catalog.py`. Both require Pillow. Run `python tools/test_map_assets.py` for lossless extraction, prop-margin, and terrain-seam verification.
