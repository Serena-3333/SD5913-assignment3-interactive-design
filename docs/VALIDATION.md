# Current refinement validation · 2026-10-20

- **20 simulation tests passed:** lighting and comfort, spatial watering and caps, free positions, repeated species and five-plant capacity, independent identities and movement, invalid-operation rollback, removal, terrain-owned moisture, daily drying, health/growth and causal feedback, reset and deterministic drought bounds.
- **22 Chromium interaction checks passed:** free drag/click planting, duplicate species, independent movement, invalid drops/cancellation, keyboard targeting, left interaction/right camera rotation, local watering, lamp reach and aim, capacity and animated drawer, daily feedback, removal, reset/clear, mobile alternatives and no JavaScript/WebGL errors.
- **Seven viewport/layout checks passed** with five plants and daily annotations, from 1440 × 900 down to 1024 × 500 and 390 × 844. The page remains within the viewport; short status notes can scroll internally.
- **Production build and repository-subpath preview passed:** bundled fonts, favicon, procedural thumbnails and WebGL scene load; repeated free planting, daily explanations and right-button rotation work. `tests/production.mjs` also supports the deployed URL through `TERRARIUM_PREVIEW_URL`.
- Inspected actual application screenshots, including the five-plant scene. Earlier rendering measurements and validation remain recorded chronologically in `PROCESS.md` and `docs/performance.md`; the performance benchmark was not rerun for this iteration.

Automation lives in `tests/simulation.test.js`, `tests/browser.mjs`, `tests/layout.mjs` and `tests/production.mjs`. Reports and temporary captures are written to the ignored `test-results/` directory.

Not verified: Safari/Firefox, actual touch hardware, older-Mac performance, physical plant-care accuracy, or student usability outcomes.
