# Full map asset and extraction pass

## Map repairs

- Removed every legacy generated-atlas crop from the runtime asset registry. Those crops contained pieces of adjacent rows, especially on rocks, logs, stumps, flowers, and reeds.
- Replaced broken log/stump dressing with complete FRLG shrubs and small trees. Rocks now use complete FRLG rock silhouettes. No unverified fallback artwork is silently selected.
- Replaced the repeating flower ground crop, which clipped petals at cell edges, with a complete red flower cluster.
- Normalized colour metadata so standalone props, ground crops, and assembled atlases share the same raw source palette.
- Rebuilt path/pond transitions from FRLG fill textures and palette using native-pixel adjacency masks. All 256 frames preserve both sides of junctions, isolated cells, narrow paths, and missing diagonals. Every possible shared horizontal and vertical edge is checked for matching coverage.
- Preserved ground/prop layer separation, integer prop scales, transparent silhouette margins, and stable coordinate-based variants.
- Streaming uses camera bounds plus horizontal/vertical overhang, including crowns of trees rooted below the view. It also works when the camera moves independently of the player.
- All generated decorations have world-edge clearance. The browser survey visits all 256 chunks, checks active assets and prop bounds, and captures each motif and all map corners.

## Complete extraction library

`assets/extracted/frlg` contains all 4,792 source cells (8 × 599) at their native 16×16 size. Every PNG is named by category/section and exact source row/column. Reading the exports back and rebuilding the entire source image reproduces every source pixel exactly.

The library separates:

- raw terrain tiles;
- raw prop/building parts;
- black/transparent placeholders;
- cells with section-level labels requiring semantic review;
- 10 reviewed, standalone props, including trees, shrubs, rocks, flowers, grass, and signs;
- two larger building samples, explicitly labeled as modular parts rather than whole buildings;
- ready-to-use terrain, including native 16×16 grass, a composed 32×32 grass tile, and native 48×48 dirt and pond panels.

`manifest.json` records source hash, coordinates, dimensions, classification status, and complete-prop composition. `index.html` provides local search, kind/group filters, native-pixel previews, and direct PNG links without a server or network access.

Semantic status is explicit: 2,374 raw cells have section-level labels rather than invented individual object names. The complete tuft at (2, 203) is now identified separately. Raw fragments are never presented as complete props. No complete log has been verified in this supplied sheet.

## Verification

- TypeScript and production build pass.
- 97 unit tests pass, including camera/overhang coverage at every chunk at multiple zoom levels.
- 3 Python asset checks pass: source reconstruction, complete-prop margins, and exhaustive shared-edge terrain coverage.
- 7 browser tests cover gameplay, all 256 map chunks, motif/corner screenshots, and local catalog browsing.

Visual evidence is generated under `test-results/screenshots/map-pass-*.png` and `frlg-catalog-props.png`.
