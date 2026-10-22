import { SWING_GAP_EXTRA, isSwing } from "./combos";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FINISH,
  canMantle,
  timingWindow,
  timingRange,
  TECHNICAL,
  SECTOR,
  RUN_SPEED,
  readRecord,
  Run,
  STEP,
  Swipe,
  obstacles,
  surfaces,
  formatTime,
} from "./model";
function advance(g: Run, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / STEP); i++) g.step();
}
function complete(upper = false, early = false, approach = 1.9) {
  const g = new Run();
  g.start();
  const pressed = new Set<number>();
  const rolled = new Set<number>();
  for (let tick = 0; tick < 60000 && g.phase === "running"; tick++) {
    const frame = g.frame();
    if (
      !g.grounded &&
      !g.traversal &&
      frame.launchY! - (g.upper ? 3.3 : 0) > 0.5 &&
      frame.launchY! - (g.upper ? 3.3 : 0) < 2 &&
      g.vy < -10 &&
      g.y - (g.upper ? 3.3 : 0) < 1.1 &&
      !rolled.has(frame.launchX!)
    ) {
      g.action("down");
      rolled.add(frame.launchX!);
    }
    if (
      g.traversal &&
      isSwing(g.traversal.technique) &&
      g.frame().progress > 0.55
    )
      g.action("forward");
    const o = g.next();
    if (o && !pressed.has(o.x) && !g.traversal) {
      const d = o.x - g.x;
      if (o.feature === "balcony" || o.feature === "scaffold") {
        pressed.add(o.x);
      } else if (o.kind === "glass") {
        const top = g.onObstacle();
        if ((top && g.x >= top.end - 0.5) || (frame.slope && d <= 1.6)) {
          g.action("up");
          pressed.add(o.x);
        }
      } else if (o.kind === "drop") {
        if (!g.grounded && g.y < 2.6) {
          g.action("down");
          pressed.add(o.x);
        }
      } else if (
        (o.kind !== "branch" || upper) &&
        g.grounded &&
        d <=
          (o.kind === "gap" ? 1.1 : early && o.kind === "vault" ? 6 : approach)
      ) {
        g.action(o.kind === "slide" ? "down" : "up");
        pressed.add(o.x);
      }
    }
    g.step();
  }
  return g;
}
test("jump responds on the next simulation tick anywhere on an open roof", () => {
  const g = new Run();
  g.start();
  g.action("up");
  g.step();
  assert.equal(g.grounded, false);
  assert.equal(g.move, "jump");
  assert.ok(g.y > 0);
  assert.ok(g.vy > 0);
  advance(g, 0.9);
  assert.equal(g.grounded, true);
  g.action("up");
  g.step();
  assert.ok(g.vy > 0);
});
test("an airborne press cannot double jump", () => {
  const g = new Run();
  g.start();
  g.action("up");
  advance(g, 0.25);
  const velocity = g.vy;
  g.action("up");
  g.step();
  assert.ok(g.vy < velocity);
});
test("a jump pressed just before landing is buffered and launches after contact", () => {
  const g = new Run();
  g.start();
  g.action("up");
  while (!(g.vy < 0 && g.y < 0.65)) g.step();
  g.action("up");
  advance(g, 0.11);
  assert.ok(g.vy > 0);
  assert.equal(g.grounded, false);
});
test("jump buffering expires when pressed too early in the air", () => {
  const g = new Run();
  g.start();
  g.action("up");
  advance(g, 0.2);
  g.action("up");
  advance(g, 0.8);
  assert.equal(g.grounded, true);
});
test("coyote grace permits a late edge jump but expires", () => {
  for (const [wait, accepted] of [
    [0.04, true],
    [0.13, false],
  ] as const) {
    const g = new Run();
    g.start();
    g.x = 66.98;
    advance(g, wait);
    g.action("up");
    g.step();
    assert.equal(g.vy > 0, accepted);
  }
});
test("both routes complete physically with clean contacts and three splits", () => {
  for (const upper of [false, true]) {
    const g = complete(upper);
    assert.equal(g.phase, "finished", `route=${upper}, x=${g.x}, y=${g.y}`);
    assert.equal(g.x, FINISH);
    assert.equal(g.splits.length, 3);
    assert.ok(g.splits[0] < g.splits[1] && g.splits[1] < g.splits[2]);
    assert.equal(g.recoveries, 0);
    assert.ok(
      g.inputs.length >= 280,
      `Full course input count: ${g.inputs.length}, route: ${upper}`,
    );
    const intervals = g.inputs
      .slice(1)
      .map((input, i) => (input.tick - g.inputs[i].tick) * STEP)
      .sort((a, b) => a - b);
    assert.ok(
      intervals[Math.floor(intervals.length / 2)] <= 0.8,
      "Authored combo cadence should stay below 800 ms",
    );
    assert.ok(g.time >= 180 && g.time <= 300);
  }
});
test("clean routes retain flow while mistimed chains lose speed or miss gaps", () => {
  for (const upper of [false, true]) {
    const clean = complete(upper),
      early = complete(upper, true);
    assert.equal(clean.phase, "finished");
    assert.equal(clean.recoveries, 0);
    assert.ok(early.recoveries > 0);
    assert.ok(early.phase === "failed" || early.time > clean.time);
  }
});
test("every authored vault type has its own traversal and obstacle contact anchor", () => {
  for (const o of obstacles.filter((item) => item.kind === "vault")) {
    const g = new Run();
    g.start();
    g.x = o.x - 1.8;
    g.y = o.route === "upper" ? 3.3 : 0;
    g.upper = o.route === "upper";
    g.action("up");
    g.step();
    assert.equal(g.move, "vault", `${o.x}`);
    assert.equal(g.vault, o.vault);
    assert.equal(g.traversal?.contact?.y, g.previous.y + o.height!);
  }
});
test("a late vault selects safety recovery with real momentum loss", () => {
  const g = new Run();
  g.start();
  g.x = 26.7;
  g.action("up");
  g.step();
  assert.equal(g.vault, "safety");
  assert.equal(g.recoveries, 1);
  assert.ok(g.speed < RUN_SPEED);
});
test("missing a barrier causes a recoverable contact instead of passing through", () => {
  const g = new Run();
  g.start();
  g.x = 26.7;
  advance(g, 0.1);
  assert.equal(g.recoveries, 1);
  assert.equal(g.vault, "safety");
  assert.ok(g.traversal);
});
test("sliding stays low until the ceiling is clear", () => {
  const g = new Run();
  g.start();
  g.x = 88;
  g.action("down");
  while (g.x < 96) {
    g.step();
    assert.equal(g.recoveries, 0);
  }
  assert.equal(g.move, "slide");
  advance(g, 0.2);
  assert.equal(g.move, "run");
});
test("a timed down input turns a high drop into a roll and preserves speed", () => {
  const results: Run[] = [];
  for (const roll of [false, true]) {
    const g = new Run();
    g.start();
    g.x = 196;
    g.y = 3.3;
    g.upper = true;
    while (g.grounded || g.y > 2) g.step();
    if (roll) g.action("down");
    while (!g.grounded) g.step();
    results.push(g);
  }
  assert.equal(results[0].recoveries, 1);
  assert.equal(results[1].move, "roll");
  assert.equal(results[1].recoveries, 0);
  assert.ok(results[1].speed > results[0].speed);
});
test("a missed gap falls under gravity before failing", () => {
  const g = new Run();
  g.start();
  g.x = 67;
  advance(g, 0.3);
  assert.equal(g.phase, "running");
  assert.ok(g.y < -0.5);
  advance(g, 1);
  assert.equal(g.phase, "failed");
  const t = g.time;
  g.step();
  assert.equal(g.time, t);
});
test("recorded tick inputs reproduce positions, actions and finish time exactly", () => {
  const original = complete(true),
    replay = new Run();
  replay.start();
  let index = 0;
  while (replay.phase === "running" && replay.ticks < 60000) {
    while (original.inputs[index]?.tick === replay.ticks + 1)
      replay.action(original.inputs[index++].action);
    replay.step();
  }
  assert.deepEqual(replay.record(), original.record());
});
test("pause freezes physics, clears pending input and excludes personal best", () => {
  const g = new Run();
  g.start();
  g.step();
  g.action("up");
  g.pause();
  g.step();
  assert.equal(g.time, STEP);
  assert.equal(g.eligible, false);
  g.pause();
  g.step();
  assert.equal(g.grounded, true);
});
test("restart clears velocity, buffered actions, flow and replay data", () => {
  const g = complete(true);
  g.start();
  assert.equal(g.time, 0);
  assert.equal(g.vy, 0);
  assert.equal(g.upper, false);
  assert.equal(g.flow, 0);
  assert.equal(g.inputs.length, 0);
  assert.equal(g.eligible, true);
});
test("practice begins at sector boundary and is never record eligible", () => {
  const g = new Run();
  g.start(2, true);
  assert.equal(g.x, SECTOR * 2);
  assert.equal(g.eligible, false);
});
test("versioned replay validation rejects malformed input and frame data", () => {
  const r = complete().record();
  assert.deepEqual(readRecord(JSON.stringify(r)), r);
  const legacy = structuredClone(r);
  for (const sample of legacy.samples)
    for (const key of [
      "launchX",
      "launchY",
      "landX",
      "impact",
      "landingAge",
      "lead",
    ] as const)
      delete sample.frame[key];
  assert.deepEqual(readRecord(JSON.stringify(legacy)), legacy);
  assert.equal(
    readRecord(
      JSON.stringify({
        ...r,
        samples: r.samples.map((s) => ({
          ...s,
          frame: { ...s.frame, impact: "invalid" },
        })),
      }),
    ),
    null,
  );
  assert.equal(readRecord("{"), null);
  assert.equal(readRecord(JSON.stringify({ ...r, version: "old" })), null);
  assert.equal(
    readRecord(JSON.stringify({ ...r, inputs: [{ tick: -1, action: "up" }] })),
    null,
  );
  assert.equal(
    readRecord(JSON.stringify({ ...r, splits: [2, 1, r.time] })),
    null,
  );
  assert.equal(
    readRecord(JSON.stringify({ ...r, samples: [{ time: 0, frame: {} }] })),
    null,
  );
});
test("swipes fire at threshold crossing once; sensitivity is adjustable", () => {
  const s = new Swipe();
  s.start(100, 100);
  assert.equal(s.move(104, 92), null);
  assert.equal(s.move(105, 80), "up");
  assert.equal(s.move(105, 45), null);
  s.start(100, 100);
  assert.equal(s.move(125, 102), "forward");
  s.threshold = 30;
  s.start(100, 100);
  assert.equal(s.move(100, 125), null);
  assert.equal(s.move(100, 132), "down");
});
test("timer carries rounded hundredths into the next minute", () => {
  assert.equal(formatTime(59.999), "01:00.00");
});
test("vault feet clear the top for the entire obstacle width", () => {
  for (const o of obstacles.filter((item) => item.kind === "vault")) {
    const g = new Run();
    g.start();
    g.x = o.x - 2;
    g.y = o.route === "upper" ? 3.3 : 0;
    g.upper = o.route === "upper";
    const top = g.y + o.height!;
    g.action("up");
    g.step();
    while (g.traversal) {
      if (g.x >= o.x && g.x <= o.x + o.width)
        assert.ok(g.y >= top, `${o.vault} at ${g.x}`);
      g.step();
    }
  }
});
test("a jump buffered during vault release launches on its first grounded tick", () => {
  const g = new Run();
  g.start();
  g.x = 25;
  // Isolate free jumping from the newly added chained vault after the first obstacle.
  obstacles.forEach((o, i) => {
    if (o.x > 27 && o.x < 43) g.handled.add(i);
  });
  g.action("up");
  g.step();
  while (g.traversal && g.traversal.duration - g.traversal.elapsed > 0.065)
    g.step();
  g.action("up");
  advance(g, 0.1);
  assert.ok(g.vy > 0);
  assert.equal(g.grounded, false);
});
test("up at a reachable lip catches it and climbs onto its real surface", () => {
  const g = new Run();
  g.start();
  g.speed = 12;
  const gap = obstacles.find((o) => o.kind === "gap" && o.x === 67)!;
  g.x = gap.x + gap.width - 3.2;
  g.grounded = false;
  advance(g, 26 * STEP);
  g.action("up");
  advance(g, 0.05);
  assert.equal(g.move, "catch");
  assert.equal(g.traversal?.contact?.y, 0);
  advance(g, 0.8);
  assert.equal(g.grounded, true);
  assert.equal(g.y, 0);
  assert.equal(g.recoveries, 1);
});

