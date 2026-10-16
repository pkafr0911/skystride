// Export the exact live articulated geometry as a reusable GLB for asset inspection/DCC work.
process.env.TS_NODE_PROJECT = "src/pages/Skystride/tsconfig.test.json";
require("ts-node/register");
const fs = require("node:fs");
const THREE = require("three");
const { makeRunner } = require("../src/pages/Skystride/runner");
const { Run } = require("../src/pages/Skystride/model");
global.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};
(async () => {
  const { GLTFExporter } = await import(
    "three/addons/exporters/GLTFExporter.js"
  );
  const scene = new THREE.Scene();
  const model = makeRunner(scene);
  const game = new Run();
  game.start();
  model.pose({ ...game.frame(), x: 0.5, speed: 14 }, 0, 0);
  model.group.position.set(0, 0, 0);
  model.group.children.forEach((part, i) => {
    part.name = `Runner_Part_${String(i).padStart(2, "0")}`;
  });
  model.group.userData = {
    title: "Skystride / Silhouette Runner",
    author: "Skystride",
    rig: "Articulated mesh parts; runtime IK controller in runner.ts",
  };
  const data = await new GLTFExporter().parseAsync(model.group, {
    binary: true,
  });
  fs.mkdirSync("public/models", { recursive: true });
  fs.writeFileSync("public/models/skystride-runner.glb", Buffer.from(data));
  model.dispose();
  console.log(`Exported skystride-runner.glb (${data.byteLength} bytes)`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
