# User testing and feedback

## Evidence and limits

The project author supplied eight screenshots of a tester conversation on 2026-10-21, alongside six observations from their own review. The screenshots include discussion around 12:42; the author identified the conversation as starting at 12:35. One tester conversation is represented by this evidence. The total number of participants, device/browser, test protocol, completion times and task success rates were not supplied. Codex reviewed the screenshots, not a complete recording of the session. No additional participant outcomes are inferred.

The tester is referred to as P01 here. Personal names, avatars and complete private messages are not copied into the repository. The screenshots include video thumbnails; the underlying videos were not supplied or evaluated.

## Findings and decisions · 2026-10-21

| Finding | Evidence | Response in this iteration | Follow-up check |
| --- | --- | --- | --- |
| The first planting action is insufficiently explicit | Author review points 1 and 5; these are not direct tester quotes | Replace the empty-scene heading with a direct planting instruction, add a short paper guide/finite arrow cue, strengthen grab/hover/focus cues and explain click-to-place | Can a new tester plant without verbal help? |
| Whole-jar water attracts attention without explaining its purpose | P01 initially watched Soil average and thought it should match the individual plant's water; author review point 4 also questions empty-state relevance | Hide water metrics in the empty state. Move the whole-jar average into a collapsed secondary overview with an explicit explanation. Label per-root water/light | Can the tester distinguish local water from the jar average? |
| Live comfort and recorded health changes appear contradictory | P01 compared higher comfort with Health −1 and lower comfort with Health +4, and interpreted the delta as a next-day indication | Label Comfort now, Health and Growth. Explicitly date Last day outcomes; add an optional metric explanation. Keep historical results unchanged during live adjustments | Can the tester explain what updates immediately and what already happened after Next Day? |
| The diagnosis is easy to miss and does not clearly suggest an action | P01 could not tell whether to water or change the light, then noticed the small text | Give current local causes and concrete actions a readable place above metric details. Show both issues when water and light are out of range; order by the existing weighted suitability loss | Can the tester choose an appropriate action and see the relevant issue disappear? |
| Direct light targeting is undiscoverable and moving the physical lamp is awkward from the front | P01 reported difficulty moving the lamp, later preferred direct targeting and questioned the need to move the lamp itself | Deferred: outside the four changes authorized for this iteration | Test direct-light targeting as the primary control |
| Rotation and capacity cues have weak placement/readability | Author review points 2 and 6 | Deferred: outside this iteration | Test discoverability of right-button rotation and understanding of the one-to-five capacity |

## Current behavior under review

- First planting: drag from the collection onto soil, or choose a card and click a soil spot. The guide goes away after planting and returns when the jar becomes empty.
- Now: comfort, water here and light here respond to environmental changes. Causes and suggested actions describe those same current local conditions.
- Health and Growth: current plant properties that change when time advances, rather than live environmental suitability.
- Last day: the recorded health change and environmental cause after advancing to the displayed day. It is not a forecast and is not rewritten when the user adjusts the current environment.
- Jar overview: whole-jar average moisture is contextual information, not an ideal target to match for each plant.

## Verification versus user acceptance

Automated rule/UI checks and viewport captures are developer validation; they do not establish that P01 or other participants understood the revised interface. Follow-up user testing of this iteration is pending. Do not claim improved completion rates or satisfaction until new observations are supplied.

## Author screenshot review · 2026-10-21

The author found the revised per-plant notes too tall: action explanations repeated the short diagnosis, and exact water/light numbers encouraged unnecessary numeric matching. The author also questioned the continued whole-jar average. This is author review of developer screenshots, not a new participant session.

Removed action explanation text and per-root water/light readouts. Kept short current causes, comfort, health, growth and a compact dated daily health change; the historical cause remains available as the record's tooltip. Removed the live jar overview entirely and stated the initial 60% soil moisture only in empty-jar onboarding. Retained spatial calculations unchanged. Follow-up participant testing remains pending.
