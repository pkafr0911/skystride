import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FINISH, ground, Move, obstacles, RecordRun, Run, STEP } from './model';

export default function Scene({ game, ghost }: { game: Run; ghost: RecordRun | null }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
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
    scene.fog = new THREE.Fog(0xc9a2a5, 50, 145);
    const camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 240);
    scene.add(new THREE.HemisphereLight(0xffd3b2, 0x25354e, 2.3));
    const sunlight = new THREE.DirectionalLight(0xffae6b, 3.5);
    sunlight.position.set(-12, 18, -9);
    scene.add(sunlight);
    const fill = new THREE.DirectionalLight(0x91a8db, 1.2);
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
    const roof = material(0x202f43),
      side = material(0x142234),
      edge = material(0xf3ae65);
    const metal = material(0x344456),
      black = material(0x101c2c),
      windowMat = material(0xffce87);
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
      parent.add(mesh);
      return mesh;
    };
    const skyline = new THREE.Group();
    scene.add(skyline);
    for (let layer = 0; layer < 3; layer++) {
      const mat = material([0x9b92b0, 0x6f7796, 0x4b5876][layer]);
      for (let i = 0; i < 38; i++) {
        const h = 3 + ((i * 13 + layer * 7) % 19);
        const x = i * 13 - 100;
        const z = -105 + layer * 28;
        box(skyline, x, h / 2 - 6, z, 5 + (i % 4), h, 4, mat);
        if (i % 3 === 0) box(skyline, x, h - 4.5, z, 0.12, 4, 0.12, mat);
        if (layer === 2)
          for (let k = 0; k < 3; k++)
            box(skyline, x - 1.6 + k * 1.5, h / 2, z + 2.05, 0.35, 0.65, 0.08, windowMat);
      }
    }
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdc9d });
    materials.push(sunMat);
    const sunGeometry = new THREE.CircleGeometry(4.8, 48);
    const sun = new THREE.Mesh(sunGeometry, sunMat);
    sun.position.set(40, 9, -125);
    scene.add(sun);
    // Roof surfaces are cut at the same gap intervals used by the simulation.
    const platform = (start: number, end: number, y: number, upper: boolean) => {
      const gaps = obstacles.filter(
        (o) =>
          o.kind === 'gap' && (upper ? o.route === 'upper' : !o.route) && o.x >= start && o.x < end,
      );
      let cursor = start;
      const slab = (a: number, b: number) => {
        if (b <= a) return;
        box(scene, (a + b) / 2, y - (upper ? 0.4 : 5), 0, b - a, upper ? 0.8 : 10, 4, side);
        box(scene, (a + b) / 2, y - 0.09, 0, b - a, 0.18, 4.15, roof);
        box(scene, (a + b) / 2, y, -1.8, b - a, 0.055, 0.08, edge);
        for (let x = a + 1; x < b; x += 3) box(scene, x, y - 1.4, 2.015, 0.035, 2.5, 0.025, metal);
      };
      gaps.forEach((g) => {
        slab(cursor, g.x);
        cursor = g.x + g.width;
      });
      slab(cursor, end);
    };
    platform(-20, FINISH + 20, 0, false);
    platform(88, 145, 3.3, true);
    platform(213, 254, 3.3, true);
    obstacles.forEach((o) => {
      const y = ground(o.x, o.route === 'upper');
      if (o.kind === 'vault') {
        box(scene, o.x + o.width / 2, y + 0.6, 0, o.width, 1.2, 2.4, metal);
        box(scene, o.x + o.width / 2, y + 1.22, 0, o.width + 0.08, 0.05, 2.4, edge);
        for (let j = 0; j < 4; j++)
          box(
            scene,
            o.x + o.width / 2,
            y + 0.25 + j * 0.19,
            1.21,
            o.width * 0.7,
            0.07,
            0.03,
            black,
          );
      } else if (o.kind === 'slide') {
        box(scene, o.x + o.width / 2, y + 1.8, 0, o.width, 1.1, 3.3, roof);
        box(scene, o.x + o.width / 2, y + 2.38, 0, o.width, 0.05, 3.3, edge);
        for (const x of [o.x, o.x + o.width]) box(scene, x, y + 0.7, -1.5, 0.2, 1.4, 0.2, metal);
      } else if (o.kind === 'branch') {
        // Steps sit behind the lower running lane; jumping commits to the elevated line.
        for (let i = 0; i < 3; i++)
          box(scene, o.x + 1 + i * 2, (i + 1) * 0.55, -1.3, 2, (i + 1) * 1.1, 1.2, roof);
      }
      if (o.kind !== 'drop') {
        box(scene, o.x - 2.25, y + 0.015, 0.8, 1.7, 0.025, 0.28, edge);
      }
    });
    // Rooftop service details, kept behind the playable silhouette.
    for (let i = 0; i < 17; i++) {
      const x = i * 22 - 10;
      box(scene, x, 1.1, -4, 0.12, 2.2, 0.12, metal);
      box(scene, x + 3, 1.1, -4, 0.12, 2.2, 0.12, metal);
      box(scene, x + 1.5, 2.1, -4, 3, 0.1, 0.1, edge);
      if (i % 3 === 0) {
        box(scene, x + 6, 2.4, -7, 3, 2.7, 3, metal);
        for (const offset of [-1, 1]) box(scene, x + 6 + offset, 0.7, -7, 0.15, 1.4, 2, black);
        box(scene, x + 6, 3.8, -7, 3.1, 0.1, 3.1, edge);
      }
    }
    for (const x of [108, 216, FINISH]) {
      box(scene, x, 2.5, -2, 0.12, 5, 0.12, edge);
      box(scene, x + 1, 4.5, -2, 2, 0.65, 0.08, x === FINISH ? windowMat : metal);
    }
    const skin = material(0x192435),
      shirt = material(0xf4e5c6),
      red = material(0xc63c43),
      pants = material(0x101b2a);
    const ghostMat = material(0xa8ede4, 0.23);
    function runner(ghosted = false) {
      const group = new THREE.Group();
      scene.add(group);
      const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
        const m = new THREE.Mesh(geo, ghosted ? ghostMat : mat);
        group.add(m);
        return m;
      };
      const head = mesh(sphereGeometry, skin);
      head.scale.set(0.19, 0.25, 0.19);
      const hair = mesh(sphereGeometry, pants);
      hair.scale.set(0.23, 0.2, 0.22);
      const tail = mesh(cylinderGeometry, pants);
      tail.scale.set(0.09, 0.48, 0.08);
      const torso = mesh(cylinderGeometry, shirt);
      torso.scale.set(0.24, 0.62, 0.19);
      const hips = mesh(sphereGeometry, pants);
      hips.scale.set(0.24, 0.22, 0.21);
      const limbs = Array.from({ length: 8 }, (_, i) =>
        mesh(cylinderGeometry, i < 4 ? pants : skin),
      );
      const shoes = [mesh(boxGeometry, red), mesh(boxGeometry, red)];
      const cuffs = [mesh(sphereGeometry, red), mesh(sphereGeometry, red)];
      const axis = new THREE.Vector3(0, 1, 0);
      const segment = (m: THREE.Mesh, a: number[], b: number[], radius: number) => {
        const av = new THREE.Vector3(...(a as [number, number, number]));
        const bv = new THREE.Vector3(...(b as [number, number, number]));
        const diff = bv.clone().sub(av);
        m.position.copy(av.add(bv).multiplyScalar(0.5));
        m.scale.set(radius, diff.length(), radius);
        m.quaternion.setFromUnitVectors(axis, diff.normalize());
      };
      return {
        group,
        pose(x: number, y: number, time: number, move: Move) {
          group.position.set(x, y, 0.45);
          const low = move === 'slide' || move === 'stumble';
          const airborne = ['jump', 'vault', 'wall', 'catch'].includes(move);
          const roll = move === 'roll';
          const hipY = low ? 0.38 : roll ? 0.67 : 0.98;
          const shoulderX = low ? -0.35 : 0.13;
          const shoulderY = low ? 0.78 : roll ? 1 : 1.57;
          hips.position.set(0, hipY, 0);
          segment(torso, [0, hipY + 0.12, 0], [shoulderX, shoulderY, 0], 0.23);
          torso.scale.z = 0.18;
          head.position.set(shoulderX + 0.07, shoulderY + 0.3, 0);
          hair.position.copy(head.position).add(new THREE.Vector3(-0.06, 0.12, 0));
          tail.position.copy(hair.position).add(new THREE.Vector3(-0.3, -0.05, 0));
          tail.rotation.z = -1.1 + Math.sin(time * 12) * 0.15;
          for (let s = 0; s < 2; s++) {
            const z = s === 0 ? -0.15 : 0.15;
            const wave = Math.sin(time * 15 + s * Math.PI);
            const knee = low
              ? [0.48 + s * 0.2, 0.23, z]
              : airborne
                ? [s ? 0.6 : -0.35, hipY - 0.18, z]
                : [wave * 0.42, 0.55 + Math.max(0, wave) * 0.12, z];
            const foot = low
              ? [0.95 + s * 0.25, 0.12, z]
              : airborne
                ? [s ? 0.3 : -0.7, hipY - 0.55, z]
                : [-wave * 0.62, 0.1 + Math.max(0, wave) * 0.28, z];
            segment(limbs[s * 2], [0, hipY, z], knee, 0.13);
            segment(limbs[s * 2 + 1], knee, foot, 0.095);
            shoes[s].position.set(foot[0] + 0.09, foot[1], z);
            shoes[s].scale.set(0.36, 0.12, 0.2);
            const reaching = move === 'catch' || move === 'wall';
            const elbow = reaching
              ? [0.35, shoulderY + 0.18, z]
              : [shoulderX - wave * 0.35, shoulderY - 0.3, z];
            const hand = reaching
              ? [0.55, shoulderY + 0.6, z]
              : move === 'vault'
                ? [0.1, 0.3, z]
                : low
                  ? [-0.6, 0.12, z]
                  : [shoulderX - wave * 0.4 + 0.23, shoulderY - 0.48 + Math.abs(wave) * 0.25, z];
            segment(limbs[4 + s * 2], [shoulderX, shoulderY, z], elbow, 0.075);
            segment(limbs[5 + s * 2], elbow, hand, 0.065);
            cuffs[s].position.set(...(hand as [number, number, number]));
            cuffs[s].scale.set(0.08, 0.11, 0.08);
          }
        },
      };
    }
    const player = runner();
    const rival = runner(true);
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
      const halfWidth = Math.max(14, 8.5 * aspect);
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
      const dt = (now - previous) / 1000;
      if (dt > 0.2 && game.phase === 'running' && !game.paused) game.pause();
      previous = now;
      if (game.phase === 'running' && !game.paused) {
        accumulator += dt;
        while (accumulator >= STEP) {
          game.step();
          accumulator -= STEP;
        }
      } else accumulator = 0;
      const x = game.x;
      camera.position.set(x + 8, 5.7, 28);
      camera.lookAt(x + 8, 4.1, 0);
      skyline.position.x = x * 0.55;
      sun.position.x = 32 + x * 0.91;
      player.pose(x, game.y, game.time, game.move);
      if (ghost && !game.practice && game.phase !== 'ready') {
        if (ghostIndex >= ghost.samples.length || ghost.samples[ghostIndex][0] > game.time)
          ghostIndex = 0;
        while (
          ghostIndex + 1 < ghost.samples.length &&
          ghost.samples[ghostIndex + 1][0] <= game.time
        )
          ghostIndex++;
        const a = ghost.samples[ghostIndex],
          b = ghost.samples[Math.min(ghostIndex + 1, ghost.samples.length - 1)];
        const p = b[0] > a[0] ? Math.max(0, Math.min(1, (game.time - a[0]) / (b[0] - a[0]))) : 0;
        rival.group.visible = true;
        rival.pose(a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p, game.time, a[3]);
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
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      boxGeometry.dispose();
      sphereGeometry.dispose();
      cylinderGeometry.dispose();
      sunGeometry.dispose();
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [game, ghost]);
  return (
    <div ref={host} style={{ position: 'absolute', inset: 0 }} aria-hidden={!error}>
      {error && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            padding: '20%',
            color: '#fff',
            background: '#172638',
          }}
        >
          Skystride needs WebGL to render its rooftop course. Try reloading with hardware
          acceleration enabled.
        </div>
      )}
    </div>
  );
}
