import { speedZoom, easeZoom } from "./camera";
import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { canMantle, Frame, obstacles, Run, STEP } from "./model";
import { interpolateFrame, poseFor, runPose, STANCE, STRIDE } from "./motion";
import { creativeObstacle } from "./obstacle-mesh";
import { framesFor, previewObstacles } from "./lab-model";
import { techniques, comboNames, isSwing } from "./combos";
import { limbSurface } from "../../assets/limb-surface";
import { LEG_LENGTHS, makeRunner, solveJoint } from "./runner";

test("sprint support feet remain fixed in world space until toe-off", () => {
  for (const s of [0, 1]) {
    const offset = s ? STRIDE * 0.5 : 0,
      contact = offset + 0.38 + 0.25;
    for (let i = 0; i < 20; i++) {
      const x = offset + (i / 20) * STANCE * STRIDE,
        pose = runPose(x);
      const angle = pose.footAngles[s];
      assert.ok(
        Math.abs(
          x +
            pose.feet[s][0] +
            0.25 * Math.cos(angle) +
            0.075 * Math.sin(angle) -
            contact,
        ) < 1e-8,
      );
      assert.ok(
        Math.abs(
          pose.feet[s][1] +
            0.25 * Math.sin(angle) -
            0.075 * Math.cos(angle) -
            0.015,
        ) < 1e-8,
      );
      const hip = new THREE.Vector3(...pose.hip).add(
        new THREE.Vector3(0, -0.025, s ? 0.14 : -0.14),
      );
      const ankle = new THREE.Vector3(...pose.feet[s]),
        target = ankle.clone();
      solveJoint(
        hip,
        ankle,
        new THREE.Vector3(...pose.knees[s]),
        LEG_LENGTHS.thigh,
        LEG_LENGTHS.shin,
      );
      assert.ok(
        ankle.distanceTo(target) < 1e-6,
        "IK must not pull a planted foot off the roof",
      );
    }
  }
});
test("two-bone joints keep anatomical lengths even at singular and unreachable targets", () => {
  for (const target of [
    [0, 0, 0],
    [0, -10, 0],
    [0, -0.6, 0],
    [0.9, 0.1, 0.3],
  ]) {
    const start = new THREE.Vector3(),
      end = new THREE.Vector3(...target),
      elbow = solveJoint(start, end, new THREE.Vector3(0, -1, 0), 0.34, 0.34);
    assert.ok(Math.abs(elbow.distanceTo(start) - 0.34) < 1e-6);
    assert.ok(Math.abs(elbow.distanceTo(end) - 0.34) < 1e-6);
    assert.ok([...elbow.toArray(), ...end.toArray()].every(Number.isFinite));
  }
});
test("jump visibly extends from push-off, drives a knee, then reaches down before landing", () => {
  const g = new Run();
  g.start();
  g.action("up");
  g.step();
  const load = poseFor(g.frame());
  for (let i = 0; i < 8; i++) g.step();
  const drive = poseFor(g.frame());
  assert.ok(drive.hip[1] > load.hip[1] + 0.15);
  assert.ok(Math.max(...drive.feet.map((f) => f[1])) > 0.65);
  while (g.vy > -10) g.step();
  const reach = poseFor(g.frame());
  assert.ok(Math.min(...reach.feet.map((f) => f[1])) < 0.14);
});
test("landing compression scales with impact and recovers into the sprint", () => {
  const base: Frame = {
    ...new Run().frame(),
    move: "land",
    x: 1,
    landX: 1,
    landingAge: 0.055,
    moveTime: 0.055,
    progress: 0.2,
  };
  const soft = poseFor({ ...base, impact: 5 }),
    heavy = poseFor({ ...base, impact: 17 });
  assert.ok(heavy.hip[1] < soft.hip[1] - 0.08);
  // Harder impact also keeps the body loaded longer, with both poses clear of the surface.
  assert.ok(heavy.hip[1] > 0.45 && soft.hip[1] > 0.45);
  const lateSoft = poseFor({ ...base, impact: 5, landingAge: 0.23 });
  const lateHeavy = poseFor({ ...base, impact: 17, landingAge: 0.23 });
  assert.ok(lateSoft.hip[1] > lateHeavy.hip[1]);
});
test("animation interpolation follows the motion clock without mixing separate contacts", () => {
  const a: Frame = {
    ...new Run().frame(),
    move: "jump",
    moveTime: 0.3,
    x: 4,
    vy: 2,
  };
  const b: Frame = { ...a, move: "fall", moveTime: 0.35, x: 4.6, vy: -0.5 };
  const middle = interpolateFrame(a, b, 0.5);
  assert.equal(middle.x, 4.3);
  assert.ok(Math.abs(middle.moveTime - 0.325) < 1e-10);
  assert.equal(middle.vy, 0.75);
  const landed: Frame = {
    ...b,
    move: "land",
    moveTime: 0,
    landingAge: 0,
    landX: 4.6,
  };
  assert.equal(interpolateFrame(b, landed, 0.5).move, "fall");
  assert.equal(interpolateFrame(b, landed, 1).landingAge, 0);
  assert.equal(
    interpolateFrame(
      { ...a, landingAge: undefined },
      { ...b, landingAge: undefined },
      0.5,
    ).landingAge,
    undefined,
  );
});
test("renderer pose is independent of frame rate and previous scrub position", () => {
  const scene = new THREE.Scene(),
    a = makeRunner(scene),
    b = makeRunner(scene);
  const g = new Run();
  g.start();
  g.action("up");
  for (let i = 0; i < 30; i++) g.step();
  const target = g.frame();
  a.pose(target, g.time, 1 / 30);
  b.pose({ ...target, move: "roll", progress: 0.6 }, 1, 1);
  b.pose(target, g.time, 1 / 144);
  a.group.updateMatrixWorld(true);
  b.group.updateMatrixWorld(true);
  assert.deepEqual(
    a.group.children.map((m) => m.matrixWorld.toArray()),
    b.group.children.map((m) => m.matrixWorld.toArray()),
  );
  a.dispose();
  b.dispose();
  assert.equal(scene.children.length, 0);
});
test("all vaults remain finite through contact, clearance and release", () => {
  const scene = new THREE.Scene(),
    actor = makeRunner(scene);
  for (const obstacle of obstacles.filter((o) => o.kind === "vault")) {
    const g = new Run();
    g.start();
    g.x = obstacle.x - 2;
    g.y = obstacle.route === "upper" ? 3.3 : 0;
    g.upper = obstacle.route === "upper";
    g.action("up");
    for (let tick = 0; tick < 90; tick++) {
      g.step();
      actor.pose(g.frame(), g.time, STEP);
      actor.group.updateMatrixWorld(true);
      for (const mesh of actor.group.children)
        assert.ok(mesh.matrixWorld.toArray().every(Number.isFinite));
    }
  }
  actor.dispose();
});
test("safety vaults keep the leading knee bent forward", () => {
  for (const vault of ["safety"] as const) {
    const p = poseFor({
      ...new Run().frame(),
      move: "vault",
      vault,
      progress: 0.45,
    });
    const hip = new THREE.Vector3(...p.hip).add(
      new THREE.Vector3(0, -0.025, -0.14),
    );
    const foot = new THREE.Vector3(...p.feet[0]);
    const knee = solveJoint(
      hip,
      foot,
      new THREE.Vector3(...p.knees[0]),
      LEG_LENGTHS.thigh,
      LEG_LENGTHS.shin,
    );
    assert.ok(knee.x > (hip.x + foot.x) / 2, vault);
  }
});

