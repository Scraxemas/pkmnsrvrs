# Move icon art direction — v0.4.3

Research date: 2026-10-30. This is an art and presentation pass; move identities, progression, combat parameters, and existing item sprites are preserved.

## Reference review

| Reference | Observation and intended influence | Use and permission handling |
| --- | --- | --- |
| [PokéSprite](https://github.com/msikma/pokesprite), [inventory overview](https://msikma.github.io/pokesprite/overview/inventory.html) | Inventory assets are 32×32. Existing Charcoal and Mystic Water sprites demonstrate compact silhouettes, dark contour pixels, small highlight clusters, and transparent margins. This is the primary scale and finish reference. | Existing repository assets only. Preserve `assets/pokesprite/license.md` and upstream notices; the repository publishes an MIT license. No additional Pokémon artwork imported. |
| [Franuka RPG Icon Pack](https://franuka.itch.io/rpg-icon-pack) | Public previews use simple, readable silhouettes and restrained clusters. The pack uses 16×16 originals with larger upscales. Adopt the economy of shape, without reducing final icons to a coarse 16×16 design. | Paid pack not downloaded. [Free demo terms](https://franuka.itch.io/rpg-icon-pack-demo) permit project use and edits but prohibit redistribution of the pack as supplied; attribution is appreciated. No demo or preview sheets stored in this repository. |
| [HammerStrike RPG Skill Icons](https://hammerstrike.itch.io/rpg-skill-icons-set) | Public previews show 32×32 elemental and weapon skills with directional bursts, slashes, and distinct attack compositions. Adopt the clear direction of force and differentiation between related attacks. | A demo is offered, but the public page does not state an explicit redistribution license. No pack or demo files downloaded or included. |
| [jfranciPX Pixel Art Ability Icons](https://jfranci-px.itch.io/pixel-art-ability-icons) | Public previews show strong diagonal strokes, arcs, and elemental palette families. The page lists individual PNGs, sheets, and transparent variants. Adopt distinct silhouettes within each element, with fewer particles for inventory compatibility. | Paid pack not downloaded; no public redistribution license found on the product page. No preview sheets included. |

These are references for general pixel-art principles, not source images to trace, recolor, extract, or reproduce. Review artifacts contain original generated move art and the project's existing item art.

## Local Generation 9 pack

`C:\Users\Scraxis\Downloads\Generation 9 Pack v3.3.8.rar` was present and inspected with `tar`. Its changelog identifies version 3.3.8. Relevant entries include `Graphics/UI/Battle/icon_statuses.png`, `Graphics/UI/statuses.png`, summary ball icons, `Graphics/Battle animations/Arceus_Plate.png`, and ball/open animation sheets. It does not provide a dedicated move ability icon collection in those directories.

The status labels and Beast Ball animation sheet were visually reviewed. They reinforce crisp clusters, limited color ramps, and isolation between animation cells, but are not suitable replacements for move icons. `Credits.txt` lists the compilation's contributors and credits Caruban and WolfPP for ball artwork. Credits are not treated as blanket redistribution permission. Four selected reference PNGs were extracted only to `C:\Users\Scraxis\.codex\reference-reviews\pkmnsrvrs-v043`, outside the repository; none are used by the game or committed comparison sheets.

## Generation and selection

Three original directions are compared with Scratch, Ember, Bubble, Razor Leaf, Metal Claw, and Poison Powder at native size and 4× nearest-neighbor scale:

| Direction | Target | Observed result |
| --- | --- | --- |
| A — Classic Pokémon Inventory | GBA-era 32×32, limited palette, clean contour, restrained highlights | Isolated leaves, bubbles, and spores retain readable spacing and shaded volume. Best overall fit. |
| B — Detailed Fantasy Abilities | Richer shading, particles, dramatic elemental effects | Attractive at 4×, but denser leaf motion, finer spores, and fuller claw shading compete at native size. |
| C — Minimalist Pixel Icons | Few colors, minimal shading, strong silhouettes | Clean outlines and clear basic shapes; flatter fire, water rims, and spores have less inventory-style depth. |

The exported [three-style sheet](style-comparison.png) and [move/item sheet](move-item-comparison.png) were visually inspected at native and enlarged scale. The following is a qualitative art review, not a measured recognition study:

| Criterion | A | B | C |
| --- | --- | --- | --- |
| Compatibility with existing items | Closest: stepped shading and compact contour treatment sit well beside Silk Scarf and Metal Coat. | More luminous and busy than the quieter inventory sprites. | Clear but flatter than most shaded items. |
| Native 32×32 recognition | Six subjects read clearly; leaf and spore groups remain separated. | Basic subjects read, but small particles and leaf trails merge more readily. | Strong basic recognition, with reduced material and volume cues. |
| Consistency across types | Comparable outline weight, highlight size, spacing, and visual weight across physical and elemental subjects. | Richer palettes remain coherent, with more variation in particle density. | Restrained palettes are coherent; claw detail and flat effects differ in density. |
| Distinction between related moves | Scratch reads as free white cuts; Metal Claw reads as solid reflective talons. Separate composition, not color alone, provides identity. | Claw silhouettes remain distinct, though added detail contributes little at native scale. | Distinct basic silhouettes, but fewer shading cues are available for a larger library. |
| Authentic pixel placement | Hard square clusters, stepped edges, controlled highlights, and useful negative space after reconstruction. | Also crisp; fine leaf trails and spores introduce more isolated pixels. | Crisp and economical, with simpler clusters and less depth. |
| Suitability for hundreds of moves | Best balance of repeatable palette rules, distinct silhouettes, and room for material cues. | Higher detail density would need stricter pruning as the library grows. | Easy to extend, but visually similar move families would need stronger shape differentiation. |

**Selected: Style A.** It balances small-size readability and shaded volume while leaving the card to supply its own background. The choice agrees with the requested default preference on visual evidence, particularly Razor Leaf's separated leaves and Poison Powder's distinct spore clusters. The final library uses this common direction and preserves move-specific forms.

The comparison also shows a practical limit: new effects are brighter and often occupy more of their 32×32 canvas than small existing items such as Charcoal or Mystic Water. Matching canvas and display sizes therefore does not imply identical apparent mass. Bubble's open centers and sharp rim highlights suggest transparency; the export itself uses binary alpha, not partial-opacity pixels. These generated and reconstructed assets are crisp pixel art, but are not claimed to be individually hand-authored sprites or exact stylistic replicas of the existing items.

The style comparison used 18 individual calls to Codex's built-in `image_gen.imagegen`, one per move/style candidate. The underlying model identifier was not exposed. Full prompts, source/output hashes, tool metadata, and processing settings are recorded in `assets/moves/generation-manifest.json`; no separate paid API or CLI generation was used. Large original generations remain under `CODEX_HOME`; only the small final PNGs and review artifacts enter the repository.

## Production rules

Use one original design per current `MOVES` entry. Distinguish Scratch's white slashes from Metal Claw's reflective solid talons and Dragon Claw's violet energy; distinguish Water Gun's narrow stream from Hydro Pump's broad forceful jet. Give Vine Whip a curving vine and Razor Leaf separate cutting leaves. Keep Ember orange and Dragon Rage blue-violet.

Final exports are 32×32 RGBA PNGs with transparent margins, centered subjects, a shared contour treatment, and restrained palettes. Normalize generated pixel clusters with nearest-neighbor sampling, palette reduction, and alpha cleanup; inspect every native grid and enlarged preview. Runtime assets live only in `public/assets/moves/`; prompts, processing parameters, provenance, and review sheets live outside that folder. Generated source images remain outside the repository to avoid committing large intermediates.

`tools/process_move_icons.py` reconstructs logical pixel cells from already pixel-styled generated sources using modal color votes, rather than blurring or averaging a smooth illustration. It thresholds source alpha at 192, accepts cells at 35% visible coverage, clears transparent RGB, and centers the result. Style A uses at most 12 opaque colors and a maximum subject extent of 26 pixels; comparison B uses 20/28 and C uses 6/24. Presentation enlargement uses nearest-neighbor only. The registry comes from `tools/export_move_registry.mjs`, which reads the actual `MOVES` module through Vite SSR; filenames and coverage follow the live move IDs rather than an assumed fixed list.
