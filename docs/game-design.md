# Skystride — movement and course design

## Visual reference

The supplied Skystride / Urban Silhouette concept is the visual direction: peach sunset, a pale warm sun, layered mauve skyline, navy roof silhouettes, thin amber roof edges, cream shirt and warm shoe accents. The scene uses original procedural geometry, including towers, vents, bridge silhouettes and pipework. This pass keeps that palette and composition; it is not a pixel-exact reproduction.

## Movement and timing

The character now has horizontal velocity, acceleration, vertical velocity, gravity and grounded state. Up jumps anywhere on a roof, with no obstacle required. Jump input is consumed on the next 120 Hz simulation tick. A 120 ms buffer accepts presses just before landing or traversal exit; 90 ms of coyote time permits a slightly late edge jump. There is no double jump. Holding a key does not auto-repeat actions.

Runs start at 7.5 units/s and build toward a cruising speed of 12 units/s. Clean actions build flow and retain extra momentum; running targets up to 13.5 and action boosts cap at 14. Stumbles and heavy landings remove speed. Ground acceleration is 3 units/s²; airborne motion retains takeoff momentum with only 0.12 units/s² drag, rather than accelerating toward cruising speed. Gravity is 30 units/s² while rising and 35.4 while falling and the standard launch speed is 12.4 units/s. These are arcade tuning values, not measurements of human performance or device latency.

Movement remains on a 2D plane. Roof tops, gaps, upper-route undersides and roof facades use shared authored geometry and fixed-step swept crossing checks. An impossible jump falls physically before failure; it cannot pass through the next roof facade. Lower-route jumps hit the underside of upper platforms. Obstacles use body-height checks and recoverable contact responses.

## Contextual parkour

Up inside a speed-scaled approach window selects the barrier’s authored vault. The clean opportunity is 300–400 ms on the normal line and 200–250 ms on upper hard routes. These are timing windows, not required intervals between inputs, as clarified by the user. Inputs within 0.55 units choose a slower safety recovery. An earlier up input is a normal ballistic jump. The special movement does not absorb arbitrary early inputs into a perfect vault.

Seven vault profiles remain. The course emphasizes Kong, dash, speed and lazy; step-over and step-on leap have been removed:

- Hurdle: no hand support, split legs and forward lean.
- Speed vault: low torso, trailing legs and a support hand.
- One-hand vault: asymmetric leg tuck and free-arm counterbalance.
- Safety vault: more upright, supported step-through and a time penalty when late.
- Lazy vault: reclined torso, legs leading over the obstacle.
- Kong: forward dive, two-hand support and compact knee tuck.
- Dash: both feet lead, then both palms brace behind the hips and push into the exit.

Vault paths rise before the obstacle, retain clearance across its full width and descend after the trailing edge. Their poses have entry, contact, tuck and release phases. Hands aim at world-space obstacle anchors while within anatomical reach. Two-bone inverse kinematics keeps arms and legs consistent in length. Contact releases as the shoulder passes beyond reach.

Up at a branch performs a wall step onto the high line. Four entrances now have 3.3-unit walls with a foot drive, two-hand catch, pull, palm press and top-out sequence. Their faces occupy the rear route lane so the normal line can pass in front. A fresh up input near a reachable lip while falling catches it, hangs briefly, then climbs. Up during the hang commits the climb sooner; down releases. Unreachable ledges do not rescue the player.

Down on the roof starts a 0.62 second slide, extending the low stance until the overhead obstacle is clear. Down in the air arms a landing roll for 250 ms on upper routes or 400 ms on the normal line. Drops over two units or impact speeds over 14 require a roll to preserve momentum; otherwise a compressed heavy landing costs speed. The roll rotates the tucked body through a full cycle. Jumping can interrupt ground recovery, while non-interruptible vault contacts accept buffered exit input.

Right / D / swipe right performs a long jump when current speed is at least 11.5 units/s, using a 13.6 units/s vertical launch. At lower speed it performs a normal jump and shows a build-speed cue. It never adds horizontal speed on takeoff. Up/down remain the essential controls. Swipe recognition uses an adjustable 10–32 pixel threshold (18 default), before release, with one action per contact.

## Sunset Relay v7

