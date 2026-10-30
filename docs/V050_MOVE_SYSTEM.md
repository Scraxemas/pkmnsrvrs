# v0.5.0 — Move progression, fusions and animated combat

The Bulbasaur family has the approved **43 distinct moves**, including every ordinary upgrade stage and the four fusion outputs. The global registry contains **52 moves**: the existing 14 plus 38 new IDs. Charmander and Squirtle retain their existing combat catalogs; their obsolete signature ancestors are now excluded by the same lineage rules that govern the new family.

The deterministic 30 Hz simulation remains authoritative. Rendering uses interpolated positions, native Pokémon action frames, and a bounded shared-texture VFX pool. The campaign map, playable roster, stage implementation, existing item sprites and saved progress are preserved.

## Signature and optional progression

- Bulbasaur starts with **Vine Whip Rank 1**. Evolution at Level 16 transforms it into **Power Whip**, keeping its slot object, rank and invested cooldown progress. Venusaur retains Power Whip.
- Charmander keeps **Scratch → Metal Claw → Dragon Claw**, triggered by species evolution. The old moves cannot return through ordinary drafts, Poké Ball rewards or stale-card acceptance.
- Squirtle keeps **Tackle → Water Gun → Hydro Pump**. Earlier stages cannot occupy a second slot beside a descendant.

The six approved optional chains require **Rank 5 on the current stage** and the target stage's TM discoveries. They transform the same equipped slot, preserving rank, capped at 5:

| Chain | Stages | Discovery requirements |
| --- | --- | --- |
| Special Grass | Magical Leaf → Leaf Storm | SV TM033, then SV TM159 |
| Seed Artillery | Bullet Seed → Seed Bomb | SV TM056 for Bullet Seed; Seed Bomb needs no additional TM |
| Poison Offense | Acid Spray → Venoshock → Sludge Bomb | SV TM013, SV TM045, SV TM148 |
| Poison Status | Poison Powder → Toxic | Natural first stage, then SV TM175 |
| Lifesteal | Leech Seed → Mega Drain → Giga Drain | Natural first stage, Generation I TM21, then SV TM111 |
| Physical Impact | Tackle → Take Down → Body Slam | Natural first two stages, then SV TM066 |

`data/moveChains.ts`, `data/moveFusions.ts`, `data/moveUnlocks.ts` and `moveEligibility.ts` describe ancestry and acquisition independently of rendering. Family-scoped lineages support shared moves and future exceptions for independently learnable ancestors. The upgrade pool, availability checks, move-credit checks and acceptance path all use the same rules. Acceptance revalidates state; rejected stale choices regenerate the pool without consuming a recovered credit. A full or exhausted build still receives item/vitamin/recovery choices.

When an old build already contains a descendant, signature evolution keeps the furthest equipped stage, merges the highest rank, removes ancestor duplicates, and returns overlapping rank investment as move-choice credits. It preserves the starter's slot object and timing fields.

## Four fusions

Both ingredients must be equipped at **Rank 5**, satisfy their complete TM ancestry, and meet any species requirement. Fusion cards are rare choices. Outputs cannot be learned as ordinary new moves.

| Ingredients | Result | Type / class | Additional condition |
| --- | --- | --- | --- |
| Razor Leaf + Petal Dance | Petal Blizzard | Grass / Physical | Venusaur; no TM |
| Energy Ball + Sunny Day | Solar Beam | Grass / Special | SV TM119 and SV TM049; no extra Solar Beam TM |
| Toxic + Sludge Bomb | Sludge Wave | Poison / Special | Full Poison Powder/Toxic and Acid Spray/Venoshock/Sludge Bomb discovery paths |
| Synthesis + Grassy Terrain | Ingrain | Grass / Status | SV TM137 |

Acceptance removes the two inputs atomically, inserts one result at the first ingredient's position, inherits the higher ingredient rank capped at 5, and frees one slot. The result starts under the normal learned-move cooldown scheduler. `fusionHistory` and `moveHistory` are authoritative run state and participate in replay hashes. Fusion ancestry blocks both ingredients and their older stages while the result is equipped, and history prevents performing the same recipe twice in one run.

Solar Beam has a real charge/release and contributes timed sunlight to compatible attacks. Petal Blizzard is a Physical petal storm; Sludge Wave combines Special area damage with escalating toxic poison. Ingrain's roots follow the player and reform beneath it every second throughout the effect; they never immobilize the player. Grassy Terrain also refreshes its visual at its fixed zone. These passive pulses report no hits and cannot start attack animations.

