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
