import { Frame } from "./model";

export type Point = [number, number, number];
export type Pose = {
  hip: Point;
  chest: Point;
  head: Point;
  feet: Point[];
  hands: Point[];
  knees: Point[];
  elbows: Point[];
  footAngles: number[];
};
export const STRIDE = 4.4;
export const STANCE = 0.22;
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const pointMix = (a: Point, b: Point, t: number): Point => [
  mix(a[0], b[0], t),
  mix(a[1], b[1], t),
  mix(a[2], b[2], t),
];
export function blend(a: Pose, b: Pose, t: number): Pose {
  return {
    hip: pointMix(a.hip, b.hip, t),
    chest: pointMix(a.chest, b.chest, t),
    head: pointMix(a.head, b.head, t),
    feet: a.feet.map((v, i) => pointMix(v, b.feet[i], t)),
    hands: a.hands.map((v, i) => pointMix(v, b.hands[i], t)),
    knees: a.knees.map((v, i) => pointMix(v, b.knees[i], t)),
    elbows: a.elbows.map((v, i) => pointMix(v, b.elbows[i], t)),
    footAngles: a.footAngles.map((v, i) => mix(v, b.footAngles[i], t)),
  };
}
export const basePose = (): Pose => ({
  hip: [0, 0.88, 0],
  chest: [0.24, 1.42, 0],
  head: [0.31, 1.73, 0],
  feet: [
    [0.38, 0.09, -0.14],
    [-0.55, 0.18, 0.14],
  ],
  knees: [
    [0.7, 0.5, -0.14],
    [0.5, 0.6, 0.14],
  ],
  hands: [
    [-0.34, 1.08, -0.22],
    [0.61, 1.43, 0.22],
  ],
  elbows: [
    [-0.5, 1.25, -0.22],
    [0.31, 1.04, 0.22],
  ],
  footAngles: [0, -0.45],
});
type Key = { at: number; pose: Pose };
function sequence(keys: Key[], t: number): Pose {
  for (let i = 1; i < keys.length; i++)
    if (t <= keys[i].at)
      return blend(
        keys[i - 1].pose,
        keys[i].pose,
        smooth(keys[i - 1].at, keys[i].at, t),
      );
  return keys[keys.length - 1].pose;
}
function footTrack(phase: number, z: number): { point: Point; angle: number } {
  // Hold the forefoot in world space and lift the heel around it during toe-off.
  const planted = (u: number) => {
    const angle = -0.55 * smooth(0.14, STANCE, u);
    return {
      point: [
        0.38 -
          u * STRIDE +
          0.25 * (1 - Math.cos(angle)) -
          0.075 * Math.sin(angle),
        0.015 - 0.25 * Math.sin(angle) + 0.075 * Math.cos(angle),
        z,
      ] as Point,
      angle,
    };
  };
  if (phase <= STANCE) return planted(phase);
  const toeOff = planted(STANCE);
  const keys = [
    [STANCE, toeOff.point[0], toeOff.point[1], toeOff.angle],
    [0.34, -0.78, 0.48, -1.1],
    [0.5, -0.2, 0.91, -0.55],
    [0.68, 0.48, 0.58, 0.15],
    [0.84, 0.68, 0.25, 0.12],
    [1, 0.38, 0.09, 0],
  ];
  for (let i = 1; i < keys.length; i++)
    if (phase <= keys[i][0]) {
      const a = keys[i - 1],
        b = keys[i],
        t = smooth(a[0], b[0], phase);
      return {
        point: [mix(a[1], b[1], t), mix(a[2], b[2], t), z],
        angle: mix(a[3], b[3], t),
      };
    }
  return { point: [0.38, 0.09, z], angle: 0 };
}
export function runPose(x: number, speed = 12): Pose {
  const p = basePose(),
    phase = (((x / STRIDE) % 1) + 1) % 1;
  const intensity = clamp((speed - 6) / 8);
  // Keep stance feet planted; increase the airborne reach and body drive with speed.
  p.chest = [mix(0.14, 0.43, intensity), mix(1.45, 1.29, intensity), 0];
  p.head = [mix(0.18, 0.61, intensity), mix(1.78, 1.57, intensity), 0];
  const step = phase % 0.5;
  const load =
    step < STANCE
      ? Math.sin((Math.PI * step) / STANCE)
      : -0.45 * Math.sin((Math.PI * (step - STANCE)) / (0.5 - STANCE));
  const sink = mix(0.105, 0.155, intensity) * load;
  p.hip[1] -= sink;
  p.chest[1] -= sink * 0.92;
  p.head[1] -= sink * 0.78;
  p.chest[0] += 0.025 * Math.sin(phase * Math.PI * 2);
  for (let s = 0; s < 2; s++) {
    const u = (phase + s * 0.5) % 1,
      side = s ? 1 : -1,
      foot = footTrack(u, side * 0.14);
    p.feet[s] = foot.point;
    if (u > STANCE) {
      const extension = Math.sin((Math.PI * (u - STANCE)) / (1 - STANCE));
      p.feet[s][0] +=
        Math.sign(p.feet[s][0]) * extension * mix(-0.09, 0.18, intensity);
      p.feet[s][1] += extension * mix(-0.05, 0.08, intensity);
    }
    p.footAngles[s] = foot.angle;
    p.knees[s] = [0.85, 0.7, side * 0.14];
    // Swing from the shoulder with an actual upper-arm/forearm arc. Interpolating
    // arbitrary wrist positions folded both elbows into the ribs at mid-stride.
    const swing = Math.cos(u * Math.PI * 2 - 0.3);
    const upperAngle = -mix(0.6, 0.9, intensity) * swing;
    const elbow: Point = [
      p.chest[0] - 0.015 + Math.sin(upperAngle) * 0.34,
      p.chest[1] - 0.025 - Math.cos(upperAngle) * 0.34,
      side * 0.2,
    ];
    const forearmAngle = mix(0.85, 1.15, (swing + 1) / 2);
    p.elbows[s] = elbow;
    p.hands[s] = [
      elbow[0] + Math.cos(forearmAngle) * 0.34,
      elbow[1] + Math.sin(forearmAngle) * 0.34,
      side * 0.23,
    ];
  }
  return p;
}
function swapLead(p: Pose, lead: number) {
  if (!lead) return p;
  for (const key of ["feet", "hands", "knees", "elbows"] as const)
    p[key] = [p[key][1], p[key][0]].map((v, i) => [
      v[0],
      v[1],
      (i ? 1 : -1) * Math.abs(v[2]),
    ]);
  p.footAngles.reverse();
  return p;
}
function jumpPose(f: Frame): Pose {
  const load = basePose();
  load.hip = [-0.08, 0.72, 0];
  load.chest = [0.29, 1.16, 0];
  load.head = [0.45, 1.46, 0];
  load.feet = [
    [0.27, 0.48, -0.14],
    [-0.38, 0.09, 0.14],
  ];
  load.hands = [
    [0.62, 1.2, -0.23],
    [-0.42, 0.95, 0.23],
  ];
  const drive = basePose();
  drive.hip = [-0.06, 0.99, 0];
  drive.chest = [0.3, 1.49, 0];
  drive.head = [0.42, 1.79, 0];
  drive.feet = [
    [0.38, 0.82, -0.14],
    [-0.55, 0.16, 0.14],
  ];
  drive.knees = [
    [0.95, 1.05, -0.14],
    [0.3, 0.58, 0.14],
  ];
  drive.hands = [
    [0.63, 1.8, -0.23],
    [-0.43, 1.13, 0.23],
  ];
  drive.elbows = [
    [0.47, 1.33, -0.23],
    [-0.25, 1.22, 0.23],
  ];
  drive.footAngles = [-0.35, -0.85];
  const flight = basePose();
  flight.hip = [-0.11, 0.91, 0];
  flight.chest = [0.25, 1.39, 0];
  flight.head = [0.39, 1.69, 0];
  flight.feet = [
    [0.59, 0.64, -0.18],
    [-0.62, 0.51, 0.18],
  ];
  flight.knees = [
    [0.85, 1.13, -0.18],
    [0.24, 0.92, 0.18],
  ];
  flight.hands = [
    [0.65, 1.42, -0.25],
    [-0.46, 1.32, 0.25],
  ];
  flight.footAngles = [0.12, -0.7];
  if (f.longJump) {
    flight.feet = [
      [0.75, 0.52, -0.18],
      [-0.74, 0.39, 0.18],
    ];
    flight.hip[1] = 0.95;
    flight.chest[0] = 0.38;
    flight.head[0] = 0.55;
  }
  const prepare = basePose();
  prepare.hip = [-0.1, 0.88, 0];
  prepare.chest = [0.2, 1.39, 0];
  prepare.head = [0.31, 1.7, 0];
  prepare.feet = [
    [0.42, 0.09, -0.17],
    [0.34, 0.09, 0.17],
  ];
  prepare.hands = [
    [0.56, 1.03, -0.27],
    [-0.38, 1.16, 0.27],
  ];
  prepare.footAngles = [0.05, 0.05];
  prepare.knees = [
    [0.75, 0.62, -0.17],
    [0.7, 0.62, 0.17],
  ];
  const driven = sequence(
    [
      { at: 0, pose: load },
      { at: 0.065, pose: drive },
      { at: 0.22, pose: flight },
    ],
    f.move === "fall" ? Math.max(0.22, f.moveTime) : f.moveTime,
  );
  const p = blend(driven, prepare, smooth(1.2, 10.5, -f.vy));
  return swapLead(p, f.lead || 0);
}
function landingPose(f: Frame): Pose {
  const age = f.landingAge ?? f.moveTime,
    force = clamp((f.impact ?? 12) / 17, 0.4, 1);
  const recovery = mix(0.21, 0.38, force);
  const load =
    mix(0.5, 1, force) *
    smooth(0, 0.045, age) *
    (1 - smooth(0.065, recovery, age));
  const p = runPose(f.x, f.speed);
  const braced = basePose();
  braced.hip = [-0.13, 0.87 - 0.3 * load, 0];
  braced.chest = [0.2 + 0.1 * load, 1.4 - 0.69 * load, 0];
  braced.head = [0.32 + 0.1 * load, 1.71 - 0.73 * load, 0];
  const planted = clamp((f.landX ?? f.x) - f.x + 0.35, -0.58, 0.4);
  braced.feet = [
    [planted, 0.09, -0.14],
    [planted - 0.09, 0.09, 0.14],
  ];
  braced.knees = [
    [0.86, 0.66, -0.14],
    [0.37, 0.52, 0.14],
  ];
  braced.hands = [
    [0.6, 0.96 - load * 0.2, -0.24],
    [0.49, mix(1.1, 0.05, load * smooth(0.65, 0.9, force)), 0.24],
  ];
  if ((f.impact ?? 0) > 14)
    braced.hands[1] = pointMix(
      braced.hands[1],
      [planted + 0.38, 0.055, 0.24],
      smooth(0.015, 0.045, age) * (1 - smooth(0.08, 0.14, age)),
    );
  braced.elbows = [
    [0.4, 1.08 - load * 0.2, -0.24],
    [0.62, 1.2 - load * 0.65, 0.24],
  ];
  return blend(swapLead(braced, f.lead || 0), p, smooth(0.08, recovery, age));
}
function vaultPose(f: Frame): Pose {
  const p = f.progress,
    run = runPose(f.x, f.speed),
    plant = basePose(),
    carry = basePose(),
    exit = basePose();
  plant.hip = [-0.2, 0.65, 0];
  plant.chest = [0.28, 0.91, 0];
  plant.head = [0.48, 1.17, 0];
  plant.feet = [
    [-0.5, 0.21, -0.17],
    [0.37, 0.62, 0.17],
  ];
  plant.hands = [
    [0.57, 0.48, -0.23],
    [-0.27, 1.06, 0.23],
  ];
  carry.hip = [-0.15, 0.55, 0];
  carry.chest = [0.34, 0.55, 0];
  carry.head = [0.59, 0.77, 0];
  carry.feet = [
    [-1.03, 0.55, -0.17],
    [-0.38, 0.78, 0.17],
  ];
  carry.knees = [
    [-0.35, 0.9, -0.17],
    [0.27, 1.02, 0.17],
  ];
  carry.hands = [
    [0.1, -0.04, -0.23],
    [-0.46, 0.98, 0.23],
  ];
  carry.elbows = [
    [0.55, 0.3, -0.23],
    [-0.2, 0.83, 0.23],
  ];
  carry.footAngles = [-0.45, -0.9];
  exit.hip = [-0.08, 0.77, 0];
  exit.chest = [0.3, 1.23, 0];
  exit.head = [0.46, 1.52, 0];
  exit.feet = [
    [0.46, 0.12, -0.17],
    [-0.59, 0.42, 0.17],
  ];
  exit.hands = [
    [0.66, 1.24, -0.23],
    [-0.39, 1.17, 0.23],
  ];
  switch (f.vault) {
    case "speed":
      carry.feet = [
        [-1.03, 0.55, -0.17],
        [-0.86, 0.32, 0.17],
      ];
      carry.knees = [
        [-0.6, 0.35, -0.17],
        [-0.3, 0.32, 0.17],
      ];
      carry.footAngles = [-0.7, -0.85];
      break;
    case "step":
      carry.hip = [-0.03, 0.86, 0];
      carry.chest = [0.29, 1.34, 0];
      carry.head = [0.43, 1.64, 0];
      carry.feet = [
        [0.49, 0.58, -0.14],
        [-0.55, 0.12, 0.14],
      ];
      carry.knees = [
        [0.9, 1, -0.14],
        [0.3, 0.6, 0.14],
      ];
      carry.footAngles = [0.05, -0.65];
      carry.hands = [
        [-0.37, 1.15, -0.23],
        [0.66, 1.47, 0.23],
      ];
      Object.assign(plant, blend(basePose(), carry, 0.4));
      break;
    case "hurdle":
      carry.hip = [-0.12, 0.79, 0];
      carry.chest = [0.29, 1.21, 0];
      carry.head = [0.46, 1.5, 0];
      carry.feet = [
        [0.77, 0.49, -0.17],
        [-0.67, 0.67, 0.17],
      ];
      carry.knees = [
        [0.73, 0.88, -0.17],
        [-0.12, 1.1, 0.17],
      ];
      carry.hands = [
        [0.65, 1.28, -0.24],
        [-0.41, 1.3, 0.24],
      ];
      Object.assign(plant, blend(basePose(), carry, 0.35));
      break;
    case "one-hand":
      carry.feet = [
        [-0.88, 0.65, -0.27],
        [0.18, 0.88, 0.32],
      ];
      carry.knees[1] = [0.55, 0.98, 0.32];
      carry.hands[1] = [-0.37, 1.21, 0.3];
      carry.chest[2] = 0.06;
      break;
    case "lazy":
      plant.chest = [-0.18, 1.04, 0];
      plant.head = [-0.1, 1.35, 0];
      plant.feet = [
        [0.65, 0.33, -0.17],
        [-0.4, 0.11, 0.17],
      ];
      plant.hands = [
        [0, 0.35, -0.23],
        [0.4, 1.05, 0.23],
      ];
      carry.hip = [0.06, 0.53, 0.06];
      carry.chest = [-0.3, 0.87, 0];
      carry.head = [-0.33, 1.18, 0];
      carry.feet = [
        [0.96, 0.54, -0.17],
        [0.65, 0.73, 0.26],
      ];
      carry.knees = [
        [0.45, 0.87, -0.17],
        [0.47, 0.92, 0.26],
      ];
      carry.hands = [
        [-0.4, -0.01, -0.23],
        [0.29, 1.01, 0.26],
      ];
      carry.footAngles = [0.1, 0.15];
      break;
    case "kong":
      plant.hands = [
        [0.65, 0.15, -0.25],
        [0.65, 0.15, 0.25],
      ];
      carry.hip = [-0.17, 0.78, 0];
      carry.chest = [0.32, 0.64, 0];
      carry.head = [0.57, 0.88, 0];
      carry.feet = [
        [-0.25, 0.24, -0.18],
        [-0.3, 0.26, 0.18],
      ];
      carry.knees = [
        [0.55, 0.36, -0.2],
        [0.55, 0.36, 0.2],
      ];
      carry.hands = [
        [0.48, -0.04, -0.26],
        [0.48, -0.04, 0.26],
      ];
      exit.hands = [
        [-0.4, 1.12, -0.24],
        [-0.4, 1.12, 0.24],
      ];
      break;
    case "safety":
      carry.hip = [-0.14, 0.52, 0];
      carry.chest = [0.18, 0.95, 0];
      carry.head = [0.33, 1.24, 0];
      carry.feet = [
        [0.34, 0.08, -0.16],
        [-0.45, 0.46, 0.18],
      ];
      carry.knees = [
        [0.75, 0.6, -0.16],
        [0.5, 0.78, 0.18],
      ];
      carry.hands[1] = [0.45, 0.77, 0.25];
      break;
    case "step-leap":
      carry.hip = [-0.02, 0.87, 0];
      carry.chest = [0.29, 1.36, 0];
      carry.head = [0.42, 1.66, 0];
      carry.feet = [
        [0.36, 0.78, -0.16],
        [-0.54, 0.18, 0.16],
      ];
      carry.knees = [
        [0.95, 1.05, -0.16],
        [0.3, 0.6, 0.16],
      ];
      carry.footAngles = [-0.35, -0.85];
      carry.hands = [
        [0.65, 1.75, -0.24],
        [-0.41, 1.17, 0.24],
      ];
      Object.assign(plant, blend(basePose(), carry, 0.3));
      break;
  }
  const coil = blend(run, plant, 0.7);
  coil.hip = [-0.14, 0.64, 0];
  coil.chest = [0.3, 1.02, 0];
  coil.head = [0.48, 1.3, 0];
  coil.feet = [
    [0.18, 0.09, -0.17],
    [-0.16, 0.09, 0.17],
  ];
  const dive = blend(plant, carry, 0.4);
  dive.hip = [-0.3, 0.85, 0];
  dive.chest = [0.25, 0.98, 0];
  dive.head = [0.49, 1.22, 0];
  dive.feet = [
    [-0.7, 0.13, -0.17],
    [-0.64, 0.14, 0.17],
  ];
  const push = blend(carry, exit, 0.5);
  push.hip = [0.03, 0.95, 0];
  push.chest = [0.39, 1.04, 0];
  push.head = [0.57, 1.3, 0];
  push.hands = [
    [0.03, 0.02, -0.25],
    [0.03, 0.02, 0.25],
  ];
  const result = sequence(
    f.vault === "kong"
      ? [
          { at: 0, pose: run },
          { at: 0.1, pose: coil },
          { at: 0.25, pose: dive },
          { at: 0.43, pose: carry },
          { at: 0.62, pose: push },
          { at: 0.86, pose: exit },
          { at: 1, pose: run },
        ]
      : [
          { at: 0, pose: run },
          { at: 0.18, pose: plant },
          { at: 0.36, pose: carry },
          { at: 0.59, pose: carry },
          { at: 0.86, pose: exit },
          { at: 1, pose: run },
        ],
    p,
  );
  if (f.contact && !["step", "hurdle", "step-leap"].includes(f.vault)) {
    const hand: Point = [f.contact.x - f.x, f.contact.y - f.y + 0.025, -0.23];
    const reach = Math.hypot(
      hand[0] - result.chest[0],
      hand[1] - result.chest[1],
    );
    const pin =
      smooth(0.1, 0.24, p) *
      (1 - smooth(0.61, 0.69, reach)) *
      (1 - smooth(0.65, 0.82, p));
    result.hands[0] = pointMix(result.hands[0], hand, pin);
    if (f.vault === "kong")
      result.hands[1] = pointMix(
        result.hands[1],
        [hand[0], hand[1], 0.23],
        pin,
      );
  }
  return result;
}
function lowPose(): Pose {
  const p = basePose();
  p.hip = [-0.19, 0.31, 0];
  p.chest = [-0.56, 0.65, 0];
  p.head = [-0.53, 0.93, 0];
  p.feet = [
    [0.69, 0.09, -0.14],
    [0.29, 0.1, 0.17],
  ];
  p.knees = [
    [0.32, 0.33, -0.14],
    [0.08, 0.57, 0.17],
  ];
  p.hands = [
    [-0.85, 0.1, -0.23],
    [0.01, 0.59, 0.23],
  ];
  p.elbows = [
    [-0.83, 0.48, -0.23],
    [-0.28, 0.46, 0.23],
  ];
  p.footAngles = [0.12, 0.06];
  return p;
}
function slidePose(f: Frame): Pose {
  const run = runPose(f.x, f.speed),
    duck = basePose(),
    low = lowPose();
  duck.hip = [-0.1, 0.57, 0];
  duck.chest = [0.17, 0.84, 0];
  duck.head = [0.3, 1.07, 0];
  duck.feet = [
    [0.38, 0.09, -0.14],
    [-0.26, 0.09, 0.17],
  ];
  duck.hands = [
    [0.42, 0.3, -0.23],
    [-0.21, 0.38, 0.23],
  ];
  duck.knees = [
    [0.7, 0.34, -0.14],
    [0.25, 0.31, 0.17],
  ];
  const enter = sequence(
    [
      { at: 0, pose: run },
      { at: 0.07, pose: duck },
      { at: 0.17, pose: low },
    ],
    f.moveTime,
  );
  return enter;
}
function mantlePose(f: Frame): Pose {
  const supported = basePose();
  supported.hip = [-0.24, 0.56, 0];
  supported.chest = [0.25, 0.44, 0];
  supported.head = [0.42, 0.74, 0];
  supported.feet = [
    [0.27, 0.1, -0.17],
    [-0.43, 0.39, 0.17],
  ];
  supported.knees = [
    [0.65, 0.58, -0.17],
    [0.18, 0.7, 0.17],
  ];
  supported.hands = [
    [0.38, 0.05, -0.24],
    [0.35, 0.06, 0.24],
  ];
  const grip = blend(runPose(f.x, f.speed), supported, 0.25);
  grip.hip = [-0.12, 0.72, 0];
  grip.chest = [0.18, 1.16, 0];
  grip.head = [0.34, 1.46, 0];
  grip.feet = [
    [0.18, 0.09, -0.17],
    [-0.3, 0.09, 0.17],
  ];
  grip.hands = [
    [0.58, 1.6, -0.23],
    [0.58, 1.6, 0.23],
  ];
  const result = sequence(
    [
      { at: 0, pose: runPose(f.x, f.speed) },
      { at: 0.23, pose: grip },
      { at: 0.48, pose: supported },
      { at: 0.65, pose: supported },
      { at: 1, pose: runPose(f.x, f.speed) },
    ],
    f.progress,
  );
  if (f.contact)
    for (let side = 0; side < 2; side++) {
      const contact: Point = [
        f.contact.x - f.x,
        f.contact.y - f.y + 0.025,
        side ? 0.23 : -0.23,
      ];
      const reach = Math.hypot(
        contact[0] - result.chest[0],
        contact[1] - result.chest[1],
      );
      result.hands[side] = pointMix(
        result.hands[side],
        contact,
        smooth(0, 0.2, f.progress) * (1 - smooth(0.65, 0.72, reach)),
      );
    }
  return result;
}
function rollPose(f: Frame): Pose {
  const p = basePose(),
    u = f.progress;
  p.hip = [-0.03, 0.65, 0];
  p.chest = [0.27, 0.98, 0];
  p.head = [0.25, 0.91, 0];
  p.feet = [
    [-0.32, 0.43, -0.17],
    [-0.27, 0.41, 0.17],
  ];
  p.knees = [
    [0.37, 0.28, -0.17],
    [0.42, 0.3, 0.17],
  ];
  p.hands = [
    [0.55, 0.45, -0.22],
    [0.54, 0.48, 0.22],
  ];
  p.elbows = [
    [0.67, 0.76, -0.22],
    [0.66, 0.73, 0.22],
  ];
  const rotation = -Math.PI * 2 * smooth(0.06, 0.88, u);
  const rotate = (v: Point): Point => [
    v[0] * Math.cos(rotation) - (v[1] - 0.65) * Math.sin(rotation),
    0.65 + v[0] * Math.sin(rotation) + (v[1] - 0.65) * Math.cos(rotation),
    v[2],
  ];
  for (const name of ["hip", "chest", "head"] as const)
    p[name] = rotate(p[name]);
  for (const name of ["feet", "hands", "knees", "elbows"] as const)
    p[name] = p[name].map(rotate);
  p.footAngles = [rotation - 0.6, rotation - 0.6];
  const twoFoot = landingPose({ ...f, landingAge: 0.06, impact: 15 });
  return blend(
    blend(twoFoot, p, smooth(0, 0.18, u)),
    runPose(f.x, f.speed),
    smooth(0.84, 1, u),
  );
}
function climbPose(f: Frame): Pose {
  const p = basePose(),
    u = f.move === "climb" ? f.progress : 0;
  p.hip = [-0.3, mix(0.6, 0.84, u), 0];
  p.chest = [-0.07, mix(1.15, 1.31, u), 0];
  p.head = [0.08, mix(1.46, 1.63, u), 0];
  p.feet = [
    [-0.51, 0.08, -0.14],
    [0.24, 0.36 + Math.sin(Math.PI * u) * 0.5, 0.17],
  ];
  p.knees = [
    [0.04, 0.51, -0.14],
    [0.68, 0.75, 0.17],
  ];
  p.hands = [
    [0.36, 1.67, -0.23],
    [0.36, 1.67, 0.23],
  ];
  p.elbows = [
    [-0.25, 1.53, -0.23],
    [-0.24, 1.53, 0.23],
  ];
  if (f.contact)
    for (let s = 0; s < 2; s++)
      p.hands[s] = [
        f.contact.x - f.x,
        f.contact.y - f.y + 0.03,
        s ? 0.23 : -0.23,
      ];
  return blend(p, runPose(f.x, f.speed), smooth(0.73, 1, u));
}

