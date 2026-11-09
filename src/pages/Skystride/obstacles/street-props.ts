import * as THREE from "three";

export const STREET_PROPS = [
  "parked-car",
  "road-barrier",
  "trash-bins",
  "planter",
  "hydrant",
  "scaffold",
  "bench",
  "bike-rack",
  "scooter",
  "motorcycle",
  "delivery-cart",
  "food-cart",
  "dumpster",
  "cones",
  "roadworks-sign",
  "cable-spool",
  "barrels",
  "pallets",
  "crates",
  "phone-booth",
  "mailbox",
  "utility-cabinet",
  "bus-shelter",
  "fountain",
] as const;
export type StreetProp = (typeof STREET_PROPS)[number];

type Shape = (
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: number,
) => THREE.Mesh;
/** Local coordinates; every prop stays inside the marked 2.4 × 2.7 m footprint. */
export function streetProp(kind: StreetProp, box: Shape, cylinder: Shape) {
  const steel = 0x70818d,
    dark = 0x273139,
    wood = 0x946542,
    orange = 0xef8e32;
  const white = 0xe9dfbc,
    green = 0x477f60,
    red = 0xb74740,
    blue = 0x447b9c;
  const wheel = (x: number, y: number, z: number, radius = 0.32) => {
    const mesh = cylinder(x, y, z, radius * 2, 0.16, radius * 2, dark);
    mesh.rotation.x = Math.PI / 2;
  };
  switch (kind) {
    case "bench":
      for (const z of [-0.45, -0.15, 0.15, 0.45])
        box(0, 0.65, z, 2.15, 0.12, 0.21, wood);
      for (const x of [-0.8, 0.8]) {
        box(x, 0.3, 0, 0.12, 0.6, 1.15, dark);
        box(x, 0.95, -0.6, 0.12, 0.9, 0.12, dark);
      }
      for (const y of [0.95, 1.2]) box(0, y, -0.6, 2.15, 0.2, 0.12, wood);
      break;
    case "bike-rack":
      for (const z of [-0.85, 0, 0.85]) {
        for (const x of [-0.8, 0.8]) cylinder(x, 0.5, z, 0.12, 1, 0.12, steel);
        box(0, 1, z, 1.7, 0.12, 0.12, steel);
      }
      wheel(-0.65, 0.42, 0.15);
      wheel(0.65, 0.42, 0.15);
      box(0, 0.8, 0.15, 1.25, 0.12, 0.1, red);
      break;
    case "scooter":
    case "motorcycle": {
      const motor = kind === "motorcycle";
      wheel(-0.75, 0.36, 0);
      wheel(0.75, 0.36, 0);
      box(-0.1, 0.55, 0, 1.2, motor ? 0.5 : 0.16, 0.5, motor ? red : blue);
      box(-0.3, 0.92, 0, 0.85, 0.15, 0.55, dark);
      box(0.72, 0.92, 0, 0.14, 1, 0.14, steel);
      box(0.72, 1.4, 0, 0.12, 0.12, 1, dark);
      box(0.85, 1.12, 0, 0.22, 0.25, 0.3, white);
      break;
    }
    case "delivery-cart":
    case "food-cart": {
      const food = kind === "food-cart";
      for (const x of [-0.7, 0.7])
        for (const z of [-0.75, 0.75]) wheel(x, 0.25, z, 0.23);
      box(0, 0.8, 0, 1.9, 1, 1.5, food ? white : blue);
      if (food) {
        for (const x of [-0.9, 0.9]) box(x, 1.7, 0, 0.1, 1, 0.1, steel);
        for (let i = 0; i < 6; i++)
          box(-0.9 + i * 0.36, 2.2, 0, 0.36, 0.16, 2.1, i % 2 ? red : white);
        cylinder(0, 1.43, 0, 0.55, 0.3, 0.55, steel);
      } else for (const z of [-0.4, 0.4]) box(0, 1.6, z, 1, 0.6, 0.65, wood);
      break;
    }
    case "dumpster":
      box(0, 0.8, 0, 2.1, 1.4, 2.1, green);
      for (const z of [-0.52, 0.52]) {
        const lid = box(0, 1.56, z, 2.2, 0.16, 1.05, dark);
        lid.rotation.x = z < 0 ? -0.12 : 0.12;
      }
      for (const x of [-0.8, 0.8])
        for (const z of [-0.85, 0.85]) wheel(x, 0.2, z, 0.17);
      break;
    case "cones":
      for (const [x, z] of [
        [-0.7, -0.75],
        [0.7, -0.75],
        [0, 0.75],
      ]) {
        box(x, 0.1, z, 0.65, 0.16, 0.65, dark);
        for (let i = 0; i < 5; i++)
          cylinder(
            x,
            0.25 + i * 0.17,
            z,
            0.48 - i * 0.08,
            0.17,
            0.48 - i * 0.08,
            i === 2 ? white : orange,
          );
      }
      break;
    case "roadworks-sign":
      for (const z of [-0.8, 0.8]) {
        box(0, 0.12, z, 1.8, 0.2, 0.35, dark);
        box(0, 0.85, z, 0.1, 1.5, 0.1, steel);
      }
      box(0, 1.6, 0, 0.16, 1.1, 2.2, orange);
      for (const z of [-0.65, 0, 0.65]) {
        const stripe = box(0.09, 1.6, z, 0.04, 0.8, 0.18, dark);
        stripe.rotation.x = -0.4;
      }
      break;
    case "cable-spool":
      cylinder(0, 0.3, 0, 2.15, 0.2, 2.15, wood);
      cylinder(0, 0.9, 0, 1.5, 1.1, 1.5, dark);
      cylinder(0, 1.5, 0, 2.15, 0.2, 2.15, wood);
      cylinder(0, 1.62, 0, 0.35, 0.04, 0.35, dark);
      break;
    case "barrels":
      for (const [x, z] of [
        [-0.55, -0.6],
        [0.55, -0.6],
        [0, 0.6],
      ]) {
        cylinder(x, 0.65, z, 0.85, 1.2, 0.85, red);
        for (const y of [0.3, 0.95]) cylinder(x, y, z, 0.9, 0.08, 0.9, dark);
        cylinder(x, 1.28, z, 0.82, 0.08, 0.82, steel);
      }
      break;
    case "pallets":
    case "crates":
      for (let layer = 0; layer < 3; layer++) {
        if (kind === "pallets") {
          for (const z of [-0.8, 0, 0.8])
            box(0, 0.2 + layer * 0.32, z, 2.1, 0.15, 0.18, wood);
          for (let i = 0; i < 6; i++)
            box(-0.9 + i * 0.36, 0.33 + layer * 0.32, 0, 0.26, 0.1, 2.1, wood);
        } else {
          box(
            0,
            0.4 + layer * 0.55,
            0,
            1.9 - layer * 0.3,
            0.5,
            2.1 - layer * 0.3,
            wood,
          );
          for (const z of [-0.5, 0.5])
            box(0, 0.67 + layer * 0.55, z, 1.9 - layer * 0.3, 0.06, 0.1, dark);
        }
      }
      break;
    case "phone-booth":
      box(0, 1.2, 0, 1.4, 2.35, 1.5, blue);
      for (const z of [-0.76, 0.76]) {
        box(0, 1.4, z, 1.1, 1.55, 0.04, dark);
        box(0, 1.4, z, 0.08, 1.6, 0.06, red);
      }
      box(0, 2.48, 0, 1.65, 0.2, 1.75, red);
      box(0.72, 1.35, 0, 0.05, 1.6, 1.1, dark);
      break;
    case "mailbox":
      for (const x of [-0.55, 0.55]) box(x, 0.35, 0, 0.12, 0.7, 0.8, dark);
      box(0, 1, 0, 1.45, 1.15, 1.25, blue);
      cylinder(0, 1.58, 0, 1.45, 0.15, 1.25, blue);
      box(0.74, 1.22, 0, 0.04, 0.12, 0.9, dark);
      break;
    case "utility-cabinet":
      box(0, 1.05, 0, 1.9, 2, 1.25, steel);
      for (const x of [-0.48, 0.48]) {
        box(x, 1.05, 0.64, 0.88, 1.8, 0.04, dark);
        for (let i = 0; i < 6; i++)
          box(x, 0.45 + i * 0.16, 0.68, 0.64, 0.05, 0.04, steel);
      }
      box(0, 2.1, 0, 2.1, 0.12, 1.45, steel);
      break;
    case "bus-shelter":
      for (const x of [-1, 1])
        for (const z of [-1, 1]) box(x, 1.15, z, 0.12, 2.3, 0.12, steel);
      box(0, 1.15, -1, 2, 2.2, 0.08, blue);
      box(0, 2.35, 0, 2.3, 0.15, 2.5, white);
      box(0, 0.55, -0.4, 1.8, 0.15, 0.6, wood);
      break;
    case "fountain":
      cylinder(0, 0.25, 0, 2.25, 0.4, 2.25, steel);
      cylinder(0, 0.48, 0, 1.9, 0.1, 1.9, blue);
      cylinder(0, 0.85, 0, 0.3, 1, 0.3, steel);
      cylinder(0, 1.3, 0, 1, 0.18, 1, steel);
      cylinder(0, 1.41, 0, 0.8, 0.05, 0.8, blue);
      break;
  }
}
