# Skystride

A standalone, fullscreen rooftop parkour time-trial game. Choose between two 3 km levels, each with three sectors, elevated route choices, contextual traversal, swipe controls, and its own local personal-best ghost.

## Development

Node.js 18 or newer (CI uses Node.js 20).

```sh
npm ci
npm run dev
```

Open the local URL printed by Umi (normally http://localhost:8000/). The game fills the browser viewport automatically. The Fullscreen control additionally requests native browser fullscreen and landscape orientation where supported; browsers require a user gesture for this.

Stack: UmiJS Max 4, React 18, TypeScript, Ant Design 5, LESS, Framer Motion, and Three.js. The game lives in `src/pages/Skystride/`. There is no dependency on the original Ultimate Tools repository.

## Checks

```sh
npm run tsc
npm run lint
npm test
npm run build-pre
```

CI runs these checks on main pushes and pull requests.

## GitHub Pages deployment

Repository: https://github.com/pkafr0911/skystride

```sh
npm run deploy
```

This builds with `/skystride/` as both router base and asset path, creates a 404 fallback and `.nojekyll`, then publishes `dist` to the `gh-pages` branch using the existing gh-pages CLI approach. Git credentials with write access are required. In GitHub Settings → Pages, select **Deploy from a branch → gh-pages → / (root)**.

Expected URL after deployment: https://pkafr0911.github.io/skystride/

`npm run build` instead targets `/` for root-domain hosting. The `/` route is the game; `/movement-lab` is the animation study with slow motion and pose scrubbing. No deployment is triggered by local setup; `npm run deploy` is the explicit publishing step.

## Creative rooftop encounters

Sunset Relay includes split ventilation banks, low/high pipe crossings, solar launch ramps and billboard openings. Early jumps open top routes; close Up inputs perform contextual vaults. Ramp landings need a timed roll. The first new encounters start at 217 m and recur across later blocks.

See the [obstacle geometry preview](docs/creative-obstacles.png) and [movement/course notes](docs/game-design.md). Course v8 keeps earlier personal bests separate.

Successful vaults preserve incoming speed through contact and landing, including boosted speed. Missed timing and collision recoveries still cost momentum.

The lower route now includes deep building transfers at 132 m, 1,612 m, 2,092 m, and 2,572 m: cross a 5 m gap to a rooftop 8 m below, roll through the clear landing area, then climb back along the connecting ramp. Both levels of the first building end at the same edge, leaving open air above the lower landing roof. Amber stripes mark takeoff and landing.

## Controls

- High rooftop drops: press Up again while airborne to front flip when a lower roof is at least 3 m below and there is enough flight time. Press Down just before touchdown to roll; missing the roll causes a hard landing and substantial speed loss in both modes.

- Up / W / Space: jump from a roof or obstacle top; contextual vault, low-duct climb, wall step or high-wall climb near a suitable obstacle. Climb input remains available up to the visible wall face.
- Down / S: slide; on an obstacle top, slide off its edge with a prepared landing roll. In the air, press before landing from a drop to roll.
- Right / D: long jump at 11.5 m/s or faster; a normal jump below that speed. Jump distance carries current momentum, so build speed before a wide gap.
- R: restart. Escape: pause.
- Touch: swipe up/down/right; actions trigger before finger release. Swipe sensitivity is adjustable in the course menu.

Best runs remain in local storage on the current origin. A best from the original app is not transferred across origins automatically. Paused runs and practice attempts do not replace a personal best. Online leaderboards are not implemented.

See [game notes](docs/game-design.md) for mechanics, performance decisions, and first-playable limitations.

Character asset: `public/models/skystride-runner.glb`. Regenerate from the live geometry with `node scripts/export-runner.cjs`.

The default runner is Rooftop Climber, with a mustard hooded top, olive cargo shorts, wrist wraps, and burgundy shoes, using continuous limb surfaces and procedural contact animation. The movement lab includes an entry-speed slider, long-jump preview, and high-wall climb study. `node scripts/runner-study.cjs --wall` exports mesh triangles for offline inspection of the wall-climb poses. Vault contact poses and connected transitions are documented in the [vault motion study](docs/vault-motion-study.md); `node scripts/runner-study.cjs --vaults` exports all seven vaults.

Creative course encounters include ventilation chains, solar launch ramps, tank cradles, wall-run billboards, pipe crossings, broken bridges, construction windows, greenhouses, suspended scaffolds and staggered balconies. Swipe Up for contextual contacts/climbs; swipe Right near a window for a fast dive or near a tank for its service platform. New wall-run and dive previews are in the movement lab. See the v9 section of the game notes for animation phases and route choices.

Combo update: the technical district includes 20 named three- to five-contact chains and 16 new procedural parkour profiles. In the movement lab, select an individual technique or a `CHAIN · …` preview; adjust entry speed and bar-release timing, scrub, freeze or inspect the pose sheet. Chain previews use scripted inputs through the same simulation as gameplay. Right releases a bar contact into flight; Down offers a controlled drop. See the v13 game notes for current scope and limitations.

Bar crossings (v14): jump into hand reach, catch, then release across a real roof gap. Movement-lab previews include the same gaps and airborne approach; walking into a bar no longer starts the move.
Bar crossings v15 widen to 12.6 m with a faster 0.55 s swing, a stronger release impulse, and extended landing corridors. Movement-lab shares the updated geometry and physics.

Choose a character in the course or pause menu: Rooftop Courier, Rooftop Climber (default), Hop Bot, or Original Silhouette. The choice is saved on this device and applies to the runner and ghost. Available designs are registered in `src/pages/Skystride/characters.ts`.

Eight equipment designs now appear throughout the course: AC condensers, secured cable reels, utility cabinets, maintenance carts, roof hatches, duct elbows, safety barricades and antenna bases. See the [implemented equipment preview](docs/implemented-obstacles-v2.png) and the original [concept sheet](docs/obstacle-concepts-v2.png). Equipment follows the existing traversal dimensions; reels have a flat service tread, duct risers sit behind the slide lane, and hatch rims leave the jump opening clear.

To regenerate the equipment preview, run `node scripts/obstacle-study.cjs --equipment`, then `node scripts/render-obstacle-study.cjs docs/implemented-obstacles-v2.png` with `sharp` available on the Node module path. The renderer uses depth-tested triangles from the live game meshes.

Skybridge routes (v40): take Up at the marked branches to reach narrow 7 m-high routes with a gap, dash vault and downhill momentum exit. These span 295–375 m, 1,775–1,855 m, 2,255–2,335 m and 2,735–2,815 m, covering all three sectors. Each bypasses a slower lower service passage; clean entry-to-rejoin simulations save 0.55–0.56 seconds in both modes. The long technical district retains its existing encounter layouts.

Chain expansion (v41): eight new route-specific chains bring the total to 28 across all sectors. New sequences are checked against every legacy route variant to prevent renamed duplicates. Open `CHAIN · …` in Movement Lab to preview Service Run, Vent Climb, Window Rush, Roofline Sprint, Underpass Escape, Billboard Transfer, Crane Descent or Final Relay. See the v41 design notes for contact sequences and locations.

Obstacle variety: strapped freight crates and hose-reel stations use existing vaults; overhead cable trays use existing slides. Three of every ten eligible vault/slide props are replaced independently per sector and lane (55 replacements total). All eight original equipment designs remain. Positions, collision dimensions, movements and chain ordering stay unchanged. See the [new obstacle preview](docs/new-rooftop-obstacles.png).

Other movement props: roof expansion joints (jumps), loading shutters (dives), acoustic screens (wall runs), maintenance gantries (bar moves), capped chimney plinths (precision), fire-escape platforms (ledge landings), loading ramps and service bulkheads (wall redirects). Each family replaces a rounded 30% of eligible instances, retaining originals and protected landmarks: 19 additional replacements across all three sectors. Existing contact heights, openings, grips and movements are preserved. See the [movement obstacle preview](docs/new-movement-obstacles.png).


## Levels and course selection

The course menu now presents two selectable maps with sector previews, Standard/Hardcore difficulty, full-course time trials, and practice from any sector. Runner, camera, sound, swipe sensitivity, and fullscreen controls are grouped under **Runner & settings**. The selected level is remembered on this device.

- **Level 1 — Sunset Relay:** the original three-sector course, with its existing layout and v41 records preserved.
- **Level 2 — Harbor Run:** Warehouse Row, Crane District, and Port Skyline. Features freight equipment, six optional elevated routes, two crane-bar crossings, and two five-metre rooftop drops with roll-out corridors. Cool morning light, water, freight stacks, and harbor cranes distinguish the setting.

Each `Run` owns a `LevelDefinition` from `src/pages/Skystride/levels.ts`; simulation, obstacle meshes, scene geometry, practice starts, split markers, and finish detection read that same definition. Sunset geometry is authored in `sunset-course.ts`, Harbor geometry in `harbor-course.ts`. Movement Lab and existing offline studies continue to default to Sunset Relay.

Records are isolated by course version and difficulty. Sunset keeps `skystride.sunset-relay-v41.<mode>.best`; Harbor uses `skystride.harbor-run-v1.<mode>.best`. Practice and paused runs remain ineligible. Ghost validation rejects another map's course version.
