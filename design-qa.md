# Cinematic gas material QA

Date: 2026-10-11. The user requests a more striking, code-generated animated black hole, retaining the original reference perspective and accepted single-screen personal-site UI. Source: `docs/reference.jpg`, 1280 × 720. Before: reference v17 at commit `23c20fb`; its historical checks are archived in `docs/reference-restoration-qa.md`. Final visual candidate: cinematic v22.

## Actual evidence

Comparison captures use real Chromium WebGL 2 with SwiftShader, DPR 1, at 1280 × 720, 390 × 844 and 844 × 390. Reduced motion freezes comparison frames at time 0 and quality 1. Running animation is checked separately. All three captures have exact one-screen document bounds and zero console, page or HTTP errors. All five shader-time frames and both phone hot-phase resolution captures passed. Continuous application-clock and control verification also passed. Actual running captures, including adaptive mobile quality, were inspected with no remaining P1/P2 blockers.

- Actual UI and immersive captures: `test-results/blackhole-cinematic-v22-{desktop,mobile,landscape}.png` and corresponding `*-scene.png`; metadata: `blackhole-cinematic-v22-capture.json`.
- Source/current full pair: `blackhole-cinematic-v22-reference-comparison.jpg`.
- Genuine before/current pair: `blackhole-cinematic-v22-before-after.jpg`; before is the same-size, same-state `blackhole-cinematic-before-desktop-scene.png`.
- Source/current shoulder crops: `blackhole-cinematic-v22-junctions.jpg`. Identical 260 × 170 crops at `(300,215)` and `(720,215)` are enlarged equally to 520 × 340.
- Phone source/current pair: `blackhole-cinematic-v22-mobile-comparison.jpg`. Source is scaled to the same 844-pixel height and cropped centrally to 390 pixels, matching the scene's height-based framing.
- Five shader-time frames: `test-results/blackhole-cinematic-v22-motion-{0,0.8,3,8,30}.png` and `blackhole-cinematic-v22-motion.json`; the original capture directory is `test-results/v22-motion/`.
- Phone hot-phase captures at shader time 0.8: `blackhole-cinematic-v22-phone-hot-{dpr1,dpr08}.png`, corresponding `*-scene.png`, and `blackhole-cinematic-v22-phone-hot-report.json`. DPR 0.8 is a resolution proxy, not an adaptive-quality or physical mobile GPU test.
- Continuous application-clock and control evidence: `blackhole-cinematic-v22-render-report.json` and `blackhole-cinematic-v22-live-{desktop,immersive,mobile}.png`. The current test output remains `render-report.json` and `blackhole-live-*`.

Screenshot files and the source reference are QA evidence; none are imported by the running website. Convenience aliases `blackhole-latest-*` now point to this final candidate. The source full pair, genuine before/after, shoulder crops, phone pair and all three UI sizes were inspected alongside the temporal and running evidence.

## Findings and corrections

- P2, fixed: beige emission was spread too evenly through the gas. Continuous advected density, cold scattering, correlated dust absorption and thin optical-depth strata now preserve dark openings. The sky and photon rim retain their own exposure.
- P2, fixed: early candidates emphasized dense parallel contour lines. The material combines continuous two-dimensional gas with subordinate interrupted wisps and sparse streams; oversized manually drawn hot circles were removed.
- P2, fixed: increasing angular texture frequency while filtering only radius reintroduced woven detail. Signed radial and angular ray differentials now include the differential-rotation Jacobian for the main Cartesian gas field. A low radial-frequency density envelope retains resolved angular cloud openings when small details are integrated away. The extended photosphere uses one Cartesian density field, with screen derivatives evaluated before divergent ray integration.
- P2, fixed: distant sky lacked faint depth. Broken procedural remote dust adds subordinate cloud structure while preserving dark sky gaps and individual stars.
- P2, fixed in the dynamic hot phase: static candidates passed while the actual 0.8-second phase formed a wide white pipe. Bounded bloom removed hard clipping; removing a whole-gas highlight multiplier and adding a gas-only HDR shoulder reduced saturation, but visual inspection still found a broad, flat hot body. A source-component diagnostic isolated the continuum: removing body emission opened the thin streams. The final material reduces body gain from 3.6 to 1.4 in the hottest gas and thermal diffusion from .24 to .10, retaining density, opacity, cold wings, stream gains and geometry. Actual final 0.8-second inspection now shows distinct bright streams and dark channels rather than a white or grey pipe. All five actual shader-time images and both phone hot-phase images were inspected; the broad flat tube did not recur.
- The accepted circular silhouette, tilted disc, dark foreground veil and natural concave rear shoulders are retained. The lower image follows its own ray path and occlusion; it is not a reflected upper image. No home sections, copy, type or controls were redesigned.

