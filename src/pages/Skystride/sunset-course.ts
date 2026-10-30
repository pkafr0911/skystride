import type { Obstacle, Vault, MovementProp } from "./model";
import {
  comboCourse,
  chainSections,
  expandedChains,
  overlapsChain,
  isSwing,
  SWING_GAP_EXTRA,
} from "./combos";
const SECTOR = 1000;
const FINISH = SECTOR * 3;
const opening: Obstacle[] = [
  { x: 14, width: 5.5, kind: "gap" },
  {
    x: 27,
    width: 0.7,
    height: 0.5,
    kind: "vault",
    vault: "speed",
    design: "safety-barricade",
  },
  {
    x: 46,
    width: 6,
    height: 1.4,
    kind: "encounter",
    feature: "wall-billboard",
    wallGap: true,
  },
  { x: 67, width: 6.2, kind: "gap", feature: "bridge" },
  { x: 80, width: 5.5, kind: "gap" },
  { x: 91, width: 5.5, height: 1.65, kind: "slide", feature: "tank" },
  { x: 102, width: 5.5, kind: "gap" },
  { x: 115, width: 5, height: 3.3, kind: "branch" },
  {
    x: 139,
    design: "maintenance-cart",
    width: 1.5,
    height: 1.05,
    kind: "vault",
    vault: "speed",
    route: "lower",
  },
  { x: 153, width: 6, kind: "slide", route: "lower", design: "duct-elbow" },
  { x: 148, width: 6.5, kind: "gap", route: "upper" },
  {
    x: 150.5,
    width: 1.8,
    height: 0.65,
    kind: "ledge",
    route: "upper",
    feature: "scaffold",
  },
  {
    x: 176,
    width: 2.3,
    height: 2.2,
    kind: "ledge",
    route: "upper",
    feature: "balcony",
  },
  {
    x: 179.5,
    width: 2.3,
    height: 3.3,
    kind: "ledge",
    route: "upper",
    feature: "balcony",
  },
  {
    x: 183,
    width: 3,
    height: 4.3,
    kind: "ledge",
    route: "upper",
    feature: "balcony",
  },
  { x: 195, width: 9, kind: "drop", route: "upper" },
  { x: 206, width: 5, kind: "gap", design: "roof-hatch" },
  {
    x: 217,
    width: 1.8,
    height: 1.15,
    kind: "vault",
    vault: "kong",
    feature: "vent-bank",
  },
  {
    x: 223.2,
    design: "cable-reels",
    width: 1.6,
    height: 1.15,
    kind: "vault",
    vault: "dash",
    feature: "vent-bank",
  },
  { x: 234, width: 6, height: 1.1, kind: "ramp", feature: "solar" },
  { x: 240, width: 7, kind: "gap" },
  {
    x: 267,
    design: "antenna-base",
    width: 1.2,
    height: 0.85,
    kind: "vault",
    vault: "lazy",
    feature: "greenhouse",
    part: "planter",
  },
  {
    x: 271,
    width: 6,
    height: 1.45,
    kind: "ramp",
    feature: "greenhouse",
    part: "ledge",
  },
  {
    x: 278,
    width: 3,
    height: 2.5,
    openingTop: 1.25,
    kind: "glass",
    feature: "greenhouse",
    part: "glass",
  },
  { x: 290, width: 5, kind: "branch" },
  {
    x: 312,
    design: "ac-condenser",
    width: 2.8,
    height: 1.1,
    kind: "vault",
    vault: "kong",
    route: "lower",
  },
  { x: 335, width: 6, kind: "slide", route: "lower" },
  { x: 325, width: 7, kind: "gap", route: "upper" },
  {
    x: 349,
    design: "utility-cabinet",
    width: 2.6,
    height: 1.2,
    kind: "vault",
    vault: "dash",
    route: "upper",
  },
  { x: 375, width: 9, kind: "drop", route: "upper" },
  { x: 389, width: 5, kind: "gap" },
  {
    x: 402,
    width: 3.4,
    height: 0.85,
    kind: "vault",
    vault: "speed",
    feature: "window",
    openingTop: 3.45,
  },
  {
    x: 424,
    width: 1.4,
    height: 1.05,
    kind: "vault",
    vault: "dash",
    feature: "pipe",
  },
  { x: 431.2, width: 4.2, height: 2.35, kind: "slide", feature: "pipe" },
  { x: 448, width: 7.2, kind: "gap" },
];
// An authored opening, a sustained technical district, then three varied rooftop blocks.
// All patterns are deterministic and shared by collision, renderer and replay.
export const TECHNICAL = { start: 500, end: 1450 };
const circuit: Obstacle[] = [
  { x: 490, width: 5, kind: "branch" },
  { x: 1450, width: 9, kind: "drop", route: "upper" },
];
const variants: Vault[] = [
  "kong",
  "dash",
  "speed",
  "lazy",
  "kong",
  "dash",
  "speed",
  "lazy",
];
circuit.push(...comboCourse());
const districts = [1480, 1960, 2440];
export const sideRamps: Obstacle[] = [0, ...districts].map((offset) => ({
  x: 456 + offset,
  width: 20,
  height: -1.2,
  kind: "ramp",
  feature: "side-ramp",
}));
// Shared short-route rules across all three sectors.
export const skybridges = [0, ...districts].map((offset) => ({
  start: 295 + offset,
  rampStart: 297 + offset,
  crest: 309 + offset,
  descent: 361 + offset,
  end: 375 + offset,
  height: 7,
}));
export function skybridgeAt(x: number) {
  return skybridges.find((bridge) => x >= bridge.start && x <= bridge.end);
}
function skybridgeHeight(x: number) {
  const bridge = skybridgeAt(x);
  if (!bridge) return 3.3;
  return (
    3.3 +
    (bridge.height - 3.3) *
      Math.max(
        0,
        Math.min(
          1,
          (x - bridge.rampStart) / (bridge.crest - bridge.rampStart),
          (bridge.end - x) / (bridge.end - bridge.descent),
        ),
      )
  );
}
const courseAnchors: Obstacle[] = [
  ...sideRamps,
  ...sideRamps.map(
    (r): Obstacle => ({ x: r.x + r.width, width: 8.4, kind: "gap" }),
  ),
  ...opening,
  ...circuit,
  ...districts.flatMap((offset) =>
    opening.map((o) => ({ ...o, x: o.x + offset })),
  ),
  { x: 2940, width: 1.6, height: 1, kind: "vault", vault: "kong" },
  { x: 2960, width: 4.2, kind: "slide" },
  { x: 2980, width: 6, kind: "gap" },
]
  .filter(
    (o) =>
      !chainSections.some((section) => overlapsChain(o as Obstacle, section)),
  )
  .concat(expandedChains())
  .sort((a, b) => a.x - b.x) as Obstacle[];
