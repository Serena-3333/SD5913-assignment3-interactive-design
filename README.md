# Pocket Terrarium

SD5913 Assignment 3 — Interactive Design

**[Open the live demo](https://serena-3333.github.io/SD5913-assignment3-interactive-design/)**

A tiny botanical experiment for university students taking a two-to-three-minute break. Choose plants, arrange their environment and discover how they respond. No score, tasks, accounts or purchases.

![Actual application screenshot](docs/screenshots/planted-terrarium.png)

## Run locally

Use Node.js 22.12+ (20.19+ is also supported).

```sh
npm install
npm run dev
```

Open the address printed by Vite.

## Explore

- Plant **one to five individuals**, including repeats of the same species. The count above the jar states “N planted · max 5”; one plant is enough and filling the jar is optional. Drag a card onto any suitable soil point; a translucent preview shows local comfort. There are no fixed planting slots. Roots need a little separation and must stay inside the soil.
- Drag an existing plant with the **left mouse button** to move that individual. Each plant has its own ID, health, growth and local conditions. The × beside its name removes only that plant.
- The visible instruction above the jar explains **hold the right mouse button and drag to rotate** (two fingers on touch screens). **Reset view** restores the camera. Camera movement changes no ecological data.
- Hover over the watering can for a gentle lift, warm outline, grab cursor and brief instruction, then drag it onto any soil patch. Its visible footprint can cover neighbouring roots; wetness stays in the soil when a plant moves. Water also has click-to-aim and arrow-key/Enter alternatives.
- **Drag the light spot on the soil** to aim light directly, including over plants and from rotated views. Select Light or click the fixed lamp to reveal **Range** and **Intensity**. The lamp body stays in place. Clicking the lamp exposes a small aim point, including when intensity is zero; Escape cancels an unfinished aim. Light and comfort update immediately; health waits for the next day.
- Click **Next Day** after planting at least one individual. An empty jar explains why the button is disabled. Each plant reports its actual health change and a short cause, such as “Health −8 · soil too dry”. The scene title also responds to the garden's state.
- Plants begin as small seedlings and become roughly twice as large at maturity, with new foliage unfolding in stages. Next Day eases into the new size and posture with a brief growth cue; poor health reduces vigor and yellows/droops foliage. Reduced-motion preferences skip the transition.
- The heading and collection explicitly guide the first planting, without another central reminder note. Each plant labels **Comfort now**, **Health** and **Growth**. Short current causes guide experimentation; **Last day · Day XX** identifies a recorded outcome, not a prediction. The initial guide explains starting soil moisture; no running average or local water/light numbers are shown.
- Cards describe preferences in words, encouraging observation rather than matching ideal-range numbers. The experiment's internal suitability rules remain deterministic.
- Click a card, focus the scene and use arrow keys/Enter to plant at a free coordinate. Escape or pointer cancellation abandons an unfinished gesture without changing the garden.
- The plant drawer waits before sliding closed at five plants. Close it earlier with × and reopen the **Plants** tab anytime. On phones, choosing a card closes the overlay so the soil stays accessible.
- **Reset** preserves plant identities and positions while restoring day, water, lamp, health and growth. **Clear** starts with an empty jar. Both require confirmation and reopen the drawer.

## Build, verification and deployment

```sh
npm test
npm run build
npm run preview
```

The production preview uses the project path printed by Vite. The Vite base is `/SD5913-assignment3-interactive-design/` for production; development serves at the root. Font URLs are rewritten by the build, and the favicon uses Vite's base placeholder.

Optional browser checks (keep the development server running):

```sh
npx playwright install chromium
npm run test:browser
npm run test:layout
npm run test:performance
```

Set `TERRARIUM_TEST_URL` if the development server uses a different address. `npm run test:production` checks the production preview; `TERRARIUM_PREVIEW_URL` can point it at another preview or the live site.

The GitHub Actions workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml) runs simulation tests, builds the project and deploys `dist/` to GitHub Pages on pushes to `main`. The deployment follows [Vite's project-site guidance](https://vite.dev/guide/static-deploy.html#github-pages). The demo is static and needs no backend or secret API keys.

## Project structure

- `src/simulation/`: independent JavaScript for plant identities, free positions, local water/light, comfort, daily changes and reset.
- `src/scene/`: procedural plant/jar/tool geometry, batched leaves and gravel, lighting and animation.
- `src/interactions/plantDrag.js`: soil raycasting, free placement/movement, tool gestures, right-button orbit separation and keyboard controls.
- `src/ui/`, `src/styles/`: responsive paper notes, qualitative preferences and per-plant change explanations.
- `tests/`: simulation, real-browser interactions, layout, rendering budget and production-path checks.
- `PROCESS.md`: actual design decisions, iteration and AI-tool use. [User-testing notes](docs/USER_TESTING.md) distinguish supplied tester observations from developer validation and pending follow-up.

## Credits

- **three.js** — 3D rendering, OrbitControls, Raycaster and geometry utilities; MIT. [Project](https://threejs.org/).
- **Vite** — development server and production bundling; MIT. [Project](https://vite.dev/).
- **Playwright** — browser interaction, rendering and deployment checks; Apache-2.0. [Project](https://playwright.dev/).
- **Fredoka** — Fredoka Project Authors; SIL Open Font License 1.1. [Bundled license](public/fonts/Fredoka-LICENSE.txt), [font source](https://github.com/hafontia/Fredoka-One).
- **DM Sans** — DM Sans Project Authors; SIL Open Font License 1.1. [Bundled license](public/fonts/DM-Sans-LICENSE.txt), [font source](https://github.com/googlefonts/dm-fonts).
- **Libre Caslon Display** — Libre Caslon Display Authors; SIL Open Font License 1.1. Bundled from the earlier visual direction. [Bundled license](public/fonts/Libre-Caslon-Display-LICENSE.txt), [font source](https://github.com/impallari/Libre-Caslon-Display).
- **Visual references** — user-supplied screenshots from Xiaohongshu, including [Garden Galaxy](https://store.steampowered.com/app/1970460/Garden_Galaxy/) by Anneka Tran, a stylized island/lighthouse reference credited in the supplied screenshot to “ubrilliantidiot”, illustrated game interfaces, paper-note examples and a photographed terrarium. Original post URLs and some creators were not supplied, so that attribution remains incomplete. They informed layout, colour, material and composition only. Reference images are not included in the app as backgrounds, textures or models; scene geometry and UI are authored in code.
- **AI assistance** — OpenAI Codex assisted implementation, procedural modeling, iteration, debugging, tests and documentation, with guidance from the user-invoked 3dviz-pro-max skill. No generated raster image replaces the interactive scene, and the running app calls no AI service. See [PROCESS.md](PROCESS.md).

## Limits

This is a stylized, deterministic learning experiment, not calibrated plant-care advice. It omits physical fluids, moisture diffusion, mutual shading, root competition, accounts and persistence; reloading begins a fresh garden. Plants have freely chosen root positions with a small minimum separation, rather than collision-resolved foliage. Mouse/touch layouts are adapted, but physical touch devices and student usability sessions remain unverified. Rendering stays at the device pixel ratio, capped at 2; batching, cached shadows and idle/background suspension reduce work without automatic blurring. See [performance notes](docs/performance.md) for earlier diagnostic measurements rather than universal frame-rate claims.
