# Rendering clarity and performance

The current revision keeps the canvas at the device pixel ratio, capped at 2, during gestures and slow frames. The earlier adaptive resolution policy caused visible blur and has been removed. Instead, small blades, stems, veins, soil subdivisions, gravel and secondary rims were simplified. The main glass lip and curved wall keep their smooth outlines. The empty-jar slogan was removed.

Recorded locally on 2026-10-20 with headless Playwright Chromium, a 1440 × 900 viewport, device scale factor 2, and Moss, Fittonia and Fern:

| Diagnostic | Original | Previous adaptive revision | Current clarity revision |
| --- | ---: | ---: | ---: |
| Main-view draw calls | 375 | 85 | 83 |
| Triangles | 12,854 | 12,854 | 8,270 |
| Canvas pixel ratio | 1.75 | 1 | 2 |
| Drawing-buffer pixels | 1,500,150 | 493,506 | 1,976,076 |
| Median animation-frame interval | 66.6 ms | 32.4 ms | 50.0 ms |
| 95th percentile frame interval | 67.0 ms | 33.4 ms | 66.7 ms |

The current revision restores four times the pixels of the adaptive benchmark and reduces geometry by about 36%. Its headless frame interval is higher than the blurred version and lower than the original. The fitted UI also changes canvas dimensions, so these numbers compare complete revisions rather than an isolated GPU microbenchmark. Frame intervals include browser scheduling and headless graphics overhead; they are not a promised frame rate on every physical Mac.

Repeated leaves and veins still use instanced drawing while existing pivots control health and growth. Static gravel remains merged by material. Shadows update when light/casters change, rather than every camera frame. Hover avoids unused raycasts, static scenes park and hidden tabs stop rendering. The shadow-receiving floor is limited to the local scene.

Run `npm run test:performance` against the development server. The check asserts a stable device pixel ratio through slow frames, a geometry budget and batched draw calls; generated JSON and a Retina screenshot go into the ignored `test-results/` folder. Simulation and real-browser acceptance checks cover the existing water, light, planting, movement, reset and day mechanics. These are developer checks, not student usability research.