test("speed drives a lower chest/head and wider airborne stride while preserving stance", () => {
  let slowReach = 0,
    fastReach = 0;
  for (let i = 0; i < 100; i++) {
    const x = (STRIDE * i) / 100,
      slow = runPose(x, 6),
      fast = runPose(x, 14);
    assert.ok(fast.chest[0] > slow.chest[0]);
    assert.ok(fast.head[1] < slow.head[1]);
    assert.ok(fast.chest[1] < slow.chest[1]);
    slowReach = Math.max(slowReach, ...slow.feet.map((f) => Math.abs(f[0])));
    fastReach = Math.max(fastReach, ...fast.feet.map((f) => Math.abs(f[0])));
    if (i / 100 <= STANCE) assert.deepEqual(slow.feet[0], fast.feet[0]);
  }
  assert.ok(fastReach > slowReach + 0.1);
});

test("continuous limbs retain finite outward-facing surfaces through deep joint bends", () => {
  const material = new THREE.MeshStandardMaterial();
  const skin = limbSurface(material);
  for (const bend of [0, 0.1, 0.5, 0.9]) {
    skin.update(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(bend, 0.5, 0),
      new THREE.Vector3(0, 0, 0),
      0.14,
      0.075,
      true,
    );
    const positions = skin.geometry.getAttribute("position"),
      normals = skin.geometry.getAttribute("normal");
    assert.ok(Array.from(positions.array).every(Number.isFinite));
    assert.ok(Array.from(normals.array).every(Number.isFinite));
    // On a straight limb, the first side faces left. Its normal must point outward.
    if (bend === 0) assert.ok(normals.getX(12 * 4) < -0.5);
    assert.ok(skin.geometry.index!.count > 1000);
  }
  skin.geometry.dispose();
  material.dispose();
});

