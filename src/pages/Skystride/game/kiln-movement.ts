/** Deterministic rope geometry shared by simulation and rendering. */
export const ROPE_LENGTH = 3;
export const ROPE_DURATION = 0.9;
export function ropeAnchor(gripX: number, gripY: number) {
  return {
    x: gripX + Math.sin(0.55) * ROPE_LENGTH,
    y: gripY + Math.cos(0.55) * ROPE_LENGTH,
  };
}
export function ropeContact(
  anchor: { x: number; y: number },
  progress: number,
) {
  const angle = -0.55 + Math.max(0, Math.min(1, progress)) * 1.5;
  return {
    x: anchor.x + Math.sin(angle) * ROPE_LENGTH,
    y: anchor.y - Math.cos(angle) * ROPE_LENGTH,
  };
}
export function ropeRelease(progress: number) {
  const angle = -0.55 + Math.max(0, Math.min(1, progress)) * 1.5;
  // Retain the run's forward momentum, with phase-dependent upward drive.
  return { speed: 18 + 6 * Math.cos(angle), vy: 4 + 9 * Math.sin(angle) };
}
