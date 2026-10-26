import * as THREE from "three";
import { ground, Obstacle } from "./model";
import type { ObstacleKit } from "./obstacle-mesh";

/** Real rooftop equipment, built from the scene's shared, batchable resources. */
export function equipmentObstacle(o: Obstacle, kit: ObstacleKit): THREE.Group {
  const g = new THREE.Group();
  g.name = o.design!;
  g.position.set(o.x, ground(o.x, o.route === "upper"), 0);
  const w = o.width,
    h = o.height ?? (o.kind === "slide" ? 2.35 : 1);
  const box = (
    x: number,
    y: number,
    z: number,
    a: number,
    b: number,
    c: number,
    m = kit.face,
  ) => {
    const mesh = new THREE.Mesh(kit.box, m);
    mesh.position.set(x, y, z);
    mesh.scale.set(a, b, c);
    g.add(mesh);
    return mesh;
  };
  const disc = (
    x: number,
    y: number,
    z: number,
    r: number,
    depth: number,
    m = kit.trim,
  ) => {
    const mesh = new THREE.Mesh(kit.cylinder, m);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.scale.set(r, depth, r);
    g.add(mesh);
    return mesh;
  };
  // Bodies end at the underside of the lid, rather than overlapping its skin.
  const lidThickness = 0.07;
  const bodyTop = h - lidThickness;
  const cap = (depth = 2.4) => {
    box(w / 2, h - lidThickness / 2, 0, w, lidThickness, depth, kit.trim);
    box(w / 2, h - 0.018, depth / 2 + 0.01, w, 0.035, 0.025, kit.amber);
  };
  const fasteners = (front: number, bottom: number, top: number) => {
    for (const x of [0.08, w - 0.08])
      for (const y of [bottom, top]) disc(x, y, front, 0.025, 0.025);
  };

  if (o.design === "ac-condenser") {
    box(w / 2, (bodyTop + 0.16) / 2, 0, w, bodyTop - 0.16, 2.35);
    for (const x of [w * 0.18, w * 0.82])
      box(x, 0.08, 0, 0.18, 0.16, 2.2, kit.trim);
    cap();
    const r = Math.min(h * 0.32, w * 0.2);
    for (const x of [w * 0.27, w * 0.73]) {
      disc(x, h * 0.53, 1.19, r, 0.045);
      disc(x, h * 0.53, 1.22, r * 0.9, 0.025, kit.dark);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const blade = box(
          x + Math.cos(a) * r * 0.45,
          h * 0.53 + Math.sin(a) * r * 0.45,
          1.245,
          r * 0.65,
          r * 0.16,
          0.02,
        );
        blade.rotation.z = a + 0.45;
      }
      for (let i = -2; i <= 2; i++) {
        const offset = (i * r) / 3;
        const span = 2 * Math.sqrt(r * r * 0.82 - offset * offset);
        box(x + offset, h * 0.53, 1.27, 0.015, span, 0.015, kit.trim);
        box(x, h * 0.53 + offset, 1.285, span, 0.015, 0.015, kit.trim);
      }
      disc(x, h * 0.53, 1.29, r * 0.14, 0.025);
    }
    fasteners(1.2, 0.24, h - 0.13);
  } else if (o.design === "cable-reels") {
    // A secured service tread makes the curved reel's complete top traversable.
    const radius = Math.min(w / 2, h / 2 - 0.05);
    for (const z of [-0.95, 0.95]) {
      disc(w / 2, radius + 0.035, z, radius, 0.12, kit.amber);
      disc(w / 2, radius + 0.035, z + 0.075, radius * 0.2, 0.035, kit.dark);
    }
    disc(w / 2, radius + 0.035, 0, radius * 0.75, 1.8, kit.dark);
    for (let z = -0.82; z < 0.9; z += 0.16)
      disc(w / 2, radius + 0.035, z, radius * 0.78, 0.04);
    for (const x of [w * 0.2, w * 0.8]) {
      box(x, 0.08, 0, 0.24, 0.16, 2.25, kit.dark);
      box(x, bodyTop / 2, -0.9, 0.06, bodyTop, 0.06, kit.trim);
    }
    cap(2.2);
    for (let x = 0.1; x < w; x += 0.18)
      box(x, h + 0.003, 0, 0.025, 0.01, 2.05, kit.dark);
  } else if (o.design === "utility-cabinet") {
    box(w / 2, 0.08, 0, w, 0.16, 2.4, kit.trim);
    box(w / 2, (bodyTop + 0.16) / 2, 0, w - 0.08, bodyTop - 0.16, 2.25);
    cap();
    box(w / 2, h / 2, 1.14, 0.025, h - 0.25, 0.025, kit.dark);
    for (const x of [w * 0.25, w * 0.75]) {
      box(x, h * 0.28, 1.15, w * 0.24, h * 0.18, 0.025, kit.dark);
      for (let i = 0; i < 4; i++)
        box(x, h * (0.22 + i * 0.04), 1.18, w * 0.24, 0.015, 0.025, kit.trim);
      box(x + w * 0.16, h * 0.55, 1.18, 0.04, 0.16, 0.05, kit.dark);
    }
    for (const x of [0.08, w - 0.08])
      for (const y of [h * 0.3, h * 0.75])
        box(x, y, 1.17, 0.065, 0.12, 0.04, kit.trim);
    box(w * 0.65, h * 0.72, 1.17, 0.12, 0.12, 0.025, kit.amber).rotation.z =
      Math.PI / 4;
  } else if (o.design === "maintenance-cart") {
    const radius = Math.min(0.13, h * 0.14);
    for (const x of [0.18, w - 0.18])
      for (const z of [-0.95, 0.95]) {
        disc(x, radius, z, radius, 0.14, kit.dark);
        disc(x, radius, z + 0.08, radius * 0.5, 0.03);
        box(x, radius * 2, z, 0.08, radius, 0.08, kit.trim);
      }
    const bottom = radius * 2;
    box(w / 2, (bodyTop + bottom) / 2, 0, w, bodyTop - bottom, 2.2);
    cap();
    for (let i = 0; i < 3; i++) {
      const y = bottom + ((h - bottom) * (i + 0.5)) / 3;
      box(w / 2, y, 1.115, w - 0.12, 0.018, 0.025, kit.dark);
      box(w / 2, y + 0.05, 1.15, w * 0.35, 0.035, 0.07, kit.trim);
    }
    for (const x of [w * 0.2, w * 0.8])
      box(x, h * 0.75, -1.3, 0.05, h * 0.5, 0.05, kit.trim);
    box(w / 2, h, -1.3, w * 0.6, 0.05, 0.05, kit.trim);
  } else if (o.design === "roof-hatch") {
    // Rim is beside/below the gap: nothing crosses the jump's empty running lane.
    for (const z of [-1.55, 1.55])
      box(w / 2, -0.13, z, w, 0.26, 0.18, kit.trim);
    for (const x of [-0.09, w + 0.09])
      box(x, -0.13, 0, 0.18, 0.26, 3.2, kit.trim);
    box(w / 2, 1.05, -1.72, w, 2.1, 0.12);
    for (const y of [0.08, 2.02])
      box(w / 2, y, -1.64, w - 0.16, 0.065, 0.04, kit.trim);
    for (const x of [0.12, w - 0.12])
      box(x, 1.05, -1.64, 0.065, 2, 0.04, kit.trim);
    box(w / 2, 1.9, -1.57, 0.45, 0.04, 0.08, kit.amber);
    for (const x of [w / 2 - 0.35, w / 2 + 0.35])
      box(x, -0.9, -1.25, 0.055, 1.8, 0.055, kit.trim);
    for (let y = -0.15; y > -1.8; y -= 0.28)
      box(w / 2, y, -1.25, 0.7, 0.045, 0.045, kit.trim);
  } else if (o.design === "duct-elbow") {
    const bottom = 1.25;
    box(w / 2, (bodyTop + bottom) / 2, 0, w, bodyTop - bottom, 2.4);
    cap();
    // Risers sit behind the running lane, leaving its entire 1.25 m clearance open.
    for (const x of [0.25, w - 0.25]) {
      box(x, bottom / 2, -1.55, 0.5, bottom, 0.65);
      box(x, 0.07, -1.55, 0.65, 0.14, 0.8, kit.trim);
    }
    for (let x = 0.2; x < w; x += 0.8) {
      box(x, (h + bottom) / 2, 1.215, 0.045, h - bottom, 0.035, kit.trim);
      box(x, h + 0.004, 0, 0.045, 0.024, 2.4, kit.trim);
    }
    box(w / 2, bottom + 0.018, 1.23, w, 0.035, 0.025, kit.amber);
  } else if (o.design === "safety-barricade") {
    // Broad top rail spans the authored vault footprint; stripes face the runner.
    const railHeight = h * 0.5;
    box(w / 2, h - railHeight / 2, 0, w, railHeight, 2.4, kit.amber);
    for (const z of [-0.92, 0.92]) {
      box(
        w / 2,
        (h - railHeight) / 2,
        z,
        w * 0.3,
        h - railHeight,
        0.12,
        kit.trim,
      );
      box(w / 2, 0.05, z, w, 0.1, 0.45, kit.dark);
    }
    for (const face of [-0.015, w + 0.015]) {
      for (let z = -0.95; z < 1.2; z += 0.4) {
        const stripe = box(
          face,
          h - railHeight / 2,
          z,
          0.025,
          railHeight * 0.82,
          0.18,
          kit.dark,
        );
        stripe.rotation.x = -0.35;
      }
    }
    for (const x of [w * 0.3, w * 0.7]) {
      box(
        x,
        h - railHeight / 2,
        1.215,
        w * 0.13,
        railHeight * 0.7,
        0.025,
        kit.dark,
      ).rotation.z = -0.35;
    }
    fasteners(1.24, h * 0.6, h - 0.05);
  } else if (o.design === "antenna-base") {
    box(w / 2, bodyTop / 2, 0, w, bodyTop, 2.4, kit.trim);
    cap();
    for (let i = 0; i < 3; i++)
      box(
        w / 2,
        (h * (i + 1)) / 6,
        -1.5 - i * 0.3,
        w,
        (h * (i + 1)) / 3,
        0.3,
        kit.face,
      );
    box(w * 0.7, h + 1.1, -1.6, 0.09, 2.2, 0.09, kit.trim);
    box(w * 0.7 - 0.09, h + 0.9, -1.6, 0.025, 1.8, 0.025, kit.dark);
    box(w * 0.7, h + 1.15, -1.6, 0.27, 0.55, 0.2);
    for (let i = 0; i < 4; i++)
      box(w * 0.7 + 0.3, h + 1.5 + i * 0.18, -1.6, 0.6, 0.035, 0.035, kit.trim);
  }
  return g;
}
