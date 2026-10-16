export const STEP = 1 / 120;
export const SECTOR = 1000;
export const FINISH = SECTOR * 3;
export const VERSION = "sunset-relay-v6";
export const RUN_SPEED = 12;
export const RUN_ACCELERATION = 3;
export const LONG_JUMP_SPEED = 11.5;
export const GRAVITY = 30;
export const JUMP_SPEED = 12.4;
export const BUFFER = 0.12;
export const COYOTE = 0.09;
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
  | "stumble"
  | "mantle";
export type Vault =
  | "step"
  | "hurdle"
  | "speed"
  | "one-hand"
  | "safety"
  | "lazy"
  | "kong"
  | "step-leap";
export type Obstacle = {
  x: number;
  width: number;
  height?: number;
  kind: "vault" | "gap" | "slide" | "branch" | "drop";
  route?: "upper" | "lower";
  vault?: Vault;
};
const opening: Obstacle[] = [
  { x: 27, width: 0.7, height: 0.5, kind: "vault", vault: "step" },
  { x: 46, width: 0.9, height: 0.8, kind: "vault", vault: "hurdle" },
  { x: 67, width: 6.2, kind: "gap" },
  { x: 91, width: 5.5, kind: "slide" },
  { x: 115, width: 5, height: 3.3, kind: "branch" },
  {
    x: 139,
    width: 1.5,
    height: 1.05,
    kind: "vault",
    vault: "speed",
    route: "lower",
  },
  { x: 153, width: 6, kind: "slide", route: "lower" },
  { x: 148, width: 6.5, kind: "gap", route: "upper" },
  {
    x: 176,
    width: 1.5,
    height: 1.1,
    kind: "vault",
    vault: "one-hand",
    route: "upper",
  },
  { x: 195, width: 9, kind: "drop", route: "upper" },
  { x: 217, width: 1.6, height: 1.15, kind: "vault", vault: "lazy" },
  { x: 240, width: 7, kind: "gap" },
  { x: 267, width: 6, kind: "slide" },
  { x: 290, width: 5, kind: "branch" },
  {
    x: 312,
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
    width: 2.6,
    height: 1.2,
    kind: "vault",
    vault: "step-leap",
    route: "upper",
  },
  { x: 375, width: 9, kind: "drop", route: "upper" },
  { x: 402, width: 1.1, height: 1.35, kind: "vault", vault: "safety" },
  { x: 424, width: 0.9, height: 0.85, kind: "vault", vault: "speed" },
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
  "step",
  "hurdle",
  "speed",
  "one-hand",
  "safety",
  "lazy",
  "kong",
  "step-leap",
];
for (let i = 0; i < 48; i++) {
  const x = 512 + i * 19;
  for (const route of ["lower", "upper"] as const) {
    const n = route === "upper" ? i : i + 2;
    circuit.push(
      // Wide Kong lines reward the harder climb with less slide friction.
      n % 6 === 5 && route === "upper"
        ? { x, width: 4.2, height: 1.1, kind: "vault", vault: "kong", route }
        : n % 6 === 4 && route === "upper"
          ? { x, width: route === "upper" ? 6.8 : 5.8, kind: "gap", route }
          : n % 6 === 5 || (n % 6 === 4 && route === "lower")
            ? { x, width: 4.2, kind: "slide", route }
            : {
                x,
                width: variants[n % 8] === "kong" ? 2.5 : 1.1,
                height: 0.7 + (n % 3) * 0.2,
                kind: "vault",
                vault: variants[n % 8],
                route,
              },
    );
  }
}
const districts = [1480, 1960, 2440];
const courseAnchors: Obstacle[] = [
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
    if (previous.kind === "drop") continue;
    const clearance =
      previous.kind === "gap" ? 5.5 : previous.kind === "branch" ? 8 : 2.8;
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
                route === "lower" ? "one-hand" : n % 2 ? "hurdle" : "speed",
              route,
            },
      );
      x += route === "upper" ? 5.8 : 7;
      n++;
    }
  }
  return additions.filter(
    (o) =>
      route !== "lower" ||
      !upperPlatforms.some((p) => o.x >= p.end - 2 && o.x < p.end + 15),
  );
}
export const obstacles: Obstacle[] = [
  ...courseAnchors,
  ...denseLane(0, FINISH, "lower"),
  ...upperPlatforms.flatMap((p) => denseLane(p.start - 6, p.end, "upper")),
].sort((a, b) => a.x - b.x);

