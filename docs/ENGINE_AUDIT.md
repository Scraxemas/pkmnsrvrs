# Pokémon Survivors v0.3 engineering audit

## Critical findings fixed

- PMD animation sheets were rendered as single images. Species-specific frame metadata and Phaser spritesheets now select real frames.
- Vite recursively watched the very large external SpriteCollab checkout, causing the launcher to accept connections without responding. External registries are now excluded.
- Runs reused scene-owned maps and completion flags. Run initialization now resets view caches and transient progression.
- The original arena had no authoritative obstacle collision or camera-following world. Deterministic maps, collision, safe spawn zones, bounds, and camera tracking are integrated.
- Enemy ranged attacks and boss phases were absent. Projectiles have deterministic velocity, collision, damage, TTL cleanup, and bounded rendering. Beedrill has three HP-gated shot patterns and a phase-three summon.

## High-severity findings improved

- Enemy overlap used no separation. A cell-based spatial pass separates nearby enemies and counts collision work.
- Enemy spawning ignored terrain. Spawn attempts now use stage zones and reject solid terrain and unsafe proximity.
- Save updates occurred once per defeat during an early v0.3 pass. Events are now batched and flushed at run completion.
- Rendering had no depth convention. Terrain, shadows, entities, effects, and fixed UI now use explicit layers and y-sorting.
- No browser automation existed. Playwright-managed Chromium now captures deterministic UI/gameplay checkpoints.

## Remaining risks

- `src/main.ts` and `src/simulation.ts` remain larger than desired. Rendering scenes, combat resolution, AI, and progression should be split after behavior stabilizes.
- Player attacks remain instant authoritative effects represented by VFX rather than persistent simulated projectile entities.
- Beedrill phases are functional but still need richer telegraphs and arena-specific behavior.
- Map collision uses circles against decorative obstacles; polygonal and tile collision are not yet implemented.
- No mid-run save/resume is provided.
