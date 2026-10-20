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

## User testing (pending)
No user testing has been conducted. Suggested session: invite 3–5 students to plant two species, compare placement, adjust light and water, advance time, then distinguish Reset from Clear. Record completion, confusion, observations, and consent before collecting feedback.

## Changes after testing (pending)
Record actual feedback, evidence, and resulting changes here. Do not substitute automated checks for user research.
