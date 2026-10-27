import {
  blend,
  poseFor,
  POSE_TRANSITION,
  validPose,
  type Pose,
} from "./motion";
import {
  swingGripOffset,
  SWING_GAP_EXTRA,
  SWING_DURATION,
  SWING_RELEASE_SPEED,
  comboCourse,
  isSwing,
  techniques,
  Technique,
} from "./combos";
export const STEP = 1 / 120;
export const SECTOR = 1000;
export const FINISH = SECTOR * 3;
export const VERSION = "sunset-relay-v31";
export const RUN_SPEED = 12;
export const RUN_ACCELERATION = 3;
export const LONG_JUMP_SPEED = 11.5;
export const GRAVITY = 30;
export const JUMP_SPEED = 12.4;
export const BUFFER = 0.12;
export const COYOTE = 0.09;
export type GameMode = "standard" | "hardcore";
export const recordStorage = (mode: GameMode) =>
  `skystride.${VERSION}.${mode}.best`;
export type Action = "up" | "down" | "forward";
export type Move =
  | "run"
  | "jump"
  | "fall"
  | "land"
  | "vault"
  | "slide"
  | "wall"
  | "wall-climb"
  | "catch"
  | "climb"
  | "roll"
  | "crash"
  | "knockback"
  | "heavy-land"
  | "stumble"
  | "mantle"
  | "wall-run"
  | "dive"
  | "special";
export type Vault =
  | "dash"
  | "hurdle"
  | "speed"
  | "one-hand"
  | "safety"
  | "lazy"
  | "kong";
export type Feature =
  | "vent-bank"
  | "pipe"
  | "window"
  | "solar"
  | "side-ramp"
  | "tank"
  | "wall-billboard"
  | "bridge"
  | "greenhouse"
  | "scaffold"
  | "balcony"
  | "signature";
export type ObstacleDesign =
  | "ac-condenser"
  | "cable-reels"
  | "utility-cabinet"
  | "maintenance-cart"
  | "roof-hatch"
  | "duct-elbow"
  | "safety-barricade"
  | "antenna-base";
export type Landmark = "crane" | "billboard" | "skylights";
export type Obstacle = {
  /** The wall spans a real void, starting one metre after the approach marker. */
  wallGap?: boolean;
  /** Visual equipment design; collision and traversal still use the authored kind. */
  design?: ObstacleDesign;
  landmark?: Landmark;
  x: number;
  width: number;
  height?: number;
  kind:
    | "vault"
    | "gap"
    | "slide"
    | "branch"
    | "drop"
    | "ramp"
    | "ledge"
    | "glass"
    | "encounter"
    | "signature";
  technique?: Technique;
  combo?: string;
  contact?: number;
  side?: 1 | -1;
  feature?: Feature;
  part?: "planter" | "ledge" | "glass";
  /** Underside of a billboard header, measured from its roof. */
  openingTop?: number;
  route?: "upper" | "lower";
  vault?: Vault;
};
const opening: Obstacle[] = [
  { x: 14, width: 5.5, kind: "gap" },
  {
    x: 27,
    width: 0.7,
    height: 0.5,
    kind: "vault",
    vault: "speed",
    design: "safety-barricade",
  },
  {
    x: 46,
    width: 6,
    height: 1.4,
    kind: "encounter",
    feature: "wall-billboard",
    wallGap: true,
  },
  { x: 67, width: 6.2, kind: "gap", feature: "bridge" },
  { x: 80, width: 5.5, kind: "gap" },
  { x: 91, width: 5.5, height: 1.65, kind: "slide", feature: "tank" },
  { x: 102, width: 5.5, kind: "gap" },
  { x: 115, width: 5, height: 3.3, kind: "branch" },
  {
    x: 139,
    design: "maintenance-cart",
    width: 1.5,
    height: 1.05,
    kind: "vault",
    vault: "speed",
    route: "lower",
  },
  { x: 153, width: 6, kind: "slide", route: "lower", design: "duct-elbow" },
  { x: 148, width: 6.5, kind: "gap", route: "upper" },
  {
    x: 150.5,
    width: 1.8,
    height: 0.65,
    kind: "ledge",
    route: "upper",
    feature: "scaffold",
  },
  {
    x: 176,
    width: 2.3,
    height: 2.2,
    kind: "ledge",
    route: "upper",
    feature: "balcony",
  },
  {
    x: 179.5,
    width: 2.3,
    height: 3.3,
    kind: "ledge",
    route: "upper",
    feature: "balcony",
  },
  {
    x: 183,
    width: 3,
    height: 4.3,
    kind: "ledge",
    route: "upper",
    feature: "balcony",
  },
  { x: 195, width: 9, kind: "drop", route: "upper" },
  { x: 206, width: 5, kind: "gap", design: "roof-hatch" },
  {
    x: 217,
    width: 1.8,
    height: 1.15,
    kind: "vault",
    vault: "kong",
    feature: "vent-bank",
  },
  {
    x: 223.2,
    design: "cable-reels",
    width: 1.6,
    height: 1.15,
    kind: "vault",
    vault: "dash",
    feature: "vent-bank",
  },
  { x: 234, width: 6, height: 1.1, kind: "ramp", feature: "solar" },
  { x: 240, width: 7, kind: "gap" },
  {
    x: 267,
    design: "antenna-base",
    width: 1.2,
    height: 0.85,
    kind: "vault",
    vault: "lazy",
    feature: "greenhouse",
    part: "planter",
  },
  {
    x: 271,
    width: 6,
    height: 1.45,
    kind: "ramp",
    feature: "greenhouse",
    part: "ledge",
  },
  {
    x: 278,
    width: 3,
    height: 2.5,
    openingTop: 1.25,
    kind: "glass",
    feature: "greenhouse",
    part: "glass",
  },
  { x: 290, width: 5, kind: "branch" },
  {
    x: 312,
    design: "ac-condenser",
    width: 2.8,
    height: 1.1,
    kind: "vault",
    vault: "kong",
    route: "lower",
  },
  { x: 335, width: 6, kind: "slide", route: "lower" },
  { x: 325, width: 7, kind: "gap", route: "upper" },
  {
    x: 349,
    design: "utility-cabinet",
    width: 2.6,
    height: 1.2,
    kind: "vault",
    vault: "dash",
    route: "upper",
  },
  { x: 375, width: 9, kind: "drop", route: "upper" },
  { x: 389, width: 5, kind: "gap" },
  {
    x: 402,
    width: 3.4,
    height: 0.85,
    kind: "vault",
    vault: "speed",
    feature: "window",
    openingTop: 3.45,
  },
  {
    x: 424,
    width: 1.4,
    height: 1.05,
    kind: "vault",
    vault: "dash",
    feature: "pipe",
  },
  { x: 431.2, width: 4.2, height: 2.35, kind: "slide", feature: "pipe" },
  { x: 448, width: 7.2, kind: "gap" },
];
// An authored opening, a sustained technical district, then three varied rooftop blocks.
// All patterns are deterministic and shared by collision, renderer and replay.
export const TECHNICAL = { start: 500, end: 1450 };
const circuit: Obstacle[] = [
  { x: 490, width: 5, kind: "branch" },
  { x: 1450, width: 9, kind: "drop", route: "upper" },
];
const variants: Vault[] = [
  "kong",
  "dash",
  "speed",
  "lazy",
  "kong",
  "dash",
  "speed",
  "lazy",
];
circuit.push(...comboCourse());
const districts = [1480, 1960, 2440];
const sideRamps: Obstacle[] = [0, ...districts].map((offset) => ({
  x: 456 + offset,
  width: 20,
  height: -1.2,
  kind: "ramp",
  feature: "side-ramp",
}));
const courseAnchors: Obstacle[] = [
  ...sideRamps,
  ...sideRamps.map(
    (r): Obstacle => ({ x: r.x + r.width, width: 8.4, kind: "gap" }),
  ),
  ...opening,
  ...circuit,
  ...districts.flatMap((offset) =>
    opening.map((o) => ({ ...o, x: o.x + offset })),
  ),
  { x: 2940, width: 1.6, height: 1, kind: "vault", vault: "kong" },
  { x: 2960, width: 4.2, kind: "slide" },
  { x: 2980, width: 6, kind: "gap" },
].sort((a, b) => a.x - b.x) as Obstacle[];
export const upperPlatforms = [
  { start: 120, end: 195 },
  { start: 295, end: 375 },
  { start: 495, end: 1450 },
  ...districts.flatMap((offset) => [
    { start: 120 + offset, end: 195 + offset },
    { start: 295 + offset, end: 375 + offset },
  ]),
];
/** Fill runnable approaches with short alternating contacts, retaining landing/rejoin space. */
function denseLane(start: number, end: number, route: "upper" | "lower") {
  const anchors = courseAnchors.filter(
    (o) => o.x >= start && o.x < end && (!o.route || o.route === route),
  );
  const additions: Obstacle[] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const previous = anchors[i],
      next = anchors[i + 1];
    if (
      (previous.combo && previous.combo === next.combo) ||
      previous.kind === "drop" ||
      previous.kind === "ramp" ||
      previous.kind === "ledge" ||
      (previous.feature === "greenhouse" && next.feature === "greenhouse") ||
      (previous.feature === "vent-bank" && next.feature === "vent-bank") ||
      (previous.feature === "pipe" && next.feature === "pipe")
    )
      continue;
    const clearance =
      previous.kind === "glass"
        ? 8
        : previous.kind === "gap"
          ? 5.5
          : previous.kind === "branch"
            ? 8
            : 2.8;
    let x = previous.x + previous.width + clearance;
    let n = 0;
    while (x <= next.x - 5.8 && x < end - 5) {
      additions.push(
        n % 3 === 1
          ? { x, width: 1.1, height: 1.65, kind: "slide", route }
          : {
              x,
              width: 0.65,
              height: 0.65 + (n % 2) * 0.15,
              kind: "vault",
              vault:
                variants[
                  (i + n + (route === "upper" ? 1 : 0)) % variants.length
                ],
              route,
            },
      );
      x += route === "upper" ? 5.8 : 7;
      n++;
    }
  }
  return additions.filter((o) => {
    if (
      sideRamps.some((r) => o.x + o.width > r.x - 2 && o.x < r.x + r.width + 12)
    )
      return false;
    if (
      route === "lower" &&
      upperPlatforms.some((p) => o.x >= p.end - 2 && o.x < p.end + 15)
    )
      return false;
    // Leave a visible run-up for the early-jump alternative. Filler must not
    // consume the same input that is meant to choose the top line.
    if (
      courseAnchors.some(
        (a) =>
          (!a.route || a.route === route) &&
          ((a.feature === "greenhouse" &&
            o.x >= a.x - 2 &&
            o.x < a.x + a.width + 4) ||
            (a.feature === "balcony" &&
              o.x >= a.x - 3 &&
              o.x < a.x + a.width + 5) ||
            (a.feature === "wall-billboard" &&
              o.x >= a.x &&
              o.x < a.x + a.width + 5)),
      )
    )
      return false;
    return !courseAnchors.some(
      (anchor) =>
        (!anchor.route || anchor.route === route) &&
        ((anchor.feature === "vent-bank" && anchor.vault === "kong") ||
          (anchor.feature === "pipe" && anchor.kind === "vault") ||
          anchor.feature === "window") &&
        o.x >= anchor.x - (anchor.feature === "window" ? 8 : 10) &&
        o.x < anchor.x,
    );
  });
}
export const obstacles: Obstacle[] = [
  ...courseAnchors,
  ...denseLane(0, FINISH, "lower"),
  ...upperPlatforms.flatMap((p) => denseLane(p.start - 6, p.end, "upper")),
].sort((a, b) => a.x - b.x);

