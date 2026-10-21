import { CameraView } from "./camera";
import CharacterPicker from "./CharacterPicker";
import {
  CharacterId,
  DEFAULT_CHARACTER,
  CHARACTER_STORAGE,
  readCharacter,
} from "./characters";
import { isSwing } from "./combos";
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
  canMantle,
  timingRange,
  timingWindow,
  TECHNICAL,
  SECTOR,
  formatTime,
  readRecord,
  RecordRun,
  Run,
  Swipe,
  LONG_JUMP_SPEED,
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
  const [storageNotice, setStorageNotice] = useState("");
  const [character, setCharacter] = useState<CharacterId>(DEFAULT_CHARACTER);
  useEffect(() => {
    try {
      setCharacter(readCharacter(localStorage.getItem(CHARACTER_STORAGE)));
    } catch {
      /* Use default when storage is unavailable. */
    }
  }, []);
  const chooseCharacter = (value: CharacterId) => {
    setCharacter(value);
    try {
      localStorage.setItem(CHARACTER_STORAGE, value);
    } catch {
      setStorageNotice("Character choice will last for this visit only.");
    }
  };
  const [view, setView] = useState<CameraView>("left");
  const [autoView, setAutoView] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [practice, setPractice] = useState(-1);
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
  const supportedTop = game.onObstacle();
  const onTop = Boolean(supportedTop);
  const distance = next ? next.x - game.x : Infinity;
  const range = next ? timingRange(next, game.speed) : { near: 0, far: 0 };
  const motionFrame = game.frame();
  const landingCue =
    !game.grounded &&
    !game.traversal &&
    game.vy < -4 &&
    ((motionFrame.launchY ?? 0) > 0.5 || Boolean(motionFrame.longJump));
  const cue =
    game.move === "special"
      ? `${motionFrame.technique?.replaceAll("-", " ").toUpperCase()} · ${isSwing(motionFrame.technique) ? "→ RELEASE / ↓ DROP" : motionFrame.technique === "cat-leap" ? "↑ TOP OUT / ↓ DROP" : motionFrame.technique === "wall-pop" ? "↑ TOP OUT" : motionFrame.technique === "shimmy" ? "↓ DROP" : "CONTACT → EXIT"}`
      : next?.kind === "signature"
        ? isSwing(next.technique)
          ? "↑ JUMP & CATCH BAR → RIGHT TO CROSS GAP"
          : `↑ ${next.technique?.replaceAll("-", " ").toUpperCase()}`
        : landingCue
          ? "↓ ROLL BEFORE LANDING · KEEP YOUR SPEED"
          : onTop
            ? next?.kind === "glass"
              ? game.x >= (supportedTop?.end ?? Infinity) - 0.8
                ? "↑ JUMP NOW · CLEAR THE GLASS"
                : "RUN TO LEDGE EDGE → ↑ JUMP"
              : "↑ JUMP AGAIN / ↓ EDGE SLIDE"
            : next?.feature === "tank"
              ? "↓ SLIDE / ↑ LAZY / → SERVICE PLATFORM"
              : next?.feature === "wall-billboard"
                ? "↑ WALL RUN TO LEDGE"
                : next?.kind === "ledge"
                  ? next.feature === "greenhouse"
                    ? "↑ CLIMB FOR TOP ROUTE / ↓ SLIDE UNDER LEDGE"
                    : "↑ CATCH & CLIMB / ↑ AGAIN TO LAUNCH"
                  : next?.kind === "glass"
                    ? game.frame().slope
                      ? distance <= 2.1
                        ? "↑ LAUNCH NOW → ↓ ROLL BEFORE LANDING"
                        : "RUN UP THE RAMP → ↑ AT THE AMBER EDGE"
                      : "↓ SLIDE UNDER FRAME TO RECOVER"
                    : next?.feature === "vent-bank"
                      ? "EARLY ↑ TOP LINE / LATE ↑ VAULT"
                      : next?.feature === "pipe"
                        ? next.kind === "slide"
                          ? "↓ UNDER PIPE / JUMP OVER FROM TOP"
                          : "EARLY ↑ TOP LINE / LATE ↑ DASH"
                        : next?.feature === "window"
                          ? "↑ SILL VAULT / → FAST DIVE"
                          : next?.kind === "branch"
                            ? next.height
                              ? "↑ WALL CLIMB / RUN FOR NORMAL"
                              : "↑ HARD LINE / RUN FOR NORMAL"
                            : next?.kind === "drop"
                              ? "↓ LANDING ROLL"
                              : next?.kind === "slide"
                                ? next && canMantle(next)
                                  ? "↓ SLIDE / ↑ SLOW CLIMB"
                                  : "↓ SLIDE"
                                : next?.kind === "gap"
                                  ? game.frame().slope
                                    ? "↑ RAMP LAUNCH / ↓ ROLL BEFORE LANDING"
                                    : "↑ GAP JUMP"
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
              [
                "ArrowUp",
                "ArrowDown",
                "ArrowRight",
                " ",
                "w",
                "s",
                "d",
                "r",
                "Escape",
              ].includes(e.key)
            )
              e.preventDefault();
            if (e.repeat) return;
            if (e.key === "r") start();
            else if (e.key === "Escape") game.pause();
            else if (["ArrowUp", " ", "w"].includes(e.key)) game.action("up");
            else if (["ArrowDown", "s"].includes(e.key)) game.action("down");
            else if (["ArrowRight", "d"].includes(e.key))
              game.action("forward");
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
            <Scene
              game={game}
              ghost={ghost}
              character={character}
              view={view}
              autoView={autoView}
            />
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
                {game.upper ? "↗ HARD LINE" : "→ NORMAL LINE"}
                <span>
                  SECTOR {Math.min(3, Math.floor(game.x / SECTOR) + 1)} / 03
                </span>
                <span className={styles.flow}>
                  {game.speed.toFixed(1)} M/S · {game.flow} FLOW
                  {game.speed >= LONG_JUMP_SPEED
                    ? " · LONG JUMP READY"
                    : " · BUILD SPEED"}
                  {game.x >= TECHNICAL.start && game.x <= TECHNICAL.end
                    ? " · TECHNICAL DISTRICT"
                    : ""}
                </span>
              </div>
              {(game.move === "special" ||
                onTop ||
                (next && distance < 23 && !game.traversal)) && (
                <div
                  className={`${styles.cue} ${distance >= range.near && distance <= range.far ? styles.clean : ""}`}
                >
                  {next?.combo && (
                    <small>
                      {next.combo} · {next.contact}/5
                      <br />
                    </small>
                  )}
                  {cue}
                  <small>
                    {onTop
                      ? "TOP CONTACT · CHOOSE YOUR EXIT"
                      : next
                        ? `${Math.round(timingWindow(next) * 1000)} MS CLEAN WINDOW`
                        : ""}
                  </small>
                  <small>
                    {onTop
                      ? "KEEP YOUR MOMENTUM"
                      : distance > range.far
                        ? "READ THE APPROACH"
                        : distance >= range.near
                          ? "FLOW WINDOW"
                          : "COMMIT"}
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
                      3 KM OF ROOFTOPS.
                      <br />
                      Against the clock.
                    </>
                  )}
                </h2>
                <p>
                  {finished
                    ? `${game.clean} clean moves · ${game.bestFlow} best flow · ${game.recoveries} recoveries${!game.eligible ? " · Practice / paused run — not saved" : " · Local time trial"}`
                    : game.phase === "failed"
                      ? "Jump near the edge to carry across. Press R or tap below to go again."
                      : game.paused
                        ? "Paused runs remain playable, but cannot set a personal best."
                        : "Swipe up to jump, vault, or climb a marked wall. Down to slide; down before a drop landing to roll. On obstacle tops, swipe up to jump again or down to slide off. Build speed, then swipe right for a long jump. Keep your momentum. Find your line."}
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
                {game.phase === "ready" && (
                  <label className={styles.sensitivity}>
                    Swipe sensitivity
                    <input
                      aria-label="Swipe sensitivity"
                      type="range"
                      min="10"
                      max="32"
                      defaultValue={gesture.threshold}
                      onChange={(e) => {
                        gesture.threshold = Number(e.target.value);
                      }}
                    />
                    <small>Short ← → Deliberate</small>
                  </label>
                )}
                <div className={styles.viewControls} data-ui>
                  <label>
                    View{" "}
                    <select
                      aria-label="Camera view"
                      value={view}
                      onChange={(event) => {
                        setView(event.target.value as CameraView);
                        setAutoView(false);
                      }}
                    >
                      <option value="2d">2D</option>
                      <option value="left">2.5D · Left</option>
                      <option value="right">2.5D · Right</option>
                    </select>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={autoView}
                      onChange={(event) => setAutoView(event.target.checked)}
                    />{" "}
                    Auto cycle
                  </label>
                </div>
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
                  UP / SPACE · JUMP & VAULT &nbsp; DOWN · SLIDE & ROLL &nbsp; →
                  · LONG JUMP AT 11.5 M/S &nbsp; R · RETRY
                </small>
              </div>
              <CharacterPicker value={character} onChange={chooseCharacter} />
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
