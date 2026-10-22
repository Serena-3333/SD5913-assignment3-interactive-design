# Pocket Terrarium — development record

## Initial concept · 2026-10-20

An unhurried, two-to-three-minute ecological experiment for university students. The user chooses and arranges plants and changes environmental conditions; plant responses follow deterministic rules. No scores or progression economy.

## Why real 3D

P1 establishes the warm three-column interface. P2–P4 inform faceted, volumetric botanical models and miniature soil terrain. A real scene allows orbiting, world-space light placement, raycast planting, and meaningful spatial experiments. Reference images are visual guidance only; no reference image is used as a background, texture, or model.

## Design and technical choices

- Vite, vanilla ES modules, and Three.js; no backend or UI framework.
- Simulation is immutable JavaScript with no renderer dependency.
- The initial MVP used three fixed slots; the current version supports one to five independently positioned plants, including repeated species.
- Comfort is live; health and growth change only after advancing a day.
- Simplified transparent glass preserves plant visibility and avoids costly refraction.
- Collection thumbnails use the very same procedural models as the main scene.

## AI tools

Codex assists with implementation, procedural geometry, debugging, tests, and documentation. All plants and scene props are built from geometry in source; no generated image replaces the live scene. No AI API is called by the application.

## Implementation log

- 2026-10-20: Inspected the empty project directory and the supplied MVP brief. Read all four supplied references. Created Vite project scaffold and this record before implementing features.
- 2026-10-20: Implemented pure simulation functions and Node tests, then built procedural plants, layered soil, transparent glass, a draggable lamp, and a watering can. Connected drag planting, preview, swapping, click/keyboard alternatives, confirmation dialogs, and deterministic observations.
- 2026-10-20: Ran nine simulation tests successfully. Built a real Chromium acceptance workflow and passed all 18 checks, including actual pointer-based plant exchange, lamp-head drag, 3D-can click, cancellation, camera invariance, repeat-click protection, reset/clear, and a 390 px mobile viewport. No JavaScript/WebGL console errors were observed in this workflow.
- 2026-10-20: Visual QA found that the original camera made the jar too small and warm lighting washed out materials. Enlarged the jar, moderated the lights, adjusted prop placement, and stored fonts locally. Narrow-screen QA prompted an adaptive field of view. The environment panel now expands rather than clipping conditions when three plants are present.
- 2026-10-20: Generated actual application screenshots and verified a production build. Separated Three.js into its own cached bundle. Kept npm's lockfile for the requested npm workflow and provided a macOS launcher for the available local runtime. These are developer checks and visual QA, not student user-testing results.
- 2026-10-20: Re-ran all 18 browser checks after the layout refinements. Re-ran the nine simulation tests through the npm script and rebuilt production assets successfully. Served the production build with `npm run preview`; Chromium returned HTTP 200, planted Moss and Fern, advanced to Day 02 with moisture 51, and reported no JavaScript/WebGL console errors. Inspected the captured orbit view and the two-/three-species screenshots.

## User testing

The project author reported user testing on 2026-10-20: interaction remained sluggish, especially camera rotation, and numeric growth/health changes were much easier to notice than plant changes. Participant counts, session methods and task-completion data were not provided. These are author-reported findings, not sessions conducted by Codex. Further testing should check whether the revised rotation and plant transitions resolve those observations.

The author subsequently supplied eight tester-feedback screenshots on 2026-10-21. Findings, evidence limits and changes are recorded in [docs/USER_TESTING.md](docs/USER_TESTING.md). Follow-up user testing of the revised interface remains pending.

## Changes after testing

The local rotation and growth refinement below responds to the reported feedback. Follow-up user acceptance is pending; automated checks are recorded separately.

## Spatial / illustrated refinement · 2026-10-20

