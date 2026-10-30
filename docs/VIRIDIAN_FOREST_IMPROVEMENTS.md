# Viridian Forest: layered grass, stable movement and streamed wilderness

Implemented directly in the existing Phaser/TypeScript game. The existing fixed 30 Hz combat loop, move system, nine starter forms, items, evolution, achievements and campaign atlas remain in use. No dependency or asset download was needed.

| System | Main files |
| --- | --- |
| Grass and world presentation | `src/main.ts`, `src/grassOcclusion.ts` |
| Collision intent and steering | `src/npcMovement.ts`, `src/simulation.ts`, `src/navigation.ts` |
| Terrain residency and generation | `src/worldgen.ts`, `src/forestWorld.ts`, `src/terrain.ts`, `src/worldConstants.ts` |
| Objective bearings and encounter lifecycle | `src/forestObjectives.ts`, `src/main.ts`, `src/simulation.ts` |
| Save compatibility and earned partners | `src/save.ts`, `src/content.ts`, `src/ui/characterRoster.ts`, `src/moveProgression.ts` |
| Infinite-coordinate render layers | `src/main.ts`, `src/pickupRenderer.ts`, `src/moveVfx.ts` |
| Acceptance checks | `tests/forestStreaming.test.ts`, `tests/npcMovement.test.ts`, `tests/forestUnlocks.test.ts`, `e2e/forestStreaming.spec.ts` |

## Grass

The old `applyGrassOcclusion` attached a geometry mask to each Pokémon and removed the lower fifth of its visible body. That mask and the `grassBodyCrop` helper are gone. Pokémon frames, textures and alpha are unchanged by grass.

Complete foreground leaf artwork is rendered at 58% opacity. Two thin strips of the original blades remain opaque. Ground foliage sits behind actors; foreground foliage and actors use ground-Y sorting. Existing contact impulses bend and part the foliage for moving players and ground NPCs, then settle. Particles remain capped at 72. Native textures retain nearest-neighbour sampling.

Separate terrain, world and effects Layers also prevent negative world coordinates from placing actors under terrain, or large positive Y coordinates from placing trees over the HUD. Pickups and move VFX participate in the world layer.

## Collision root cause and correction

Previously, every failed movement step immediately tried both perpendicular directions. Any sideways progress reset the blocked timer, allowing the next frame to try the blocked heading again. A timer also flipped the avoidance side, while crowd separation changed facing based on its corrective velocity. These competing responses produced alternating movement and animation directions.

`npcMovement.ts` now keeps desired velocity separate from accepted motion. Collision checks sweep movement in steps of at most six world units. Axis sliding follows the committed heading. A blocked NPC keeps facing its intent and waits approximately 0.75 seconds before choosing a clear tangent. It commits to that detour for 1.15 seconds, with a matching retry cooldown. It does not bounce backward or flip avoidance sides every frame.

NPC steering/line-of-sight decisions are cached for approximately 0.2–0.29 seconds. Crowd separation uses elapsed-time scaling, a spatial hash and collision checks, and cannot change facing. The shared flow field is bounded to the local combat area, supports negative origins and refreshes at most four times a second for target movement. A successful recovery from a coarse blocked navigation cell now correctly reports a usable route.

## World generation

- Generation chunks default to **64×64 tiles** at 32 world units per tile. Configuration supports 16–128 tiles, in multiples of 16.
- A **3×3 grid** follows the player's chunk. Collision reads only resident terrain and never generate new chunks.
- An **18-chunk LRU cache** bounds generated data. One likely upcoming chunk is prewarmed every 175 ms, with cache replacement prioritising nearby chunks.
- Camera rendering uses independent **16×16-tile pages**, including prop overhang. It does not instantiate all terrain in the nine generation chunks.
- Signed chunk coordinates and world-seed hashes determine terrain, templates, variation, props and shared path ports. The old 8192×8192 dimensions describe the authored footprint; they no longer impose wilderness or camera boundaries.
- Eight reusable environmental arrangements cover groves, sunlit meadows, reedy ponds, bug thickets, mossy outcrops, narrow woodland, combat glades and camps. Rotation, mirroring, regional selection and local variation reduce repetition. They place grouped groves, grass patches, logs, rocks, flowers and natural obstacles.
- Every chunk has four matching path ports connected to its local network. The original authored-scale clearing/trail/pond/cliff/camp plan remains the central forest. Authored trail segments crossing a chunk are clipped and connected even when none of their control points lie inside it.
- Entrance, major clearings, Pikachu Hollow, Beedrill Nest, the ancient tree and the route toward Pewter have deterministic authored positions. Objective bearings remain visible during exploration.