/** Wall-run reference: foot drive, two-hand catch, pull, palm press, top-out. */
function wallClimbPose(f: Frame): Pose {
  const plant = basePose();
  plant.hip = [-0.08, 0.78, 0];
  plant.chest = [0.16, 1.24, 0];
  plant.head = [0.29, 1.56, 0];
  plant.feet = [
    [0.41, 0.67, -0.14],
    [-0.44, 0.11, 0.14],
  ];
  plant.knees = [
    [0.1, 1.15, -0.14],
    [0.2, 0.5, 0.14],
  ];
  plant.hands = [
    [0.54, 1.65, -0.23],
    [0.15, 1.43, 0.23],
  ];
  plant.footAngles = [Math.PI / 2, -0.3];
  const hang = basePose();
  hang.hip = [-0.14, 0.76, 0];
  hang.chest = [0.1, 1.25, 0];
  hang.head = [0.23, 1.56, 0];
  hang.feet = [
    [0.4, 0.36, -0.14],
    [0.1, 0.06, 0.14],
  ];
  hang.knees = [
    [-0.2, 0.65, -0.14],
    [-0.3, 0.3, 0.14],
  ];
  hang.hands = [
    [0.55, 1.68, -0.23],
    [0.55, 1.68, 0.23],
  ];
  hang.elbows = [
    [-0.08, 1.6, -0.23],
    [-0.08, 1.6, 0.23],
  ];
  hang.footAngles = [1.1, 0.6];
  const press = basePose();
  press.hip = [-0.15, 0.68, 0];
  press.chest = [0.3, 0.93, 0];
  press.head = [0.48, 1.21, 0];
  press.feet = [
    [0.3, 0.37, -0.14],
    [-0.32, 0.07, 0.14],
  ];
  press.footAngles = [1.2, 0.2];
  press.knees = [
    [-0.1, 1.1, -0.14],
    [-0.2, 0.6, 0.14],
  ];
  press.hands = [
    [0.55, 0.58, -0.23],
    [0.55, 0.58, 0.23],
  ];
  press.elbows = [
    [-0.1, 0.84, -0.23],
    [-0.1, 0.84, 0.23],
  ];
  const top = basePose();
  top.hip = [-0.17, 0.53, 0];
  top.chest = [0.31, 0.59, 0];
  top.head = [0.5, 0.86, 0];
  top.feet = [
    [0.36, 0.12, -0.14],
    [-0.45, 0.32, 0.14],
  ];
  top.knees = [
    [0.76, 0.65, -0.14],
    [0.1, 0.8, 0.14],
  ];
  top.hands = [
    [0.12, 0.025, -0.23],
    [0.12, 0.025, 0.23],
  ];
  const p = sequence(
    [
      { at: 0, pose: runPose(f.x, f.speed) },
      { at: 0.35, pose: plant },
      { at: 0.52, pose: hang },
      { at: 0.62, pose: hang },
      { at: 0.82, pose: press },
      { at: 0.92, pose: top },
      { at: 1, pose: runPose(f.x, f.speed) },
    ],
    f.progress,
  );
  // Lift the leading shoe above the lip before carrying it onto the roof.
  p.feet[0][1] += 0.4 * Math.sin(Math.PI * smooth(0.82, 0.92, f.progress));
  if (f.contact) {
    for (let side = 0; side < 2; side++) {
      const anchor: Point = [
        f.contact.x - f.x,
        f.contact.y - f.y + 0.025,
        side ? 0.23 : -0.23,
      ];
      const reach = Math.hypot(
        anchor[0] - p.chest[0],
        anchor[1] - p.chest[1] + 0.025,
      );
      p.hands[side] = pointMix(
        p.hands[side],
        anchor,
        smooth(0.43, 0.52, f.progress) *
          (1 - smooth(0.92, 1, f.progress)) *
          (1 - smooth(0.66, 0.75, reach)),
      );
    }
    // The toe is pinned to the wall during the propulsive foot plant.
    const pin =
      smooth(0.25, 0.35, f.progress) * (1 - smooth(0.38, 0.48, f.progress));
    p.feet[0] = pointMix(
      p.feet[0],
      [f.contact.x - f.x - 0.09, 1.27 - f.y, -0.14],
      pin,
    );
  }
  return p;
}

