process.env.TS_NODE_PROJECT = "src/pages/Skystride/tsconfig.test.json";
require("ts-node/register");
const fs = require("node:fs");
const THREE = require("three");
const { makeRunner } = require("../src/pages/Skystride/runner");
const { Run } = require("../src/pages/Skystride/model");
const scene = new THREE.Scene(),
  runner = makeRunner(scene),
  game = new Run();
game.start();
const panels = [];
for (const [title, speed, move] of [
  ["CRUISE / 6 M/S", 6, "run"],
  ["SPRINT / 14 M/S", 14, "run"],
  ["KONG / CONTACT", 14, "vault"],
]) {
  const f = {
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
  };
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
  panels.push({ title, triangles });
}
fs.writeFileSync("/tmp/skystride-runner-study.json", JSON.stringify(panels));
runner.dispose();
