# Complete grass tufts and brushing

The runtime tuft now comes from the complete native cell (2, 203), not the tree-overlapped sample at (2, 1). All 16 source rows, including the pointed lower leaves, are retained. Grass-background pixels are keyed transparent and a two-pixel margin surrounds the complete silhouette. The extraction catalog points to this verified source and preserves the separate opaque terrain version.

Dense patches and scattered tufts use the same full transparent prop at an integer 2× scale, anchored at its base. Slightly staggered rows overlap organically. A transparent front-blade layer covers feet without covering the upper body or stamping opaque squares over trees.

Movement contacts are looked up in the actor's local 3×3 grass cells. Each tuft receives a short directional bending impulse, then springs back and settles. Stationary actors do not retrigger it. Ground enemies bend grass too; player footsteps also emit three small blade particles, with a global cap of 72 and short lifetimes. The animation has no effect on simulation state or collision. Chunk disposal removes grass registrations and impulses.

Verification covers full-source leaf retention, directional bending, contact cooldowns, settling, real keyboard walk-throughs, particle cleanup, and idle behavior. Visual checkpoints are `grass-complete-idle.png`, `grass-brushing-walk.png`, and `grass-settled.png` under `test-results/screenshots`.
