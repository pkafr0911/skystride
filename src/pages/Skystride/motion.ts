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
export function runPose(x: number): Pose {
  const p = basePose(),
    phase = (((x / STRIDE) % 1) + 1) % 1;
  const step = phase % 0.5;
  const load =
    step < STANCE
      ? Math.sin((Math.PI * step) / STANCE)
      : -0.45 * Math.sin((Math.PI * (step - STANCE)) / (0.5 - STANCE));
  const sink = 0.055 * load;
  p.hip[1] -= sink;
  p.chest[1] -= sink * 0.75;
  p.head[1] -= sink * 0.35;
  p.chest[0] += 0.025 * Math.sin(phase * Math.PI * 2);
  for (let s = 0; s < 2; s++) {
    const u = (phase + s * 0.5) % 1,
      side = s ? 1 : -1,
      foot = footTrack(u, side * 0.14);
    p.feet[s] = foot.point;
    p.footAngles[s] = foot.angle;
    p.knees[s] = [0.85, 0.7, side * 0.14];
    const swing = (Math.cos(u * Math.PI * 2 - 0.3) + 1) / 2;
    p.hands[s] = [mix(0.68, -0.26, swing), mix(1.48, 1.03, swing), side * 0.23];
    p.elbows[s] = [mix(0.25, -0.43, swing), mix(1.03, 1.3, swing), side * 0.24];
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
  const prepare = basePose();
  prepare.hip = [-0.1, 0.88, 0];
  prepare.chest = [0.2, 1.39, 0];
  prepare.head = [0.31, 1.7, 0];
  prepare.feet = [
    [0.42, 0.09, -0.17],
    [-0.46, 0.24, 0.17],
  ];
  prepare.hands = [
    [0.56, 1.03, -0.27],
    [-0.38, 1.16, 0.27],
  ];
  prepare.footAngles = [0.05, -0.38];
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
  const recovery = mix(0.19, 0.31, force);
  const load =
    mix(0.5, 1, force) *
    smooth(0, 0.045, age) *
    (1 - smooth(0.065, recovery, age));
  const p = runPose(f.x);
  const braced = basePose();
  braced.hip = [-0.13, 0.87 - 0.3 * load, 0];
  braced.chest = [0.2 + 0.1 * load, 1.4 - 0.43 * load, 0];
  braced.head = [0.32 + 0.1 * load, 1.71 - 0.42 * load, 0];
  const planted = clamp((f.landX ?? f.x) - f.x + 0.35, -0.58, 0.4);
  braced.feet = [
    [planted, 0.09, -0.14],
    [-0.58, 0.16, 0.14],
  ];
  braced.knees = [
    [0.86, 0.66, -0.14],
    [0.37, 0.52, 0.14],
  ];
  braced.hands = [
    [0.6, 0.96 - load * 0.2, -0.24],
    [-0.48, 1.1 - load * 0.22, 0.24],
  ];
  braced.elbows = [
    [0.4, 1.08 - load * 0.2, -0.24],
    [-0.33, 1.2 - load * 0.24, 0.24],
  ];
  return blend(swapLead(braced, f.lead || 0), p, smooth(0.08, recovery, age));
}
function vaultPose(f: Frame): Pose {
  const p = f.progress,
    run = runPose(f.x),
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
  const result = sequence(
    [
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
    const pin = smooth(0.1, 0.24, p) * (1 - smooth(0.61, 0.69, reach));
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
  return blend(p, runPose(f.x), smooth(0.84, 1, u));
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
  return blend(p, runPose(f.x), smooth(0.73, 1, u));
}

/** Pure animation sampling: seeking, ghost playback and live frames all evaluate identical poses. */
export function poseFor(f: Frame): Pose {
  switch (f.move) {
    case "run":
      return (f.landingAge ?? 1) < 0.32 ? landingPose(f) : runPose(f.x);
    case "land":
      return landingPose(f);
    case "jump":
    case "fall":
      return jumpPose(f);
    case "vault":
      return vaultPose(f);
    case "slide":
    case "stumble": {
      const low = lowPose();
      if (f.move === "stumble") {
        low.chest[0] -= 0.12 * (1 - f.progress);
        low.hands[1] = [-0.31, 0.81, 0.23];
        low.feet[1] = [0.04, 0.09, 0.17];
      }
      return blend(runPose(f.x), low, smooth(0, 0.045, f.moveTime));
    }
    case "roll":
      return rollPose(f);
    case "catch":
    case "climb":
      return climbPose(f);
    case "wall": {
      const p = jumpPose({
        ...f,
        moveTime: mix(0.02, 0.22, f.progress),
        vy: 6,
      });
      p.feet[0] = [0.47, 0.45 + 0.25 * Math.sin(Math.PI * f.progress), -0.14];
      p.hands[0] = [0.66, 1.65, -0.23];
      return blend(p, runPose(f.x), smooth(0.77, 1, f.progress));
    }
  }
}

export function motionPhase(f: Frame): string {
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
  };
}
