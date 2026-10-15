import * as THREE from "three";
import { Frame } from "./model";

type Point = [number, number, number];
type Pose = {
  hip: Point;
  chest: Point;
  head: Point;
  feet: Point[];
  hands: Point[];
  knees: Point[];
  elbows: Point[];
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const p = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return p * p * (3 - 2 * p);
};
const pointMix = (a: Point, b: Point, t: number): Point => [
  mix(a[0], b[0], t),
  mix(a[1], b[1], t),
  mix(a[2], b[2], t),
];
function blend(a: Pose, b: Pose, t: number): Pose {
  return {
    hip: pointMix(a.hip, b.hip, t),
    chest: pointMix(a.chest, b.chest, t),
    head: pointMix(a.head, b.head, t),
    feet: a.feet.map((p, i) => pointMix(p, b.feet[i], t)),
    hands: a.hands.map((p, i) => pointMix(p, b.hands[i], t)),
    knees: a.knees.map((p, i) => pointMix(p, b.knees[i], t)),
    elbows: a.elbows.map((p, i) => pointMix(p, b.elbows[i], t)),
  };
}
const basePose = (): Pose => ({
  hip: [0, 0.98, 0],
  chest: [0.22, 1.51, 0],
  head: [0.3, 1.84, 0],
  feet: [
    [0.35, 0.1, -0.16],
    [-0.35, 0.1, 0.16],
  ],
  hands: [
    [0.48, 1.2, -0.22],
    [-0.3, 1.24, 0.22],
  ],
  knees: [
    [0.5, 0.55, -0.16],
    [0.1, 0.55, 0.16],
  ],
  elbows: [
    [-0.05, 1.12, -0.22],
    [-0.42, 1.2, 0.22],
  ],
});

