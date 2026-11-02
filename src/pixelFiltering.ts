/**
 * Phaser 3's FilterMode.NEAREST is 1 (LINEAR is 0).
 *
 * Keep this module independent of Phaser's browser-only runtime: simulation,
 * content, item asset and world-generation tests import these helpers in Node.
 * A Chromium regression asserts this value against live Phaser textures.
 */
export const NEAREST_PIXEL_FILTER=1 as const;
