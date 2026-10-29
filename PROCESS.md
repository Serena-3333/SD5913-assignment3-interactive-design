# Pocket Terrarium — Design and Development Process

SD5913 Assignment 3 — An interactive experience

## Starting idea

I wanted to make a small, calming experience for university students taking a short break. Instead of designing a game with scores or tasks, I chose a miniature terrarium where people could arrange plants and discover how environmental choices affect them.

My central idea was that users should not directly command plants to grow. They should choose plants, adjust water and light, and observe the consequences. The loop became **plant → adjust → observe → advance time → try again**. One plant is enough to begin; the five-plant limit is capacity rather than a completion target.

I initially used a three-column 2D interface as the layout reference. I chose real 3D because changing a viewpoint and aiming water/light at a soil location should have spatial meaning. A static image would not let the user inspect or rearrange the world in this way. I kept ordinary HTML controls around the scene so that instructions and feedback would stay readable.

## Visual direction and interface

I wanted the terrarium to look like a small handmade world: bright low-poly plants, layered soil, simplified glass and restrained rocks/wood. Moss stays low, Fern is taller, Succulent forms a compact rosette, and Fittonia has broader veined leaves. These different silhouettes and heights make arrangement more interesting. Simplified transparency and broad glass highlights keep the plants visible without complex refraction.

For the surrounding interface, I chose cream paper, green and yellow accents, rounded Fredoka headings and DM Sans body text. I tried notebook covers/rings and a wooden tabletop with a cloth, but neither improved the result. The table and mat also exposed a perspective mismatch when some elements rotated and others did not. I returned to taped paper panels and a flat botanical background. This taught me that more decoration does not necessarily make an interaction clearer.

I also reduced the central heading so that it no longer competes with the product title, removed repeated slogans/instructions, and widened the status panel. The collection can slide away to leave more room for the scene, with a visible Plants tab to reopen it. I kept this reversible rather than hiding the collection permanently after planting.

![Actual application with the retained paper interface](screenshots/planted-terrarium.png)

*Application capture from the approved October 23 version. The background is decorative; the jar, plants and tools remain live 3D objects.*

## Interaction decisions and changes

The first prototype used three fixed planting positions. I changed it to one to five freely positioned individuals, including repeated species, because choosing an arrangement should be part of the experiment. Each individual keeps its own identity, Health and Growth when moved. Water belongs to the soil, so moving a plant changes the conditions at its roots rather than carrying its old water with it.

I separated left-button manipulation from right-button rotation to reduce conflicts. Invalid drops and cancelled gestures preserve the previous state. Visible rotation instructions, Reset view, click-to-place and keyboard alternatives give users ways to recover when dragging is difficult.

I changed watering from a whole-jar action into a local footprint large enough to reach neighboring roots. This creates a reason to think about which plants share an area. I also changed lighting from moving the lamp body to dragging the light spot, retaining only Range and Intensity controls. Hover feedback identifies the tools without a permanently floating animation or a large instruction box following the cursor.

To connect repeated plants with their data, I added a two-way link: hovering a plant highlights its status row; hovering or focusing the row outlines that individual. I kept Comfort as immediate environmental feedback, while Health/Growth update only after Next Day. A dated Last day record describes what already happened, not a prediction.

### One complete input–response–feedback loop

Local watering is the code path I would use to explain the project:

1. **Input:** the user drags the can to a soil location. Raycasting in [plantDrag.js](src/interactions/plantDrag.js) turns the pointer position into a world-space target.
2. **Response:** `onWater` in [main.js](src/main.js) passes that target to `waterSoil` in [simulation.js](src/simulation/simulation.js). Nearby soil samples gain moisture, with a tapered effect and a cap of 100; samples outside the footprint stay unchanged.
3. **Feedback:** the shared updated state refreshes soil color, local Comfort and short causes in the UI. The can tilts and droplets show where the action happened. Health does not jump immediately because it changes on Next Day.
4. **Next decision:** the user can see whether the affected plants need another adjustment, move a plant elsewhere, or advance time to observe its longer-term response.

This is more than a watering animation: the action changes stored environmental values that influence the next day's health and growth. The visual and numerical feedback come from those values rather than a preset outcome.

## User trial and my response

### How I tried it with someone

I shared the demo with another person and first let them try it without explaining the controls. Afterwards, I discussed what they had attempted and what confused them in a follow-up chat, explaining the controls and data distinctions as needed. I collected eight screenshots of that feedback conversation to inform revisions; the private conversation and the person's identity are not included in the repository.

The observations below come from their written feedback after using the demo, rather than a timed observational study. I did not collect task completion rates or formal timing measurements. I distinguish their feedback from my own later visual reviews.

| What the tester reported | What I changed and why |
| --- | --- |
| They focused on Soil average and thought it should match the plants' water needs. | I removed the running whole-jar average. The empty state explains starting moisture, while short local causes guide later care. An extra number was attracting attention without helping the decision. |
| A higher comfort percentage with Health −1, or a lower percentage with Health +4, appeared contradictory. They interpreted the change as a forecast. | I separated Comfort now from Health/Growth and dated the last completed day's result. Current adjustments no longer rewrite the historical outcome. |
| They did not know whether a low percentage called for water or light, then noticed the small diagnostic text. | I made the current cause easier to find and retained both water/light causes when relevant. After reviewing the revised panel myself, I removed repeated explanations and exact local readings to keep the message short. |
| Moving the lamp from the front was awkward. They later found direct light targeting easier and questioned moving the lamp at all. | I fixed the physical lamp and made the soil light spot the primary target. Hover feedback reveals that it is interactive; Range/Intensity remain available when needed. |

