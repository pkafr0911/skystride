import { SWING_GAP_EXTRA, swingGripOffset } from "./combos";
import * as THREE from "three";
import { ground, Obstacle } from "./model";

export type ObstacleKit = {
  box: THREE.BufferGeometry;
  cylinder: THREE.BufferGeometry;
  face: THREE.Material;
  dark: THREE.Material;
  trim: THREE.Material;
  amber: THREE.Material;
  panel: THREE.Material;
};

/** Shared by the course and offline studies; every mesh uses caller-owned resources. */
export function creativeObstacle(o: Obstacle, kit: ObstacleKit): THREE.Group {
  const group = new THREE.Group();
  group.name = o.feature ?? "obstacle";
  group.position.set(o.x, ground(o.x, o.route === "upper"), 0);
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(kit.box, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    group.add(mesh);
    return mesh;
  };
  const pipe = (
    x: number,
    y: number,
    z: number,
    width: number,
    radius: number,
    material: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(kit.cylinder, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(radius, width, radius);
    mesh.rotation.z = Math.PI / 2;
    group.add(mesh);
    return mesh;
  };
  const h = o.height ?? 1.1,
    w = o.width;
  if (o.landmark === "crane" && o.technique === "lache") {
    // A recognizable tower, trussed jib and suspended grip at the real catch point.
    const span = w + SWING_GAP_EXTRA + 4;
    for (const x of [-2, -0.8]) box(x, 3.7, -2.2, 0.18, 7.4, 0.2, kit.amber);
    box(span / 2 - 2, 7.2, -2.2, span + 5, 0.25, 0.6, kit.amber);
    box(span / 2 - 2, 6.4, -2.2, span + 5, 0.15, 0.5, kit.trim);
    for (let x = -3; x < span; x += 1.8) {
      const brace = box(x, 6.8, -2.2, 1.2, 0.09, 0.3, kit.amber);
      brace.rotation.z = 0.65;
    }
    box(-3.2, 6.5, -2.2, 2.5, 1.2, 1.6, kit.dark);
    for (const z of [-1.25, 1.25])
      box(swingGripOffset(w), (7.1 + h) / 2, z, 0.04, 7.1 - h, 0.04, kit.trim);
  }
  if (o.landmark === "skylights" && o.kind === "gap") {
    // Glass sits beside and below the solid beam line; it is never footing.
    for (const z of [-1.35, 1.35]) {
      box(w / 2, -0.35, z, w, 0.09, 1.6, kit.panel);
      for (const x of [0, w / 2, w])
        box(x, -0.27, z, 0.06, 0.08, 1.7, kit.trim);
      box(w / 2, -0.27, z + 0.8, w, 0.08, 0.06, kit.trim);
      box(w / 2, -0.27, z - 0.8, w, 0.08, 0.06, kit.trim);
    }
  }
  if (o.kind === "signature") {
    const t = o.technique;
    const edge = (x: number, y: number, width: number) =>
      box(x, y, 1.25, width, 0.045, 0.06, kit.amber);
    if (t === "underbar" || t === "lache" || t === "monkey" || t === "shimmy") {
      for (const x of t === "shimmy"
        ? [0, w]
        : [-0.35, w + SWING_GAP_EXTRA + 0.35])
        box(x, h / 2, -1.45, 0.12, h, 0.12, kit.trim);
      const count = t === "monkey" || t === "shimmy" ? 4 : 1;
      for (let n = 0; n < count; n++) {
        const x =
          count === 1
            ? swingGripOffset(w)
            : 0.2 + (n * (w - 0.4)) / (count - 1);
        box(x, h, 0, 0.09, 0.09, 2.8, kit.amber);
      }
      box(
        (w + SWING_GAP_EXTRA) / 2,
        h,
        -1.45,
        w + SWING_GAP_EXTRA + 0.7,
        0.14,
        0.14,
        kit.face,
      );
    } else if (t === "tic-tac" || t === "rebound") {
      box(w / 2, h / 2, -0.85, w, h, 0.16, kit.face);
      for (let y = 0.4; y < h; y += 0.5)
        box(w / 2, y, -0.75, 0.4, 0.055, 0.035, kit.amber);
      box(w / 2, h, -0.65, w, 0.12, 0.4, kit.trim);
      box(w / 2, h + 0.02, -0.4, w, 0.04, 0.05, kit.amber);
    } else if (t === "duck" || t === "squeeze") {
      const bottom = t === "duck" ? 1.2 : 1.6;
      box(w / 2, bottom + 0.2, 0, w, 0.4, 2.4, kit.face);
      box(w / 2, bottom, 1.25, w, 0.045, 0.06, kit.amber);
      for (const x of [0, w])
        box(x, bottom / 2, -1.3, 0.1, bottom, 0.1, kit.trim);
      if (t === "squeeze")
        for (const z of [-0.5, 0.5])
          box(w / 2, 0.8, z, 0.14, 1.6, 0.1, kit.trim);
    } else if (t === "canopy") {
      const slope = box(
        w / 2,
        h / 2,
        0,
        Math.hypot(w, h),
        0.14,
        2.4,
        kit.panel,
      );
      slope.rotation.z = -Math.atan2(h, w);
      box(0.1, h / 2, -1.1, 0.12, h, 0.12, kit.trim);
      edge(w - 0.1, 0.08, 0.2);
    } else if (t === "stride") {
      for (let i = 0; i < 3; i++) {
        const y = 0.3 + i * 0.25;
        box(0.3 + i * 0.8, y / 2, 0, 0.55, y, 1.8, kit.face);
        edge(0.3 + i * 0.8, y, 0.55);
      }
    } else if (t === "drop-through") {
      for (const x of [0.3, w - 0.3]) {
        box(x, h - 0.09, 0, 0.6, 0.18, 2.5, kit.face);
        edge(x, h, 0.6);
      }
      for (const x of [0.15, w - 0.15])
        box(x, h / 2, -1.2, 0.1, h, 0.1, kit.trim);
    } else {
      box(w / 2, h / 2, 0, w, h, 2.4, kit.face);
      edge(w / 2, h + 0.02, w);
      if (t === "double-kong")
        for (const x of [w * 0.25, w * 0.75])
          box(x, h + 0.03, 0, 0.18, 0.045, 2.4, kit.amber);
      if (t === "transfer" || t === "reverse")
        box(w * 0.8, h / 2, -1.6, 0.5, h, 1, kit.face);
    }
  } else if (o.feature === "side-ramp") {
    const angle = Math.atan2(h, w),
      length = Math.hypot(w, h);
    const lane = 2.9;
    box(w / 2, h / 2 - 0.08, lane, length, 0.16, 1.5, kit.face).rotation.z =
      angle;
    for (const z of [lane - 0.78, lane + 0.78]) {
      box(w / 2, h / 2 + 0.04, z, length, 0.12, 0.08, kit.amber).rotation.z =
        angle;
    }
    for (let x = 1; x < w; x += 2.5) {
      box(x, (h * x) / w - 0.22, 2.3, 0.12, 0.2, 2, kit.trim);
      box(
        x,
        (h * x) / w + 0.015,
        lane,
        0.14,
        0.025,
        1.25,
        kit.amber,
      ).rotation.z = angle;
    }
    box(w - 0.15, h + 0.025, lane, 0.3, 0.05, 1.55, kit.amber);
    // Short entry apron joins the rooftop to the facade chute.
    box(0.4, -0.06, 1.9, 0.8, 0.12, 2.8, kit.face);
  } else if (o.kind === "ramp") {
    const angle = Math.atan2(h, w),
      length = Math.hypot(w, h);
    // The upper face, not the centre of the panel, lies on the collision slope.
    const plate = box(
      w / 2,
      h / 2 - 0.045,
      0,
      length,
      0.09,
      2.8,
      o.feature === "greenhouse" ? kit.face : kit.panel,
    );
    if (o.feature === "greenhouse") {
      // Closed ramp body makes it read as a launch surface, never a slide tunnel.
      for (let x = 0.15; x < w; x += 0.3) {
        const fillHeight = Math.max(0.02, (h * (x - 0.15)) / w);
        box(x, fillHeight / 2 - 0.04, 0, 0.3, fillHeight, 2.7, kit.dark);
      }
    }
    plate.rotation.z = angle;
    for (const z of [-1.42, 1.42]) {
      const rail = box(w / 2, h / 2 - 0.06, z, length, 0.12, 0.07, kit.trim);
      rail.rotation.z = angle;
    }
    for (let x = 0.4; x < w; x += 0.6) {
      box(x, (h * x) / w + 0.006, 0, 0.025, 0.012, 2.7, kit.trim).rotation.z =
        angle;
      if (x > 1)
        for (const z of [-1.2, 1.2])
          box(
            x,
            (h * x) / w / 2 - 0.04,
            z,
            0.07,
            Math.max(0.05, (h * x) / w - 0.08),
            0.07,
            kit.dark,
          );
    }
    for (const z of [-0.7, 0, 0.7]) {
      const seam = box(w / 2, h / 2 + 0.01, z, length, 0.012, 0.018, kit.trim);
      seam.rotation.z = angle;
    }
    box(w - 0.05, h + 0.018, 0, 0.1, 0.035, 2.85, kit.amber);
  } else if (o.feature === "pipe") {
    const bottom = o.kind === "slide" ? 1.25 : 0.12;
    const radius = (h - bottom) / 2;
    pipe(w / 2, bottom + radius, 0.55, w, radius, kit.face);
    for (const x of [0.1, w - 0.1])
      pipe(x, bottom + radius, 0.55, 0.12, radius + 0.04, kit.trim);
    // Service grating provides the flat top used by jump/top-support collision.
    box(w / 2, h - 0.025, 0.55, w, 0.05, 1.5, kit.dark);
    box(w / 2, h + 0.02, 1.3, w, 0.04, 0.06, kit.amber);
    for (const x of [0.2, w - 0.2]) {
      box(x, bottom / 2, -0.8, 0.13, bottom, 0.13, kit.trim);
      box(x, 0.04, -0.8, 0.5, 0.08, 0.5, kit.dark);
    }
    if (o.kind === "slide") box(w / 2, bottom, 0.55, w, 0.04, 0.06, kit.amber);
    else box(w / 2, 0.08, 0.55, w, 0.16, 1.5, kit.dark);
  } else if (o.feature === "tank") {
    box(w / 2, h - 0.2, 0, w, 0.4, 2.6, kit.face);
    box(w / 2, h + 0.02, 1.32, w, 0.04, 0.06, kit.amber);
    for (const x of [0.15, w - 0.15])
      box(x, h / 2, -1.2, 0.18, h, 0.18, kit.trim);
    const tank = new THREE.Mesh(kit.cylinder, kit.face);
    tank.position.set(w / 2, h + 1.2, -1.9);
    tank.scale.set(1.2, 2.4, 1.2);
    group.add(tank);
    for (const y of [h + 0.12, h + 2.3])
      box(w / 2, y, -1.9, 2.5, 0.1, 2.5, kit.trim);
    box(0.65, 0.425, 2, 1.3, 0.85, 0.25, kit.face);
    box(0.65, 0.87, 2, 1.3, 0.04, 0.28, kit.amber);
  } else if (o.feature === "wall-billboard") {
    if (o.wallGap) {
      // Bank-mounted supports leave the running lane and the void unobstructed.
      for (const x of [0.65, w + 0.35]) {
        box(x, 0.8, -1.15, 0.2, 5.2, 0.25, kit.trim);
      }
      box(0.65, 0.025, 0, 0.12, 0.05, 2.6, kit.amber);
      box(w + 0.15, h + 0.025, 0, 0.12, 0.05, 2.6, kit.amber);
    }
    box(w / 2, 2, -0.8, w, 4, 0.18, kit.panel);
    for (let x = 0.1; x < w; x += 1.2) {
      box(x, 2, -0.95, 0.08, 4.3, 0.14, kit.trim);
      box(x, 0.6 + (h * x) / w, -0.69, 0.35, 0.05, 0.05, kit.amber);
    }
    box(w + 1.5, h - 0.09, 0, 3, 0.18, 2.6, kit.face);
    box(w + 1.5, h + 0.02, 1.32, 3, 0.04, 0.06, kit.amber);
  } else if (o.feature === "bridge") {
    for (const x of [-0.45, w + 0.45]) {
      box(x, -0.12, 0, 0.9, 0.24, 2.8, kit.face);
      box(x, 0.02, 1.42, 0.9, 0.04, 0.06, kit.amber);
      box(x, 0.55, -1.4, 0.09, 1.1, 0.09, kit.trim);
      box(x, 1.1, -1.4, 1, 0.07, 0.07, kit.trim);
      box(
        x + (x < 0 ? 0.4 : -0.4),
        -0.6,
        -0.8,
        1.2,
        0.1,
        0.7,
        kit.dark,
      ).rotation.z = x < 0 ? -0.8 : 0.8;
    }
  } else if (o.feature === "greenhouse" && o.part === "glass") {
    const bottom = o.openingTop ?? 0,
      paneHeight = h - bottom;
    box(w / 2, bottom + paneHeight / 2, 0, w, paneHeight, 2.6, kit.panel);
    for (const x of [0, w / 2, w])
      box(x, bottom + paneHeight / 2, 1.32, 0.06, paneHeight, 0.06, kit.trim);
    for (const y of [bottom, h]) box(w / 2, y, 1.32, w, 0.06, 0.06, kit.trim);
    const brace = box(
      w / 2,
      bottom + paneHeight / 2,
      1.34,
      0.045,
      Math.hypot(w, paneHeight),
      0.04,
      kit.trim,
    );
    brace.rotation.z = -Math.atan2(w, paneHeight);
    // Rear supports leave the foreground service passage clear. Amber marks clearance, not glass footing.
    for (const x of [0.08, w - 0.08])
      box(x, bottom / 2, -1.4, 0.12, bottom, 0.12, kit.trim);
    box(w / 2, bottom - 0.025, 1.34, w, 0.04, 0.06, kit.amber);
  } else if (o.feature === "greenhouse" && o.part === "planter") {
    box(w / 2, h / 2, 0, w, h, 2.4, kit.face);
    box(w / 2, h - 0.04, 0, w + 0.08, 0.08, 2.5, kit.trim);
    box(w / 2, h + 0.02, 1.26, w, 0.04, 0.06, kit.amber);
    for (const x of [0.2, w / 2, w - 0.2]) {
      box(x, h + 0.18, -0.9, 0.025, 0.36, 0.025, kit.dark);
      box(x, h + 0.24, -0.9, 0.26, 0.06, 0.28, kit.panel).rotation.z = 0.4;
    }
  } else if (o.kind === "ledge") {
    box(w / 2, h - 0.09, 0, w, 0.18, 2.6, kit.face);
    box(w / 2, h + 0.02, 1.32, w, 0.04, 0.06, kit.amber);
    box(0.025, h + 0.02, 0, 0.05, 0.04, 2.6, kit.amber);
    if (o.feature === "scaffold") {
      for (const x of [0.1, w - 0.1])
        for (const z of [-1.4, 1.4])
          box(x, h + 2, z, 0.025, 4, 0.025, kit.trim);
      box(w / 2, h + 0.8, -1.4, w, 0.05, 0.05, kit.trim);
    } else {
      for (const x of [0.15, w - 0.15])
        box(x, h / 2 - 0.09, -1.1, 0.13, h - 0.18, 0.13, kit.dark);
      if (o.feature === "balcony")
        box(w / 2, h / 2, -1.55, w, h + 1, 0.15, kit.panel);
    }
  } else if (o.feature === "window") {
    const ceiling = o.openingTop!;
    box(w / 2, h / 2, 0, w, h, 2.6, kit.face);
    box(w / 2, h + 0.02, 1.32, w, 0.04, 0.055, kit.amber);
    // Rear posts carry the sign; the movement lane remains an open passage.
    for (const x of [0.09, w - 0.09]) {
      box(x, (ceiling + 0.55) / 2, -1.48, 0.18, ceiling + 0.55, 0.18, kit.trim);
      const brace = box(
        x + (x < w / 2 ? 0.35 : -0.35),
        0.7,
        -1.5,
        0.1,
        1.5,
        0.12,
        kit.dark,
      );
      brace.rotation.z = x < w / 2 ? -0.45 : 0.45;
    }
    box(w / 2, ceiling + 0.275, 0, w, 0.55, 2.6, kit.face);
    box(w / 2, ceiling + 0.01, 1.33, w, 0.04, 0.04, kit.amber);
    // Directional sign cut into the fascia, readable without a texture/font asset.
    for (const x of [w * 0.3, w * 0.55, w * 0.8]) {
      const slash = box(x, ceiling + 0.28, 1.32, 0.07, 0.3, 0.025, kit.trim);
      slash.rotation.z = -0.55;
    }
  } else {
    box(w / 2, h / 2, 0, w, h, 2.4, kit.face);
    box(w / 2, h + 0.02, 1.22, w, 0.04, 0.055, kit.amber);
    box(0.025, h + 0.02, 0, 0.05, 0.04, 2.45, kit.amber);
    for (let y = 0.14; y < h - 0.1; y += 0.17)
      box(w / 2, y, 1.21, w * 0.78, 0.06, 0.025, kit.dark);
    for (const x of [0.1, w - 0.1])
      box(x, h / 2, 1.23, 0.05, h * 0.8, 0.035, kit.trim);
    // A second service enclosure on the back makes these read as ventilation banks.
    box(w * 0.5, h * 0.45, -1.4, w * 0.8, h * 0.9, 0.35, kit.dark);
  }
  return group;
}
