import { Frame, obstacles, Run, canMantle, ground } from "./model";
import { techniques, isSwing, comboNames, Technique } from "./combos";

export const options = [
  "run",
  "jump",
  "long-jump",
  "dash",
  "hurdle",
  "speed",
  "one-hand",
  "safety",
  "lazy",
  "kong",
  "slide",
  "mantle",
  "wall",
  "wall-climb",
  "wall-run",
  "dive",
  "roll",
  "catch",
  "landing",
  ...techniques,
  ...comboNames.map((name) => `combo:${name}` as const),
] as const;
export type Preview = (typeof options)[number];
export function minimumPreviewSpeed(move: Preview) {
  return move === "dive"
    ? 10.5
    : isSwing(move as Technique) || move === "catch"
      ? 12
      : 6;
}

export function previewObstacles(move: Preview) {
  if (move.startsWith("combo:"))
    return obstacles.filter(
      (o) => o.combo === move.slice(6) && o.route === "lower",
    );
  const o = obstacles.find((item) =>
    item.technique === move
      ? true
      : move === "wall-run"
        ? item.feature === "wall-billboard"
        : move === "dive"
          ? item.feature === "window"
          : move === "mantle"
            ? canMantle(item)
            : move === "safety" || move === "hurdle" || move === "one-hand"
              ? item.kind === "vault"
              : item.vault === move,
  );
  return o ? [o] : [];
}

export function framesFor(
  move: Preview,
  entrySpeed: number,
  releaseAt = 0.55,
): Frame[] {
  const speed = Math.max(minimumPreviewSpeed(move), entrySpeed);
  if (move.startsWith("combo:")) {
    const group = previewObstacles(move);
    const g = new Run();
    g.start();
    g.x = group[0].x - 3;
    g.y = ground(g.x, false);
    g.speed = speed;
    const frames: Frame[] = [],
      pressed = new Set<number>();
    for (
      let tick = 0;
      tick < 1200 &&
      g.phase === "running" &&
      g.x < group[group.length - 1].x + 7;
      tick++
    ) {
      const next = g.next();
      if (
        g.traversal?.move === "special" &&
        isSwing(g.traversal.technique) &&
        !g.traversal.released &&
        g.frame().progress > releaseAt
      )
        g.action("forward");
      if (
        next &&
        !g.traversal &&
        g.grounded &&
        !pressed.has(next.x) &&
        next.x - g.x <= 1.9
      ) {
        g.action(
          next.kind === "slide"
            ? "down"
            : next.feature === "window"
              ? "forward"
              : "up",
        );
        pressed.add(next.x);
      }
      g.step();
      frames.push(g.frame());
    }
    return frames;
  }
  const g = new Run();
  g.start();
  g.speed = speed;
  const o = previewObstacles(move)[0];
  if (o) {
    g.x = o.x - (move === "safety" ? 0.2 : isSwing(o.technique) ? 3.1 : 2);
    g.y = ground(o.x, o.route === "upper");
    g.upper = o.route === "upper";
  }
  if (move === "slide") g.x = 88.8;
  if (move === "wall") g.x = 288;
  if (move === "wall-climb") g.x = 113;
  if (move === "roll") {
    g.x = 196;
    g.y = 3.3;
    g.upper = true;
  }
  if (move === "landing") {
    g.x = 196;
    g.y = 3.3;
    g.upper = true;
  }
  if (move === "catch") {
    g.x = 70;
    g.grounded = false;
  }
  g.previous = g.frame();
  const frames: Frame[] = [g.frame()];
  let signatureSeen = false,
    settle = 0;
  for (
    let tick = 0;
    tick < (move === "run" ? 100 : 600) && g.phase === "running";
    tick++
  ) {
    if (tick === 12 && (move === "jump" || move === "long-jump"))
      g.speed = speed;
    if (
      tick === (move === "safety" ? 0 : 12) &&
      (o || move === "jump" || move === "wall" || move === "wall-climb")
    )
      g.action(move === "dive" ? "forward" : "up");
    if (tick === 12 && move === "long-jump") g.action("forward");
    if (tick === 26 && move === "catch") g.action("up");
    if (tick === 8 && move === "slide") g.action("down");
    if (move === "roll" && !g.grounded && g.y < 2.5 && g.y > 1)
      g.action("down");
    if (
      g.traversal?.move === "special" &&
      isSwing(g.traversal.technique) &&
      !g.traversal.released &&
      g.frame().progress > releaseAt
    )
      g.action("forward");
    g.step();
    if (
      g.traversal?.move === "vault" &&
      (move === "hurdle" || move === "one-hand")
    ) {
      g.traversal.vault = move;
      g.vault = move;
    }
    frames.push(g.frame());
    const f = g.frame();
    if (f.move !== "run" && f.move !== "fall") signatureSeen = true;
    if (
      signatureSeen &&
      !g.traversal &&
      g.grounded &&
      (f.move === "run" || f.move === "land" || f.move === "heavy-land")
    ) {
      settle++;
      // Stop before the course introduces another obstacle into this isolated study.
      const next = g.next();
      if (settle > 24 || (next && next.x - g.x < 0.7)) break;
    } else settle = 0;
  }
  return frames;
}