test("jump distance carries takeoff speed and a long jump needs earned momentum", () => {
  const flights = [6, 9, 12, 14].map((speed) => {
    const g = new Run();
    g.start();
    g.speed = speed;
    g.action("forward");
    g.step();
    const long = g.frame().longJump;
    while (!g.grounded && g.time < 2) {
      assert.ok(
        g.speed <= speed,
        "airborne motion cannot restore running speed",
      );
      g.step();
    }
    return { distance: g.x, long };
  });
  assert.deepEqual(
    flights.map((f) => f.long),
    [false, false, true, true],
  );
  for (let i = 1; i < flights.length; i++)
    assert.ok(flights[i].distance > flights[i - 1].distance + 1);
  assert.ok(flights[0].distance < 5);
  assert.ok(flights[3].distance > 11);
});
test("a slowed runner needs a sustained run-up to regain long-jump speed", () => {
  const g = new Run();
  g.start();
  // Use the clear approach roof so this isolates acceleration from course gaps.
  g.x = -10;
  g.speed = 6;
  advance(g, 1);
  assert.ok(g.speed > 8.9 && g.speed < 9.1);
  advance(g, 0.9);
  assert.ok(g.speed >= 11.5 && g.speed < 12);
});
test("high walls pause horizontal travel for the catch and finish on the upper roof", () => {
  const walls = obstacles.filter((o) => o.kind === "branch" && o.height);
  assert.equal(walls.length, 4);
  for (const o of walls) {
    const g = new Run();
    g.start();
    g.x = o.x - 1.9;
    g.speed = 12;
    g.action("up");
    g.step();
    assert.equal(g.move, "wall-climb");
    while (g.frame().progress < 0.53) g.step();
    const gripX = g.x;
    assert.ok(g.y < o.height! - 1.5);
    while (g.frame().progress < 0.6) {
      g.step();
      assert.equal(g.x, gripX);
    }
    while (g.traversal) g.step();
    assert.equal(g.y, o.height);
    assert.equal(g.grounded, true);
    assert.equal(g.upper, true);
    assert.equal(g.recoveries, 0);
    assert.ok(g.speed < 12);
  }
});
test("an early jump beneath the upper route hits its underside", () => {
  const g = new Run();
  g.start();
  g.x = 125;
  // Exercise slab collision without a nearby contextual vault taking over the jump.
  obstacles.forEach((o, i) => {
    if (o.x >= 125 && o.x < 139) g.handled.add(i);
  });
  g.action("up");
  for (let i = 0; i < 40; i++) {
    g.step();
    assert.ok(g.y + 1.85 <= 2.4 + 0.001);
  }
  assert.equal(g.grounded, true);
});
test("a missed landing cannot tunnel through the next roof facade", () => {
  const g = new Run();
  g.start();
  g.x = 67;
  advance(g, 1);
  assert.equal(g.phase, "failed");
  assert.ok(g.x < 73.2);
});

