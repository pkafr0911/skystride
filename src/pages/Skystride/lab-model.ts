import { Frame, obstacles, Run, canMantle, ground } from "./model";
import { techniques, isSwing, comboNames } from "./combos";

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
  if (move.startsWith("combo:")) {
    const group = previewObstacles(move);
    const g = new Run();
    g.start();
    g.x = group[0].x - 3;
    g.y = ground(g.x, false);
    g.speed = entrySpeed;
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
  g.speed = entrySpeed;
  const o = obstacles.find((item) =>
    item.technique === move
      ? true
      : move === "wall-run"
        ? item.feature === "wall-billboard"
        : move === "dive"
          ? item.feature === "window"
          : move === "mantle"
            ? canMantle(item)
            : move === "safety"
              ? item.kind === "vault"
              : move === "hurdle" || move === "one-hand"
                ? item.kind === "vault"
                : item.vault === move,
  );
  if (o) {
    g.x = o.x - (isSwing(o.technique) ? 3.1 : 2);
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
  const frames: Frame[] = [];
  let signatureSeen = false,
    settle = 0;
  for (let tick = 0; tick < (move === "wall-climb" ? 330 : 210); tick++) {
    if (tick === 12 && (move === "jump" || move === "long-jump"))
      g.speed = entrySpeed;
    if (tick === 12 && move === "safety" && o) g.x = o.x - 0.2;
    if (
      tick === 12 &&
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
    if (g.frame().technique === move) signatureSeen = true;
    if (signatureSeen && !g.traversal && g.grounded && ++settle > 24) break;
  }
  return frames;
}
