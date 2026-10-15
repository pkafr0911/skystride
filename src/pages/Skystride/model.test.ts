import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FINISH,
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
  for (let tick = 0; tick < 14000 && g.phase === "running"; tick++) {
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
        d <= (o.kind === "gap" ? 1.1 : early && o.kind === "vault" ? 4 : 1.9)
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
    assert.ok(g.time > 30 && g.time < 50);
  }
});
test("route choice and early vault jumps produce measurable time differences", () => {
  const lower = complete(),
    upper = complete(true),
    early = complete(false, true);
  assert.equal(early.phase, "finished");
  assert.ok(upper.time < lower.time, `${upper.time} vs ${lower.time}`);
  assert.ok(early.time > lower.time);
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
  while (replay.phase === "running" && replay.ticks < 14000) {
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
test("an early jump beneath the upper route hits its underside", () => {
  const g = new Run();
  g.start();
  g.x = 125;
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