test("technical district sustains more than a minute at maximum flow with all four primary vaults", () => {
  assert.ok((TECHNICAL.end - TECHNICAL.start) / 14 >= 60);
  for (const route of ["upper", "lower"]) {
    const segment = obstacles.filter(
      (o) => o.route === route && o.x >= TECHNICAL.start && o.x < TECHNICAL.end,
    );
    assert.ok(segment.length >= 45);
    const families = new Set(
      segment.filter((o) => o.kind === "vault").map((o) => o.vault),
    );
    for (const vault of ["kong", "dash", "speed", "lazy"] as const)
      assert.ok(families.has(vault));
    assert.ok(![...families].some((v) => String(v).startsWith("step")));
    assert.ok(segment.slice(1).every((o, i) => o.x - segment[i].x <= 20));
  }
});
test("normal and hard timing windows retain their duration at different speeds", () => {
  for (const o of obstacles)
    for (const speed of [8, 12, 14]) {
      const duration = timingWindow(o),
        range = timingRange(o, speed);
      assert.ok(
        o.route === "upper"
          ? duration >= 0.2 && duration <= 0.25
          : duration >= 0.3 && duration <= 0.4,
      );
      assert.ok(Math.abs((range.far - range.near) / speed - duration) < 1e-10);
    }
});
test("jump crests lose vertical speed then accelerate through descent", () => {
  const g = new Run();
  g.start();
  g.action("up");
  g.step();
  const launch = Math.hypot(g.speed, g.vy);
  while (g.vy > 0.25) g.step();
  const crest = Math.hypot(g.speed, g.vy);
  assert.ok(crest < launch);
  while (g.vy > -10) g.step();
  assert.ok(Math.hypot(g.speed, g.vy) > crest + 2);
});
test("vault slows over support and accelerates into release without changing collision clearance", () => {
  const g = new Run();
  g.start();
  g.x = 25.1;
  g.action("up");
  g.step();
  const rates: number[] = [];
  while (g.traversal) {
    const x = g.x;
    g.step();
    rates.push((g.x - x) / STEP);
  }
  assert.ok(rates[Math.floor(rates.length / 2)] < rates[2]);
  assert.ok(rates[Math.floor(rates.length / 2)] < rates[rates.length - 3]);
});

