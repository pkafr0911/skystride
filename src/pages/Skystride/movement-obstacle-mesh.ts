import * as THREE from "three";
import { ground, Obstacle } from "./model";
import { SWING_GAP_EXTRA, swingGripOffset } from "./combos";
import type { ObstacleKit } from "./obstacle-mesh";

/** Alternate rooftop objects; the existing movement determines every contact plane. */
export function movementObstacle(o: Obstacle, kit: ObstacleKit) {
  const group = new THREE.Group();
  group.name = o.appearance!;
  group.position.set(o.x, ground(o.x, o.route === "upper"), 0);
  const w = o.width,
    h = o.height ?? 1.1;
  const box = (
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    material = kit.face,
  ) => {
    const mesh = new THREE.Mesh(kit.box, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    group.add(mesh);
    return mesh;
  };
  const tread = (x: number, y: number, width: number) => {
    box(x, y - 0.06, 0, width, 0.12, 2.6, kit.trim);
    box(x, y - 0.018, 1.32, width, 0.035, 0.025, kit.amber);
  };
  if (o.appearance === "expansion-joint") {
    // Two separated roof curbs, with the bellows below the void and behind the lane.
    for (const x of [-0.3, w + 0.3]) {
      // The physical bank roof owns y=0; keep the joint cap below its skin.
      tread(x, -0.04, 0.6);
      for (const z of [-1.1, 1.1]) box(x, -0.55, z, 0.18, 0.9, 0.18, kit.trim);
    }
    for (let x = 0.2; x < w; x += 0.4)
      box(x, -0.65, -1.6, 0.12, 0.7, 0.35, kit.dark);
    for (const z of [-1.5, 1.5]) box(w / 2, -1, z, w, 0.1, 0.12, kit.trim);
  } else if (o.appearance === "loading-shutter") {
    const ceiling = o.openingTop!;
    box(w / 2, (h - 0.12) / 2, 0, w, h - 0.12, 2.5);
    tread(w / 2, h, w);
    // Rolled shutter housing starts exactly at the original dive ceiling.
    box(w / 2, ceiling + 0.275, 0, w, 0.55, 2.6, kit.dark);
    for (let y = ceiling + 0.08; y < ceiling + 0.55; y += 0.12)
      box(w / 2, y, 1.32, w, 0.055, 0.045, kit.trim);
    for (const x of [0.08, w - 0.08]) {
      box(x, (ceiling + 0.55) / 2, -1.48, 0.16, ceiling + 0.55, 0.16, kit.trim);
      box(x, ceiling - 0.3, -1.35, 0.045, 0.6, 0.04, kit.dark);
    }
    box(w / 2, ceiling + 0.018, 1.32, w, 0.035, 0.025, kit.amber);
  } else if (o.appearance === "acoustic-wall") {
    // Ribbed mechanical-room sound screen shares the billboard's wall plane.
    box(w / 2, 2, -0.81, w, 4, 0.18, kit.dark);
    for (let x = 0.15; x < w; x += 0.45)
      box(x, 2, -0.75, 0.22, 3.7, 0.08, kit.face);
    for (const y of [0.15, 3.85]) box(w / 2, y, -0.74, w, 0.12, 0.06, kit.trim);
    for (const x of [0.1, w - 0.1]) box(x, 1, -1.1, 0.16, 6, 0.2, kit.trim);
    for (let x = 0.3; x < w; x += 1.2)
      box(x, 0.6 + (h * x) / w, -0.69, 0.35, 0.04, 0.025, kit.amber);
    tread(w + 1.5, h, 3);
  } else if (o.appearance === "maintenance-gantry") {
    const shimmy = o.technique === "shimmy";
    const span = shimmy ? w : w + SWING_GAP_EXTRA;
    // I-beam and triangular brackets are behind the hands, not in the flight lane.
    for (const y of [h + 0.15, h + 0.55])
      box(span / 2, y, -1.6, span + 0.7, 0.12, 0.45, kit.trim);
    box(span / 2, h + 0.35, -1.6, span + 0.7, 0.28, 0.1);
    for (const x of [-0.35, span + 0.35]) {
      box(x, (h + 0.55) / 2, -1.6, 0.18, h + 0.55, 0.18, kit.trim);
      box(
        x + (x < 0 ? 0.35 : -0.35),
        h - 0.15,
        -1.6,
        0.1,
        1,
        0.12,
        kit.trim,
      ).rotation.z = x < 0 ? -0.65 : 0.65;
    }
    const count = o.technique === "monkey" || shimmy ? 4 : 1;
    for (let i = 0; i < count; i++) {
      const x =
        count === 1 ? swingGripOffset(w) : 0.2 + (i * (w - 0.4)) / (count - 1);
      box(x, h, 0, 0.09, 0.09, 2.8, kit.amber);
      box(x, h + 0.13, -1.45, 0.1, 0.3, 0.12, kit.trim);
    }
  } else if (o.appearance === "chimney-plinth") {
    box(w / 2, (h - 0.12) / 2, 0, w, h - 0.12, 2.4);
    tread(w / 2, h, w);
    // A capped chimney base: recessed brick joints stop below the precision tread.
    for (let y = 0.18; y < h - 0.12; y += 0.22)
      box(w / 2, y, 1.215, w, 0.025, 0.025, kit.dark);
    for (let x = 0.35; x < w; x += 0.55)
      box(x, (h - 0.12) / 2, 1.215, 0.025, h - 0.12, 0.025, kit.dark);
  } else if (o.appearance === "fire-escape") {
    tread(w / 2, h, w);
    for (const x of [0.12, w - 0.12]) {
      box(x, h - 0.45, -0.85, 0.12, 0.7, 0.12, kit.trim).rotation.x = -0.7;
      box(x, h + 0.5, -1.45, 0.075, 1, 0.075, kit.trim);
    }
    box(w / 2, h + 1, -1.45, w, 0.07, 0.07, kit.trim);
    for (let x = 0.4; x < w; x += 0.4)
      box(x, h + 0.5, -1.45, 0.035, 1, 0.035, kit.trim);
    box(w / 2, h - 0.14, 1.28, w, 0.16, 0.07, kit.dark);
  } else if (o.appearance === "loading-ramp") {
    const length = Math.hypot(w, h),
      angle = Math.atan2(h, w);
    box(w / 2, h / 2 - 0.045, 0, length, 0.09, 2.8, kit.trim).rotation.z =
      angle;
    for (const z of [-1.5, 1.5]) {
      box(w / 2, h / 2 - 0.2, z, length, 0.25, 0.12, kit.dark).rotation.z =
        angle;
      for (let x = 0.5; x < w; x += 1.5)
        box(
          x,
          (h * x) / w / 2 - 0.1,
          z,
            0.09,
            Math.max(0.05, (h * x) / w - 0.2),
            0.09,
          kit.trim,
        );
    }
    for (let x = 0.3; x < w; x += 0.5)
      box(x, (h * x) / w + 0.009, 0, 0.055, 0.012, 2.7, kit.dark).rotation.z =
        angle;
    box(w - 0.05, h, 1.42, 0.1, 0.06, 0.04, kit.amber);
  } else if (o.appearance === "service-bulkhead") {
    box(w / 2, h / 2, -0.85, w, h, 0.16);
    for (const x of [0.12, w - 0.12])
      box(x, h / 2, -0.96, 0.16, h, 0.12, kit.trim);
    for (let y = 0.25; y < h - 0.2; y += 0.3)
      box(w / 2, y, -0.758, w * 0.65, 0.06, 0.008, kit.dark);
    box(w / 2, h, -0.65, w, 0.12, 0.4, kit.trim);
    box(w / 2, h + 0.02, -0.4, w, 0.04, 0.05, kit.amber);
  }
  return group;
}
