# Floating movement controls

During a run, touch or left-click an empty part of the gameplay canvas and drag.
The initial contact is the joystick origin; it never selects a destination or
teleports the Pokémon. Release to stop. A small translucent joystick appears at
the origin and fades after release. Its handle is clamped to the outer circle.

WASD and arrow keys remain available. Standard controllers support the left stick
and D-pad. A nonzero keyboard direction takes priority over a drag, followed by
controller input. Switching input methods never adds their speeds together.

## Configuration

`src/movementVector.ts` exports `DEFAULT_JOYSTICK_CONFIG`:

| Setting | Default | Meaning |
| --- | --- | --- |
| `radius` | `65` | CSS pixels of drag needed for maximum speed |
| `deadZone` | `10` | CSS pixels ignored around the initial contact |
| `opacity` | `0.5` | Opacity of the complete joystick |
| `handleRadius` | `24` | Visual handle radius in CSS pixels |
| `fadeDurationMs` | `140` | Release fade duration; input stops immediately |

Change these defaults or pass a partial `config` to `PointerMovementController`
in `GameScene.create()`. Values are validated. The movement magnitude increases
linearly from zero at the dead-zone edge to one at the outer radius. For example,
a 37.5-pixel drag produces half speed with the defaults. The gamepad helper uses
a configurable radial dead zone, defaulting to `0.15`.

## Integration

- `src/movementVector.ts` owns reusable joystick state, pointer ownership, radial
  clamping, controller polling, and selection of the shared movement vector.
- `src/pointerMovement.ts` connects native Pointer Events to that state. Pointer
  capture and window release handlers retain the gesture outside the canvas.
  Older browsers use touch/mouse adapters feeding the same state.
- `src/main.ts` supplies the combined vector through the existing `moveInput()`
  and `tick()` path. Phaser hit testing excludes interactive canvas controls,
  including nested HUD zones. Three touch pointers leave additional fingers
  available for canvas UI. DOM menus receive their normal events.
- `src/simulation.ts` preserves input magnitudes below one and clamps larger
  vectors. Existing speed modifiers, collision resolution, velocity-derived
  facing, animations, grass interactions, and automatic attacks remain shared.
- `src/style.css` draws the screen-space joystick and scopes gesture/selection
  suppression to the gameplay canvas. The camera continues to follow the
  existing interpolated player position.
- `src/ui/moveHud.ts` and `src/ui/itemHud.ts` align fixed HUD hit areas with their
  visible slots, so interacting with them consistently excludes movement.

Origin and drag distances use viewport CSS pixels, independently of camera
scroll, camera zoom, device pixel ratio, and Phaser's 1280×720 FIT scaling. The
overlay clips to the displayed canvas. Resize, scrolling, and fullscreen layout
changes update its clipping bounds while preserving the original screen anchor.

Only the first accepted pointer owns movement. Other contacts neither redirect
it nor replace it when it ends. A new contact starts a new gesture. Pointer
release, cancellation, capture loss, browser blur, page hiding, scene pause or
sleep all clear input. Shutdown and direct scene destruction additionally remove
the listeners, resize observer, canvas class, and joystick DOM. Resuming a scene
requires a fresh contact for pointer movement.

## Verification

Run the focused checks with:

```sh
pnpm test -- tests/movementVector.test.ts tests/movementIntegration.test.ts
pnpm test:e2e -- e2e/movementInput.spec.ts --workers=1
pnpm build
```

The unit/simulation tests cover dead zones, radius and diagonal caps, pointer
ownership, all eight directions, proportional speed, timestep independence,
controller input, existing movement modifiers, generated tree/rock collisions,
and automatic attack cadence during movement. The existing dense-run tests cover
400-enemy simulation performance.

Playwright covers actual mouse dragging and Chromium touch injection, including
portrait/landscape at DPR 2, screen anchoring, continuous direction changes,
release/cancellation, multitouch UI interaction, HUD exclusions, upgrade pauses,
controller/keyboard compatibility, active resize, scene lifecycle cleanup, and
captured dragging outside the canvas during a 400-enemy wave. Physical Android
and iOS hardware still needs an on-device comfort and browser-interruption pass.
