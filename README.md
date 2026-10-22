# Skystride

A standalone, fullscreen rooftop parkour time-trial game. Sunset Relay is a 3 km course with three sectors, elevated route choices, contextual traversal, swipe controls, and a local personal-best ghost.

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

## Controls

- Up / W / Space: jump from a roof or obstacle top; contextual vault, low-duct climb, wall step or high-wall climb near a suitable obstacle. Climb input remains available up to the visible wall face.
- Down / S: slide; on an obstacle top, slide off its edge with a prepared landing roll. In the air, press before landing from a drop to roll.
- Right / D: long jump at 11.5 m/s or faster; a normal jump below that speed. Jump distance carries current momentum, so build speed before a wide gap.
- R: restart. Escape: pause.
- Touch: swipe up/down/right; actions trigger before finger release. Swipe sensitivity is adjustable in the course menu.

Best runs remain in local storage on the current origin. A best from the original app is not transferred across origins automatically. Paused runs and practice attempts do not replace a personal best. Online leaderboards are not implemented.

See [game notes](docs/game-design.md) for mechanics, performance decisions, and first-playable limitations.

Character asset: `public/models/skystride-runner.glb`. Regenerate from the live geometry with `node scripts/export-runner.cjs`.

The default runner is Rooftop Climber, with a mustard hooded top, olive cargo shorts, wrist wraps, and burgundy shoes, using continuous limb surfaces and procedural contact animation. The movement lab includes an entry-speed slider, long-jump preview, and high-wall climb study. `node scripts/runner-study.cjs --wall` exports mesh triangles for offline inspection of the wall-climb poses.

Creative course encounters include ventilation chains, solar launch ramps, tank cradles, wall-run billboards, pipe crossings, broken bridges, construction windows, greenhouses, suspended scaffolds and staggered balconies. Swipe Up for contextual contacts/climbs; swipe Right near a window for a fast dive or near a tank for its service platform. New wall-run and dive previews are in the movement lab. See the v9 section of the game notes for animation phases and route choices.

Combo update: the technical district includes 20 named three- to five-contact chains and 16 new procedural parkour profiles. In the movement lab, select an individual technique or a `CHAIN · …` preview; adjust entry speed and bar-release timing, scrub, freeze or inspect the pose sheet. Chain previews use scripted inputs through the same simulation as gameplay. Right releases a bar contact into flight; Down offers a controlled drop. See the v13 game notes for current scope and limitations.

Bar crossings (v14): jump into hand reach, catch, then release across a real roof gap. Movement-lab previews include the same gaps and airborne approach; walking into a bar no longer starts the move.
Bar crossings v15 widen to 12.6 m with a faster 0.55 s swing, a stronger release impulse, and extended landing corridors. Movement-lab shares the updated geometry and physics.

Choose a character in the course or pause menu: Rooftop Courier, Rooftop Climber (default), Hop Bot, or Original Silhouette. The choice is saved on this device and applies to the runner and ghost. Available designs are registered in `src/pages/Skystride/characters.ts`.
