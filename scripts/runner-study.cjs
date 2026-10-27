process.env.TS_NODE_PROJECT = "src/pages/Skystride/tsconfig.test.json";
require("ts-node/register");
const fs = require("node:fs");
const THREE = require("three");
const { makeRunner } = require("../src/pages/Skystride/runner");
const { Run, obstacles, ground } = require("../src/pages/Skystride/model");
const scene = new THREE.Scene(),
  runner = makeRunner(
    scene,
    false,
    process.argv.find((arg) => arg.startsWith("--character="))?.split("=")[1],
  ),
  game = new Run();
game.start();
const panels = [];
const samples = [
  ["CRUISE / 6 M/S", 6, "run"],
  ["SPRINT / 14 M/S", 14, "run"],
  ["KONG / CONTACT", 14, "vault"],
].map(([title, speed, move]) => ({
  title,
  frame: {
    ...game.frame(),
    x: 3.5,
    speed,
    move,
    vault: "kong",
    progress: 0.45,
    y: move === "vault" ? 1.14 : 0,
    grounded: move === "run",
    contact: move === "vault" ? { x: 3.6, y: 1.1 } : null,
    landingAge: 1,
  },
}));
if (process.argv.includes("--run")) {
  samples.length = 0;
  for (const [i, x] of [0, 1.1, 2.2, 3.3].entries())
    samples.push({
      title: `SPRINT / PHASE ${i + 1}`,
      frame: {
        ...game.frame(),
        x,
        speed: 14,
        landingAge: 1,
      },
    });
}
if (process.argv.includes("--dash")) {
  samples.length = 0;
  const obstacle = obstacles.find((o) => o.vault === "dash");
  game.x = obstacle.x - 1.9;
  game.y = obstacle.route === "upper" ? 3.3 : 0;
  game.upper = obstacle.route === "upper";
  game.speed = 12;
  game.action("up");
  game.step();
  for (const [title, progress] of [
    ["TAKEOFF", 0.18],
    ["FEET LEAD", 0.36],
    ["PALM PUSH", 0.59],
    ["RELEASE", 0.75],
  ]) {
    while (game.traversal && game.frame().progress < progress) game.step();
    const frame = game.frame();
    const base = obstacle.route === "upper" ? 3.3 : 0;
    samples.push({
      title,
      frame: {
        ...frame,
        y: frame.y - base,
        contact: frame.contact && {
          ...frame.contact,
          y: frame.contact.y - base,
        },
      },
      obstacle: {
        x: obstacle.x - game.x,
        height: obstacle.height,
        width: obstacle.width,
      },
    });
  }
}
if (process.argv.includes("--wall")) {
  samples.length = 0;
  const wall = obstacles.find((o) => o.kind === "branch" && o.height);
  game.x = wall.x - 1.9;
  game.speed = 12;
  game.action("up");
  game.step();
  for (const [title, progress] of [
    ["FOOT PLANT", 0.35],
    ["DRIVE", 0.46],
    ["LIP CATCH", 0.57],
    ["PULL", 0.73],
    ["PALM PRESS", 0.85],
    ["TOP OUT", 0.97],
  ]) {
    while (game.traversal && game.frame().progress < progress) game.step();
    samples.push({
      title,
      frame: game.frame(),
      obstacle: { x: wall.x + wall.width - game.x, height: wall.height },
    });
  }
}
if (process.argv.includes("--front-flip")) {
  samples.length = 0;
  const { framesFor } = require("../src/pages/Skystride/lab-model");
  const frames = framesFor("front-flip", 12);
  for (const progress of [0, 0.2, 0.4, 0.6, 0.8, 0.98]) {
    const frame = frames.find(
      (f) => f.move === "front-flip" && f.progress >= progress,
    );
    samples.push({
      title: `FRONT FLIP / ${Math.round(progress * 100)}%`,
      frame: { ...frame, y: 0 },
    });
  }
}
if (process.argv.includes("--kash")) {
  samples.length = 0;
  const {
    framesFor,
    previewObstacles,
  } = require("../src/pages/Skystride/lab-model");
  const frames = framesFor("kash", 12).filter((f) => f.move === "vault");
  const obstacle = previewObstacles("kash")[0];
  for (const [title, progress] of [
    ["KONG ENTRY", 0.23],
    ["PUSH", 0.34],
    ["LEAD CLEARANCE", 0.45],
    ["TUCK THROUGH", 0.51],
    ["DASH PRESS", 0.65],
    ["EXIT", 0.85],
  ]) {
    const frame = frames.find((f) => f.progress >= progress);
    samples.push({
      title,
      frame,
      obstacle: {
        x: obstacle.x - frame.x,
        height: frame.contact.y,
        width: obstacle.width,
      },
    });
  }
}
if (process.argv.includes("--vaults")) {
  samples.length = 0;
  const {
    framesFor,
    previewObstacles,
  } = require("../src/pages/Skystride/lab-model");
  for (const move of [
    "speed",
    "hurdle",
    "one-hand",
    "safety",
    "lazy",
    "kong",
    "dash",
  ]) {
    const frames = framesFor(move, 12);
    const obstacle = previewObstacles(move)[0];
    const vault = frames.filter((f) => f.move === "vault");
    for (const [title, progress] of [
      ["ENTRY", 0.18],
      ["CONTACT", 0.4],
      ["CLEAR", 0.6],
      ["RELEASE", 0.8],
      ["TOUCHDOWN", 0.98],
      ["LAND", 1],
    ]) {
      const frame =
        progress === 1
          ? frames.find((f) => f.move === "land")
          : vault.find((f) => f.progress >= progress) ||
            vault[vault.length - 1];
      if (!frame) continue;
      samples.push({
        title: `${move.toUpperCase()} / ${title}`,
        frame,
        obstacle: {
          x: obstacle.x - frame.x,
          floor: ground(obstacle.x, obstacle.route === "upper"),
          height:
            ground(obstacle.x, obstacle.route === "upper") +
            (obstacle.height || 1.1),
          width: obstacle.width,
        },
      });
    }
  }
}
for (const { title, frame: f, obstacle } of samples) {
  runner.pose(f, 0, 0);
  runner.group.position.x = 0;
  runner.group.updateMatrixWorld(true);
  const triangles = [];
  runner.group.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry,
      position = geometry.attributes.position,
      indices = geometry.index;
    for (let i = 0; i < (indices ? indices.count : position.count); i += 3) {
      const points = [0, 1, 2].map((j) =>
        new THREE.Vector3()
          .fromBufferAttribute(position, indices ? indices.getX(i + j) : i + j)
          .applyMatrix4(mesh.matrixWorld),
      );
      triangles.push({
        points: points.map((p) => p.toArray()),
        depth: points.reduce((sum, p) => sum + p.z, 0) / 3,
        color: "#" + mesh.material.color.getHexString(),
      });
    }
  });
  triangles.sort((a, b) => a.depth - b.depth);
  panels.push({ title, triangles, obstacle });
}
fs.writeFileSync("/tmp/skystride-runner-study.json", JSON.stringify(panels));
runner.dispose();