- Used the user-invoked 3dviz-pro-max skill: read object reasoning/craft, lighting direction/scale, visual review and frame-inspection guidance. Created custom procedural geometry and materials; did not retrieve or claim a catalog kit.
- Changed the visual direction to pear green, butter yellow and turquoise paper shapes, thick rounded strokes, locally bundled Fredoka typography, and contextual tool controls. Removed repeated guidance and long journal text.
- Reduced jar dimensions and tightened planting positions. Added an uneven terrain surface connected to the soil sides, layered gravel, stones and a branch. Differentiated plant height and volume, replaced primitive leaves with closed faceted geometry, and used restrained Fresnel glass plus broad highlights.
- Replaced the shared water scalar with a spatial sample field. Drag watering has a visible 0.55-unit footprint, bounded local changes and per-plant readouts. Water remains at world coordinates after a plant swap. The can lifts above the rim before crossing into the jar.
- Added a shared lamp frame for its base, arm, head, real spotlight and numeric cone. Orbit, reach, aim, beam width and power are independent controls. Escape restores an uncommitted lamp gesture. Camera motion changes no ecological state.
- Passed 16 updated simulation checks and 22 real-browser acceptance checks. A camera-invariance assertion was adjusted from bitwise floating-point equality to a 0.00001 position tolerance to account for residual OrbitControls damping.
- Inspected overview, water preview, orbit, isolated-light and light-off frames. Source isolation prompted a final correction to custom-leaf face winding; corrected surfaces were re-inspected. Also seated tool bases and connected terrain edges. These checks do not constitute student usability testing.

## User feedback refinement · 2026-10-20

- Fixed Reach: extending the arm now translates the light aim along the lamp's radial axis. The real spotlight, terrain footprint and deterministic light readings continue to share that aim. Direct targeting and Escape restoration remain absolute.
- Increased the watering radius from 0.55 to 0.82 model units. Watering can freely target any soil point; a point between two roots waters both with tapered strength. Removed the three-spot watering UI. Arrow keys move a continuous target and Enter pours as a keyboard alternative.
- Replaced reminder bubbles with paper notes using tape, ruled/dotted stock and subtle paper shadows in the existing palette. Removed Little observations and its unused journal code.
- Added manual collection collapse/reopen and automatic collapse after the third species. The released column expands the scene; preferences remain available. Confirmed Reset and Clear reopen the collection, while cancelling keeps the existing layout.
- Passed 18 simulation tests and 22 real-browser acceptance checks, including actual footprint vertex movement with Reach, free midpoint watering and collection width changes. Inspected the revised planted view and water preview, and regenerated application screenshots. Production build succeeds. These are developer checks; no student user research is claimed.

## Fitted paper desk and rendering performance · 2026-10-20

- Responded to the user's report of sluggish interaction and incomplete paper styling. Applied the previously invoked 3dviz-pro-max guidance to reuse geometry and park static rendering, preserving the procedural plant silhouettes and growth poses.
- Profiled the representative three-species scene before changing rendering: 375 draws, 12,854 triangles and a 66.6 ms median frame interval in headless Chromium at 1440 × 900, device scale 2. Batched repeated blades/veins, merged static gravel, cached shadow maps, removed unused hover raycasts, paused hidden-tab rendering and added adaptive canvas resolution. The final check measured 85 draws, the same triangle count and a 32.4 ms median frame interval. These headless diagnostics do not certify every physical Mac's frame rate; see docs/performance.md.
- Changed both full sidebars and plant cards into paper notes with tape, subtle grain, folded corners and uneven lower edges. Moved Day, Next Day and reset/clear into a separate right-side note below Feeling good.
- Replaced immediate collection hiding with a 1.4-second pause and a 420 ms slide, retaining a narrow Plants tab. The canvas resizes after the slide rather than reallocating its drawing buffer on every animation frame. Reopening/Reset cancels pending timers; reduced-motion preferences skip the slide. Hovering or using keys in the collection cancels pending automatic closure.
- Kept the page within the viewport, with compact notes for short windows and a drawer for narrow windows. Fixed control-row occupancy after a real drag check exposed that newly revealed controls moved the soil target during a gesture.
- Passed all 18 simulation tests, 22 real-browser acceptance checks, the seven-size layout/animated-drawer workflow and the representative rendering-budget check. Inspected expanded, collapsed, sliding, short-window and mobile frames and regenerated application screenshots. Production build succeeds. No student user-testing results are claimed.

## Clarity correction · 2026-10-20

- The user reported blur after adaptive resolution optimization. Removed that behavior and restored a stable device pixel ratio capped at 2. Slow frames no longer reduce the drawing-buffer resolution.
- Reduced the representative three-plant scene from 12,854 to 8,270 triangles by simplifying small blades, stems, veins, soil subdivisions, gravel and secondary rims. Preserved the broad leaf shapes, plant heights, main rim and curved glass wall. Restricted the shadow floor to the local scene. Instancing, cached shadows and idle/background suspension remain active.
- Removed the “Little plants. Big possibilities.” text and its unused styling from the empty jar.
- The Retina benchmark measured 83 draws, a stable ratio of 2 and a 50 ms median frame interval in headless Chromium. This restores four times the pixels of the prior adaptive benchmark with an explicit sharpness/performance tradeoff, recorded in docs/performance.md.
- Passed the 18 simulation checks, all 22 browser acceptance checks, production build and the Retina slow-frame clarity/budget regression. Inspected the actual 2880 × 1800 capture and regenerated application screenshots. No JavaScript or WebGL errors were observed in the browser workflow.

