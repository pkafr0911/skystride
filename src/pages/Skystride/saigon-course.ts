import type { Obstacle, VietnamProp } from "./model";
import type { Surface } from "./sunset-course";
import { isSwing, SWING_GAP_EXTRA } from "./combos";

export function vietnamPropFor(o: Obstacle): VietnamProp | undefined {
  if (o.feature === "tank") return "water-tank-deck";
  if (o.feature === "wall-billboard") return "cafe-sign";
  if (o.feature === "window") return "market-shutter";
  if (isSwing(o.technique) || o.technique === "shimmy") return "drying-rack";
  if (o.kind === "ramp") return "plank-ramp";
  if (o.kind === "ledge" || o.technique === "precision")
    return "terrazzo-planter";
  if (o.kind === "slide") return "awning-crossbar";
  if (o.kind === "vault") return "fruit-crate-bench";
  return undefined;
}

// Independent contact phrases: positions are local to this course, never mapped
// from another level. Dimensions use the same movement/timing budget as Sunset.
export function saigonGeometry() {
  const obstacles: Obstacle[] = [];
  const kit: Record<string, Omit<Obstacle, "x">> = {
    v: { kind: "vault", width: 1, height: 0.8, vault: "speed" },
    k: { kind: "vault", width: 2.4, height: 0.8, vault: "kong" },
    d: { kind: "vault", width: 1, height: 0.8, vault: "dash" },
    s: { kind: "slide", width: 2.4, height: 2.1 },
    g: { kind: "gap", width: 5.8, feature: "bridge" },
    p: {
      kind: "signature",
      width: 2.4,
      height: 1.1,
      technique: "precision",
      feature: "signature",
    },
    l: {
      kind: "signature",
      width: 2.4,
      height: 3,
      technique: "lache",
      feature: "signature",
    },
    u: {
      kind: "signature",
      width: 2.4,
      height: 3,
      technique: "underbar",
      feature: "signature",
    },
    m: {
      kind: "signature",
      width: 2.4,
      height: 3,
      technique: "monkey",
      feature: "signature",
    },
    r: {
      kind: "signature",
      width: 2.4,
      height: 1.1,
      technique: "reverse",
      feature: "signature",
    },
    t: { kind: "slide", width: 5.5, height: 1.65, feature: "tank" },
    w: {
      kind: "vault",
      width: 3.4,
      height: 0.85,
      vault: "speed",
      feature: "window",
      openingTop: 3.45,
    },
    c: { kind: "encounter", width: 6, height: 1.4, feature: "wall-billboard" },
    a: { kind: "ramp", width: 5, height: 0.8, feature: "solar" },
  };
  const phrase = (
    start: number,
    combo: string,
    contacts: string,
    route: "lower" | "upper" = "lower",
  ) => {
    const steps = contacts.split(" ");
    for (const [i, contact] of steps.entries()) {
      const [offset, key] = contact.split(":");
      const o: Obstacle = {
        ...kit[key],
        x: start + Number(offset),
        route,
        combo,
        contact: i + 1,
        contactTotal: steps.length,
      };
      obstacles.push({
        ...o,
        ...(route === "lower" && isSwing(o.technique) ? { height: 2.3 } : {}),
        vietnam: vietnamPropFor(o),
      });
    }
  };
  // Alley roofs: short alternating contacts, courtyard crossings, water decks.
  phrase(33, "Morning Deliveries", "0:s 10:k 21:p 33:v 45:g");
  phrase(129, "Courtyard Stitch", "0:w 13:d 24:s 36:r 48:k");
  phrase(247, "Laundry Cut", "0:p 24:l 51:s 62:d 90:g");
  phrase(363, "Water Garden", "0:t 14:p 26:k 38:w 51:s");
  phrase(479, "Coffee Corner", "0:c 16:s 27:d 39:p 51:g");
  phrase(598, "Tile Hop", "0:k 11:r 23:a 28:g 44:v 55:s");
  phrase(731, "Balcony Errands", "0:s 12:w 26:p 50:u 98:d");
  phrase(861, "Alley Exit", "0:g 16:t 31:k 43:s 55:p");
  // Market: shutter/awning rhythms with longer rack transfers between stalls.
  phrase(1037, "Opening Stalls", "0:w 13:s 24:k 36:p 48:d");
  phrase(1151, "Canopy Thread", "0:s 11:p 35:m 63:w 93:k");
  phrase(1283, "Fruit Exchange", "0:k 12:s 23:c 40:d 52:g");
  phrase(1409, "Market Terraces", "0:p 12:t 28:w 41:r 53:v");
  phrase(1531, "Basket Sprint", "0:d 11:g 27:s 38:k 50:p");
  phrase(1657, "Shade Crossing", "0:u 28:k 40:w 53:s 65:d");
  phrase(1781, "Cafe Delivery", "0:c 17:p 29:s 40:a 45:g 61:k");
  phrase(1903, "Closing Shutters", "0:s 11:w 25:d 37:r 49:p");
  // Riverfront: separated roof islands, launch planks and exposed high lines.
  phrase(2039, "River Approach", "0:p 12:g 28:k 40:s 51:w");
  phrase(2163, "Quay Transfer", "0:a 5:g 22:d 46:l 92:p");
  phrase(2291, "Floating Gardens", "0:t 15:s 26:p 38:k 50:g");
  phrase(2417, "Riverside Coffee", "0:w 14:c 31:s 43:r 55:d");
  phrase(2543, "Breeze Line", "0:k 24:m 52:p 64:w 94:s");
  phrase(2673, "Terrace Descent", "0:g 17:d 29:t 44:p 56:s");
  phrase(2801, "Lantern Crossing", "0:s 11:a 16:g 33:k 57:u 85:d");
  phrase(2921, "Saigon Home", "0:w 14:p 26:s 38:k 50:d");

  // Link the main encounters with short alternating phrases. Sector starts,
  // swing landings and elevated exits retain their dedicated recovery space.
  phrase(96, "Breakfast Rush", "0:k 10:s 20:d");
  phrase(190, "Courtyard Gate", "0:s 10:k");
  phrase(432, "Garden Weave", "0:d 10:s 20:k 30:p");
  phrase(665, "Tile Finish", "0:k 10:s");
  phrase(841, "Balcony Steps", "0:k 10:s");
  phrase(932, "Neighborhood Dash", "0:s 10:k 20:w 32:d");
  phrase(1097, "Stall Queue", "0:k 10:s");
  phrase(1257, "Canopy Exit", "0:s 10:d");
  phrase(1353, "Market Crush", "0:k 10:s 20:w 32:d 42:p");
  phrase(1473, "Terrace Lip", "0:k");
  phrase(1594, "Basket Weave", "0:k 10:s");
  phrase(1757, "Shade Exit", "0:s 10:k");
  phrase(1855, "Cafe Rush", "0:d 10:s 20:k 30:p");
  phrase(1964, "Last Orders", "0:k 10:s");
  phrase(2104, "Quay Gate", "0:s 10:k");
  phrase(2268, "River Steps", "0:s 10:k");
  phrase(2483, "Coffee Exit", "0:k");
  phrase(2649, "Breeze Finish", "0:k 10:s");
  phrase(2743, "Lantern Market", "0:k 10:s 20:w 32:d 42:p");
  phrase(2899, "Home Stretch", "0:s 10:k");
  phrase(2983, "Last Crate", "0:k");

  // Six distinct high routes, with independently placed entrances and returns.
  const skybridges = [211, 685, 1117, 1619, 2127, 2497].map((start, i) => ({
    start: start + 6,
    rampStart: start + 8,
    crest: start + 20,
    descent: start + (i % 2 ? 104 : 91),
    end: start + (i % 2 ? 118 : 105),
    height: 7,
  }));
  const highPhrases = [
    "0:s 10:k 20:p 30:g 47:k 57:s",
    "0:w 24:l 52:d 64:p",
    "0:p 24:u 52:s 64:k",
    "0:k 10:s 20:g 36:w 50:p 60:d",
    "0:s 24:m 52:p 64:d",
    "0:c 16:s 26:k 36:p 46:g 63:d",
  ];
  skybridges.forEach((b, i) => {
    obstacles.push({ x: b.start - 6, width: 6, kind: "branch" });
    phrase(
      b.crest + 5,
      [
        "Courtyard Walk",
        "Laundry Express",
        "Canopy Tops",
        "Shutter Walk",
        "Quay Skyline",
        "River Balcony",
      ][i],
      highPhrases[i],
      "upper",
    );
    obstacles.push({ x: b.end, width: 5, kind: "drop", route: "upper" });
  });
  const lowerRoofDrops = [557, 1487, 2357].map((x) => ({
    x,
    width: 6,
    depth: 5,
    landingEnd: x + 22,
    end: x + 36,
  }));
  lowerRoofDrops.forEach((d) =>
    obstacles.push({
      x: d.x,
      width: d.width,
      kind: "gap",
      route: "lower",
      feature: "bridge",
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
