# Graphics and movement integration

## Environment renderer

Viridian Forest uses reviewed FRLG PNGs in `public/assets/environment/viridian/frlg`, extracted from the user-supplied sheet archived in `assets/source/frlg/outdoors-c.png`. Native 16-pixel terrain is rendered at 2× scale on a 32-pixel grid. Paths and water use 256 adjacency frames assembled from the FRLG textures and palette, including concave corners and narrow connections. The previous generated atlas is retained as archival source and is not loaded by the playable stage.

Complete props have transparent margins and ground anchors. Opaque ground tiles stay below props, and streaming follows the camera bounds with extra space for canopy overhang. Decoration variants are selected from world coordinates rather than bucket order. Collision remains authoritative in `worldgen.ts`.

The full extraction library is in `assets/extracted/frlg`: all 4,792 native cells, complete props, terrain samples, source-coordinate metadata, and a searchable local HTML catalog. Raw prop parts and cells requiring semantic review are explicitly separated from verified standalone props. See `FULL_MAP_ASSET_PASS.md` for the audit and validation.

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

`renderProfiles.ts` stores each species' render scale, shadow dimensions, intentional elevation, and eight direction-specific ground anchors measured from its PMD walk sheet. The simulation coordinate is the ground-contact point; shadows remain at that coordinate while flying species can opt into visual elevation.

## Enemy navigation

The simulation builds one deterministic 32-pixel flow field toward the player's current cell and shares it across all enemies. It rebuilds only when the player changes cells. Nearby enemies with unobstructed sight pursue directly; blocked or distant enemies follow the field. Collision-safe wall sliding, deterministic perpendicular recovery, and nine-cell crowd separation prevent obstacle and crowd lockups without teleporting.

Debug mode (`?debug=1`) draws obstacle circles, actual velocity vectors, recovery markers, facing, navigation rebuild count, collision checks, and the deterministic state hash.
