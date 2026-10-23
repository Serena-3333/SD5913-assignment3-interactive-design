# Notebook UI and plant correspondence · 2026-10-23

**Current decision:** both notebook treatments below were rejected by the author. The application has returned to its original taped paper-note panels and plant cards. The raised typography hierarchy, removed decorative labels and individual hover/focus correspondence remain. The notebook references below are a record of abandoned local exploration, not the current visual design. Current typography/link styling is in `src/styles/uiRefinements.css`; the focused browser check is `tests/plantLink.mjs`.

## Author request

The author found the central scene title too similar to the product title and wanted the heading, capacity and camera instruction higher on the page. Repeated plants also made it difficult to connect a 3D individual to its status. Both sidebars should look like matching notebooks with separate paper slips, while retaining the botanical background, cream/sage palette and existing typefaces.

## References and application

- [IBM Carbon typography](https://www.carbondesignsystem.com/building-blocks/foundations/typography/overview): distinguish typographic roles with a restrained scale, line height and weight. Applied as desktop product title 32px/1.2, scene title 24px/1.25, notebook headings 22px/1.25, plant names 15–17px, camera/capacity 12px and compact secondary metrics 11px. These values are project-specific choices for Fredoka/DM Sans, not a claim that Carbon prescribes this exact layout.
- [Filofax Botanical sticky notes](https://us.filofax.com/products/botanical-sticky-notes-filofax): reference for separate slips within one botanical organizer. Adapted into a shared light-green cover, binding loops, a stacked paper edge and cream/sage/teal/peach slips. No reference image, artwork or product asset was copied into the app.

The workspace begins closer to the masthead. A smaller, quieter scene heading, capacity stamp and camera row occupy the top of the central column; the scene keeps the remaining space. Both notebooks use the same binding, paper edge, spacing and slip treatment. Each right-side slip retains the compact causes, comfort, Health, Growth and dated outcome already approved by the author. The notes remain independently scrollable in short windows; the page itself stays fitted to the viewport.

## Individual correspondence

- Hovering any exposed leaf or stem highlights the matching status slip, revealing it in the list if necessary.
- Hovering or keyboard-focusing a status slip outlines its individual plant in warm gold. Species names include a visible instance number; repeated species are linked by the full plant ID, never by species name alone.
- Leaving, beginning a gesture, cancelling, rotating or deleting the individual clears the link. Hover does not change simulation data or camera state.
- The outline shares existing mesh geometry and uses two small back-face shells. Batched leaves retain their instance transforms; no full-screen postprocessing or idle animation is added. Resources are released with the plant/scene, and rendering returns to idle after the interaction.

## Validation and limits

Node checks cover outlines for all four species, instance-buffer synchronization, preserved source materials and disposal. The focused browser workflow checks both directions for five individuals including repeated Moss, keyboard focus, cancellation/orbit separation, removal, role hierarchy, absence of JS/WebGL errors and return to idle. The existing tool workflows and fitted-layout checks cover regression risks. Reports and review captures live in ignored `test-results/`.

This is an author-requested design iteration. It is not a new participant session or proof of improved usability. Follow-up participant testing should check identification of two same-species plants and readability at the tester's actual display size. Publication requires the author's separate approval.

## Author reference refinement · 2026-10-23

The author supplied two photographed scrapbook/binder references and requested more recognizable notebook bases, retaining the current colors. Replaced the thin outer binding with six larger oval rings, punched holes, a wider sage cover/gutter, an inset cream grid page and layered page edges. These are CSS shapes; no reference photograph or its stickers/text is used as an application asset. The supplied references are Xiaohongshu screenshots (visible accounts “bearten” and “嘉冰云朵”); original post URLs were not supplied. Removed the decorative “YOUR LITTLE WORLD” and “Little by little” labels. Narrow central columns now wrap the camera controls as a row instead of squeezing their instruction into a tall strip.