## Complete approved catalog

This table is exported from the live TypeScript modules by `tools/export_v050_catalog.mjs`; the underlying structured record is [move-catalog.json](qa/v050/move-catalog.json). Every entry has five rank stages. A listed TM is the stage's own discovery; later progression and fusion checks also require preceding discoveries.

| Move ID / name | Type / category | Acquisition | Own TM | Form restriction |
| --- | --- | --- | --- | --- |
| vineWhip / Vine Whip | Grass / Physical | Bulbasaur starter | None | Family |
| powerWhip / Power Whip | Grass / Physical | Automatic Ivysaur evolution | None | Family |
| magicalLeaf / Magical Leaf | Grass / Special | TM discovery | SV TM033 | Family |
| leafStorm / Leaf Storm | Grass / Special | Magical Leaf Rank 5 transformation | SV TM159 | Family |
| bulletSeed / Bullet Seed | Grass / Physical | TM discovery | SV TM056 | Family |
| seedBomb / Seed Bomb | Grass / Physical | Bullet Seed Rank 5 transformation | None | Family |
| acidSpray / Acid Spray | Poison / Special | TM discovery | SV TM013 | Family |
| venoshock / Venoshock | Poison / Special | Acid Spray Rank 5 transformation | SV TM045 | Family |
| sludgeBomb / Sludge Bomb | Poison / Special | Venoshock Rank 5 transformation | SV TM148 | Family |
| poisonPowder / Poison Powder | Poison / Status | Natural | None | Family |
| toxic / Toxic | Poison / Status | Poison Powder Rank 5 transformation | SV TM175 | Family |
| leechSeed / Leech Seed | Grass / Status | Natural | None | Family |
| megaDrain / Mega Drain | Grass / Special | Leech Seed Rank 5 transformation | Generation I TM21 | Family |
| gigaDrain / Giga Drain | Grass / Special | Mega Drain Rank 5 transformation | SV TM111 | Family |
| tackle / Tackle | Normal / Physical | Natural | None | Family |
| takeDown / Take Down | Normal / Physical | Tackle Rank 5 transformation | None | Family |
| bodySlam / Body Slam | Normal / Physical | Take Down Rank 5 transformation | SV TM066 | Family |
| razorLeaf / Razor Leaf | Grass / Physical | Natural | None | Family |
| petalDance / Petal Dance | Grass / Special | Natural | None | venusaur |
| petalBlizzard / Petal Blizzard | Grass / Physical | Razor Leaf + Petal Dance fusion | None | venusaur |
| energyBall / Energy Ball | Grass / Special | TM discovery | SV TM119 | Family |
| sunnyDay / Sunny Day | Fire / Status | TM discovery | SV TM049 | Family |
| solarBeam / Solar Beam | Grass / Special | Energy Ball + Sunny Day fusion | None | Family |
| sludgeWave / Sludge Wave | Poison / Special | Toxic + Sludge Bomb fusion | None | Family |
| synthesis / Synthesis | Grass / Status | Natural | None | Family |
| grassyTerrain / Grassy Terrain | Grass / Status | TM discovery | SV TM137 | Family |
| ingrain / Ingrain | Grass / Status | Synthesis + Grassy Terrain fusion | None | Family |
| grassKnot / Grass Knot | Grass / Special | TM discovery | SV TM081 | Family |
| grassyGlide / Grassy Glide | Grass / Physical | TM discovery | SV TM194 | Family |
| trailblaze / Trailblaze | Grass / Physical | TM discovery | SV TM020 | Family |
| grassPledge / Grass Pledge | Grass / Special | TM discovery | SV TM146 | Family |
| frenzyPlant / Frenzy Plant | Grass / Special | TM discovery | SV TM155 | venusaur |
| poisonJab / Poison Jab | Poison / Physical | TM discovery | SV TM083 | venusaur |
| earthPower / Earth Power | Ground / Special | TM discovery | SV TM133 | venusaur |
| earthquake / Earthquake | Ground / Physical | TM discovery | SV TM149 | venusaur |
| growl / Growl | Normal / Status | Natural | None | Family |
| growth / Growth | Normal / Status | Natural | None | Family |
| sleepPowder / Sleep Powder | Grass / Status | Natural | None | Family |
| sweetScent / Sweet Scent | Normal / Status | Natural | None | Family |
| worrySeed / Worry Seed | Grass / Status | Natural | None | Family |
| protect / Protect | Normal / Status | TM discovery | SV TM007 | Family |
| swordsDance / Swords Dance | Normal / Status | TM discovery | SV TM088 | Family |
| helpingHand / Helping Hand | Normal / Status | TM discovery | SV TM130 | Family |

