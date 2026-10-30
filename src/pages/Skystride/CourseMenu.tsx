import React from "react";
import { levels, LevelDefinition } from "./levels";
import { formatTime, GameMode, RecordRun, recordStorage } from "./model";
import styles from "./styles.less";

function Skyline({ harbor }: { harbor: boolean }) {
  return (
    <svg viewBox="0 0 520 165" aria-hidden="true" className={styles.mapArt}>
      <circle
        cx={harbor ? 405 : 390}
        cy="55"
        r="34"
        fill="currentColor"
        opacity=".65"
      />
      <path
        d="M0 110H35V67H73V102H105V45H133V88H170V62H203V105H243V35H274V93H315V58H350V111H393V85H427V38H454V97H490V71H520V165H0Z"
        fill="currentColor"
        opacity=".16"
      />
      {harbor && (
        <g stroke="currentColor" fill="none" strokeWidth="3" opacity=".65">
          <path d="M115 127V21L197 42H86M115 22L179 42M182 42V80M354 118V17L442 37H324M354 17L423 37M429 37V72" />
          <path d="M0 149H520M30 156H190M300 156H460" opacity=".4" />
        </g>
      )}
      <path
        d="M0 143H38V121H109V138H137V100H219V130H242V109H309V135H338V89H408V114H443V96H520V165H0Z"
        fill="#132638"
      />
      <path
        d="M38 120H109M137 99H219M242 108H309M338 88H408M443 95H520"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M64 117Q121 63 166 95T270 104T367 84T468 91"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 6"
        opacity=".75"
      />
    </svg>
  );
}
export default function CourseMenu({
  level,
  onLevel,
  mode,
  onMode,
  practice,
  onPractice,
  bests,
  onStart,
  children,
  notice,
}: {
  level: LevelDefinition;
  onLevel: (level: LevelDefinition) => void;
  mode: GameMode;
  onMode: (mode: GameMode) => void;
  practice: number;
  onPractice: (sector: number) => void;
  bests: Record<string, RecordRun>;
  onStart: () => void;
  children: React.ReactNode;
  notice: string;
}) {
  const best = bests[recordStorage(mode, level)];
  return (
    <div className={styles.courseMenu}>
      <header className={styles.menuHeader}>
        <div>
          <div className={styles.wordmark}>SKYSTRIDE ↗</div>
          <h1>Find your next line.</h1>
          <p>Two places to run. A thousand ways to flow.</p>
        </div>
        <span className={styles.menuStamp}>
          ROOFTOP TIME TRIALS
          <br />
          YOUR CITY. YOUR PACE.
        </span>
      </header>
      <div className={styles.menuGrid}>
        <section className={styles.levelLibrary} aria-label="Choose a level">
          <div className={styles.sectionHeading}>
            <span>01 / CHOOSE YOUR COURSE</span>
            <small>2 LEVELS</small>
          </div>
          {levels.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === level.id}
              onClick={() => onLevel(item)}
              className={`${styles.levelCard} ${item.atmosphere === "harbor" ? styles.harborCard : styles.sunsetCard} ${item.id === level.id ? styles.levelSelected : ""}`}
            >
              <div className={styles.cardTop}>
                <span>LEVEL {item.number}</span>
                <span>
                  {item.id === level.id ? "SELECTED ↗" : "EXPLORE ↗"}
                </span>
              </div>
              <Skyline harbor={item.atmosphere === "harbor"} />
              <div className={styles.cardBottom}>
                <div>
                  <h2>{item.name}</h2>
                  <p>{item.tagline}</p>
                </div>
                <span>
                  3 KM
                  <br />3 SECTORS
                </span>
              </div>
            </button>
          ))}
        </section>
        <section className={styles.runSetup} aria-label="Set up your run">
          <div className={styles.sectionHeading}>
            <span>02 / MAKE IT YOUR RUN</span>
            <small>LEVEL {level.number}</small>
          </div>
          <h2>
            {level.name}
            <span>↗</span>
          </h2>
          <p className={styles.courseDescription}>{level.description}</p>
          <ol className={styles.sectorList}>
            {level.sectors.map((sector, i) => (
              <li key={sector.name}>
                <span>0{i + 1}</span>
                <div>
                  <strong>{sector.name}</strong>
                  <small>{sector.description}</small>
                </div>
                <small>1 KM</small>
              </li>
            ))}
          </ol>
          <fieldset className={styles.difficulty}>
            <legend>Difficulty</legend>
            <div>
              {(["standard", "hardcore"] as const).map((option) => (
                <button
                  type="button"
                  key={option}
                  aria-pressed={mode === option}
                  onClick={() => onMode(option)}
                >
                  <strong>
                    {option === "standard" ? "Standard" : "Hardcore"}
                  </strong>
                  <small>
                    {option === "standard"
                      ? "Forgiving recovery"
                      : "Every landing counts"}
                  </small>
                </button>
              ))}
            </div>
          </fieldset>
          <label className={styles.practiceSelect}>
            Run type
            <select
              aria-label="Run type"
              value={practice}
              onChange={(e) => onPractice(Number(e.target.value))}
            >
              <option value={-1}>Time trial · full course</option>
              {level.sectors.map((sector, i) => (
                <option key={sector.name} value={i}>
                  Practice · {sector.name}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.recordLine}>
            <span>
              {practice < 0
                ? `PERSONAL BEST · ${mode.toUpperCase()}`
                : "PRACTICE · RECORDS DISABLED"}
            </span>
            <strong>
              {practice < 0 && best ? formatTime(best.time) : "— — : — —"}
            </strong>
          </div>
          <button type="button" className={styles.startRun} onClick={onStart}>
            {practice < 0 ? "Start time trial" : "Start sector practice"}
            <span>↗</span>
          </button>
          <p className={styles.runHint}>
            ↑ Jump & vault <span>↓ Slide & roll</span> → Long jump
          </p>
          {notice && <p role="status">{notice}</p>}
        </section>
      </div>
      <details className={styles.menuSettings}>
        <summary>
          Runner & settings{" "}
          <span>Character · camera · sound · swipe sensitivity</span>
        </summary>
        <div className={styles.settingsContent}>{children}</div>
      </details>
    </div>
  );
}