export function canMantle(o: Obstacle) {
  return (
    o.kind === "slide" &&
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
export type Surface = { start: number; end: number; y: number };
function cut(start: number, end: number, y: number, upper: boolean): Surface[] {
  const result: Surface[] = [];
  let cursor = start;
  for (const o of obstacles.filter(
    (item) =>
      item.kind === "gap" &&
      (upper ? item.route === "upper" : item.route !== "upper") &&
      item.x >= start &&
      item.x < end,
  )) {
    result.push({ start: cursor, end: o.x, y });
    cursor = o.x + o.width;
  }
  result.push({ start: cursor, end, y });
  return result;
}
export const surfaces: Surface[] = [
  ...cut(-30, FINISH + 25, 0, false),
  ...upperPlatforms.flatMap((p) => cut(p.start, p.end, 3.3, true)),
];
export function ground(x: number, upper: boolean) {
  return upper && upperPlatforms.some((p) => x >= p.start && x <= p.end)
    ? 3.3
    : 0;
}
export type Contact = { x: number; y: number };
export type Frame = {
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
};
export type Sample = { time: number; frame: Frame };
export type Input = { tick: number; action: Action };
export type RecordRun = {
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
  "stumble",
  "mantle",
];
const vaults: Vault[] = [
  "step",
  "hurdle",
  "speed",
  "one-hand",
  "safety",
  "lazy",
  "kong",
  "step-leap",
];
export function readRecord(raw: string | null): RecordRun | null {
  try {
    const r = JSON.parse(raw || "null") as RecordRun;
    if (
      !r ||
      r.version !== VERSION ||
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
          f.speed <= 25 &&
          f.progress >= 0 &&
          f.progress <= 1 &&
          typeof f.grounded === "boolean" &&
          (f.longJump === undefined || typeof f.longJump === "boolean") &&
          [
            f.launchX,
            f.launchY,
            f.landX,
            f.impact,
            f.landingAge,
            f.slideExitAge,
            f.lead,
          ].every((value) => value === undefined || Number.isFinite(value)) &&
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
};
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
export class Run {
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
  vault: Vault = "speed";
  paused = false;
  eligible = true;
  practice = false;
  startSector = 0;
  clean = 0;
  recoveries = 0;
  flow = 0;
  bestFlow = 0;
  splits: number[] = [];
  samples: Sample[] = [];
  inputs: Input[] = [];
  handled = new Set<number>();
  private timed = new Set<number>();
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
  private actionDuration = 0;
  private dropFrom = 0;
  private launchX = 0;
  private launchY = 0;
  private landX = 0;
  private impact = 0;
  private landedAt = -10;
  private lead = 0;
  private longJump = false;
  start(sector = 0, practice = false) {
    this.phase = "running";
    this.startSector = sector;
    this.x = sector * SECTOR;
    this.y = 0;
    this.time = 0;
    this.ticks = 0;
    this.speed = 7.5;
    this.vy = 0;
    this.upper = false;
    this.grounded = true;
    this.move = "run";
    this.moveTime = 0;
    this.paused = false;
    this.eligible = !practice;
    this.practice = practice;
    this.clean = 0;
    this.recoveries = 0;
    this.flow = 0;
    this.bestFlow = 0;
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
    this.actionDuration = 0;
    this.dropFrom = 0;
    this.launchX = this.x;
    this.launchY = 0;
    this.landX = this.x;
    this.impact = 0;
    this.landedAt = -10;
    this.lead = 0;
    this.longJump = false;
    this.timed.clear();
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
    this.move = move;
    this.moveTime = 0;
    this.actionDuration = duration;
  }
  private reward(label: string) {
    this.clean++;
    this.flow++;
    this.bestFlow = Math.max(this.bestFlow, this.flow);
    if (this.grounded) this.speed = Math.min(14, this.speed + 0.35);
    this.say(label);
  }
  private recover(label: string, cost = 2.8) {
    this.recoveries++;
    this.flow = 0;
    this.speed = Math.max(5.5, this.speed - cost);
    this.say(label);
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
    this.handled.add(obstacles.indexOf(o));
    const wall = move === "wall" || move === "wall-climb";
    const end = o.x + o.width + (wall ? 0.75 : 1.4);
    const contact = {
      x: o.x + Math.min(o.width * 0.4, 0.7),
      y: (o.route === "upper" ? 3.3 : 0) + (o.height || 1.1),
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
    else this.recover("SAFETY VAULT · KEEP MOVING", 1.6);
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
      obstacle: { start: o.x, end: o.x + o.width },
    };
    if (move === "mantle") this.traversal.duration += 0.75;
    if (move === "wall-climb")
      this.traversal.duration += 0.62 + Math.max(0, 11.5 - this.speed) * 0.09;
    this.vault = vault;
    this.grounded = false;
    this.vy = 0;
    this.setMove(move);
  }
  private tryAction(action: Action): boolean {
    const t = this.traversal;
    if (t) {
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
      canMantle(o) &&
      this.grounded &&
      d >= -0.1 &&
      d <= timingRange(o, this.speed).far
    ) {
      this.traverse(
        o,
        "mantle",
        this.y,
        (o.height ?? 1.65) + 0.12,
        false,
        "safety",
      );
      this.traversal!.contact!.y = this.y + (o.height ?? 1.65);
    } else if (
      o?.kind === "vault" &&
      d >= -0.1 &&
      d <= timingRange(o, this.speed).far &&
      this.grounded
    ) {
      const clean = d >= 0.55;
      const variant = clean ? o.vault || "speed" : "safety";
      this.traverse(
        o,
        "vault",
        this.y,
        (o.height || 1) + (variant === "step-leap" ? 0.7 : 0.04),
        clean,
        variant,
      );
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
    return true;
  }
  private land(y: number) {
    const impact = -this.vy;
    this.impact = impact;
    this.landX = this.x;
    this.landedAt = this.time;
    this.y = y;
    this.vy = 0;
    this.grounded = true;
    this.lastGround = this.time;
    this.upper = y > 2;
    if (impact > 14 || this.dropFrom - y > 2) {
      if (this.rollUntil >= this.time) {
        this.setMove("roll", 0.48);
        this.reward("SOFT ROLL · MOMENTUM KEPT");
      } else {
        this.setMove("land", 0.38);
        this.recover("HEAVY LANDING · SWIPE DOWN BEFORE CONTACT", 4.2);
      }
    } else this.setMove("land", 0.12);
    this.rollUntil = -1;
  }
  private physics() {
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
    const support = surfaces.find(
      (s) =>
        this.x >= s.start && this.x < s.end && Math.abs(s.y - this.y) < 0.025,
    );
    if (this.grounded && !support) {
      this.launchX = oldX;
      this.launchY = this.y;
      this.grounded = false;
      this.dropFrom = this.y;
      this.vy = 0;
      this.setMove("fall");
    }
    // The upper route is a real slab: an early jump underneath hits its underside.
    if (!this.grounded && this.vy > 0) {
      const ceiling = surfaces.find(
        (s) =>
          s.y > 0 &&
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
      const landing = surfaces
        .filter(
          (s) =>
            this.x >= s.start && this.x < s.end && oldY >= s.y && this.y <= s.y,
        )
        .sort((a, b) => b.y - a.y)[0];
      if (landing) this.land(landing.y);
      else if (this.time - this.jumpIntent < 0.18) {
        const lip = surfaces.find(
          (s) =>
            oldX < s.start &&
            this.x + 0.3 >= s.start &&
            this.y < s.y &&
            this.y > s.y - 1.6,
        );
        if (lip) {
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
          (s.y === 0 ? this.y > -14 : this.y + 1.85 > s.y - 0.9),
      );
      if (wall) {
        this.x = wall.start - 0.23;
        this.speed = 0;
      }
    }
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (this.handled.has(i) || !this.applicable(o)) continue;
      const base = o.route === "upper" ? 3.3 : 0;
      const height =
        this.move === "slide" || this.move === "roll" ? 0.85 : 1.85;
      const overlaps = this.x + 0.22 >= o.x && oldX - 0.22 <= o.x + o.width;
      if (
        overlaps &&
        o.kind === "vault" &&
        this.y < base + (o.height || 1) &&
        this.y + height > base
      ) {
        this.handled.add(i);
        this.recover("BARRIER CONTACT · SPEED LOST", 4);
        // A recoverable hand-assisted crossing begins at actual contact, with a large time cost.
        this.traversal = {
          start: this.x,
          end: o.x + o.width + 0.7,
          y0: this.y,
          y1: base,
          duration: (o.width + 1.2) / 5.5,
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
    if (this.move === "slide" || this.move === "stumble") {
      const ceiling = obstacles.some(
        (o) =>
          o.kind === "slide" &&
          this.applicable(o) &&
          this.x + 0.3 >= o.x &&
          this.x - 0.3 <= o.x + o.width &&
          this.y < (o.route === "upper" ? 3.3 : 0) + 1.22,
      );
      if (this.moveTime > this.actionDuration && !ceiling) {
        this.slideExitAt = this.time;
        this.setMove(this.grounded ? "run" : "fall");
      }
    } else if (
      (this.move === "land" || this.move === "roll") &&
      this.moveTime > this.actionDuration
    )
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
      t.elapsed += STEP;
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
      if ((t.move === "vault" || t.move === "mantle") && t.obstacle) {
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
      if (t.move === "wall")
        this.y =
          t.y0 +
          (t.y1 - t.y0) * Math.min(1, p / 0.78) +
          Math.sin(Math.PI * p) * t.arc;
      if (t.move === "wall-climb" && t.contact) {
        const ease = (v: number) => {
          const u = clamp(v, 0, 1);
          return u * u * (3 - 2 * u);
        };
        const face = t.contact.x,
          lip = t.contact.y;
        if (p < 0.35) {
          const u = ease(p / 0.35);
          this.x = t.start + (face - 0.55 - t.start) * u;
          this.y = t.y0 + 0.35 * u;
        } else if (p < 0.52) {
          this.x = face - 0.55;
          this.y =
            t.y0 + 0.35 + (lip - 1.65 - t.y0 - 0.35) * ease((p - 0.35) / 0.17);
        } else if (p < 0.62) {
          this.x = face - 0.55;
          this.y = lip - 1.65 - 0.06 * Math.sin((Math.PI * (p - 0.52)) / 0.1);
        } else if (p < 0.82) {
          this.x = face - 0.55;
          this.y = lip - 1.65 + 1.1 * ease((p - 0.62) / 0.2);
        } else {
          this.x =
            face - 0.55 + (t.end - face + 0.55) * ease((p - 0.82) / 0.18);
          this.y = lip - 0.55 + 0.55 * ease((p - 0.82) / 0.1);
        }
      }
      this.vy = (this.y - previousY) / STEP;
      if (p === 1) {
        if (t.move === "catch" && t.contact) {
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
          this.traversal = null;
          this.impact = t.move === "vault" ? 7 : 5;
          this.landX = this.x;
          this.landedAt = this.time;
          this.y = t.y1;
          this.grounded = true;
          this.lastGround = this.time;
          this.upper = this.y > 2;
          this.vy = 0;
          this.setMove("land", 0.09);
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
    return {
      x: this.x,
      y: this.y,
      speed: this.speed,
      vy: this.vy,
      move: this.move,
      moveTime: this.moveTime,
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
    };
  }
  record(): RecordRun {
    return {
      version: VERSION,
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
