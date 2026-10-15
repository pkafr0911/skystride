import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Frame, obstacles, Run, STEP } from "./model";
import { makeRunner } from "./runner";
import { interpolateFrame, motionPhase } from "./motion";
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
  "landing",
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
  if (move === "landing") {
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
  const [move, setMove] = useState<Preview>("jump");
  const [playing, setPlaying] = useState(true);
  const [scrub, setScrub] = useState(0);
  const [slow, setSlow] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [phase, setPhase] = useState("");
  const progress = useRef(0);
  const controls = useRef({ playing, scrub, slow, sheet });
  controls.current = { playing, scrub, slow, sheet };
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
    const studies = Array.from({ length: 5 }, () => makeRunner(scene));
    const environment = new THREE.Group();
    scene.add(environment);
    const first = (predicate: (f: Frame) => boolean, fallback: number) => {
      const index = samples.findIndex(predicate);
      return index < 0 ? fallback : index;
    };
    const landing = first(
      (f) => f.move === "land" && (f.landingAge || 0) > 0.04,
      120,
    );
    const atProgress = (kind: Frame["move"], value: number) =>
      first((f) => f.move === kind && f.progress >= value, 160);
    const keys =
      move === "run"
        ? [0, 9, 17, 26, 36]
        : move === "jump"
          ? [13, 21, 43, 89, landing]
          : move === "landing"
            ? [
                Math.max(0, landing - 12),
                Math.max(0, landing - 5),
                landing,
                landing + 9,
                landing + 28,
              ]
            : move === "roll"
              ? [0, 0.2, 0.4, 0.7, 0.98].map((p) => atProgress("roll", p))
              : move === "catch"
                ? [
                    atProgress("catch", 0),
                    ...[0.1, 0.4, 0.7, 0.98].map((p) => atProgress("climb", p)),
                  ]
                : [0, 0.18, 0.4, 0.7, 0.97].map((p) =>
                    atProgress(
                      move === "wall"
                        ? "wall"
                        : move === "slide"
                          ? "slide"
                          : "vault",
                      p,
                    ),
                  );
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
      environment.add(m);
    };
    const o = obstacles.find((item) => item.vault === move),
      base = o?.route === "upper" ? 3.3 : 0;
    const start = samples[0].x;
    if (move === "catch") {
      box(82, -2, 17.6, 4);
      box(82, 0, 17.6, 0.035, amber);
    } else if (move === "roll" || move === "landing") {
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
    // Meter ticks make the planted-foot phase readable while the camera tracks the runner.
    for (let x = Math.floor(start) - 4; x < start + 30; x++)
      box(x, base - 0.045, 0.035, 0.09, amber);
    const studyFloor = new THREE.Mesh(geometry, roof);
    studyFloor.position.set(0, -1, 0);
    studyFloor.scale.set(24, 2, 2);
    scene.add(studyFloor);
    let frame = 0,
      t = 0,
      previous = performance.now(),
      uiTime = 0;
    let layoutSheet = controls.current.sheet;
    const resize = () => {
      const { width, height } = host.current!.getBoundingClientRect();
      renderer.setSize(width, height);
      const halfHeight = controls.current.sheet
        ? Math.max(3.3, (7 * height) / width)
        : 3;
      camera.left = (-halfHeight * width) / height;
      camera.right = (halfHeight * width) / height;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      layoutSheet = controls.current.sheet;
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
      const index = Math.min(samples.length - 1, Math.floor(t / STEP));
      const f = interpolateFrame(
        samples[index],
        samples[Math.min(index + 1, samples.length - 1)],
        (t / STEP) % 1,
      );
      progress.current = (t / ((samples.length - 1) * STEP)) * 100;
      if (now - uiTime > 100) {
        uiTime = now;
        setPhase(motionPhase(f));
        if (controls.current.playing) setScrub(progress.current);
      }
      if (layoutSheet !== controls.current.sheet) resize();
      const showSheet = controls.current.sheet;
      actor.group.visible = !showSheet;
      environment.visible = !showSheet;
      studyFloor.visible = showSheet;
      actor.pose(f, t, controls.current.playing && !showSheet ? dt : 1);
      studies.forEach((study, i) => {
        study.group.visible = showSheet;
        if (showSheet) {
          const sample = samples[Math.min(samples.length - 1, keys[i])];
          study.pose(sample, keys[i] * STEP, 1);
          study.group.position.set((i - 2) * 2.8, sample.y - base, 0.55);
        }
      });
      camera.position.set(
        showSheet ? 0 : f.x + 0.8,
        showSheet ? 1.9 : base + 1.9,
        18,
      );
      camera.lookAt(camera.position.x, camera.position.y, 0);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      actor.dispose();
      studies.forEach((study) => study.dispose());
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
        <button
          type="button"
          onClick={() => {
            setScrub(progress.current);
            setPlaying(!playing);
          }}
        >
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
          <input
            type="checkbox"
            checked={sheet}
            onChange={(e) => setSheet(e.target.checked)}
          />{" "}
          Pose sheet
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
        <strong style={{ color: "#ffcb8b", marginRight: 16 }}>
          {sheet
            ? move === "jump"
              ? "TAKEOFF / DRIVE / FLIGHT / REACH / IMPACT"
              : move === "run"
                ? "CONTACT / PUSH / RECOVERY / DRIVE / REACH"
                : "APPROACH / CONTACT / SUPPORT / RELEASE / EXIT"
            : phase}
        </strong>
        {slow ? "35% speed" : "Real speed"} · Same animation as the course.
        Freeze and scrub to inspect contact and weight.
      </p>
    </main>
  );
}