Earlier user feedback also reported sluggish rotation and plant changes that were much less visible than their numbers. I responded by prioritizing rendering efficiency, smaller seedlings, staged new foliage and a short growth transition. Mature plants become roughly twice seedling size at comparable health. Poor health changes vigor, color and posture; soil darkening/cracks and persistent dead plants make longer-term conditions visible.

My own later reviews addressed repeated instructions, crowded data, plant/status correspondence and clipped scene framing. Those are my design judgments, not additional participant findings. I have not yet collected a follow-up trial showing that the revised interface resolves every issue. A useful next check would ask a new user to plant, adjust light and explain the difference between Comfort now and Last day without help.

## Technical choices, error handling and verification

I used Vite, vanilla JavaScript ES modules and Three.js, with no backend or paid service. With Codex's help, I separated the ecological rules from rendering and gave the UI and scene one shared application state. That makes it possible to test the rules independently and prevents camera movement or decorative brightness from changing plant conditions.

The rules are deliberately simplified. Comfort combines species-specific moisture/light suitability; Next Day dries the soil, recalculates comfort and updates Health/Growth. Very dry soil cracks, and persistently critical health eventually causes death. These rules support experimentation rather than real plant-care advice. Reset preserves planting positions and restarts the experiment; Clear removes the plants. Both ask for confirmation.

I selected ordinary mistakes that fit this interaction: dropping outside the jar, placing roots too close together, cancelling a drag, watering saturated soil and repeatedly clicking Next Day. Rejected placements leave the garden unchanged, Escape abandons unfinished gestures, water stays capped and the daily transition blocks duplicate advancement. An empty jar explains why Next Day is unavailable.

### Performance and rendering

When an optimization made the scene blurry, I chose to preserve sharpness and reduce rendering work instead. The retained changes batch repeated leaves, simplify secondary geometry, cache shadows and stop drawing settled/hidden scenes. Debugging with Codex also found a camera-change callback that could start extra rendering loops; correcting that was more useful than continually reducing resolution. The canvas now keeps device resolution capped at DPR 2 during rotation and at rest.

Development diagnostics and screenshots informed these choices, but I do not treat a headless-browser result as a guaranteed frame rate on every laptop. Camera fitting now leaves room for the jar, lamp, resting can and base, while the scene still returns to idle after interaction.

### What was checked

The recorded development checks include 40 Node rule/model tests, the core 22-check Chromium workflow, focused tool and plant/status-link checks, seven viewport sizes, and multiple camera angles. Coverage includes local water/light, daily updates, lifecycle boundaries, cancelled gestures, Reset/Clear, repeated species and resource cleanup. The final functional release's Node tests and build passed on October 23; these are historical results, not tests rerun for this documentation edit.

The production preview was checked under the GitHub Pages repository path so fonts, favicon and assets would load correctly. The public repository was also accessed without authentication during the submission review. Tests and screenshots are implementation evidence, not proof of successful user understanding. The README provides reproduction commands; temporary browser output goes to ignored `test-results/`.

Remaining limits are no saved garden, simplified ecology, and incomplete physical-device/cross-browser testing. I would prioritize a short follow-up user trial and device checks over adding more features to this assignment.

## AI assistance and asset provenance

I used **OpenAI Codex** to generate and revise substantial parts of the JavaScript, procedural models, styling, tests and documentation. I used the **3dviz-pro-max** skill for guidance on the low-poly modeling and lighting direction, and OpenAI's image tool to explore background concepts and make the final decorative botanical image. My role was to define the intended experience, supply references, decide priorities, try the results, bring in user feedback and accept or reject changes. I am not presenting the implementation as entirely unaided coding.

**One suggestion I kept:** I kept Codex's use of batched repeated leaves and cached shadow updates. These reduce unnecessary drawing while preserving the plant silhouettes and lighting, so I could improve responsiveness without making the image softer. I also reused the scene's plant models for collection thumbnails to keep their appearance consistent.

**One suggestion I changed/rejected:** lowering rendering resolution improved apparent performance but made the image visibly soft. I rejected that tradeoff and asked for geometry reduction and rendering/scheduling fixes while keeping clarity. I also rejected the notebook and tabletop visual treatments after trying them, retaining the original paper panels instead.

The generated background, [botanical-journal.webp](src/assets/backgrounds/botanical-journal.webp), contains ivory grid paper and marginal foliage/flowers only. I asked the image tool to remove text, UI, models, tools, shadows, table and cloth from the concept before using it as a background. The interactive world is separate procedural Three.js geometry, not an image or prerecorded animation. The running application calls no AI API and requires no AI account or key.

My supplied references informed layout, color and miniature composition rather than becoming bundled artwork. They included Garden Galaxy, an island/lighthouse image, illustrated interfaces, paper notes and a photographed terrarium. Some original post links/creators were unavailable, which I acknowledge in the README credits. Carbon informed type hierarchy; Filofax and scrapbook references informed the subsequently rejected notebook exploration. Dependency, font and reference credits remain in README, with bundled font licenses in the project.

The main lesson for me was that a convincing miniature is only useful when people understand what they can change and what the feedback means. Simplifying the lamp and data panel contributed more to that aim than adding more controls or decoration.
