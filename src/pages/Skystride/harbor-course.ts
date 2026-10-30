import type { Obstacle } from "./model";
import type { Surface } from "./sunset-course";
import { isSwing, SWING_GAP_EXTRA } from "./combos";

// Six authored blocks per district, with clear sector starts and landing corridors.
// The lower service line is always available beneath optional elevated crossings.
export function harborGeometry() {
  const obstacles: Obstacle[] = [];
  const skybridges = [180, 700, 1180, 1700, 2180, 2700].map((start) => ({
    start: start + 12,
    rampStart: start + 14,
    crest: start + 26,
    descent: start + 84,
    end: start + 98,
    height: 7,
  }));
  const lowerRoofDrops = [2444, 2624].map((x) => ({
    x,
    width: 6,
    depth: 5,
    landingEnd: x + 30,
    end: x + 62,
  }));
  for (let sector = 0; sector < 3; sector++) {
    const offset = sector * 1000;
    for (const [block, local] of [40, 180, 340, 520, 700, 850].entries()) {
      const x = offset + local;
      const combo =
        ["Warehouse Flow", "Crane Service", "Port Relay"][sector] +
        ` ${block + 1}`;
      const steps: Obstacle[] = [
        {
          x: x + 22,
          width: 1.6,
          height: 1,
          kind: "vault",
          vault: sector === 2 ? "kong" : "speed",
          design: "freight-crate",
        },
        {
          x: x + 43,
          width: sector === 0 ? 4 : 7,
          kind: "slide",
          design: "cable-gantry",
        },
        {
          x: x + 67,
          width: 1.2,
          height: 0.9,
          kind: "vault",
          vault: "dash",
          design: "hose-station",
        },
        {
          x: x + (local === 180 || local === 700 ? 130 : 104),
          width: sector === 0 ? 5 : 6,
          kind: "gap",
          feature: "bridge",
        },
      ];
      obstacles.push(
        ...steps.map((o, i) => ({
          ...o,
          route: "lower" as const,
          combo,
          contact: i + 1,
          contactTotal: steps.length,
        })),
      );
      if (local === 180 || local === 700) {
        obstacles.push({ x: x + 6, width: 6, kind: "branch" });
        // A longer lower duct rewards a clean elevated route.
        const duct = obstacles.find((o) => o.x === x + 43)!;
        duct.width = 16;
        if (sector === 1) {
          obstacles.push({
            x: x + 42,
            width: 2.4,
            height: 3,
            kind: "signature",
            technique: "lache",
            landmark: "crane",
            route: "upper",
            combo: `Crane Crossing ${block + 1}`,
            contact: 1,
            contactTotal: 2,
          });
        } else {
          obstacles.push({
            x: x + 45,
            width: 6,
            kind: "gap",
            route: "upper",
            feature: "bridge",
          });
        }
        obstacles.push(
          {
            x: x + 73,
            width: 1.4,
            height: 1,
            kind: "vault",
            vault: "dash",
            route: "upper",
            design: "utility-cabinet",
            ...(sector === 1
              ? {
                  combo: `Crane Crossing ${block + 1}`,
                  contact: 2,
                  contactTotal: 2,
                }
              : {}),
          },
          { x: x + 98, width: 5, kind: "drop", route: "upper" },
        );
      }
    }
    // Connecting roofs carry a lighter rhythm between the longer blocks.
    for (const local of sector === 2 ? [510, 688] : [470, 640]) {
      obstacles.push({
        x: offset + local,
        width: 1.2,
        height: 0.8,
        kind: "vault",
        vault: "lazy",
        design: "maintenance-cart",
      });
    }
  }

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
        (o.kind === "gap" || isSwing(o.technique)) &&
        o.x >= start &&
        o.x < end,
    )) {
      pieces.push({ start: cursor, end: o.x, y, upper });
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
  const billboardHeaders: typeof obstacleTops = [];
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
      (o.height ?? 2.35) <= 1.8 &&
      !skybridges.some((b) => o.x < b.end && o.x + o.width > b.start),
    ramps,
    rampHeight: (o: Obstacle, x: number) =>
      ground(o.x, o.route === "upper") +
      Math.max(0, Math.min(1, (x - o.x) / o.width)) * (o.height ?? 1.1),
    interactiveTops: obstacleTops,
    billboardHeaders,
    glassObstacles: [] as Obstacle[],
    supportSurfaces: {
      lower: [...surfaces, ...obstacleTops.filter((s) => !s.upper)],
      upper: [...surfaces, ...obstacleTops.filter((s) => s.upper)],
    },
  };
}
