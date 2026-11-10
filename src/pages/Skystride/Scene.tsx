import { ropeAnchor, ropeContact } from "./game/kiln-movement";
import { swingGripOffset } from "./game/combos";
import { streetProp } from "./obstacles/street-props";
import { TraversalAudio } from "./game/audio";
import { CharacterId } from "./characters/characters";
import { SWING_GAP_EXTRA, isSwing } from "./game/combos";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Frame, RecordRun, Run, STEP } from "./game/model";
import { creativeObstacle } from "./obstacles/obstacle-mesh";
import { makeRunner } from "./characters/runner";
import {
  CameraView,
  dodgeCameraBlend,
  viewAngle,
  speedZoom,
  easeZoom,
  traversalZoom,
} from "./game/camera";
import { interpolateFrame } from "./game/motion";

export default function Scene({
  game,
  ghost,
  character,
  view,
  autoView,
  sound,
}: {
  sound: boolean;
  view: CameraView;
  autoView: boolean;
  character: CharacterId;
  game: Run;
  ghost: RecordRun | null;
}) {
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const characterRef = useRef(character);
  characterRef.current = character;
  const viewRef = useRef({ view, autoView });
  viewRef.current = { view, autoView };
  const ghostRef = useRef(ghost);
  ghostRef.current = ghost;
  useEffect(() => {
    const {
      finish: FINISH,
      ground,
      obstacles,
      surfaces,
      lowerRoofDrops,
      skybridges,
    } = game.level;
    const kiln = game.level.atmosphere === "kiln";
    const harbor = game.level.atmosphere === "harbor";
    const saigon = game.level.atmosphere === "saigon";
    const street = game.level.atmosphere === "street";
    const container = host.current!;
    const audio = new TraversalAudio();
    audio.setEnabled(soundRef.current);
    const unlockAudio = () => {
      audio.setEnabled(soundRef.current);
      audio.unlock();
    };
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    let feedbackId = -1;
    let feedbackTime = -1;
    let flightGap = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      audio.dispose();
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
    scene.fog = new THREE.Fog(
      kiln
        ? 0xd4ac98
        : harbor
          ? 0x9fc8cf
          : saigon
            ? 0xc5ac9a
            : street
              ? 0xa8b5b3
              : 0xa59abb,
      60,
      170,
    );
    const camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 240);
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    camera.zoom = speedZoom(game.speed, motionPreference.matches);
    scene.add(
      new THREE.HemisphereLight(
        harbor ? 0xd9f7f5 : saigon ? 0xffe6b5 : street ? 0xe7eeeb : 0xffd3b2,
        street ? 0x384343 : 0x25354e,
        1.25,
      ),
    );
    const sunlight = new THREE.DirectionalLight(
      harbor ? 0xe4f6ed : saigon ? 0xffd6a0 : street ? 0xf2e5cf : 0xffae6b,
      1.6,
    );
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
    sunlight.shadow.normalBias = 0.06;
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
    const sceneryGeometries: THREE.BufferGeometry[] = [];
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
    const roof = material(
        kiln ? 0xb5a28a : saigon ? 0x8b8171 : street ? 0x333d43 : 0x35465a,
      ),
      side = material(
        kiln ? 0x9e624e : saigon ? 0xb8a081 : street ? 0x343b3c : 0x182a43,
      ),
      edge = material(harbor ? 0x9fe5d5 : street ? 0xf1c85b : 0xf3ae65);
    // Mid-tone matte steel preserves panel detail under the warm sunlight.
    const vaultFace = material(0x5e7084),
      slideFace = material(0x586f83),
      rampFace = material(0x687b8b),
      obstacleTrim = material(0x89939c),
      obstacleAccent = material(0xbd8c56),
      obstacleDark = material(0x152634);
    for (const finish of [
      vaultFace,
      slideFace,
      rampFace,
      obstacleTrim,
      obstacleAccent,
    ]) {
      finish.roughness = 1;
      finish.metalness = 0;
    }
    const kilnPalette = {
      brick: material(0xa85d45),
      chalk: material(0xd8cbb3),
      wood: material(0x594231),
      indigo: material(0x375c79),
    };
    const metal = material(0x40506a),
      black = material(0x101c2c),
      streetAsphalt = material(0x3f4a4b),
      streetSidewalk = material(0x9a9b91),
      streetMarking = material(0xe4dfc9),
      streetBrick = material(0x766c61),
      streetGlass = material(0x71918f),
      streetAwning = material(0xc65d43),
      streetGreen = material(0x607a4d),
      streetRed = material(0xb64435);
    // Atmospheric props have a deliberately lighter, quieter value range.
    const decor = new THREE.MeshBasicMaterial({ color: 0x9797ad });
    const decorDark = new THREE.MeshBasicMaterial({ color: 0x838ba2 });
    materials.push(decor, decorDark);
    const solar = material(0x203958),
      alloy = material(0x718097);
    const seam = material(0x26374c),
      windowGlass = material(0x49647b),
      warmWindow = material(0xc99868);
    const buildingFaces = [
      side,
      material(saigon ? 0xc9ad7e : 0x24364b),
      material(saigon ? 0xb97e68 : 0x303c50),
      material(saigon ? 0x7d9b90 : 0x1c3040),
    ];
    // Roof skins receive shadows; their solid building bodies cast them.
    // Dedicated materials keep the instanced batches separate from obstacles.
    const buildingCaps = [
      material(saigon ? 0xb6a78e : 0x35465a),
      material(saigon ? 0xc5b79d : 0x455063),
      material(saigon ? 0xa6a58c : 0x394c59),
      material(saigon ? 0xb8ab95 : 0x40506a),
    ];
    const receiveOnlyMaterials = new Set<THREE.Material>([
      ...buildingCaps,
      seam,
      windowGlass,
      warmWindow,
    ]);
    const vietnamPalette = saigon
      ? {
          wood: material(0x9a7151),
          cream: material(0xddc9a0),
          jade: material(0x397d77),
          coral: material(0xc56d54),
          leaf: material(0x4c7850),
          steel: material(0xa4b0ad),
        }
      : undefined;
    if (vietnamPalette) {
      vietnamPalette.steel.metalness = 0.5;
      vietnamPalette.steel.roughness = 0.4;
    }
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
    // Closed service hatches are low architectural details, with no action-colored trim.
    const serviceHatch = (
      parent: THREE.Object3D,
      x: number,
      y: number,
      z: number,
    ) => {
      box(parent, x, y + 0.04, z, 1.7, 0.08, 1.05, seam);
      box(parent, x, y + 0.105, z, 1.55, 0.05, 0.9, roof);
      for (const offset of [-0.5, 0.5])
        box(parent, x + offset, y + 0.145, z - 0.35, 0.15, 0.03, 0.12, metal);
      box(parent, x, y + 0.15, z + 0.28, 0.25, 0.04, 0.08, seam);
    };
    const skyline = new THREE.Group();
    scene.add(skyline);
    const skylineLayers: THREE.Group[] = [];
    for (let layer = 0; layer < 3; layer++) {
      const buildings = new THREE.Group();
      skyline.add(buildings);
      skylineLayers.push(buildings);
      const mat = new THREE.MeshBasicMaterial({
        color: street
          ? [0xaeb8b3, 0x969f9e, 0x7e8d90][layer]
          : [0xb9a8bd, 0xa39bb5, 0x9297b0][layer],
      });
      const glass = new THREE.MeshBasicMaterial({
        color: street
          ? [0xc2c9bd, 0xaebbb4, 0x9bacaa][layer]
          : [0xc4adc0, 0xada4bc, 0xa0a5bc][layer],
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
    const sunMat = new THREE.MeshBasicMaterial({
      color: street ? 0xe9dfbd : 0xffdc9d,
      fog: false,
    });
    materials.push(sunMat);
    const sunGeometry = new THREE.CircleGeometry(2.3, 48);
    const sun = new THREE.Mesh(sunGeometry, sunMat);
    sun.position.set(16, -30.5, -125);
    scene.add(sun);
    const crane = obstacles.find(
      (o) => o.landmark === "crane" && isSwing(o.technique),
    );
    const skylights = obstacles.filter((o) => o.landmark === "skylights");
    const skyStart = skylights[0]?.x ?? Infinity;
    const skyEnd = skylights.length
      ? skylights[skylights.length - 1].x + 4
      : -Infinity;
    const craneBank = crane
      ? crane.x + crane.width + SWING_GAP_EXTRA
      : Infinity;
    const narrowRanges = [
      [skyStart, skyEnd],
      [craneBank, craneBank + 5],
    ];
    // Full-width rooftop edge markings identify the real building-to-building gaps.
    for (const bridge of skybridges) {
      for (const offset of [28.5, 29.3, 38, 39])
        box(
          scene,
          bridge.start + offset,
          bridge.height + 0.025,
          -1.6,
          0.18,
          0.05,
          6.6,
          edge,
        );
    }
    // Bright takeoff bars and a clear landing strip mark the deep lower-route transfers.
    for (const drop of lowerRoofDrops) {
      for (const offset of [0.5, 1.1, 1.7])
        box(
          scene,
          drop.x - offset,
          ground(drop.x - offset, false) + 0.035,
          0,
          0.16,
          0.06,
          3.8,
          edge,
        );
      for (let offset = 2; offset <= 14; offset += 3)
        box(
          scene,
          drop.x + drop.width + offset,
          -drop.depth + 0.035,
          0,
          0.3,
          0.06,
          3.8,
          edge,
        );
    }
    const renderSurfaces = street
      ? []
      : surfaces.flatMap((slab) => {
          if (!slab.upper) return [slab];
          const boundaries = [
            slab.start,
            slab.end,
            ...narrowRanges
              .flat()
              .filter((x) => x > slab.start && x < slab.end),
          ].sort((a, b) => a - b);
          return boundaries
            .slice(0, -1)
            .map((start, i) => ({ ...slab, start, end: boundaries[i + 1] }));
        });
    // Physical roof heights and connecting ramps come from the collision surfaces.
    for (const slab of renderSurfaces) {
      if (game.level.dodge && slab.start >= game.level.dodge.start) continue;
      const upper = slab.upper;
      const narrow =
        upper &&
        narrowRanges.some(
          ([start, end]) => slab.start >= start && slab.end <= end,
        );
      if (narrow) {
        const width = slab.end - slab.start;
        const x = (slab.start + slab.end) / 2;
        box(scene, x, slab.y - 0.45, 0, width, 0.9, 0.85, metal);
        box(scene, x, slab.y + 0.02, 0.43, width, 0.04, 0.05, edge);
        box(scene, x, slab.y + 0.02, -0.43, width, 0.04, 0.05, edge);
        for (const end of [slab.start + 0.15, slab.end - 0.15]) {
          box(scene, end, slab.y - 1.8, -0.5, 0.12, 2.7, 0.12, alloy);
        }
        continue;
      }
      if (upper) {
        // The lower route runs along the front terrace of a taller rear building.
        // Keep its running plane clear: the occupied floors are set behind it.
        const width = slab.end - slab.start;
        const x = (slab.start + slab.end) / 2;
        const endY = slab.endY ?? slab.y;
        const top = Math.min(slab.y, endY) - 0.9;
        const bottom = -14;
        const face =
          buildingFaces[
            Math.abs(Math.floor(slab.start / 80)) % buildingFaces.length
          ];
        const group = chunkFor(x);
        box(group, x, (top + bottom) / 2, -3.4, width, top - bottom, 4, face);
        // Stepped roof infill belongs to the rear facade, never the lower lane.
        if (slab.endY !== undefined) {
          const fill = box(
            group,
            x,
            (slab.y + endY) / 2 - 1.8,
            -3.4,
            width,
            1.8,
            4,
            face,
          );
          fill.updateMatrix();
          fill.matrix.elements[1] = endY - slab.y;
          fill.matrixAutoUpdate = false;
        }
        for (
          let column = slab.start + 1.5;
          column < slab.end - 1;
          column += 3.2
        ) {
          for (let y = -10; y < top - 1; y += 2.5) {
            box(group, column, y, -1.37, 1.25, 1.35, 0.06, windowGlass);
            box(group, column, y - 0.74, -1.3, 1.45, 0.12, 0.18, alloy);
          }
        }
        // Architectural silhouettes stay distinct from interactive equipment.
        // All decorative raised geometry sits behind the playable lane.
        if (slab.endY === undefined) {
          box(group, x, slab.y + 0.35, -5.3, width, 0.7, 0.2, face);
          if (width > 12) serviceHatch(group, slab.start + 5, slab.y, -3.7);
        }
      }
      if (slab.endY !== undefined) {
        const width = slab.end - slab.start;
        const x = (slab.start + slab.end) / 2;
        const y = (slab.y + slab.endY) / 2;
        const slope = (slab.endY - slab.y) / width;
        const rampBox = (
          cy: number,
          z: number,
          height: number,
          depth: number,
          mat: THREE.Material,
        ) => {
          const mesh = box(scene, x, cy, z, width, height, depth, mat);
          mesh.updateMatrix();
          mesh.matrix.elements[1] = slope * width;
          mesh.matrixAutoUpdate = false;
        };
        rampBox(
          y - (upper ? 0.55 : 7.1),
          upper ? -1.6 : -1,
          upper ? 0.7 : 13.8,
          upper ? 7.6 : 6,
          upper ? metal : side,
        );
        rampBox(
          y - 0.1,
          upper ? -1.6 : -1,
          0.2,
          upper ? 7.6 : 6.15,
          buildingCaps[0],
        );
        rampBox(y + 0.025, upper ? 2.16 : 2.06, 0.055, 0.08, edge);
        rampBox(y + 0.025, upper ? -5.36 : -4.06, 0.055, 0.08, edge);
        if (!upper) {
          // One roof skin only: overlapping coping tops cause depth flicker.
          rampBox(y + 0.012, 1.65, 0.024, 0.16, black);
        }
        continue;
      }
      let start = slab.start;
      let part = 0;
      while (start < slab.end) {
        const seed = Math.abs(Math.floor(slab.start * 13) + part * 17);
        const remaining = slab.end - start;
        const nominal = upper ? 14 + (seed % 9) : 16 + (seed % 17);
        const width = remaining < nominal + 7 ? remaining : nominal;
        const end = start + width;
        const x = (start + end) / 2;
        const variant = seed % buildingFaces.length;
        const face = buildingFaces[variant];
        const cap = buildingCaps[variant];
        const depth = upper ? 7.6 : 6;
        const centerZ = upper ? -1.6 : -1;
        const thickness = 0.2;
        const wallHeight = upper ? 0.7 : 13.8 + (seed % 4);
        const group = chunkFor(x);
        box(
          group,
          x,
          slab.y - thickness - wallHeight / 2,
          centerZ,
          width,
          wallHeight,
          depth,
          face,
        );
        // Contiguous slabs have no fake jump gaps or raised collisionless lips.
        box(
          group,
          x,
          slab.y - thickness / 2,
          centerZ,
          width,
          thickness,
          depth + 0.15,
          cap,
        );
        box(
          group,
          x,
          slab.y + 0.025,
          centerZ + depth / 2 + 0.06,
          width,
          0.055,
          0.08,
          metal,
        );
        box(
          group,
          x,
          slab.y - 0.23,
          centerZ + depth / 2 + 0.09,
          width,
          0.16,
          0.12,
          alloy,
        );
        for (let joint = start + 3; joint < end; joint += 4) {
          box(
            group,
            joint,
            slab.y + 0.006,
            centerZ,
            0.025,
            0.012,
            depth - 0.1,
            seam,
          );
        }
        if (!upper) {
          const front = centerZ + depth / 2;
          const back = centerZ - depth / 2;
          // The existing front fascia supplies the cutaway edge. Do not layer
          // coplanar coping over the roof skin: it flickers as the camera moves.
          box(
            group,
            x,
            slab.y + 0.012,
            front - 0.35,
            width,
            0.024,
            0.16,
            black,
          );
          // Roof membranes, drain grates and downpipes anchor the surface to its facade.
          for (let drain = start + 1; drain < end - 0.5; drain += 10) {
            box(
              group,
              drain,
              slab.y + 0.025,
              front - 0.42,
              0.55,
              0.04,
              0.4,
              metal,
            );
            for (let slot = -0.18; slot <= 0.18; slot += 0.12)
              box(
                group,
                drain + slot,
                slab.y + 0.048,
                front - 0.42,
                0.035,
                0.01,
                0.3,
                black,
              );
            box(group, drain, slab.y - 4, front + 0.12, 0.13, 8, 0.16, alloy);
          }
          const roofStart = start;
          const underBuilding = surfaces.some(
            (roofSlab) =>
              roofSlab.upper &&
              roofSlab.start < end &&
              roofSlab.end > roofStart,
          );
          if (!underBuilding) {
            box(group, x, slab.y + 0.3, back + 0.08, width, 0.6, 0.22, face);
            box(group, x, slab.y + 0.62, back + 0.08, width, 0.06, 0.32, alloy);
            if (width > 10 && seed % 3 === 1)
              serviceHatch(group, start + 5, slab.y, back + 1.25);
          }

          // Recessed party-wall joints and contrasting end piers identify each property.
          for (const boundary of [start + 0.12, end - 0.12]) {
            box(
              group,
              boundary,
              slab.y - 6.5,
              centerZ + depth / 2 + 0.055,
              0.18,
              12.5,
              0.15,
              black,
            );
          }
          const spacing = variant === 1 ? 3.2 : 2.6;
          for (let column = start + 1.3; column < end - 1; column += spacing) {
            for (let row = 0; row < 3; row++) {
              const y = slab.y - 2 - row * 2.5;
              const windowWidth = variant === 1 ? 1.65 : 0.85;
              box(
                group,
                column,
                y,
                centerZ + depth / 2 + 0.025,
                windowWidth,
                variant === 2 ? 1.6 : 1.2,
                0.045,
                (Math.floor(column) + row) % 7 === 0 ? warmWindow : windowGlass,
              );
              box(
                group,
                column,
                y - 0.7,
                centerZ + depth / 2 + 0.07,
                windowWidth + 0.15,
                0.09,
                0.14,
                metal,
              );
            }
          }
          if (variant === 1 || variant === 3) {
            for (let row = 0; row < 3; row++) {
              box(
                group,
                x,
                slab.y - 3.1 - row * 2.5,
                centerZ + depth / 2 + 0.06,
                width - 0.35,
                0.12,
                0.12,
                cap,
              );
            }
          }
        }
        start = end;
        part++;
      }
    }
    obstacles.forEach((o) => {
      const y = ground(o.x, o.route === "upper");
      const obstacleFace =
        o.kind === "slide"
          ? slideFace
          : o.kind === "ramp"
            ? rampFace
            : vaultFace;
      if (o.kiln || o.vietnam || o.feature || o.design || o.appearance) {
        chunkFor(o.x).add(
          creativeObstacle(o, {
            kilnPalette,
            vietnamPalette,
            ground,
            box: boxGeometry,
            cylinder: cylinderGeometry,
            face: obstacleFace,
            dark: obstacleDark,
            trim: obstacleTrim,
            amber: obstacleAccent,
            panel: o.kind === "ramp" ? rampFace : solar,
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
          vaultFace,
        );
        box(
          scene,
          o.x + o.width / 2,
          y + (o.height || 1) + 0.02,
          0,
          o.width + 0.08,
          0.05,
          2.4,
          obstacleAccent,
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
          slideFace,
        );
        box(
          scene,
          o.x + o.width / 2,
          y + (o.height ?? 2.35) + 0.03,
          0,
          o.width,
          0.05,
          3.3,
          obstacleAccent,
        );
        box(
          scene,
          o.x + o.width / 2,
          y + 1.25,
          1.67,
          o.width,
          0.055,
          0.055,
          obstacleAccent,
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
    const dodgeZone = game.level.dodge;
    if (dodgeZone) {
      const { start, end, halfWidth, hazards } = dodgeZone;
      if (street) {
        const roadCenter = 0.55;
        for (let x = start; x < end + 20; x += 10) {
          box(
            scene,
            x + 5,
            -0.025,
            roadCenter,
            10,
            0.05,
            halfWidth * 2,
            streetAsphalt,
          );
          for (const sign of [-1, 1]) {
            const curbZ = roadCenter + sign * (halfWidth + 0.12);
            box(scene, x + 5, 0.08, curbZ, 10, 0.16, 0.2, streetSidewalk);
            box(
              scene,
              x + 5,
              0.035,
              roadCenter + sign * (halfWidth + 0.85),
              10,
              0.05,
              1.45,
              streetSidewalk,
            );
          }
          for (const z of [-0.95, 2.05])
            box(scene, x + 3.1, 0.008, z, 4.1, 0.016, 0.09, streetMarking);
        }
      } else {
        // Separate slabs keep chunk culling valid along the entire sector.
        for (let x = start; x < end + 20; x += 10) {
          box(scene, x + 5, -0.5, 0.55, 10, 1, halfWidth * 2, roof);
          for (const z of [0.55 - halfWidth, 0.55 + halfWidth])
            box(scene, x + 5, 0.12, z, 10, 0.24, 0.12, edge);
          for (const z of [-0.95, 2.05])
            box(scene, x + 5, 0.015, z, 6, 0.03, 0.08, edge);
        }
      }
      const propMaterials = new Map<number, THREE.Material>();
      const propMaterial = (color: number) => {
        if (!propMaterials.has(color))
          propMaterials.set(color, material(color));
        return propMaterials.get(color)!;
      };
      for (const h of hazards) {
        const x = h.x + h.length / 2;
        const z = h.z;
        box(scene, x, 0.12, z, h.length + 0.18, 0.24, h.width + 0.2, black);
        // Full footprint marking makes small fixtures' collision area readable.
        for (const side of [-1, 1])
          box(
            scene,
            x,
            0.25,
            z + (side * h.width) / 2,
            h.length,
            0.03,
            0.06,
            edge,
          );
        const propGroup = new THREE.Group();
        propGroup.position.set(x, 0.24, z);
        chunkFor(x).add(propGroup);
        streetProp(
          h.kind,
          (px, py, pz, w, height, d, color) =>
            box(propGroup, px, py, pz, w, height, d, propMaterial(color)),
          (px, py, pz, w, height, d, color) => {
            const mesh = new THREE.Mesh(cylinderGeometry, propMaterial(color));
            mesh.position.set(px, py, pz);
            mesh.scale.set(w / 2, height, d / 2);
            propGroup.add(mesh);
            return mesh;
          },
        );
        if (h.kind === "parked-car") {
          box(scene, x, 0.62, z, h.length, 0.88, h.width - 0.2, streetRed);
          box(
            scene,
            x + 0.08,
            1.14,
            z,
            h.length * 0.48,
            0.28,
            h.width * 0.6,
            streetGlass,
          );
          box(scene, x + 0.82, 0.54, z, 0.42, 0.12, h.width + 0.04, edge);
          box(scene, x - 0.82, 0.54, z, 0.42, 0.12, h.width + 0.04, edge);
          for (const dx of [-0.72, 0.72])
            for (const side of [-1, 1])
              box(
                scene,
                x + dx,
                0.32,
                z + side * (h.width / 2 - 0.05),
                0.38,
                0.38,
                0.12,
                black,
              );
          box(scene, x + 0.98, 0.78, z - 0.72, 0.08, 0.22, 0.3, streetMarking);
          box(scene, x + 0.98, 0.78, z + 0.72, 0.08, 0.22, 0.3, streetMarking);
        } else if (h.kind === "road-barrier") {
          box(scene, x, 0.48, z, h.length, 0.82, h.width, streetSidewalk);
          box(scene, x, 0.9, z, h.length + 0.12, 0.1, h.width + 0.1, streetRed);
          for (const dx of [-0.72, 0, 0.72]) {
            const stripe = box(
              scene,
              x + dx,
              0.53,
              z,
              0.24,
              0.72,
              h.width + 0.04,
              streetMarking,
            );
            stripe.rotation.y = -0.55;
          }
          for (const dx of [-0.92, 0.92])
            box(scene, x + dx, 1.08, z, 0.1, 0.3, 0.1, edge);
        } else if (h.kind === "trash-bins") {
          for (const dx of [-0.58, 0.58]) {
            const binColor = dx < 0 ? streetGreen : streetBrick;
            box(scene, x + dx, 0.56, z, 0.82, 1, 0.92, binColor);
            box(scene, x + dx, 1.08, z, 0.92, 0.12, 1.02, black);
            box(
              scene,
              x + dx,
              0.52,
              z + 0.47,
              0.58,
              0.52,
              0.04,
              streetSidewalk,
            );
            for (const side of [-1, 1])
              box(
                scene,
                x + dx + side * 0.25,
                0.12,
                z + 0.32,
                0.16,
                0.2,
                0.13,
                black,
              );
          }
        } else if (h.kind === "planter") {
          box(scene, x, 0.34, z, h.length, 0.62, h.width, streetBrick);
          box(scene, x, 0.68, z, h.length - 0.18, 0.12, h.width - 0.18, black);
          for (const dx of [-0.72, 0, 0.72]) {
            box(scene, x + dx, 0.98, z - 0.25, 0.18, 0.7, 0.18, streetGreen);
            box(
              scene,
              x + dx - 0.18,
              0.82,
              z + 0.18,
              0.48,
              0.14,
              0.38,
              streetGreen,
            );
            box(
              scene,
              x + dx + 0.16,
              1.16,
              z + 0.12,
              0.4,
              0.16,
              0.4,
              streetGreen,
            );
          }
        } else if (h.kind === "hydrant") {
          const hydrant = new THREE.Mesh(cylinderGeometry, streetRed);
          hydrant.position.set(x, 0.58, z);
          hydrant.scale.set(0.35, 1.05, 0.35);
          chunkFor(x).add(hydrant);
          const cap = new THREE.Mesh(cylinderGeometry, streetRed);
          cap.position.set(x, 1.12, z);
          cap.scale.set(0.43, 0.12, 0.43);
          chunkFor(x).add(cap);
          for (const side of [-1, 1]) {
            box(scene, x + side * 0.37, 0.68, z, 0.32, 0.22, 0.3, streetRed);
            const outlet = new THREE.Mesh(cylinderGeometry, alloy);
            outlet.position.set(x + side * 0.5, 0.68, z);
            outlet.scale.set(0.14, 0.25, 0.14);
            outlet.rotation.z = Math.PI / 2;
            chunkFor(x).add(outlet);
          }
          box(scene, x, 0.12, z, 0.9, 0.22, 0.9, streetBrick);
        } else if (h.kind === "scaffold") {
          box(
            scene,
            x,
            0.38,
            z,
            h.length + 0.1,
            0.24,
            h.width + 0.1,
            streetRed,
          );
          for (const dx of [-1, 1])
            for (const side of [-1, 1])
              box(scene, x + dx, 0.78, z + side, 0.09, 1.1, 0.09, alloy);
          for (const y of [0.48, 1.04])
            box(
              scene,
              x,
              y,
              z,
              h.length + 0.1,
              0.08,
              h.width + 0.1,
              streetMarking,
            );
          for (const dx of [-0.62, 0.62]) {
            const brace = box(
              scene,
              x + dx,
              0.72,
              z,
              0.08,
              0.9,
              h.width,
              black,
            );
            brace.rotation.y = dx < 0 ? 0.6 : -0.6;
          }
        }
      }
    }
    if (street) {
      for (let x = -10, block = 0; x < FINISH; x += 22, block++) {
        const height = 8 + (block % 4) * 1.8;
        const face = [streetBrick, buildingFaces[1], buildingFaces[2]][
          block % 3
        ];
        for (const sign of [-1, 1]) {
          const centerZ = 0.55 + sign * 11;
          box(scene, x + 11, height / 2, centerZ, 20.5, height, 7.5, face);
          box(
            scene,
            x + 11,
            height + 0.12,
            centerZ,
            20.8,
            0.24,
            7.8,
            streetSidewalk,
          );
          for (const dx of [5, 11, 17]) {
            box(
              scene,
              x + dx,
              2.4,
              centerZ - sign * 3.78,
              3.8,
              2.8,
              0.08,
              streetGlass,
            );
            box(
              scene,
              x + dx,
              0.85,
              centerZ - sign * 3.79,
              2.3,
              1.7,
              0.1,
              black,
            );
          }
          box(
            scene,
            x + 11,
            4.2,
            centerZ - sign * 3.92,
            18.5,
            0.34,
            0.42,
            block % 2 ? streetAwning : streetRed,
          );
          for (const dx of [-8, 8])
            box(
              scene,
              x + 11 + dx,
              1.45,
              centerZ - sign * 3.86,
              0.12,
              2.9,
              0.12,
              alloy,
            );
        }
      }
      for (let x = 26; x < FINISH; x += 44) {
        for (const sign of [-1, 1]) {
          const pole = new THREE.Mesh(cylinderGeometry, metal);
          pole.position.set(x, 2.5, 0.55 + sign * 6.7);
          pole.scale.set(0.1, 5, 0.1);
          chunkFor(x).add(pole);
          box(
            scene,
            x + 0.45,
            4.95,
            0.55 + sign * 6.7,
            0.9,
            0.12,
            0.12,
            streetMarking,
          );
          box(scene, x + 0.8, 4.82, 0.55 + sign * 6.7, 0.34, 0.24, 0.34, edge);
          box(
            scene,
            x - 0.2,
            1.05,
            0.55 + sign * 6.15,
            0.8,
            1.6,
            0.12,
            sign < 0 ? streetRed : streetGreen,
          );
        }
      }
    } else {
      // Background buildings use quiet architectural masses, never obstacle-like props.
      for (let i = 0; i < Math.ceil(FINISH / 22); i++) {
        const x = i * 22 - 10;
        box(scene, x + 2, -7, -11, 17, 14, 6, decorDark);
      }
    }
    for (const x of game.level.sectors.map((s) => s.end)) {
      box(scene, x, 2.5, -2, 0.12, 5, 0.12, metal);
      box(scene, x + 1, 4.5, -2, 2, 0.65, 0.08, x === FINISH ? metal : roof);
    }
    if (kiln) {
      const sea = material(0x557f91);
      box(scene, FINISH / 2, -14, -42, FINISH + 100, 0.2, 65, sea);
      for (let x = 0; x < FINISH; x += 32) {
        const sector = Math.floor(x / 1000);
        const { brick, chalk, indigo, wood } = kilnPalette;
        box(scene, x, -2, -8, 20, 7, 7, sector === 2 ? chalk : brick);
        if (sector === 1 || (sector === 0 && x % 96 === 0)) {
          const tower = new THREE.Mesh(cylinderGeometry, brick);
          tower.position.set(x, 3, -10);
          tower.scale.set(3.8, 10, 3.8);
          chunkFor(x).add(tower);
          const chimney = new THREE.Mesh(cylinderGeometry, wood);
          chimney.position.set(x, 10, -10);
          chimney.scale.set(0.9, 5, 0.9);
          chunkFor(x).add(chimney);
          for (let y = 0; y <= 7; y += 2)
            box(scene, x, y, -5.9, 5, 0.12, 0.12, chalk);
        } else if (sector === 2) {
          for (let i = 0; i < 8; i++) {
            const a = (i / 7) * Math.PI;
            box(
              scene,
              x + Math.cos(a) * 3,
              1 + Math.sin(a) * 5,
              -7,
              0.6,
              1.3,
              0.7,
              indigo,
            ).rotation.z = -a;
          }
        } else {
          for (let offset = -6; offset <= 6; offset += 3) {
            box(scene, x + offset, 2, -5, 0.2, 3, 0.2, wood);
            box(scene, x + offset, 3.5, -7, 0.2, 0.2, 4, wood);
          }
        }
      }
    }
    if (saigon && vietnamPalette) {
      const { cream, jade, coral, leaf, steel } = vietnamPalette;
      const water = material(0x648c89);
      const flagRed = material(0xda251d);
      const flagGold = material(0xffff00);
      flagGold.side = THREE.DoubleSide;
      // Vietnam's 3:2 flag has one centered, upright five-pointed star.
      const star = new THREE.Shape();
      for (let point = 0; point < 10; point++) {
        const angle = Math.PI / 2 + (point * Math.PI) / 5;
        const radius = point % 2 === 0 ? 0.48 : 0.48 * 0.381966;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (point === 0) star.moveTo(x, y);
        else star.lineTo(x, y);
      }
      star.closePath();
      const starGeometry = new THREE.ShapeGeometry(star);
      sceneryGeometries.push(starGeometry);
      // Narrow tube houses, balconies and rooftop life stay behind the running lane.
      for (let x = 0, i = 0; x < FINISH; x += 24, i++) {
        const sector = Math.min(2, Math.floor(x / 1000));
        const height = 9 + (i % 4) * 1.6;
        const top = height - 9;
        const face = buildingFaces[i % buildingFaces.length];
        box(scene, x + 8, top - height / 2, -10, 8.5, height, 6, face);
        box(scene, x + 8, top + 0.1, -10, 9, 0.2, 6.3, cream);
        for (let floor = -6; floor < top - 1; floor += 2.8) {
          box(scene, x + 8, floor, -6.94, 3.8, 1.6, 0.1, jade);
          for (const dx of [-2.1, 2.1])
            box(scene, x + 8 + dx, floor, -6.78, 0.4, 1.7, 0.18, jade);
          box(scene, x + 8, floor - 0.85, -6.2, 5, 0.15, 1.6, cream);
          box(scene, x + 8, floor - 0.4, -5.48, 5, 0.06, 0.06, steel);
          for (let dx = -2; dx <= 2; dx++)
            box(
              scene,
              x + 8 + dx,
              floor - 0.65,
              -5.48,
              0.045,
              0.5,
              0.045,
              steel,
            );
        }
        // Occasional rooftop flags face the running lane, clear of all contacts.
        if (i % 7 === 0) {
          const poleX = x + 5;
          box(scene, poleX, top + 1.8, -6.4, 0.055, 3.6, 0.055, steel);
          box(scene, poleX + 1.2, top + 2.7, -6.4, 2.4, 1.6, 0.035, flagRed);
          for (const side of [-1, 1]) {
            const emblem = new THREE.Mesh(starGeometry, flagGold);
            emblem.position.set(poleX + 1.2, top + 2.7, -6.4 + side * 0.025);
            chunkFor(x).add(emblem);
          }
        }
        // Ribbed water tanks and tropical terrace planters are recognizable silhouettes.
        if (i % 3 === 0) {
          const tank = new THREE.Mesh(cylinderGeometry, steel);
          tank.position.set(x + 7, top + 1.3, -10);
          tank.scale.set(0.9, 2.2, 0.9);
          chunkFor(x).add(tank);
          box(scene, x + 7, top + 0.15, -10, 2.1, 0.3, 2.1, cream);
        }
        for (const dx of [4.8, 11]) {
          box(scene, x + dx, top + 0.2, -7.5, 1.1, 0.4, 0.8, coral);
          for (let n = 0; n < 3; n++)
            box(
              scene,
              x + dx + (n - 1) * 0.24,
              top + 0.8,
              -7.5,
              0.12,
              1.1,
              0.5,
              leaf,
            ).rotation.z = (n - 1) * 0.5;
        }
        if (sector === 1) {
          for (let stripe = 0; stripe < 8; stripe++) {
            const awning = box(
              scene,
              x + 4.5 + stripe,
              top - 2.2,
              -5.8,
              1,
              0.1,
              2.2,
              stripe % 2 ? cream : coral,
            );
            awning.rotation.x = 0.18;
          }
          box(scene, x + 8, top - 1, -6.7, 3.2, 1, 0.15, cream);
          box(scene, x + 8, top - 1, -6.59, 0.7, 0.5, 0.08, coral);
          // Rear laundry line: the playable drying racks are separate collision props.
          box(scene, x + 8, top + 1.9, -11.5, 6, 0.04, 0.04, steel);
          for (let dx = 6; dx <= 10; dx += 2)
            box(
              scene,
              x + dx,
              top + 1.35,
              -11.5,
              0.8,
              1,
              0.03,
              dx % 4 ? cream : jade,
            );
        }
        if (sector === 2) box(scene, x + 12, -10.5, -27, 24, 0.15, 26, water);
      }
    }
    if (harbor) {
      const water = material(0x528d9e);
      box(skyline, 150, -11, -36, 600, 0.2, 48, water);
      for (let x = 0; x < FINISH; x += 160) {
        // Port cranes and stacked freight sit behind the playable rooftops.
        box(scene, x + 40, 0, -20, 1, 22, 1, decorDark);
        box(scene, x + 52, 10, -20, 38, 0.8, 1.2, decorDark);
        box(scene, x + 67, 5, -20, 0.12, 9, 0.12, metal);
        for (let row = 0; row < 3; row++)
          box(
            scene,
            x + row * 16,
            -7 + row * 1.4,
            -14,
            13,
            3,
            4,
            row % 2 ? alloy : roof,
          );
      }
    }
    // The distant skyline bridge stays separate from the playable roofs.
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
          if (mesh.matrixAutoUpdate) mesh.updateMatrix();
          instances.setMatrixAt(i, mesh.matrix);
          parent.remove(mesh);
        });
        instances.computeBoundingSphere();
        parent.add(instances);
        batches.push(instances);
      });
    };
    batch(scene);
    const ropes = obstacles
      .filter((o) => o.technique === "rope-swing")
      .map((o) => {
        const base = ground(o.x, o.route === "upper");
        const anchor = ropeAnchor(
          o.x + swingGripOffset(o.width),
          base + (o.height ?? 3),
        );
        const rope = new THREE.Mesh(cylinderGeometry, kilnPalette.wood);
        const grip = new THREE.Mesh(cylinderGeometry, obstacleAccent);
        grip.scale.set(0.1, 0.28, 0.1);
        scene.add(rope, grip);
        return { o, anchor, rope, grip };
      });
    // Preserve shadows through instancing, including curved obstacle geometry.
    const enableShadows = (root: THREE.Object3D) =>
      root.traverse((object) => {
        if (
          object instanceof THREE.Mesh &&
          object.material instanceof THREE.MeshStandardMaterial &&
          !object.material.transparent
        ) {
          object.castShadow = !receiveOnlyMaterials.has(object.material);
          object.receiveShadow = true;
        }
      });
    enableShadows(scene);
    let activeCharacter = characterRef.current;
    const steeringRing = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.78, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffd06c,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    steeringRing.rotation.x = -Math.PI / 2;
    steeringRing.visible = false;
    scene.add(steeringRing);
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
      for (const { o, anchor, rope, grip } of ropes) {
        const active =
          current.technique === "rope-swing" &&
          game.traversal?.obstacle?.start === o.x;
        const end =
          active && visual.contact ? visual.contact : ropeContact(anchor, 0);
        const dx = end.x - anchor.x,
          dy = end.y - anchor.y;
        rope.position.set((anchor.x + end.x) / 2, (anchor.y + end.y) / 2, 0.55);
        rope.scale.set(0.045, Math.hypot(dx, dy), 0.045);
        rope.rotation.z = -Math.atan2(dx, dy);
        grip.position.set(end.x, end.y, 0.55);
        rope.visible = grip.visible = Math.abs(o.x - x) < 100;
      }
      const next = game.next();
      audio.setEnabled(soundRef.current);
      if (game.time < feedbackTime) feedbackId = -1;
      feedbackTime = game.time;
      if (
        !game.paused &&
        game.phase === "running" &&
        game.feedback.id !== feedbackId
      ) {
        feedbackId = game.feedback.id;
        if (game.time - game.feedback.time < 0.25)
          audio.play(game.feedback.kind, game.feedback.strength, game.flow);
      }
      const aheadGap = obstacles.find(
        (o) =>
          (o.kind === "gap" || isSwing(o.technique) || o.wallGap) &&
          (o.route === undefined || (o.route === "upper") === game.upper) &&
          o.x >= x - 1 &&
          o.x - x < 28,
      );
      if (visual.grounded)
        flightGap = aheadGap
          ? aheadGap.width + (isSwing(aheadGap.technique) ? SWING_GAP_EXTRA : 0)
          : 0;
      const anticipationDistance = aheadGap ? aheadGap.x - x : 28;
      const anticipate = next?.kind === "branch" && next.x - x < 17 ? 0.5 : 0;
      const closeFraming = THREE.MathUtils.clamp(
        (camera.zoom / (2 / 1.5) - 1) / 2.84,
        0,
        1,
      );
      const targetHeight = THREE.MathUtils.lerp(
        3.6 + Math.min(0, visual.y) + Math.max(0, visual.y) * 0.32 + anticipate,
        visual.y + 1.1,
        closeFraming,
      );
      const zone = game.level.dodge;
      const dodgeBlend = zone ? dodgeCameraBlend(x, zone.start, zone.end) : 0;
      steeringRing.visible = dodgeBlend > 0.2;
      steeringRing.position.set(visual.x, visual.y + 0.04, visual.lane ?? 0.55);
      if (!game.paused) {
        camera.zoom = easeZoom(
          camera.zoom,
          THREE.MathUtils.lerp(
            traversalZoom(
              visual.speed,
              anticipationDistance,
              flightGap,
              !visual.grounded,
              motionPreference.matches,
            ),
            camera.top / 25,
            dodgeBlend,
          ),
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
      const aimX = THREE.MathUtils.lerp(focusX, x + 12, dodgeBlend);
      const aimY = THREE.MathUtils.lerp(focusHeight, 0, dodgeBlend);
      const aimZ = 0.55 * dodgeBlend;
      camera.up.set(dodgeBlend, 1 - dodgeBlend, 0).normalize();
      camera.position.set(
        aimX + angle.x * (1 - dodgeBlend),
        aimY + THREE.MathUtils.lerp(angle.elevation, 42, dodgeBlend),
        THREE.MathUtils.lerp(32, 0.55, dodgeBlend),
      );
      const impactAge = game.time - game.feedback.time;
      const impactNudge =
        !motionPreference.matches &&
        !game.paused &&
        (game.feedback.kind === "impact" || game.feedback.kind === "land") &&
        impactAge >= 0 &&
        impactAge < 0.22
          ? Math.sin((impactAge / 0.22) * Math.PI) *
            0.08 *
            game.feedback.strength
          : 0;
      camera.position.y -= impactNudge;
      camera.lookAt(aimX, aimY, aimZ);
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
      steeringRing.geometry.dispose();
      steeringRing.material.dispose();
      boxGeometry.dispose();
      sphereGeometry.dispose();
      cylinderGeometry.dispose();
      sunGeometry.dispose();
      sceneryGeometries.forEach((geometry) => geometry.dispose());
      materials.forEach((m) => m.dispose());
      player.dispose();
      rival.dispose();
      sunlight.shadow.dispose();
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      audio.dispose();
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
