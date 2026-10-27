# Pocket Terrarium — Design and Development Process

SD5913 Assignment 3 — Interactive Design

This record brings together the concept, design decisions, user feedback, technical tradeoffs, validation and AI use. It is organized by topic rather than individual edits. It describes the version published on 23 October 2026; documentation was consolidated on 27 October 2026. Detailed implementation history remains available in Git.

## Concept and intended experience

Pocket Terrarium is a botanical experiment for university students taking a two-to-three-minute break. Users choose plants, arrange a miniature environment, change water and light, and observe the consequences. There are no scores, tasks, coins, accounts or purchases. The aim is curiosity rather than completion.

Users influence growth through environmental choices instead of directly commanding plants to grow. The cycle is **choose → place → arrange → adjust → advance time → observe → experiment again**. One plant is enough to begin; five is a capacity limit, not a goal.

The initial brief combined a confirmed 2D interface with references for a richer miniature world. Real 3D makes spatial choices meaningful: users inspect plants from different angles, plant through raycasting and aim water/light at world coordinates. A static illustration cannot support those experiments. HTML/CSS provides readable controls; Three.js provides the jar, plants, soil, tools and lighting.

## Visual direction and interface

### Final visual language

The visual direction combines a bright low-poly terrarium with a warm botanical scrapbook. Procedural geometry gives each species a distinct silhouette: low, irregular Moss cushions; tall, feathered Fern fronds; compact Succulent rosettes; and medium-height Fittonia with broad veined leaves. Different heights, uneven rear terrain, layered soil, restrained rocks and a branch form a miniature landscape. Collection thumbnails come from the same plant models as the jar.

Simplified transparent glass, a colored rim and broad highlights preserve plant visibility without costly refraction or caustics. Growth affects scale and staged foliage; health affects vigor, color and droop. A roughly 1.1-second transition and brief growth cue make daily development visible. Dead plants remain as brown, collapsed models.

The UI retains cream paper, sage/pear green, butter yellow, turquoise and restrained coral accents. Fredoka supplies rounded headings and DM Sans supports instructions/data. The three-column structure contains the collection, scene and conditions. Taped panels, folded plant cards and uneven paper edges connect the UI to the botanical backdrop. Day controls occupy a separate note below the conditions.

The product title and scene heading originally competed for attention. The final desktop hierarchy uses a 32px product title and smaller 24px scene heading, with quieter capacity/instruction text. The central information group sits higher, while the status column is a responsive 306–350px with internal row spacing. Short windows permit internal panel scrolling while the page stays within the viewport. A delayed slide closes the collection at capacity; a Plants tab reopens it. Reduced-motion preferences skip unnecessary transitions.

### Alternatives and design lessons

| Exploration | Decision and reason |
| --- | --- |
| Fine-line editorial UI | Replaced with rounded type and paper forms to match the playful miniature world. |
| Wooden tabletop and cloth/mat | A fixed background table and rotating world-space mat produced inconsistent perspective. A shared 3D table corrected the mismatch, but the author still preferred botanical paper. The table/cloth and unused assets were removed. |
| Notebook panels with rings and covers | Both interpretations were rejected by the author. Original taped notes were restored; useful hierarchy and plant/status linking changes were retained. |
| Repeated instruction notes, slogans and long observations | Removed because they repeated information and competed with the scene. The collection is the single visible home for planting instructions; optional Help retains alternatives. |

The final background is ivory grid paper with low-contrast botanical art near the margins. No UI, models, shadows, table or cloth are baked into it. It decorates the page behind the real scene.

![Actual application after the approved interface and framing changes](screenshots/planted-terrarium.png)

*Actual application capture from the approved October 23 revision. This is the retained final screenshot; temporary test captures are stored separately in ignored `test-results/`.*

## Interaction and ecological feedback

The first prototype used three fixed slots and shared moisture. This simplified placement but limited experimentation. The final version allows one to five freely positioned individuals, including repeated species, with water stored in the soil rather than attached to a plant.

