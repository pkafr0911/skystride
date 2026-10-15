# Skystride — first playable

Route: `/` locally; `/skystride/` on GitHub Pages. This is a standalone, viewport-filling game project.

## Art direction

Based on the supplied Skystride concept: apricot sunset, layered mauve skyline, navy rooftop architecture, amber roof edges, and a dark runner with a cream shirt and red shoes/wrist accents. All scene assets are procedural Three.js geometry. The runner is an articulated primitive rig with action-specific poses, not a finished skinned character or a reproduction of the illustration. No downloaded assets, new dependencies, or effects pipeline.

## Sunset Relay

A 324-meter authored course with three sectors and two elevated route choices. Auto-run at 7.8 units/second. Up triggers a contextual jump, vault, wall step, or late ledge catch. Down triggers a slide or landing roll. Amber markings indicate a clean timing band 1.4–3.1 units ahead of an obstacle. Inputs within 5.5 units can start traversal; early execution takes longer. Clean traversal uses 8.8 units/second, recovery 6.1 with additional catch/stumble delays. Upper routes bypass lower obstacles but introduce gap jumps and drops. Missed gaps end the attempt; missed barriers and slides recover with a time cost.

Traversal uses authored paths, with a below-ledge hang/climb for catches. This is a deterministic contextual traversal prototype, not a general-purpose rigid-body collision system or production contact-IK animation. Physical contacts and gesture windows need visual/device tuning before expanding the course library.

## Controls and competition

- Desktop: Up / W / Space for jump; Down / S for slide; R to retry; Escape to pause.
- Mobile: vertical swipes anywhere on the course, fired at a 22px threshold before release. One action per contact. No on-screen gameplay button pad.
- Fullscreen requests native fullscreen and landscape orientation from a user gesture. A fixed edge-to-edge layout remains when the browser declines. Portrait stays playable and recommends landscape. Rotation, tab hiding, or focus loss pauses.
- Time trial, practice from each sector, immediate retry, cumulative sector splits, and best-run ghost.
- Best time/replay stored locally under a course-versioned key. Paused and practice runs cannot replace a best. Storage failure retains this visit's record in memory.
- No online leaderboard, shared ghosts, trusted submissions, or pursuer in this first playable. Local storage is not cheat resistant.

## Engineering

The React page owns controls and HUD; the lazy Three.js scene owns rendering and advances a 120Hz simulation. Actions mutate the model directly, without React state or key-release delay. HUD updates at 10Hz. Ghosts sample every six ticks and interpolate between samples. Native key repeats are ignored. Long frame stalls over 200ms pause and disqualify the run rather than silently discarding elapsed simulation time.

DPR capped at 1.5. Shared geometry/materials, no shadows or postprocessing; frame loop, ResizeObserver, listeners, geometries, materials, renderer disposed on unmount. WebGL failure/context loss gives a readable error. Reduced-motion removes UI entrance/transition motion; essential running motion remains. The game is the sole route and fills the viewport; native fullscreen is optional.

## Verification

`npm run test:skystride` covers full clean runs on both routes, shortcut advantage, early-input time cost, deterministic replays, gap failure, late catches, wrong actions, input repeat, pause/restart, practice isolation, replay validation, and swipe recognition.

TypeScript, scoped ESLint, and GitHub Pages production build are also required. Browser inspection was blocked by the earlier browser security restriction, so visual composition, animation contact quality, native fullscreen behavior, and real-device input latency remain unverified. No deployment performed.
