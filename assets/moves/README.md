# Generated move artwork

These are original AI-generated move designs, produced with the **Codex built-in `image_gen.imagegen` tool** on 2026-10-30. The tool does not expose an exact model identifier. No CLI/API generation jobs or paid reference packs were used.

`generation-manifest.json` contains the complete exact prompt for each generated asset and style variant, original source filename and SHA-256, processed output SHA-256, source dimensions, processing settings, and the move IDs/names/types evaluated from the current TypeScript registry. The runtime reads only the final tiny PNGs in `public/assets/moves/`; it does not load this metadata or generation sources.

The v0.4.3 initial study uses six moves in three directions (18 individual generations). Six chosen Style A candidates become production icons; eight more unique Style A generations complete that milestone's 14-move library. Review samples in Styles B/C are not used at runtime.

Large generation sources remain in the originating user's Codex `generated_images` folder. They are deliberately excluded from Git. To reproduce normalization with those original source files available:

```powershell
python tools/process_move_icons.py --source-root '<directory containing the recorded sourceFile PNGs>'
```

The pipeline requires Pillow and the project's installed Node/Vite dependencies. It evaluates `MOVES` through Vite SSR rather than parsing TypeScript source text, and rejects missing production or comparison generations. `--allow-partial` exists only for candidate review during generation. It reconstructs a fixed logical pixel grid by coverage and modal cluster color, with no bilinear interpolation or dithering. The original sources are already pixel-art designs; this does not turn smooth illustrations into purported pixel art.

Rebuild comparison sheets from the small committed PNGs without the source generations:

```powershell
python tools/process_move_icons.py --sheets-only
```

All final icons are 32×32 RGBA, up to 12 opaque colors, binary alpha, and a maximum 26-pixel subject extent with transparent margins. Style comparison B uses up to 20 colors and a 28-pixel extent; C uses up to 6 colors and a 24-pixel extent. `docs/qa/v043/pixel-audit.json` records the actual palette count, coverage and bounds for every export.

See `docs/qa/v043/art-direction.md` for the reference links, style decision, permission handling, and visual limits. External pack previews and private archive assets are not included. Existing PokéSprite item sprites and upstream notices remain unchanged. No claim is made that generated/reconstructed icons were individually hand-authored.

## v0.5.0 expansion

The current registry has 52 move icons. The original 14 are preserved byte-for-byte; `v043-retained-hashes.json` records their baseline. Another 38 icons and 19 separate four-frame VFX atlases extend the selected direction. `v050-generation-manifest.json` and resumable `v050-jobs/*.json` record every exact prompt, source/output hash, and normalization setting. VFX isolation uses the source sheets' actual transparent gutters and a shared scale/baseline across all four keyframes.

With the corresponding recorded source PNGs available, re-export one job with:

```powershell
python tools/process_v050_art.py --entry assets/moves/v050-jobs/icon-powerWhip.json --source-root '<recorded source directory>'
```

Build the complete icon sheet, animated VFX previews and browsable gameplay gallery from the committed exports:

```powershell
python tools/process_v050_art.py --finalize
```

See [the v0.5.0 implementation report](../../docs/V050_MOVE_SYSTEM.md) and [review gallery](../../docs/qa/v050/index.html) for native animation attribution, combat examples, limitations and validation.
