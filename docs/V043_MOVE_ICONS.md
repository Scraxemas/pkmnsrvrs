# v0.4.3 — Generated pixel-art move icons

Every current move now has an original AI-generated 32×32 transparent PNG. One registry supplies the level-up cards, five-slot HUD, and move-transformation notices. This is an art and presentation pass: no move definitions, simulation formulas, evolution rules, item behavior, unlocks, stages, or Pokémon sprites changed.

## Artwork and provenance

The live `MOVES` module was evaluated through Vite SSR and contains 14 moves. Eighteen individual built-in ImageGen calls compared six representative moves in three styles. **Style A — Classic Pokémon Inventory** was chosen after inspecting native and 4× previews beside existing PokéSprite items. Eight additional individual generations completed the library, for 26 generated images total. No separate API/CLI image jobs or paid assets were used. The built-in tool did not expose an exact model identifier.

Final runtime files live in [`public/assets/moves/`](../public/assets/moves/), preserving exact move-ID case. Together the 14 PNGs occupy **10,208 bytes**. Large generation sources stay outside Git. The [generation manifest](../assets/moves/generation-manifest.json) records every exact prompt, tool metadata, source/output hashes, dimensions, and reconstruction parameters. [Asset notes](../assets/moves/README.md) explain reproduction; the [art-direction report](qa/v043/art-direction.md) documents reference links, permission handling, the local Generation 9 archive review, and the style decision. No unlicensed external preview sheets or archive assets entered the repository.

| Move | Individually reviewed exported design |
| --- | --- |
| Tackle | Cream impact burst with a clear forward collision |
| Scratch | Three separated white claw cuts |
| Vine Whip | Green hooked vine with a long curving silhouette |
| Poison Powder | Separated violet spore puffs and small scattered spores |
| Leech Seed | Amber seed, green sprout, and curling draining tendrils |
| Ember | Small orange fireball with a short spark trail |
| Dragon Rage | Blue-violet orb with a pointed energy crown |
| Metal Claw | Solid silver talons and reflective steel base |
| Dragon Claw | Crossing violet energy cuts |
| Razor Leaf | Three sharp leaves with visible spacing and motion |
| Hydro Pump | Broad water column with a heavy splash crown |
| Water Gun | Thin water jet with a small tip splash |
| Bubble | Three blue bubble rims with open transparent centers |
| Rapid Spin | Segmented ochre shell with pale circular trails |

[`tools/process_move_icons.py`](../tools/process_move_icons.py) uses Pillow to reconstruct logical cells from already pixel-styled sources using modal palette-cluster color and coverage thresholds. It does not blur or average a smooth illustration. Final icons use 8–12 opaque colors, binary alpha with cleared transparent RGB, and a maximum 26-pixel subject extent on the 32×32 canvas. The exports were individually reviewed in the [complete icon sheet](qa/v043/all-move-icons.png). Enlargements use nearest-neighbor only. The [pixel audit](qa/v043/pixel-audit.json) records actual bounds, color counts and coverage.

## Integration

- [`src/moveAssets.ts`](../src/moveAssets.ts): deterministic registry, base-path-aware URLs, preload, and one development warning per missing move texture.
- [`src/ui/pixelArt.ts`](../src/ui/pixelArt.ts): shared proportional fitting and nearest filtering for moves and held items.
- [`src/upgrades.ts`](../src/upgrades.ts) and [`src/upgradeScene.ts`](../src/upgradeScene.ts): move-ID metadata and centered 64px PNG card art. Existing text, badges, ranks, controls and animations remain in place. The procedural renderer remains only as the missing-move-art fallback and for existing non-move illustrations.
- [`src/ui/moveHud.ts`](../src/ui/moveHud.ts): native 32px icons in all equipped slots; slot-ID changes immediately select the evolved move texture.
- [`src/main.ts`](../src/main.ts): preloads move art and displays before/after move icons in transformation notices. No progression state is replaced or reset.
- [`src/ui/menuData.ts`](../src/ui/menuData.ts): displayed version becomes v0.4.3. README links the report and gallery.

The asset pipeline uses [`tools/export_move_registry.mjs`](../tools/export_move_registry.mjs) to evaluate actual TypeScript data rather than relying on formatting-sensitive parsing. Adding a move to `MOVES` automatically adds its deterministic registry path, and validation fails until its final PNG and generation metadata exist.

## Review artifacts

- [Browsable local gallery](qa/v043/index.html)
- [Three-style comparison](qa/v043/style-comparison.png), all six subjects at native and 4× size
- [All 14 moves](qa/v043/all-move-icons.png), names, types, native and 4× previews
- [Before/after upgrade cards](qa/v043/upgrade-before-after.png)
- [Actual move HUD](qa/v043/move-hud.png)
- [Moves beside existing items](qa/v043/move-item-comparison.png)
- [Real move evolution notification](qa/v043/evolution-icons.png), with matching evolved species and preserved Rank 4

The new effects are brighter and can occupy more of the canvas than small existing items such as Charcoal. The matching canvas/display scale does not imply identical apparent mass. Bubble transparency is expressed by open centers and highlights; all final pixels use binary alpha. These are generated and reconstructed sprites, not claimed hand-authored pixel art.

## Validation

`pnpm typecheck`, all **284 Vitest tests in 26 files**, and `pnpm build` pass. The build retains the existing large JavaScript chunk warning.

The 17 new asset tests decode the actual PNG bytes (CRC, inflate and scanline filters), check exact current move coverage and case-sensitive filenames, 32×32 RGBA format, binary transparency, transparent margins/RGB, palette limits, unique images, corrupt/truncated-file rejection, and generation/output hashes. Existing simulation, deterministic replay, rank/evolution, item, candy and forest tests pass.

All **82 distinct Playwright checks pass**: 73 baseline checks, the rebuilt production GitHub Pages subpath retry, and all eight new artwork checks. The original production attempt correctly failed while PNG generation was incomplete; its rebuilt retry passes. The missing-texture fixture was corrected to rename a registry key instead of destroying a texture still used by the GPU; runtime code did not change.

Browser checks cover every card texture, shared 64px proportional fitting, native 32px HUD art, nearest filtering, five-slot text alignment, unchanged item textures, controlled missing-art fallback, and immediate Scratch → Metal Claw → Dragon Claw switching while preserving the same rank/cooldown slot object. Real level-triggered evolutions show the matching evolved species, portrait, notification, and preserved Rank 4. Actual upgrade, mixed-item, and HUD screenshots were inspected at **1280×720 and 1920×1080**. Both the local-file and Vite galleries load all 28 previews and six review links without breakage. The [validation record](qa/v043/validation.json) retains the commands, run distinction, artifact dimensions/hashes, and visual-audit evidence.
