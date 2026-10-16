import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { canMantle, Frame, obstacles, Run, STEP } from "./model";
import { interpolateFrame, poseFor, runPose, STANCE, STRIDE } from "./motion";
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
test("step-through vaults keep the leading knee bent forward", () => {
  for (const vault of ["step", "step-leap", "safety"] as const) {
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