`syncWorldChunks`, `chunkAtWorld`, `prewarmWorldChunk`, `setWorldTerrain`, `removeWorldDecoration`, `markWorldDiscovery` and `serializeWorldChanges` form the backend integration API. Sparse terrain edits, stable prop removals and discoveries survive cache eviction; exported changes can be supplied to `generateMap` for restoration. Ordinary exploration does not add per-visited-chunk persistence entries. Important forest discoveries also save to the existing save's `discoveredLocations` field.

## Encounters and progression

Ordinary waves keep the same survival timer and phase budgets across boundaries. Spawning samples resident, collision-free locations around the player; an exhausted search skips the spawn instead of inserting the enemy into its final failed candidate. Distant ordinary actors, XP and consumables retire when generation chunks change. Important balls remain until collected. Pikachu and the boss remain available when their terrain unloads, with their AI suspended outside resident chunks.

Pikachu now appears once per run at its protected hollow. It was previously only a roster/art entry. At the existing survival time limit, the finale transfers the player into the protected **600×600 Beedrill arena**, with a short fade. The HUD describes this timed finale. This preserves a timed boss encounter even after long-distance exploration.

Defeating Beedrill now saves the Weedle partner and `pewterGym` unlock, retaining the existing Mt. Moon unlock. Older version 1/2 saves with a recorded forest victory or Beedrill defeat gain these missing rewards additively. Weedle can be selected through the existing roster and evolves to Kakuna at level 7 and Beedrill at level 10, preserving move ranks and opening 3/4/5 move slots.

## Validation

The latest full unit run passed **521 tests in 35 files**; `pnpm build` and `git diff --check` also passed. A 400-enemy, ten-second simulation benchmark took about 1.02 seconds in that run, within the existing five-second test budget.

**63 distinct selected browser checks passed across focused runs.** The final isolated rerun passed all ten checks, including every earlier reload-interrupted case and the complete all-direction native attack regression. The entire browser suite was not rerun. Machine-readable results are in [validation.json](qa/viridian-forest/validation.json).

Focused browser checks can use `.forest-playwright.config.ts`, which disables development hot reload and writes its trace output to `test-results/forest-final`. This prevents source/QA-file updates in a shared workspace from navigating away during animation recording.

- Vitest covers all existing gameplay systems plus swept NPC motion at 20/30/60/144 Hz, collision waiting/cooldowns, blocked-cell recovery, negative-origin navigation, bounded residency, shared ports, walking across old world edges, deterministic revisits after eviction, persistent edits/removals, safe failed spawning, Pikachu retention and protected boss arenas across 20 seeds.
- Forest geography validation runs across 100 seeds, checking resident connectivity, clearings, collision, asset classes and unique terrain. Additional review sampled 200 wilderness chunks across 100 seeds without disconnected path pixels.
- Browser tests inspect actual lower-body pixels for player and NPC in all eight directions, grass bending/settling, keyboard movement across negative chunk seams, camera/layer ordering at ±50,000 units, continued waves, Pikachu discovery, and a real automatic-attack Beedrill victory with saved unlocks.
- Existing browser checkpoints were adapted from fixed-world indices to global tile origins and bounded generation residency; visual render pages are deliberately distinct from generation chunks.

Saved visual evidence: [player and NPC grass transparency](qa/viridian-forest/grass-translucent-player-npc.png), [Pikachu Hollow](qa/viridian-forest/forest-pikachu-hollow.png), [the protected boss clearing](qa/viridian-forest/forest-beedrill-arena.png), and [exploration at negative world coordinates](qa/viridian-forest/forest-stream--24--50000.png).

## Limits

The game still implements Viridian as its only playable campaign stage. **Brock's Gym is unlocked in progression but remains the existing Coming Soon preview**; no gym combat is supplied by this codebase. The new Weedle family reuses the existing Tackle/Poison Powder moves and walking attack presentation; it has no dedicated new Bug move assets or native attack sheets.

The shared streaming structures and configuration can serve future maps, but the other 26 locations do not yet have biome generators or playable stages. Forest generation still uses its forest feature plan.

Terrain generation is synchronous, with bounded work and prewarming. Measured prewarmed crossings were typically below a millisecond in local unit checks; initial nine-chunk generation measured roughly 41 ms median in an independent sample. Cold teleports and slower devices can cost more. No guarantee of pause-free performance on all hardware or arbitrarily large floating-point coordinates is made.

An NPC in a difficult concave pocket may remain stationary rather than solve a full path around it. This is intentional; avoidance is lightweight rather than per-enemy A*. The existing live run does not resume after a browser restart: terrain-change export/restore is tested, but a full run-resume save format is not introduced.
