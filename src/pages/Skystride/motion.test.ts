import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { Frame, obstacles, Run, STEP } from "./model";
import { interpolateFrame, poseFor, runPose, STANCE, STRIDE } from "./motion";
import { makeRunner, solveJoint } from "./runner";

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
      solveJoint(hip, ankle, new THREE.Vector3(...pose.knees[s]), 0.51, 0.51);
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
      0.51,
      0.51,
    );
    assert.ok(knee.x > (hip.x + foot.x) / 2, vault);
  }
});
