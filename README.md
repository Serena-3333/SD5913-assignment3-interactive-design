# Pocket Terrarium

**A Tiny World Shaped by Your Choices**

A working, browser-based miniature ecology experiment for university students who want a quiet two-to-three-minute break. You choose plants, arrange their environment, and observe their responses. There are no scores, tasks, purchases, accounts, or backend services.

![Pocket Terrarium, captured from the running application](docs/screenshots/planted-terrarium.png)

## Run locally

Use Node.js **22.12+** (Vite also supports Node 20.19+):

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal, normally `http://127.0.0.1:5173/`.

```sh
npm run build      # production files in dist/
npm run preview    # preview the production build
npm test           # deterministic simulation tests
```

On this Mac, you can also double-click **Start Terrarium.command** after dependencies have been installed. It uses an installed Node or the Codex desktop bundled runtime. This development environment did not expose Node/npm on the default terminal PATH; development and validation used the bundled Node and an npm CLI. No shell profile or system installation was changed.

## Explore your world

1. Drag a collection plant onto a highlighted soil ring. A translucent version previews its live comfort; release to plant.
2. Alternatively, click a plant card, then a ring or named spot button. Keyboard: Tab to a card, Enter, then Tab to a spot and Enter.
3. Drag an existing plant to move it or exchange it with another plant. Alternatively, click its named spot, then another spot. Escape cancels selection or an unfinished plant drag.
4. Drag empty space to rotate; scroll to zoom. The small circular arrow restores the view.
5. Drag the 3D lamp head horizontally to change the plants' light. The slider provides a keyboard-accessible alternative.
6. Click the 3D watering can or **Click to water** to add 18 moisture points, capped at 100.
7. **Comfort** responds immediately. After planting at least two species, **Next Day** consumes water, then updates health and growth. The 800 ms transition prevents double advancement.
8. **Reset Experiment** keeps your species and positions and resets the other values. **Clear Jar** removes everything. Both have confirmation dialogs; Escape dismisses the dialog.

The jar has three fixed world-coordinate spots and allows one of each species. All four collection thumbnails are rendered from the same procedural 3D models used inside the jar, using one renderer rather than four continuously running contexts.

## Technology and structure

Vite 7, vanilla JavaScript ES modules, HTML/CSS, Three.js 0.180, OrbitControls, and Raycaster. Playwright is a development-only dependency for browser acceptance checks. Fonts are stored locally with their OFL licenses; the application needs no CDN, API, database, or remote assets after installation.

```text
src/
  main.js                     Shared application state and event orchestration
  scene/
    createScene.js            Renderer, camera, orbit limits, state interpolation
    terrarium.js              Glass, rim, layered soil, rocks, planting rings
    plantFactory.js           Moss, Fern, Succulent, Fittonia and thumbnails
    lamp.js                   World-coordinate lamp and visual spotlight
    wateringCan.js            Watering can, tilt, and droplets
  simulation/
    species.js                Species preferences and slot/lamp coordinates
    simulation.js             Pure deterministic simulation; no Three.js import
  interactions/
    plantDrag.js              Raycasting, pointer drag, ghost, move/swap/cancel
  ui/
    uiController.js           Interface, feedback, animated numbers, confirmations
    journal.js                Observations derived from actual state
    icons.js                  Original inline SVG interface icons
  styles/main.css             Responsive three-column interface
tests/
  simulation.test.js          Node's built-in test runner
  browser.mjs                 Real-browser acceptance workflow
docs/screenshots/             Screenshots captured from the working WebGL page
PROCESS.md                    Honest concept, decisions, AI use, testing record
```

## Simulation

The source of truth is `src/simulation/simulation.js`. New experiments begin at day 1, moisture 60, lamp `{x: 1.7, z: -1.8}`, and no plants. New plants begin with health 70 and growth 20.

- Light: `clamp(85 - 22 * distanceXZ(lamp, slot), 20, 85)`.
- Range suitability: `clamp(1 - distanceToRange(value, min, max) / 25, 0, 1)`.
- Comfort: `moistureSuitability * 0.55 + lightSuitability * 0.45`.
- Daily drying: rounded evaporation `4 + averageLight / 25`, plus two moisture points per plant.
- After drying, health changes by `round(20 * (comfort - 0.75))`, bounded to 15–100.
- Growth increases by 8 at comfort ≥ 0.80, by 3 at ≥ 0.55, otherwise by 0; updated health below 40 inhibits growth. Growth caps at 100.

Moving, watering, and adjusting the lamp preserve health and growth. Camera movement changes no simulation state. Invalid planting returns the original state. Visual geometry uses deterministic placement patterns and no random growth events. The numerical preferences are an experiment model, not botanical care advice.

Health is reflected in material color and leaf droop; growth changes overall size and reveals additional leaves. Existing meshes interpolate to the new values instead of being replaced.

## Verified

Actual automated results recorded on **2026-10-20**:

- **9 simulation tests passed**: distance light/clamps, range boundaries/weights, water cap, daily drying, health/growth/bounds, reset, capacity/uniqueness/swaps, live light changes, and determinism/species differences.
- **18 browser acceptance checks passed in Chromium**: initial UI/thumbnails, true raycast dragging/preview, invalid drop, Escape, pointercancel, keyboard fallback, drag swapping, empty-slot movement, 3D lamp dragging, 3D watering, water cap, daily update/repeat guard, camera invariance, reset/cancel, all four models/capacity, clearing, mobile fallback, and no JavaScript/WebGL console errors.
- Production build completed successfully. Screenshots show the actual WebGL application.

To rerun browser checks, keep the dev server running in another terminal:

```sh
npx playwright install chromium   # first run only
npm run test:browser
```

Reports and temporary QA images go to the ignored `test-results/` folder. Browser checks also refresh documentation screenshots. Set `TERRARIUM_TEST_URL` if the dev server uses a different port. The automated suite is not a substitute for real student usability sessions.

## Limits and next steps

- Desktop is the primary target. Narrow screens use a stacked layout, a wider camera field of view, and the click/keyboard fallback; touch ergonomics need device testing.
- The environment panel expands for three plants or longer observations so every plant remains readable; shorter windows can scroll.
- Glass is simplified transparency, not physical refraction. Plant models and soil are procedural, stylized approximations, not external high-resolution assets.
- Only three fixed spots and four species are supported. There is no local persistence; reloading starts a fresh experiment.
- The simple distance-light and shared-moisture model omits shade competition, roots, real weather, and physical fluids by design.
- Browser acceptance was performed in Chromium. Safari/Firefox and a wider range of actual Mac hardware have not been verified. WebGL/hardware acceleration is required.

Next priorities: observe 3–5 students using drag versus click, improve fern silhouette/leaf distribution and contact-shadow softness, then tune touch targets and profile Safari/older Mac performance. Record actual findings in `PROCESS.md` before claiming user-tested improvements.
