import type { Obstacle } from "../game/model";
import type { Surface } from "./sunset-course";
import { isSwing, SWING_GAP_EXTRA } from "../game/combos";

/** Original course phrases, with shared movement budgets and fresh object geometry. */
export function kilnGeometry() {
  const obstacles: Obstacle[] = [];
  const kit: Record<string, Omit<Obstacle, "x">> = {
    v: {
      kind: "vault",
      width: 1.2,
      height: 0.8,
      vault: "speed",
      kiln: "press-table",
    },
    k: {
      kind: "vault",
      width: 2.4,
      height: 0.8,
      vault: "kong",
      kiln: "press-table",
    },
    d: {
      kind: "vault",
      width: 1.2,
      height: 0.8,
      vault: "dash",
      kiln: "press-table",
    },
    s: { kind: "slide", width: 2.4, height: 2.1, kiln: "drying-beam" },
    g: { kind: "gap", width: 5.8, kiln: "inspection-trench" },
    p: {
      kind: "signature",
      width: 2.4,
      height: 1.1,
      technique: "precision",
      kiln: "ceramic-pedestal",
    },
    w: {
      kind: "vault",
      width: 3.4,
      height: 0.85,
      feature: "window",
      openingTop: 3.45,
      kiln: "kiln-portal",
    },
    c: {
      kind: "encounter",
      width: 6,
      height: 1.4,
      feature: "wall-billboard",
      kiln: "kiln-buttress",
    },
    t: { kind: "ledge", width: 3, height: 1.4, kiln: "glaze-steps" },
    a: { kind: "ramp", width: 5, height: 1.1, kiln: "loading-wedge" },
    j: {
      kind: "signature",
      width: 8,
      height: 1.3,
      technique: "wall-kick",
      kiln: "kiln-buttress",
    },
    r: {
      kind: "signature",
      width: 2.4,
      height: 3,
      technique: "rope-swing",
      kiln: "tile-hoist",
    },
  };
  function phrase(
    start: number,
    name: string,
    sequence: string,
    route: "lower" | "upper" = "lower",
  ) {
    const entries = sequence.split(" ");
    entries.forEach((entry, i) => {
      const [offset, key] = entry.split(":");
      obstacles.push({
        ...kit[key],
        x: start + Number(offset),
        route,
        combo: name,
        contact: i + 1,
        contactTotal: entries.length,
      });
    });
  }
  // First wall and rope encounters have long, clear approaches and exits.
  phrase(36, "Clay Dispatch", "0:v 16:s 32:g 49:p");
  phrase(156, "First Firing", "0:j 29:v 41:s");
  phrase(306, "Hoist Lesson", "0:r 46:k 60:p");
  phrase(436, "Workshop Windows", "0:w 16:d 30:s 43:g");
  phrase(556, "Glaze Lift", "0:t 20:p 34:v");
  phrase(716, "Drying Gallery", "0:s 14:k 66:p 80:w");
  phrase(846, "Chimney Drive", "0:j 38:s 51:d");
  phrase(936, "Courtyard Exit", "0:v 12:s 26:a 31:g");
  phrase(1038, "Cold Kiln", "0:w 15:k 30:c 51:p");
  phrase(1158, "Twin Buttresses", "0:j 27:s 39:d");
  phrase(1308, "Hoist Transfer", "0:r 45:p 59:k");
  phrase(1438, "Firebrick Thread", "0:s 12:d 25:w 41:p 55:v");
  phrase(1558, "Glaze Descent", "0:t 19:p 33:k");
  phrase(1718, "Kiln Circuit", "0:c 62:s 74:k 87:p 100:d");
  phrase(1848, "Updraft", "0:j 39:k 51:s");
  phrase(1938, "Last Gallery", "0:s 12:k 25:g");
  phrase(2038, "Coastal Ribs", "0:p 12:s 25:k 38:g 55:p");
  phrase(2158, "Sea Wall", "0:j 26:w 39:d");
  phrase(2308, "Rope Horizon", "0:r 44:p 56:s 68:k");
  phrase(2438, "Sculpture Walk", "0:c 20:k 32:s 44:p 57:g");
  phrase(2558, "Stone Steps", "0:t 18:p 30:d");
  phrase(2718, "Last Firing", "0:j 65:k 77:s 89:p");
  phrase(2848, "Coastal Hoist", "0:r 45:d 58:s");
  phrase(2940, "Home to the Sea", "0:k 12:s 26:p");
  const skybridges = [210, 640, 1210, 1640, 2210, 2640].map((start) => ({
    start: start + 6,
    rampStart: start + 8,
    crest: start + 20,
    descent: start + 94,
    end: start + 110,
    height: 7,
  }));
  skybridges.forEach((b, i) => {
    obstacles.push({ x: b.start - 6, width: 6, kind: "branch" });
    phrase(
      b.crest + 6,
      [
        "Workshop Crown",
        "Tile Ridge",
        "Kiln Crown",
        "High Hoist",
        "Sea Arch",
        "Coastal Crown",
      ][i],
      i % 2 ? "0:r 44:p 57:d" : "0:j 38:s 51:k",
      "upper",
    );
    obstacles.push({
      x: b.end,
      width: 5,
      kind: "drop",
      route: "upper",
      kiln: "retaining-steps",
    });
  });
  const lowerRoofDrops = [610, 1610, 2610].map((x) => ({
    x,
    width: 6,
    depth: 4,
    landingEnd: x + 20,
    end: x + 30,
  }));
  lowerRoofDrops.forEach((d) =>
    obstacles.push({
      x: d.x,
      width: d.width,
      kind: "gap",
      route: "lower",
      kiln: "retaining-steps",
    }),
  );
  obstacles.sort((a, b) => a.x - b.x);
  const roofHeight = (x: number) => {
    const d = lowerRoofDrops.find(
      (drop) => x >= drop.x + drop.width && x < drop.end,
    );
    return d
      ? -d.depth * (x < d.landingEnd ? 1 : (d.end - x) / (d.end - d.landingEnd))
      : 0;
  };
  const skybridgeAt = (x: number) =>
    skybridges.find((b) => x >= b.start && x <= b.end);
  const ground = (x: number, upper: boolean) => {
    const b = upper ? skybridgeAt(x) : undefined;
    return b
      ? 3.3 +
          (b.height - 3.3) *
            Math.max(
              0,
              Math.min(
                1,
                (x - b.rampStart) / (b.crest - b.rampStart),
                (b.end - x) / (b.end - b.descent),
              ),
            )
      : roofHeight(x);
  };
  const cut = (
    start: number,
    end: number,
    y: number,
    upper: boolean,
  ): Surface[] => {
    let cursor = start;
    const pieces: Surface[] = [];
    for (const o of obstacles.filter(
      (o) =>
        (o.route === "upper") === upper &&
        (o.kind === "gap" ||
          isSwing(o.technique) ||
          o.technique === "wall-kick") &&
        o.x >= start &&
        o.x < end,
    )) {
      pieces.push({
        start: cursor,
        end: o.x + (o.technique === "wall-kick" ? 1 : 0),
        y,
        upper,
      });
      cursor = o.x + o.width + (isSwing(o.technique) ? SWING_GAP_EXTRA : 0);
    }
    pieces.push({ start: cursor, end, y, upper });
    return pieces;
  };
  const surfaces: Surface[] = cut(-30, 3025, 0, false).flatMap((s) => {
    const cuts = [
      s.start,
      s.end,
      ...lowerRoofDrops
        .flatMap((d) => [d.x + d.width, d.landingEnd, d.end])
        .filter((x) => x > s.start && x < s.end),
    ].sort((a, b) => a - b);
    return cuts.slice(0, -1).map((start, i) => ({
      start,
      end: cuts[i + 1],
      y: roofHeight(start + 1e-7),
      endY: roofHeight(cuts[i + 1] - 1e-7),
      upper: false,
    }));
  });
  for (const b of skybridges)
    surfaces.push(
      { start: b.start, end: b.rampStart, y: 3.3, upper: true },
      { start: b.rampStart, end: b.crest, y: 3.3, endY: b.height, upper: true },
      ...cut(b.crest, b.descent, b.height, true),
      { start: b.descent, end: b.end, y: b.height, endY: 3.3, upper: true },
    );
  const obstacleTops = obstacles.flatMap((o, index) =>
    ["vault", "slide", "ledge"].includes(o.kind)
      ? [
          {
            start: o.x,
            end: o.x + o.width,
            y:
              ground(o.x, o.route === "upper") +
              (o.height ?? (o.kind === "slide" ? 2.35 : 1)),
            upper: o.route === "upper",
            index,
          },
        ]
      : [],
  );
  const billboardHeaders = obstacles.flatMap((o, index) =>
    o.feature === "window"
      ? [
          {
            start: o.x,
            end: o.x + o.width,
            y: ground(o.x, o.route === "upper") + o.openingTop! + 0.55,
            upper: o.route === "upper",
            index,
          },
        ]
      : [],
  );
  const wallLedges = obstacles.flatMap((o, index) =>
    o.feature === "wall-billboard"
      ? [
          {
            start: o.x + o.width,
            end: o.x + o.width + 3,
            y: ground(o.x, o.route === "upper") + o.height!,
            upper: o.route === "upper",
            index,
          },
        ]
      : [],
  );
  const interactiveTops = [...obstacleTops, ...billboardHeaders, ...wallLedges];
  const ramps = obstacles.filter((o) => o.kind === "ramp");
  return {
    sideRamps: [] as Obstacle[],
    obstacles,
    surfaces,
    skybridges,
    skybridgeAt,
    lowerRoofDrops,
    ground,
    canMantle: (o: Obstacle) =>
      o.kind === "slide" &&
      o.feature !== "tank" &&
      (o.height ?? 2.35) <= 1.8 &&
      !skybridges.some((b) => o.x < b.end && o.x + o.width > b.start),
    ramps,
    rampHeight: (o: Obstacle, x: number) =>
      ground(o.x, o.route === "upper") +
      Math.max(0, Math.min(1, (x - o.x) / o.width)) * (o.height ?? 1.1),
    interactiveTops,
    billboardHeaders,
    glassObstacles: [] as Obstacle[],
    supportSurfaces: {
      lower: [...surfaces, ...interactiveTops.filter((s) => !s.upper)],
      upper: [...surfaces, ...interactiveTops.filter((s) => s.upper)],
    },
  };
}