## Functional combat and balance

`moveCombat.ts` composes targeting patterns, statuses, support modifiers and persistent effects. Physical and Special moves use the appropriate attacking and defensive stats. The existing fixed-damage Dragon Rage identity is retained.

- **Grass offense:** Vine/Power Whip use widening line strikes; Magical Leaf uses homing presentation and target acquisition; Leaf Storm attacks a wide cyclone and imposes a brief Special recovery penalty. Bullet Seed distributes a burst of seed strikes; Seed Bomb explodes around a target. Energy Ball has a concentrated explosion. Grass Knot gains bounded damage against large enemies and roots targets. Grassy Glide and Trailblaze make collision-checked short advances; Trailblaze grants a timed speed benefit. Grass Pledge erupts at several target positions. Frenzy Plant is a rare Venusaur ultimate with charge, broad eruptions and a long cooldown.
- **Poison:** Acid Spray temporarily breaks defenses; Venoshock gains a substantial multiplier against poisoned targets. Sludge Bomb combines an explosion and poison synergy. Poison Powder leaves a persistent spore zone. Toxic replaces ordinary poison with escalating, expiring toxic damage; repeated applications refresh a single status rather than multiplying stacks.
- **Drain:** Leech Seed marks and drains enemies; Mega Drain and Giga Drain deal Special damage and return a capped portion of HP, with Giga Drain reaching more targets. Big Root and duration/sustained modifiers continue to work.
- **Physical/ground:** Tackle retains its close impact; Take Down adds an advance and modest nonlethal recoil; Body Slam uses a larger radial hit and slow. Earth Power creates focused Special eruption columns and a brief defense break. Earthquake uses a broad Physical radial shock.
- **Support:** Growl weakens incoming enemy damage; Growth increases both offensive classes; Sleep Powder stops ordinary enemies with short boss-resistant control and immunity windows. Sweet Scent exposes enemies to damage; Worry Seed weakens enemy offense and movement. Synthesis heals periodically; Protect gives a brief damage-reducing barrier; Sunny Day supplies timed sunlight. Swords Dance boosts Physical offense. Helping Hand provides a bounded solo offensive boost through a reusable buff function that can be applied to future ally states. Grassy Terrain heals only within its finite zone; Ingrain adds following recovery roots and defensive utility.

One buff per kind refreshes duration and maximum strength. Buff duration caps at 12 seconds; enemy statuses cap at 15 seconds and ten concurrent kinds. Boss/elite control has shorter duration and reapplication immunity. Offensive support factors cap at 2.1×. Defensive move buffs retain at least 25% incoming damage. Move healing uses a shared 20%-maximum-HP burst bucket replenished at 6% maximum HP per second, spends tokens only for actual missing HP, and never revives a defeated player. Other existing item/recovery systems retain their rules.

Runtime state is bounded to six move terrain zones, five pending charges, 24 affected enemies per broad activation, and the existing enemy projectile limits. The renderer does not decide damage. Direct/projectile moves apply authoritative damage at activation, consistent with the prior engine; projectile travel is presentation. Charged attacks defer damage until release, and charge events do not report premature hits or enemy hurt reactions. Passive poison/terrain/healing pulses cannot trigger new player attack animations.

## Permanent TM discovery and save compatibility

Twenty-four TMs have generation-aware stable IDs such as `sv:033` and `gen1:021`. Discovery is independent of current species eligibility. `discoverTm` and `discoverTmInSave` accept discovery sources for overworld, trainer, research, quest and stage rewards; no Pokémon-specific branch is needed in the persistence layer.

The Forest demonstration awards only two early discoveries: **25 Caterpie defeats → SV TM056 Bullet Seed** and **25 Weedle defeats → SV TM013 Acid Spray**. Research totals include previous runs. Crossing a threshold persists the discovery, updates the current run's unlock set, and presents a notification. The remaining advanced TMs are prepared for future rewards and can be exercised through development tools; they are deliberately not scattered through the Forest.

