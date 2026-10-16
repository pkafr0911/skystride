import * as THREE from "three";

/** Original athletic silhouette geometry. Shared by the live rig and GLB export. */
export function runnerGeometry() {
  // Anatomical cross-sections: depth and shoulder width vary independently.
  // Unlike a lathed cylinder this gives the rib cage, waist and pelvis different volumes.
  const body = (sections: number[][]) => {
    const curve = new THREE.CatmullRomCurve3(
      sections.map(([y, depth, width]) => new THREE.Vector3(depth, y, width)),
    );
    const vertices: number[] = [],
      indices: number[] = [];
    const rings = 25,
      sides = 24;
    for (let r = 0; r < rings; r++) {
      const section = curve.getPoint(r / (rings - 1));
      for (let s = 0; s < sides; s++) {
        const angle = (s / sides) * Math.PI * 2;
        vertices.push(
          Math.cos(angle) * section.x,
          section.y,
          Math.sin(angle) * section.z,
        );
        if (r < rings - 1) {
          const a = r * sides + s,
            b = r * sides + ((s + 1) % sides);
          indices.push(a, a + sides, b, b, a + sides, b + sides);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  };
  const profile = (points: number[][], depth: number) => {
    const shape = new THREE.Shape();
    const middle = (a: number[], b: number[]) => [
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2,
    ];
    const first = middle(points[points.length - 1], points[0]);
    shape.moveTo(first[0], first[1]);
    points.forEach((p, i) => {
      const next = middle(p, points[(i + 1) % points.length]);
      shape.quadraticCurveTo(p[0], p[1], next[0], next[1]);
    });
    shape.closePath();
    const bevel = Math.min(0.014, depth * 0.06);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: depth - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 5,
      steps: 1,
    });
    geometry.translate(0, 0, -depth / 2 + bevel);
    return geometry;
  };
  return [
    new THREE.CylinderGeometry(0.82, 1, 1, 16),
    new THREE.SphereGeometry(1, 20, 14),
    profile(
      [
        [-0.13, -0.13],
        [-0.04, -0.19],
        [0.07, -0.17],
        [0.1, -0.08],
        [0.16, -0.055],
        [0.14, -0.015],
        [0.2, 0.015],
        [0.13, 0.065],
        [0.12, 0.15],
        [0.02, 0.2],
        [-0.12, 0.17],
        [-0.17, 0.06],
      ],
      0.24,
    ),
    profile(
      [
        [-0.17, -0.02],
        [-0.19, 0.08],
        [-0.16, 0.19],
        [-0.08, 0.23],
        [0.06, 0.24],
        [0.14, 0.15],
        [0.13, 0.08],
        [0.06, 0.15],
        [-0.07, 0.17],
        [-0.12, 0.08],
      ],
      0.27,
    ),
    profile(
      [
        [-0.12, -0.065],
        [0.25, -0.065],
        [0.29, -0.02],
        [0.18, 0.03],
        [0.04, 0.09],
        [-0.1, 0.065],
      ],
      0.16,
    ),
    profile(
      [
        [-0.12, -0.075],
        [0.25, -0.075],
        [0.29, -0.045],
        [-0.12, -0.04],
      ],
      0.165,
    ),
    new THREE.CircleGeometry(1, 5),
    body([
      [-0.5, 0.6, 0.67],
      [-0.35, 0.7, 0.73],
      [-0.12, 0.8, 0.82],
      [0.13, 0.95, 1],
      [0.31, 0.87, 1.13],
      [0.42, 0.64, 1.04],
      [0.5, 0.32, 0.35],
    ]),
    profile(
      [
        [-0.72, -0.5],
        [-0.36, -0.44],
        [-0.52, 0.12],
        [-0.8, 0.42],
        [-1.01, 0.3],
      ],
      1.68,
    ),
    profile(
      [
        [-0.2, 0.06],
        [0.12, 0.09],
        [0.31, -0.25],
        [0.39, -0.4],
        [0.17, -0.3],
        [-0.06, -0.07],
      ],
      0.3,
    ),
    new THREE.TorusGeometry(1, 0.065, 8, 24),
    body([
      [-0.5, 0.15, 0.4],
      [-0.35, 0.68, 0.87],
      [0, 0.95, 1],
      [0.3, 0.88, 0.93],
      [0.5, 0.72, 0.8],
    ]),
    profile(
      [
        [-0.05, -0.035],
        [0.02, -0.045],
        [0.085, -0.035],
        [0.12, -0.01],
        [0.11, 0.012],
        [0.08, 0.04],
        [0.015, 0.045],
        [-0.05, 0.03],
      ],
      0.075,
    ),
  ];
}