| Decision | Purpose and resulting behavior |
| --- | --- |
| Free planting and individual IDs | Plants retain health/growth when moved. Soil boundaries and root separation reject invalid placement without changing the garden. New positions immediately change local conditions. |
| Left-button interaction, right-button rotation | Separates manipulation from observation. Visible instructions and Reset view reveal the camera controls. Click-to-place, keyboard targeting and touch alternatives remain available. |
| Local watering | The can targets any soil point. Its 0.82-unit footprint can cover neighboring roots, encouraging arrangement decisions. Water tapers with distance, is capped at 100 and remains in place when plants move. |
| Direct light targeting | The lamp body stays fixed. Users drag the soil light spot and adjust Range/Intensity. Spotlight, footprint and simulation share the target, avoiding awkward lamp-body dragging from frontal views. |
| Temporary tool cues | The can lifts and outlines; the lamp outlines and brightens visually. Translucent hints stay beside objects. No permanent floating animation is needed. |
| Bidirectional plant/status linking | Hover a plant to highlight its row; hover or keyboard-focus the row to outline the individual. IDs distinguish repeated species. Leaving, cancelling, rotating or deleting clears the link. |
| Live versus daily results | Comfort/current causes respond immediately. Health/Growth change after Next Day. A dated Last day record describes a completed outcome, not a forecast. |
| Reset versus Clear | Reset preserves plant IDs/positions and restores initial experiment conditions; Clear returns to an empty jar. Both require confirmation and reopen the collection. |

Comfort combines moisture/light suitability with weights of 55%/45%. Values outside species preferences reduce suitability deterministically. Each day first dries local soil through light-dependent evaporation and nearby living-root uptake, then updates comfort, health and growth. Suitable conditions support growth; poor conditions reduce health. These are experiment rules, not calibrated horticultural guidance.

Soil starts at 60% moisture. This appears only in empty-state guidance; running averages and exact local water/light readouts were removed. Qualitative preferences and short causes such as “Too little light” or “Soil too wet” encourage interpretation instead of number matching. Comfort, Health and Growth remain distinct.

Water visibly darkens affected soil. Local moisture below 20% gradually reveals cracks, which fade after rewatering. Health below 25 for three consecutive completed days causes death; recovery to at least 25 clears the warning streak. The UI shows **Critical**, emphasizes Health and avoids a death countdown. Dead plants show **Dead** and the death day, stop growing/using water, and remain until removed or reset.

## Technical choices and performance

### Architecture and constraints

Vite, vanilla JavaScript ES modules and Three.js provide a small static application without a backend, large UI framework or paid service. Simulation functions are independent of Three.js and return updated state without mutating the previous garden. UI and scene consume that same state; camera movement, hover and material brightness do not determine ecology.

Scene construction, procedural models, simulation, interactions and UI have separate responsibilities. One renderer also generates collection thumbnails. Raycasting resolves placement/selection, with plant/tool gestures taking precedence over camera controls. Escape/pointer cancellation abandon unfinished gestures. Models, outlines and listeners release their resources when removed or disposed.

The production base matches the GitHub Pages repository subpath so fonts, favicon and assets resolve correctly. Dependencies/fonts are bundled locally. Portable npm instructions replaced machine-specific launchers. GitHub Actions tests, builds and deploys approved pushes to `main`.

### Performance and rendering

Responsiveness and sharpness became paired requirements after user feedback. Lowering pixel ratio during slow frames improved timing but visibly blurred the scene and was rejected. The final renderer keeps device resolution capped at DPR 2, including during rotation, and reduces unnecessary work instead:

- Batch repeated leaves/veins, merge static gravel and simplify secondary geometry while retaining silhouettes and glass contours.
- Cache shadows, refreshing them when lights/casters change rather than during pure camera rotation.
- Keep one scheduled rendering loop, park settled scenes, suspend hidden tabs and avoid redundant hover raycasts.
- Disable MSAA on Retina displays and use damping of 0.18. Temporary motion resolution was tried but not retained after fixing the scheduler.
- Reuse geometry for hover outlines and cache composition bounds. An orientation-aware camera limit leaves space for the jar, resting can, lamp and base at the closest permitted zoom; the shadow receiver extends beyond the visible composition to avoid exposing its rectangular edge.

Two historical diagnostics informed these decisions. Their different graphics conditions mean they must not be combined into one benchmark:

