import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Frame, obstacles, Run, STEP } from "./model";
import { makeRunner } from "./runner";
import styles from "./styles.less";

const options = [
  "run",
  "jump",
  "step",
  "hurdle",
  "speed",
  "one-hand",
  "safety",
  "lazy",
  "kong",
  "step-leap",
  "slide",
  "wall",
  "roll",
  "catch",
] as const;
type Preview = (typeof options)[number];
function framesFor(move: Preview): Frame[] {
  const g = new Run();
  g.start();
  const o = obstacles.find((item) => item.vault === move);
  if (o) {
    g.x = o.x - 2;
    g.y = o.route === "upper" ? 3.3 : 0;
    g.upper = o.route === "upper";
  }
  if (move === "slide") g.x = 88.8;
  if (move === "wall") g.x = 113;
  if (move === "roll") {
    g.x = 196;
    g.y = 3.3;
    g.upper = true;
  }
  if (move === "catch") {
    g.x = 70;
    g.grounded = false;
  }
  const frames: Frame[] = [];
  for (let tick = 0; tick < 210; tick++) {
    if (tick === 12 && (o || move === "jump" || move === "wall"))
      g.action("up");
    if (tick === 26 && move === "catch") g.action("up");
    if (tick === 8 && move === "slide") g.action("down");
    if (move === "roll" && !g.grounded && g.y < 2.5 && g.y > 1)
      g.action("down");
    g.step();
    frames.push(g.frame());
  }
  return frames;
}

/** Isolated animation inspection uses the same simulation and runner as the playable course. */
export default function MovementLab() {
  const host = useRef<HTMLDivElement>(null);
  const [move, setMove] = useState<Preview>("speed");
  const [playing, setPlaying] = useState(true);
  const [scrub, setScrub] = useState(0);
  const [slow, setSlow] = useState(true);
  const controls = useRef({ playing, scrub, slow });
  controls.current = { playing, scrub, slow };
  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(0xf5b18e);
    host.current!.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffe6cf, 0x39445c, 2));
    const light = new THREE.DirectionalLight(0xffe4c2, 2);
    light.position.set(-3, 8, 6);
    scene.add(light);
    const camera = new THREE.OrthographicCamera(-6, 6, 4, -3, 0.1, 100);
    const actor = makeRunner(scene),
      samples = framesFor(move);
    const geometry = new THREE.BoxGeometry(1, 1, 1),
      roof = new THREE.MeshStandardMaterial({ color: 0x14243e }),
      amber = new THREE.MeshBasicMaterial({ color: 0xffc56e });
    const box = (
      x: number,
      y: number,
      w: number,
      h: number,
      mat: THREE.Material = roof,
    ) => {
      const m = new THREE.Mesh(geometry, mat);
      m.position.set(x, y, 0);
      m.scale.set(w, h, 2.5);
      scene.add(m);
    };
    const o = obstacles.find((item) => item.vault === move),
      base = o?.route === "upper" ? 3.3 : 0;
    const start = samples[0].x;
    if (move === "catch") {
      box(82, -2, 17.6, 4);
      box(82, 0, 17.6, 0.035, amber);
    } else if (move === "roll") {
      box(191, 1.3, 8, 4);
      box(206, -2, 22, 4);
    } else {
      box(start + 8, base - 2, 40, 4);
      box(start + 8, base, 40, 0.035, amber);
    }
    if (o) {
      box(o.x + o.width / 2, base + o.height! / 2, o.width, o.height!);
      box(o.x + o.width / 2, base + o.height!, o.width, 0.045, amber);
    }
    if (move === "slide") box(93.75, 1.8, 5.5, 1.1);
    if (move === "wall") {
      box(126, 1.65, 12, 3.3);
      box(126, 3.3, 12, 0.04, amber);
    }
    let frame = 0,
      t = 0,
      previous = performance.now();
    const resize = () => {
      const { width, height } = host.current!.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.left = (-4.5 * width) / height;
      camera.right = (4.5 * width) / height;
      camera.top = 5.2;
      camera.bottom = -3.8;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host.current!);
    resize();
    const draw = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - previous) / 1000));
      previous = now;
      if (controls.current.playing)
        t =
          (t + dt * (controls.current.slow ? 0.35 : 1)) %
          (samples.length * STEP);
      else t = (controls.current.scrub / 100) * (samples.length - 1) * STEP;
      const f = samples[Math.min(samples.length - 1, Math.floor(t / STEP))];
      actor.pose(f, t, controls.current.playing ? dt : 1);
      camera.position.set(f.x + 1, base + 1.8, 18);
      camera.lookAt(f.x + 1, base + 1.8, 0);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      actor.dispose();
      geometry.dispose();
      roof.dispose();
      amber.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [move]);
  return (
    <main
      className={styles.lab}
      style={{
        background: "#14243e",
        color: "#fff0d7",
        height: "100dvh",
        fontFamily: "system-ui",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "16px 24px",
          display: "flex",
          gap: 18,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <a href="./" style={{ color: "#ffca89" }}>
          ← Skystride
        </a>
        <strong>MOVEMENT STUDY</strong>
        <label>
          Move{" "}
          <select
            aria-label="Move"
            value={move}
            onChange={(e) => {
              setMove(e.target.value as Preview);
              setScrub(0);
            }}
          >
            {options.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setPlaying(!playing)}>
          {playing ? "Freeze" : "Play"}
        </button>
        <label>
          <input
            type="checkbox"
            checked={slow}
            onChange={(e) => setSlow(e.target.checked)}
          />{" "}
          Slow motion
        </label>
        <label>
          Pose{" "}
          <input
            aria-label="Pose"
            type="range"
            min="0"
            max="100"
            value={scrub}
            onChange={(e) => {
              setPlaying(false);
              setScrub(Number(e.target.value));
            }}
          />
        </label>
      </header>
      <div ref={host} style={{ flex: 1, minHeight: 0 }} />
      <p style={{ padding: "0 24px", fontSize: 12 }}>
        Inspect takeoff, contact, clearance and release. The course uses this
        same runner and movement controller.
      </p>
    </main>
  );
}
