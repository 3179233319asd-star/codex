# Historical symmetry experiment QA

Superseded: the user rejected this symmetric result. The current reference-faithful review is `design-qa.md`; the findings below document the earlier requirements only.

Date: 2026-10-11. The user requested thin concave junctions, longer left/right wings, symmetric upper/lower structure and better gas, retaining pure-code animation and the one-screen personal homepage.

## Evidence and comparison state

- Source: `docs/reference.jpg`, 1280 × 720. The user's explicit symmetry request overrides its naturally asymmetric upper/lower image.
- Before: `test-results/blackhole-refined-desktop-scene.png`.
- Final WebGL candidate: `test-results/blackhole-symmetric-gas-v4-desktop.png`, `blackhole-symmetric-gas-v4-mobile.png`, `blackhole-symmetric-gas-v4-landscape.png` and corresponding `*-scene.png` files; these are the historical symmetric-gas v4 captures.
- Combined full reference/final comparison: `test-results/blackhole-symmetric-gas-v4-reference-comparison.jpg`; before/final: `blackhole-symmetric-gas-v4-before-after.jpg`.
- Combined focused reference/before/final crops: `test-results/blackhole-symmetric-gas-v4-junctions.jpg`. Both junctions use identical 260 × 170 crop coordinates in each image, equally enlarged to 520 × 340.
- Capture metadata: `test-results/blackhole-symmetric-gas-v4-capture.json`.

Chromium opened `http://terminal.local:4173/` with real WebGL 2. CSS viewports and image pixels are 1280 × 720, 390 × 844 and 844 × 390, DPR 1. Reduced motion freezes time at 0 and quality at 1 for comparison; animation is tested separately. All three captures have exactly one-screen document dimensions and no console, page or resource errors. The full pair, focused pairs and desktop/phone/landscape captures were opened before this report. The phone intentionally crops the same centred scene horizontally.

## Findings and iteration history

- P2, fixed: broad bright roots at both junctions. Junction v1 reduced projection spread and scattered gas; v2 narrowed exposure and lengthened the disc; v3 shifted the hot band inward. Bright column-like roots remained. The final concave mapping smoothly turns the outer arch into the plane while an independent critical-impact silhouette preserves the circular rim.
- P2, fixed: upper and lower gas used different projection radii, widths and masking. Final geometry shares the viewport midline and envelope, with slightly different turbulent phases. The photon peaks are at y = 223 and 496, both 136.5 pixels from the y = 359.5 pixel-centre axis (`blackhole-symmetric-gas-v4-symmetry.json`). The background sky keeps an independent spatial distribution.
- P2, fixed: strongly fragmented high-frequency gas resembled brush strokes and white clumps. Correlated strata, continuous low/mid-frequency density, reduced opacity and fewer narrow ridges provide connected light and soft depths. The radial tail extends to 22 world units and gradually fades, carrying both wings to the desktop/landscape edges.
- P2, fixed: symmetric-gas v1 was too smooth and uniformly bright. v2 restored medium-scale density changes. v3's strong veil created dark wedge segments. Final v4 blends the veil at 38%, moderates angular frequency and retains a few fine strands. The broken wedges are absent, and faint fog maintains the continuous body.
- P2, fixed: constant central glow formed an overly uniform stripe. The stream now has gradually varying density and width, with energy tapering into the wings.

Independent review of the final full view, focused crops, phone and landscape found no remaining P1/P2 under the user's latest requirements. Residual P3: hot trajectories are more concentric and softer than the reference's intricate intertwined filaments; the central stream is still very straight. Neither exact photographic reproduction nor physical accuracy is claimed. The symmetric envelope is an intentional art direction choice requested by the user.

## Required visual surfaces

1. Fonts and typography: the accepted native rounded/system font and local Noto Sans SC remain readable; weights, wrapping and hierarchy match the prior interface.
2. Spacing and layout: all captures retain one screen, centred gas and accessible navigation/bottom controls. Shadow, rim and disc share a horizontal axis, and both concave joins remain continuous.
3. Colors and tokens: silver/ivory hot gas, subordinate cool haze and dark sky remain consistent. Reduced radiation and opacity preserve layered brightness; the core stays dark.
4. Image quality: real-time WebGL supplies the main scene without images, video or texture assets. Continuous gas, longer tails and independent turbulence meet the latest direction. Canvas fallback uses matching symmetry/joins with deliberately simpler visual detail.
5. Copy and content: the same brief Chinese personal-site copy, real personal links and dialog content remain in place, with no new sections or decorative labels.

## Verification

- `npm run build` passed on the final shader and Canvas renderer.
- Real WebGL captures passed at all three sizes, with zero errors and exact one-screen dimensions.
- `node tests/render-smoke.mjs` passed all 9 checks: shader compilation/visible pixels, time/pixel changes, no GL errors, frozen pause, actual UI speed/light controls, light restoration, reset, immersive access and exact phone bounds. Dimming to 0.7 changed the frame, and restoring 1 returned its original hash (-889429544). Results: `test-results/symmetric-gas-render-report.json`; live screenshots: `symmetric-gas-live-desktop.png`, `symmetric-gas-live-immersive.png`, `symmetric-gas-live-mobile.png`.
- Canvas fallback browser checks passed 11/11: changing time/pixels, pause freezes the frame, brightness restoration returns the same hash, desktop/phone bounds and no browser/resource errors. Evidence: `fallback-gas-report.json`, `fallback-gas-desktop.png`, `fallback-gas-mobile.png`.
- Earlier wider dialog/keyboard checks remain historical evidence in `docs/material-refinement-qa.md` and `docs/one-screen-ui-qa.md`, rather than being counted as rerun here.

No dependencies or ray-integration steps were added. The preview remains on port 4173; no publication was requested. Hardware frame rates have not been measured.

final result: passed