// Each high shortcut bypasses a slower, forgiving service passage.
for (const bridge of skybridges)
  courseAnchors.find(
    (o) => o.x === bridge.start + 40 && o.route === "lower",
  )!.width = 23;
/** Separate lower-route buildings: a street gap, a roof eight metres below,
 * a clear roll-out, then a gradual connection back into the district. */
export const lowerRoofDrops = [132, 1612, 2092, 2572].map((x) => ({
  x,
  width: 5,
  depth: 8,
  landingEnd: x + 32,
  end: x + 66,
}));
export const upperPlatforms = [
  { start: 120, end: 132 },
  { start: 295, end: 375 },
  { start: 495, end: 1450 },
  ...districts.flatMap((offset) => [
    { start: 120 + offset, end: 132 + offset },
    { start: 295 + offset, end: 375 + offset },
  ]),
];
/** Fill runnable approaches with short alternating contacts, retaining landing/rejoin space. */
function denseLane(start: number, end: number, route: "upper" | "lower") {
  const anchors = courseAnchors.filter(
    (o) => o.x >= start && o.x < end && (!o.route || o.route === route),
  );
  const additions: Obstacle[] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const previous = anchors[i],
      next = anchors[i + 1];
    if (
      (previous.combo && previous.combo === next.combo) ||
      previous.kind === "drop" ||
      previous.kind === "ramp" ||
      previous.kind === "ledge" ||
      (previous.feature === "greenhouse" && next.feature === "greenhouse") ||
      (previous.feature === "vent-bank" && next.feature === "vent-bank") ||
      (previous.feature === "pipe" && next.feature === "pipe")
    )
      continue;
    const clearance =
      previous.kind === "glass"
        ? 8
        : previous.kind === "gap"
          ? 5.5
          : previous.kind === "branch"
            ? 8
            : 2.8;
    let x = previous.x + previous.width + clearance;
    let n = 0;
    while (x <= next.x - 5.8 && x < end - 5) {
      additions.push(
        n % 3 === 1
          ? { x, width: 1.1, height: 1.65, kind: "slide", route }
          : {
              x,
              width: 0.65,
              height: 0.65 + (n % 2) * 0.15,
              kind: "vault",
              vault:
                variants[
                  (i + n + (route === "upper" ? 1 : 0)) % variants.length
                ],
              route,
            },
      );
      x += route === "upper" ? 5.8 : 7;
      n++;
    }
  }
  return additions.filter((o) => {
    if (
      chainSections.some(
        (section) => route === section.route && overlapsChain(o, section),
      )
    )
      return false;
    // The skybridge is a short, open momentum line with authored contacts only.
    if (route === "upper" && skybridgeAt(o.x)) return false;
    if (
      sideRamps.some((r) => o.x + o.width > r.x - 2 && o.x < r.x + r.width + 12)
    )
      return false;
    if (
      route === "lower" &&
      upperPlatforms.some((p) => o.x >= p.end - 2 && o.x < p.end + 15)
    )
      return false;
    // Leave a visible run-up for the early-jump alternative. Filler must not
    // consume the same input that is meant to choose the top line.
    if (
      courseAnchors.some(
        (a) =>
          (!a.route || a.route === route) &&
          ((a.feature === "greenhouse" &&
            o.x >= a.x - 2 &&
            o.x < a.x + a.width + 4) ||
            (a.feature === "balcony" &&
              o.x >= a.x - 3 &&
              o.x < a.x + a.width + 5) ||
            (a.feature === "wall-billboard" &&
              o.x >= a.x &&
              o.x < a.x + a.width + 5)),
      )
    )
      return false;
    return !courseAnchors.some(
      (anchor) =>
        (!anchor.route || anchor.route === route) &&
        ((anchor.feature === "vent-bank" && anchor.vault === "kong") ||
          (anchor.feature === "pipe" && anchor.kind === "vault") ||
          anchor.feature === "window") &&
        o.x >= anchor.x - (anchor.feature === "window" ? 8 : 10) &&
        o.x < anchor.x,
    );
  });
}
export const obstacles: Obstacle[] = [
  ...courseAnchors.map((o) =>
    o.route === "upper" &&
    (o.feature === "scaffold" || o.feature === "balcony") &&
    lowerRoofDrops.some((d) => o.x >= d.x && o.x < d.end)
      ? { ...o, x: o.x + 180 }
      : o,
  ),
  ...denseLane(0, FINISH, "lower"),
  ...upperPlatforms.flatMap((p) => denseLane(p.start - 6, p.end, "upper")),
]
  .filter(
    (o) =>
      !(
        o.kind === "ledge" &&
        o.route === "upper" &&
        chainSections.some(
          (section) =>
            (section.name === "Billboard Transfer" ||
              section.name === "Crane Descent") &&
            o.x >= section.start &&
            o.x < section.end,
        )
      ) &&
      !lowerRoofDrops.some((d) =>
        o.route === "upper"
          ? o.x >= d.x && o.x < d.end + 3
          : o.x + o.width > d.x - 8 && o.x < d.end + 3,
      ),
  )
  .concat(
    lowerRoofDrops.map((d) => ({
      x: d.x,
      width: d.width,
      kind: "gap" as const,
      route: "lower" as const,
    })),
  )
  .sort((a, b) => a.x - b.x);