test("body mass compresses in stance and rebounds after toe-off", () => {
  const hips = Array.from(
    { length: 100 },
    (_, i) => runPose((i / 100) * STRIDE, 14).hip[1],
  );
  assert.ok(Math.max(...hips) - Math.min(...hips) > 0.18);
  assert.ok(
    runPose((STANCE * STRIDE) / 2, 14).hip[1] <
      runPose((STANCE + 0.1) * STRIDE, 14).hip[1],
  );
});
test("descending jumps present both feet forward and heavy impacts brace a hand", () => {
  const f = {
    ...new Run().frame(),
    move: "fall" as const,
    moveTime: 0.6,
    vy: -15,
  };
  const pose = poseFor(f);
  assert.ok(pose.feet.every((p) => p[0] > 0.2 && p[1] < 0.15));
  const landing = poseFor({
    ...f,
    move: "land",
    impact: 17,
    landingAge: 0.055,
    landX: f.x,
  });
  assert.ok(landing.feet.every((p) => p[1] < 0.1));
  assert.ok(landing.hands[1][1] < 0.07);
});
test("slide passes through a distinct crouch before extending the legs", () => {
  const f = { ...new Run().frame(), move: "slide" as const, progress: 0 };
  const entry = poseFor({ ...f, moveTime: 0 }),
    duck = poseFor({ ...f, moveTime: 0.07 }),
    glide = poseFor({ ...f, moveTime: 0.2 });
  assert.ok(entry.hip[1] > duck.hip[1] && duck.hip[1] > glide.hip[1]);
  assert.ok(glide.feet[0][0] > duck.feet[0][0]);
});

test("Kong and low-duct climb put both reachable wrists on the obstacle", () => {
  for (const o of [
    obstacles.find((o) => o.vault === "kong")!,
    obstacles.find(canMantle)!,
  ]) {
    const g = new Run();
    g.start();
    g.x = o.x - 1.9;
    g.y = o.route === "upper" ? 3.3 : 0;
    g.upper = o.route === "upper";
    g.action("up");
    g.step();
    let contactFrames = 0;
    while (g.traversal) {
      const f = g.frame(),
        p = poseFor(f);
      const touching = [0, 1].every((side) => {
        const hand = new THREE.Vector3(...p.hands[side]);
        solveJoint(
          new THREE.Vector3(...p.chest).add(
            new THREE.Vector3(-0.015, -0.025, side ? 0.185 : -0.185),
          ),
          hand,
          new THREE.Vector3(...p.elbows[side]),
          0.34,
          0.34,
        );
        return (
          Math.abs(hand.y + f.y - f.contact!.y) < 0.08 &&
          Math.abs(hand.x + f.x - f.contact!.x) < 0.1
        );
      });
      if (touching) contactFrames++;
      g.step();
    }
    assert.ok(
      contactFrames >= 2,
      `${o.vault ?? "mantle"} needs sustained hand support`,
    );
  }
});

