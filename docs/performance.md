# Paper desk performance check

Recorded locally on 2026-10-20 with headless Playwright Chromium, a 1440 × 900 viewport, device scale factor 2, and Moss, Fittonia and Fern. Both versions rendered 12,854 triangles. The fitted UI also changes canvas dimensions, so these numbers measure the complete revision rather than an isolated GPU microbenchmark.

| Diagnostic | Before | After |
| --- | ---: | ---: |
| Main-view draw calls | 375 | 85 |
| Triangles | 12,854 | 12,854 |
| Canvas pixel ratio | 1.75 | 1 (adapted from cap 1.25) |
| Drawing-buffer pixels | 1,500,150 | 493,506 |
| Median animation-frame interval | 66.6 ms | 32.4 ms |
| 95th percentile frame interval | 67.0 ms | 33.4 ms |

Repeated leaves and veins use instanced drawing while their existing pivots still control health and growth. Static gravel is merged by material. Shadow maps update when light/casters change, not on every camera frame. Hover no longer runs a raycast whose result was unused. Static scenes park and hidden tabs stop rendering. Sustained slow frames can reduce the 3D drawing resolution without lowering HTML text resolution.

Frame intervals include browser scheduling and headless graphics overhead. They are diagnostic measurements, not a promised frame rate on every Mac. Run `npm run test:performance` against the development server to reproduce the current representative scene; generated JSON is stored in the ignored `test-results/` folder.

The revision also passed 18 simulation checks, 22 browser acceptance checks and a separate layout/drawer workflow covering 1440×900, 1366×768, 1280×720, 1024×768, 1280×600, 1024×500 and 390×844. Layout captures were visually inspected. Production build succeeds. These are developer checks, not student usability research.
