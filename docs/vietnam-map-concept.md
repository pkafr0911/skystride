# Level 3 — Saigon Rooftops — concept and implementation

Implemented as Level 3 with three sectors and eight procedural prop families. The original concept below is retained as an art-direction reference. See `saigon-implemented-objects.png` for the actual meshes. The route is independently authored: 24 main street-level combos, 21 short connecting phrases, six elevated routes, and three courtyard descents. It retains shared movement rules and obstacle timing windows, with new contact orders, placements and roof transitions.

## Course proposal

- 3 km / three 1 km sectors: Alley Roofs, Market Quarter, Riverfront.
- Match Sunset Relay's gap distances, input windows, recovery rules, and optional technical routes. Keep current movement physics. No tutorial panel.
- Three- to five-contact chains, upper shortcuts, lower recovery routes, and clear landing corridors. Difficulty parity must be measured against Sunset Relay when implemented; the concept image is not a collision blueprint.
- Narrow concrete townhouses, rooftop cafes and gardens, faded ochre plaster, teal shutters, stainless water tanks, market awnings, and riverfront towers. Utilities and fragile decorations stay outside the running lane.

## New object designs

| Object | Existing movement | Physical design requirement |
| --- | --- | --- |
| Fruit crate bench | Vault | Secured crates with a solid load-bearing top |
| Awning crossbar | Slide | Rigid frame with clear underside; fabric is decorative |
| Water tank service deck | Climb, drop, roll | Climb the platform, with tank behind the path |
| Cafe sign frame | Wall run | Solid wall-backed contact surface |
| Market shutter opening | Dive | Clear opening, no crates in the collision corridor |
| Rooftop drying rack | Grab, swing | Reinforced bar; laundry outside the grip and landing path |
| Terrazzo planter ledge | Precision landing | Wide stone cap, plants behind the usable surface |
| Maintenance plank ramp | Jump, roll | Braced ramp and unobstructed landing |

## Preview generation

Generated with the built-in imagegen tool. The illustration conveys atmosphere and silhouettes, not final mesh detail or exact geometry. Keep actual meshes consistent with Skystride's simpler rendering style.

### Prompt

Use case: stylized-concept. Create a polished widescreen game environment and prop concept board for SKYSTRIDE, a stylized low-poly 2.5D rooftop parkour game. This is a proposal, NOT an implemented game screenshot. Main title "LEVEL 03 / SAIGON ROOFTOPS", subtitle "VIETNAM MAP CONCEPT • SUNSET RELAY DIFFICULTY". Top 55 percent: three adjacent panoramic gameplay-like dioramas, side-on three-quarter orthographic camera, continuous legible horizontal parkour roof lanes with clear gaps, upper shortcut and lower route. Panel labels "01 / ALLEY ROOFS", "02 / MARKET QUARTER", "03 / RIVERFRONT". Modern southern Vietnamese urban architecture: narrow pastel concrete tube houses, rooftop terraces, turquoise shutters, ochre plaster, terracotta trim, stainless rooftop water tanks, tangled utility lines far behind gameplay, roof gardens and small rooftop cafes; dense market quarter with faded striped awnings; riverfront skyline and slender modern towers. Warm late afternoon sunlight, teal shadows, weathered cream, muted coral and jade. One tiny mustard-hooded runner per panorama for scale. Solid roof surfaces, not walking on fragile fabric, authentic contemporary neighborhood rather than temples or generic East Asian fantasy. Bottom 45 percent: eight clearly separated isolated new obstacle models on dark slate tiles, same low-poly game art style, shown large and distinctly readable. Names and small action labels EXACTLY: "01 / FRUIT CRATE BENCH" / "VAULT"; "02 / AWNING CROSSBAR" / "SLIDE"; "03 / WATER TANK SERVICE DECK" / "CLIMB + DROP"; "04 / CAFE SIGN FRAME" / "WALL RUN"; "05 / MARKET SHUTTER OPENING" / "DIVE"; "06 / ROOFTOP DRYING RACK" / "GRAB + SWING"; "07 / TERRAZZO PLANTER LEDGE" / "PRECISION"; "08 / MAINTENANCE PLANK RAMP" / "JUMP + ROLL". Design actual new silhouettes: secured wooden fruit crates under a solid plank vault top, weathered striped retractable awning attached to sturdy low metal crossbar with open slide space, ribbed stainless water cylinder behind a climbable service platform, faded rectangular cafe sign on a solid wall-run surface, half-raised teal metal shutter with clear opening on rooftop shed, rigid reinforced galvanized drying frame with laundry kept off the usable swing bar, speckled terrazzo planter with wide stone landing cap and tropical foliage behind, solid wooden maintenance ramp with safety-painted edge. Thin amber trim identifies contact edges; cool cyan lines indicate alternate routes sparingly. Obstacle geometry must look load-bearing and buildable, no weapons, no loose props in contact paths, no new movement mechanic, no rain/slippery physics. Refined art direction presentation with crisp readable typography, subtle grid, ample breathing room, no extra text.