test("slide loses momentum and rebuilding speed requires running", () => {
  const g = new Run();
  g.start();
  g.action("down");
  advance(g, 0.4);
  assert.equal(g.move, "slide");
  assert.ok(g.speed <= 11);
  const slow = g.speed;
  advance(g, 0.5);
  assert.equal(g.move, "run");
  assert.ok(g.speed > slow);
});
test("starting a slide after a stumble never creates momentum", () => {
  const g = new Run();
  g.start();
  g.speed = 6;
  g.action("down");
  g.step();
  assert.ok(g.speed <= 6);
});
test("up climbs a low uncovered duct more slowly than sliding under it", () => {
  const o = obstacles.find(canMantle)!;
  const times: number[] = [];
  for (const action of ["up", "down"] as const) {
    const g = new Run();
    g.start();
    g.x = o.x - 1.9;
    g.y = o.route === "upper" ? 3.3 : 0;
    g.upper = o.route === "upper";
    g.action(action);
    g.step();
    assert.equal(g.move, action === "up" ? "mantle" : "slide");
    while (g.x < o.x + o.width + 1.5 && g.time < 3) g.step();
    times.push(g.time);
    assert.equal(g.recoveries, 0);
  }
  assert.ok(times[0] > times[1] + 0.5);
});
test("climb-over alternative is forbidden beneath another roof", () => {
  for (const o of obstacles.filter(
    (o) => o.kind === "slide" && o.route === "lower" && o.x > 500 && o.x < 1400,
  ))
    assert.equal(canMantle(o), false);
});
test("Kong hand push produces a second lift and a one-time exit impulse", () => {
  const o = obstacles.find((o) => o.vault === "kong")!,
    g = new Run();
  g.start();
  g.x = o.x - 1.9;
  g.action("up");
  g.step();
  let pushed = false,
    maxLift = -Infinity;
  while (g.traversal) {
    const t = g.traversal;
    g.step();
    pushed ||= !!t.pushed;
    if (g.traversal && g.frame().progress > 0.5 && g.frame().progress < 0.8)
      maxLift = Math.max(maxLift, g.y);
  }
  assert.ok(pushed);
  assert.ok(maxLift > (o.height ?? 1) + 0.15);
});

test("climb inputs work beside the visible face, not only before its marker", () => {
  for (const offset of [4, 1.1, 0.24]) {
    const wall = obstacles.find((o) => o.kind === "branch" && o.height)!;
    const g = new Run();
    g.start();
    g.x = wall.x + wall.width - offset;
    g.speed = 10;
    g.action("up");
    g.step();
    assert.equal(g.move, "wall-climb");
    assert.ok(
      g.x >= g.previous.x,
      "late climbs cannot pull the runner backwards",
    );
    for (let i = 0; g.traversal && i < 400; i++) g.step();
    assert.equal(g.traversal, null);
    assert.equal(g.y, 3.3);
    assert.equal(g.upper, true);
    g.action("up");
    g.step();
    assert.ok(g.vy > 0, "can jump again immediately on the roof");
  }
});

test("airborne wall input uses reachable contact without snapping to the lip", () => {
  for (const y of [0.8, 2.1]) {
    const g = new Run();
    g.start();
    g.x = 119.4;
    g.y = y;
    g.grounded = false;
    g.action("up");
    g.step();
    assert.ok(g.move === "wall-climb" || g.move === "climb");
    assert.ok(Math.abs(g.x - 119.4) < 0.1);
    assert.ok(Math.abs(g.y - y) < 0.1);
    for (let i = 0; g.traversal && i < 400; i++) g.step();
    assert.equal(g.y, 3.3);
    assert.equal(g.grounded, true);
  }
  const g = new Run();
  g.start();
  g.x = 116;
  g.y = 1.5;
  g.grounded = false;
  advance(g, 0.13);
  g.action("up");
  g.step();
  assert.equal(
    g.traversal,
    null,
    "an airborne input far from the wall cannot magnetize to it",
  );
});