The course is now 3,000 units long with boundaries at 1,000, 2,000 and 3,000. The extended spacing supports the faster pace. Two upper routes add wall steps, gaps, vaults and drops; the lower line uses barriers and ducts. Both clean routes are exercised end-to-end by simulation tests. Tests verify that the clean upper route beats the clean lower route. Repeated mistimed vault jumps can now lose enough momentum to fail a later gap; air acceleration does not rescue those attempts.

Practice starts from a sector boundary and continues to the end; it does not yet loop isolated sectors or select upper-route entry states. There is one course. Pursuit, collectibles, online rankings, controller support and sound are not implemented in this pass.

## Presentation and competition

The camera renders interpolated player positions between simulation ticks, looks ahead and eases vertically with elevated routes. A branch approach adds a small upward anticipation. No shake or dramatic zoom. Touch keeps the full play area as its gesture surface. Native fullscreen and landscape locking are requested where supported; edge-to-edge browser play remains available. Rotation, focus loss and long frame stalls pause the run and remove personal-best eligibility.

The HUD shows time, personal best, route, current speed and flow. Results include sector times and difference against the previous best. The new course key is skystride.sunset-relay-v7.best, keeping incompatible earlier records separate.

Records now contain tick-stamped inputs and sampled animation frames. Tests reconstruct a complete upper-route run from its recorded inputs and compare its entire resulting record. This is local reproducibility testing; no server validation or cross-device determinism certification is claimed. Local saved data is not trusted competition data.

## Movement study

Open /movement-lab to inspect the actual runner and simulated movements. Choose a move, slow it down, freeze it or scrub the pose slider. This is an animation review tool, separate from the minimal gameplay HUD. It uses the same procedural runner and controller as the course. The live articulated runner uses shared model geometry in src/assets/runner-model.ts. A GLB of that exact geometry is exported at public/models/skystride-runner.glb; no purchased character, mocap clips or AnimationMixer is used.

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

## Urban Silhouette asset and marathon course

The runner uses a shaped cream shirt with a dark side inset, layered swept hair, loose upper trouser legs, amber soles and a short amber sash. These original meshes are assembled by the existing IK rig. `node scripts/export-runner.cjs` regenerates the approximately 400 KB GLB from the same geometry and rig; it is an articulated mesh asset in a sample sprint pose, not a skinned skeleton with baked animation clips. Runtime continues to animate the shared geometry directly, so gameplay and exported asset stay aligned.

Chest and head lean increase continuously between 6 and 14 m/s. Airborne leg reach and opposing arm drive increase with speed; the planted foot path remains unchanged to prevent skating. Vertical speed falls toward zero at the crest and increases on descent under gravity. Horizontal speed is carried from takeoff, so slower approaches make shorter jumps. Vaults ease over support and accelerate toward release, with a longer safety-vault duration. No input delay, hit-stop, or global slow-motion effect is introduced.

The 500–1450 m district supplies 48 obstacles on each line, emphasizing the four primary vault families, with regular slide passages and gaps on the upper line. Its 950 m length lasts at least 67.8 seconds at the 14 m/s flow cap. It follows the opening course and leads into three rooftop blocks and a final approach. Both complete routes are tested to finish in 180–300 seconds with zero forced recoveries. Repeatable patterns support route learning. Ledge catches remain a recovery opportunity rather than a mandatory failure.

Roof trim, railings, water tanks and checkpoint posts have neutral edges. Amber strips mark interactive vault surfaces, ducts, branch lips, gap edges and drops. Background sunlight and the runner’s costume accents retain the concept palette. Static boxes are instanced by material within 80 m chunks so distant districts can be culled; skyline layers wrap beyond the old 480 m extent.

The course/replay key is now v7 because layout, timing and traversal trajectories changed. Existing records are left in storage but are not compared against the new course. This pass was checked through simulation, type checking, lint, production compilation and a software-rendered character pose study. Browser gameplay and real-phone feel still need visual/device playtesting.

## Character surface refinement

The arms and trousers now use continuous deforming mesh surfaces through the existing two-bone IK joints. Rounded bends replace separate cylinder ends and visible knee/elbow balls. Each of four limb surfaces uses 25 cross-sections and 12 radial segments; vertex buffers are reused and normals updated after deformation. Joint targets, contacts and gameplay trajectories are unchanged.

