# Local rotation refinement · 2026-10-20

A synchronous camera-change invalidation could fork an additional rendering loop from inside a tick. The local fix keeps exactly one scheduled loop. Retina MSAA is disabled; damping is 0.18 and settled plant matrices are reused. Full resolution remains capped at DPR 2 during rotation as well as at rest. Soft shadows, the shadow-casting spotlight and glass are preserved.

Hardware-backed headless Chromium (Metal, Apple M5), 1440 × 900, DPR 2, three species:

| Diagnostic | Before | Revised, full resolution |
| --- | ---: | ---: |
| Median interval during right-button rotation | 450 ms | 16.7 ms |
| 95th percentile during rotation | 983.4 ms | 17.6 ms |
| Median forced static-frame interval | 16.7 ms | 16.7 ms |
| Pixel ratio during rotation | 2 | 2 |
| Shadow refreshes during rotation | 0 | 0 |

Temporary motion DPR 1.5 was also tried and measured 16.7 ms median, so it was not retained. These compare complete revisions (including the smaller seedling geometry projection); they are not isolated GPU microbenchmarks or guaranteed device frame rates. Detailed local reports: test-results/performance-before.json and performance-full-resolution.json. Set TERRARIUM_GPU=metal for the performance script on a compatible Mac; leaving it unset uses Playwright's default graphics backend.

The following section records earlier software-rendered measurements and should not be compared directly with the Metal numbers above.

# Earlier rendering clarity and performance

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