test("descending onto barriers and ducts gives real support and immediate follow-up jumps", () => {
  for (const o of [
    obstacles.find((o) => o.vault === "kong")!,
    obstacles.find(canMantle)!,
    obstacles.find((o) => o.kind === "slide" && !o.route && !o.height)!,
    obstacles.find((o) => o.kind === "vault" && o.route === "upper")!,
  ]) {
    const g = new Run();
    g.start();
    g.upper = o.route === "upper";
    const top = (g.upper ? 3.3 : 0) + (o.height ?? 2.35);
    g.x = o.x + 0.12;
    g.y = top + 0.015;
    g.vy = -3;
    g.grounded = false;
    g.speed = 6;
    g.step();
    assert.equal(g.grounded, true);
    assert.equal(g.y, top);
    assert.equal(
      g.upper,
      o.route === "upper",
      "tall ducts must not switch routes",
    );
    assert.ok(g.onObstacle());
    g.action("up");
    g.step();
    assert.equal(g.move, "jump");
    assert.ok(g.y > top && g.vy > 0);
    assert.equal(g.traversal, null);
  }
});

test("mantle tops allow a supported jump or a feet-first edge exit", () => {
  const o = obstacles.find(canMantle)!;
  for (const action of ["up", "down"] as const) {
    const g = new Run();
    g.start();
    g.x = o.x - 1.7;
    g.speed = 8;
    g.action("up");
    g.step();
    for (let i = 0; !g.onObstacle() && g.traversal && i < 300; i++) g.step();
    assert.ok(g.onObstacle(), "mantle must expose a supported top-out phase");
    const oldY = g.y;
    g.action(action);
    g.step();
    assert.equal(g.traversal, null);
    if (action === "up") {
      assert.equal(g.move, "jump");
      assert.ok(g.vy > 0 && g.y >= oldY);
    } else {
      assert.equal(g.move, "slide");
      for (let i = 0; g.grounded && i < 100; i++) g.step();
      assert.equal(g.grounded, false);
      g.step();
      assert.ok(g.vy < 0, "edge exits fall under gravity");
      for (let i = 0; !g.grounded && g.phase === "running" && i < 200; i++)
        g.step();
      assert.equal(g.grounded, true);
      assert.equal(g.y, 0);
    }
  }
});

test("route content removes step vaults and emphasizes the four requested families", () => {
  const vaults = obstacles.filter((o) => o.kind === "vault");
  assert.ok(vaults.every((o) => !String(o.vault).startsWith("step")));
  const primary = vaults.filter((o) =>
    ["kong", "dash", "speed", "lazy"].includes(o.vault!),
  );
  assert.ok(primary.length / vaults.length > 0.9);
});

test("creative encounters recur across all four rooftop blocks with clear approach space", () => {
  for (const feature of ["vent-bank", "pipe", "solar", "window"] as const) {
    const pieces = obstacles.filter((o) => !o.combo && o.feature === feature);
    assert.equal(
      pieces.length,
      feature === "vent-bank" || feature === "pipe" ? 8 : 4,
    );
  }
  for (const first of obstacles.filter(
    (o) => !o.combo && o.feature === "vent-bank" && o.vault === "kong",
  ))
    assert.ok(
      !obstacles.some(
        (o) =>
          o !== first &&
          o.route !== "upper" &&
          o.x >= first.x - 9 &&
          o.x < first.x,
      ),
    );
});

test("early jumps can land on the vent bank and jump over its partner", () => {
  for (const first of obstacles.filter(
    (o) => !o.combo && o.feature === "vent-bank" && o.vault === "kong",
  )) {
    const g = new Run();
    g.start();
    g.x = first.x - 7.5;
    g.speed = 12;
    g.action("up");
    let landedOnFirst = false;
    for (let i = 0; i < 300 && g.x < first.x + 8.6; i++) {
      g.step();
      if (
        !landedOnFirst &&
        g.onObstacle() &&
        g.x >= first.x &&
        g.x < first.x + first.width
      ) {
        landedOnFirst = true;
        g.action("up");
      }
    }
    assert.ok(landedOnFirst);
    assert.ok(g.x >= first.x + 8.6);
    assert.equal(g.recoveries, 0);
  }
});

test("pipe crossings support both dash-slide and a jump from the low pipe onto the high pipe", () => {
  const first = obstacles.find(
    (o) => o.feature === "pipe" && o.kind === "vault",
  )!;
  for (const route of ["low", "top"]) {
    const g = new Run();
    g.start();
    g.x = first.x - 7;
    g.speed = 12;
    let firstTop = false,
      highTop = false;
    const pressed = new Set<number>();
    if (route === "top") g.action("up");
    for (let i = 0; i < 400 && g.x < first.x + 11.7; i++) {
      if (route === "low") {
        const o = g.next();
        if (
          o &&
          !g.traversal &&
          g.grounded &&
          o.x - g.x <= 1.9 &&
          !pressed.has(o.x)
        ) {
          pressed.add(o.x);
          g.action(o.kind === "slide" ? "down" : "up");
        }
      }
      g.step();
      const top = g.onObstacle();
      if (route === "top" && top) {
        if (!firstTop && g.x < first.x + first.width) {
          firstTop = true;
          g.action("up");
        } else if (g.x > first.x + 7) highTop = true;
      }
    }
    assert.equal(g.recoveries, 0);
    assert.ok(g.x >= first.x + 11.7);
    if (route === "top") assert.ok(firstTop && highTop);
  }
});

