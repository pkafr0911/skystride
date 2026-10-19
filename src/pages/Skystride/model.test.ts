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
  formatTime,
} from "./model";
function advance(g: Run, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / STEP); i++) g.step();
}
function complete(upper = false, early = false) {
  const g = new Run();
  g.start();
  const pressed = new Set<number>();
  for (let tick = 0; tick < 60000 && g.phase === "running"; tick++) {
    const o = g.next();
    if (o && !pressed.has(o.x) && !g.traversal) {
      const d = o.x - g.x;
      if (o.kind === "drop") {
        if (!g.grounded && g.y < 2.6) {
          g.action("down");
          pressed.add(o.x);
        }
      } else if (
        (o.kind !== "branch" || upper) &&
        g.grounded &&
        d <= (o.kind === "gap" ? 1.1 : early && o.kind === "vault" ? 6 : 1.9)
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
      g.inputs.length >= 350,
      "Full course should demand roughly three times the former input count",
    );
    const intervals = g.inputs
      .slice(1)
      .map((input, i) => (input.tick - g.inputs[i].tick) * STEP)
      .sort((a, b) => a - b);
    assert.ok(
      intervals[Math.floor(intervals.length / 2)] <= 0.65,
      "Typical action cadence should be below 650 ms",
    );
    assert.ok(g.time >= 180 && g.time <= 300);
  }
});
test("clean hard routes beat normal routes; mistimed chains can lose the speed needed for gaps", () => {
  const lower = complete(),
    upper = complete(true),
    early = complete(false, true);
  assert.ok(upper.time < lower.time, `${upper.time} vs ${lower.time}`);
  assert.ok(early.recoveries > 0);
  assert.ok(early.phase === "failed" || early.time > lower.time);
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
  g.x = 70;
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
  g.x = 44.1;
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
