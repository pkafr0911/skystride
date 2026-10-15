# Skystride — movement pass

## Visual reference

The supplied Skystride / Urban Silhouette concept is the visual direction: peach sunset, a pale warm sun, layered mauve skyline, navy roof silhouettes, thin amber roof edges, cream shirt and warm shoe accents. The scene uses original procedural geometry, including towers, vents, bridge silhouettes and pipework. This pass keeps that palette and composition; it is not a pixel-exact reproduction.

## Movement and timing

The character now has horizontal velocity, acceleration, vertical velocity, gravity and grounded state. Up jumps anywhere on a roof, with no obstacle required. Jump input is consumed on the next 120 Hz simulation tick. A 120 ms buffer accepts presses just before landing or traversal exit; 90 ms of coyote time permits a slightly late edge jump. There is no double jump. Holding a key does not auto-repeat actions.

Cruising speed is 12 units/s, up from 7.8. Clean actions build flow and retain extra momentum; running targets up to 13.5 and action boosts cap at 14. Stumbles and heavy landings remove speed, followed by acceleration. Gravity is 30 units/s² and the standard launch speed is 12.4 units/s. These are arcade tuning values, not measurements of human performance or device latency.

Movement remains on a 2D plane. Roof tops, gaps, upper-route undersides and roof facades use shared authored geometry and fixed-step swept crossing checks. An impossible jump falls physically before failure; it cannot pass through the next roof facade. Lower-route jumps hit the underside of upper platforms. Obstacles use body-height checks and recoverable contact responses.

## Contextual parkour

Up within 2.65 units of a barrier selects its authored vault. Inputs within 0.55 units choose a slower safety recovery. An earlier up input is a normal ballistic jump. The special movement does not absorb arbitrary early inputs into a perfect vault.

Eight vault profiles have distinct body, knee, foot and arm poses:

- Step-over: low obstacle, running step and raised leading foot.
- Hurdle: no hand support, split legs and forward lean.
- Speed vault: low torso, trailing legs and a support hand.
- One-hand vault: asymmetric leg tuck and free-arm counterbalance.
- Safety vault: more upright, supported step-through and a time penalty when late.
- Lazy vault: reclined torso, legs leading over the obstacle.
- Kong: forward dive, two-hand support and compact knee tuck.
- Step-on leap: raised support foot and a higher outgoing arc.

Vault paths rise before the obstacle, retain clearance across its full width and descend after the trailing edge. Their poses have entry, contact, tuck and release phases. Hands aim at world-space obstacle anchors while within anatomical reach. Two-bone inverse kinematics keeps arms and legs consistent in length. Contact releases as the shoulder passes beyond reach.

Up at a branch performs a wall step onto the high line. A fresh up input near a reachable lip while falling catches it, hangs briefly, then climbs. Up during the hang commits the climb sooner; down releases. Unreachable ledges do not rescue the player.

Down on the roof starts a 0.62 second slide, extending the low stance until the overhead obstacle is clear. Down in the air arms a landing roll for 0.55 seconds. Drops over two units or impact speeds over 14 require a roll to preserve momentum; otherwise a compressed heavy landing costs speed. The roll rotates the tucked body through a full cycle. Jumping can interrupt ground recovery, while non-interruptible vault contacts accept buffered exit input.

Right / D / swipe right performs a slightly longer jump. Up/down remain the essential controls. Swipe recognition uses an adjustable 10–32 pixel threshold (18 default), before release, with one action per contact.

## Sunset Relay v2

The course is now 480 units long with boundaries at 160, 320 and 480. The extended spacing supports the faster pace. Two upper routes add wall steps, gaps, vaults and drops; the lower line uses barriers and ducts. Both clean routes and early vault-jump attempts are exercised end-to-end by simulation tests. Tests verify that the clean upper route beats the clean lower route and that early vault jumps cost time.

Practice starts from a sector boundary and continues to the end; it does not yet loop isolated sectors or select upper-route entry states. There is one course. Pursuit, collectibles, online rankings, controller support and sound are not implemented in this pass.

## Presentation and competition

The camera renders interpolated player positions between simulation ticks, looks ahead and eases vertically with elevated routes. A branch approach adds a small upward anticipation. No shake or dramatic zoom. Touch keeps the full play area as its gesture surface. Native fullscreen and landscape locking are requested where supported; edge-to-edge browser play remains available. Rotation, focus loss and long frame stalls pause the run and remove personal-best eligibility.

The HUD shows time, personal best, route, current speed and flow. Results include sector times and difference against the previous best. The new course key is skystride.sunset-relay-v2.best, keeping incompatible v1 records separate.

Records now contain tick-stamped inputs and sampled animation frames. Tests reconstruct a complete upper-route run from its recorded inputs and compare its entire resulting record. This is local reproducibility testing; no server validation or cross-device determinism certification is claimed. Local saved data is not trusted competition data.

## Movement study

Open /movement-lab to inspect the actual runner and simulated movements. Choose a move, slow it down, freeze it or scrub the pose slider. This is an animation review tool, separate from the minimal gameplay HUD. It uses the same procedural runner and controller as the course. No purchased character, mocap clips, GLB model or AnimationMixer is present yet.

## Animation strength pass

Vector is the requested reference for readable, athletic parkour silhouettes ([official game reference](https://vector.game/)). Skystride keeps its own cream shirt, navy silhouette and amber soles. The rig now uses tapered limbs, a shoulder-to-waist torso, a shaped head and swept hair, and angled sneakers. Far limbs use a muted navy to keep overlapping limbs readable.

The sprint follows distance traveled. Each support foot remains fixed in world space during stance, then moves through toe-off, heel recovery, knee drive and forward reach. Opposing arms and a forward torso lean support the stride. Jump animation extends through a 65 ms push-off, drives the lead knee and opposite arm, opens into flight, and reaches down according to descending velocity. Visual anticipation adds no input delay. The existing 120 Hz controller, jump buffer and coyote time remain active.

Landing compression is driven by recorded impact velocity. Heavy landings bend the hips and torso more deeply and recover longer; lighter vault exits move back into the sprint sooner. Small, short-lived dust bursts remain at the actual takeoff and landing positions. There is no added hit-stop. The kong tuck brings the knees under the chest; supported vaults release their hand anchors when they leave arm reach. Each vault has its own support, clearance and exit poses.

Animation sampling is a pure function of the movement frame. Broad stateful smoothing has been removed; authored phase timing provides transitions. Live rendering, the study and recorded ghosts interpolate motion clocks with position. Optional launch, lead-leg and impact metadata preserve compatibility with existing v2 records. The study adds a five-pose sheet, phase names, a heavy-landing example and accurate freeze/scrub controls; real speed is the default.

## Verification

Run npm test, npm run tsc, npm run lint and npm run build-pre. The regression suite covers free jumping, no double jump, buffer expiry and landing buffers, coyote grace, full clean routes, momentum differences, all vault selections, complete obstacle clearance, vault-exit buffering, slides, roll timing, ledge catches, ceiling/facade collision, pause/restart, replay validation, exact input playback and gestures.

Animation regressions also check planted world-space feet, anatomical IK lengths at unreachable/singular targets, knee drive and landing reach, impact-dependent compression, frame-rate-independent pose sampling, transition interpolation and finite geometry through every vault.

Windows x64 explicitly includes the matching optional Mako native dependency because the inherited lockfile omitted it. This remains optional on other operating systems.

Browser review checks gameplay and the movement study. Real-phone latency, thermal behavior, native fullscreen/orientation support and sustained mobile frame pacing still require device playtesting. The runner is an improved procedural animation system, not finished character production art.
