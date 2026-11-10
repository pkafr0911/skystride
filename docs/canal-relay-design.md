# Level 05 — Kiln Coast

Implemented as Level 05 with an independently authored course and ten original obstacle families. The original design direction is retained below; wall kick and rope swing were added during implementation.

## Core idea

Run through a fictional Vietnamese coastal ceramics district: terraced pottery workshops, monumental brick kilns, and a cliffside sculpture promenade above the sea. The route climbs from enclosed workshop roofs into open kiln terraces, then descends toward a coastal finish under copper evening light.

Sunset Relay and Saigon Rooftops supply the movement rules and timing reference. Kiln Coast has its own architecture, obstacle silhouettes, contact sequences and elevation profile. Its identity comes from curved brick structures, heavy timber work surfaces, ceramic ribs and coastal stone, rather than another neighborhood of tube houses and market awnings.

## Rules carried forward

- Keep existing jump, vault, slide, dive, wall-run, bar, precision, climb and roll behavior, including Standard and Hardcore recovery rules.
- Use the shared timing functions: 0.30–0.40 seconds below and 0.20–0.25 seconds on elevated routes.
- Keep current acceleration, swing release and landing physics. New objects introduce new geometry and visual identity within those movement budgets.
- Retain three 1 km sectors, practice starts, course-specific records and ghosts. No tutorial panel.
- Breakable ceramics and wind forces are outside this level. Rope grips move along a deterministic arc; other contacts are stationary and load-bearing; decorative pottery stays outside the running corridor.

## Three new sectors

| Sector | Distance | Environment | Route character |
| --- | --- | --- | --- |
| Clayworks | 0–1,000 m | Broad stepped workshops, clay-red courtyards, drying galleries and timber roof structures | Alternating interior openings and roof crossings; three- and four-contact phrases; one lower courtyard descent |
| Kiln Terraces | 1,000–2,000 m | Round brick kiln towers, deep archways, elevated maintenance galleries and chimney silhouettes | Vertical transitions around kiln exteriors; four- and five-contact phrases; a bar crossing between separate galleries |
| Ceramic Coast | 2,000–3,000 m | Sea-facing stone terraces, large ceramic sculptures, stepped retaining walls and distant fishing boats | Exposed precision lines, longer sightlines and five- or six-contact chains; a descending finish approach |

Two optional elevated routes per sector are a design target. Lower routes use broader support surfaces and clearer approaches; upper routes trade tighter timing for potential time savings. Every entrance and rejoin remains inside its sector. Reserve clear approaches at practice spawns and an unobstructed run-out at the finish.

## Ten original gameplay objects

Every object below requires a new mesh with a distinct silhouette and contact surface. Existing movement logic can be reused; recolored Sunset or Saigon props do not satisfy this object brief.

| New object | Existing action | Shape and usable contact | Placement requirement |
| --- | --- | --- | --- |
| Clay-press table | Speed / kong vault | Heavy timber trestle with a broad, solid pressing slab and recessed clay tray behind the contact edge | Rounded readable leading edge; tools and clay outside the vault corridor |
| Drying-gallery beam | Slide | Thick timber lintel spanning two masonry piers, with ceramic drying shelves behind it | Entire slide corridor stays open; shelves cannot intrude |
| Kiln inspection portal | Dive | Deep brick arch containing a rectangular maintenance opening framed in pale stone | Match an existing validated dive clearance; kiln is cold and the exit is visible |
| Curved kiln buttress | Wall run | Curved tower silhouette with a flat reinforced brick contact panel along its base | Collision and visible running strip are planar; curvature remains behind the contact |
| Glaze-service stair block | Climb → drop / roll | Solid stepped masonry plinth beside a recessed glaze basin | Climbable ledge and clear rollout; basin is decorative and inaccessible |
| Tile-hoist crosshead | Jump → catch → swing release | Stationary timber A-frame with a metal grip bar between its upper arms | Visible bar and landing roof; hoist ropes and hook secured behind the lane |
| Ceramic rib pedestal | Precision landing | Broad stone-capped pedestal supporting a sweeping ceramic rib behind the player | Land on the stone cap; fragile ceramic never forms the contact surface |
| Workshop loading wedge | Ramp → jump | Triangular brick wedge with inset timber traction strips and a solid crest | Continuous support surface; takeoff and opposite roof remain visible |
| Inspection-trench crossing | Gap jump | Dry maintenance trench between thick masonry roof decks with exposed brick cut faces | True opening in the support surface; edge trim does not narrow the collision gap |
| Coastal retaining steps | Controlled drop → roll | Three broad descending stone terraces with a long final landing platform | Validate each descent and give the final roll its own clear recovery space |