test("high-wall climb plants a foot, holds both hands at the lip and clears the leading shoe", () => {
  const o = obstacles.find((o) => o.kind === "branch" && o.height)!;
  const g = new Run();
  g.start();
  g.x = o.x - 1.9;
  g.speed = 12;
  g.action("up");
  g.step();
  let caught = 0,
    planted = false;
  while (g.traversal) {
    const f = g.frame(),
      p = poseFor(f),
      face = f.contact!.x,
      lip = f.contact!.y;
    if (f.progress > 0.34 && f.progress < 0.38) {
      assert.ok(Math.abs(f.x + p.feet[0][0] + 0.09 - face) < 0.035);
      planted = true;
    }
    if (f.progress > 0.54 && f.progress < 0.8) {
      for (const side of [0, 1]) {
        const hand = new THREE.Vector3(...p.hands[side]);
        solveJoint(
          new THREE.Vector3(...p.chest).add(
            new THREE.Vector3(-0.015, -0.025, side ? 0.185 : -0.185),
          ),
          hand,
          new THREE.Vector3(...p.elbows[side]),
          0.34,
          0.34,
        );
        assert.ok(Math.abs(hand.x + f.x - face) < 0.07);
        assert.ok(Math.abs(hand.y + f.y - lip) < 0.07);
      }
      caught++;
    }
    if (f.progress > 0.85 && f.progress < 0.94) {
      assert.ok(
        p.feet[0][1] + f.y >= lip + 0.07,
        "raise the leading shoe before stepping across the lip",
      );
    }
    g.step();
  }
  assert.ok(planted && caught > 8);
});

test("running wrists swing behind and ahead of the torso in opposing phases", () => {
  for (const speed of [6, 10, 14]) {
    const offsets: number[][] = [[], []];
    const hips: number[][] = [[], []];
    for (let i = 0; i < 100; i++) {
      const p = runPose((STRIDE * i) / 100, speed);
      for (const side of [0, 1]) {
        offsets[side].push(p.hands[side][0] - p.chest[0]);
        hips[side].push(p.hands[side][0] - p.hip[0]);
        const upper = new THREE.Vector3(...p.elbows[side]).sub(
          new THREE.Vector3(
            p.chest[0] - 0.015,
            p.chest[1] - 0.025,
            side ? 0.2 : -0.2,
          ),
        );
        assert.ok(Math.abs(upper.length() - 0.34) < 1e-6);
      }
      if (Math.abs(Math.cos((i / 100) * Math.PI * 2 - 0.3)) > 0.8)
        assert.ok(
          offsets[0][i] * offsets[1][i] < 0,
          "one arm must drive back while the other drives forward",
        );
    }
    for (const side of [0, 1]) {
      assert.ok(Math.min(...offsets[side]) < -0.22);
      assert.ok(Math.max(...offsets[side]) > 0.3);
      assert.ok(Math.min(...hips[side]) < 0, "rear wrist must pass the hip");
    }
  }
});

test("dash leads with both feet and braces both palms behind the hips", () => {
  const f = {
    ...new Run().frame(),
    move: "vault" as const,
    vault: "dash" as const,
    progress: 0.5,
  };
  const p = poseFor(f);
  for (const side of [0, 1]) {
    assert.ok(p.feet[side][0] > p.hip[0] + 0.6);
    assert.ok(p.hands[side][0] < p.hip[0] - 0.2);
  }
  const supported = poseFor({
    ...f,
    x: 0.3,
    y: 1.1,
    contact: { x: 0.1, y: 1.1 },
  });
  for (const hand of supported.hands)
    assert.ok(
      Math.abs(hand[1] - 0.025) < 0.03,
      "palms contact the support during the push",
    );
});

