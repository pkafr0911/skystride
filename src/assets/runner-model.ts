import * as THREE from "three";

/** Original Urban Silhouette model geometry. Shared by live rig and GLB export. */
export function runnerGeometry() {
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
        [-0.23, -0.04],
        [-0.26, -0.04],
        [-0.27, 0.03],
        [-0.22, 0.18],
        [-0.27, 0.13],
        [-0.23, 0.22],
        [-0.18, 0.25],
        [-0.01, 0.27],
        [0.1, 0.2],
        [0.15, 0.1],
        [0.04, 0.14],
        [-0.06, 0.11],
        [-0.14, 0.02],
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
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.62, -0.5),
        new THREE.Vector2(0.72, -0.46),
        new THREE.Vector2(0.78, -0.3),
        new THREE.Vector2(0.9, -0.1),
        new THREE.Vector2(1, 0.12),
        new THREE.Vector2(1.02, 0.28),
        new THREE.Vector2(0.94, 0.4),
        new THREE.Vector2(0.72, 0.48),
        new THREE.Vector2(0.52, 0.5),
      ],
      24,
    ),
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
  ];
}