test("solar ramps raise actual support and allow momentum-carrying gap launches with landing rolls", () => {
  for (const ramp of obstacles.filter(
    (o) => !o.combo && o.kind === "ramp" && o.feature !== "side-ramp",
  )) {
    const g = new Run();
    g.start();
    g.x = ramp.x;
    g.speed = 12;
    for (let i = 0; g.x < ramp.x + ramp.width - 0.9 && i < 150; i++) {
      g.step();
      assert.ok(g.grounded);
      assert.ok(
        Math.abs(g.y - ((g.x - ramp.x) / ramp.width) * ramp.height!) < 1e-6,
      );
      assert.ok(g.speed <= 12, "inclines must not grant a speed boost");
    }
    assert.ok(g.frame().slope! > 0);
    const launchY = g.y,
      launchSpeed = g.speed;
    g.action("up");
    g.step();
    assert.ok(launchY > 0.8 && g.vy > 0);
    assert.ok(g.speed <= launchSpeed);
    let rolled = false;
    for (let i = 0; !g.grounded && g.phase === "running" && i < 200; i++) {
      if (!rolled && g.y < 1.1 && g.vy < -10) {
        g.action("down");
        rolled = true;
      }
      g.step();
    }
    assert.ok(rolled);
    assert.ok(g.grounded);
    assert.ok(g.x > ramp.x + ramp.width + 7);
    assert.equal(g.move, "roll");
    assert.equal(g.recoveries, 0);
  }
});

test("billboard sill vaults fit through the opening while high jumps hit the header", () => {
  for (const o of obstacles.filter((o) => o.feature === "window")) {
    const clean = new Run();
    clean.start();
    clean.x = o.x - 1.9;
    clean.speed = 12;
    clean.action("up");
    clean.step();
    assert.equal(clean.move, "vault");
    for (let i = 0; clean.traversal && i < 200; i++) clean.step();
    assert.ok(clean.x > o.x + o.width);
    assert.equal(clean.recoveries, 0);

    const hit = new Run();
    hit.start();
    hit.x = o.x + 0.5;
    hit.y = 1.55;
    hit.vy = 8;
    hit.grounded = false;
    hit.handled.add(obstacles.indexOf(o));
    hit.step();
    assert.ok(hit.y + 1.85 <= o.openingTop! + 1e-6);
    assert.ok(hit.vy <= 0);
    assert.equal(
      hit.recoveries,
      1,
      "handled scoring must not disable physical header collision",
    );

    const above = new Run();
    above.start();
    above.x = o.x + 0.5;
    above.y = o.openingTop! + 0.56;
    above.grounded = false;
    above.vy = -3;
    above.step();
    assert.equal(above.y, o.openingTop! + 0.55);
    assert.ok(above.onObstacle());
    assert.equal(above.upper, false);
  }
});

test("all creative encounter families exist in the authored course", () => {
  assert.deepEqual(
    [...new Set(obstacles.map((o) => o.feature).filter(Boolean))].sort(),
    [
      "vent-bank",
      "solar",
      "side-ramp",
      "tank",
      "wall-billboard",
      "pipe",
      "bridge",
      "window",
      "greenhouse",
      "scaffold",
      "balcony",
      "signature",
    ].sort(),
  );
});
test("tank offers slide, lazy brace and service-platform approaches", () => {
  for (const action of ["down", "up", "forward"] as const) {
    const g = new Run();
    g.start();
    g.x = 89.2;
    g.speed = 12;
    g.action(action);
    g.step();
    assert.equal(
      g.move,
      action === "down" ? "slide" : action === "up" ? "vault" : "climb",
    );
    if (action === "up") assert.equal(g.vault, "lazy");
    advance(g, 0.7);
    assert.equal(g.phase, "running");
    if (action === "forward") {
      assert.equal(g.y, 1.65);
      assert.equal(g.upper, false);
    }
  }
});
test("wall run reaches its exit deck and supports an immediate new jump", () => {
  const g = new Run();
  g.start();
  g.x = 44.2;
  g.speed = 12;
  g.action("up");
  g.step();
  assert.equal(g.move, "wall-run");
  while (g.traversal) g.step();
  assert.equal(g.y, 1.4);
  assert.equal(g.upper, false);
  g.action("up");
  g.step();
  assert.equal(g.move, "jump");
});
test("fast window entry dives and transitions into a roll", () => {
  const g = new Run();
  g.start();
  g.x = 400.2;
  g.speed = 12;
  g.action("forward");
  g.step();
  assert.equal(g.move, "dive");
  while (g.traversal) g.step();
  assert.equal(g.move, "roll");
  assert.equal(g.phase, "running");
});
test("balconies climb in sequence without changing route ownership", () => {
  const g = new Run();
  g.start();
  g.x = 174.2;
  g.y = 3.3;
  g.upper = true;
  for (const x of [176, 179.5, 183]) {
    if (x > 176) {
      while (g.x < x - 1.8 && g.phase === "running") g.step();
    }
    g.action("up");
    g.step();
    assert.ok(g.traversal);
    while (g.traversal) g.step();
    assert.equal(g.upper, true);
    assert.ok(g.onObstacle());
  }
  g.action("forward");
  g.step();
  assert.equal(g.move, "jump");
});
test("greenhouse glass cannot be used as a landing surface", () => {
  const g = new Run();
  g.start();
  g.x = 277.7;
  g.speed = 12;
  advance(g, 0.05);
  assert.equal(g.phase, "running");
  assert.ok(g.x < 278);
  assert.equal(g.recoveries, 1);
});

