# Current refinement validation · 2026-10-20

- **20 simulation tests passed:** lighting and comfort, spatial watering and caps, free positions, repeated species and five-plant capacity, independent identities and movement, invalid-operation rollback, removal, terrain-owned moisture, daily drying, health/growth and causal feedback, reset and deterministic drought bounds.
- **22 Chromium interaction checks passed:** free drag/click planting, duplicate species, independent movement, invalid drops/cancellation, keyboard targeting, left interaction/right camera rotation, local watering, lamp reach and aim, capacity and animated drawer, daily feedback, removal, reset/clear, mobile alternatives and no JavaScript/WebGL errors.
- **Seven viewport/layout checks passed** with five plants and daily annotations, from 1440 × 900 down to 1024 × 500 and 390 × 844. The page remains within the viewport; short status notes can scroll internally.
- **Production build and repository-subpath preview passed:** bundled fonts, favicon, procedural thumbnails and WebGL scene load; repeated free planting, daily explanations and right-button rotation work. `tests/production.mjs` also supports the deployed URL through `TERRARIUM_PREVIEW_URL`.
- Inspected actual application screenshots, including the five-plant scene. Earlier rendering measurements and validation remain recorded chronologically in `PROCESS.md` and `docs/performance.md`; the performance benchmark was not rerun for this iteration.

Automation lives in `tests/simulation.test.js`, `tests/browser.mjs`, `tests/layout.mjs` and `tests/production.mjs`. Reports and temporary captures are written to the ignored `test-results/` directory.

Not verified: Safari/Firefox, actual touch hardware, older-Mac performance, physical plant-care accuracy, or student usability outcomes.

## Local user-feedback refinement · 2026-10-20

- 27 Node tests passed: the existing 20 ecological-state tests and seven procedural-model tests for scale, staged foliage, transition duration, transient growth cue, health-driven vigor, resource reuse and reduced motion.
- All 22 Chromium acceptance checks passed after the renderer and model changes, including free repeated planting/movement, water/light, camera invariance, reset/clear, idle suspension and mobile alternatives.
- The focused tests/growth.mjs workflow passed: a real Next Day animates actual simulated growth, then settles; four-species visual extremes do not mutate simulation state. Seedling, mature and wilted captures were inspected.
- Rotation comparisons are recorded in docs/performance.md. This iteration remains local and uncommitted, as requested. Follow-up user acceptance is pending.

## Release verification · 2026-10-21

The author approved release of the previously local refinement. All 27 Node tests and the production build passed again before publication. The existing interaction and growth checks above apply to this source revision.

## Local tools/camera/capacity checks · 2026-10-22

The focused tests/tools.mjs workflow passed four groups: water hover/highlight/drag without unintended data changes; fixed clickable lamp with two controls; direct target drag with health preservation and exact Escape restoration; rotated-view aiming, zero-intensity handle availability, keyboard aiming and visible camera reset. No JavaScript/WebGL console errors were reported. Desktop (1440 × 900) and mobile (390 × 844) captures were inspected; the mobile page and Next Day fit the viewport. Production compilation passed. Ecological rules were unchanged, so the full simulation/interaction/layout suites were not rerun for this iteration. Participant follow-up is pending. Changes remain local only.

### Prop-hover/clutter follow-up · 2026-10-22

The focused tools workflow passed after removing the central reminder and bottom dock. It checks absence of the removed UI, visible hover shells, unchanged can material emission/color, small lift and return, ecological-state invariance on hover, real watering, fixed-lamp selection, direct/rotated-view aiming, exact cancellation and keyboard access. Screenshots were inspected. Production compilation passed. Full suites were not repeated.