| Context | Recorded comparison | Interpretation |
| --- | --- | --- |
| Earlier headless Chromium, 1440×900, device scale 2, representative three-species scene | Draw calls 375 → 83; triangles 12,854 → 8,270. A temporary DPR 1 version measured a 32.4ms median interval; the sharper DPR 2 revision measured 50.0ms. | Batching/geometry reduction helped; restored sharpness had a measurable cost. Viewport changes and browser scheduling also affect these complete-revision comparisons. |
| Chromium/Metal, Apple M5, 1440×900, DPR 2, three species, actual right-drag rotation | Median interval 450ms → 16.7ms; 95th percentile 983.4ms → 17.6ms; no shadow refreshes during rotation. | Fixing camera-change callbacks that could start extra rendering loops mattered more than lowering resolution. A DPR 1.5 trial also measured 16.7ms, so full resolution was retained. |

These are historical development measurements, not new benchmarks of the final release or universal frame-rate promises. Reports/captures are written to ignored `test-results/`. Other physical devices still require testing.

## User testing and design evaluation

### Evidence and limits

The author reported user feedback about slow rotation and weak visual growth, then supplied eight screenshots of a tester conversation identified as beginning at 12:35. The screenshots include discussion around 12:42 and represent one identifiable tester conversation, referred to here as **P01**. Total participant numbers across the earlier reported testing, device/browser, protocol, completion times and success rates were not supplied. Video thumbnails were visible, but underlying clips were not evaluated.

The author's interface reviews and preferences are distinguished from participant observations below. Private identities, avatars and complete messages are not reproduced. Automated checks establish implementation behavior, not whether participants understood or preferred the changes.

### Findings and design responses

| Finding | Evidence | Response and rationale |
| --- | --- | --- |
| Rotation felt slow; numerical changes were clearer than plant growth | Earlier testing reported by the author | Fix rendering-loop scheduling while preserving sharpness. Make seedlings smaller, mature plants roughly twice their size, unfold foliage in stages and add a short growth transition/cue. |
| Whole-jar water attracted attention without explaining a useful target | P01 thought Soil average should match plant needs; author also questioned its relevance | Remove running average/exact local readings after review. Explain starting moisture and use current qualitative causes to guide care. |
| High comfort with negative Health, or low comfort with positive Health, seemed contradictory | P01 compared these values and interpreted the delta as a forecast | Separate Comfort now from Health/Growth; date the last completed day's actual change and keep its historical cause unchanged during live adjustments. Optional metric help explains the difference. |
| A low percentage did not reveal whether to water or change light | P01 initially missed the small diagnosis | Place current causes above secondary metrics and show both environmental problems when relevant. Later author review removed repeated explanations to keep notes compact. |
| Moving the lamp was awkward; direct targeting was initially undiscoverable | P01 preferred direct light targeting after finding it and questioned lamp movement | Fix the lamp body, prioritize the soil light spot and retain Range/Intensity. Use a short lamp hint and temporary hover response. |
| First action, draggable objects, rotation and capacity were insufficiently clear | Author's six review points, alongside P01's difficulty discovering light control | Keep one explicit collection instruction, grab/focus/hover cues, visible right-drag instructions and Reset view. State “N planted · max 5” and explain one plant is enough. |
| Clutter, cramped data and plant/status matching competed with the scene | Author screenshot reviews | Remove duplicate slogans/docks/notes; retain compact causes; widen/space the status panel; link individuals and rows by ID. Restore original paper styling after rejecting notebook alternatives. |
| Table/mat perspective and clipped scene edges weakened composition | Author visual review | Choose the flat botanical background and protect full-scene framing across viewing angles. |

### Follow-up evaluation

A further participant session should check whether a new user can plant without verbal help, discover local watering/direct light control, explain live comfort versus last-day outcomes and locate the correct individual among repeated species. Growth/death cues, readability and responsiveness should also be tested on the participant's actual display.

No new completion-rate, satisfaction or task-time results have been collected for these revisions. The author's acceptance and publication approval are design/release decisions, not evidence of broader usability improvement.

## Technical validation and remaining limits

This summarizes checks actually recorded in development, distinguishing earlier acceptance coverage from focused checks on later refinements. It does not imply every historical script was rerun after every edit.

