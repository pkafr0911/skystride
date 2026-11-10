import * as THREE from "three";
import type { Obstacle } from "../game/model";
import type { ObstacleKit } from "./obstacle-mesh";
import { ropeAnchor } from "../game/kiln-movement";
import { swingGripOffset } from "../game/combos";

/** Original kiln kit. Decorative volumes stay behind the physical running strip. */
export function kilnObstacle(o: Obstacle, kit: ObstacleKit) {
  const group = new THREE.Group();
  group.name = o.kiln!;
  group.position.set(o.x, kit.ground?.(o.x, o.route === "upper") ?? 0, 0);
  const { brick, chalk, wood, indigo } = kit.kilnPalette ?? {
    brick: kit.face,
    chalk: kit.trim,
    wood: kit.dark,
    indigo: kit.panel,
  };
  const w = o.width,
    h = o.height ?? 1.1;
  const box = (
    x: number,
    y: number,
    z: number,
    a: number,
    b: number,
    c: number,
    mat: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(kit.box, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(a, b, c);
    group.add(mesh);
    return mesh;
  };
  const drum = (
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
    mat: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(kit.cylinder, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(radius, height, radius);
    group.add(mesh);
    return mesh;
  };
  const edge = (x: number, y: number, length: number) =>
    box(x, y, 1.21, length, 0.04, 0.045, kit.amber);
  if (o.kiln === "press-table") {
    box(w / 2, h - 0.12, 0, w, 0.24, 2.4, chalk);
    for (const x of [0.18, w - 0.18]) {
      box(x, (h - 0.24) / 2, 0, 0.18, h - 0.24, 2, wood);
      box(x, 0.08, 0, 0.4, 0.16, 2.3, wood);
    }
    box(w / 2, 0.25, 0, w, 0.14, 0.18, wood);
    box(w / 2, h - 0.1, -1.7, w, 0.18, 0.6, brick);
    edge(w / 2, h, w);
  } else if (o.kiln === "drying-beam") {
    box(w / 2, (h + 1.22) / 2, 0, w, h - 1.22, 2.4, wood);
    for (const x of [0.12, w - 0.12]) box(x, h / 2, -1.55, 0.24, h, 0.5, brick);
    for (let y = 0.4; y < h; y += 0.5) {
      box(w / 2, y, -2.1, w, 0.08, 0.8, chalk);
      drum(w / 2, y + 0.15, -2.1, 0.24, 0.25, brick);
    }
    edge(w / 2, 1.22, w);
  } else if (o.kiln === "kiln-portal") {
    box(w / 2, h / 2, 0, w, h, 2.4, brick);
    box(w / 2, o.openingTop! + 0.275, 0, w, 0.55, 2.4, chalk);
    for (const x of [0.12, w - 0.12]) box(x, 2, -1.5, 0.24, 4, 0.3, brick);
    for (let x = 0.2; x < w; x += 0.45)
      box(x, 3.9, 1.69, 0.3, 0.18, 0.08, indigo);
    edge(w / 2, h, w);
    edge(w / 2, o.openingTop!, w);
  } else if (o.kiln === "kiln-buttress") {
    if (o.technique === "wall-kick") {
      // Foot plant beside a real void. No invisible solid wall across the lane.
      box(0.8, 1.7, -0.8, 1.6, 3.4, 0.5, brick);
      box(0.9, 1.3, -0.52, 0.7, 0.3, 0.06, kit.amber);
      drum(0.8, 2, -2.9, 1.8, 4, brick);
      for (let y = 0.5; y < 3.5; y += 0.6)
        box(0.8, y, -0.53, 1.5, 0.025, 0.03, chalk);
      edge(w + 0.3, 0, 0.6);
    } else {
      drum(w / 2, 2, -3.4, 2.4, 4, brick);
      box(w / 2, 1.5, -0.9, w, 3, 0.4, brick);
      box(w + 1.5, h - 0.09, 0, 3, 0.18, 2.4, chalk);
      box(w / 2, 1.4, -0.67, w, 0.08, 0.04, kit.amber);
      edge(w + 1.5, h, 3);
    }
  } else if (o.kiln === "glaze-steps") {
    box(w / 2, h / 2, 0, w, h, 2.4, chalk);
    for (let i = 0; i < 3; i++)
      box(
        w / 2,
        ((i + 1) * h) / 6,
        -1.6 - (2 - i) * 0.3,
        w,
        ((i + 1) * h) / 3,
        0.3,
        brick,
      );
    drum(w / 2, h + 0.25, -2.4, 0.6, 0.5, indigo);
    edge(w / 2, h, w);
  } else if (o.kiln === "tile-hoist") {
    const anchor = ropeAnchor(swingGripOffset(w), h);
    for (const x of [anchor.x - 1.4, anchor.x + 1.4]) {
      const leg = box(x, anchor.y / 2, -1.7, 0.3, anchor.y, 0.35, wood);
      leg.rotation.z = x < anchor.x ? -0.18 : 0.18;
      box(x, 0.15, -1.7, 1, 0.3, 1, chalk);
    }
    box(anchor.x, anchor.y, -1.7, 3.2, 0.35, 0.4, wood);
    box((w + 10.2) / 2, -0.3, -1.9, w + 11.2, 0.6, 1.2, brick);
    box(anchor.x, anchor.y, -0.5, 0.4, 0.3, 2.6, wood);
    drum(anchor.x, anchor.y + 0.12, -1.8, 0.38, 0.3, indigo);
    // The hanging rope is animated separately from the static mesh batch.
    edge(w + 10.5, 0, 0.6);
  } else if (o.kiln === "ceramic-pedestal") {
    box(w / 2, h / 2, 0, w, h, 2.4, chalk);
    for (const x of [w / 2 - 1.2, w / 2 + 1.2])
      box(x, (h + 0.5) / 2, -2, 0.3, h + 0.5, 0.3, indigo);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI,
        b = ((i + 1) / 8) * Math.PI;
      const x1 = w / 2 + Math.cos(a) * 1.2,
        y1 = h + 0.5 + Math.sin(a) * 1.9;
      const x2 = w / 2 + Math.cos(b) * 1.2,
        y2 = h + 0.5 + Math.sin(b) * 1.9;
      box(
        (x1 + x2) / 2,
        (y1 + y2) / 2,
        -2,
        Math.hypot(x2 - x1, y2 - y1) + 0.08,
        0.3,
        0.3,
        indigo,
      ).rotation.z = Math.atan2(y2 - y1, x2 - x1);
    }
    edge(w / 2, h, w);
  } else if (o.kiln === "loading-wedge") {
    const angle = Math.atan2(h, w),
      length = Math.hypot(w, h),
      thickness = 0.12;
    box(
      w / 2 + (Math.sin(angle) * thickness) / 2,
      h / 2 - (Math.cos(angle) * thickness) / 2,
      0,
      length,
      thickness,
      2.4,
      brick,
    ).rotation.z = angle;
    for (let i = 1; i < 16; i++) {
      const top = (h * i) / 16 - 0.12;
      if (top > 0)
        box((w * (i + 0.5)) / 16, top / 2, 0, w / 16, top, 2.35, brick);
    }
    for (let x = 0.3; x < w; x += 0.55)
      box(x, (h * x) / w - 0.015, 0, 0.09, 0.02, 2.3, wood).rotation.z = angle;
    edge(w - 0.1, h, 0.2);
  } else if (o.kiln === "inspection-trench") {
    for (const x of [-0.15, w + 0.15]) {
      box(x, -0.5, 0, 0.3, 1, 2.4, brick);
      edge(x, 0, 0.3);
    }
  } else if (o.kiln === "retaining-steps") {
    // Surface elevation is owned by the course. Stone facing follows that surface.
    const landingY =
      (kit.ground?.(o.x + w + 0.01, false) ?? 0) - group.position.y;
    box(w + 7, landingY - 0.5, -1.7, 14, 1, 0.7, chalk);
    box(w + 7, landingY - 0.04, -1.7, 14, 0.08, 0.8, indigo);
    for (const x of [0, w, w + 6, w + 14]) {
      const localY =
        (kit.ground?.(o.x + x + 0.01, false) ?? 0) - group.position.y;
      box(x, localY - 0.5, -1.7, 0.3, 1, 0.5, chalk);
      box(x, localY, -1.7, 0.45, 0.06, 0.6, indigo);
    }
  }
  return group;
}
