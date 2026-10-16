import * as THREE from "three";
import { limbSurface } from "../../assets/limb-surface";
import { runnerGeometry } from "../../assets/runner-model";
import { Frame } from "./model";
import { clamp, Point, poseFor } from "./motion";
export { poseFor } from "./motion";

/** Stable two-bone IK. Pole projection defines the joint plane, including at full extension. */
export function solveJoint(
  a: THREE.Vector3,
  end: THREE.Vector3,
  pole: THREE.Vector3,
  upper: number,
  lower: number,
) {
  const direction = end.clone().sub(a);
  if (direction.lengthSq() < 1e-10) direction.set(0, -1, 0);
  const d = clamp(
    direction.length(),
    Math.abs(upper - lower) + 0.001,
    upper + lower - 0.001,
  );
  direction.normalize();
  const along = (upper * upper - lower * lower + d * d) / (2 * d);
  const off = Math.sqrt(Math.max(0, upper * upper - along * along));
  const bend = pole
    .clone()
    .sub(a)
    .addScaledVector(direction, -pole.clone().sub(a).dot(direction));
  if (bend.lengthSq() < 1e-8) bend.set(-direction.y, direction.x, 0);
  if (bend.lengthSq() < 1e-8) bend.set(1, 0, 0);
  bend.normalize();
  end.copy(a).addScaledVector(direction, d);
  return a.clone().addScaledVector(direction, along).addScaledVector(bend, off);
}

