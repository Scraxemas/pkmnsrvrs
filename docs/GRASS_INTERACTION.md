# Complete grass tufts and brushing

The runtime tuft now comes from the complete native cell (2, 203), not the tree-overlapped sample at (2, 1). All 16 source rows, including the pointed lower leaves, are retained. Grass-background pixels are keyed transparent and a two-pixel margin surrounds the complete silhouette. The extraction catalog points to this verified source and preserves the separate opaque terrain version.

Dense patches and scattered tufts use the same full transparent prop at an integer 2× scale, anchored at its base. Slightly staggered rows overlap organically. A transparent front-blade layer covers feet without covering the upper body or stamping opaque squares over trees.

Grounded Pokémon also receive a presentation-only mask that hides the bottom 20% of their visible body while in grass. Visible rows are measured from the actual frame alpha, excluding empty sprite-sheet padding. The mask clears outside grass and transitions over the edge of a tuft. It preserves the full sprite quad, UV sampling, ground position, shadow, and collision body. Ground enemies use the same masking; airborne enemies remain above the grass.

Movement contacts are looked up in the actor's local 3×3 grass cells. Each tuft receives a short directional bending impulse, then springs back and settles. Stationary actors do not retrigger it. Ground enemies bend grass too; player footsteps also emit three small blade particles, with a global cap of 72 and short lifetimes. The animation has no effect on simulation state or collision. Chunk disposal removes grass registrations and impulses.

Verification covers full-source leaf retention, directional bending, contact cooldowns, settling, real keyboard walk-throughs, particle cleanup, and idle behavior. Visual checkpoints are `grass-complete-idle.png`, `grass-brushing-walk.png`, and `grass-settled.png` under `test-results/screenshots`.

The body-mask browser check compares actual rendered pixels with the mask enabled/disabled: only the lower strip changes; upper-body pixels remain identical. `grass-bottom-fifth-mask.png` records the combined grass and Pokémon presentation. A separate keyboard regression walks, stops, and resumes in every direction, verifying both movement and advancing animation frames. Restarting checks `isPlaying` as well as the selected animation key, since stopping retains that key.