The shirt uses a curved volume with tapered waist and rounded shoulders. Face, hair, shoes and sash use curved outlines and small multi-segment bevels. A collar, shoe upper panels and thumb volumes add detail. Rough, softly lit materials make the surfaces readable in the actual Three.js lighting while preserving the navy/cream/amber palette. This is still a procedural articulated model, with continuous limb deformation rather than a full skinned character asset.

The GLB export includes the refined geometry. A software pose study checked cruise, sprint and Kong silhouettes; the runtime lighting and mobile GPU cost still need browser/device review. Animation regression tests cover bend stability and outward-facing limb normals in addition to previous IK/pose checks.

## Dense obstacle chains

The course now has 567 obstacles across the two routes, up from 189. Added approach obstacles alternate compact vaults and narrow ducts. New contacts are spaced 5.8 m along the hard line and 7 m along the normal line where the existing terrain permits. Gap landing areas, wall-step exits and route rejoin zones retain clearance; obstacles are not inserted into those recovery paths.

Clean simulation attempts require 362 inputs on the normal route (previously 107) and 358 on the hard route (previously 125). With the contact and momentum pass, the clean normal attempt finishes in 4:00.68 and the hard attempt in 4:00.24, both without recoveries. Full-route tests enforce at least 350 actions and a median interval below 650 ms. This increases input frequency while retaining the previous clean timing windows and movement speed. The v7 record key separates these results from earlier physics and less-dense courses.


## Contact and momentum pass

Running hips now compress during the planted part of each stride and rebound after toe-off, with chest/head following that motion. Faster running increases the compression and existing forward lean. Descending jumps extend both feet ahead of the hips. Landing plants both feet before recovering into the run or rolling; heavy impacts add a hand brace and a longer, 380 ms recovery. A missed roll removes 4.2 units/s and briefly lowers the recovery-speed target. The existing 250/400 ms roll windows are unchanged.

Slide entry has a 70 ms crouch, followed by leg extension into the low pose by 170 ms. Input and low collision state still take effect on the next simulation tick. Sliding removes up to 0.7 units/s at entry and continues losing up to 1.9 units/s² toward 10.8 units/s. It never speeds up an already slow runner. Standing blends back over 160 ms, while normal running rebuilds momentum at up to 3 units/s². This makes slide-heavy paths slower than clean vault paths without adding input delay.

Kong now has distinct leg-load, leg-push, hand-plant, hand-push and release phases. The initial load stays near the roof before the dive. A second lift begins after hand contact, with a one-time 0.3 units/s exit impulse; the whole traversal retains obstacle clearance. These are authored arcade trajectories rather than a rigid-body character simulation.

Narrow ducts have a 1.65-unit top and a 1.25-unit underside. Up can slowly climb over them when there is overhead clearance; Down slides underneath faster. Ducts beneath another roof do not offer a climb. The HUD exposes the choice only where it is valid, and the movement study includes a mantle preview. Rendered beam height and collision height use the same obstacle data.

The latest full-course simulation finishes both routes with zero recoveries and 362 normal / 358 hard inputs. The technical district takes approximately 77 seconds on the normal route and 75 seconds on the hard route. Regression tests cover momentum loss/recovery, no slide speed boost after a stumble, climb clearance and duration, the second Kong lift, body rebound, two-foot/hand landing targets, slide entry and reachable hand support. Offline rendering of the actual articulated geometry checks the transition silhouettes. This pass has not been visually verified in a browser or on a phone.


## Silhouette, momentum and high walls — v6

The current runner replaces the earlier cream-shirt/sash costume with a dark athletic silhouette inspired by Vector and Shadow Fight. The torso has independently shaped rib-cage depth, shoulder width and waist sections. A rounded pelvis, tapered thighs/calves and continuous arm surfaces meet the existing IK targets. The head/neck proportions, short hair profile, hands, shoes and arm swing have been revised. Running arms now swing along upper-arm/forearm arcs rather than collapsing toward the ribs during the middle of a stride. This remains original procedural articulated geometry, not imported character animation or a mocap asset.