/** Pure animation sampling: seeking, ghost playback and live frames all evaluate identical poses. */
export function poseFor(f: Frame): Pose {
  switch (f.move) {
    case "run":
      if ((f.slideExitAge ?? 1) < 0.16)
        return blend(
          lowPose(),
          runPose(f.x, f.speed),
          smooth(0, 0.16, f.slideExitAge!),
        );
      return (f.landingAge ?? 1) < 0.32
        ? landingPose(f)
        : runPose(f.x, f.speed);
    case "land":
      return landingPose(f);
    case "jump":
    case "fall":
      return jumpPose(f);
    case "vault":
      return vaultPose(f);
    case "mantle":
      return mantlePose(f);
    case "slide":
      return slidePose(f);
    case "stumble": {
      const low = lowPose();
      if (f.move === "stumble") {
        low.chest[0] -= 0.12 * (1 - f.progress);
        low.hands[1] = [-0.31, 0.81, 0.23];
        low.feet[1] = [0.04, 0.09, 0.17];
      }
      return blend(runPose(f.x, f.speed), low, smooth(0, 0.045, f.moveTime));
    }
    case "roll":
      return rollPose(f);
    case "catch":
    case "climb":
      return climbPose(f);
    case "wall-climb":
      return wallClimbPose(f);
    case "wall": {
      const p = jumpPose({
        ...f,
        moveTime: mix(0.02, 0.22, f.progress),
        vy: 6,
      });
      p.feet[0] = [0.47, 0.45 + 0.25 * Math.sin(Math.PI * f.progress), -0.14];
      p.hands[0] = [0.66, 1.65, -0.23];
      return blend(p, runPose(f.x, f.speed), smooth(0.77, 1, f.progress));
    }
  }
}