// Reuse the displaced cart and duct designs on existing encounters outside
// the drop corridors, keeping the equipment variety without blocking landings.
for (const [design, kind] of [
  ["maintenance-cart", "vault"],
  ["duct-elbow", "slide"],
] as const) {
  if (!obstacles.some((o) => o.design === design)) {
    const replacement = obstacles.find(
      (o) =>
        o.x > 200 && !o.combo && !o.feature && !o.design && o.kind === kind,
    );
    if (replacement) replacement.design = design;
  }
}

// Check the finished lanes after filler filtering, which can remove a separating
// vault near a landing zone. Replace the filler duct, preserving authored props.
for (const route of ["lower", "upper"] as const) {
  const lane = obstacles.filter((o) => !o.route || o.route === route);
  for (let i = 1; i < lane.length; i++) {
    if (lane[i - 1].kind !== "slide" || lane[i].kind !== "slide") continue;
    const filler =
      !lane[i - 1].feature && lane[i - 1].route ? lane[i - 1] : lane[i];
    filler.kind = "vault";
    filler.vault = "kong";
    filler.height = 1.1;
    filler.width = 2.4;
  }
}

// Refresh three of each ten eligible props independently in every sector/lane.
// Preserve authored equipment, windows, landmarks and all traversal dimensions.
for (let sector = 0; sector < 3; sector++) {
  for (const route of [undefined, "lower", "upper"] as const) {
    const eligible = obstacles.filter(
      (o) =>
        Math.floor(o.x / SECTOR) === sector &&
        o.route === route &&
        !o.design &&
        !o.landmark &&
        ((o.kind === "vault" && (!o.feature || o.feature === "vent-bank")) ||
          (o.kind === "slide" && (!o.feature || o.feature === "pipe"))),
    );
    let vaultIndex = sector;
    eligible.forEach((o, i) => {
      if (![1, 4, 7].includes(i % 10)) return;
      o.design =
        o.kind === "slide"
          ? "cable-gantry"
          : vaultIndex++ % 2 === 0
            ? "freight-crate"
            : "hose-station";
    });
  }
}

