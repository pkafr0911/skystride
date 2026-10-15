import { Button, ConfigProvider, Select, theme } from "antd";
import React, {
  lazy,
  Suspense,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  FINISH,
  formatTime,
  readRecord,
  RecordRun,
  Run,
  Swipe,
  VERSION,
} from "./model";
import styles from "./styles.less";
const Scene = lazy(() => import("./Scene"));
const STORAGE = `skystride.${VERSION}.best`;
export default function Skystride() {
  const [game] = useState(() => new Run());
  const [gesture] = useState(() => new Swipe());
  const [, redraw] = useReducer((n) => n + 1, 0);
  const [best, setBest] = useState<RecordRun | null>(null);
  const [ghost, setGhost] = useState<RecordRun | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [practice, setPractice] = useState(-1);
  const [storageNotice, setStorageNotice] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const saved = useRef(false);
  useEffect(() => {
    try {
      setBest(readRecord(localStorage.getItem(STORAGE)));
    } catch {
      setStorageNotice("Storage unavailable · best times last for this visit.");
    }
    game.onChange = redraw;
    const hide = () => {
      if (document.hidden && !game.paused) game.pause();
    };
    const blur = () => {
      gesture.active = false;
      if (!game.paused) game.pause();
    };
    const rotate = () => {
      if (!game.paused) game.pause();
    };
    const fullscreen = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", blur);
    window.addEventListener("orientationchange", rotate);
    document.addEventListener("fullscreenchange", fullscreen);
    return () => {
      game.onChange = () => {};
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("blur", blur);
      window.removeEventListener("orientationchange", rotate);
      document.removeEventListener("fullscreenchange", fullscreen);
    };
  }, [game, gesture]);
  useEffect(() => {
    if (game.phase !== "finished" || saved.current) return;
    saved.current = true;
    if (game.eligible && (!best || game.time < best.time)) {
      const record = game.record();
      setBest(record);
      try {
        localStorage.setItem(STORAGE, JSON.stringify(record));
      } catch {
        setStorageNotice(
          "Could not save on this device. Your best is kept for this visit.",
        );
      }
    }
  });
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);
  const focus = () => stage.current?.focus({ preventScroll: true });
  const start = () => {
    saved.current = false;
    setGhost(best);
    game.start(Math.max(0, practice), practice >= 0);
    focus();
  };
  const fullscreen = async () => {
    if (expanded) {
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => {});
      setExpanded(false);
      return;
    }
    try {
      await stage.current?.requestFullscreen();
      setExpanded(Boolean(document.fullscreenElement));
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (value: string) => Promise<void>;
      };
      await orientation?.lock?.("landscape");
    } catch {
      setStorageNotice(
        "Browser fullscreen unavailable. The game still fills your window.",
      );
    }
    focus();
  };
  const next = game.next();
  const distance = next ? next.x - game.x : Infinity;
  const cue =
    next?.kind === "branch"
      ? "↑ UPPER SHORTCUT / RUN FOR LOWER"
      : next?.kind === "drop"
        ? "↓ LANDING ROLL"
        : next?.kind === "slide"
          ? "↓ SLIDE"
          : next?.kind === "gap"
            ? "↑ GAP JUMP"
            : "↑ VAULT";
  const finished = game.phase === "finished";
  const splitIndex = game.splits.reduce(
    (latest, value, index) => (Number.isFinite(value) ? index : latest),
    -1,
  );
  const delta =
    splitIndex >= 0 && ghost && !game.practice
      ? game.splits[splitIndex] - ghost.splits[splitIndex]
      : null;
  return (
    <ConfigProvider
      getPopupContainer={(trigger) => trigger?.parentElement || document.body}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#ffbe83",
          colorBgContainer: "#233247",
          borderRadius: 6,
        },
      }}
    >
      <main className={styles.page}>
        <div
          ref={stage}
          className={`${styles.stage} ${styles.expanded}`}
          tabIndex={0}
          role="region"
          aria-label="Skystride parkour course. Up or Space to jump, Down to slide, R to restart, Escape to pause. On touch, swipe up or down."
          onKeyDown={(e) => {
            if (
              (e.target as HTMLElement).closest(
                'button, input, [role="combobox"]',
              )
            )
              return;
            if (
              ["ArrowUp", "ArrowDown", " ", "w", "s", "r", "Escape"].includes(
                e.key,
              )
            )
              e.preventDefault();
            if (e.repeat) return;
            if (e.key === "r") start();
            else if (e.key === "Escape") game.pause();
            else if (["ArrowUp", " ", "w"].includes(e.key)) game.action("up");
            else if (["ArrowDown", "s"].includes(e.key)) game.action("down");
          }}
          onPointerDown={(e) => {
            if (
              (e.target as HTMLElement).closest("button, [data-ui]") ||
              pointer.current !== null
            )
              return;
            pointer.current = e.pointerId;
            gesture.start(e.clientX, e.clientY);
            e.currentTarget.setPointerCapture(e.pointerId);
            focus();
          }}
          onPointerMove={(e) => {
            if (pointer.current !== e.pointerId) return;
            const action = gesture.move(e.clientX, e.clientY);
            if (action) game.action(action);
          }}
          onPointerUp={(e) => {
            if (pointer.current === e.pointerId) {
              pointer.current = null;
              gesture.active = false;
            }
          }}
          onPointerCancel={() => {
            pointer.current = null;
            gesture.active = false;
          }}
          onLostPointerCapture={() => {
            pointer.current = null;
            gesture.active = false;
          }}
        >
          <Suspense
            fallback={
              <div className={styles.loading}>BUILDING THE SKYLINE…</div>
            }
          >
            <Scene game={game} ghost={ghost} />
          </Suspense>
          <div className={styles.grain} />
          <div className={styles.hud} data-ui>
            <div>
              <small>{game.practice ? "PRACTICE" : "RUN TIME"}</small>
              <strong>{formatTime(game.time)}</strong>
            </div>
            <div className={styles.best}>
              <small>PERSONAL BEST</small>
              <strong>{best ? formatTime(best.time) : "— — : — —"}</strong>
            </div>
            <div className={styles.hudActions}>
              <Button
                onClick={() => {
                  game.pause();
                  focus();
                }}
                disabled={game.phase !== "running"}
              >
                {game.paused ? "Resume" : "Pause"}
              </Button>
              <Button onClick={fullscreen}>
                {expanded ? "Exit full" : "Fullscreen"}
              </Button>
            </div>
          </div>
          <div className={styles.progress}>
            <i style={{ width: `${(game.x / FINISH) * 100}%` }} />
            <b style={{ left: "33.33%" }} />
            <b style={{ left: "66.66%" }} />
          </div>
          {game.phase === "running" && !game.paused && (
            <>
              <div className={styles.route}>
                {game.upper ? "↗ UPPER LINE" : "→ ROOFTOP LINE"}
                <span>
                  SECTOR {Math.min(3, Math.floor(game.x / 108) + 1)} / 03
                </span>
              </div>
              {next && distance < 19 && !game.traversal && (
                <div
                  className={`${styles.cue} ${distance >= 1.4 && distance <= 3.1 ? styles.clean : ""}`}
                >
                  {cue}
                  <small>
                    {distance > 3.1
                      ? "READ THE APPROACH"
                      : distance >= 1.4
                        ? "NOW · CLEAN WINDOW"
                        : "LATE · RECOVER"}
                  </small>
                </div>
              )}
              <div className={styles.feedback}>
                {game.time < game.messageUntil
                  ? game.message
                  : "CHASE YOUR BEST LINE"}
                {delta !== null && (
                  <span>
                    {delta <= 0 ? "−" : "+"}
                    {Math.abs(delta).toFixed(2)}s AT LAST SPLIT
                  </span>
                )}
              </div>
            </>
          )}
          {(game.phase !== "running" || game.paused) && (
            <div className={styles.overlay} data-ui>
              <div className={styles.panel}>
                <div className={styles.wordmark}>SKYSTRIDE ↗</div>
                <span className={styles.eyebrow}>
                  {finished
                    ? "SUNSET RELAY / FINISH"
                    : game.phase === "failed"
                      ? "ONE MORE ATTEMPT"
                      : game.paused
                        ? "TAKE A BREATH"
                        : "YOUR NEXT PERSONAL BEST STARTS HERE"}
                </span>
                <h2>
                  {finished ? (
                    formatTime(game.time)
                  ) : game.phase === "failed" ? (
                    "Find your footing."
                  ) : game.paused ? (
                    "Run paused."
                  ) : (
                    <>
                      Above the streets.
                      <br />
                      Against the clock.
                    </>
                  )}
                </h2>
                <p>
                  {finished
                    ? `${game.clean} clean moves · ${game.recoveries} recoveries${!game.eligible ? " · Practice / paused run — not saved" : " · Local time trial"}`
                    : game.phase === "failed"
                      ? "Jump before the roof ends. The amber floor marks show the clean takeoff zone."
                      : game.paused
                        ? "Paused runs remain playable, but cannot set a personal best."
                        : "Swipe up to jump or vault. Swipe down to slide or roll. Take the high line for a faster, harder route."}
                </p>
                {finished && (
                  <div className={styles.splits}>
                    {[0, 1, 2].map((i) => (
                      <div key={i}>
                        <small>SECTOR 0{i + 1}</small>
                        <b>
                          {game.splits[i]
                            ? formatTime(
                                game.splits[i] - (game.splits[i - 1] || 0),
                              )
                            : "—"}
                        </b>
                      </div>
                    ))}
                  </div>
                )}
                {game.phase === "ready" && (
                  <Select
                    aria-label="Run mode"
                    value={practice}
                    onChange={setPractice}
                    options={[
                      { value: -1, label: "Time trial · full course" },
                      { value: 0, label: "Practice · from sector 1" },
                      { value: 1, label: "Practice · from sector 2" },
                      { value: 2, label: "Practice · from sector 3" },
                    ]}
                    style={{ width: "100%", marginBottom: 16 }}
                  />
                )}
                <div className={styles.buttons}>
                  {game.paused && (
                    <Button
                      type="primary"
                      size="large"
                      onClick={() => {
                        game.pause();
                        focus();
                      }}
                    >
                      Resume run
                    </Button>
                  )}
                  <Button
                    type={game.paused ? "default" : "primary"}
                    size="large"
                    onClick={start}
                  >
                    {game.phase === "ready"
                      ? "Run the rooftops ↗"
                      : "Run again ↗"}
                  </Button>
                  {game.phase !== "ready" && (
                    <Button
                      size="large"
                      onClick={() => {
                        game.phase = "ready";
                        game.paused = false;
                        redraw();
                      }}
                    >
                      Course menu
                    </Button>
                  )}
                </div>
                {storageNotice && <p role="status">{storageNotice}</p>}
                <small className={styles.panelNote}>
                  UP / SPACE · JUMP & VAULT &nbsp; DOWN · SLIDE & ROLL &nbsp; R
                  · RETRY
                </small>
              </div>
            </div>
          )}
          <div className={styles.rotate}>
            ↻ Landscape recommended · fullscreen gives you more room
          </div>
        </div>
      </main>
    </ConfigProvider>
  );
}
