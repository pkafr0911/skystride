// Inspect the same procedural geometry as the course without a browser/WebGL context.
process.env.TS_NODE_PROJECT = "src/pages/Skystride/tsconfig.test.json";
require("ts-node/register");
const fs = require("node:fs");
const THREE = require("three");
const { SWING_GAP_EXTRA } = require("../src/pages/Skystride/game/combos");
const { obstacles } = require("../src/pages/Skystride/game/model");
const { creativeObstacle } = require("../src/pages/Skystride/obstacles/obstacle-mesh");
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
const vietnamStudy = process.argv.includes("--vietnam");
const vietnamCourse = vietnamStudy
  ? require("../src/pages/Skystride/courses/levels").saigonRooftops
  : null;
if (vietnamStudy) {
  const colors = {
    wood: 0x9a7151,
    cream: 0xddc9a0,
    jade: 0x397d77,
    coral: 0xc56d54,
    leaf: 0x4c7850,
    steel: 0xa4b0ad,
  };
  kit.vietnamPalette = Object.fromEntries(
    Object.entries(colors).map(([key, color]) => {
      const material = new THREE.MeshBasicMaterial({ color });
      materials.push(material);
      return [key, material];
    }),
  );
  kit.ground = () => 0;
}
const panels = [];
const signatureStudy = process.argv.includes("--signatures");
const equipmentStudy = process.argv.includes("--equipment");
const movementStudy = process.argv.includes("--movement-props");
const entries = vietnamStudy
  ? [
      ["fruit-crate-bench", "FRUIT CRATE BENCH / VAULT"],
      ["awning-crossbar", "AWNING CROSSBAR / SLIDE"],
      ["water-tank-deck", "WATER TANK SERVICE DECK / CLIMB"],
      ["cafe-sign", "CAFE SIGN / WALL RUN"],
      ["market-shutter", "MARKET SHUTTER / DIVE"],
      ["drying-rack", "DRYING RACK / GRAB AND SWING"],
      ["terrazzo-planter", "TERRAZZO PLANTER / PRECISION"],
      ["plank-ramp", "MAINTENANCE PLANK RAMP / JUMP"],
    ]
  : movementStudy
    ? [...new Set(obstacles.map((o) => o.appearance).filter(Boolean))].map(
        (name) => [name, name.replaceAll("-", " ").toUpperCase()],
      )
    : equipmentStudy
      ? [
          ["ac-condenser", "AC CONDENSER"],
          ["cable-reels", "CABLE REELS"],
          ["utility-cabinet", "UTILITY CABINET"],
          ["maintenance-cart", "MAINTENANCE CART"],
          ["roof-hatch", "ROOF ACCESS HATCH"],
          ["duct-elbow", "DUCT ELBOW"],
          ["safety-barricade", "SAFETY BARRICADE"],
          ["antenna-base", "ANTENNA BASE"],
          ["freight-crate", "STRAPPED FREIGHT CRATE"],
          ["hose-station", "HOSE-REEL STATION"],
          ["cable-gantry", "OVERHEAD CABLE TRAY"],
        ]
      : signatureStudy
        ? require("../src/pages/Skystride/game/combos").techniques.map((t) => [
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
  const pieces = vietnamStudy
    ? vietnamCourse.obstacles
        .filter(
          (o) =>
            o.vietnam === feature &&
            (feature !== "plank-ramp" ||
              (o.height > 0 && o.feature !== "side-ramp")) &&
            (feature !== "drying-rack" || o.technique === "lache") &&
            (feature !== "terrazzo-planter" || o.technique === "precision"),
        )
        .slice(0, 1)
    : movementStudy
      ? obstacles.filter((o) => o.appearance === feature).slice(0, 1)
      : equipmentStudy
        ? obstacles.filter((o) => o.design === feature).slice(0, 1)
        : signatureStudy
          ? obstacles
              .filter((o) => o.technique === feature && o.route === "lower")
              .slice(0, 1)
          : obstacles.filter((o) => o.feature === feature && o.x < 480);
  if (pieces.length === 0) {
    console.warn(
      `Skipping obstacle study entry "${feature}": no matching obstacles.`,
    );
    continue;
  }
  const start = pieces[0].x,
    end =
      pieces.at(-1).x +
      pieces.at(-1).width +
      (feature === "wall-billboard" || feature === "cafe-sign" ? 3 : 0);
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
  if (
    [
      "underbar",
      "lache",
      "monkey",
      "maintenance-gantry",
      "drying-rack",
    ].includes(feature)
  ) {
    for (const [a, b] of [
      [start - 3, start],
      [end + SWING_GAP_EXTRA, end + SWING_GAP_EXTRA + 3],
    ]) {
      const bank = new THREE.Mesh(box, materials[1]);
      bank.position.set((a + b - start - end) / 2, -0.15, 0);
      bank.scale.set(b - a, 0.3, 4);
      scene.add(bank);
    }
  } else if (
    feature !== "bridge" &&
    feature !== "scaffold" &&
    feature !== "roof-hatch" &&
    feature !== "expansion-joint"
  )
    scene.add(roof);
  const width = Math.max(11, end - start + SWING_GAP_EXTRA + 6);
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
