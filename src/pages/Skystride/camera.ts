/** Orthographic framing: slow movement is closer; fast traversal opens the view. */
export function speedZoom(speed: number, reducedMotion = false) {
  if (reducedMotion) return 0.78;
  const s = Math.max(0, Math.min(30, speed));
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return s <= 12
    ? 3.84 - 2.84 * smooth(s / 12)
    : 1 - 0.24 * smooth((s - 12) / 18);
}

export function easeZoom(current: number, target: number, dt: number) {
  // Reveal hazards faster than we close back in after a landing or collision.
  const rate = target < current ? 4.5 : 1.8;
  return current + (target - current) * (1 - Math.exp(-Math.max(0, dt) * rate));
}