test("dash wrists reach actual narrow and wide obstacle contact points", () => {
  for (const o of [
    obstacles.find((o) => o.vault === "dash" && o.width < 1)!,
    obstacles.find((o) => o.vault === "dash" && o.width > 2)!,
  ]) {
    const g = new Run();
    g.start();
    g.x = o.x - 1.9;
    g.speed = 12;
    g.upper = o.route === "upper";
    g.y = g.upper ? 3.3 : 0;
    g.action("up");
    g.step();
    let contacts = 0;
    for (let i = 0; g.traversal && i < 200; i++) {
      const f = g.frame(),
        p = poseFor(f);
      if (
        p.hands.every(
          (hand) =>
            Math.hypot(
              hand[0] + f.x - f.contact!.x,
              hand[1] + f.y - f.contact!.y - 0.025,
            ) < 0.055,
        )
      )
        contacts++;
      g.step();
    }
    assert.ok(
      contacts >= 2,
      `dash width ${o.width}: ${contacts} supported ticks`,
    );
  }
});

test("a feet-first slide exit blends into a landing reach without a mid-air running pose", () => {
  const f = {
    ...new Run().frame(),
    move: "fall" as const,
    slideExitAge: 0,
    vy: 0,
  };
  const start = poseFor(f),
    end = poseFor({ ...f, slideExitAge: 0.2, vy: -7 });
  assert.ok(start.hip[1] < 0.4);
  assert.ok(end.feet.every((foot) => foot[0] > end.hip[0]));
  assert.ok(end.hip[1] > start.hip[1]);
});

test("running feet and soles follow the solar incline", () => {
  const f = {
    ...new Run().frame(),
    x: 236.5,
    y: 0.55,
    slope: 1.1 / 6,
    grounded: true,
    landingAge: 1,
  };
  const flat = poseFor({ ...f, slope: 0 }),
    uphill = poseFor(f);
  for (let side = 0; side < 2; side++) {
    assert.ok(
      Math.abs(
        uphill.feet[side][1] -
          flat.feet[side][1] -
          flat.feet[side][0] * f.slope,
      ) < 1e-6,
    );
    assert.ok(
      Math.abs(
        uphill.footAngles[side] - flat.footAngles[side] - Math.atan(f.slope),
      ) < 1e-6,
    );
  }
});

test("creative obstacle mesh contact planes match the simulation dimensions", () => {
  const box = new THREE.BoxGeometry(),
    cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const kit = {
    box,
    cylinder,
    face: material,
    dark: material,
    trim: material,
    amber: material,
    panel: material,
  };
  try {
    for (const feature of ["vent-bank", "pipe", "solar", "window"] as const) {
      for (const o of obstacles.filter(
        (o) => o.feature === feature && o.x < 480,
      )) {
        const mesh = creativeObstacle(o, kit);
        mesh.updateMatrixWorld(true);
        const expected = feature === "solar" ? o.height! / 2 : o.height!;
        const ray = new THREE.Raycaster(
          new THREE.Vector3(
            o.x + o.width / 2,
            feature === "window" ? 2.5 : 8,
            0.55,
          ),
          new THREE.Vector3(0, -1, 0),
        );
        const hit = ray.intersectObject(mesh, true)[0];
        assert.ok(hit, feature);
        assert.ok(
          Math.abs(hit.point.y - expected) < 0.025,
          `${feature}: mesh=${hit.point.y}, support=${expected}`,
        );
        if (feature === "window") {
          ray.set(
            new THREE.Vector3(o.x + o.width / 2, 2.5, 0.55),
            new THREE.Vector3(0, 1, 0),
          );
          assert.ok(
            Math.abs(
              ray.intersectObject(mesh, true)[0].point.y - o.openingTop!,
            ) < 1e-6,
          );
        }
        mesh.traverse((part) =>
          assert.ok(part.matrixWorld.toArray().every(Number.isFinite)),
        );
      }
    }
  } finally {
    box.dispose();
    cylinder.dispose();
    material.dispose();
  }
});