Remaining P3: the reference thermal bands are warmer, denser and locally brighter; the final normal phase is cooler, thinner and darker. Long shoulder filaments remain smoother than the source, the near-side bright band is more continuous, and 30-second foreground arcs are somewhat regular. DPR 0.8 softens fine strands further. The original subordinate wisps retain an unwrapped angular-noise coordinate, so strict periodicity is not claimed for every detail field; the main cloud and Cartesian gas use periodic orbit coordinates, and actual inspected frames show no visible seam. Fine flow patterns remain different, especially in the phone crop. Exact photographic or pixel-identical reproduction is not claimed. Numerical saturated-band checks alone do not establish visual success.

Diagnostic measurements use a weighted sRGB brightness proxy, not physical radiance. In fixed time-0 ROIs, upper-hot mean is .592 before → .438 now (source .595), and lower-hot mean .610 → .465 (source .595). Left-wing mean is .336 → .394 (source .484), and deep-sky mean .0008 → .0071 (source .0104). Thus this change enriches the outer scene while accepting dimmer normal-phase hot gas to preserve dynamic stream detail; it does not improve every source brightness metric. Full definitions and measurements: `test-results/blackhole-cinematic-v22-metrics.json`.

## Required visual surfaces

1. Fonts and typography: native rounded/system fonts and locally bundled Noto Sans SC remain readable at all three sizes; actual heading wrapping and control labels were inspected.
2. Spacing and layout: header, welcome copy and bottom capsule fit within one screen at all three sizes; phone framing crops the wings while preserving scene height. Actual screenshots and document bounds agree.
3. Colors and tokens: hot peaks, cool gas, subordinate warm dust, dark sky and black core remain visually distinct. Full comparisons, temporal frames and phone hot phases were inspected.
4. Image quality: actual procedural gas, stars, galaxies and joins were compared against the source using full pairs, equally scaled shoulder crops, phone comparison and the animated hot phase. No thick feet, folds, grids or broad flat hot tube remain at inspected states; fine texture differences remain P3.
5. Copy and content: concise Chinese welcome, personal navigation and control text were inspected in screenshots. Source diff confirms reading dialogs and project content are unchanged; their prior functional checks are historical evidence.

## Verification

- `npm run build` passed on the final v22 shader.
- Final static captures passed at 1280 × 720, 390 × 844 and 844 × 390.
- Final five-time shader test passed: five different full-frame and screenshot hashes, black core ROI fixed and dark, zero browser/WebGL/resource errors, and saturated-band median/P90 0 pixels at all five selected times. Actual inspection separately passed.
- Final phone hot-phase captures passed with actual 390 × 844 and 312 × 675 framebuffers. The latter is explicitly a DPR resolution proxy; both were visually inspected with no P1/P2.
- `node tests/render-smoke.mjs` passed all nine checks. Actual application time advanced .2 → .3 seconds and rendered pixels changed. Pause froze time and pixels; speed 1.4 and intensity .7 updated real controls/labels; restoring intensity restored the exact paused hash `-1218918956`. Reset resumed default playback, immersive mode/Escape worked, and the final phone occupied exactly 390 × 844 CSS pixels. Its actual adaptive quality was .8, with a 312 × 675 WebGL framebuffer at application time .944 seconds. New final desktop, immersive and phone captures were inspected with no P1/P2.
- The shader-time regression guard measures the longest vertical run above weighted sRGB 0.95 per column in `(585,123)–(695,181)`; median must remain at most 8 pixels. The bad candidate had a median 17 pixels, versus roughly 3 pixels in the source. This catches broad saturation; it does not replace visual review of pale unsaturated bands or gas texture.
- Canvas fallback and UI implementation are unchanged. Their earlier 16 fallback checks and dialog/keyboard checks remain historical evidence in the archived reference and UI QA documents; they are not counted as rerun for this shader change.

Each ray path uses at most 180 integration steps; rear shoulder regions also trace a local rear path. The optical model, fixed-step differential transport, crossing correction, footprint caps and photosphere approximation serve visual rendering. Hardware frame rates have not been measured. The running renderer retains adaptive quality; fixed-quality screenshots do not establish hardware performance.

final result: passed