// Other move families get their own partial refresh, preserving landmark props.
export function movementPropFor(o: Obstacle): MovementProp | undefined {
  if (o.design || o.landmark) return;
  if (o.kind === "gap" && o.feature === "bridge") return "expansion-joint";
  if (o.feature === "window") return "loading-shutter";
  if (o.feature === "wall-billboard") return "acoustic-wall";
  if (isSwing(o.technique) || o.technique === "shimmy")
    return "maintenance-gantry";
  if (o.technique === "precision") return "chimney-plinth";
  if (o.kind === "ledge") return "fire-escape";
  if (o.kind === "ramp" && o.feature !== "side-ramp") return "loading-ramp";
  if (o.technique === "tic-tac" || o.technique === "rebound")
    return "service-bulkhead";
}
const propGroups = new Map<MovementProp, Obstacle[]>();
for (const o of obstacles) {
  const prop = movementPropFor(o);
  if (prop) propGroups.set(prop, [...(propGroups.get(prop) ?? []), o]);
}
for (const [prop, group] of propGroups) {
  // Evenly distribute a rounded 30% through the course, keeping originals.
  const count = Math.min(
    group.length - 1,
    Math.max(1, Math.round(group.length * 0.3)),
  );
  for (let i = 0; i < count; i++)
    group[Math.floor(((i + 0.5) * group.length) / count)].appearance = prop;
}

const chainTotals = new Map<string, number>();
for (const o of obstacles)
  if (o.combo) {
    const key = `${o.route}:${o.combo}`;
    chainTotals.set(key, (chainTotals.get(key) ?? 0) + 1);
  }
for (const o of obstacles)
  if (o.combo) o.contactTotal = chainTotals.get(`${o.route}:${o.combo}`);