Save version 2 gains explicit `discoveredTms: []` and `tmDiscoveries: []` defaults. Both version-1 and version-2 saves migrate additively, retaining research, unlocked Pokémon/items/stages, best records, favorites, settings, completed stages and other existing fields. Existing TM identities are deduplicated, and discovery is idempotent. Run-only equipped moves and fusion history remain run state; the game still does not introduce a mid-run save/resume feature.

In a development build, `window.__POKEMON_MOVE_DEV__` exposes `unlockAllTms()`, `build(species, moves, rank)`, `equipMoves`, `activate`, `activateAllMoves`, `prepareFusion`, `showFusionCard`, and `fuse`. These allow deterministic testing without grinding. The module is dynamically imported only behind `import.meta.env.DEV`; ordinary production UI and bundles contain no such cheat controls.

## Native Pokémon action animation audit

The previous runtime sheets were reduced Walk layouts. The new importer reads genuine **Attack/Strike, Shoot/Charge and Hurt** sequences from [PMDCollab/SpriteCollab](https://github.com/PMDCollab/SpriteCollab), pinned at revision `42a63b0757b3d55ebca29b27e62cd444cd29047b`. It imports three action sheets for each of the nine playable forms, with eight facing rows, source frame durations, Rush/Hit/Return frame metadata, source/output hashes and ground anchors.

Native pixels are not generated, redrawn, recolored or resized. The importer crops transparent padding and translates visible source bounds onto common cells aligned to the per-frame white Shadow marker. This prevents adjacent-cell transparent padding from overwriting earlier poses—a defect caught by strict all-cell visibility validation during implementation. All 27 repaired sheets contain visible native poses in every played cell; no invented-body-motion or held-blank-frame substitute is needed for current forms.

`nativeAnimation.ts` registers direction-specific playback with the original 60 Hz duration units and explicitly sets nearest filtering once on each shared action texture. Actual activation events select Physical/Special actions, with signature moves taking priority. The controller prevents repeated attack restarts, lets hurt override attacks, gives evolution priority over normal actions and defeat highest priority, and resumes idle/walk naturally. Attacks do not disable movement. Source-ground normalization and texture-aware grass masks preserve grounding and occlusion across texture changes.

The full source XML, individual credits, upstream README/license and import audit are retained in [`assets/pmdcollab/actions`](../assets/pmdcollab/actions/IMPORT_NOTES.md). The upstream policy covers community submissions under CC BY-NC; individual records identify CHUNSOFT for original game frames. This records provenance and preserves rights-holder attribution; it does not claim separate commercial clearance for original Pokémon game sprites. Future species without action metadata have an explicit idle/walk fallback and must not be described as possessing native attack frames until imported.

## Original generated artwork and reusable VFX

The original 14 v0.4.3 move icons remain byte-for-byte unchanged. Built-in Codex ImageGen creates **38 additional original icons** in the same selected Classic Inventory direction, plus **19 separate four-frame combat atlases**. These are not repurposed UI icons: normal cells are 64×64; the Solar Beam component uses 128×64 cells. Dedicated Dragon Rage and Energy Ball atlases have distinct blue-violet and emerald orb designs, rather than sharing a recolored shield shape.

Combat components include slashes, vines, impact bursts, spinning leaves, seed artillery, poison clouds, draining energy, healing blooms, beams, roots, fire, water, auras, ground eruptions, fusion petals, toxic shockwaves, bubble rims and the two energy orbs. Explicit per-move VFX profiles define their motion, count, scale, duration, impact layers and timing. Related moves share appropriate components while differing in their composite forms and behavior.

`MoveVfxRenderer` shares textures and pools at most **192 sprites**, culls offscreen activations, bounds component counts, releases effects on expiry, destroys pools on scene shutdown, and uses static positions without orbit/spin motion plus reduced counts/duration under reduced motion. It replaces the large procedural attack Graphics function. Source animation/VFX clocks remain presentation-only and never change the simulation RNG or hit logic.

All generated sources use actual alpha. The Pillow pipeline reconstructs logical cells from already pixel-styled source art using palette clusters and coverage thresholds, with no smooth resampling. Icons are 32×32 RGBA with transparent margins and up to 12 colors; VFX cells use up to 24 colors and a common crop/anchor across their four stages. Enlargements use nearest-neighbor. Exact prompts, built-in tool metadata, source/output hashes and processing settings live in `assets/moves/v050-generation-manifest.json`; the tool does not expose an exact model ID. Large raw generations stay outside Git. Seventeen VFX jobs completed during an interrupted orchestration; their saved sources were recovered and visually matched to the original requested subjects before export.

The 52 runtime icon PNGs total **42,594 bytes**, the 19 VFX atlases **150,722 bytes**, and the 27 native action sheets **255,043 bytes**. Together these libraries occupy 448,359 bytes before HTTP compression; source-credit records and review media are separate from the runtime payload.

## Cards, HUD and visual review

The existing card sizes remain intact. Evolution cards show source/result icons and preserved rank. Fusion cards show both Rank-5 ingredients, a plus sign, the result, discovery/form conditions and explicit two-to-one slot behavior. Ingredient icons use native 32px and results use 64px integer scale. TM-locked cards never enter the selectable pool. The five-slot HUD updates after learning, ranking, transformation and fusion, shows freed slots and hover details, and remains independent of the four-item HUD. Timed support indicators explain active effects.

The [browsable review gallery](qa/v050/index.html) includes the complete icon library and animated combat component previews. Gameplay captures in `docs/qa/v050/` cover the obsolete-Scratch regression, all three starter families, native action playback, physical/Special attacks, poison/healing/ground effects, all four fusions, transition and mixed-item cards, dense waves and reduced motion at 1280×720 and 1920×1080. The legacy animation baseline is captured from the v0.4.3 renderer; it is not a reconstructed mockup.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | `pnpm run typecheck` passed |
| Full Vitest suite | **448 tests / 30 files passed**, no failures |
| Full Playwright suite | **99 passed**, zero failures, skips or flakes; two workers, no retries |
| Production build | `pnpm run build` passed |
| GitHub Pages subpath | `/pkmnsrvrs/`: **308 asset requests, zero failures** |
| Native frame integrity | **27 sheets / 1,592 visible cells**; all eight directions and all native texture filters checked |
| Runtime cleanup | VFX capped at 192; expiry pools sprites, scene shutdown clears sprites/masks/particles |
| Production development tools | Global API, scene API and cheat symbols absent; no page/console errors |
| Screenshot review | Cards, native attacks, all four fusions, support effects and 300-enemy combat reviewed at 720p and 1080p |

The retained legacy contracts remain covered. Fixtures that assumed Bulbasaur started with Tackle now use the required Vine Whip/Power Whip chain; original Tackle mechanics and Squirtle expectations remain explicit. Asset/card audits cover all 52 registered icons, and dedicated support/combat tests verify the expanded catalog rather than assuming every Status move damages an enemy.

The existing 400-enemy, ten-second simulation benchmark remains within its 5,000 ms test budget. The new 400-enemy, five-move dual deterministic replay measured **2,247.6 ms** in the final unit run. See [validation-summary.json](qa/v050/validation-summary.json), [full browser results](qa/v050/playwright-results.json) and [production audit](qa/v050/production-audit.json) for recorded evidence. The final browser/build checks include the separate font update made concurrently in this shared workspace.

The dense CPU rendering audit uses 400 enemy views, five Rank-5 moves and the full 192-sprite VFX budget in a paused, fixed simulation state. After 50 warmups per mode, 80 paired samples of five updates alternate effects-on/effects-off ordering. View/player-animation/VFX updates measured **0.82 ms median / 1.22 ms p95** with effects, compared with **0.72 ms / 1.30 ms** without active effects. The paired median increment was **0.12 ms**, and the authoritative state hash stayed unchanged. This measures the named CPU update methods on the test host; simulation, setup, GPU draws and compositor costs are excluded, so it is not an FPS guarantee. See [render-performance.json](qa/v050/render-performance.json) for raw samples and methodology.

The asset pipeline, native importer and capture helpers are retained under `tools/`. Capture scripts accept a running dev-server URL. Setting `V050_QA_WORKDIR` isolates frame/video/trace intermediates from other Playwright runs; the committed gallery contains only the resulting review artifacts. `python tools/process_v050_art.py --finalize` rebuilds the browsable gallery from those artifacts and the committed PNGs.

## Scope and practical limits

The complete new Charmander and Squirtle catalogs, additional stages, campaign changes and roster rebuilds are outside this update. Their existing moves still function through the shared engine and upgraded art renderer. Advanced TM reward locations beyond the two Forest research examples remain future content. Helping Hand's current usable effect is solo; full multiplayer networking/allies are not added. Direct projectile travel remains visual rather than a separate authoritative player-projectile simulation, while charge/release timing is authoritative. VFX use four generated keyframes per component with movement/layering between them; they are not claimed to be hand-authored frame-by-frame animation.