The reference research used [Nekki’s Vector page](https://vector.game/), [Cascadeur’s account of its Nekki origins and physics-based approach](https://cascadeur.com/about), and [London Parkour’s wall-run/climb-up lesson and transcript](https://londonparkour.com/tutorials/wall-run-climbup/). The wall lesson informed the sequence from foot drive to ledge catch and upward press. Those observations guide authored game poses; the runtime does not use Cascadeur or simulate a complete biomechanical body.

Flat-ground simulation measurements illustrate the momentum rule:

| Takeoff speed | Normal jump | Right / forward input |
| --- | --- | --- |
| 6 m/s | 4.71 m | 4.71 m; normal jump |
| 9 m/s | 7.09 m | 7.09 m; normal jump |
| 12 m/s | 9.46 m | 10.35 m; long jump |
| 14 m/s | 11.05 m | 12.09 m; long jump |

These use the game’s units and fixed-step flight on a level roof; actual gaps depend on takeoff location and landing height. Regaining 11.5 m/s from 6 m/s takes about 1.84 seconds of uninterrupted ground acceleration. Jumping while slow does not bypass that recovery. Long jumps still require an appropriately timed roll for a hard landing. The HUD shows when long-jump speed is ready.

Four high-route entrances at 115, 1595, 2075 and 2555 m lead to 3.3 m wall faces. The character moves into the rear climbing lane, plants a foot, drives upward, holds the lip, pulls and presses, then lifts the leading shoe above the lip before stepping onto the upper roof. Slower approaches lengthen the climb; exiting removes 10% of carried speed. Eight upper technical-district ducts become wide Kong obstacles, reducing slide friction for clean high-route play and preserving a time advantage despite climbing. Total obstacle count remains 567.

The movement lab adds long-jump and wall-climb previews plus a 6–14 m/s entry-speed slider. The shared GLB is regenerated from the same runtime geometry. `node scripts/runner-study.cjs --wall` produces an offline triangle study for the six wall-climb phases. No new runtime dependencies or postprocessing were added; the 120 Hz input/simulation loop is unchanged.

The regression suite covers takeoff-speed distance, long-jump readiness, slower momentum recovery, all four wall exits, planted-foot/hand contacts, leading-shoe clearance, deterministic replay and the existing full-course checks. The v6 key separates the new physics and course from previous personal bests without deleting them. Character pose inspection uses offline geometry renders; browser lighting, animation feel and real-phone performance still need device review.


## Running swing, contact chaining and readability — v7

The running forearm now rotates relative to its upper arm instead of always pointing forward. Opposing shoulders drive one wrist behind the hip while the other reaches forward. Swing increases with speed; planted feet, body compression, shorter neck, longer shins and amber soles remain intact.

Branch inputs now work from the original approach window to 0.2 units before the visible wall face. Late attempts still lose momentum, but do not reject the climb. Airborne inputs only engage within 0.8 units of the wall and below its lip. High airborne catches preserve the current position and lift before moving across the ledge. Grounded late climbs never move backwards to a preset approach point.

Vaults and ducts now have physical top support surfaces independent of whether their scoring event has been handled. Descending onto one allows an immediate up/right jump. A supported low-duct mantle can also be interrupted once the runner reaches its top; wall climbs accept follow-up input once the feet reach the roof. Traversals without foot support remain non-interruptible and retain the short input buffer.

Down from a supported obstacle top initiates a feet-first edge slide. It carries the runner to the actual edge, falls under gravity, blends into a two-foot landing reach, and arms a landing roll. It does not teleport to the floor or add an airborne jump. Tall lower-route duct tops retain their lower-route identity.

Of 332 vault obstacles, 320 now use the four requested families: 86 speed, 76 Kong, 81 dash and 77 lazy. The 567-obstacle course still completes in approximately four minutes: normal 240.68 seconds / 362 actions; hard 240.24 seconds / 358 actions, with zero forced recoveries in the deterministic clean-route driver. Version v7 keeps previous local bests separate because movement and obstacle assignments changed.

Background service props and water towers use lighter, desaturated unlit materials and sit farther behind the running lane. Interactive barriers retain darker dimensional faces; amber tops and duct undersides identify usable surfaces. Decorative objects have no amber interaction strips. No postprocessing, extra lighting passes or assets were added. Support arrays are built once rather than allocated in the 120 Hz loop.

Verification includes late/airborne climbing, physical obstacle-top landing on both routes, immediate follow-up jumps, mantle interruption, gravity-driven exits, opposing arm swing, real dash hand contacts, full-course balance and deterministic replay. Offline geometry pose studies inspect sprint and dash poses; they do not verify browser lighting or real-device feel.
