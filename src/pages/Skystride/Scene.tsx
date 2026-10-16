import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  FINISH,
  SECTOR,
  Frame,
  ground,
  obstacles,
  surfaces,
  RecordRun,
  Run,
  STEP,
} from "./model";
import { makeRunner } from "./runner";
import { interpolateFrame } from "./motion";

export default function Scene({
  game,
  ghost,
}: {
  game: Run;
  ghost: RecordRun | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const ghostRef = useRef(ghost);
  ghostRef.current = ghost;
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setError(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xa59abb, 60, 170);
    const camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 240);
    scene.add(new THREE.HemisphereLight(0xffd3b2, 0x25354e, 1.7));
    const sunlight = new THREE.DirectionalLight(0xffae6b, 1.6);
    sunlight.position.set(-12, 18, -9);
    scene.add(sunlight);
    const fill = new THREE.DirectionalLight(0x91a8db, 0.55);
    fill.position.set(0, 6, 15);
    scene.add(fill);
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const sphereGeometry = new THREE.SphereGeometry(1, 10, 8);
    const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
    const materials: THREE.Material[] = [];
    const material = (color: number, opacity = 1) => {
      const m = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.83,
        transparent: opacity < 1,
        opacity,
      });
      materials.push(m);
      return m;
    };
    const roof = material(0x13213a),
      side = material(0x10203a),
      edge = material(0xf3ae65);
    const metal = material(0x344456),
      black = material(0x101c2c);
    const chunks = new Map<number, THREE.Group>();
    const chunkFor = (x: number) => {
      const key = Math.floor(x / 80);
      if (!chunks.has(key)) {
        const group = new THREE.Group();
        scene.add(group);
        chunks.set(key, group);
      }
      return chunks.get(key)!;
    };
    const box = (
      parent: THREE.Object3D,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      mat: THREE.Material,
    ) => {
      const mesh = new THREE.Mesh(boxGeometry, mat);
      mesh.position.set(x, y, z);
      mesh.scale.set(w, h, d);
      (parent === scene ? chunkFor(x) : parent).add(mesh);
      return mesh;
    };
    const skyline = new THREE.Group();
    scene.add(skyline);
    const skylineLayers: THREE.Group[] = [];
    for (let layer = 0; layer < 3; layer++) {
      const buildings = new THREE.Group();
      skyline.add(buildings);
      skylineLayers.push(buildings);
      const mat = new THREE.MeshBasicMaterial({
        color: [0xb3a0ba, 0x9289a7, 0x686e91][layer],
      });
      const glass = new THREE.MeshBasicMaterial({
        color: [0xc4adc0, 0xa69ab5, 0x8587a5][layer],
      });
      materials.push(mat, glass);
      for (let i = 0; i < 125; i++) {
        const h = 3.2 + ((i * 13 + layer * 7) % 19) * 0.28;
        const x = i * 3.2 - 65 + layer * 1.1,
          z = -85 + layer * 25;
        const w = 2 + (i % 4) * 0.44,
          base = -3 - layer * 0.5;
        box(buildings, x, base + h / 2, z, w, h, 1.2, mat);
        box(buildings, x + 0.2, base + h + 0.25, z, w * 0.55, 0.5, 0.8, mat);
        if (i % 4 === 0)
          box(buildings, x + 0.4, base + h + 0.8, z, 0.1, 1.4, 0.1, mat);
        if (layer === 2 && i % 2 === 0) {
          for (let row = 0; row < 3; row++)
            for (let col = 0; col < 2; col++)
              box(
                buildings,
                x - 0.45 + col * 0.75,
                base + 1 + row * 1.2,
                z + 0.62,
                0.18,
                0.45,
                0.02,
                glass,
              );
        }
      }
    }
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdc9d, fog: false });
    materials.push(sunMat);
    const sunGeometry = new THREE.CircleGeometry(2.3, 48);
    const sun = new THREE.Mesh(sunGeometry, sunMat);
    sun.position.set(16, 4.5, -125);
    scene.add(sun);
    // Renderer and collision share these exact roof intervals.
    for (const slab of surfaces) {
      const w = slab.end - slab.start,
        x = (slab.start + slab.end) / 2,
        upper = slab.y > 0;
      box(
        scene,
        x,
        slab.y - (upper ? 0.45 : 7),
        0,
        w,
        upper ? 0.9 : 14,
        4,
        side,
      );
      box(scene, x, slab.y - 0.1, 0, w, 0.2, 4.15, roof);
      box(scene, x, slab.y + 0.025, 2.06, w, 0.055, 0.08, metal);
      for (let panel = slab.start + 2; panel < slab.end; panel += 6) {
        box(scene, panel, slab.y - 4.2, 2.015, 0.035, 7, 0.025, metal);
        if (!upper) box(scene, panel + 1, -3.5, 2.035, 0.7, 1.1, 0.03, black);
      }
    }
    obstacles.forEach((o) => {
      const y = ground(o.x, o.route === "upper");
      if (o.kind === "vault") {
        box(
          scene,
          o.x + o.width / 2,
          y + (o.height || 1) / 2,
          0,
          o.width,
          o.height || 1,
          2.4,
          metal,
        );
        box(
          scene,
          o.x + o.width / 2,
          y + (o.height || 1) + 0.02,
          0,
          o.width + 0.08,
          0.05,
          2.4,
          edge,
        );
        for (let j = 0; j < 4; j++)
          box(
            scene,
            o.x + o.width / 2,
            y + 0.12 + j * (o.height || 1) * 0.19,
            1.21,
            o.width * 0.7,
            0.07,
            0.03,
            black,
          );
      } else if (o.kind === "slide") {
        box(scene, o.x + o.width / 2, y + 1.8, 0, o.width, 1.1, 3.3, roof);
        box(scene, o.x + o.width / 2, y + 2.38, 0, o.width, 0.05, 3.3, edge);
        for (const x of [o.x, o.x + o.width])
          box(scene, x, y + 0.7, -1.5, 0.2, 1.4, 0.2, metal);
      } else if (o.kind === "branch") {
        // Steps sit behind the lower running lane; jumping commits to the elevated line.
        for (let i = 0; i < 3; i++)
          box(
            scene,
            o.x + 0.8 + i * 1.65,
            (i + 1) * 0.55,
            -1.3,
            2,
            (i + 1) * 1.1,
            1.2,
            roof,
          );
      }
      if (o.kind === "gap" || o.kind === "drop") {
        box(scene, o.x - 0.12, y + 0.035, 0, 0.24, 0.06, 4.15, edge);
        if (o.kind === "gap")
          box(
            scene,
            o.x + o.width + 0.12,
            y + 0.035,
            0,
            0.24,
            0.06,
            4.15,
            edge,
          );
      }
      if (o.kind === "branch")
        box(scene, o.x + o.width, 3.32, -0.8, 0.24, 0.06, 2.6, edge);
    });
    // Rooftop service details, kept behind the playable silhouette.
    for (let i = 0; i < Math.ceil(FINISH / 22); i++) {
      const x = i * 22 - 10;
      box(scene, x, 1.1, -4, 0.12, 2.2, 0.12, metal);
      box(scene, x + 3, 1.1, -4, 0.12, 2.2, 0.12, metal);
      box(scene, x + 1.5, 2.1, -4, 3, 0.1, 0.1, metal);
      if (i % 3 === 0) {
        box(scene, x + 6, 2.4, -7, 3, 2.7, 3, metal);
        for (const offset of [-1, 1])
          box(scene, x + 6 + offset, 0.7, -7, 0.15, 1.4, 2, black);
        box(scene, x + 6, 3.8, -7, 3.1, 0.1, 3.1, metal);
      }
    }
    for (const x of [SECTOR, SECTOR * 2, FINISH]) {
      box(scene, x, 2.5, -2, 0.12, 5, 0.12, metal);
      box(scene, x + 1, 4.5, -2, 2, 0.65, 0.08, x === FINISH ? metal : roof);
    }
    // Water towers, pipework and a distant bridge echo the supplied silhouette concept.
    for (const x of [-10, 104, 280, 391]) {
      for (const offset of [-1.5, 1.5]) {
        box(scene, x + offset, 3, -5.8, 0.2, 6, 0.2, black);
        const brace = box(
          scene,
          x,
          2.7 + offset * 0.5,
          -5.8,
          3.7,
          0.12,
          0.12,
          black,
        );
        brace.rotation.z = offset > 0 ? 0.65 : -0.65;
      }
      const tank = new THREE.Mesh(cylinderGeometry, roof);
      tank.scale.set(2, 3.4, 2);
      tank.position.set(x, 7, -5.8);
      scene.add(tank);
      box(scene, x, 5.2, -5.8, 4.15, 0.16, 4.15, black);
      box(scene, x + 2.4, 3.5, -5.8, 0.2, 7, 0.2, metal);
      box(scene, x + 1.8, 6.9, -5.8, 1.4, 0.2, 0.2, metal);
    }
    const bridge = new THREE.Group();
    skyline.add(bridge);
    box(bridge, 140, 1, -47, 150, 0.35, 1, metal);
    for (let x = 70; x < 215; x += 10) {
      box(bridge, x, -3, -47, 0.6, 8, 0.6, metal);
      const brace = box(bridge, x + 4.5, -0.4, -47, 9, 0.13, 0.15, metal);
      brace.rotation.z = 0.3;
    }
    // Batch static boxes by material inside spatial chunks. Distant districts are culled.
    const batches: THREE.InstancedMesh[] = [];
    const batch = (parent: THREE.Object3D) => {
      const byMaterial = new Map<THREE.Material, THREE.Mesh[]>();
      for (const child of [...parent.children]) {
        if (child instanceof THREE.Mesh && child.geometry === boxGeometry) {
          const mat = child.material as THREE.Material;
          if (!byMaterial.has(mat)) byMaterial.set(mat, []);
          byMaterial.get(mat)!.push(child);
        } else batch(child);
      }
      byMaterial.forEach((meshes, mat) => {
        const instances = new THREE.InstancedMesh(
          boxGeometry,
          mat,
          meshes.length,
        );
        meshes.forEach((mesh, i) => {
          mesh.updateMatrix();
          instances.setMatrixAt(i, mesh.matrix);
          parent.remove(mesh);
        });
        instances.computeBoundingSphere();
        parent.add(instances);
        batches.push(instances);
      });
    };
    batch(scene);
    const player = makeRunner(scene);
    const rival = makeRunner(scene, true);
    rival.group.visible = false;
    let frame = 0,
      previous = performance.now(),
      accumulator = 0,
      ghostIndex = 0;
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      const aspect = width / height;
      const halfWidth = Math.max(18, 10.3 * aspect);
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = halfWidth / aspect;
      camera.bottom = -halfWidth / aspect;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const draw = (now: number) => {
      const dt = Math.max(0, (now - previous) / 1000);
      if (dt > 0.2 && game.phase === "running" && !game.paused) game.pause();
      previous = now;
      if (game.phase === "running" && !game.paused) {
        accumulator += dt;
        while (accumulator >= STEP) {
          game.step();
          accumulator -= STEP;
        }
      } else accumulator = 0;
      const alpha =
        game.phase === "running" && !game.paused ? accumulator / STEP : 1;
      const current = game.frame();
      const visual: Frame = interpolateFrame(game.previous, current, alpha);
      const x = visual.x;
      const next = game.next();
      const anticipate = next?.kind === "branch" && next.x - x < 17 ? 0.5 : 0;
      const targetHeight = 3.6 + Math.max(0, visual.y) * 0.32 + anticipate;
      camera.position.set(
        x + 9.5 + (visual.speed - 12) * 0.2,
        camera.position.y || 5.2,
        32,
      );
      camera.position.y +=
        (targetHeight + 1.4 - camera.position.y) *
        (1 - Math.exp(-Math.min(dt, 0.05) * 4));
      camera.lookAt(camera.position.x, camera.position.y - 1.4, 0);
      skylineLayers.forEach((layer, i) => {
        layer.position.x = x - ((x * (0.2 + i * 0.16)) % 260);
      });
      bridge.position.x = x * 0.48;
      sun.position.x = 16 + x * 0.99;
      const animationDt = game.paused ? 0 : Math.min(dt, 0.05);
      player.pose(visual, game.time, animationDt);
      const replay = ghostRef.current;
      if (replay && !game.practice && game.phase !== "ready") {
        if (
          ghostIndex >= replay.samples.length ||
          replay.samples[ghostIndex].time > game.time
        )
          ghostIndex = 0;
        while (
          ghostIndex + 1 < replay.samples.length &&
          replay.samples[ghostIndex + 1].time <= game.time
        )
          ghostIndex++;
        const a = replay.samples[ghostIndex],
          b =
            replay.samples[Math.min(ghostIndex + 1, replay.samples.length - 1)];
        const p =
          b.time > a.time
            ? THREE.MathUtils.clamp(
                (game.time - a.time) / (b.time - a.time),
                0,
                1,
              )
            : 0;
        rival.group.visible = true;
        rival.pose(
          interpolateFrame(a.frame, b.frame, p),
          game.time,
          animationDt,
        );
      } else rival.group.visible = false;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const lost = (event: Event) => {
      event.preventDefault();
      if (!game.paused) game.pause();
      setError(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      batches.forEach((mesh) => mesh.dispose());
      boxGeometry.dispose();
      sphereGeometry.dispose();
      cylinderGeometry.dispose();
      sunGeometry.dispose();
      materials.forEach((m) => m.dispose());
      player.dispose();
      rival.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [game]);
  return (
    <div
      ref={host}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden={!error}
    >
      {error && (
        <div
          role="alert"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            padding: "20%",
            color: "#fff",
            background: "#172638",
          }}
        >
          Skystride needs WebGL to render its rooftop course. Try reloading with
          hardware acceleration enabled.
        </div>
      )}
    </div>
  );
}