export function motionPhase(f: Frame): string {
  if (f.move === "wall-climb")
    return f.progress < 0.35
      ? "APPROACH & FOOT PLANT"
      : f.progress < 0.52
        ? "DRIVE UP THE WALL"
        : f.progress < 0.62
          ? "CATCH THE LIP"
          : f.progress < 0.82
            ? "PULL & PRESS"
            : "STEP ONTO THE ROOF";
  if (f.move === "run") return "CONTACT → DRIVE → FLIGHT → RECOVERY";
  if (f.move === "land")
    return f.moveTime < 0.07 ? "ABSORB IMPACT" : "DRIVE OUT";
  if (f.move === "jump" || f.move === "fall")
    return f.moveTime < 0.065
      ? "PUSH OFF"
      : f.vy > 2
        ? "KNEE DRIVE"
        : f.vy > -3
          ? "FLIGHT"
          : "REACH FOR LANDING";
  if (f.move === "slide")
    return f.moveTime < 0.07
      ? "DROP THE HIPS"
      : f.moveTime < 0.17
        ? "EXTEND LEGS"
        : "GLIDE";
  if (f.move === "mantle")
    return f.progress < 0.3
      ? "HAND SUPPORT"
      : f.progress < 0.7
        ? "STEP OVER"
        : "LOWER TO ROOF";
  if (f.move === "vault" && f.vault === "kong")
    return f.progress < 0.12
      ? "LEG LOAD"
      : f.progress < 0.3
        ? "LEG PUSH"
        : f.progress < 0.48
          ? "HAND PLANT"
          : f.progress < 0.7
            ? "HAND PUSH"
            : "EXTEND TO LAND";
  if (f.move === "vault")
    return f.progress < 0.2
      ? "PLANT"
      : f.progress < 0.45
        ? "SUPPORT & PUSH"
        : f.progress < 0.7
          ? "CLEAR"
          : "RELEASE";
  return f.move.toUpperCase();
}

/** Interpolate animation clocks with position; keep discrete contacts on their own side of a transition. */
export function interpolateFrame(a: Frame, b: Frame, t: number): Frame {
  if (t >= 1) return b;
  const sameMove =
    a.move === b.move ||
    (["jump", "fall"].includes(a.move) && ["jump", "fall"].includes(b.move));
  return {
    ...a,
    x: mix(a.x, b.x, t),
    y: mix(a.y, b.y, t),
    speed: mix(a.speed, b.speed, t),
    vy: mix(a.vy, b.vy, t),
    moveTime: sameMove ? mix(a.moveTime, b.moveTime, t) : a.moveTime,
    progress: sameMove ? mix(a.progress, b.progress, t) : a.progress,
    landingAge:
      a.landX === b.landX &&
      a.landingAge !== undefined &&
      b.landingAge !== undefined
        ? mix(a.landingAge, b.landingAge, t)
        : a.landingAge,
    slideExitAge:
      a.slideExitAge !== undefined &&
      b.slideExitAge !== undefined &&
      b.slideExitAge >= a.slideExitAge
        ? mix(a.slideExitAge, b.slideExitAge, t)
        : a.slideExitAge,
  };
}