## Original contact phrases

These orders are design proposals, not validated collision layouts. Distances must be authored around each move's approach, animation, flight and recovery needs.

| Phrase | Sequence | Distinctive moment |
| --- | --- | --- |
| Clay Dispatch | Press-table vault → drying-beam slide → trench jump → pedestal precision | Enclosed workshop opens abruptly onto a sunlit courtyard |
| Cold Kiln | Portal dive → press-table kong → buttress wall run → precision | A deep arch frames the next solid wall contact |
| Hoist Transfer | Loading-wedge launch → crosshead catch → swing release → clear landing → dash vault | Crossing between two separate kiln galleries |
| Glaze Descent | Stair-block climb → pedestal precision → controlled drop → roll | A high terrace reveals the lower recovery route before commitment |
| Coastal Ribs | Precision → slide → kong → trench jump → precision | Ceramic sculptures frame the route without obscuring its edges |
| Last Firing | Wall run → dash vault → slide → precision → gap jump → terrace drop and roll | Final high route rejoins a broad coastal finish deck |

## Visual direction

Use terracotta brick, chalk-white stone, indigo ceramic accents and weathered dark timber. Evening light moves from warm enclosed workshop shadows to an open peach sky and muted blue sea. Keep the kiln towers and coastal ceramic ribs recognizable in silhouette from the course menu.

Amber edges identify contacts and cyan accents identify optional routes. Keep decorative pots, stacks of tiles and sculpture bases behind or beside the lane. Low foreground walls preserve visibility of gaps and landing surfaces. The sea and boats are distant scenery; route direction stays compatible with the existing forward-running camera.

## Implementation acceptance

1. Create an independent `kiln-course.ts`, register Level 05 with a new ID/version, and author its obstacles, support surfaces, route branches and descents from scratch.
2. Create a dedicated kiln obstacle mesh module and typed object identifiers for all ten families. Match visible contact faces to collision geometry; reuse movement behavior rather than copying old decorative meshes.
3. Add a kiln atmosphere, workshop/kiln/coast scenery and course-menu preview. Inspect all fixed level-ID and atmosphere mappings.
4. Simulate lower and upper routes in both modes, including every practice spawn, bar release, landing and rejoin. Measure shortcut savings and difficulty against Sunset and Saigon; parity is a target until verified.
5. Verify version-isolated records and ghosts, then visually inspect all new objects at gameplay distance with supported cameras and a mobile viewport.

## Implemented mechanics and validation

- Wall kick: Up plants against the marked wall; a second Up during 28–85% of the 0.65-second contact launches upward. Timeout drops the contact. This is separate from existing automatic tic-tac/rebound moves.
- Rope swing: jump to catch a hanging grip, Right releases from 35% of the 0.9-second swing onward, and Down drops after 25%. Launch velocity varies with release phase. Timeout drops instead of auto-launching. The rendered rope follows the simulation's grip position.
- Both lower and upper full-course routes complete in Standard and Hardcore without recovery penalties in scripted tests. Approximate scripted times are 3:44.48 lower and 3:43.56 upper; these are simulation results, not player records or a difficulty-parity claim.
- Sector starts, versioned records, deterministic replay and contact poses are covered by automated checks. The level has brief prompts for the new moves but no full tutorial panel.
- Human playtesting remains useful for difficulty and input feel. Browser verification could not be completed because the browser tool blocked local-page access; the actual meshes are inspected through the [offline preview](kiln-implemented-objects.png).
