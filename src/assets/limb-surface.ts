import * as THREE from "three";

/** A continuous cloth/skin surface, with a rounded bend through the IK joint. */
export function limbSurface(material: THREE.Material) {
  const rings = 25,
    sides = 12;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(rings * sides * 3);
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  const indices: number[] = [];
  for (let r = 0; r < rings - 1; r++)
    for (let s = 0; s < sides; s++) {
      const a = r * sides + s,
        b = r * sides + ((s + 1) % sides),
        c = a + sides,
        d = b + sides;
      indices.push(a, c, b, b, c, d);
    }
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const center = new THREE.Vector3(),
    tangent = new THREE.Vector3(),
    side = new THREE.Vector3();
  const incoming = new THREE.Vector3(),
    outgoing = new THREE.Vector3();
  const pre = new THREE.Vector3(),
    post = new THREE.Vector3();
  return {
    mesh,
    geometry,
    update(
      a: THREE.Vector3,
      joint: THREE.Vector3,
      b: THREE.Vector3,
      upper: number,
      lower: number,
      leg: boolean,
    ) {
      incoming.subVectors(joint, a);
      outgoing.subVectors(b, joint);
      pre.copy(joint).addScaledVector(incoming, -0.2);
      post.copy(joint).addScaledVector(outgoing, 0.2);
      for (let r = 0; r < rings; r++) {
        const t = r / (rings - 1);
        if (t < 0.4) {
          center.copy(a).lerp(pre, t / 0.4);
          tangent.copy(incoming);
        } else if (t > 0.6) {
          center.copy(post).lerp(b, (t - 0.6) / 0.4);
          tangent.copy(outgoing);
        } else {
          const u = (t - 0.4) / 0.2;
          center
            .copy(pre)
            .multiplyScalar((1 - u) * (1 - u))
            .addScaledVector(joint, 2 * u * (1 - u))
            .addScaledVector(post, u * u);
          tangent
            .subVectors(joint, pre)
            .multiplyScalar(1 - u)
            .addScaledVector(outgoing, 0.2 * u);
        }
        tangent.normalize();
        side.set(tangent.y, -tangent.x, 0).normalize();
        const radius =
          t < 0.5
            ? THREE.MathUtils.lerp(upper, lower * 1.15, t * 2) *
              (1 + 0.12 * Math.sin(t * 2 * Math.PI))
            : lower *
              (1 + (leg ? 0.43 : 0.32) * Math.sin((t - 0.5) * 2 * Math.PI));
        const endCap = Math.min(1, Math.sin(Math.PI * t) * 12 + 0.18);
        for (let s = 0; s < sides; s++) {
          const angle = (s / sides) * Math.PI * 2;
          const fold = leg ? 1 + 0.012 * Math.sin(t * 22 + angle * 3) : 1;
          const offset = (r * sides + s) * 3;
          positions[offset] =
            center.x + side.x * Math.cos(angle) * radius * endCap * fold;
          positions[offset + 1] =
            center.y + side.y * Math.cos(angle) * radius * endCap * fold;
          positions[offset + 2] =
            center.z + Math.sin(angle) * radius * 0.9 * endCap;
        }
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
    },
  };
}