// Check the finished lanes after filler filtering, which can remove a separating
// vault near a landing zone. Replace the filler duct, preserving authored props.
for (const route of ["lower", "upper"] as const) {
  const lane = obstacles.filter((o) => !o.route || o.route === route);
  for (let i = 1; i < lane.length; i++) {
    if (lane[i - 1].kind !== "slide" || lane[i].kind !== "slide") continue;
    const filler =
      !lane[i - 1].feature && lane[i - 1].route ? lane[i - 1] : lane[i];
    filler.kind = "vault";
    filler.vault = "kong";
    filler.height = 1.1;
    filler.width = 2.4;
  }
}

export function canMantle(o: Obstacle) {
  return (
    o.kind === "slide" &&
    o.feature !== "tank" &&
    (o.height ?? 2.35) <= 1.8 &&
    (o.route === "upper" ||
      !upperPlatforms.some((p) => o.x < p.end && o.x + o.width > p.start))
  );
}
/** Clean action opportunity in seconds, independent of current horizontal speed. */
export function timingWindow(o: Obstacle) {
  return o.route === "upper"
    ? 0.2 + Math.min(0.05, o.width * 0.0125)
    : 0.3 + Math.min(0.1, o.width * 0.025);
}
export function timingRange(o: Obstacle, speed: number) {
  const end = o.kind === "gap" ? 0.35 : 0.55;
  return { near: end, far: end + Math.max(5.5, speed) * timingWindow(o) };
}
// Each district has its own raised and lowered roofs. Changes happen across
// building gaps, with bounded steps so the authored jump sequences stay reachable.
const elevationStages = [
  { start: 0, high: 0.6, low: -0.35 },
  { start: 1480, high: 1, low: -0.55 },
  { start: 1960, high: 0.35, low: -0.8 },
  { start: 2440, high: 1.2, low: 0.3 },
];
function districtRoofHeight(x: number) {
  for (const stage of elevationStages) {
    const local = x - stage.start;
    // Tolerate round-off when a gap endpoint is translated into another district.
    if (local >= 19.5 - 1e-8 && local < 73.2 - 1e-8) return stage.high;
    if (local >= 73.2 - 1e-8 && local < 85.5 - 1e-8) return stage.low;
  }
  return 0;
}
// Physical lower buildings: flat roofs joined by short, obstacle-free ramps.
// Keep the upper line independent so its existing clearance only increases.
export const roofBuildings = [
  ...[0, 1480, 1960, 2440].map((offset) => ({
    start: 132 + offset,
    end: 198 + offset,
    depth: 1.2,
    ramp: 3,
  })),
  { start: 901, end: 1023, depth: 0.9, ramp: 3 },
  { start: 1029, end: 1151, depth: 1.4, ramp: 3 },
  { start: 1155, end: 1284, depth: 0.7, ramp: 3 },
  { start: 1351, end: 1456, depth: 1.1, ramp: 3 },
];
export function roofHeight(x: number) {
  const building = roofBuildings.find((b) => x >= b.start && x < b.end);
  if (!building) return districtRoofHeight(x);
  const fraction = Math.min(
    1,
    (x - building.start) / building.ramp,
    (building.end - x) / building.ramp,
  );
  return districtRoofHeight(x) - building.depth * fraction;
}
export type Surface = {
  start: number;
  end: number;
  y: number;
  upper: boolean;
  endY?: number;
};
export function surfaceHeight(s: Surface, x: number) {
  const fraction = Math.max(0, Math.min(1, (x - s.start) / (s.end - s.start)));
  return s.y + ((s.endY ?? s.y) - s.y) * fraction;
}
function cut(start: number, end: number, y: number, upper: boolean): Surface[] {
  const result: Surface[] = [];
  let cursor = start;
  for (const o of obstacles.filter(
    (item) =>
      (item.kind === "gap" || isSwing(item.technique) || item.wallGap) &&
      (upper ? item.route === "upper" : item.route !== "upper") &&
      item.x >= start &&
      item.x < end,
  )) {
    result.push({
      start: cursor,
      end: o.x + (o.wallGap ? 1 : 0),
      y: y + districtRoofHeight(cursor),
      upper,
    });
    cursor = o.x + o.width + (isSwing(o.technique) ? SWING_GAP_EXTRA : 0);
  }
  result.push({ start: cursor, end, y: y + districtRoofHeight(cursor), upper });
  return result;
}
export const surfaces: Surface[] = [
  ...cut(-30, FINISH + 25, 0, false).flatMap((slab) => {
    const cuts = [
      slab.start,
      slab.end,
      ...roofBuildings
        .flatMap((b) => [b.start, b.start + b.ramp, b.end - b.ramp, b.end])
        .filter((x) => x > slab.start && x < slab.end),
    ].sort((a, b) => a - b);
    return cuts.slice(0, -1).map((start, i): Surface => {
      const end = cuts[i + 1];
      // Sample just inside each bank: existing roof changes across gaps stay discrete.
      const y = roofHeight(start + 1e-7),
        endY = roofHeight(end - 1e-7);
      return {
        start,
        end,
        y,
        endY: Math.abs(endY - y) > 0.001 ? endY : undefined,
        upper: false,
      };
    });
  }),
  ...upperPlatforms.flatMap((p) => cut(p.start, p.end, 3.3, true)),
];
export const craneRecovery = obstacles
  .filter((o) => o.landmark === "crane" && isSwing(o.technique))
  .map(
    (o): Surface => ({
      start: o.x + 3,
      end: o.x + o.width + SWING_GAP_EXTRA + 4,
      y: 0,
      upper: false,
    }),
  );