## Free planting and public release · 2026-10-20

- Replaced three fixed species slots with one to five independent plant instances. Repeated species are allowed; each plant retains its own identity, health and growth when moved freely over the soil. Invalid positions and overlapping roots leave the state unchanged.
- Assigned right-button dragging to camera rotation and left-button dragging to plants and tools. Kept continuous keyboard targeting and touch alternatives.
- Allowed Next Day with one plant, explained the empty state, replaced numeric card preferences with qualitative descriptions, and added per-plant daily health changes with environmental causes. Updated headings and compact status notes for five plants.
- Configured the GitHub Pages repository base, portable runtime instructions, a dedicated Credits section and an automated test/build/deploy workflow. Removed the machine-specific launcher.
- Passed 20 simulation tests, 22 Chromium interaction checks and seven viewport/layout checks. Built production assets and verified the repository-subpath preview: all bundled fonts and favicon loaded, duplicate/free planting worked, daily explanations appeared and right-button rotation worked without JavaScript/WebGL errors. These automated checks are developer validation, not student user research.

## User-tested rotation and growth refinement · 2026-10-20 · local only

- Honored the author's new publication preference: no Git commit, push or deployment for this iteration.
- Found synchronous OrbitControls change events could start an additional animation loop during a rendering tick. Kept the pending frame occupied until the tick schedules its single successor. Settled scenes still park; held camera gestures remain responsive.
- Disabled MSAA at device pixel ratios of 2 or higher and increased camera damping to 0.18. Tested temporary motion resolution 1.5, then retained full device resolution (capped at 2) because full-resolution rotation performed equally well after the scheduler fix. Preserved soft shadows, spotlight shadows, glass and geometry detail. Settled plant rigs reuse local matrices.
- In the same three-species, 1440 × 900, DPR 2 Chromium/Metal Apple M5 diagnostic, the measured median interval during a real right-button drag changed from 450 ms before to 16.7 ms after; the final full-resolution run also measured 16.7 ms, with zero shadow redraws during rotation. These automated hardware-backed browser measurements are not a promise for every physical browser/device.
- Made mature scale just over twice seedling scale at equal health. Structural foliage unfolds across growth bands 20/40/60/80: moss clumps, fern fronds, succulent leaves and Fittonia stems/leaves. Health additionally reduces vigor and increases droop/yellowing without decreasing accumulated structural growth.
- Added a 1.1-second smooth state transition and a reusable brief growth halo. Only actual growth triggers the cue; reduced-motion preferences snap to the result. No new simulation rules or ecological randomness were introduced.
- Passed 27 Node checks (20 simulation plus seven model/animation checks), all 22 browser acceptance checks, and the focused real-Next-Day/four-species visual workflow. Inspected seedling, mature and wilted captures. Render diagnostics and captures remain in ignored test-results/. Follow-up user acceptance and cross-device measurements remain pending.

## Approved release · 2026-10-21

The author explicitly approved committing and publishing the local rotation/growth refinement. Re-ran all 27 Node tests and the production build successfully before release. The earlier local-only entry records the review stage; publication status is tracked by the GitHub Pages deployment workflow.

## Feedback clarity refinement · 2026-10-21 · local review

- Reviewed eight author-supplied conversation screenshots and merged them with the author's six review points. Recorded the actual observations separately from author interpretations in docs/USER_TESTING.md, without publishing private screenshots, contact identity or invented participant metrics. The underlying video clips were not available for inspection.
- Implemented only approved items 1–4: explicit first-plant guidance and grab cues; empty-state instructions and a secondary jar-average overview; visible metric meanings and a dated historical health change; readable current local causes with actionable water/light advice. Deferred tool/lamp redesign, rotation cues and capacity layout.
- Kept ecological rules unchanged. Current advice derives from the same preference ranges and weighted suitability; both water and light issues remain visible. Daily records keep their original values, date and cause as the current environment changes.
- The first-plant cue is a finite CSS animation and respects reduced-motion preferences; no new 3D rendering work is added. Follow-up user acceptance is pending. This iteration is not committed or published without further approval.

