import * as THREE from "three";
import type { Obstacle } from "./model";
import type { ObstacleKit } from "./obstacle-mesh";
import { ground } from "./sunset-course";
import { SWING_GAP_EXTRA, swingGripOffset } from "./combos";

/** All decoration is outside the travel lane; collision planes match the course. */
export function vietnamObstacle(o: Obstacle, kit: ObstacleKit) {
  const group = new THREE.Group();
  group.name = o.vietnam!;
  group.position.set(o.x, (kit.ground ?? ground)(o.x, o.route === "upper"), 0);
  const palette = kit.vietnamPalette;
  const wood = palette?.wood ?? kit.face;
  const cream = palette?.cream ?? kit.face;
  const jade = palette?.jade ?? kit.panel;
  const coral = palette?.coral ?? kit.amber;
  const leaf = palette?.leaf ?? kit.dark;
  const steel = palette?.steel ?? kit.trim;
  const w = o.width,
    h = o.height ?? (o.kind === "slide" ? 2.35 : 1.1);
  const box = (
    x: number,
    y: number,
    z: number,
    a: number,
    b: number,
    c: number,
    mat: THREE.Material = wood,
  ) => {
    const m = new THREE.Mesh(kit.box, mat);
    m.position.set(x, y, z);
    m.scale.set(a, b, c);
    group.add(m);
    return m;
  };
  const cylinder = (
    x: number,
    y: number,
    z: number,
    r: number,
    height: number,
    mat: THREE.Material = steel,
  ) => {
    const m = new THREE.Mesh(kit.cylinder, mat);
    m.position.set(x, y, z);
    m.scale.set(r, height, r);
    group.add(m);
    return m;
  };
  const edge = (x: number, y: number, width: number, z = 1.26) =>
    box(x, y, z, width, 0.035, 0.05, kit.amber);
  const plant = (x: number, y: number, z: number) => {
    cylinder(x, y + 0.12, z, 0.18, 0.24, coral);
    for (let i = 0; i < 3; i++) {
      const frond = box(x + (i - 1) * 0.13, y + 0.4, z, 0.08, 0.55, 0.2, leaf);
      frond.rotation.z = (i - 1) * 0.55;
    }
  };
  if (o.vietnam === "fruit-crate-bench") {
    // A continuous cap is the exact physical vault top; crate slats sit beneath it.
    box(w / 2, h - 0.045, 0, w, 0.09, 2.4, wood);
    for (const z of [-1.1, 1.1]) {
      for (let y = 0.1; y < h - 0.09; y += 0.18)
        box(w / 2, y, z, w, 0.11, 0.12, wood);
      for (const x of [0.08, w - 0.08]) box(x, h / 2, z, 0.1, h, 0.14, cream);
    }
    for (let i = 0; i < Math.min(5, Math.ceil(w / 0.4)); i++)
      cylinder(
        ((i + 0.5) * w) / Math.min(5, Math.ceil(w / 0.4)),
        h * 0.35,
        0.6,
        0.1,
        0.15,
        coral,
      );
    edge(w / 2, h, w);
  } else if (o.vietnam === "awning-crossbar") {
    const underside = 1.22;
    box(w / 2, (h + underside) / 2, 0, w, h - underside, 2.4, jade);
    for (const x of [0.08, w - 0.08])
      box(x, h / 2, -1.35, 0.12, h, 0.12, steel);
    // Fabric is recessed behind the slide corridor, with no extra obstacle above the top.
    const count = Math.max(2, Math.ceil(w / 0.6));
    for (let i = 0; i < count; i++)
      box(
        ((i + 0.5) * w) / count,
        h - 0.04,
        -1.65,
        w / count,
        0.08,
        0.6,
        i % 2 ? cream : coral,
      );
    edge(w / 2, underside, w);
    edge(w / 2, h, w);
  } else if (o.vietnam === "water-tank-deck") {
    box(w / 2, h - 0.2, 0, w, 0.4, 2.6, steel);
    for (const x of [0.15, w - 0.15]) box(x, h / 2, -1.2, 0.15, h, 0.15, steel);
    cylinder(w / 2, h + 1.1, -2.3, 1.05, 2.2, steel);
    for (let y = 0; y <= 2.2; y += 0.28)
      cylinder(w / 2, h + y, -2.3, 1.08, 0.035, cream);
    cylinder(w / 2, h + 2.25, -2.3, 0.25, 0.1, steel);
    // Service step is where the existing tank forward action places the runner.
    box(0.65, 0.425, 2, 1.3, 0.85, 0.25, wood);
    edge(0.65, 0.87, 1.3, 2.14);
    edge(w / 2, h, w);
  } else if (o.vietnam === "cafe-sign") {
    box(w / 2, 2, -0.8, w, 4, 0.18, cream);
    for (const y of [0.08, 3.92]) box(w / 2, y, -0.68, w, 0.12, 0.12, wood);
    for (const x of [0.08, w - 0.08]) box(x, 2, -0.68, 0.12, 4, 0.12, wood);
    // A raised coffee-cup emblem reads as a cafe sign without a texture dependency.
    box(w / 2, 2.3, -0.65, Math.min(w * 0.38, 1.1), 0.7, 0.08, coral);
    box(w / 2, 1.86, -0.65, Math.min(w * 0.5, 1.4), 0.06, 0.1, coral);
    for (const dx of [-0.2, 0.2])
      box(w / 2 + dx, 3, -0.65, 0.05, 0.35, 0.08, coral).rotation.z = -0.2;
    box(w + 1.5, h - 0.09, 0, 3, 0.18, 2.6, cream);
    edge(w + 1.5, h, 3);
    if (o.wallGap)
      for (const x of [0.65, w + 0.35])
        box(x, 0.8, -1.15, 0.2, 5.2, 0.25, steel);
  } else if (o.vietnam === "market-shutter") {
    const ceiling = o.openingTop!;
    box(w / 2, h / 2, 0, w, h, 2.6, cream);
    edge(w / 2, h, w);
    box(w / 2, ceiling + 0.275, 0, w, 0.55, 2.6, jade);
    for (let y = ceiling + 0.04; y < ceiling + 0.55; y += 0.09)
      box(w / 2, y, 1.31, w, 0.025, 0.04, steel);
    for (const x of [0.08, w - 0.08])
      box(x, (ceiling + 0.55) / 2, -1.48, 0.16, ceiling + 0.55, 0.16, wood);
    edge(w / 2, ceiling, w);
  } else if (o.vietnam === "drying-rack") {
    const shimmy = o.technique === "shimmy";
    const span = shimmy ? w : w + SWING_GAP_EXTRA;
    for (const x of [-0.35, span + 0.35]) {
      box(x, h / 2, -1.45, 0.13, h, 0.13, steel);
      box(x, 0.08, -1.45, 0.65, 0.16, 0.65, cream);
    }
    box(span / 2, h, -1.45, span + 0.7, 0.14, 0.14, steel);
    const count = o.technique === "monkey" || shimmy ? 4 : 1;
    for (let i = 0; i < count; i++) {
      const x =
        count === 1 ? swingGripOffset(w) : 0.2 + (i * (w - 0.4)) / (count - 1);
      box(x, h, 0, 0.09, 0.09, 2.8, kit.amber);
    }
    // Laundry hangs behind the rack, never across the grip or flight corridor.
    for (let x = 0.8; x < span - 0.5; x += 2.4) {
      box(
        x,
        h - 0.55,
        -1.85,
        0.7,
        0.95,
        0.035,
        Math.floor(x) % 2 ? cream : coral,
      );
      box(x, h, -1.85, 0.07, 0.12, 0.07, wood);
    }
  } else if (o.vietnam === "terrazzo-planter") {
    if (o.kind === "ledge") {
      box(w / 2, h - 0.09, 0, w, 0.18, 2.6, cream);
      for (const x of [0.15, w - 0.15])
        box(x, h / 2, -1.25, 0.12, h, 0.12, steel);
    } else box(w / 2, h / 2, 0, w, h, 2.4, cream);
    edge(w / 2, h, w);
    box(w / 2, h + 0.16, -1.65, w, 0.32, 0.5, cream);
    for (let x = 0.25; x < w; x += 0.6) plant(x, h + 0.32, -1.65);
    for (let x = 0.1; x < w; x += 0.35)
      box(x, h - 0.065, 1.31, 0.045, 0.04, 0.012, coral);
  } else if (o.vietnam === "plank-ramp") {
    const z = o.feature === "side-ramp" ? 2.9 : 0;
    const width = o.feature === "side-ramp" ? 1.5 : 2.8;
    const angle = Math.atan2(h, w),
      length = Math.hypot(w, h);
    // Offset along the plane normal so the plank's top is exactly the simulation slope.
    const t = 0.09;
    box(
      w / 2 + (Math.sin(angle) * t) / 2,
      h / 2 - (Math.cos(angle) * t) / 2,
      z,
      length,
      t,
      width,
      wood,
    ).rotation.z = angle;
    for (let x = 0.4; x < w; x += 0.65)
      box(x, (h * x) / w - 0.008, z, 0.025, 0.012, width, cream).rotation.z =
        angle;
    for (const dz of [-width / 2, width / 2])
      box(w / 2, h / 2 - 0.12, z + dz, length, 0.1, 0.06, steel).rotation.z =
        angle;
    edge(w - 0.05, h, 0.1, z + width / 2);
  }
  return group;
}