surfaces.push(...craneRecovery);
export function ground(x: number, upper: boolean) {
  return upper && upperPlatforms.some((p) => x >= p.start && x <= p.end)
    ? districtRoofHeight(x) + 3.3
    : roofHeight(x);
}
/** Solid obstacle tops are support surfaces even after their scoring event is handled. */
export const obstacleTops = obstacles.flatMap((o, index) =>
  o.kind === "vault" || o.kind === "slide" || o.kind === "ledge"
    ? [
        {
          start: o.x,
          end: o.x + o.width,
          y:
            ground(o.x, o.route === "upper") +
            (o.height ?? (o.kind === "slide" ? 2.35 : 1)),
          index,
          upper: o.route === "upper",
        },
      ]
    : [],
);
const glassObstacles = obstacles.filter((o) => o.kind === "glass");
export const ramps = obstacles.filter((o) => o.kind === "ramp");
export function rampHeight(o: Obstacle, x: number) {
  return (
    ground(o.x, o.route === "upper") +
    Math.max(0, Math.min(1, (x - o.x) / o.width)) * (o.height ?? 1.1)
  );
}
export const billboardHeaders = obstacles.flatMap((o, index) =>
  o.feature === "window"
    ? [
        {
          start: o.x,
          end: o.x + o.width,
          y: ground(o.x, o.route === "upper") + o.openingTop! + 0.55,
          index,
          upper: o.route === "upper",
        },
      ]
    : [],
);
export const wallRunLedges = obstacles.flatMap((o, index) =>
  o.feature === "wall-billboard"
    ? [
        {
          start: o.x + o.width,
          end: o.x + o.width + 3,
          y: ground(o.x, o.route === "upper") + o.height!,
          index,
          upper: o.route === "upper",
        },
      ]
    : [],
);
const interactiveTops = [
  ...obstacleTops,
  ...billboardHeaders,
  ...wallRunLedges,
];
// Build once; the 120 Hz loop must not allocate and filter the full course per tick.
const supportSurfaces = {
  lower: [
    ...surfaces,
    ...obstacleTops.filter((s) => !s.upper),
    ...billboardHeaders.filter((s) => !s.upper),
    ...wallRunLedges.filter((s) => !s.upper),
  ],
  upper: [
    ...surfaces,
    ...obstacleTops.filter((s) => s.upper),
    ...billboardHeaders.filter((s) => s.upper),
    ...wallRunLedges.filter((s) => s.upper),
  ],
};
export type Contact = { x: number; y: number };
export type Frame = {
  /** Bounded pose snapshot for deterministic action-to-action blending. */
  transitionPose?: Pose;
  transitionDuration?: number;
  /** Interpolation-only pose; never produced by the simulation. */
  renderPose?: Pose;
  chain?: number;
  anticipation?: number;
  x: number;
  y: number;
  speed: number;
  vy: number;
  move: Move;
  moveTime: number;
  progress: number;
  grounded: boolean;
  vault: Vault;
  contact: Contact | null;
  /** Visual-only event data. Optional so existing v2 ghosts remain readable. */
  launchX?: number;
  launchY?: number;
  landX?: number;
  impact?: number;
  landingAge?: number;
  slideExitAge?: number;
  longJump?: boolean;
  lead?: number;
  slope?: number;
  lane?: number;
  technique?: Technique;
  side?: 1 | -1;
};
export type Sample = { time: number; frame: Frame };
export type Input = { tick: number; action: Action };
export type RecordRun = {
  mode: GameMode;
  version: string;
  time: number;
  splits: number[];
  samples: Sample[];
  inputs: Input[];
};
const moves: Move[] = [
  "run",
  "jump",
  "fall",
  "land",
  "vault",
  "slide",
  "wall",
  "wall-climb",
  "catch",
  "climb",
  "roll",
  "crash",
  "knockback",
  "heavy-land",
  "stumble",
  "mantle",
  "wall-run",
  "dive",
  "special",
];
const vaults: Vault[] = [
  "dash",
  "hurdle",
  "speed",
  "one-hand",
  "safety",
  "lazy",
  "kong",
];
export function readRecord(
  raw: string | null,
  mode?: GameMode,
): RecordRun | null {
  try {
    const r = JSON.parse(raw || "null") as RecordRun;
    if (
      !r ||
      r.version !== VERSION ||
      !["standard", "hardcore"].includes(r.mode) ||
      (mode !== undefined && r.mode !== mode) ||
      !Number.isFinite(r.time) ||
      r.time < 20 ||
      r.time > 600 ||
      !Array.isArray(r.splits) ||
      r.splits.length !== 3 ||
      !r.splits.every(
        (n, i) =>
          Number.isFinite(n) && n > (r.splits[i - 1] || 0) && n <= r.time,
      ) ||
      r.splits[2] !== r.time ||
      !Array.isArray(r.samples) ||
      !r.samples.length ||
      r.samples.length > 12002 ||
      !Array.isArray(r.inputs) ||
      r.inputs.length > 20000
    )
      return null;
    if (
      !r.inputs.every(
        (input, i) =>
          Number.isInteger(input.tick) &&
          input.tick >= 1 &&
          input.tick <= Math.ceil(r.time / STEP) &&
          input.tick >= (r.inputs[i - 1]?.tick || 0) &&
          ["up", "down", "forward"].includes(input.action),
      )
    )
      return null;
    if (
      !r.samples.every((s, i) => {
        const f = s.frame;
        return (
          Number.isFinite(s.time) &&
          s.time >= 0 &&
          s.time <= r.time &&
          (i === 0 || s.time > r.samples[i - 1].time) &&
          f &&
          [f.x, f.y, f.speed, f.vy, f.moveTime, f.progress].every(
            Number.isFinite,
          ) &&
          f.x >= 0 &&
          f.x <= FINISH &&
          f.y >= -9 &&
          f.y <= 20 &&
          f.speed >= 0 &&
          f.speed <= SWING_RELEASE_SPEED &&
          f.progress >= 0 &&
          f.progress <= 1 &&
          typeof f.grounded === "boolean" &&
          (f.anticipation === undefined ||
            (Number.isFinite(f.anticipation) &&
              f.anticipation >= 0 &&
              f.anticipation <= 1)) &&
          (f.chain === undefined ||
            (Number.isInteger(f.chain) && f.chain >= 0 && f.chain <= 20000)) &&
          (f.slope === undefined || Math.abs(f.slope) <= 1) &&
          (f.longJump === undefined || typeof f.longJump === "boolean") &&
          [
            f.launchX,
            f.launchY,
            f.landX,
            f.impact,
            f.landingAge,
            f.slideExitAge,
            f.lead,
            f.slope,
            f.lane,
          ].every((value) => value === undefined || Number.isFinite(value)) &&
          (f.technique === undefined || techniques.includes(f.technique)) &&
          (f.side === undefined || f.side === 1 || f.side === -1) &&
          (f.transitionPose === undefined || validPose(f.transitionPose)) &&
          (f.transitionDuration === undefined ||
            (Number.isFinite(f.transitionDuration) &&
              f.transitionDuration > 0 &&
              f.transitionDuration <= POSE_TRANSITION)) &&
          f.renderPose === undefined &&
          moves.includes(f.move) &&
          vaults.includes(f.vault) &&
          (f.contact === null ||
            (Number.isFinite(f.contact?.x) && Number.isFinite(f.contact?.y)))
        );
      })
    )
      return null;
    if (r.samples[r.samples.length - 1].frame.x !== FINISH) return null;
    return r;
  } catch {
    return null;
  }
}
export function formatTime(t: number) {
  const hundredths = Math.round(t * 100);
  return `${Math.floor(hundredths / 6000)
    .toString()
    .padStart(
      2,
      "0",
    )}:${((hundredths % 6000) / 100).toFixed(2).padStart(5, "0")}`;
}
export type Traversal = {
  start: number;
  end: number;
  y0: number;
  y1: number;
  elapsed: number;
  duration: number;
  arc: number;
  move: Move;
  contact: Contact | null;
  vault: Vault;
  obstacle?: { start: number; end: number };
  pushed?: boolean;
  upper?: boolean;
  technique?: Technique;
  side?: 1 | -1;
  released?: boolean;
  landmark?: Landmark;
  catchX?: number;
  catchY?: number;
};
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
export class Run {
  mode: GameMode = "standard";
  phase: "ready" | "running" | "finished" | "failed" = "ready";
  x = 0;
  y = 0;
  time = 0;
  ticks = 0;
  speed = RUN_SPEED;
  vy = 0;
  upper = false;
  grounded = true;
  move: Move = "run";
  moveTime = 0;
  private transitionPose?: Pose;
  private transitionDuration = POSE_TRANSITION;
  vault: Vault = "speed";
  paused = false;
  eligible = true;
  practice = false;
  startSector = 0;
  clean = 0;
  recoveries = 0;
  flow = 0;
  bestFlow = 0;
  feedback = { id: 0, time: -10, kind: "clean", strength: 0 };
  splits: number[] = [];
  samples: Sample[] = [];
  inputs: Input[] = [];
  handled = new Set<number>();
  private timed = new Set<number>();
  private headerHits = new Set<number>();
  traversal: Traversal | null = null;
  message = "Find your line. Own your time.";
  messageUntil = 0;
  onChange = () => {};
  previous: Frame = this.frame();
  private pending: Action[] = [];
  private buffered: { action: Action; until: number } | null = null;
  private lastGround = 0;
  private rollUntil = -1;
  private slideExitAt = -10;
  private jumpIntent = -1;
  private ledgeIntent = -1;
  private actionDuration = 0;
  private dropFrom = 0;
  private launchX = 0;
  private launchY = 0;
  private landX = 0;
  private impact = 0;
  private landedAt = -10;
  private lead = 0;
  private longJump = false;
  private sideLaneStart = -10;
  private sideLaneEnd = -10;
  start(sector = 0, practice = false, mode: GameMode = this.mode) {
    this.mode = mode;
    this.phase = "running";
    this.startSector = sector;
    this.x = sector * SECTOR;
    this.y = ground(this.x, false);
    this.time = 0;
    this.ticks = 0;
    this.speed = 7.5;
    this.vy = 0;
    this.upper = false;
    this.grounded = true;
    this.move = "run";
    this.moveTime = 0;
    this.transitionPose = undefined;
    this.paused = false;
    this.eligible = !practice;
    this.practice = practice;
    this.clean = 0;
    this.recoveries = 0;
    this.flow = 0;
    this.bestFlow = 0;
    this.feedback = { id: 0, time: -10, kind: "clean", strength: 0 };
    this.splits = [];
    this.samples = [];
    this.inputs = [];
    this.traversal = null;
    this.pending = [];
    this.buffered = null;
    this.lastGround = 0;
    this.rollUntil = -1;
    this.slideExitAt = -10;
    this.jumpIntent = -1;
    this.ledgeIntent = -1;
    this.actionDuration = 0;
    this.dropFrom = 0;
    this.launchX = this.x;
    this.launchY = 0;
    this.landX = this.x;
    this.impact = 0;
    this.landedAt = -10;
    this.lead = 0;
    this.longJump = false;
    this.sideLaneStart = this.sideLaneEnd = -10;
    this.timed.clear();
    this.headerHits.clear();
    this.handled = new Set(
      obstacles.flatMap((o, i) => (o.x + o.width < this.x ? [i] : [])),
    );
    this.message = practice
      ? "PRACTICE · FIND YOUR RHYTHM"
      : "SUNSET RELAY / GO";
    this.messageUntil = 1.6;
    this.previous = this.frame();
    this.samples.push({ time: 0, frame: this.frame() });
    this.onChange();
  }
  pause() {
    if (this.phase !== "running") return;
    this.paused = !this.paused;
    this.eligible = false;
    this.pending = [];
    this.buffered = null;
    this.onChange();
  }
  applicable(o: Obstacle) {
    return !o.route || (o.route === "upper") === this.upper;
  }
  next() {
    return obstacles.find(
      (o, i) =>
        o.kind !== "ramp" &&
        !(
          (o.kind === "encounter" || o.kind === "ledge") &&
          this.x > o.x + 0.1
        ) &&
        !this.handled.has(i) &&
        this.applicable(o) &&
        o.x + o.width >= this.x - 0.25,
    );
  }
  say(text: string) {
    this.message = text;
    this.messageUntil = this.time + 1.25;
    this.onChange();
  }
  private setMove(move: Move, duration = 0) {
    // Capture the visible outgoing pose, including an unfinished transition.
    // A pose snapshot stays bounded even when inputs chain several actions.
    const outgoing = poseFor(this.previous);
    // Clone and normalize signed zero so replay JSON round-trips exactly.
    this.transitionPose = blend(outgoing, outgoing, 0);
    this.transitionDuration =
      this.traversal?.move === move
        ? Math.min(POSE_TRANSITION, this.traversal.duration * 0.16)
        : move === "jump"
          ? 0.035
          : POSE_TRANSITION;
    this.move = move;
    this.moveTime = 0;
    this.actionDuration = duration;
  }
  private feedbackEvent(kind: string, strength = 1) {
    this.feedback = {
      id: this.feedback.id + 1,
      time: this.time,
      kind,
      strength,
    };
  }
  private reward(label: string) {
    this.clean++;
    this.flow++;
    this.bestFlow = Math.max(this.bestFlow, this.flow);
    if (this.grounded) this.speed = Math.min(14, this.speed + 0.35);
    const milestone = this.flow > 0 && this.flow % 5 === 0;
    this.feedbackEvent(milestone ? "chain" : "clean", milestone ? 1.5 : 0.5);
    this.say(milestone ? `PERFECT CHAIN ×${this.flow} · FLOW SURGE` : label);
  }
  private recover(label: string, cost = 2.8) {
    this.feedbackEvent("impact");
    this.recoveries++;
    this.flow = 0;
    this.speed = Math.max(5.5, this.speed - cost);
    this.say(label);
  }
  private get recovering() {
    return (
      this.move === "crash" ||
      this.move === "knockback" ||
      this.move === "heavy-land"
    );
  }
  private crash(o: Obstacle, backward: boolean) {
    this.feedbackEvent("impact");
    this.recoveries++;
    this.flow = 0;
    this.speed = 0;
    this.x = Math.min(this.x, o.x - 0.4);
    this.vy = Math.min(0, this.vy);
    this.buffered = null;
    this.rollUntil = -1;
    this.setMove(backward ? "knockback" : "crash", backward ? 1.35 : 1.2);
    this.say(
      backward
        ? "KNOCKDOWN · SLIDE UNDER ON RETRY"
        : "CRASH · GET UP AND VAULT",
    );
  }
  action(action: Action) {
    if (this.phase === "running" && !this.paused && this.pending.length < 4)
      this.pending.push(action);
  }
  private traverse(
    o: Obstacle,
    move: Move,
    y1: number,
    arc: number,
    clean: boolean,
    vault: Vault = "speed",
  ) {
    if (obstacles.indexOf(o) >= 0) this.handled.add(obstacles.indexOf(o));
    const wall = move === "wall" || move === "wall-climb";
    const end = o.x + o.width + (wall ? 0.75 : 1.4);
    const contact = {
      x: o.x + Math.min(o.width * 0.4, 0.7),
      y: ground(o.x, o.route === "upper") + (o.height || 1.1),
    };
    if (wall) {
      contact.x = o.x + o.width;
      contact.y = 3.3;
    }
    if (move === "mantle") {
      contact.x = o.x + 0.08;
      this.speed = Math.min(this.speed, Math.max(6, this.speed - 2.5));
      this.say("CLIMB OVER · SLIDING IS FASTER");
    } else if (clean)
      this.reward(
        wall
          ? move === "wall-climb"
            ? "WALL CLIMB · HIGH LINE"
            : "WALL STEP · HIGH LINE"
          : `${vault.replace("-", " ").toUpperCase()} · FLOW`,
      );
    else if (this.mode === "standard") {
      this.recover(
        wall ? "WALL CLIMB · LATE APPROACH" : "SAFETY VAULT · KEEP MOVING",
        1.6,
      );
    } else {
      const entrySpeed = this.speed;
      this.recover(
        wall ? "WALL CLIMB · LATE APPROACH" : "CLIPPED VAULT · FLOW LOST",
        0,
      );
      this.speed = entrySpeed * 0.7;
    }
    this.traversal = {
      start: this.x,
      end,
      y0: this.y,
      y1,
      elapsed: 0,
      duration:
        ((end - this.x) / Math.max(8, this.speed)) *
        (vault === "safety"
          ? 1.3
          : vault === "lazy"
            ? 1.12
            : vault === "speed"
              ? 0.94
              : 1),
      arc,
      move,
      contact,
      vault,
      landmark: o.landmark,
      obstacle: { start: o.x, end: o.x + o.width },
      side: o.side ?? 1,
    };
    if (move === "vault")
      this.traversal.duration = Math.max(
        this.traversal.duration,
        !clean
          ? 0.85
          : vault === "kong"
            ? 0.52
            : vault === "dash" || vault === "lazy" || vault === "safety"
              ? 0.44
              : 0.36,
      );
    if (move === "mantle") this.traversal.duration += 0.75;
    if (move === "wall-climb")
      this.traversal.duration += 0.62 + Math.max(0, 11.5 - this.speed) * 0.09;
    this.vault = vault;
    this.grounded = false;
    this.vy = 0;
    this.setMove(move);
  }
  onObstacle() {
    return interactiveTops.find(
      (s) =>
        s.upper === this.upper &&
        this.x >= s.start &&
        this.x < s.end &&
        Math.abs(this.y - s.y) < 0.16 &&
        (this.grounded || this.traversal?.move === "mantle"),
    );
  }
  private jump(action: Action) {
    this.launchX = this.x;
    this.launchY = this.y;
    this.lead = (this.x / 4.4) % 1 < 0.5 ? 1 : 0;
    this.longJump = action === "forward" && this.speed >= LONG_JUMP_SPEED;
    this.vy = JUMP_SPEED + (this.longJump ? 1.2 : 0);
    if (action === "forward")
      this.say(
        this.longJump
          ? "LONG JUMP · CARRY YOUR SPEED"
          : "BUILD SPEED FOR A LONG JUMP",
      );
    this.grounded = false;
    this.lastGround = -1;
    this.dropFrom = this.y;
    this.setMove("jump");
  }
  private signature(o: Obstacle, clean: boolean) {
    this.traverse(o, "special", this.y, o.height ?? 1.1, clean);
    const t = this.traversal!;
    t.technique = o.technique;
    t.side = o.side ?? 1;
    t.upper = this.upper;
    t.duration = Math.max(
      isSwing(o.technique) ? 0.75 : 0.48,
      (t.end - t.start) / Math.max(3, this.speed),
    );
    // A quick wall plant and drive keep tic-tacs from hanging on contact.
    if (o.technique === "tic-tac") t.duration *= 0.75;
    t.contact = { x: o.x + o.width / 2, y: this.y + (o.height ?? 1.1) };
    this.say(
      `${o.combo ?? "PARKOUR"} · ${o.technique?.replaceAll("-", " ").toUpperCase()}`,
    );
  }
  private mount(o: Obstacle) {
    const base = ground(o.x, o.route === "upper");
    const top = base + o.height!;
    if (obstacles.indexOf(o) >= 0) this.handled.add(obstacles.indexOf(o));
    this.traversal = {
      start: this.x,
      end: o.x + Math.min(0.8, o.width * 0.5),
      y0: this.y,
      y1: top,
      elapsed: 0,
      duration: 0.4 + Math.max(0, top - this.y) * 0.16,
      arc: 0,
      move: top - this.y > 1.65 ? "wall-climb" : "climb",
      contact: { x: o.x, y: top },
      vault: "safety",
      upper: this.upper,
    };
    this.speed = Math.max(5.5, this.speed - 0.8);
    this.vy = 0;
    this.grounded = false;
    this.setMove(this.traversal.move);
    this.say("LEDGE CONTACT · PULL, PRESS, EXIT");
  }
  private tryAction(action: Action): boolean {
    if (this.recovering && this.moveTime < this.actionDuration) return false;
    const t = this.traversal;
    if (t) {
      if (
        t.move === "special" &&
        isSwing(t.technique) &&
        action === "forward" &&
        t.elapsed / t.duration >= 0.35 &&
        !t.released
      ) {
        this.launchX = this.x;
        this.launchY = this.y;
        this.dropFrom = this.y;
        const releasePhase = t.elapsed / t.duration;
        const perfect =
          t.landmark === "crane" && releasePhase >= 0.5 && releasePhase <= 0.72;
        const recovery = t.landmark === "crane" && !perfect;
        this.speed = recovery ? 18 : Math.max(this.speed, SWING_RELEASE_SPEED);
        this.vy = 2.5 + clamp(t.elapsed / t.duration, 0, 1) * 1.5;
        if (!this.upper && t.obstacle) {
          // The lower exit passes below the upper deck: project a low arc
          // instead of driving the runner's head into its leading fascia.
          const flight = Math.max(
            0.05,
            (t.obstacle.end + SWING_GAP_EXTRA - 0.23 - this.x) /
              Math.max(3, this.speed),
          );
          this.vy = (0.3 - this.y + 33 * 0.5 * flight * flight) / flight;
        }
        if (recovery) {
          this.vy = -2;
          this.flow = 0;
          this.feedbackEvent("impact", 0.5);
        } else if (perfect) this.reward("PERFECT RELEASE · FAST EXIT");
        this.traversal = null;
        this.grounded = false;
        this.lastGround = -1;
        this.setMove("jump");
        if (!perfect)
          this.say(
            recovery
              ? "LATE / EARLY RELEASE · LOWER SCAFFOLD RECOVERY"
              : "RELEASE · CARRY INTO THE NEXT CONTACT",
          );
        return true;
      }
      if (
        t.move === "special" &&
        action === "down" &&
        (isSwing(t.technique) || t.technique === "shimmy") &&
        t.elapsed / t.duration > 0.25
      ) {
        this.launchX = this.x;
        this.launchY = this.y;
        this.dropFrom = this.y;
        this.traversal = null;
        this.grounded = false;
        this.lastGround = -1;
        this.vy = -1;
        this.rollUntil = this.time + 0.5;
        this.setMove("fall");
        this.say("CONTROLLED DROP · LOW EXIT");
        return true;
      }
      const top = this.onObstacle();
      const toppedOut =
        (t.move === "wall-climb" || t.move === "climb") &&
        t.elapsed / t.duration >= 0.92 &&
        this.y >= t.y1 - 0.025 &&
        this.x >= (t.contact?.x ?? Infinity);
      if (top || toppedOut) {
        this.traversal = null;
        this.y = top?.y ?? t.y1;
        this.grounded = true;
        this.lastGround = this.time;
        return this.tryAction(action);
      }
      if (t.move === "catch" && action === "down") {
        this.traversal = null;
        this.speed = 6;
        this.vy = -2;
        this.setMove("fall");
        return true;
      }
      if (t.move === "catch" && action === "up") {
        t.elapsed = t.duration;
        return true;
      }
      return false;
    }
    const ledge =
      action === "up"
        ? obstacles.find(
            (o) =>
              o.kind === "ledge" &&
              this.applicable(o) &&
              this.x < o.x &&
              o.x - this.x <= (this.grounded ? 1.9 : 0.8) &&
              this.y < ground(o.x, o.route === "upper") + o.height! &&
              (this.grounded ||
                this.y >= ground(o.x, o.route === "upper") + o.height! - 1.65),
          )
        : undefined;
    if (ledge) {
      this.mount(ledge);
      return true;
    }
    const top = this.grounded ? this.onObstacle() : undefined;
    if (top) {
      this.handled.add(top.index);
      if (action !== "down") this.jump(action);
      else {
        // A low feet-first exit runs off the actual edge, then falls under gravity.
        this.rollUntil =
          this.time + (top.end - this.x) / Math.max(1, this.speed) + 1.2;
        this.speed = Math.min(this.speed, Math.max(6, this.speed - 0.5));
        this.setMove("slide", 0.62);
        this.say("EDGE SLIDE · ROLL READY");
      }
      return true;
    }
    // Branch markers start before the actual face. Accept input all the way to
    // the wall, including a reachable airborne catch, rather than ending at the marker.
    const wall =
      action !== "down" && !this.upper
        ? obstacles.find(
            (o, i) =>
              o.kind === "branch" &&
              !this.handled.has(i) &&
              this.x >= o.x - timingRange(o, this.speed).far &&
              this.x <= o.x + o.width - 0.2 &&
              (this.grounded ||
                (this.y >= 0 && this.y < 3.3 && this.x >= o.x + o.width - 0.8)),
          )
        : undefined;
    if (wall) {
      if (!this.grounded && this.y >= 1.65) {
        this.handled.add(obstacles.indexOf(wall));
        this.traversal = {
          start: this.x,
          end: wall.x + wall.width + 0.7,
          y0: this.y,
          y1: 3.3,
          elapsed: 0,
          duration: 0.42,
          arc: 0,
          move: "climb",
          vault: "safety",
          contact: { x: wall.x + wall.width, y: 3.3 },
        };
        this.vy = 0;
        this.setMove("climb");
        this.say("WALL CATCH · PULL UP");
      } else {
        this.traverse(
          wall,
          wall.height ? "wall-climb" : "wall",
          3.3,
          0.8,
          this.x <= wall.x,
        );
      }
      this.upper = true;
      return true;
    }
    const signature = this.next();
    if (
      signature?.kind === "signature" &&
      this.grounded &&
      signature.x - this.x >= -0.25 &&
      signature.x - this.x <= 2.5
    ) {
      if (isSwing(signature.technique)) {
        if (action === "down") return false;
        this.jump("up");
        this.vy = signature.route === "upper" ? 8.8 : 5.5;
        this.say("JUMP → REACH FOR BAR → RIGHT TO RELEASE");
      } else this.signature(signature, true);
      return true;
    }
    if (action === "down") {
      if (!this.grounded) {
        this.rollUntil = this.time + (this.upper ? 0.25 : 0.4);
        this.say("ROLL READY");
        return true;
      }
      const slide = this.next();
      if (slide?.kind === "slide") {
        const d = slide.x - this.x,
          range = timingRange(slide, this.speed);
        if (d >= range.near && d <= range.far)
          this.timed.add(obstacles.indexOf(slide));
      }
      if (this.move !== "slide")
        this.speed = Math.min(this.speed, Math.max(10.8, this.speed - 0.7));
      this.setMove("slide", 0.62);
      return true;
    }
    if (!this.grounded && this.time - this.lastGround > COYOTE) return false;
    const o = this.next();
    const d = o ? o.x - this.x : Infinity;
    if (
      o &&
      d >= -0.1 &&
      d <= timingRange(o, this.speed).far &&
      this.grounded
    ) {
      if (o.feature === "tank") {
        if (action === "forward") this.mount(o);
        else {
          if (obstacles.indexOf(o) >= 0) this.handled.add(obstacles.indexOf(o));
          this.sideLaneStart = this.x;
          this.sideLaneEnd = o.x + o.width + 1.4;
          this.traverse(
            { ...o, width: 1.3, height: 0.85 },
            "vault",
            this.y,
            0.89,
            d >= 0.55,
            "lazy",
          );
          this.traversal!.contact!.y = this.y + 0.85;
        }
        return true;
      }
      if (o.feature === "wall-billboard") {
        this.traverse(o, "wall-run", this.y + o.height!, 0.25, true);
        this.traversal!.end = o.x + o.width + 0.8;
        this.traversal!.upper = this.upper;
        this.traversal!.contact = { x: o.x + o.width, y: this.y + o.height! };
        this.say(
          o.wallGap
            ? "GAP WALL RUN · CONTACT → CROSS → FAR ROOF"
            : "WALL RUN · DRIVE, TRANSFER, LAND",
        );
        return true;
      }
      if (
        o.feature === "window" &&
        action === "forward" &&
        this.speed >= 10.5
      ) {
        this.traverse(o, "dive", this.y, o.height! + 0.12, true);
        this.traversal!.duration *= 0.9;
        this.say("WINDOW DIVE · REACH, TUCK, ROLL");
        return true;
      }
    }
    if (action === "forward" && o?.feature) {
      this.jump(action);
      return true;
    }
    if (
      o &&
      canMantle(o) &&
      this.grounded &&
      d >= -0.1 &&
      d <= timingRange(o, this.speed).far
    ) {
      this.traverse(o, "mantle", this.y, o.height ?? 1.65, false, "safety");
      this.traversal!.contact!.y = this.y + (o.height ?? 1.65);
    } else if (
      o?.kind === "vault" &&
      d >= -0.1 &&
      d <= timingRange(o, this.speed).far &&
      this.grounded
    ) {
      const clean = d >= 0.55;
      const variant = clean ? o.vault || "speed" : "safety";
      this.traverse(o, "vault", this.y, (o.height || 1) + 0.04, clean, variant);
    } else if (
      o?.kind === "branch" &&
      d >= -0.1 &&
      d <= timingRange(o, this.speed).far &&
      this.grounded
    ) {
      this.traverse(o, o.height ? "wall-climb" : "wall", 3.3, 0.8, true);
      this.upper = true;
    } else {
      if (o?.kind === "gap") {
        const range = timingRange(o, this.speed);
        if (d >= range.near && d <= range.far)
          this.timed.add(obstacles.indexOf(o));
      }
      this.jump(action);
    }
    return true;
  }
  private land(y: number, upper = y > 2) {
    const impact = -this.vy;
    this.impact = impact;
    if (impact > 8) this.feedbackEvent("land", Math.min(1.5, impact / 16));
    this.landX = this.x;
    this.landedAt = this.time;
    this.y = y;
    this.vy = 0;
    this.grounded = true;
    this.lastGround = this.time;
    this.upper = upper;
    if (this.recovering) {
      this.moveTime = 0;
      this.rollUntil = -1;
      return;
    }
    if (impact > 14 || this.dropFrom - y > 2) {
      if (this.rollUntil >= this.time) {
        this.setMove("roll", 0.48);
        this.reward("SOFT ROLL · MOMENTUM KEPT");
      } else if (this.mode === "standard") {
        this.setMove("land", 0.38);
        this.recover("HEAVY LANDING · SWIPE DOWN BEFORE CONTACT", 4.2);
      } else {
        this.setMove("heavy-land", 0.65);
        const entrySpeed = this.speed;
        this.recover("HEAVY LANDING · SWIPE DOWN BEFORE CONTACT", 0);
        this.speed = entrySpeed * 0.35;
      }
    } else this.setMove("land", 0.12);
    this.rollUntil = -1;
  }
  private physics() {
    if (this.recovering && this.grounded) {
      if (this.moveTime < this.actionDuration) {
        // Recovery consumes real time. Inputs cannot cancel a knockdown.
        if (this.move === "heavy-land")
          this.speed = Math.max(0, this.speed - STEP * 8);
        return;
      }
      this.setMove("run");
    }
    const oldX = this.x,
      oldY = this.y;
    const target =
      this.move === "stumble"
        ? 7
        : this.move === "land" && this.impact > 14 && this.moveTime < 0.24
          ? 6
          : RUN_SPEED + Math.min(1.5, this.flow * 0.12);
    // Takeoff carries earned horizontal momentum. Gravity changes vertical
    // velocity; being airborne must never restore lost running speed.
    this.speed +=
      this.move === "slide"
        ? -Math.min(Math.max(0, this.speed - 10.8), STEP * 1.9)
        : this.grounded
          ? clamp(target - this.speed, -STEP * 5, STEP * RUN_ACCELERATION)
          : -Math.min(this.speed, STEP * 0.12);

    this.x += this.speed * STEP;
    if (!this.grounded) {
      this.vy -= GRAVITY * (this.vy < 0 ? 1.18 : 1) * STEP;
      this.y += this.vy * STEP;
    }
    const roofRamp = !this.upper
      ? surfaces.find(
          (s) =>
            !s.upper &&
            s.endY !== undefined &&
            ((this.x >= s.start && this.x < s.end) ||
              (oldX >= s.start && oldX < s.end)),
        )
      : undefined;
    let rampSupport = false;
    if (roofRamp) {
      const before = surfaceHeight(roofRamp, oldX),
        after = surfaceHeight(roofRamp, this.x);
      if (this.grounded && Math.abs(oldY - before) < 0.04) {
        this.y = after;
        rampSupport = true;
      } else if (
        !this.grounded &&
        this.vy <= 0 &&
        oldY >= before &&
        this.y <= after
      ) {
        this.land(after, false);
        rampSupport = true;
      }
    }
    const ramp = ramps.find(
      (o) => this.applicable(o) && this.x >= o.x && this.x < o.x + o.width,
    );
    if (ramp) {
      const before = rampHeight(ramp, oldX),
        after = rampHeight(ramp, this.x);
      if (this.grounded && Math.abs(oldY - before) < 0.04) {
        this.y = after;
        if (ramp.feature === "side-ramp") {
          if (this.move !== "slide") {
            this.setMove("slide", 0.62);
            this.say("SIDE RAMP · SLIDE DOWN → JUMP AT THE AMBER EDGE");
          }
          this.sideLaneStart = ramp.x;
          this.sideLaneEnd = ramp.x + ramp.width + 8.4;
        }
        // Gravity adds downhill momentum; uphill ramps still cost speed.
        this.speed = Math.max(
          0,
          Math.min(
            16,
            this.speed -
              GRAVITY *
                (ramp.height! / ramp.width) *
                (ramp.feature === "side-ramp" ? 3 : 0.6) *
                STEP,
          ),
        );
        rampSupport = true;
      } else if (
        !this.grounded &&
        this.vy <= 0 &&
        oldY >= before &&
        this.y <= after
      ) {
        this.land(after, ramp.route === "upper");
        rampSupport = true;
      }
    }
    const routeSupports = supportSurfaces[this.upper ? "upper" : "lower"];
    const supports =
      ramp?.feature === "side-ramp"
        ? routeSupports.filter((s) => s.y !== 0)
        : routeSupports;
    const support =
      rampSupport ||
      supports.find(
        (s) =>
          this.x >= s.start &&
          this.x < s.end &&
          Math.abs(surfaceHeight(s, this.x) - this.y) < 0.025,
      );
    if (this.grounded && !support) {
      if (this.move === "slide") this.slideExitAt = this.time;
      this.launchX = oldX;
      this.launchY = this.y;
      this.grounded = false;
      this.dropFrom = this.y;
      this.vy = 0;
      this.setMove("fall");
    }
    // A bar can only be caught by an airborne runner within hand reach.
    if (!this.grounded && this.time - this.jumpIntent < 0.65) {
      const bar = obstacles.find(
        (o, i) =>
          isSwing(o.technique) &&
          this.applicable(o) &&
          !this.handled.has(i) &&
          Math.abs(this.x - (o.x + swingGripOffset(o.width))) < 0.6 &&
          Math.abs(
            this.y - (ground(o.x, o.route === "upper") + (o.height ?? 3) - 1.8),
          ) < 0.65,
      );
      if (bar) {
        this.signature(bar, true);
        const t = this.traversal!,
          base = bar.route === "upper" ? 3.3 : 0;
        t.y0 = base;
        t.y1 = base;
        t.contact = {
          x: bar.x + swingGripOffset(bar.width),
          y: base + bar.height!,
        };
        t.duration = SWING_DURATION;
        t.catchX = this.x;
        t.catchY = this.y;
        this.say("BAR CAUGHT · RIGHT TO RELEASE");
        return;
      }
    }
    // The upper route is a real slab: an early jump underneath hits its underside.
    if (!this.grounded && this.vy > 0) {
      const ceiling = surfaces.find(
        (s) =>
          s.upper &&
          this.x >= s.start &&
          this.x <= s.end &&
          oldY + 1.85 <= s.y - 0.9 &&
          this.y + 1.85 >= s.y - 0.9,
      );
      if (ceiling) {
        this.y = ceiling.y - 0.9 - 1.85;
        this.vy = 0;
        this.setMove("fall");
      }
    }
    if (!this.grounded && this.vy <= 0) {
      const landing = supports
        .filter(
          (s) =>
            this.x >= s.start &&
            this.x < s.end &&
            oldY >= surfaceHeight(s, oldX) &&
            this.y <= surfaceHeight(s, this.x),
        )
        .sort(
          (a, b) =>
            surfaceHeight(b, this.x) - surfaceHeight(a, this.x) ||
            Number(a.upper !== this.upper) - Number(b.upper !== this.upper),
        )[0];
      if (landing) {
        this.land(surfaceHeight(landing, this.x), landing.upper);
        if ("index" in landing) this.handled.add(Number(landing.index));
      } else if (
        this.time -
          (this.mode === "hardcore" ? this.ledgeIntent : this.jumpIntent) <
        0.18
      ) {
        const lip = supports.find(
          (s) =>
            oldX < s.start &&
            this.x + 0.3 >= s.start &&
            this.y < s.y &&
            this.y > s.y - 1.6,
        );
        if (lip) {
          this.ledgeIntent = -1;
          this.buffered = null;
          this.x = lip.start - 0.35;
          this.y = lip.y - 1.65;
          this.vy = 0;
          this.traversal = {
            start: this.x,
            end: this.x,
            y0: this.y,
            y1: this.y,
            duration: 0.24,
            elapsed: 0,
            arc: 0,
            move: "catch",
            contact: { x: lip.start, y: lip.y },
            vault: "safety",
            upper: lip.upper,
          };
          this.setMove("catch");
          this.recover("LEDGE SAVE · CLIMB", 3);
        }
      }
    }
    if (!this.grounded && !this.traversal) {
      const wall = surfaces.find(
        (s) =>
          oldX < s.start &&
          this.x + 0.22 >= s.start &&
          this.y < s.y - 0.1 &&
          (!s.upper ? this.y > s.y - 14 : this.y + 1.85 > s.y - 0.9),
      );
      if (wall) {
        this.x = wall.start - 0.23;
        this.speed = 0;
      }
    }
    // Thin service decks can be crossed underneath, but not through their fascia.
    for (const deck of obstacles) {
      if (deck.kind !== "ledge" || !this.applicable(deck)) continue;
      const bodyHeight =
        this.move === "slide" || this.move === "roll" ? 0.85 : 1.85;
      const top = ground(deck.x, deck.route === "upper") + deck.height!;
      if (
        this.x + 0.22 < deck.x ||
        this.x - 0.22 > deck.x + deck.width ||
        this.y >= top - 0.025
      )
        continue;
      if (
        this.vy > 0 &&
        oldY + bodyHeight <= top - 0.18 &&
        this.y + bodyHeight >= top - 0.18
      ) {
        this.y = top - 0.18 - bodyHeight;
        this.vy = 0;
        this.setMove("fall");
      } else if (oldX < deck.x && this.y + bodyHeight > top - 0.18) {
        this.x = deck.x - 0.23;
        this.speed = Math.min(this.speed, 3);
      }
    }
    for (const glass of glassObstacles) {
      if (
        !this.applicable(glass) ||
        this.x + 0.22 < glass.x ||
        oldX - 0.22 > glass.x + glass.width
      )
        continue;
      const top = (glass.route === "upper" ? 3.3 : 0) + glass.height!;
      const underside =
        (glass.route === "upper" ? 3.3 : 0) + (glass.openingTop ?? 0);
      const bodyHeight =
        this.move === "slide" || this.move === "roll" ? 0.85 : 1.85;
      if (this.y < top && this.y + bodyHeight > underside) {
        // A missed upper line must leave a recoverable lower route. Glass is
        // never footing: return to the entry face, fall, then slide underneath.
        this.x = glass.x - 0.23;
        this.vy = Math.min(0, this.vy);
        this.speed = Math.min(this.speed, 4.2);
        const index = obstacles.indexOf(glass);
        if (!this.headerHits.has(index)) {
          this.headerHits.add(index);
          this.recover("FRAME CONTACT · LAND THEN ↓ SLIDE UNDER", 2);
        }
        if (!this.grounded) this.setMove("fall");
      }
    }
    for (const header of billboardHeaders) {
      if (
        header.upper !== this.upper ||
        this.x + 0.22 < header.start ||
        oldX - 0.22 > header.end
      )
        continue;
      const underside = header.y - 0.55;
      const bodyHeight =
        this.move === "slide" || this.move === "roll" ? 0.85 : 1.85;
      if (this.y + bodyHeight > underside && this.y < header.y) {
        if (
          oldY + bodyHeight <= underside ||
          (oldX >= header.start && oldX <= header.end)
        ) {
          this.y = underside - bodyHeight;
          this.vy = Math.min(0, this.vy);
          this.setMove("fall");
        } else {
          this.x = Math.min(this.x, header.start - 0.23);
          this.speed = 0;
          this.vy = Math.min(0, this.vy);
        }
        if (!this.headerHits.has(header.index)) {
          this.headerHits.add(header.index);
          this.recover("FRAME CONTACT · KEEP THE JUMP LOW", 3);
        }
      }
    }
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (this.recovering || this.handled.has(i) || !this.applicable(o))
        continue;
      const base = ground(o.x, o.route === "upper");
      const height =
        this.move === "slide" || this.move === "roll" ? 0.85 : 1.85;
      const overlaps = this.x + 0.22 >= o.x && oldX - 0.22 <= o.x + o.width;
      if (
        overlaps &&
        o.kind === "signature" &&
        !isSwing(o.technique) &&
        this.grounded
      ) {
        this.signature(o, false);
        break;
      }
      if (
        overlaps &&
        o.kind === "vault" &&
        this.y < base + (o.height || 1) &&
        this.y + height > base
      ) {
        if (this.mode === "hardcore") {
          this.crash(o, false);
          break;
        }
        this.handled.add(i);
        this.recover("BARRIER CONTACT · SPEED LOST", 4);
        this.traversal = {
          start: this.x,
          end: o.x + o.width + 0.7,
          y0: this.y,
          y1: base,
          duration: Math.max(0.85, (o.width + 1.2) / 5.5),
          elapsed: 0,
          arc: (o.height || 1) + 0.25,
          move: "vault",
          contact: { x: o.x + 0.3, y: base + (o.height || 1) },
          vault: "safety",
        };
        this.vault = "safety";
        this.grounded = false;
        this.vy = 0;
        this.setMove("vault");
      } else if (
        overlaps &&
        o.kind === "slide" &&
        this.y + height > base + 1.22 &&
        this.y < base + (o.height ?? 2.35)
      ) {
        if (this.mode === "hardcore") {
          this.crash(o, true);
          break;
        }
        this.handled.add(i);
        this.recover("DUCT CONTACT · GET LOW", 4);
        this.setMove("stumble", 0.55);
        this.y = base;
        this.vy = 0;
        this.grounded = true;
      } else if (this.x > o.x + o.width + 0.25) {
        this.handled.add(i);
        if ((o.kind === "gap" || o.kind === "slide") && this.timed.has(i))
          this.reward(
            o.kind === "gap" ? "CLEAR · KEEP THE FLOW" : "LOW LINE · FLOW",
          );
      }
    }
    if (
      this.move === "slide" ||
      this.move === "roll" ||
      this.move === "stumble"
    ) {
      const ceiling = obstacles.some(
        (o) =>
          (o.kind === "slide" ||
            o.kind === "ledge" ||
            (o.kind === "glass" && Boolean(o.openingTop))) &&
          this.applicable(o) &&
          this.x + 0.3 >= o.x &&
          this.x - 0.3 <= o.x + o.width &&
          this.y < ground(o.x, o.route === "upper") + 1.22,
      );
      // A landing roll already supplies the low posture. Never stand up into
      // a ceiling and demand another down input to finish the same passage.
      if (
        this.move === "roll" &&
        this.moveTime > this.actionDuration &&
        ceiling
      )
        this.setMove("slide", 0.1);
      if (
        this.moveTime > this.actionDuration &&
        !ceiling &&
        !(rampSupport && ramp?.feature === "side-ramp")
      ) {
        this.slideExitAt = this.time;
        this.setMove(this.grounded ? "run" : "fall");
      }
    } else if (this.move === "land" && this.moveTime > this.actionDuration)
      this.setMove("run");
    if (!this.grounded && this.vy < 0 && this.move === "jump")
      this.move = "fall";
    if (this.grounded) this.lastGround = this.time;
    if (this.y < -7.5) {
      this.phase = "failed";
      this.say("MISSED THE ROOF · R TO RETRY");
    }
  }
  step() {
    if (this.phase !== "running" || this.paused) return;
    this.previous = this.frame();
    this.ticks++;
    this.time = this.ticks * STEP;
    this.moveTime += STEP;
    for (const action of this.pending) {
      this.inputs.push({ tick: this.ticks, action });
      if (action === "up" || action === "forward") this.jumpIntent = this.time;
      if (action === "up") this.ledgeIntent = this.time;
      this.buffered = { action, until: this.time + BUFFER };
      if (this.tryAction(action)) this.buffered = null;
    }
    this.pending = [];
    if (this.buffered) {
      if (this.buffered.until < this.time) this.buffered = null;
      else if (this.tryAction(this.buffered.action)) this.buffered = null;
    }
    if (this.traversal) {
      const t = this.traversal;
      const previousY = this.y;
      t.elapsed += STEP * (t.released ? 1.35 : 1);
      const p = clamp(t.elapsed / t.duration, 0, 1);
      // Preserve traversal duration while easing over hand contact and accelerating out.
      const travel =
        t.move === "vault"
          ? p +
            (t.vault === "kong"
              ? 0.045 * Math.sin(4 * Math.PI * p)
              : 0.065 * Math.sin(2 * Math.PI * p))
          : p;
      this.x = t.start + (t.end - t.start) * travel;
      // Quick rise, supported contact, then an extended exit: feet clear the actual obstacle.
      const lift = Math.sin(Math.PI * Math.pow(p, 0.78));
      this.y = t.y0 + (t.y1 - t.y0) * p + lift * t.arc;
      if (
        (t.move === "vault" || t.move === "mantle" || t.move === "dive") &&
        t.obstacle
      ) {
        const rise = clamp(
          (this.x - t.start) / Math.max(0.1, t.obstacle.start - 0.25 - t.start),
          0,
          1,
        );
        const release = clamp(
          (t.end - this.x) / Math.max(0.1, t.end - t.obstacle.end - 0.3),
          0,
          1,
        );
        // Keep the Kong's leg load on the roof, then extend into the dive.
        // The leading edge still reaches full clearance before the barrier.
        const launch =
          t.vault === "kong" ? clamp((rise - 0.42) / 0.58, 0, 1) : rise;
        const ascent =
          t.vault === "kong" ? launch * launch * (3 - 2 * launch) : launch;
        this.y =
          t.y0 + t.arc * Math.sin((Math.PI / 2) * Math.min(ascent, release));
      }
      if (t.move === "vault" && t.vault === "kong") {
        const push = clamp((p - 0.48) / 0.52, 0, 1);
        this.y += Math.sin(Math.PI * push) * 0.36;
        if (p >= 0.5 && !t.pushed) {
          t.pushed = true;
          this.speed = Math.min(14, this.speed + 0.3);
        }
      }
      if (t.move === "mantle" && t.obstacle) {
        const ease = (value: number) => {
          const u = clamp(value, 0, 1);
          return u * u * (3 - 2 * u);
        };
        const gripX = Math.max(t.start, t.obstacle.start - 0.5);
        // Approach the lip, raise the body on planted hands, then step across.
        // Keeping x at the lip during the lift avoids floating diagonally into it.
        if (p < 0.23) {
          this.x = t.start + (gripX - t.start) * ease(p / 0.23);
          this.y = t.y0;
        } else if (p < 0.48) {
          this.x = gripX;
          this.y = t.y0 + t.arc * ease((p - 0.23) / 0.25);
        } else if (p < 0.7) {
          this.x =
            gripX + (t.obstacle.end - 0.05 - gripX) * ease((p - 0.48) / 0.22);
          this.y = t.y0 + t.arc;
        } else {
          const release = ease((p - 0.7) / 0.3);
          this.x =
            t.obstacle.end - 0.05 + (t.end - t.obstacle.end + 0.05) * release;
          this.y = t.y0 + t.arc * (1 - release);
        }
      }
      if (t.move === "wall-run") {
        const rise = clamp(p / 0.26, 0, 1);
        const kick = clamp((p - 0.68) / 0.32, 0, 1);
        this.y = t.y0 + (t.y1 - t.y0) * rise + Math.sin(Math.PI * kick) * 0.35;
      }
      if (t.move === "wall")
        this.y =
          t.y0 +
          (t.y1 - t.y0) * Math.min(1, p / 0.78) +
          Math.sin(Math.PI * p) * t.arc;
      if (t.move === "climb") {
        const lift = clamp(p / 0.72, 0, 1);
        const over = clamp((p - 0.72) / 0.28, 0, 1);
        this.y = t.y0 + (t.y1 - t.y0) * lift * lift * (3 - 2 * lift);
        this.x = t.start + (t.end - t.start) * over * over * (3 - 2 * over);
      }
      if (t.move === "wall-climb" && t.contact) {
        const ease = (v: number) => {
          const u = clamp(v, 0, 1);
          return u * u * (3 - 2 * u);
        };
        const face = t.contact.x,
          lip = t.contact.y,
          gripX = Math.max(t.start, face - 0.55),
          gripY = Math.min(lip - 1.65, t.y0 + 0.35);
        if (p < 0.35) {
          const u = ease(p / 0.35);
          this.x = t.start + (gripX - t.start) * u;
          this.y = t.y0 + (gripY - t.y0) * u;
        } else if (p < 0.52) {
          this.x = gripX;
          this.y = gripY + (lip - 1.65 - gripY) * ease((p - 0.35) / 0.17);
        } else if (p < 0.62) {
          this.x = gripX;
          this.y = lip - 1.65 - 0.06 * Math.sin((Math.PI * (p - 0.52)) / 0.1);
        } else if (p < 0.82) {
          this.x = gripX;
          this.y = lip - 1.65 + 1.1 * ease((p - 0.62) / 0.2);
        } else {
          this.x = gripX + (t.end - gripX) * ease((p - 0.82) / 0.18);
          this.y = lip - 0.55 + 0.55 * ease((p - 0.82) / 0.1);
        }
      }
      if (t.move === "special" && t.contact) {
        const smooth = (v: number) => {
          const u = clamp(v, 0, 1);
          return u * u * (3 - 2 * u);
        };
        if (isSwing(t.technique) || t.technique === "shimmy") {
          const swing = clamp((p - 0.2) / 0.55, 0, 1);
          const angle = -0.55 + swing * 1.1;
          const cx =
            t.contact.x +
            (t.technique === "monkey" || t.technique === "shimmy"
              ? (swing - 0.5) * 1.2
              : 0);
          const sx = cx + Math.sin(angle) * 0.9,
            sy = Math.max(
              t.y0,
              t.contact.y - 1.8 + (1 - Math.cos(angle)) * 0.9,
            );
          if (p < 0.2) {
            this.x = t.start + (sx - t.start) * smooth(p / 0.2);
            this.y = t.y0 + (sy - t.y0) * smooth(p / 0.2);
          } else if (p < 0.75) {
            this.x = sx;
            this.y = sy;
          } else {
            const u = smooth((p - 0.75) / 0.25);
            this.x = sx + (t.end - sx) * u;
            this.y = sy + (t.y1 - sy) * u;
          }
          if (t.technique === "shimmy")
            t.contact.x =
              t.obstacle!.start + (t.obstacle!.end - t.obstacle!.start) / 2;
        } else if (t.technique === "tic-tac" || t.technique === "rebound") {
          this.y = t.y0 + 0.35 * Math.sin(Math.PI * p);
        } else if (t.technique === "duck" || t.technique === "squeeze") {
          this.y = t.y0;
        } else if (t.technique === "double-kong") {
          this.y =
            t.y0 +
            t.arc * Math.sin(Math.PI * Math.min(1, p / 0.85)) +
            0.25 * Math.abs(Math.sin(2 * Math.PI * p));
          t.contact.x =
            t.obstacle!.start +
            (t.obstacle!.end - t.obstacle!.start) *
              (0.25 + 0.5 * smooth((p - 0.4) / 0.2));
        } else if (
          t.technique === "canopy" ||
          t.technique === "palm-drop" ||
          t.technique === "drop-through"
        ) {
          this.y =
            t.y0 +
            t.arc * (p < 0.3 ? smooth(p / 0.3) : 1 - smooth((p - 0.3) / 0.7));
        } else {
          this.y = t.y0 + t.arc * Math.sin(Math.PI * p);
        }
      }
      if (
        t.move === "special" &&
        t.obstacle &&
        ["double-kong", "precision", "reverse", "transfer", "stride"].includes(
          t.technique ?? "",
        )
      ) {
        const rise = clamp(
          (this.x - t.start) / Math.max(0.1, t.obstacle.start - 0.25 - t.start),
          0,
          1,
        );
        const exit = clamp(
          (t.end - this.x) / Math.max(0.1, t.end - t.obstacle.end - 0.25),
          0,
          1,
        );
        this.y = t.y0 + t.arc * Math.sin((Math.PI / 2) * Math.min(rise, exit));
      }
      if (t.move === "special" && isSwing(t.technique) && t.contact) {
        const angle = -0.5 + p * 1.3;
        const sx = t.contact.x + Math.sin(angle) * 1.8,
          sy = t.contact.y - Math.cos(angle) * 1.8;
        const blend = clamp(p / 0.15, 0, 1);
        this.x = (t.catchX ?? sx) + (sx - (t.catchX ?? sx)) * blend;
        this.y = (t.catchY ?? sy) + (sy - (t.catchY ?? sy)) * blend;
      }
      this.vy = (this.y - previousY) / STEP;
      if (p === 1) {
        if (t.move === "special" && isSwing(t.technique)) {
          this.tryAction("forward");
        } else if (t.move === "catch" && t.contact) {
          this.traversal = {
            ...t,
            start: this.x,
            end: t.contact.x + 0.7,
            y0: this.y,
            y1: t.contact.y,
            elapsed: 0,
            duration: 0.42,
            move: "climb",
          };
          this.setMove("climb");
        } else {
          if (t.move === "wall-climb") this.speed *= 0.9;
          if (t.technique === "tic-tac")
            this.speed = Math.max(this.speed, Math.min(16, this.speed + 1.2));
          this.traversal = null;
          this.impact = t.move === "vault" ? 7 : 5;
          this.landX = this.x;
          this.landedAt = this.time;
          this.y = t.y1;
          this.grounded = true;
          this.lastGround = this.time;
          this.upper = t.upper ?? this.y > 2;
          this.vy = 0;
          this.setMove(
            t.move === "dive"
              ? "roll"
              : this.mode === "hardcore" &&
                  t.move === "vault" &&
                  t.vault === "safety"
                ? "stumble"
                : "land",
            t.move === "dive"
              ? 0.4
              : this.mode === "hardcore" &&
                  t.move === "vault" &&
                  t.vault === "safety"
                ? 0.35
                : 0.09,
          );
        }
      }
    } else this.physics();
    this.x = Math.min(this.x, FINISH);
    for (const boundary of [SECTOR, SECTOR * 2, FINISH]) {
      const index = boundary / SECTOR - 1;
      if (
        boundary > this.startSector * SECTOR &&
        this.x >= boundary &&
        this.splits[index] === undefined
      )
        this.splits[index] = this.time;
    }
    if (this.ticks % 6 === 0 || this.x >= FINISH)
      this.samples.push({ time: this.time, frame: this.frame() });
    if (this.x >= FINISH) {
      this.phase = "finished";
      this.onChange();
    }
    if (this.ticks % 6 === 0) this.onChange();
  }
  frame(): Frame {
    const next = this.grounded && this.move === "run" ? this.next() : undefined;
    const anticipate =
      next &&
      (next.kind === "gap" ||
        next.kind === "branch" ||
        next.landmark ||
        next.wallGap)
        ? clamp(1 - (next.x - this.x) / 7, 0, 1)
        : 0;
    return {
      ...(this.transitionPose && this.moveTime < this.transitionDuration
        ? {
            transitionPose: this.transitionPose,
            transitionDuration: this.transitionDuration,
          }
        : {}),
      anticipation: anticipate,
      x: this.x,
      y: this.y,
      speed: this.speed,
      vy: this.vy,
      move: this.move,
      moveTime: this.moveTime,
      chain: this.flow,
      progress: this.traversal
        ? clamp(this.traversal.elapsed / this.traversal.duration, 0, 1)
        : this.actionDuration
          ? clamp(this.moveTime / this.actionDuration, 0, 1)
          : 0,
      grounded: this.grounded,
      vault: this.traversal?.vault || this.vault,
      contact: this.traversal?.contact || null,
      launchX: this.launchX,
      launchY: this.launchY,
      landX: this.landX,
      impact: this.impact,
      landingAge: Math.min(1, this.time - (this.landedAt ?? -10)),
      slideExitAge: Math.min(1, this.time - this.slideExitAt),
      lead: this.lead,
      longJump: this.longJump,
      slope: this.grounded ? this.slope() : 0,
      ...(this.traversal?.technique
        ? { technique: this.traversal.technique }
        : {}),
      side: this.traversal?.side ?? 1,
      lane:
        this.traversal?.technique &&
        ["tic-tac", "rebound"].includes(this.traversal.technique)
          ? 0.55 -
            1.05 *
              Math.sin(
                (Math.PI * this.traversal.elapsed) / this.traversal.duration,
              )
          : this.x >= this.sideLaneStart && this.x < this.sideLaneEnd
            ? 0.55 +
              (sideRamps.some((r) => r.x === this.sideLaneStart) ? 2.35 : 1.5) *
                Math.min(
                  1,
                  (this.x - this.sideLaneStart) / 0.7,
                  (this.sideLaneEnd - this.x) /
                    (sideRamps.some((r) => r.x === this.sideLaneStart)
                      ? 8.4
                      : 0.7),
                )
            : this.move === "wall-run"
              ? 0.55 -
                0.9 *
                  Math.sin(
                    Math.PI *
                      Math.min(
                        1,
                        (this.traversal?.elapsed ?? 0) /
                          Math.max(0.01, this.traversal?.duration ?? 1),
                      ),
                  )
              : 0.55,
    };
  }
  private slope() {
    const roofRamp = !this.upper
      ? surfaces.find(
          (s) =>
            !s.upper &&
            s.endY !== undefined &&
            this.x >= s.start &&
            this.x < s.end,
        )
      : undefined;
    if (roofRamp && Math.abs(this.y - surfaceHeight(roofRamp, this.x)) < 0.04)
      return (roofRamp.endY! - roofRamp.y) / (roofRamp.end - roofRamp.start);
    const ramp = ramps.find(
      (o) => this.applicable(o) && this.x >= o.x && this.x < o.x + o.width,
    );
    return ramp && Math.abs(this.y - rampHeight(ramp, this.x)) < 0.04
      ? ramp.height! / ramp.width
      : 0;
  }
  record(): RecordRun {
    return {
      version: VERSION,
      mode: this.mode,
      time: this.time,
      splits: [...this.splits],
      samples: [...this.samples],
      inputs: [...this.inputs],
    };
  }
}
export class Swipe {
  x = 0;
  y = 0;
  active = false;
  constructor(public threshold = 18) {}
  start(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.active = true;
  }
  move(x: number, y: number): Action | null {
    if (!this.active) return null;
    const dx = x - this.x,
      dy = y - this.y;
    if (Math.hypot(dx, dy) < this.threshold) return null;
    if (Math.abs(dy) < Math.abs(dx) * 1.05) {
      if (dx > this.threshold && Math.abs(dx) > Math.abs(dy) * 1.3) {
        this.active = false;
        return "forward";
      }
      return null;
    }
    this.active = false;
    return dy < 0 ? "up" : "down";
  }
}
