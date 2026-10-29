# Graphics and movement integration

## Environment renderer

Viridian Forest renders from individual PNG assets in `public/assets/environment/viridian`. The world seed selects ground and tree variants deterministically. World-generation records remain semantic (`tree`, `log`, `pond`, and landmarks), while `GameScene` resolves those records to runtime textures. Collision remains authoritative in `worldgen.ts`; the graphics do not define gameplay bounds.

The `pokemon-asset-master` checkout is used as the source/provenance registry. Its own policy states that public decompilations do not grant redistribution rights for Nintendo graphics, so the playable stage uses a project-owned original atlas instead of ROM-derived map art.

## PMD sprite directions

PMD walk sheets contain eight rows in this order:

1. south
2. southeast
3. east
4. northeast
5. north
6. northwest
7. west
8. southwest

`direction.ts` is the single source of truth for this mapping. Facing is calculated from actual post-collision velocity. An idle actor stops on the first frame of its last facing row; no direction is synthesized with horizontal mirroring.

## Enemy navigation

The simulation builds one deterministic 32-pixel flow field toward the player's current cell and shares it across all enemies. It rebuilds only when the player changes cells. Nearby enemies with unobstructed sight pursue directly; blocked or distant enemies follow the field. Collision-safe wall sliding, deterministic perpendicular recovery, and nine-cell crowd separation prevent obstacle and crowd lockups without teleporting.

Debug mode (`?debug=1`) draws obstacle circles, actual velocity vectors, recovery markers, facing, navigation rebuild count, collision checks, and the deterministic state hash.
