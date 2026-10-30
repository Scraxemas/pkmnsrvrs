# Native starter action frames

The nine playable starter forms have native physical, special and hurt actions.
The old runtime sheets contained only reduced Walk layouts; attack frames were
not inferred from those walking frames or generated as replacement monsters.

`tools/import_native_actions.py` pins SpriteCollab revision
`42a63b0757b3d55ebca29b27e62cd444cd29047b`, reads each species' `AnimData.xml`,
resolves aliases such as Shoot → Charge, and imports authored action PNGs.
The original XML and individual credits are retained in each species directory.
The upstream README, license, and credit-name records are archived here.

Source: [PMDCollab/SpriteCollab](https://github.com/PMDCollab/SpriteCollab).
The upstream submission policy describes CC BY-NC 4.0 for community submissions.
Individual credits identify CHUNSOFT for the original game sprite frames used
here. Pokémon and original game artwork retain their rights holders; this import
does not claim that original game sprites are independently commercially licensed.

Every source frame is translated without interpolation onto a consistent cell,
using the white marker in the upstream action's Shadow sheet as the ground anchor.
No sprite pixels are redrawn, recolored or resized. This normalizes baked movement
offsets while retaining native poses and direction-specific authored animation.
Eight facing rows and all action frames remain available. Per-frame durations,
Rush/Hit/Return frame metadata, source hashes, output hashes and exact sources are
recorded in `source.json` and generated `src/data/nativeActions.ts`.

Runtime action registration uses the original 60 Hz timing. The existing animation
controller chooses actions; signature activations take priority over secondary
attacks, hit reactions can override attacks, evolution overrides ordinary actions,
and defeat has the highest priority. Walking and movement resume after an action.
Passive terrain, poison and healing pulses do not restart the Pokémon animation.

The 27 derived runtime sheets total 255,043 bytes. Nine forms have physical,
special and hurt sequences, so no simulated-body-movement fallback is required
for the currently playable forms. Future species without an imported action use
the explicit walking/idle fallback and must not be described as having native
attack playback until their action metadata is added.