## Compact feedback after author review · 2026-10-21 · local only

The author reviewed the actual UI captures and requested shorter plant notes and removal of average-water UI. Removed repeated action explanations and exact local water/light readouts; retained short current causes, comfort, health, growth and a compact dated historical health delta. Moved the historical cause to the tooltip. Removed Jar overview; initial 60% moisture is explained only during empty-state onboarding. Recorded this author-review iteration in docs/USER_TESTING.md. Simulation and rendering are unchanged. No commit or publication was authorized.

## Direct tools and visible controls · 2026-10-22 · local only

Implemented the author-approved remaining feedback items: tool hover cues, a persistent light-target handle, direct soil-footprint aiming, a fixed clickable lamp with only Range/Intensity, visible camera instructions and Reset view, and explicit planted/max capacity text. The overlay tracks the same world target as the spotlight and simulation; it does not add another ecological state or continuous animation loop. Hover updates are event-driven and coalesced. Escape restores uncommitted aim; ordinary camera movement changes no simulation data. User-testing notes separate these changes from the still-pending participant follow-up. No Git commit, push or deployment is authorized for this iteration.

Focused validation for this iteration: four tool/camera/capacity workflow groups passed, including hover feedback without data mutation, actual water application, fixed lamp pose, direct aiming after camera rotation, zero-intensity/keyboard aiming and exact Escape restoration. No JS/WebGL console errors were observed; desktop/mobile captures were inspected and production compilation passed. Full regression suites were not rerun.

## Reduced visual clutter and prop hover · 2026-10-22 · local only

Responded to the author's screenshot review by removing the redundant planting note, persistent sun/Drag light badge and bottom tool dock/instruction. Retained top-level planting guidance, direct prop gestures and keyboard focus access. Light settings now overlay the scene only when the fixed lamp is selected, avoiding layout shifts during aiming. Replaced material brightening with warm back-face outline shells sharing the prop geometry; the can additionally eases 0.09 units upward and settles back on pointer departure. The lamp does not lift. Focused checks confirmed unchanged ecological data/material colors, hover outlines/lift/restoration and continued water/aim/cancellation/keyboard behavior, with no JS/WebGL errors. Production compilation passed; captures were inspected. Updated docs/USER_TESTING.md and kept all changes local.


## Soil feedback and plant lifecycle · 2026-10-22 · local only

- Restored the original header and favicon after the author rejected the replacement. Retained the previous card-color fix and stationary tool hints. Unified placement/tool/interface hover hints with a translucent fill; replaced native opaque title hints with anchored HTML popups.
- Strengthened the local dry/normal/wet soil palette. Added a preallocated deterministic Voronoi crack mesh: local moisture below 20% controls width/opacity, and watering closes cracks. It follows the actual faceted soil surface, adds one draw only when dry, and updates only when the moisture field changes.
- Added an explicit lifecycle rule: post-update health below 25 for three consecutive Next Day actions causes death. Recovery to 25 or higher clears the streak; warning days are visible. Dead plants keep their identities, positions and structural growth, remain as collapsed brown models, stop uptake/growth and cannot recover through ordinary care. Reset explicitly starts them alive again. Status notes announce death and its day instead of offering misleading live comfort/care diagnoses.
- Developer validation: 36 Node tests passed, including threshold boundary/recovery, irreversible death, dead-root consumption, reset, four-species dead poses and soil feedback. The lifecycle browser check exercised actual watering and daily progression through warnings/death, persistent corpses/cracks and reset; tool checks and all 22 existing browser acceptance checks passed with no JavaScript/WebGL errors. Inspected actual wet/dry/dead captures. These checks are implementation validation, not a new participant user test. No commit, push or deployment is authorized.


## Simpler planting and critical feedback · 2026-10-22 · local only

Author review requested removing the Health hover hint, simplifying the low-health warning to “Critical” without a death countdown, and emphasizing the associated Health label/value. Removed the corresponding native/custom hints and retained the lifecycle calculations unchanged. Consolidated visible planting-method instructions in the plant collection; the central empty heading is neutral, the empty status note only explains initial moisture, and selection feedback only names the selected plant. Keyboard instructions remain in optional Help. This is author review, not a new participant test. Changes remain local.


## Publication approved · 2026-10-22

The author approved publishing the accumulated local soil/lifecycle and UI refinements. All 36 Node checks and the production build passed before submission. The prior local-only entries document the review stage; the published revision and deployment result are tracked in Git and GitHub Actions.
