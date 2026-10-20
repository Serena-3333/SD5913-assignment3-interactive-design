# Acceptance record · 2026-10-20

Developer validation performed in Chromium on the local macOS workspace. This is not a report of student user testing.

| Requested acceptance | Actual evidence |
| --- | --- |
| Three-column UI and real 3D jar | Browser initial-state check; actual screenshots |
| Orbit observation | Pointer orbit exercised; changed 3D view inspected in `test-results/orbited.png` |
| Four distinguishable models | Distinct image data from shared model factory; all four planted during browser checks |
| Drag planting into fixed slots | Actual mouse drag, visible ghost, no state mutation before release, committed after release |
| Invalid drops leave state unchanged | Outside drop, Escape cancellation, and pointercancel tested |
| Three-plant capacity and uniqueness | Pure-state tests plus UI capacity check; planted species cards disabled |
| Swapping existing plants | Actual mouse drag between two occupied spots; slot titles verified |
| Position affects comfort, preserves health/growth | UI checked against pure simulation after swapping and moving |
| World-space lamp changes light/comfort | Actual lamp-head drag; UI light checked against distance formula; health/growth unchanged |
| Watering updates moisture correctly | Actual 3D-can click added 18; repeated water button reached/capped at 100 |
| Next Day updates environment and plants | UI moisture, health, growth, comfort checked against simulation; repeated clicks advanced only one day |
| Species respond differently | Unit test at identical moisture/light; screenshot shows different live comfort |
| Orbit does not alter simulation | UI snapshot before and after orbit compared for equality |
| Reset differs from Clear | Cancelled reset left state unchanged; confirmed reset kept arrangement; Clear restored empty initial state |
| No runtime errors | Zero page errors or error-level console messages during the browser workflow |

**Results:** 9 simulation tests passed; 18 browser acceptance checks passed; production build passed.

**Production smoke check:** `npm run preview` returned HTTP 200; Moss in Front Left plus Fern in Back Center advanced from day 1/moisture 60 to day 2/moisture 51. Both plant condition cards rendered, with zero JavaScript/WebGL console errors.

Reproduce with the commands in `README.md`. Browser reports are written to `test-results/browser-report.json` (ignored generated output). The tracked screenshots in `docs/screenshots/` were captured from the running WebGL page. The default application still starts empty; the two-species day-2 view is a reproducible demonstration, not a preloaded or static scene.

Safari, Firefox, real touch hardware, sustained performance profiling on older Macs, and real student usability sessions remain unverified.
