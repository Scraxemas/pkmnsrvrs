# v0.3.6 implementation status

Latest pass: functional animated upgrade cards with queued levels and mastery,
incremental EXP HUD, auto-hiding overhead HP, disabled entity shadows, fresh normal
run seeds and explicit replay seeds, globally planned trails/clearings, regional
groves and grass, flowers, pond reeds, separate land/water rocks, tiled collidable
cliffs, and rare campsites. See [the v0.3.6 report](V036_WORLD_AND_UI.md) for source
coordinates, behavior, browser captures, and validation limits.

Verified as functional: deterministic 30 Hz simulation with interpolated presentation, measured per-frame PMD grounding, prioritized animation presentation state, 10 moves, 9 playable starter forms across 3 families, 8 enemy species, data-driven encounter phases, ranged telegraphs and projectile budgets, 8 held items, 6 vitamins, 5 masteries, Level 1–100 progression, starter evolution, three reward tiers, streamed Viridian Forest chunks, ten regional composition motifs, three-phase Beedrill logic, save-v2 migration, Pokédex/Research foundations, 18-type chart, debug diagnostics, and Chromium E2E navigation/travel coverage.

Designed but not playable: Mt. Moon, S.S. Anne, and eleven later Kanto stages. Their registry entries are honest future content.

Not implemented: national catalog import, official move import, 24 playable families, Clefable encounter, complete Mt. Moon gameplay, S.S. Anne gameplay, persistent player-attack projectiles, full achievement reward UI, Pokédex search/filtering, audio, and mid-run resume. The current PMD imports provide walk sheets only, so attack/hit/evolution presentation states intentionally retain the directional walk/idle artwork while preventing state interruption; dedicated animation sheets remain a future asset-pipeline task.
