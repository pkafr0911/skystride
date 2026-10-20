// Inspect the same procedural geometry as the course without a browser/WebGL context.
process.env.TS_NODE_PROJECT = "src/pages/Skystride/tsconfig.test.json";
require("ts-node/register");
const fs = require("node:fs");
const THREE = require("three");
const { obstacles } = require("../src/pages/Skystride/model");
const { creativeObstacle } = require("../src/pages/Skystride/obstacle-mesh");
const box = new THREE.BoxGeometry(),
  cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
const materials = [0x40506a, 0x101c2c, 0x718097, 0xf3ae65, 0x203958].map(
  (color) => new THREE.MeshBasicMaterial({ color }),
);
const kit = {
  box,
  cylinder,
  face: materials[0],
  dark: materials[1],
  trim: materials[2],
  amber: materials[3],
  panel: materials[4],
};
const panels = [];
const signatureStudy = process.argv.includes("--signatures");
const entries = signatureStudy
  ? require("../src/pages/Skystride/combos").techniques.map((t) => [
      t,
      t.replaceAll("-", " ").toUpperCase(),
    ])
  : [
      ["vent-bank", "SPLIT VENTILATION BANK"],
      ["pipe", "PIPE CROSSING"],
      ["solar", "SOLAR LAUNCH RAMP"],
      ["window", "CONSTRUCTION WINDOW"],
      ["tank", "WATER-TANK CRADLE"],
      ["wall-billboard", "WALL-RUN BILLBOARD"],
      ["bridge", "BROKEN MAINTENANCE BRIDGE"],
      ["greenhouse", "GREENHOUSE SERVICE LINE"],
      ["scaffold", "HANGING SCAFFOLD"],
      ["balcony", "STAGGERED BALCONIES"],
    ];
for (const [feature, title] of entries) {
  const pieces = signatureStudy
    ? obstacles
        .filter((o) => o.technique === feature && o.route === "lower")
        .slice(0, 1)
    : obstacles.filter((o) => o.feature === feature && o.x < 480);
  const start = pieces[0].x,
    end =
      pieces.at(-1).x +
      pieces.at(-1).width +
      (feature === "wall-billboard" ? 3 : 0);
  const scene = new THREE.Group();
  for (const o of pieces)
    scene.add(
      creativeObstacle(
        { ...o, route: "lower", x: o.x - (start + end) / 2 },
        kit,
      ),
    );
  const roof = new THREE.Mesh(box, materials[1]);
  roof.position.set(0, -0.15, 0);
  roof.scale.set(end - start + 2, 0.3, 4);
  if (["underbar", "lache", "monkey"].includes(feature)) {
    for (const [a, b] of [
      [start - 3, start],
      [end + 1.4, end + 4.4],
    ]) {
      const bank = new THREE.Mesh(box, materials[1]);
      bank.position.set((a + b - start - end) / 2, -0.15, 0);
      bank.scale.set(b - a, 0.3, 4);
      scene.add(bank);
    }
  } else if (feature !== "bridge" && feature !== "scaffold") scene.add(roof);
  const width = Math.max(11, end - start + 3);
  const camera = new THREE.OrthographicCamera(
    -width / 2,
    width / 2,
    width * 0.38,
    -width * 0.38,
    0.1,
    100,
  );
  camera.position.set(3, 4, 16);
  camera.lookAt(0, 2, 0);
  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  const triangles = [];
  scene.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const positions = mesh.geometry.attributes.position,
      indices = mesh.geometry.index;
    for (let i = 0; i < indices.count; i += 3) {
      const world = [0, 1, 2].map((j) =>
        new THREE.Vector3()
          .fromBufferAttribute(positions, indices.getX(i + j))
          .applyMatrix4(mesh.matrixWorld),
      );
      const normal = world[1]
        .clone()
        .sub(world[0])
        .cross(world[2].clone().sub(world[0]))
        .normalize();
      const viewNormal = normal
        .clone()
        .transformDirection(camera.matrixWorldInverse);
      if (viewNormal.z <= 0) continue;
      const shade =
        0.6 +
        0.4 *
          Math.max(0, normal.dot(new THREE.Vector3(-0.4, 0.8, 1).normalize()));
      const color = mesh.material.color.clone().multiplyScalar(shade);
      triangles.push({
        points: world.map((p) => {
          const v = p.clone().project(camera);
          return [(v.x + 1) / 2, (1 - v.y) / 2, v.z];
        }),
        depth:
          world.reduce(
            (sum, p) =>
              sum + p.clone().applyMatrix4(camera.matrixWorldInverse).z,
            0,
          ) / 3,
        color: "#" + color.getHexString(),
      });
    }
  });
  triangles.sort((a, b) => a.depth - b.depth);
  panels.push({ title, triangles });
}
fs.writeFileSync("/tmp/skystride-obstacle-study.json", JSON.stringify(panels));
box.dispose();
cylinder.dispose();
materials.forEach((m) => m.dispose());
