# Current refinement validation · 2026-10-20

- **16 simulation tests passed:** comfort/ranges, deterministic spatial soil, bounded water footprint/caps, independent plant water, invalid positions, lamp cone/aim/size/power/orbit/reach/clamps, uniqueness/swaps, terrain-owned moisture, local daily drying, health/growth, reset and drought bounds.
- **22 Chromium acceptance checks passed:** real plant dragging, preview/release, invalid drops and cancellation, keyboard planting, capacity, water-can dragging, water cancellation, targeted keyboard watering, swaps preserving water/health, existing-card selection, 3D aim dragging, narrow/zero/max power, orbit/reach controls, lamp-head dragging, lamp cancellation, daily repeat guard, camera invariance, reset, source isolation, parked rendering, Clear/fourth species, mobile alternatives and no JS/WebGL errors.
- Inspected the real overview, water-target preview, orbit, mobile, lamp-only and all-sources-off captures. A final leaf face-winding correction and base/soil contact refinements received focused visual checks. Source-isolation controls are developer inspection only; the normal scene keeps its studio fill.
- The production build succeeds. Documentation images come from the running WebGL scene.

Browser automation is in `tests/browser.mjs`, pure-state tests in `tests/simulation.test.js`. Detailed machine-generated output goes to the ignored `test-results/browser-report.json`.

Not verified: Safari/Firefox, actual touch hardware, older-Mac performance, physical plant-care accuracy, or student usability outcomes. Earlier MVP validation remains recorded chronologically in `PROCESS.md`.
