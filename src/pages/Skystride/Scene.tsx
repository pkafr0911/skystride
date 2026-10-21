import { CharacterId } from "./characters";
import { SWING_GAP_EXTRA, isSwing } from "./combos";
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
import { creativeObstacle } from "./obstacle-mesh";
import { makeRunner } from "./runner";
import { CameraView, viewAngle, speedZoom, easeZoom } from "./camera";
import { interpolateFrame } from "./motion";

export default function Scene({
  game,
  ghost,
  character,
  view,
  autoView,
}: {
  view: CameraView;
  autoView: boolean;
  character: CharacterId;
  game: Run;
  ghost: RecordRun | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const characterRef = useRef(character);
  characterRef.current = character;
  const viewRef = useRef({ view, autoView });
  viewRef.current = { view, autoView };
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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xa59abb, 60, 170);
    const camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 240);
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    camera.zoom = speedZoom(game.speed, motionPreference.matches);
    scene.add(new THREE.HemisphereLight(0xffd3b2, 0x25354e, 1.25));
    const sunlight = new THREE.DirectionalLight(0xffae6b, 1.6);
    sunlight.position.set(-12, 18, -9);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(2048, 2048);
    Object.assign(sunlight.shadow.camera, {
      left: -42,
      right: 42,
      top: 28,
      bottom: -28,
      near: 0.5,
      far: 100,
    });
    sunlight.shadow.normalBias = 0.035;
    sunlight.shadow.bias = -0.0002;
    scene.add(sunlight.target);
    scene.add(sunlight);
    const fill = new THREE.DirectionalLight(0x91a8db, 0.55);
    fill.position.set(0, 6, 15);
    scene.add(fill);
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const sphereGeometry = new THREE.SphereGeometry(1, 10, 8);
    const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 12);
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
    const roof = material(0x35465a),
      side = material(0x182a43),
      edge = material(0xf3ae65);
    const metal = material(0x40506a),
      black = material(0x101c2c);
    // Atmospheric props have a deliberately lighter, quieter value range.
    const decor = new THREE.MeshBasicMaterial({ color: 0x9797ad });
    const decorDark = new THREE.MeshBasicMaterial({ color: 0x838ba2 });
    materials.push(decor, decorDark);
    const solar = material(0x203958),
      alloy = material(0x718097);
    const seam = material(0x26374c),
      windowGlass = material(0x49647b),
      warmWindow = material(0xc99868);
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
        color: [0xb9a8bd, 0xa39bb5, 0x9297b0][layer],
      });
      const glass = new THREE.MeshBasicMaterial({
        color: [0xc4adc0, 0xada4bc, 0xa0a5bc][layer],
      });
      materials.push(mat, glass);
      for (let i = 0; i < 125; i++) {
        const h = 7 + ((i * 13 + layer * 7) % 19) * 0.48;
        const x = i * 3.2 - 65 + layer * 1.1,
          z = -85 + layer * 25;
        const w = 2 + (i % 4) * 0.44,
          base = -1 - layer * 0.5 + z * 0.28;
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
    sun.position.set(16, -30.5, -125);
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
      // Coping and cross-roof seams reveal the width of the running surface.
      box(scene, x, slab.y - 0.23, 2.09, w, 0.16, 0.12, alloy);
      box(scene, x, slab.y + 0.07, -2, w, 0.14, 0.16, metal);
      for (let joint = slab.start + 1; joint < slab.end; joint += 3) {
        box(scene, joint, slab.y + 0.006, 0, 0.025, 0.012, 3.95, seam);
      }
      if (!upper) {
        for (
          let column = slab.start + 1;
          column < slab.end - 0.8;
          column += 2.4
        ) {
          for (let row = 0; row < 3; row++) {
            box(
              scene,
              column,
              slab.y - 2 - row * 2.5,
              2.025,
              0.9,
              1.25,
              0.045,
              (Math.floor(column) + row) % 7 === 0 ? warmWindow : windowGlass,
            );
            box(
              scene,
              column,
              slab.y - 2.66 - row * 2.5,
              2.07,
              1.05,
              0.09,
              0.14,
              metal,
            );
          }
        }
      }
      for (let panel = slab.start + 2; panel < slab.end; panel += 6) {
        box(scene, panel, slab.y - 4.2, 2.015, 0.035, 7, 0.025, metal);
        if (!upper) box(scene, panel + 1, -3.5, 2.035, 0.7, 1.1, 0.03, black);
      }
    }
    obstacles.forEach((o) => {
      const y = isSwing(o.technique)
        ? o.route === "upper"
          ? 3.3
          : 0
        : ground(o.x, o.route === "upper");
      if (o.feature) {
        chunkFor(o.x).add(
          creativeObstacle(o, {
            box: boxGeometry,
            cylinder: cylinderGeometry,
            face: metal,
            dark: black,
            trim: alloy,
            amber: edge,
            panel: solar,
          }),
        );
      } else if (o.kind === "vault") {
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
        box(
          scene,
          o.x + o.width / 2,
          y + (1.25 + (o.height ?? 2.35)) / 2,
          0,
          o.width,
          (o.height ?? 2.35) - 1.25,
          3.3,
          roof,
        );
        box(
          scene,
          o.x + o.width / 2,
          y + (o.height ?? 2.35) + 0.03,
          0,
          o.width,
          0.05,
          3.3,
          edge,
        );
        box(
          scene,
          o.x + o.width / 2,
          y + 1.25,
          1.67,
          o.width,
          0.055,
          0.055,
          edge,
        );
        for (const x of [o.x, o.x + o.width])
          box(scene, x, y + 0.7, -1.5, 0.2, 1.4, 0.2, metal);
      } else if (o.kind === "branch") {
        if (o.height) {
          // Climb face occupies the rear branch lane; the normal line passes in front.
          const face = o.x + o.width;
          box(
            scene,
            face + 1.1,
            o.height / 2,
            -1.25,
            2.2,
            o.height,
            2.25,
            roof,
          );
          box(
            scene,
            face + 1.1,
            o.height + 0.025,
            -1.25,
            2.2,
            0.05,
            2.25,
            edge,
          );
          box(scene, face - 0.025, 1.25, -1.25, 0.05, 0.12, 1.9, edge);
          for (let row = 0; row < 4; row++)
            box(
              scene,
              face - 0.015,
              0.4 + row * 0.7,
              -1.25,
              0.03,
              0.025,
              2.25,
              metal,
            );
        } else {
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
      }
      if (o.kind === "gap" || o.kind === "drop" || isSwing(o.technique)) {
        box(scene, o.x - 0.12, y + 0.035, 0, 0.24, 0.06, 4.15, edge);
        if (o.kind === "gap" || isSwing(o.technique))
          box(
            scene,
            o.x + o.width + (isSwing(o.technique) ? SWING_GAP_EXTRA : 0) + 0.12,
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
      box(scene, x + 2, -7, -11, 17, 14, 6, decorDark);
      box(scene, x, 1.1, -9, 0.12, 2.2, 0.12, decor);
      box(scene, x + 3, 1.1, -9, 0.12, 2.2, 0.12, decor);
      box(scene, x + 1.5, 2.1, -9, 3, 0.1, 0.1, decor);
      if (i % 3 === 0) {
        box(scene, x + 6, 2.4, -12, 3, 2.7, 3, decor);
        for (const offset of [-1, 1])
          box(scene, x + 6 + offset, 0.7, -12, 0.15, 1.4, 2, decorDark);
        box(scene, x + 6, 3.8, -12, 3.1, 0.1, 3.1, decor);
      }
    }
    for (const x of [SECTOR, SECTOR * 2, FINISH]) {
      box(scene, x, 2.5, -2, 0.12, 5, 0.12, metal);
      box(scene, x + 1, 4.5, -2, 2, 0.65, 0.08, x === FINISH ? metal : roof);
    }
    // Water towers, pipework and a distant bridge echo the supplied silhouette concept.
    for (const x of [-10, 104, 280, 391]) {
      for (const offset of [-1.5, 1.5]) {
        box(scene, x + offset, 3, -12, 0.2, 6, 0.2, decorDark);
        const brace = box(
          scene,
          x,
          2.7 + offset * 0.5,
          -12,
          3.7,
          0.12,
          0.12,
          decorDark,
        );
        brace.rotation.z = offset > 0 ? 0.65 : -0.65;
      }
      const tank = new THREE.Mesh(cylinderGeometry, decorDark);
      tank.scale.set(2, 3.4, 2);
      tank.position.set(x, 7, -12);
      scene.add(tank);
      box(scene, x, 5.2, -12, 4.15, 0.16, 4.15, decorDark);
      box(scene, x + 2.4, 3.5, -12, 0.2, 7, 0.2, decor);
      box(scene, x + 1.8, 6.9, -12, 1.4, 0.2, 0.2, decor);
    }
    const bridge = new THREE.Group();
    skyline.add(bridge);
    box(bridge, 140, 1, -47, 150, 0.35, 1, decor);
    for (let x = 70; x < 215; x += 10) {
      box(bridge, x, -3, -47, 0.6, 8, 0.6, decor);
      const brace = box(bridge, x + 4.5, -0.4, -47, 9, 0.13, 0.15, decor);
      brace.rotation.z = 0.3;
    }
    // Batch static boxes by material; Three culls each batch using its full bounds.
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
    // Preserve shadows through instancing, including curved obstacle geometry.
    const enableShadows = (root: THREE.Object3D) =>
      root.traverse((object) => {
        if (
          object instanceof THREE.Mesh &&
          object.material instanceof THREE.MeshStandardMaterial &&
          !object.material.transparent
        ) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
    enableShadows(scene);
    let activeCharacter = characterRef.current;
    let player = makeRunner(scene, false, activeCharacter);
    let rival = makeRunner(scene, true, activeCharacter);
    enableShadows(player.group);
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
    let activeView = viewRef.current.view;
    let cycling = viewRef.current.autoView;
    let viewStart = game.time;
    let angle = viewAngle(activeView, 0, false);
    let focusHeight = 3;
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
      const closeFraming = THREE.MathUtils.clamp(
        (camera.zoom / 2 - 1) / 2.84,
        0,
        1,
      );
      const targetHeight = THREE.MathUtils.lerp(
        3.6 + Math.max(0, visual.y) * 0.32 + anticipate,
        visual.y + 1.1,
        closeFraming,
      );
      if (!game.paused) {
        camera.zoom = easeZoom(
          camera.zoom,
          speedZoom(visual.speed, motionPreference.matches),
          Math.min(dt, 0.05),
        );
        camera.updateProjectionMatrix();
      }
      if (
        activeView !== viewRef.current.view ||
        cycling !== viewRef.current.autoView ||
        game.time < viewStart
      ) {
        activeView = viewRef.current.view;
        cycling = viewRef.current.autoView;
        viewStart = game.time;
      }
      const desired = viewAngle(
        activeView,
        game.time - viewStart,
        cycling && !motionPreference.matches,
      );
      const blend = motionPreference.matches
        ? 1
        : 1 - Math.exp(-Math.min(dt, 0.05) * 1.5);
      {
        angle.x += (desired.x - angle.x) * blend;
        angle.elevation += (desired.elevation - angle.elevation) * blend;
        focusHeight +=
          (targetHeight - focusHeight) *
          (1 - Math.exp(-Math.min(dt, 0.05) * 4));
      }
      const focusX = x + 9.5 / camera.zoom;
      camera.position.set(focusX + angle.x, focusHeight + angle.elevation, 32);
      camera.lookAt(focusX, focusHeight, 0);
      sunlight.position.set(x - 12, 22, 10);
      sunlight.target.position.set(x + 5, 0, 0);
      // Use Three's geometry bounds for culling. A long roof can span many
      // chunks: hiding it by its midpoint also hides the floor under the runner.
      // Keep the skyline at the horizon as the camera elevation changes.
      const horizonShift = angle.elevation / 32 - 0.28;
      skylineLayers.forEach((layer, i) => {
        layer.position.y = (-85 + i * 25) * horizonShift;
        layer.position.x = x - ((x * (0.2 + i * 0.16)) % 260);
      });
      bridge.position.x = x * 0.48;
      sun.position.x = 16 + x * 0.99;
      sun.position.y = 4.5 - (125 * angle.elevation) / 32;
      const animationDt = game.paused ? 0 : Math.min(dt, 0.05);
      if (activeCharacter !== characterRef.current) {
        player.dispose();
        rival.dispose();
        activeCharacter = characterRef.current;
        player = makeRunner(scene, false, activeCharacter);
        enableShadows(player.group);
        rival = makeRunner(scene, true, activeCharacter);
      }
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
      sunlight.shadow.dispose();
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