/** Separate authored contact, tuck and release poses for each traversal, evaluated in simulation time. */
export function poseFor(f: Frame): Pose {
  let p = basePose();
  const stride = f.x * 1.4;
  if (f.move === "run" || f.move === "land") {
    const compression =
      f.move === "land" ? Math.sin(Math.PI * f.progress) * 0.18 : 0;
    const bob = Math.cos(stride * 2) * 0.035 - compression;
    p.hip[1] += bob;
    p.chest[1] += bob;
    p.head[1] += bob;
    for (let s = 0; s < 2; s++) {
      const phase = stride + s * Math.PI,
        wave = Math.sin(phase),
        swing = Math.max(0, Math.cos(phase));
      p.feet[s] = [wave * 0.72, 0.09 + swing * 0.5, s ? 0.16 : -0.16];
      p.knees[s][0] = 0.35 + wave * 0.3;
      p.hands[s] = [
        0.16 - wave * 0.5,
        1.2 + Math.max(0, -wave) * 0.24 + bob,
        s ? 0.23 : -0.23,
      ];
      p.elbows[s][0] = -0.18 - wave * 0.28;
    }
  } else if (f.move === "jump" || f.move === "fall") {
    const tuck = smooth(0.03, 0.18, f.moveTime) * (1 - smooth(0, 12, -f.vy));
    p.hip = [-0.05, 0.96, 0];
    p.chest = [0.24, 1.48, 0];
    p.head = [0.34, 1.8, 0];
    p.feet = [
      [mix(-0.6, -0.25, tuck), mix(0.1, 0.6, tuck), -0.16],
      [mix(0.4, 0.58, tuck), mix(0.1, 0.76, tuck), 0.16],
    ];
    p.knees = [
      [-0.1, 0.9, -0.16],
      [0.7, 1.1, 0.16],
    ];
    p.hands = [
      [0.58, 1.5, -0.23],
      [-0.42, 1.55, 0.23],
    ];
    p.elbows = [
      [0.3, 1.1, -0.23],
      [-0.38, 1.24, 0.23],
    ];
  } else if (f.move === "slide" || f.move === "stumble") {
    const entry = smooth(0, 0.065, f.moveTime);
    const low = basePose();
    low.hip = [-0.22, 0.34, 0];
    low.chest = [-0.58, 0.62, 0];
    low.head = [-0.55, 0.93, 0];
    low.feet = [
      [0.66, 0.1, -0.16],
      [0.35, 0.12, 0.2],
    ];
    low.knees = [
      [0.16, 0.25, -0.16],
      [0.1, 0.55, 0.2],
    ];
    low.hands = [
      [-0.85, 0.12, -0.22],
      [0.1, 0.51, 0.22],
    ];
    low.elbows = [
      [-0.8, 0.48, -0.22],
      [-0.22, 0.52, 0.22],
    ];
    p = blend(p, low, entry);
    if (f.move === "stumble") {
      const recoil = 1 - smooth(0, 0.28, f.moveTime);
      p.chest[0] -= recoil * 0.16;
      p.head[0] -= recoil * 0.2;
      p.hands[1] = [p.head[0] + 0.2, p.head[1] - 0.08, 0.23];
      p.elbows[1] = [p.chest[0] + 0.32, p.chest[1] + 0.12, 0.23];
      p.feet[1] = [0.18, 0.1, 0.2];
      p.knees[1] = [0.05, 0.46, 0.2];
    }
  } else if (f.move === "roll") {
    p.hip = [0, 0.61, 0];
    p.chest = [0.25, 0.92, 0];
    p.head = [0.43, 0.91, 0];
    p.feet = [
      [-0.32, 0.41, -0.17],
      [-0.29, 0.42, 0.17],
    ];
    p.knees = [
      [0.36, 0.24, -0.17],
      [0.4, 0.29, 0.17],
    ];
    p.hands = [
      [0.48, 0.44, -0.22],
      [0.5, 0.4, 0.22],
    ];
    p.elbows = [
      [0.65, 0.65, -0.22],
      [0.65, 0.63, 0.22],
    ];
    const angle = -Math.PI * 2 * smooth(0, 1, f.progress);
    const rotate = (v: Point): Point => [
      v[0] * Math.cos(angle) - (v[1] - 0.61) * Math.sin(angle),
      0.61 + v[0] * Math.sin(angle) + (v[1] - 0.61) * Math.cos(angle),
      v[2],
    ];
    p = {
      hip: rotate(p.hip),
      chest: rotate(p.chest),
      head: rotate(p.head),
      feet: p.feet.map(rotate),
      hands: p.hands.map(rotate),
      knees: p.knees.map(rotate),
      elbows: p.elbows.map(rotate),
    };
  } else if (f.move === "catch" || f.move === "climb") {
    const climb = f.move === "climb" ? f.progress : 0;
    p.hip = [-0.3, mix(0.64, 0.9, climb), 0];
    p.chest = [-0.12, 1.2, 0];
    p.head = [0, 1.52, 0];
    p.feet = [
      [-0.53, 0.06, -0.16],
      [0.24, 0.36 + climb * 0.25, 0.16],
    ];
    p.knees = [
      [-0.3, 0.36, -0.16],
      [0.4, 0.7, 0.16],
    ];
    p.hands = [
      [0.35, 1.65, -0.22],
      [0.35, 1.65, 0.22],
    ];
    p.elbows = [
      [-0.24, 1.56, -0.22],
      [-0.2, 1.5, 0.22],
    ];
    if (f.contact)
      p.hands = [-0.22, 0.22].map((z) => [
        f.contact!.x - f.x,
        f.contact!.y - f.y + 0.04,
        z,
      ]);
  } else if (f.move === "wall") {
    const u = f.progress;
    p.hip = [-0.12, 0.79, 0];
    p.chest = [0.26, 1.24, 0];
    p.head = [0.43, 1.54, 0];
    p.feet = [
      [-0.65, 0.15, -0.16],
      [0.54, 0.61, 0.16],
    ];
    p.knees = [
      [-0.15, 0.6, -0.16],
      [0.7, 0.9, 0.16],
    ];
    p.hands = [
      [0.6, 1.54, -0.23],
      [0.55, 1.7, 0.23],
    ];
    if (u > 0.4) p.feet[0] = [0.35, 0.65 * (1 - u), -0.16];
  } else if (f.move === "vault") {
    const u = f.progress;
    const shape = basePose();
    shape.hip = [-0.14, 0.58, 0];
    shape.chest = [0.3, 0.56, 0];
    shape.head = [0.51, 0.82, 0];
    shape.feet = [
      [-1.03, 0.57, -0.2],
      [-0.46, 0.72, 0.2],
    ];
    shape.knees = [
      [-0.45, 0.92, -0.2],
      [0.04, 0.97, 0.2],
    ];
    shape.hands = [
      [0.1, -0.1, -0.22],
      [-0.12, 0.93, 0.22],
    ];
    shape.elbows = [
      [0.48, 0.34, -0.22],
      [-0.25, 0.78, 0.22],
    ];
    switch (f.vault) {
      case "step":
        shape.hip = [0, 0.87, 0];
        shape.chest = [0.3, 1.34, 0];
        shape.head = [0.4, 1.66, 0];
        shape.feet = [
          [-0.58, 0.12, -0.16],
          [0.58, 0.55, 0.16],
        ];
        shape.hands = [
          [0.55, 1.3, -0.22],
          [-0.38, 1.3, 0.22],
        ];
        break;
      case "hurdle":
        shape.hip = [-0.12, 0.75, 0];
        shape.chest = [0.28, 1.15, 0];
        shape.head = [0.48, 1.43, 0];
        shape.feet = [
          [-0.65, 0.65, -0.18],
          [0.66, 0.66, 0.18],
        ];
        shape.hands = [
          [0.66, 1.07, -0.22],
          [-0.47, 1.33, 0.22],
        ];
        break;
      case "one-hand":
        shape.feet = [
          [-0.7, 0.68, -0.3],
          [-0.37, 0.92, 0.33],
        ];
        shape.hands[1] = [-0.52, 1.03, 0.3];
        break;
      case "lazy":
        shape.hip = [0.08, 0.49, 0.08];
        shape.chest = [-0.28, 0.84, 0];
        shape.head = [-0.26, 1.14, 0];
        shape.feet = [
          [0.83, 0.55, -0.15],
          [0.68, 0.69, 0.24],
        ];
        shape.hands = [
          [-0.25, -0.1, -0.22],
          [0.25, 0.96, 0.22],
        ];
        break;
      case "kong":
        shape.hip = [-0.14, 0.63, 0];
        shape.chest = [0.34, 0.55, 0];
        shape.head = [0.56, 0.81, 0];
        shape.feet = [
          [0.1, 0.55, -0.18],
          [0.1, 0.55, 0.18],
        ];
        shape.knees = [
          [0.48, 0.85, -0.2],
          [0.48, 0.85, 0.2],
        ];
        shape.hands = [
          [0.45, -0.12, -0.27],
          [0.45, -0.12, 0.27],
        ];
        break;
      case "safety":
        shape.hip = [-0.08, 0.53, 0];
        shape.chest = [0.2, 0.97, 0];
        shape.head = [0.33, 1.25, 0];
        shape.feet = [
          [0.35, 0.05, -0.18],
          [-0.48, 0.46, 0.18],
        ];
        break;
      case "step-leap":
        shape.hip = [0, 0.83, 0];
        shape.chest = [0.27, 1.32, 0];
        shape.head = [0.38, 1.63, 0];
        shape.feet = [
          [-0.6, 0.17, -0.18],
          [0.5, 0.57, 0.18],
        ];
        shape.hands = [
          [0.5, 1.73, -0.22],
          [-0.4, 1.26, 0.22],
        ];
        break;
    }
    const tuck = smooth(0, 0.23, u) * (1 - smooth(0.72, 1, u));
    p = blend(p, shape, tuck);
    if (f.contact && !["step", "hurdle", "step-leap"].includes(f.vault)) {
      const reach = Math.hypot(
        f.contact.x - f.x - p.chest[0],
        f.contact.y - f.y - p.chest[1],
      );
      const pin = smooth(0.08, 0.2, u) * (1 - smooth(0.68, 0.8, reach));
      const hand: Point = [f.contact.x - f.x, f.contact.y - f.y + 0.06, -0.23];
      p.hands[0] = pointMix(p.hands[0], hand, pin);
      if (f.vault === "kong")
        p.hands[1] = pointMix(p.hands[1], [hand[0], hand[1], 0.23], pin);
    }
  }
  return p;
}

