import * as THREE from "three";
import { limbSurface } from "../../assets/limb-surface";
import { runnerGeometry } from "../../assets/runner-model";
import { CHARACTERS, CharacterId, DEFAULT_CHARACTER } from "./characters";
import { Frame } from "./model";
import { clamp, Point, poseFor } from "./motion";
export { poseFor } from "./motion";
export const LEG_LENGTHS = { thigh: 0.51, shin: 0.55 } as const;

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

export function makeRunner(
  scene: THREE.Scene,
  ghost = false,
  character: CharacterId = DEFAULT_CHARACTER,
) {
  const design = CHARACTERS[character];
  const robot = character === "hopbot";
  const climber = character === "climber";
  const group = new THREE.Group();
  group.name = `Skystride_${character}`;
  scene.add(group);
  const geometries = runnerGeometry();
  // Rounded rectangular shell keeps the robot distinct from the human heads.
  let robotHead = 2;
  if (robot) {
    const shape = new THREE.Shape();
    shape.moveTo(-0.15, -0.15);
    shape.lineTo(0.13, -0.15);
    shape.quadraticCurveTo(0.18, -0.15, 0.18, -0.1);
    shape.lineTo(0.18, 0.12);
    shape.quadraticCurveTo(0.18, 0.17, 0.13, 0.17);
    shape.lineTo(-0.15, 0.17);
    shape.quadraticCurveTo(-0.2, 0.17, -0.2, 0.12);
    shape.lineTo(-0.2, -0.1);
    shape.quadraticCurveTo(-0.2, -0.15, -0.15, -0.15);
    const shell = new THREE.ExtrudeGeometry(shape, {
      depth: 0.25,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
      steps: 1,
      curveSegments: 6,
    });
    shell.translate(0, 0, -0.125);
    robotHead = geometries.push(shell) - 1;
  }
  const colors = ghost ? design.palette.map(() => 0xa4e2df) : design.palette;
  const mats = colors.map(
    (color) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.92,
        metalness: 0,
        emissive: color,
        emissiveIntensity: 0.08,
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
    hips = mesh(11, climber ? 4 : 3),
    head = mesh(robotHead, 0),
    hair = mesh(3, climber ? 6 : 3),
    neck = mesh(0, robot ? 3 : 0);
  if (robot) {
    group.remove(hair);
    if (!ghost) {
      mats[5].emissiveIntensity = 1.2;
      mats[5].roughness = 0.3;
    }
  }
  const limbSkins = [
    limbSurface(mats[climber ? 3 : 4]),
    limbSurface(mats[3]),
    limbSurface(mats[climber ? 0 : 4]),
    limbSurface(mats[design.arm]),
  ];
  limbSkins.forEach((surface, i) => {
    surface.mesh.name = ["Far_Trouser", "Near_Trouser", "Far_Arm", "Near_Arm"][
      i
    ];
    group.add(surface.mesh);
  });
  const shoulders = [mesh(1, climber ? 3 : 1), mesh(1, climber ? 3 : 1)];
  const shoes = [mesh(4, design.shoe), mesh(4, design.shoe)],
    soles = [mesh(5, design.sole), mesh(5, design.sole)];
  const hands = [mesh(12, design.hands[0]), mesh(12, design.hands[1])];
  const thumbs = [mesh(1, design.hands[0]), mesh(1, design.hands[1])];
  const shoePanels = [mesh(4, design.panels), mesh(4, design.panels)];
  const sleeves = climber
    ? [mesh(0, 3), mesh(0, 3)]
    : design.accessories
      ? [mesh(0, 5), mesh(0, 5)]
      : [];
  const shorts = climber ? [mesh(0, 4), mesh(0, 4)] : [];
  const wraps = climber ? [mesh(0, 5), mesh(0, 5)] : [];
  const robotLimbs = robot
    ? Array.from({ length: 2 }, () => ({
        thigh: mesh(0, 0),
        shin: mesh(0, 0),
        upperArm: mesh(0, 0),
        forearm: mesh(0, 0),
        knee: mesh(1, 3),
        elbow: mesh(1, 3),
      }))
    : [];
  // Accessories inherit the torso/head transforms through local attachments.
  const attachment = (
    parent: THREE.Mesh,
    name: string,
    mat: number,
    position: [number, number, number],
    scale: [number, number, number],
  ) => {
    const part = mesh(1, mat);
    part.name = name;
    parent.add(part);
    part.position.set(...position);
    part.scale.set(...scale);
    return part;
  };
  if (robot) {
    attachment(
      torso,
      "HopBot_Chest_Plate",
      2,
      [0.64, 0.12, 0],
      [0.55, 0.32, 0.94],
    );
    attachment(
      torso,
      "HopBot_Back_Shell",
      0,
      [-0.72, 0.07, 0],
      [0.3, 0.32, 0.8],
    );
    for (const sign of [-1, 1]) {
      attachment(
        head,
        "HopBot_Face_Display",
        6,
        [0.075, 0.02, sign * 0.138],
        [0.11, 0.118, 0.018],
      );
      for (const x of [0.035, 0.115]) {
        attachment(
          head,
          "HopBot_Eye",
          5,
          [x, 0.03, sign * 0.158],
          [0.014, 0.038, 0.008],
        );
      }
      attachment(
        head,
        "HopBot_Ear_Joint",
        3,
        [-0.145, 0.02, sign * 0.145],
        [0.052, 0.062, 0.018],
      );
      attachment(
        head,
        "HopBot_Ear_Rim",
        2,
        [-0.145, 0.02, sign * 0.16],
        [0.033, 0.043, 0.012],
      );
      const parts = robotLimbs[sign === -1 ? 0 : 1];
      attachment(
        parts.shin,
        "HopBot_Shin_Panel",
        2,
        [0.85, 0.08, sign * 0.35],
        [0.22, 0.28, 0.5],
      );
      attachment(
        parts.forearm,
        "HopBot_Arm_Panel",
        2,
        [0, 0.02, sign * 0.9],
        [0.7, 0.28, 0.2],
      );
    }
  }
  if (design.accessories) {
    attachment(
      torso,
      "Courier_Backpack",
      3,
      [-0.98, 0.06, 0],
      [0.53, 0.37, 0.82],
    );
    attachment(
      torso,
      "Backpack_Orange_Panel",
      2,
      [-1.4, 0.07, 0],
      [0.15, 0.25, 0.61],
    );
    attachment(torso, "Jacket_Zip", 5, [0.87, 0.02, 0], [0.06, 0.37, 0.055]);
    for (const sign of [-1, 1]) {
      attachment(
        torso,
        "Shoulder_Strap",
        3,
        [0.35, 0.18, sign * 0.88],
        [0.7, 0.3, 0.1],
      );
      attachment(
        head,
        "Goggle_Strap",
        3,
        [-0.015, 0.075, sign * 0.12],
        [0.15, 0.025, 0.017],
      );
      attachment(
        head,
        "Goggle_Frame",
        3,
        [0.1, 0.075, sign * 0.116],
        [0.073, 0.052, 0.03],
      );
      attachment(
        head,
        "Goggle_Lens",
        6,
        [0.108, 0.08, sign * 0.14],
        [0.052, 0.033, 0.015],
      );
    }
    attachment(torso, "Folded_Hood", 1, [-0.35, 0.46, 0], [0.72, 0.16, 0.68]);
  }
  if (climber) {
    attachment(torso, "Climber_Hood", 1, [-0.4, 0.46, 0], [0.8, 0.19, 0.75]);
    attachment(torso, "Climber_Pocket", 1, [0.73, -0.21, 0], [0.2, 0.16, 0.62]);
    attachment(hips, "Climber_Belt", 3, [0, 0.32, 0], [0.97, 0.13, 1.03]);
    attachment(hips, "Chalk_Pouch", 3, [-0.5, -0.03, 0.92], [0.58, 0.48, 0.32]);
    attachment(hips, "Pouch_Rim", 5, [-0.5, 0.32, 0.92], [0.57, 0.08, 0.34]);
    for (const sign of [-1, 1]) {
      attachment(
        torso,
        "Climber_Strap",
        3,
        [0.32, 0.2, sign * 0.9],
        [0.7, 0.29, 0.085],
      );
      attachment(
        torso,
        "Hood_Drawcord",
        5,
        [0.83, 0.22, sign * 0.3],
        [0.04, 0.16, 0.035],
      );
      attachment(
        shorts[sign === -1 ? 0 : 1],
        "Cargo_Pocket",
        4,
        [0, -0.03, sign * 0.92],
        [0.75, 0.25, 0.22],
      );
    }
    for (let i = 0; i < 4; i++) {
      const tuft = attachment(
        head,
        "Climber_Hair_Tuft",
        6,
        [-0.1 + i * 0.06, 0.18 + (i % 2) * 0.025, 0],
        [0.055, 0.07, 0.13],
      );
      tuft.rotation.z = -0.5;
    }
  }
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
      const wallLane =
        f.move === "wall-climb" || (f.move === "climb" && f.contact?.y === 3.3)
          ? Math.sin((Math.PI * Math.min(1, f.progress / 0.18)) / 2) *
            (1 - clamp((f.progress - 0.92) / 0.08))
          : 0;
      group.position.set(f.x, f.y, (f.lane ?? 0.55) - 1.05 * wallLane);
      const hip = vec(p.hip),
        chest = vec(p.chest),
        headAxis = vec(p.head).sub(chest).normalize(),
        skull = chest.clone().addScaledVector(headAxis, 0.205);
      segment(
        torso,
        hip.clone().add(new THREE.Vector3(0, -0.045, 0)),
        chest,
        0.17,
        0.21,
      );
      segment(
        hips,
        hip.clone().add(new THREE.Vector3(0, -0.15, 0)),
        hip.clone().lerp(chest, 0.14),
        0.16,
        0.175,
      );
      segment(
        neck,
        chest,
        skull.clone().addScaledVector(headAxis, -0.135),
        0.055,
      );
      head.position.copy(skull);
      head.scale.setScalar(0.78);
      hair.scale.setScalar(0.76);
      hair.position.copy(skull);
      head.rotation.z = Math.atan2(headAxis.y, headAxis.x) - Math.PI / 2;
      hair.rotation.copy(head.rotation);
      for (let s = 0; s < 2; s++) {
        const sign = s ? 1 : -1;
        const root = hip.clone().add(new THREE.Vector3(0, -0.025, sign * 0.14));
        const foot = vec(p.feet[s]),
          knee = solveJoint(
            root,
            foot,
            vec(p.knees[s]),
            LEG_LENGTHS.thigh,
            LEG_LENGTHS.shin,
          );
        limbSkins[s].update(
          root,
          knee,
          foot,
          robot ? 0.055 : 0.118,
          robot ? 0.035 : 0.058,
          true,
        );
        if (shorts[s]) {
          segment(shorts[s], root, root.clone().lerp(knee, 0.9), 0.145, 0.14);
        }
        shoes[s].position.copy(foot);
        soles[s].position.copy(foot);
        shoes[s].rotation.z = p.footAngles[s];
        soles[s].rotation.z = p.footAngles[s];
        const shoulder = chest
          .clone()
          .add(new THREE.Vector3(-0.015, -0.025, sign * 0.185));
        shoulders[s].position.copy(shoulder);
        shoulders[s].scale.set(0.085, 0.09, 0.085);
        const hand = vec(p.hands[s]),
          elbow = solveJoint(shoulder, hand, vec(p.elbows[s]), 0.34, 0.34);
        limbSkins[2 + s].update(
          shoulder,
          elbow,
          hand,
          robot ? 0.04 : 0.078,
          robot ? 0.025 : 0.038,
          false,
        );
        if (sleeves[s])
          segment(
            sleeves[s],
            shoulder,
            shoulder.clone().lerp(elbow, climber ? 0.38 : 0.82),
            0.09,
          );

        if (robotLimbs[s]) {
          const parts = robotLimbs[s];
          segment(
            parts.thigh,
            root.clone().lerp(knee, 0.12),
            root.clone().lerp(knee, 0.82),
            0.125,
          );
          segment(
            parts.shin,
            knee.clone().lerp(foot, 0.16),
            knee.clone().lerp(foot, 0.88),
            0.083,
          );
          segment(
            parts.upperArm,
            shoulder.clone().lerp(elbow, 0.14),
            shoulder.clone().lerp(elbow, 0.78),
            0.088,
          );
          segment(
            parts.forearm,
            elbow.clone().lerp(hand, 0.19),
            elbow.clone().lerp(hand, 0.86),
            0.068,
          );
          parts.knee.position.copy(knee);
          parts.knee.scale.setScalar(0.09);
          parts.elbow.position.copy(elbow);
          parts.elbow.scale.setScalar(0.066);
        }
        if (wraps[s]) {
          segment(wraps[s], elbow.clone().lerp(hand, 0.68), hand, 0.048);
        }
        hands[s].position.copy(hand);
        hands[s].scale.setScalar(0.85);
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
