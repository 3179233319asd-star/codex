# One-screen personal website verification

Date: 2026-10-10. Working site name: 此间.

## Target and evidence

The latest user direction is a simple, rounded interface with an Apple-like feel, and a homepage containing exactly one screen. The existing programmatic black hole remains the background. Works, notes and About now open in reading dialogs rather than extending the page below the scene.

- Background source: `docs/reference.jpg`, 1280 × 720; original attachment: `/tmp/codex-remote-attachments/01a0ff92-748d-7036-b260-437a861e70b6/1f32083f-4620-4161-bd80-74f1777bed06/1-1000035327.jpg`.
- Final closed homepage: `test-results/screen-desktop.png`, `screen-mobile.png`, `screen-landscape.png`.
- Reading states: corresponding `screen-*-work.png`, `screen-*-project.png`, `screen-*-notes.png` and `screen-*-about.png`.
- Settings: corresponding `screen-*-settings.png`.
- Paired full scene: `test-results/screen-hero-comparison.jpg`. Source and implementation were opened together at 1280 × 720 with all panels closed.
- Paired focused scene: `test-results/screen-core-comparison.jpg`, matched crops at x = 380–900 and y = 120–620.

Visual captures use Chromium, device pixel ratio 1, and viewports 1280 × 720, 390 × 844 and 844 × 390. They use the reduced-motion preference to freeze the renderer at time 0, quality 1, for repeatable comparison. Animation is verified separately. The capture report records a real WebGL 2 renderer and document dimensions exactly equal to each viewport, without page scrolling. Screenshots and the reference photograph are development evidence, not website assets.

## Five visual surfaces

1. Layout and spacing: a small site name sits at the top left and the three content buttons at the top right. A short welcome sits toward the lower left; the scene controls form one capsule at the bottom center. No interface text crosses the black-hole core. Reading dialogs remain inside the viewport and scroll internally when necessary.
2. Typography: normal-size Chinese text uses `ui-rounded`, native operating-system fonts and locally bundled Noto Sans SC 400 / 500 as fallback. Decorative serif English, italic chapter labels and oversized section numbering have been removed. No proprietary Apple font is bundled.
3. Color: restrained silver text and translucent charcoal controls fit the existing black-and-silver scene. The reading surface uses `#1b1e24f5`, body text `#d3d9e0` and secondary text `#b9bec6`. Focus indicators remain visible.
4. Imagery: `src/space.js` and `src/blackhole.frag` were not changed in this interface revision. The paired comparison confirms the core and rings remain unobstructed. The renderer still simplifies the photograph's finer gas filaments and dust; the background is not claimed to match every pixel. Earlier renderer comparisons remain in `docs/blackhole-design-qa.md`.
5. Components and edges: rounded navigation, scene controls, segmented reading tabs and soft buttons share restrained borders and spacing. Native dialogs support dismissal and keyboard focus restoration. Phone scene controls have 44 × 44px targets; the reading tabs support arrow keys, Home and End.

## Findings and corrections

- P2, fixed: the earlier design's display typography, chapter labels and scrolling sections conflicted with the latest brief. The homepage is now a single scene, and content opens in compact rounded dialogs.
- P2, fixed: under reduced motion, assigning a tiny global transition duration accidentally enabled inherited visibility transitions on elements with the default `all` transition property. Exiting immersive mode could leave focus on the document body. Reduced motion now disables transitions entirely; focus restoration happens on the next frame and checks the current mode.
- Capture issue, resolved: the same tiny transitions could leave a selected-tab highlight in the previous state in software-WebGL captures. Selected-tab styles, accessibility state and the active content now agree in the four-viewport checks. Final About captures wait for fonts and settled paint; the replacement desktop and phone screenshots were opened and visually confirmed. `test-results/screen-about-capture.json` records the correct About selection with WebGL 2 at all three capture sizes and no runtime errors.

Independent screenshot review found no remaining P0/P1/P2 layout or readability issues. In the 844 × 390 landscape view, expanded notes and settings use internal scrolling; the homepage itself remains one screen. Personal identity and copy are editable in `src/content.js`; no additional projects or biographical facts were invented.

## Functional verification

- Production build: `npm run build` passed after the final source changes.
- Targeted interface checks: all 25 passed at 1280 × 720, 390 × 844, 320 × 740 and 844 × 390. They cover strict one-screen dimensions, panel bounds, keyboard tabs, selected-tab styles, note expansion, project replacement and return, settings, immersive mode and focus restoration. Browser errors and resource failures were empty. Report: `test-results/screen-ui-report.json`.
- Full live-renderer suite: all 14 checks in `tests/browser-smoke.mjs` passed. These verify real WebGL pixel/time changes, pause and settings, immersive focus, personal dialog flows, keyboard shortcuts, context-loss recovery, mobile/landscape bounds, reduced motion and unavailable-WebGL fallback. Console errors, failed responses and external request failures were empty. Report: `test-results/browser-report.json`.

Software WebGL captures allow a 90-second screenshot budget in this environment. This affects verification only; the regular website runs its animation normally.

final result: passed
