# Archived reference-restoration QA

Historical result for commit `23c20fb`. The following checks describe reference v17 before the subsequent cinematic material work; current evidence is in `design-qa.md`.

Date: 2026-10-11. At that stage the user direction restores the original reference, replacing the earlier request for upper/lower symmetry. The scene must remain code-generated and animated, with the accepted personal-site UI occupying one screen.

## Evidence and comparison state

Source: `docs/reference.jpg`, 1280 × 720. Final candidate: reference v17. The rejected symmetric result is archived in `docs/symmetry-experiment-qa.md` and immutable `test-results/blackhole-symmetric-gas-v4-*` captures.

- Final actual WebGL screenshots: `test-results/blackhole-reference-v17-desktop.png`, `blackhole-reference-v17-mobile.png`, `blackhole-reference-v17-landscape.png` and corresponding `*-scene.png` files.
- Full source/current pair: `blackhole-reference-v17-reference-comparison.jpg`.
- Rejected symmetry/current pair: `blackhole-reference-v17-before-after.jpg`.
- Focused source/current junctions: `blackhole-reference-v17-junctions.jpg`. Identical 260 × 170 source crops at `(300,215)` and `(720,215)` are enlarged equally to 520 × 340.
- Phone source/current pair: `blackhole-reference-v17-mobile-comparison.jpg`. The source is scaled to the same 844-pixel height and cropped centrally to 390 pixels, matching the scene's height-based projection.
- Immutable final captures and metadata: `blackhole-reference-v17-*`; metadata: `blackhole-reference-v17-capture.json`.

Chromium opened `http://terminal.local:4173/` using real WebGL 2 with SwiftShader. Viewports and screenshot pixels are 1280 × 720, 390 × 844 and 844 × 390, DPR 1. Reduced motion freezes time at 0 with quality 1 for visual comparison. Animation is tested separately. Each viewport has exact one-screen document dimensions, with zero console, page or resource errors.

## Findings

- P1, fixed: screen-centred mirrored gas replaced the reference's tilted disc and foreground occlusion. Signed, independently traced rays now restore the raised circle centre, slightly lower main bright band and dark near-disc layer crossing the lower image. The underside is not a reflected copy of the upper arch.
- P2, fixed: thick roots and folded projection created abrupt joins, double plates and dark triangular gaps. A monotonic concave mapping opens only the rear material; the front disc and photon silhouette retain their original projection. Both junctions turn continuously into the plane without large black wedges.
- P2, fixed: fine material became a dense point grid or woven pattern in the grazing projection. Position and velocity differentials travel through the same curved rays. Their radial footprint filters unresolved noise and orbital streams while retaining resolved, independently lit filaments. This replaces a fixed texture-footprint estimate that either retained aliasing or washed the disc into a uniform milky sheet.
- P2, fixed: cold coarse brush marks dominated the gas. Separate optical-depth strata, interrupted orbital streams, sparse hot arcs and faint warm scattering give soft depth with identifiable fine flows and dark gaps. Independent review of the full pair, focused junctions, phone comparison and landscape found no remaining P1/P2 visual blockers. The phone also avoids thick white roots, dominant woven grids and uniform textureless gas sheets.

Remaining P3: the main hot band is softer and more uniform than the reference, gas is somewhat warmer, and individual lower-ring flows differ. The reference has more intricate cold-silver strands and dark layers. These are visible fine-detail differences; exact photographic or pixel-identical reproduction is not claimed. The reference raster is used only for QA and is not imported by the running site.

## Required visual surfaces

1. Fonts and typography: the accepted native rounded/system typography and local Noto Sans SC remain readable. Existing heading sizes, weights, wrapping and controls are retained.
2. Spacing and layout: the same header, welcome copy and bottom capsule remain within one screen on desktop, phone and landscape. The phone crops the scene horizontally while preserving its height-based proportions.
3. Colors and tokens: ivory/silver emission, subordinate cool haze and almost-black sky remain consistent with the existing interface. The shadow remains dark and the lower foreground veil remains visible.
4. Image quality: real WebGL supplies curved rays, optical-depth disc crossings, drifting gas, procedural stars and galaxies without photos, videos or image textures. The Canvas fallback preserves the inclined structure with simpler curved filaments; its visual detail is deliberately lower than WebGL.
5. Copy and content: the same concise Chinese welcome, personal navigation and reading dialogs remain in place. No extra home sections or decorative labels were added.

## Verification

- `npm run build` passed on the final v17 shader.
- Final WebGL static captures passed at all three sizes, with zero errors and exact one-screen bounds.
- Final `node tests/render-smoke.mjs` passed all 9 checks: visible WebGL pixels and no GL errors, time/pixel changes, frozen pause, actual UI speed/light controls and labels, identical brightness restoration, reset/resume, immersive view and exact mobile bounds. At frozen time, intensity 0.7 changed the frame hash; restoring 1 returned the original hash `1179149446`. Immutable results: `test-results/blackhole-reference-v17-render-report.json`. Live capture aliases may be replaced by later work.
- Unchanged final Canvas fallback passed 16 browser checks across desktop and phone: visible pixels, animation, frozen pause, speed/light controls and labels, identical restored brightness, default reset/resume, immersive mode/Escape and exact one-screen bounds. Results: `test-results/reference-fallback-report.json`; screenshots: `reference-fallback-desktop.png`, `reference-fallback-mobile.png` and their scene captures.
- Earlier dialog/keyboard checks remain historical evidence in `docs/one-screen-ui-qa.md` and `docs/material-refinement-qa.md`, rather than being counted as rerun here.

Each traced path uses at most 180 integration steps. The local rear-disc shoulder region traces an additional path, and differential transport adds arithmetic and register use; hardware frame rates have not been measured. The projection model, crossing derivatives and caustic footprint cap are approximations for visual rendering.

final result: passed