test("dive transitions from leg load through horizontal reach to landing tuck", () => {
  const f = { ...new Run().frame(), move: "dive" as const };
  const load = poseFor({ ...f, progress: 0.12 });
  const flight = poseFor({ ...f, progress: 0.4 });
  const tuck = poseFor({ ...f, progress: 1 });
  assert.ok(flight.hands.every((p) => p[0] > flight.head[0]));
  assert.ok(flight.feet.every((p) => p[0] < flight.hip[0]));
  assert.ok(tuck.feet.every((p) => p[0] > tuck.hip[0]));
  assert.notDeepEqual(load, flight);
});
test("wall-run foot contacts alternate and finish in a kick-off pose", () => {
  const f = {
    ...new Run().frame(),
    move: "wall-run" as const,
    progress: 0.4,
    speed: 12,
  };
  const a = poseFor({ ...f, x: 47 }),
    b = poseFor({ ...f, x: 48 });
  assert.notDeepEqual(a.feet, b.feet);
  assert.ok(a.feet.every((p) => p[2] < 0));
  assert.notDeepEqual(a, poseFor({ ...f, progress: 0.98 }));
});

test("all signature poses remain finite throughout their real traversals", () => {
  for (const o of obstacles.filter(
    (o) => o.kind === "signature" && o.route === "lower",
  )) {
    const g = new Run();
    g.start();
    g.x = o.x - 1.9;
    g.speed = 12;
    g.action("up");
    g.step();
    if (isSwing(o.technique))
      for (let tick = 0; tick < 100 && !g.traversal; tick++) g.step();
    const poses = new Set<string>();
    for (let tick = 0; tick < 240 && g.traversal; tick++) {
      const p = poseFor(g.frame());
      assert.ok(
        [p.hip, p.chest, p.head, ...p.hands, ...p.feet, ...p.knees, ...p.elbows]
          .flat()
          .every(Number.isFinite),
        o.technique,
      );
      poses.add(JSON.stringify(p));
      g.step();
    }
    assert.ok(
      poses.size > 10,
      `${o.technique} needs an animated contact sequence`,
    );
  }
});

test("movement lab samples every new technique and all 20 full chains", () => {
  for (const technique of techniques) {
    const frames = framesFor(technique, 12);
    assert.ok(
      frames.some((f) => f.technique === technique),
      `${technique} preview missing`,
    );
    assert.ok(frames.every((f) => Number.isFinite(f.x + f.y + f.speed)));
  }
  for (const name of comboNames) {
    const move = `combo:${name}` as const,
      frames = framesFor(move, 12),
      props = previewObstacles(move);
    assert.equal(props.length, 5);
    assert.ok(
      frames[frames.length - 1].x > props[4].x + props[4].width,
      `${name} preview did not finish`,
    );
  }
});

test("speed camera widens monotonically and preserves bounded framing", () => {
  let prior = speedZoom(0);
  for (let speed = 0; speed <= 60; speed++) {
    const zoom = speedZoom(speed);
    assert.ok(zoom <= prior && zoom >= 0.76 && zoom <= 3.84);
    assert.equal(speedZoom(speed, true), speedZoom(0, true));
    // Portrait's minimum 18m half-width keeps the runner and forward corridor visible.
    assert.ok(18 / zoom - 9.5 / zoom > 2);
    prior = zoom;
  }
});

test("camera easing is independent of refresh rate and never overshoots", () => {
  for (const target of [0.76, 3.84]) {
    const sample = (hz: number) => {
      let zoom = 1;
      for (let i = 0; i < hz; i++) zoom = easeZoom(zoom, target, 1 / hz);
      assert.ok(zoom >= Math.min(1, target) && zoom <= Math.max(1, target));
      return zoom;
    };
    assert.ok(Math.abs(sample(60) - sample(144)) < 1e-10);
  }
  assert.equal(easeZoom(1, 0.76, 0), 1);
});