test("greenhouse has a ground-level slide escape at every authored repetition", () => {
  for (const glass of obstacles.filter((o) => o.kind === "glass")) {
    for (const speed of [5.5, 9, 12, 14]) {
      const g = new Run();
      g.start();
      g.x = glass.x - 1.8;
      g.speed = speed;
      g.action("down");
      for (let i = 0; i < 240 && g.x < glass.x + glass.width + 0.4; i++)
        g.step();
      assert.equal(g.phase, "running", `slide at ${glass.x}, speed ${speed}`);
      assert.ok(g.x > glass.x + glass.width);
    }
  }
});

test("a missed greenhouse jump can recover to the slide route without restarting", () => {
  const g = new Run();
  g.start();
  g.x = 277.6;
  g.y = 2.3;
  g.grounded = false;
  g.vy = -3;
  g.speed = 9;
  for (let tick = 0; tick < 240 && !g.grounded; tick++) g.step();
  assert.equal(g.phase, "running");
  assert.ok(g.grounded);
  assert.ok(g.x < 278);
  g.action("down");
  for (let tick = 0; tick < 600 && g.x < 281.4; tick++) g.step();
  assert.ok(g.x >= 281.4);
  assert.equal(g.phase, "running");
});

test("greenhouse ramp chains a running approach into a jump without a forced climb", () => {
  for (const ramp of obstacles.filter(
    (o) => o.feature === "greenhouse" && o.kind === "ramp",
  )) {
    for (const speed of [9, 12, 13.5]) {
      const g = new Run();
      g.start();
      g.x = ramp.x - 0.1;
      g.speed = speed;
      let jumped = false;
      for (let tick = 0; tick < 400 && g.x < ramp.x + 12; tick++) {
        if (!jumped && g.x >= ramp.x + ramp.width - 0.6) {
          g.action("up");
          jumped = true;
        }
        if (!g.grounded && g.vy < -10 && g.y < 1.1) g.action("down");
        g.step();
        assert.ok(g.move !== "climb" && g.move !== "wall-climb");
      }
      assert.ok(jumped);
      assert.ok(g.x >= ramp.x + 12, `ramp ${ramp.x}, speed ${speed}`);
      assert.equal(g.phase, "running");
      assert.equal(g.recoveries, 0);
    }
  }
});

test("both full routes keep their flow across varied obstacle approach timings", () => {
  for (const upper of [false, true]) {
    for (const approach of [1.5, 2.2]) {
      const g = complete(upper, false, approach);
      assert.equal(
        g.phase,
        "finished",
        `route ${upper}, approach ${approach}, x ${g.x}`,
      );
      assert.equal(g.recoveries, 0, `route ${upper}, approach ${approach}`);
      assert.ok(g.time >= 180 && g.time <= 300);
      const inputs = g.inputs.filter((i) => i.action !== "down");
      for (let i = 1; i < inputs.length; i++) {
        assert.ok(
          (inputs[i].tick - inputs[i - 1].tick) * STEP >= 0.15,
          "chain must leave time for a separate deliberate input",
        );
      }
    }
  }
});

test("all 20 authored combos have five distinct contacts on both routes", () => {
  const groups = new Map<string, number[]>();
  for (const o of obstacles.filter((o) => o.combo)) {
    const key = `${o.route}:${o.combo}`;
    groups.set(key, [...(groups.get(key) ?? []), o.contact!]);
  }
  assert.equal(groups.size, 40);
  for (const contacts of groups.values())
    assert.deepEqual(contacts, [1, 2, 3, 4, 5]);
});
test("every signature responds on the next tick, preserves its route, and exits without a recovery", () => {
  for (const o of obstacles.filter((o) => o.kind === "signature")) {
    const g = new Run();
    g.start();
    g.x = o.x - 1.9;
    g.y = o.route === "upper" ? 3.3 : 0;
    g.upper = o.route === "upper";
    g.speed = 12;
    g.action("up");
    g.step();
    if (isSwing(o.technique)) {
      assert.equal(g.move, "jump");
      for (
        let tick = 0;
        tick < 100 && !g.traversal && g.phase === "running";
        tick++
      )
        g.step();
    }
    assert.equal(g.move, "special");
    assert.equal(g.frame().technique, o.technique);
    for (let tick = 0; tick < 240 && g.traversal; tick++) {
      g.step();
      assert.ok(Number.isFinite(g.x + g.y + g.vy));
    }
    assert.equal(g.traversal, null, `${o.technique} must terminate`);
    assert.equal(g.upper, o.route === "upper");
    assert.equal(g.recoveries, 0);
    if (isSwing(o.technique)) {
      assert.equal(g.grounded, false);
      advance(g, 0.35);
    }
    assert.ok(g.x > o.x + o.width);
  }
});
test("bar release changes exit timing without teleporting the runner", () => {
  const o = obstacles.find((o) => o.technique === "lache")!;
  const runs = [false, true].map((release) => {
    const g = new Run();
    g.start();
    g.x = o.x - 1.9;
    g.speed = 12;
    g.action("up");
    g.step();
    for (let tick = 0; tick < 100 && !g.traversal; tick++) g.step();
    for (let tick = 0; tick < 240 && g.traversal; tick++) {
      if (release && g.frame().progress > 0.5 && !g.traversal.released)
        g.action("forward");
      const x = g.x,
        y = g.y;
      g.step();
      assert.ok(Math.hypot(g.x - x, g.y - y) < 0.5);
    }
    return g;
  });
  assert.ok(runs[1].time < runs[0].time);
  assert.equal(runs[1].grounded, false);
  assert.ok(runs[1].x < runs[0].x);
  advance(runs[1], 0.45);
  assert.equal(runs[1].phase, "running");
});