export function canMantle(o: Obstacle) {
  return (
    o.kind === "slide" &&
    o.feature !== "tank" &&
    (o.height ?? 2.35) <= 1.8 &&
    (o.route === "upper" ||
      !upperPlatforms.some((p) => o.x < p.end && o.x + o.width > p.start))
  );
}
/** Clean action opportunity in seconds, independent of current horizontal speed. */
export function timingWindow(o: Obstacle) {
  return o.route === "upper"
    ? 0.2 + Math.min(0.05, o.width * 0.0125)
    : 0.3 + Math.min(0.1, o.width * 0.025);
}
export function timingRange(o: Obstacle, speed: number) {
  const end = o.kind === "gap" ? 0.35 : 0.55;
  return { near: end, far: end + Math.max(5.5, speed) * timingWindow(o) };
}
// Each district has its own raised and lowered roofs. Changes happen across
// building gaps, with bounded steps so the authored jump sequences stay reachable.
const elevationStages = [
  { start: 0, high: 0.6, low: -0.35 },
  { start: 1480, high: 1, low: -0.55 },
  { start: 1960, high: 0.35, low: -0.8 },
  { start: 2440, high: 1.2, low: 0.3 },
];
function districtRoofHeight(x: number) {
  for (const stage of elevationStages) {
    const local = x - stage.start;
    // Tolerate round-off when a gap endpoint is translated into another district.
    if (local >= 19.5 - 1e-8 && local < 73.2 - 1e-8) return stage.high;
    if (local >= 73.2 - 1e-8 && local < 85.5 - 1e-8) return stage.low;
  }
  return 0;
}
// Physical lower buildings: flat roofs joined by short, obstacle-free ramps.
// Keep the upper line independent so its existing clearance only increases.
export const roofBuildings = [
  { start: 901, end: 1023, depth: 0.9, ramp: 3 },
  { start: 1029, end: 1151, depth: 1.4, ramp: 3 },
  { start: 1155, end: 1284, depth: 0.7, ramp: 3 },
  { start: 1351, end: 1456, depth: 1.1, ramp: 3 },
];
export function roofHeight(x: number) {
  const drop = lowerRoofDrops.find((d) => x >= d.x + d.width && x < d.end);
  if (drop)
    return (
      -drop.depth *
      (x < drop.landingEnd ? 1 : (drop.end - x) / (drop.end - drop.landingEnd))
    );
  const building = roofBuildings.find((b) => x >= b.start && x < b.end);
  if (!building) return districtRoofHeight(x);
  const fraction = Math.min(
    1,
    (x - building.start) / building.ramp,
    (building.end - x) / building.ramp,
  );
  return districtRoofHeight(x) - building.depth * fraction;
}
export type Surface = {
  start: number;
  end: number;
  y: number;
  upper: boolean;
  endY?: number;
};
export function surfaceHeight(s: Surface, x: number) {
  const fraction = Math.max(0, Math.min(1, (x - s.start) / (s.end - s.start)));
  return s.y + ((s.endY ?? s.y) - s.y) * fraction;
}
function cut(start: number, end: number, y: number, upper: boolean): Surface[] {
  const result: Surface[] = [];
  let cursor = start;
  for (const o of obstacles.filter(
    (item) =>
      (item.kind === "gap" || isSwing(item.technique) || item.wallGap) &&
      (upper ? item.route === "upper" : item.route !== "upper") &&
      item.x >= start &&
      item.x < end,
  )) {
    result.push({
      start: cursor,
      end: o.x + (o.wallGap ? 1 : 0),
      y: y + districtRoofHeight(cursor),
      upper,
    });
    cursor = o.x + o.width + (isSwing(o.technique) ? SWING_GAP_EXTRA : 0);
  }
  result.push({ start: cursor, end, y: y + districtRoofHeight(cursor), upper });
  return result;
}
export const surfaces: Surface[] = [
  ...cut(-30, FINISH + 25, 0, false).flatMap((slab) => {
    const cuts = [
      slab.start,
      slab.end,
      ...lowerRoofDrops
        .flatMap((d) => [d.x + d.width, d.landingEnd, d.end])
        .filter((x) => x > slab.start && x < slab.end),
      ...roofBuildings
        .flatMap((b) => [b.start, b.start + b.ramp, b.end - b.ramp, b.end])
        .filter((x) => x > slab.start && x < slab.end),
    ].sort((a, b) => a - b);
    return cuts.slice(0, -1).map((start, i): Surface => {
      const end = cuts[i + 1];
      // Sample just inside each bank: existing roof changes across gaps stay discrete.
      const y = roofHeight(start + 1e-7),
        endY = roofHeight(end - 1e-7);
      return {
        start,
        end,
        y,
        endY: Math.abs(endY - y) > 0.001 ? endY : undefined,
        upper: false,
      };
    });
  }),
  ...upperPlatforms.flatMap((p) => {
    const bridge = skybridgeAt(p.start);
    return bridge
      ? [
          { start: p.start, end: bridge.rampStart, y: 3.3, upper: true },
          {
            start: bridge.rampStart,
            end: bridge.crest,
            y: 3.3,
            endY: bridge.height,
            upper: true,
          },
          ...cut(bridge.crest, bridge.descent, bridge.height, true),
          {
            start: bridge.descent,
            end: p.end,
            y: bridge.height,
            endY: 3.3,
            upper: true,
          },
        ]
      : cut(p.start, p.end, 3.3, true);
  }),
];
export const craneRecovery = obstacles
  .filter((o) => o.landmark === "crane" && isSwing(o.technique))
  .map(
    (o): Surface => ({
      start: o.x + 3,
      end: o.x + o.width + SWING_GAP_EXTRA + 4,
      y: 0,
      upper: false,
    }),
  );
