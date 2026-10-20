# Pocket Terrarium — development record

## Initial concept · 2026-10-20

An unhurried, two-to-three-minute ecological experiment for university students. The user chooses and arranges plants and changes environmental conditions; plant responses follow deterministic rules. No scores or progression economy.

## Why real 3D

P1 establishes the warm three-column interface. P2–P4 inform faceted, volumetric botanical models and miniature soil terrain. A real scene allows orbiting, world-space light placement, raycast planting, and meaningful spatial experiments. Reference images are visual guidance only; no reference image is used as a background, texture, or model.

## Design and technical choices

- Vite, vanilla ES modules, and Three.js; no backend or UI framework.
- Simulation is immutable JavaScript with no renderer dependency.
- Three fixed slots constrain placement and make comparisons understandable.
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

## User testing (pending)

No user testing has been conducted. Suggested session: invite 3–5 students to plant two species, compare placement, adjust light and water, advance time, then distinguish Reset from Clear. Record completion, confusion, observations, and consent before collecting feedback.

## Changes after testing (pending)

Record actual feedback, evidence, and resulting changes here. Do not substitute automated checks for user research.

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
