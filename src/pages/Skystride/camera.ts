/** Orthographic framing: slow movement is closer; fast traversal opens the view. */
export function speedZoom(speed: number, reducedMotion = false) {
  if (reducedMotion) return 1.56 / 1.5;
  const s = Math.max(0, Math.min(30, speed));
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (
    (s <= 12
      ? 7.68 - 5.68 * smooth(s / 12)
      : 2 - 0.48 * smooth((s - 12) / 18)) / 1.5
  );
}

export function easeZoom(current: number, target: number, dt: number) {
  // Reveal hazards faster than we close back in after a landing or collision.
  const rate = target < current ? 4.5 : 1.8;
  return current + (target - current) * (1 - Math.exp(-Math.max(0, dt) * rate));
}

export type CameraView = "2d" | "left" | "right";
export const CAMERA_VIEWS: CameraView[] = ["2d", "left", "right"];

/** Hold each angle for 18 seconds, then glide to the next over 12 seconds. */
export function viewAngle(
  view: CameraView,
  elapsed: number,
  automatic: boolean,
) {
  const poses = {
    "2d": { x: 0, elevation: 1.4 },
    left: { x: -6, elevation: 9 },
    right: { x: 6, elevation: 9 },
  };
  const time = automatic ? Math.max(0, elapsed) : 0;
  const index = (CAMERA_VIEWS.indexOf(view) + Math.floor(time / 30)) % 3;
  const from = poses[CAMERA_VIEWS[index]];
  const to = poses[CAMERA_VIEWS[(index + 1) % 3]];
  const t = Math.max(0, ((time % 30) - 18) / 12);
  const blend = t * t * (3 - 2 * t);
  return {
    x: from.x + (to.x - from.x) * blend,
    elevation: from.elevation + (to.elevation - from.elevation) * blend,
  };
}