| Area | Recorded checks and result |
| --- | --- |
| Rules and model behavior | Latest pre-release run: **40 Node tests passed** on October 23. Coverage includes local water/light, comfort boundaries, caps, daily changes, free/repeated planting, rollback/reset, death/recovery boundaries, cracks, staged growth, reduced motion and outline synchronization/disposal. |
| Core browser acceptance | **22 Chromium checks passed** during functional/lifecycle development: planting/movement, cancellation, keyboard alternatives, local watering, light aiming, camera invariance, capacity/drawer, daily feedback, removal and Reset/Clear. |
| Tools | **Four focused workflow groups passed** for can hover/lift/watering, fixed-lamp controls, aim/cancellation and rotated-view/zero-intensity/keyboard aiming, without recorded JS/WebGL errors. |
| Plant/status linking | **Four focused groups passed** for all species with repeated Moss, both directions, focus/gesture/leave cleanup, removal and return to idle rendering. |
| Layout and camera | **Seven layouts** from 1440×900 through short desktop windows to 390×844 passed viewport/visible-control checks. Default, high, front, back, side and expanded views passed projected-boundary checks without changing ecology. |
| Production and deployment | Builds passed. Repository-subpath preview covered fonts, favicon, WebGL, repeated planting and daily progression. Approved release `6c2a549` was pushed on October 23; its matching JavaScript asset was confirmed live with HTTP 200. |

Checks live in `tests/`: Node test files and the browser, tools, growth, lifecycle, plant-link, framing, layout, performance and production workflows. Run instructions are in README. Application screenshots and temporary test reports are developer evidence, not participant results. This documentation consolidation changes no application behavior and does not claim a fresh test run.

Remaining limits include unverified Safari/Firefox behavior, physical touch hardware and older-Mac performance. The ecology omits moisture diffusion, root competition, mutual shading, physical fluids and weather. There are no accounts or persistence; reloading starts again. Future course-project refinements should prioritize observed usability/device issues over feature expansion.

## AI assistance and asset provenance

Codex assisted implementation, procedural modeling, debugging, testing and documentation under the author's direction. The user-invoked **3dviz-pro-max** skill informed geometry, lighting and visual review. The author supplied the brief/references, reviewed actual results, rejected unsuitable designs, provided tester feedback and approved publication. Blurred rendering, overcomplicated lamp controls and unwanted notebook/tabletop styling were corrected through that review rather than accepted unchanged.

Interactive plants, jar, terrain and tools are procedural Three.js geometry. No downloaded GLB/FBX/OBJ or static rendered image substitutes for them. The generated raster artwork used in the page is the decorative background, created with OpenAI's image tool and encoded as [botanical-journal.webp](src/assets/backgrounds/botanical-journal.webp). Its placement is in [background.css](src/styles/background.css). The running application makes no AI API calls.

The background prompt requested ivory handmade grid paper, muted sage/olive pressed foliage near the margins, restrained ochre/coral flowers and translucent tape marks, leaving the center quiet. It explicitly removed all UI, text, logo, models, jar, lamp, can, shadows, table and cloth from the approved concept. This separation keeps the artwork decorative and the ecosystem interactive.

Sources informing the process:

- P1 informed layout; P2–P4 informed faceted miniature volume, materials and composition. Supplied references included [Garden Galaxy](https://store.steampowered.com/app/1970460/Garden_Galaxy/) by Anneka Tran, an island/lighthouse screenshot credited to “ubrilliantidiot”, paper/game interfaces and a photographed terrarium. Some original post URLs/creators were not supplied, so attribution remains incomplete. External reference pictures are not bundled as app assets.
- [Carbon typography](https://www.carbondesignsystem.com/building-blocks/foundations/typography/overview) informed typographic roles. Exact sizes were adapted to this project's fonts/layout, not treated as a prescribed specification.
- [Filofax Botanical sticky notes](https://us.filofax.com/products/botanical-sticky-notes-filofax) and user-supplied scrapbook photographs informed the rejected notebook exploration. Their artwork/binding treatment is not shipped in the final UI.
- Three.js, Vite and Playwright support rendering, bundling and verification. Fredoka and DM Sans have bundled font licenses; Libre Caslon Display remains bundled from the earlier direction. Full dependency/font credits and license links are in README.

The final design prioritizes clear cause and effect, a responsive miniature world and a manageable short experience. Further evaluation should preserve the distinction between author preference, participant evidence and automated correctness.