test("cat catches offer a controlled lower exit", () => {
  const o = obstacles.find((o) => o.technique === "cat-leap")!;
  const g = new Run();
  g.start();
  g.x = o.x - 1.9;
  g.action("up");
  g.step();
  while (g.traversal && g.frame().progress < 0.4) g.step();
  g.action("down");
  g.step();
  assert.equal(g.traversal, null);
  assert.equal(g.move, "fall");
  advance(g, 0.5);
  assert.equal(g.phase, "running");
  assert.ok(g.grounded);
});

test("swing crossings have real voids and cannot be caught by walking", () => {
  for (const o of obstacles.filter((o) => isSwing(o.technique))) {
    const base = o.route === "upper" ? 3.3 : 0;
    assert.ok(
      !surfaces.some(
        (s) =>
          s.y === base &&
          s.start < o.x + o.width + SWING_GAP_EXTRA &&
          s.end > o.x,
      ),
    );
    const g = new Run();
    g.start();
    g.upper = o.route === "upper";
    g.x = o.x - 0.5;
    g.y = base;
    g.speed = 12;
    advance(g, 0.2);
    assert.equal(g.traversal, null);
    assert.equal(g.grounded, false);
    assert.ok(g.y < base);
  }
});

test("jump catch and manual release land across every bar gap", () => {
  for (const o of obstacles.filter((o) => isSwing(o.technique))) {
    for (const releaseAt of [0.4, 0.55, 0.7]) {
      const g = new Run();
      g.start();
      g.upper = o.route === "upper";
      g.x = o.x - 1.9;
      g.y = g.upper ? 3.3 : 0;
      g.speed = 12;
      g.action("up");
      g.step();
      assert.equal(g.grounded, false);
      assert.equal(g.traversal, null, "takeoff must precede the grab");
      for (let i = 0; i < 100 && !g.traversal; i++) g.step();
      assert.ok(g.traversal, o.technique);
      assert.ok(
        Math.abs(g.frame().contact!.x - (o.x + o.width - 0.2)) < 1e-8,
        "grip near the final rung",
      );
      while (g.traversal && g.frame().progress < releaseAt) g.step();
      g.action("forward");
      g.step();
      assert.equal(g.grounded, false);
      for (let i = 0; i < 150 && !g.grounded && g.phase === "running"; i++)
        g.step();
      assert.equal(g.phase, "running");
      assert.equal(g.grounded, true, `${o.technique} ${o.route} far bank`);
      assert.ok(g.x >= o.x + o.width + SWING_GAP_EXTRA);
      assert.equal(g.recoveries, 0);
    }
  }
});

test("bar gaps exceed the maximum ordinary long-jump range", () => {
  // Even an ideal same-height jump at maximum running flow cannot bridge these banks.
  const maxFlight = 13.6 / 30 + 13.6 / Math.sqrt(30 * 35.4);
  for (const o of obstacles.filter((o) => isSwing(o.technique))) {
    assert.ok(o.width + SWING_GAP_EXTRA > 13.5 * maxFlight + 0.44);
  }
});

test("a landing roll clears a low passage without a second down input", () => {
  const g = new Run();
  g.start();
  g.x = 91.1;
  g.move = "roll";
  g.moveTime = 1;
  let ticks = 0;
  while (g.x < 97 && ticks++ < 600) {
    g.step();
    assert.equal(g.recoveries, 0);
  }
  assert.ok(ticks < 600);
  assert.equal(g.move, "run");
});

test("each route separates mandatory slide obstacles with other contacts", () => {
  for (const route of ["lower", "upper"]) {
    const lane = obstacles.filter((o) => !o.route || o.route === route);
    for (let i = 1; i < lane.length; i++) {
      assert.ok(
        lane[i - 1].kind !== "slide" || lane[i].kind !== "slide",
        `${route}: consecutive slides at ${lane[i - 1].x} and ${lane[i].x}`,
      );
    }
  }
});

test("window roll exits lead into a vaultable obstacle on both routes", () => {
  for (const route of ["lower", "upper"]) {
    const lane = obstacles.filter((o) => !o.route || o.route === route);
    for (let i = 0; i < lane.length - 1; i++) {
      if (lane[i].feature === "window") assert.equal(lane[i + 1].kind, "vault");
    }
  }
});

test("side ramps sustain a downhill slide and launch across building gaps", () => {
  for (const ramp of obstacles.filter((o) => o.feature === "side-ramp")) {
    const g = new Run();
    g.start();
    g.x = ramp.x;
    g.speed = 12;
    while (g.x < ramp.x + ramp.width - 0.6) {
      g.step();
      assert.equal(g.grounded, true);
      assert.equal(g.move, "slide");
      assert.ok(g.frame().slope! < 0);
    }
    assert.ok(
      g.moveTime > 1,
      "slide persists beyond the normal slide duration",
    );
    assert.ok(g.y < -1);
    g.action("forward");
    g.step();
    assert.ok(g.vy > 0);
    for (let i = 0; i < 180 && !g.grounded && g.phase === "running"; i++)
      g.step();
    assert.equal(g.grounded, true);
    assert.ok(g.x >= ramp.x + ramp.width + 8.4, "lands on the next building");
  }
});

test("a side ramp requires a jump to reach the next building", () => {
  const ramp = obstacles.find((o) => o.feature === "side-ramp")!;
  const g = new Run();
  g.start();
  g.x = ramp.x;
  g.speed = 12;
  for (let i = 0; i < 600 && g.phase === "running"; i++) g.step();
  assert.equal(g.phase, "failed");
  assert.ok(g.x < ramp.x + ramp.width + 8.4);
});