/** Two-bone IK keeps limb lengths stable while authored poles control knee/elbow direction. */
function joint(
  a: THREE.Vector3,
  end: THREE.Vector3,
  pole: THREE.Vector3,
  upper: number,
  lower: number,
) {
  const direction = end.clone().sub(a);
  const d = Math.max(0.02, Math.min(direction.length(), upper + lower - 0.001));
  direction.normalize();
  const along = (upper * upper - lower * lower + d * d) / (2 * d);
  const off = Math.sqrt(Math.max(0, upper * upper - along * along));
  const bend = pole.clone().sub(a);
  bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  end.copy(a).addScaledVector(direction, d);
  return a.clone().addScaledVector(direction, along).addScaledVector(bend, off);
}

export function makeRunner(scene: THREE.Scene, ghost = false) {
  const group = new THREE.Group();
  scene.add(group);
  const geometries = [
    new THREE.CapsuleGeometry(1, 1, 3, 7),
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.BoxGeometry(1, 1, 1),
  ];
  const colors = ghost
    ? [0x9ad9d6, 0x9ad9d6, 0x9ad9d6, 0x9ad9d6]
    : [0x101c30, 0xf4dfb1, 0xe5a44b, 0x0b1729];
  const mats = colors.map(
    (color) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 1,
        transparent: ghost,
        opacity: ghost ? 0.28 : 1,
        depthWrite: !ghost,
      }),
  );
  const mesh = (geo: number, mat: number) => {
    const m = new THREE.Mesh(geometries[geo], mats[mat]);
    group.add(m);
    return m;
  };
  const torso = mesh(0, 1),
    hips = mesh(1, 3),
    head = mesh(1, 0),
    hair = mesh(1, 3);
  const shirtHem = mesh(0, 1),
    collar = mesh(1, 3);
  const neckMesh = mesh(0, 0);
  const joints = Array.from({ length: 4 }, (_, i) => mesh(1, i < 2 ? 3 : 0));
  const limbs = Array.from({ length: 8 }, (_, i) => mesh(0, i < 4 ? 3 : 0));
  const sleeves = [mesh(0, 1), mesh(0, 1)];
  const shoes = [mesh(2, 2), mesh(2, 2)],
    hands = [mesh(1, 0), mesh(1, 0)];
  const locks = Array.from({ length: 4 }, () => mesh(0, 3));
  const axis = new THREE.Vector3(0, 1, 0);
  const segment = (
    m: THREE.Mesh,
    a: THREE.Vector3,
    b: THREE.Vector3,
    radius: number,
    depth = radius,
  ) => {
    const v = b.clone().sub(a);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.scale.set(radius, v.length() / 3, depth);
    m.quaternion.setFromUnitVectors(axis, v.normalize());
  };
  const vec = (p: Point) => new THREE.Vector3(...p);
  let lastMove = "",
    previousPose = basePose(),
    transitionPose = basePose(),
    transition = 1;
  return {
    group,
    pose(f: Frame, time: number, dt: number) {
      const key = `${f.move}/${f.move === "vault" ? f.vault : ""}`;
      if (lastMove !== key) {
        transitionPose = previousPose;
        transition = 0;
        lastMove = key;
      }
      transition = Math.min(1, transition + dt / 0.055);
      const p = blend(transitionPose, poseFor(f), smooth(0, 1, transition));
      previousPose = p;
      group.position.set(f.x, f.y, 0.55);
      const hip = vec(p.hip),
        chest = vec(p.chest),
        skull = vec(p.head);
      segment(torso, hip.clone().lerp(chest, 0.2), chest, 0.21, 0.16);
      segment(shirtHem, hip, hip.clone().lerp(chest, 0.3), 0.23, 0.17);
      hips.position.copy(hip);
      hips.scale.set(0.22, 0.17, 0.2);
      head.position.copy(skull);
      head.scale.set(0.16, 0.22, 0.17);
      const neck = skull.clone().sub(chest).normalize();
      segment(
        neckMesh,
        chest,
        skull.clone().addScaledVector(neck, -0.12),
        0.075,
      );
      head.quaternion.setFromUnitVectors(axis, neck);
      hair.position.copy(skull).addScaledVector(neck, 0.1);
      hair.scale.set(0.19, 0.15, 0.19);
      hair.quaternion.copy(head.quaternion);
      collar.position.copy(chest);
      collar.scale.set(0.13, 0.06, 0.15);
      locks.forEach((lock, i) => {
        const root = hair.position
          .clone()
          .add(new THREE.Vector3(-0.1, 0.06, (i - 1.5) * 0.075));
        segment(
          lock,
          root,
          root
            .clone()
            .add(
              new THREE.Vector3(
                -0.18 - i * 0.035,
                -0.06 + Math.sin(time * 17 + i) * 0.025,
                0,
              ),
            ),
          0.045,
        );
      });
      for (let s = 0; s < 2; s++) {
        const side = s ? 1 : -1;
        const root = hip.clone().add(new THREE.Vector3(0, 0, side * 0.14));
        const foot = vec(p.feet[s]),
          knee = joint(root, foot, vec(p.knees[s]), 0.5, 0.49);
        joints[s].position.copy(knee);
        joints[s].scale.setScalar(0.09);
        segment(limbs[s * 2], root, knee, 0.115);
        segment(limbs[s * 2 + 1], knee, foot, 0.085);
        shoes[s].position.copy(foot).add(new THREE.Vector3(0.07, 0, 0));
        shoes[s].scale.set(0.29, 0.12, 0.17);
        const shoulder = chest
          .clone()
          .add(new THREE.Vector3(0, 0, side * 0.21));
        const hand = vec(p.hands[s]),
          elbow = joint(shoulder, hand, vec(p.elbows[s]), 0.37, 0.38);
        joints[s + 2].position.copy(elbow);
        joints[s + 2].scale.setScalar(0.058);
        segment(limbs[4 + s * 2], shoulder, elbow, 0.07);
        segment(limbs[5 + s * 2], elbow, hand, 0.055);
        segment(
          sleeves[s],
          shoulder,
          shoulder.clone().lerp(elbow, 0.48),
          0.095,
        );
        hands[s].position.copy(hand);
        hands[s].scale.set(0.065, 0.085, 0.06);
      }
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      scene.remove(group);
    },
  };
}
