# Skystride

A standalone, fullscreen rooftop parkour time-trial game. Sunset Relay has three sectors, two elevated shortcuts, contextual traversal, swipe controls, and a local personal-best ghost.

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

`npm run build` instead targets `/` for root-domain hosting. This project has only the `/` game route. No deployment is triggered by local setup; `npm run deploy` is the explicit publishing step.

## Controls

- Up / W / Space: contextual jump, vault, or wall step.
- Down / S: slide or landing roll.
- R: restart. Escape: pause.
- Touch: swipe up/down; actions trigger before finger release.

Best runs remain in local storage on the current origin. A best from the original app is not transferred across origins automatically. Paused runs and practice attempts do not replace a personal best. Online leaderboards are not implemented.

See [game notes](docs/game-design.md) for mechanics, performance decisions, and first-playable limitations.