surfaces.push(...craneRecovery);
export function ground(x: number, upper: boolean) {
  return upper && upperPlatforms.some((p) => x >= p.start && x <= p.end)
    ? districtRoofHeight(x) + skybridgeHeight(x)
    : roofHeight(x);
}
/** Solid obstacle tops are support surfaces even after their scoring event is handled. */
export const obstacleTops = obstacles.flatMap((o, index) =>
  o.kind === "vault" || o.kind === "slide" || o.kind === "ledge"
    ? [
        {
          start: o.x,
          end: o.x + o.width,
          y:
            ground(o.x, o.route === "upper") +
            (o.height ?? (o.kind === "slide" ? 2.35 : 1)),
          index,
          upper: o.route === "upper",
        },
      ]
    : [],
);
export const glassObstacles = obstacles.filter((o) => o.kind === "glass");
export const ramps = obstacles.filter((o) => o.kind === "ramp");
export function rampHeight(o: Obstacle, x: number) {
  return (
    ground(o.x, o.route === "upper") +
    Math.max(0, Math.min(1, (x - o.x) / o.width)) * (o.height ?? 1.1)
  );
}
export const billboardHeaders = obstacles.flatMap((o, index) =>
  o.feature === "window"
    ? [
        {
          start: o.x,
          end: o.x + o.width,
          y: ground(o.x, o.route === "upper") + o.openingTop! + 0.55,
          index,
          upper: o.route === "upper",
        },
      ]
    : [],
);
export const wallRunLedges = obstacles.flatMap((o, index) =>
  o.feature === "wall-billboard"
    ? [
        {
          start: o.x + o.width,
          end: o.x + o.width + 3,
          y: ground(o.x, o.route === "upper") + o.height!,
          index,
          upper: o.route === "upper",
        },
      ]
    : [],
);
export const interactiveTops = [
  ...obstacleTops,
  ...billboardHeaders,
  ...wallRunLedges,
];
// Build once; the 120 Hz loop must not allocate and filter the full course per tick.
export const supportSurfaces = {
  lower: [
    ...surfaces,
    ...obstacleTops.filter((s) => !s.upper),
    ...billboardHeaders.filter((s) => !s.upper),
    ...wallRunLedges.filter((s) => !s.upper),
  ],
  upper: [
    ...surfaces,
    ...obstacleTops.filter((s) => s.upper),
    ...billboardHeaders.filter((s) => s.upper),
    ...wallRunLedges.filter((s) => s.upper),
  ],
};
