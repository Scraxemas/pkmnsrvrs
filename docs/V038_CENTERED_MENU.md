# v0.3.8 — centered arcade menu and living forest

The title screen now contains the existing custom logo, Play, a side-by-side
Pokédex/Research row, Settings, and a small version label. The old milestone copy,
tagline, location preview, button descriptions, and statistics panel are removed.
Gold, blue, green, and slate controls use stepped corners, cream trim, hard
dimensional shading, and original matching 24-pixel icons.

Play opens an animated mode picker inside the same scene. The logo and background
keep their positions and the background controller continues running. Single
Player enters the existing partner → stage → run flow. Multiplayer is disabled
and labeled Coming Soon; its future four-player target is isolated in
`PLAY_MODES`. There is no lobby or networking implementation. Back, Escape, and
controller B close the picker and restore Play focus.

Viridian Forest artwork and reusable location cards remain on Stage Selection,
with Kanto/Survival/30 minutes/Beedrill metadata and real completion/unlock states.
Unavailable stages remain unavailable. Personal bests and saved totals now live
in Research's functional Statistics view; Challenges remain available in the
other tab. No progress values are invented or replaced.

## Animation implementation

`MenuBackgroundController` is owned and updated by the Phaser menu scene. A
separate viewport Canvas 2D surface draws the original image and atmospheric
layers behind the DOM controls. This keeps ultrawide rendering independent of
the gameplay canvas's 1280 × 720 scaling. The source JPG, logo PNG, and location
PNG are unchanged.

- `menuBackgroundMath.ts`: fixed cover framing at all resolutions. There is no
  camera pan, zoom, overscan animation, or parallax. Motion and reduced-motion
  modes use exactly the same image bounds.
- `menuFoliageController.ts`: gentle wind moves leaf textures by at most two
  native pixels inside four canopy/shrub regions. Green-pixel masks exclude
  woody branches; erosion and feathering protect edges and avoid rectangle seams.
  Trunks, paths, rocks, and the overall forest silhouette stay fixed.
- `menuWaterController.ts`: reflection flow, three staggered expanding pixel
  ripple rings, and small glints remain inside the pond. The native water-color
  mask and hand-placed shoreline polygon keep its banks stationary.
- `menuAmbientParticles.ts`: an independent decorative RNG, at most ten small
  pixel leaves, gently curved trajectories, natural fading, and seven faint
  illuminated motes. It never reads or advances the simulation RNG.
- `menuLightingController.ts`: three cached soft sun shafts fall through the
  canopy opening into the existing clearing. Their brightness varies slowly;
  foliage and water render above them to keep the effects attached to the scene.
- `menuBackgroundController.ts`: Phaser delta time, explicit pause/resume,
  document visibility, resize handling, reduced motion,
  inputs, diagnostics, and deterministic resource cleanup on scene shutdown.

The original whole-image drift was removed following visual feedback. Motion is
now confined to the environmental details above. Nearest-neighbor sampling keeps
the pixel illustration crisp. Masks and reusable buffers are built once from the
supplied image; no replacement artwork or extra animation loop is needed.

Reduced motion displays the original still image, hides leaves/motes, disables
foliage, water, and light effects,
and removes entrance motion while preserving focus indicators. System preference
changes are handled while the menu is open. Repeated scene navigation releases
the decorative canvases, pixel/lighting buffers, observers, and event listeners.
The canvas does not intercept pointer input. This animates leaf surfaces within
the flat illustration; it does not bend or move entire tree trunks.

## Navigation repairs and files

- `menuScenes.ts`: centered title layout, mode routing, and Research tabs.
- `ui/titleMenu.css`, `arcadeButton.ts`, `pixelIcons.ts`: arcade presentation,
  responsive sizing, and code-authored icons.
- `ui/menuInput.ts`: spatial navigation now prefers controls whose perpendicular
  extents overlap. Down from Play reaches the two-button row; Right moves between
  Pokédex and Research instead of jumping diagonally to Settings.
- `ui/runResultsScene.ts`: the existing run results now use a stationary UI scene.
  Return to Menu is clickable regardless of the gameplay camera's scroll. Enter
  and Escape also return. Gameplay simulation and result persistence are unchanged.
- `e2e/helpers/menu.ts`: shared menu readiness and Single Player navigation.
  Game-canvas selectors explicitly target `#app canvas` to exclude the decorative
  canvas during browser checks.

## Actual browser evidence

![Centered menu at 1280 × 720](qa/v038/main-1280.png)

![Play mode picker](qa/v038/play-modes.png)

[2560 × 1440 menu](qa/v038/main-2560.png) ·
[3440 × 1440 menu](qa/v038/main-ultrawide.png) ·
[Stage Selection](qa/v038/stage-selection.png)

**[18-second local forest animation recording](qa/v038/menu-ambience.webm)**

The reviewed VP9 clip removes browser startup from the Playwright-managed Chromium
capture. Sampled beginning/middle/end frames were inspected for sharpness, scene
alignment, leaf density, lighting, and exposed edges. The camera and UI stay
stationary. [Frame diagnostics](qa/v038/animation-diagnostics.json) record 20
samples with identical background bounds throughout the capture.

An actual canvas-pixel comparison at native resolution verifies changing canopy,
water, and ray pixels while sampled trunks, rocks, and path have zero changed
pixels. Reduced motion matches the source image pixel-for-pixel.
[Pixel results](qa/v038/local-pixels.json) retain the measured counts.

The raw recording and additional screenshots (focus states, Pokédex, Research,
Settings, and reduced motion) remain under `test-results/screenshots/v038-*`.

## Verification

Verified 2026-10-29:

- **127 Vitest tests**, including seeded replay, 100 forest seeds, navigation,
  progression, menu geometry, cover framing, wind limits, clock behavior, and statistics.
- **31 Chromium checks**, including the actual recording and pixel comparison.
  These cover four resolutions, actual menu input, mode/back behavior,
  controller navigation, disabled multiplayer, saves/settings, reduced motion,
  pause/resume, repeated scene cleanup, starting/returning from runs, grass/movement,
  level-up cards, and an accelerated real Beedrill victory.
- TypeScript and production build pass. The existing large Phaser bundle warning
  remains; compilation succeeds.

```sh
pnpm test
pnpm exec playwright test --grep-invert "motion recording"
pnpm exec playwright test e2e/menuBackground.spec.ts --grep "motion recording"
pnpm build
```

Audio, physical controller hardware testing, and multiplayer networking remain
outside this milestone. Existing supported settings and all stage/world content
remain intact.
