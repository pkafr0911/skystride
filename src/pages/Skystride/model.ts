export const STEP = 1 / 120;
export const FINISH = 324;
export const VERSION = 'sunset-relay-v1';
export type Action = 'up' | 'down';
export type Move = 'run' | 'jump' | 'vault' | 'slide' | 'wall' | 'catch' | 'roll' | 'stumble';
export type Obstacle = {
  x: number;
  width: number;
  kind: 'vault' | 'gap' | 'slide' | 'branch' | 'drop';
  route?: 'upper' | 'lower';
  branch?: number;
};
export const obstacles: Obstacle[] = [
  { x: 22, width: 2, kind: 'vault' },
  { x: 42, width: 5, kind: 'gap' },
  { x: 65, width: 5, kind: 'slide' },
  { x: 82, width: 6, kind: 'branch', branch: 1 },
  { x: 99, width: 3, kind: 'vault', route: 'lower' },
  { x: 112, width: 6, kind: 'slide', route: 'lower' },
  { x: 108, width: 6, kind: 'gap', route: 'upper' },
  { x: 134, width: 2, kind: 'vault', route: 'upper' },
  { x: 145, width: 8, kind: 'drop', route: 'upper' },
  { x: 164, width: 6, kind: 'gap' },
  { x: 186, width: 5, kind: 'slide' },
  { x: 207, width: 6, kind: 'branch', branch: 2 },
  { x: 224, width: 3, kind: 'vault', route: 'lower' },
  { x: 238, width: 5, kind: 'slide', route: 'lower' },
  { x: 232, width: 7, kind: 'gap', route: 'upper' },
  { x: 254, width: 8, kind: 'drop', route: 'upper' },
  { x: 279, width: 3, kind: 'vault' },
  { x: 300, width: 6, kind: 'gap' },
];
export function ground(x: number, upper: boolean) {
  return upper && ((x >= 82 && x <= 153) || (x >= 207 && x <= 262)) ? 3.3 : 0;
}
export type Sample = [number, number, number, Move];
export type RecordRun = { version: string; time: number; splits: number[]; samples: Sample[] };
export function readRecord(raw: string | null): RecordRun | null {
  try {
    const r = JSON.parse(raw || 'null');
    if (
      !r ||
      r.version !== VERSION ||
      !Number.isFinite(r.time) ||
      r.time < 20 ||
      r.time > 600 ||
      !Array.isArray(r.splits) ||
      r.splits.length !== 3 ||
      !r.splits.every((n: number) => Number.isFinite(n) && n > 0) ||
      !Array.isArray(r.samples) ||
      r.samples.length > 12001 ||
      !r.samples.length
    )
      return null;
    if (
      !r.samples.every(
        (s: Sample) =>
          Array.isArray(s) &&
          s.length === 4 &&
          s.slice(0, 3).every(Number.isFinite) &&
          s[0] >= 0 &&
          s[0] <= 600 &&
          s[1] >= 0 &&
          s[1] <= FINISH &&
          s[2] >= -10 &&
          s[2] <= 20 &&
          ['run', 'jump', 'vault', 'slide', 'wall', 'catch', 'roll', 'stumble'].includes(s[3]),
      )
    )
      return null;
    if (r.samples.some((s: Sample, i: number) => i > 0 && s[0] <= r.samples[i - 1][0])) return null;
    return r;
  } catch {
    return null;
  }
}
export function formatTime(t: number) {
  return `${Math.floor(t / 60)
    .toString()
    .padStart(2, '0')}:${(t % 60).toFixed(2).padStart(5, '0')}`;
}
type Traversal = {
  start: number;
  end: number;
  y0: number;
  y1: number;
  elapsed: number;
  duration: number;
  arc: number;
  move: Move;
};
export class Run {
  phase: 'ready' | 'running' | 'finished' | 'failed' = 'ready';
  x = 0;
  y = 0;
  time = 0;
  ticks = 0;
  speed = 7.8;
  upper = false;
  move: Move = 'run';
  paused = false;
  eligible = true;
  practice = false;
  startSector = 0;
  clean = 0;
  recoveries = 0;
  splits: number[] = [];
  samples: Sample[] = [];
  handled = new Set<number>();
  traversal: Traversal | null = null;
  message = 'Find your line. Own your time.';
  messageUntil = 0;
  onChange = () => {};
  start(sector = 0, practice = false) {
    Object.assign(this, {
      phase: 'running',
      startSector: sector,
      x: sector * 108,
      y: 0,
      time: 0,
      ticks: 0,
      speed: 7.8,
      upper: false,
      move: 'run',
      paused: false,
      eligible: !practice,
      practice,
      clean: 0,
      recoveries: 0,
      splits: [],
      samples: [],
      traversal: null,
      message: practice ? 'Practice · no personal best recorded' : 'SUNSET RELAY / GO',
      messageUntil: 2,
    });
    this.handled = new Set(obstacles.flatMap((o, i) => (o.x < this.x ? [i] : [])));
    this.onChange();
  }
  pause() {
    if (this.phase !== 'running') return;
    this.paused = !this.paused;
    this.eligible = false;
    this.onChange();
  }
  applicable(o: Obstacle) {
    return !o.route || (o.route === 'upper') === this.upper;
  }
  next() {
    return obstacles.find(
      (o, i) => !this.handled.has(i) && this.applicable(o) && o.x + o.width >= this.x,
    );
  }
  say(text: string) {
    this.message = text;
    this.messageUntil = this.time + 1.8;
    this.onChange();
  }
  cross(o: Obstacle, move: Move, clean: boolean, y1 = this.y, arc = 0) {
    this.handled.add(obstacles.indexOf(o));
    const end = o.x + o.width + 0.8;
    const distance = end - this.x;
    const duration =
      distance / (clean ? 8.8 : 6.1) + (move === 'catch' ? 0.8 : move === 'stumble' ? 0.65 : 0);
    this.traversal = { start: this.x, end, y0: this.y, y1, elapsed: 0, duration, arc, move };
    this.move = move;
    if (clean) this.clean++;
    else this.recoveries++;
    this.say(
      clean
        ? `CLEAN ${move === 'wall' ? 'WALL STEP · UPPER ROUTE' : move.toUpperCase()}`
        : move === 'catch'
          ? 'LEDGE CATCH · TIME LOST'
          : 'RECOVERY · KEEP MOVING',
    );
  }
  action(action: Action) {
    if (this.phase !== 'running' || this.paused || this.traversal) return;
    const o = this.next();
    if (!o) return;
    const d = o.x - this.x;
    if (d > 5.5 || d < -0.6) return;
    const clean = d >= 1.4 && d <= 3.1;
    if (o.kind === 'branch' && action === 'up') {
      this.upper = true;
      this.cross(o, 'wall', clean, 3.3, 0.8);
    } else if (o.kind === 'drop' && action === 'down') {
      this.upper = false;
      this.cross(o, 'roll', clean, 0, 0.4);
    } else if (o.kind === 'slide' && action === 'down') this.cross(o, 'slide', clean);
    else if (o.kind === 'vault' && action === 'up')
      this.cross(o, clean ? 'vault' : 'jump', clean, this.y, clean ? 0.95 : 1.8);
    else if (o.kind === 'gap' && action === 'up')
      this.cross(o, d < 1.4 ? 'catch' : 'jump', clean, this.y, 2.4);
  }
  step() {
    if (this.phase !== 'running' || this.paused) return;
    this.ticks++;
    this.time = this.ticks * STEP;
    if (this.traversal) {
      const t = this.traversal;
      t.elapsed += STEP;
      const p = Math.min(1, t.elapsed / t.duration);
      this.x = t.start + (t.end - t.start) * p;
      this.y = t.y0 + (t.y1 - t.y0) * p + Math.sin(Math.PI * p) * t.arc;
      // A reachable late jump hangs below the lip before climbing onto the roof.
      if (t.move === 'catch') {
        const reach = Math.min(1, p / 0.55);
        const climb = Math.max(0, (p - 0.78) / 0.22);
        this.x = t.start + (t.end - 1.35 - t.start) * reach + 1.35 * climb;
        this.y = t.y0 - 2.1 * reach + Math.sin(Math.PI * reach) * 2.4 + 2.1 * climb;
      }
      if (p === 1) {
        this.traversal = null;
        this.move = 'run';
      }
    } else {
      this.x += this.speed * STEP;
      this.y = ground(this.x, this.upper);
      const o = this.next();
      if (o && this.x >= o.x - 0.15) {
        if (o.kind === 'branch') this.handled.add(obstacles.indexOf(o));
        else if (o.kind === 'gap') {
          this.phase = 'failed';
          this.say('MISSED THE EDGE · TRY YOUR LINE AGAIN');
        } else if (o.kind === 'drop') {
          this.upper = false;
          this.cross(o, 'roll', false, 0, 0.2);
        } else this.cross(o, 'stumble', false, this.y, o.kind === 'vault' ? 1.5 : 0);
      }
    }
    this.x = Math.min(FINISH, this.x);
    for (const boundary of [108, 216, FINISH]) {
      const index = boundary / 108 - 1;
      if (
        boundary > this.startSector * 108 &&
        this.x >= boundary &&
        this.splits[index] === undefined
      )
        this.splits[index] = this.time;
    }
    if (this.ticks % 6 === 0) this.samples.push([this.time, this.x, this.y, this.move]);
    if (this.x >= FINISH) {
      this.phase = 'finished';
      this.onChange();
    }
    if (this.ticks % 12 === 0) this.onChange();
  }
  record(): RecordRun {
    return {
      version: VERSION,
      time: this.time,
      splits: [...this.splits],
      samples: [...this.samples],
    };
  }
}
/** One gesture per contact; recognition happens at threshold crossing, never on release. */
export class Swipe {
  x = 0;
  y = 0;
  active = false;
  start(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.active = true;
  }
  move(x: number, y: number): Action | null {
    if (!this.active) return null;
    const dx = x - this.x;
    const dy = y - this.y;
    if (Math.hypot(dx, dy) < 22) return null;
    if (Math.abs(dy) < Math.abs(dx) * 1.15) return null;
    this.active = false;
    return dy < 0 ? 'up' : 'down';
  }
}