export function makeRunner(scene: THREE.Scene, ghost = false) {
  const group = new THREE.Group();
  group.name = "Skystride_Urban_Runner";
  scene.add(group);
  const geometries = runnerGeometry();
  const colors = ghost
    ? [0xa4e2df, 0xa4e2df, 0xa4e2df, 0xa4e2df, 0xa4e2df]
    : [0x101c30, 0xf6dfac, 0xe8ab56, 0x0b1729, 0x29364b];
  const mats = colors.map(
    (color) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.92,
        metalness: 0,
        emissive: color,
        emissiveIntensity: 0.16,
        transparent: ghost,
        opacity: ghost ? 0.25 : 1,
        depthWrite: !ghost,
      }),
  );
  const mesh = (geo: number, mat: number) => {
    const m = new THREE.Mesh(geometries[geo], mats[mat]);
    group.add(m);
    return m;
  };
  const torso = mesh(7, 1),
    collar = mesh(10, 3),
    scarf = mesh(9, 2),
    belt = mesh(0, 2),
    waist = mesh(0, 3),
    hips = mesh(1, 3),
    head = mesh(2, 0),
    hair = mesh(3, 3),
    neck = mesh(0, 0);
  const limbSkins = [
    limbSurface(mats[4]),
    limbSurface(mats[3]),
    limbSurface(mats[4]),
    limbSurface(mats[0]),
  ];
  limbSkins.forEach((surface, i) => {
    surface.mesh.name = ["Far_Trouser", "Near_Trouser", "Far_Arm", "Near_Arm"][
      i
    ];
    group.add(surface.mesh);
  });
  const shoulders = [mesh(1, 1), mesh(1, 1)];
  const sleeves = [mesh(0, 1), mesh(0, 1)];
  const shoes = [mesh(4, 3), mesh(4, 3)],
    soles = [mesh(5, 2), mesh(5, 2)];
  const hands = [mesh(1, 4), mesh(1, 0)];
  const thumbs = [mesh(1, 4), mesh(1, 0)];
  const shoePanels = [mesh(4, 0), mesh(4, 0)];
  const axis = new THREE.Vector3(0, 1, 0),
    vec = (p: Point) => new THREE.Vector3(...p);
  const segment = (
    m: THREE.Mesh,
    a: THREE.Vector3,
    b: THREE.Vector3,
    radius: number,
    depth = radius,
  ) => {
    const direction = b.clone().sub(a);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.scale.set(radius, Math.max(0.001, direction.length()), depth);
    if (direction.lengthSq() > 1e-10)
      m.quaternion.setFromUnitVectors(axis, direction.normalize());
  };
  // Fixed pool; event positions remain in world space while the runner moves away.
  const dust = Array.from({ length: ghost ? 0 : 10 }, (_, i) => {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf5c78c,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const m = new THREE.Mesh(geometries[6], mat);
    scene.add(m);
    m.visible = false;
    return {
      m,
      mat,
      born: -10,
      x: 0,
      y: 0,
      vx: -1.8 - i * 0.22,
      vy: 0.7 + (i % 3) * 0.5,
    };
  });
  let previousMove = "",
    previousTime = -1,
    lastLand = -1,
    cursor = 0;
  const burst = (x: number, y: number, time: number, impact: number) => {
    const count = impact > 13 ? 6 : 4;
    for (let i = 0; i < count && dust.length; i++) {
      const p = dust[cursor++ % dust.length];
      p.born = time;
      p.x = x + i * 0.04;
      p.y = y + 0.03;
    }
  };
  return {
    group,
    pose(f: Frame, time: number, dt: number) {
      const p = poseFor(f);
      group.position.set(f.x, f.y, 0.55);
      const hip = vec(p.hip),
        chest = vec(p.chest),
        skull = vec(p.head);
      segment(torso, hip.clone().lerp(chest, 0.12), chest, 0.22, 0.2);
      segment(
        waist,
        hip.clone().add(new THREE.Vector3(0, -0.06, 0)),
        hip.clone().lerp(chest, 0.19),
        0.17,
        0.17,
      );
      hips.position.copy(hip);
      hips.scale.set(0.19, 0.13, 0.19);
      collar.position
        .copy(chest)
        .addScaledVector(chest.clone().sub(hip).normalize(), 0.015);
      collar.quaternion.copy(torso.quaternion);
      collar.rotateX(Math.PI / 2);
      collar.scale.set(0.11, 0.1, 0.1);
      scarf.position.copy(hip).add(new THREE.Vector3(-0.03, 0.1, 0.22));
      scarf.scale.setScalar(0.72);
      scarf.rotation.z = -0.15 - Math.min(0.45, f.speed / 35);
      belt.position.copy(hip).add(new THREE.Vector3(0, 0.09, 0));
      belt.scale.set(0.19, 0.06, 0.185);
      const headAxis = skull.clone().sub(chest).normalize();
      segment(
        neck,
        chest,
        skull.clone().addScaledVector(headAxis, -0.12),
        0.065,
      );
      head.position.copy(skull);
      head.scale.setScalar(0.84);
      hair.scale.setScalar(0.84);
      hair.position.copy(skull);
      head.rotation.z = Math.atan2(headAxis.y, headAxis.x) - Math.PI / 2;
      hair.rotation.copy(head.rotation);
      for (let s = 0; s < 2; s++) {
        const sign = s ? 1 : -1;
        const root = hip.clone().add(new THREE.Vector3(0, -0.025, sign * 0.14));
        const foot = vec(p.feet[s]),
          knee = solveJoint(root, foot, vec(p.knees[s]), 0.51, 0.51);
        limbSkins[s].update(root, knee, foot, 0.14, 0.075, true);
        shoes[s].position.copy(foot);
        soles[s].position.copy(foot);
        shoes[s].rotation.z = p.footAngles[s];
        soles[s].rotation.z = p.footAngles[s];
        const shoulder = chest
          .clone()
          .add(new THREE.Vector3(-0.015, -0.025, sign * 0.185));
        shoulders[s].position.copy(shoulder);
        shoulders[s].scale.set(0.11, 0.1, 0.105);
        const hand = vec(p.hands[s]),
          elbow = solveJoint(shoulder, hand, vec(p.elbows[s]), 0.34, 0.34);
        limbSkins[2 + s].update(shoulder, elbow, hand, 0.073, 0.05, false);
        segment(
          sleeves[s],
          shoulder,
          shoulder.clone().lerp(elbow, 0.28),
          0.086,
          0.08,
        );

        hands[s].position.copy(hand);
        hands[s].scale.set(0.075, 0.044, 0.055);
        hands[s].rotation.z = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);
        thumbs[s].position
          .copy(hand)
          .add(new THREE.Vector3(-0.015, -0.035, sign * 0.035));
        thumbs[s].scale.set(0.038, 0.025, 0.028);
        thumbs[s].rotation.copy(hands[s].rotation);
        shoePanels[s].position
          .copy(foot)
          .add(new THREE.Vector3(0.01, 0.018, sign * 0.015));
        shoePanels[s].rotation.copy(shoes[s].rotation);
        shoePanels[s].scale.set(0.72, 0.75, 1.03);
      }
      if (time < previousTime || dt > 0.3) {
        dust.forEach((puff) => {
          puff.born = -10;
        });
        previousMove = "";
        lastLand = -1;
      }
      if (dt > 0 && dt < 0.3) {
        if (f.move === "jump" && previousMove !== "jump" && f.moveTime < 0.1)
          burst(f.launchX ?? f.x, f.launchY ?? f.y, time, 9);
        if ((f.landingAge ?? 1) < 0.05 && lastLand !== f.landX) {
          burst(f.landX ?? f.x, f.y, time, f.impact ?? 9);
          lastLand = f.landX ?? f.x;
        }
      }
      dust.forEach((puff, i) => {
        const age = time - puff.born;
        puff.m.visible = age >= 0 && age < 0.24;
        if (!puff.m.visible) return;
        puff.m.position.set(
          puff.x + puff.vx * age,
          puff.y + puff.vy * age - age * age * 3,
          0.85,
        );
        puff.m.scale.setScalar(0.025 + (i % 3) * 0.012 + age * 0.14);
        puff.mat.opacity = (1 - age / 0.24) * 0.35;
      });
      previousMove = f.move;
      previousTime = time;
    },
    dispose() {
      limbSkins.forEach((surface) => surface.geometry.dispose());
      geometries.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      dust.forEach((p) => {
        p.mat.dispose();
        scene.remove(p.m);
      });
      scene.remove(group);
    },
  };
}
