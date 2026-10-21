import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { CHARACTERS, CharacterId, DEFAULT_CHARACTER } from "./characters";
import { makeRunner } from "./runner";
import { Run } from "./model";
import styles from "./styles.less";

/** Static portraits of the real rigs, rendered once with a single temporary context. */
export default function CharacterPicker({
  value,
  onChange,
}: {
  value: CharacterId;
  onChange: (id: CharacterId) => void;
}) {
  const [portraits, setPortraits] = useState<
    Partial<Record<CharacterId, string>>
  >({});
  useEffect(() => {
    let renderer: THREE.WebGLRenderer | undefined;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(320, 240);
      renderer.setPixelRatio(1);
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffefdc, 0x566583, 2.5));
      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(3, 5, 6);
      scene.add(light);
      const camera = new THREE.OrthographicCamera(
        -1.5,
        1.5,
        1.125,
        -1.125,
        0.1,
        30,
      );
      camera.position.set(3, 1.9, 9);
      camera.lookAt(0, 1.05, 0);
      const game = new Run();
      game.start();
      const images: Partial<Record<CharacterId, string>> = {};
      for (const id of Object.keys(CHARACTERS) as CharacterId[]) {
        const actor = makeRunner(scene, false, id);
        try {
          actor.pose({ ...game.frame(), x: 0.5, speed: 6 }, 0, 0);
          actor.group.position.set(0, 0, 0);
          renderer.render(scene, camera);
          images[id] = renderer.domElement.toDataURL("image/png");
        } finally {
          actor.dispose();
        }
      }
      setPortraits(images);
    } catch {
      // Keep every model selectable even when portrait rendering is unavailable.
    } finally {
      renderer?.dispose();
      renderer?.forceContextLoss();
    }
  }, []);
  return (
    <section
      className={styles.characterPicker}
      aria-label="Character selection"
      data-ui
    >
      <div className={styles.characterHeading}>
        <div>
          <span>CHOOSE YOUR RUNNER</span>
          <h3>Character selection</h3>
        </div>
        <p>{CHARACTERS[value].description}</p>
      </div>
      <div className={styles.characterCards}>
        {(
          Object.entries(CHARACTERS) as [
            CharacterId,
            (typeof CHARACTERS)[CharacterId],
          ][]
        ).map(([id, design]) => (
          <button
            key={id}
            type="button"
            className={`${styles.characterCard} ${value === id ? styles.characterSelected : ""}`}
            aria-pressed={value === id}
            aria-label={`Select ${design.label}`}
            onClick={() => onChange(id)}
          >
            <span className={styles.characterBadge}>
              {value === id
                ? "✓ Selected"
                : id === DEFAULT_CHARACTER
                  ? "Default"
                  : "Select"}
            </span>
            <span className={styles.characterPortrait}>
              {portraits[id] ? (
                <img
                  src={portraits[id]}
                  alt={`${design.label} model preview`}
                />
              ) : (
                <span>Preview unavailable</span>
              )}
            </span>
            <strong>{design.label}</strong>
            <span className={styles.characterSwatches} aria-hidden="true">
              {design.palette.slice(0, 4).map((color, i) => (
                <i
                  key={i}
                  style={{
                    background: `#${color.toString(16).padStart(6, "0")}`,
                  }}
                />
              ))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
