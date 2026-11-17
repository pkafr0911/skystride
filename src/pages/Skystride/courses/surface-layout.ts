import type { Surface } from "./sunset-course";
import { surfaceHeight } from "./sunset-course";

/** Trim a surface without stretching its original slope over the new span. */
export function sliceSurface(s: Surface, start: number, end: number): Surface {
  return {
    ...s,
    start,
    end,
    y: surfaceHeight(s, start),
    endY: s.endY === undefined ? undefined : surfaceHeight(s, end),
  };
}

/** Mark only actual elevated deck approaches, never the void between them. */
export function elevatedMarkers(surfaces: Surface[]) {
  return surfaces
    .filter((s) => s.upper && s.end - s.start > 2)
    .flatMap((s) =>
      [s.start + 0.5, s.end - 0.5].map((x) => ({
        x,
        y: surfaceHeight(s, x) + 0.035,
      })),
    );
}
