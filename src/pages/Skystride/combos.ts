import type { Obstacle } from "./model";

export const techniques = [
  "tic-tac",
  "underbar",
  "double-kong",
  "lache",
  "rebound",
  "precision",
  "monkey",
  "reverse",
  "squeeze",
  "stride",
  "shimmy",
  "transfer",
  "drop-through",
  "duck",
] as const;
export type Technique = (typeof techniques)[number];
export const isSwing = (t?: Technique) =>
  t === "underbar" || t === "lache" || t === "monkey";
export const SWING_GAP_EXTRA = 10.2;
export const SWING_RELEASE_SPEED = 30;
export const swingGripOffset = (width: number) => width - 0.2;
export const SWING_DURATION = 0.55;
export const legacyComboNames = [
  "Vent Relay",
  "Over–Under",
  "Planter Slalom",
  "Roof Transfer",
  "Window Express",
  "Wall Redirect",
  "Scaffold Traverse",
  "Rail Precision",
  "Crane Reach",
  "Descending Flow",
  "Corner Cut",
  "High-Line Escape",
  "Gate Thread",
  "Stride Stones",
  "Wall Traverse",
  "Rail Switch",
  "Drop Through",
  "Monkey Relay",
  "Beam Duck",
  "Roof Rollout",
] as const;
export const newComboNames = [
  "Service Run",
  "Vent Climb",
  "Window Rush",
  "Roofline Sprint",
  "Underpass Escape",
  "Billboard Transfer",
  "Crane Descent",
  "Final Relay",
] as const;
export const comboNames = [...legacyComboNames, ...newComboNames] as const;
const vault = (x: number, type: Obstacle["vault"] = "speed"): Obstacle => ({
  x,
  width: type === "kong" ? 2.4 : 1,
  height: 0.8,
  kind: "vault",
  vault: type,
  feature: "vent-bank",
});
const special = (x: number, technique: Technique): Obstacle => ({
  x,
  width: technique === "double-kong" ? 3.5 : 2.4,
  height: isSwing(technique) ? 3 : technique === "duck" ? 1.3 : 1.1,
  kind: "signature",
  feature: "signature",
  technique,
});
const slide = (x: number): Obstacle => ({
  x,
  width: 2.4,
  height: 2.1,
  kind: "slide",
  feature: "pipe",
});
/** Authored contact phrases. Their final run-out belongs to the next approach. */
export function comboCourse(): Obstacle[] {
  let sectionStart = 512;
  return legacyComboNames.flatMap((combo, i) => {
    let steps: Obstacle[];
    switch (i) {
      case 0:
        steps = [
          vault(0),
          vault(8, "kong"),
          vault(16, "dash"),
          special(26, "double-kong"),
          vault(36),
        ];
        break;
      case 1:
        steps = [
          vault(0, "dash"),
          slide(8),
          vault(16),
          special(26, "duck"),
          vault(36),
        ];
        break;
      case 2:
        steps = [
          vault(0, "lazy"),
          vault(8, "lazy"),
          vault(16),
          special(26, "reverse"),
          vault(36),
        ];
        break;
      case 3:
        steps = [
          vault(0),
          { x: 8, width: 5, height: 0.8, kind: "ramp", feature: "solar" },
          { x: 13, width: 5.8, kind: "gap", feature: "bridge" },
          vault(27),
          special(36, "precision"),
        ];
        break;
      case 4:
        steps = [
          vault(0),
          {
            x: 8,
            width: 3.4,
            height: 0.85,
            kind: "vault",
            vault: "speed",
            feature: "window",
            openingTop: 3.45,
          },
          vault(18),
          special(27, "squeeze"),
          vault(36),
        ];
        break;
      case 5:
        steps = [
          vault(0, "lazy"),
          special(8, "tic-tac"),
          special(18, "rebound"),
          vault(28, "dash"),
          vault(36),
        ];
        break;
      case 6:
        steps = [
          special(0, "precision"),
          slide(8),
          special(16, "underbar"),
          vault(28),
          vault(36),
        ];
        break;
      case 7:
        steps = [
          vault(0),
          { x: 8, width: 4, kind: "gap", feature: "bridge" },
          special(20, "precision"),
          special(30, "stride"),
          vault(38),
        ];
        break;
      case 8:
        steps = [
          vault(0, "kong"),
          special(8, "lache"),
          special(18, "precision"),
          vault(28),
          vault(36),
        ];
        break;
      case 9:
        steps = [
          vault(0),
          special(8, "reverse"),
          special(28, "reverse"),
          vault(36),
        ];
        break;
      case 10:
        steps = [
          vault(0, "lazy"),
          special(8, "reverse"),
          special(18, "transfer"),
          vault(28),
          vault(36),
        ];
        break;
      case 11:
        steps = [vault(0), special(28, "precision"), vault(36)];
        break;
      case 12:
        steps = [
          vault(0),
          special(8, "squeeze"),
          special(18, "precision"),
          vault(28),
          vault(36),
        ];
        break;
      case 13:
        steps = [
          vault(0),
          special(8, "stride"),
          special(18, "stride"),
          special(28, "precision"),
          vault(36),
        ];
        break;
      case 14:
        steps = [
          vault(0),
          special(18, "shimmy"),
          special(28, "reverse"),
          vault(36),
        ];
        break;
      case 15:
        steps = [
          vault(0),
          special(8, "transfer"),
          special(18, "precision"),
          vault(28, "dash"),
          vault(36),
        ];
        break;
      case 16:
        steps = [
          vault(0),
          special(8, "drop-through"),
          {
            x: 18,
            width: 3.4,
            height: 0.85,
            kind: "vault",
            vault: "speed",
            feature: "window",
            openingTop: 3.45,
          },
          vault(28),
          vault(36),
        ];
        break;
      case 17:
        steps = [vault(0), special(18, "monkey"), vault(28), vault(36)];
        break;
      case 18:
        steps = [
          vault(0),
          special(8, "duck"),
          { x: 18, width: 4, kind: "gap", feature: "bridge" },
          vault(31),
          vault(39),
        ];
        break;
      default:
        steps = [
          vault(0, "kong"),
          special(18, "precision"),
          vault(28),
          vault(36),
        ];
    }
    const start = sectionStart;
    const swing = steps.find((o) => isSwing(o.technique));
    // Reserve the full swing landing corridor before the next section.
    const sectionLength = swing ? 52 : 44;
    sectionStart += sectionLength;
    return (["lower", "upper"] as const).flatMap((route) =>
      (route === "upper" && i === 11
        ? [
            {
              x: 0,
              width: 6,
              height: 2.4,
              kind: "encounter",
              feature: "wall-billboard",
              wallGap: true,
            } as Obstacle,
            { x: 9, width: 10, kind: "gap", feature: "bridge" } as Obstacle,
            special(28, "precision"),
            vault(36),
          ]
        : route === "upper" && i === 13
          ? [
              vault(0),
              ...[8, 20, 32].map(
                (x): Obstacle => ({
                  x,
                  width: 4,
                  kind: "gap",
                  feature: "bridge",
                }),
              ),
            ]
          : route === "lower" && i === 11
            ? [
                vault(0),
                slide(4),
                special(22, "duck"),
                special(28, "precision"),
                vault(36),
              ]
            : steps
      ).map((o, contact) => ({
        ...(route === "lower" && (o.kind === "gap" || o.kind === "ramp")
          ? vault(o.x, "dash")
          : route === "upper" && o.kind === "slide"
            ? vault(o.x, "kong")
            : o),
        ...(route === "lower" && isSwing(o.technique) ? { height: 2.3 } : {}),
        x: start + o.x + (swing && o.x > swing.x ? 8 : 0),
        route,
        landmark:
          route === "upper"
            ? i === 8
              ? "crane"
              : i === 11
                ? "billboard"
                : i === 13
                  ? "skylights"
                  : undefined
            : undefined,
        combo,
        contact: contact + 1,
        side: (i === 2 && contact === 1 ? -1 : 1) as 1 | -1,
      })),
    );
  });
}

export type ChainSection = {
  name: (typeof newComboNames)[number];
  start: number;
  end: number;
  route: "lower" | "upper";
  steps: Obstacle[];
};
const gap = (x: number, width = 7): Obstacle => ({
  x,
  width,
  kind: "gap",
  feature: "bridge",
});
const drop = (x: number): Obstacle => ({ x, width: 9, kind: "drop" });
// Explicit reserved bounds include approach and landing space. Only the named
// route is replaced; these sections never expand the three-kilometre course.
export const chainSections: ChainSection[] = [
  {
    name: "Service Run",
    start: 300,
    end: 331,
    route: "lower",
    steps: [vault(302), slide(312), vault(323, "dash")],
  },
  {
    name: "Vent Climb",
    start: 310,
    end: 376,
    route: "upper",
    steps: [vault(315, "kong"), gap(325), special(349, "precision"), drop(375)],
  },
  {
    name: "Window Rush",
    start: 1698,
    end: 1765,
    route: "lower",
    steps: [
      vault(1708, "lazy"),
      {
        x: 1720,
        width: 3.4,
        height: 0.85,
        kind: "vault",
        vault: "speed",
        feature: "window",
        openingTop: 3.45,
      },
      vault(1741),
    ],
  },
  {
    name: "Roofline Sprint",
    start: 1790,
    end: 1856,
    route: "upper",
    steps: [
      {
        ...vault(1795, "dash"),
        width: 2.6,
        height: 1.2,
        design: "utility-cabinet",
      },
      gap(1809),
      special(1831, "precision"),
      drop(1855),
    ],
  },
  {
    name: "Underpass Escape",
    start: 1878,
    end: 1925,
    route: "lower",
    steps: [
      slide(1880),
      vault(1891),
      { ...special(1902, "underbar"), height: 2.3 },
    ],
  },
  {
    name: "Billboard Transfer",
    start: 2263,
    end: 2336,
    route: "upper",
    steps: [
      {
        x: 2273,
        width: 6,
        height: 1.4,
        kind: "encounter",
        feature: "wall-billboard",
        wallGap: true,
      },
      gap(2282, 7),
      special(2309, "precision"),
      drop(2335),
    ],
  },
  {
    name: "Crane Descent",
    start: 2748,
    end: 2816,
    route: "upper",
    steps: [
      vault(2770, "kong"),
      { ...special(2784, "lache"), landmark: "crane" },
      drop(2815),
    ],
  },
  {
    name: "Final Relay",
    start: 2933,
    end: 3000,
    route: "lower",
    steps: [vault(2940), slide(2950), vault(2963, "kong"), gap(2980, 7)],
  },
];
export function expandedChains(): Obstacle[] {
  return chainSections.flatMap((section) =>
    section.steps.map((o, i) => ({
      ...o,
      route: section.route,
      combo: section.name,
      contact: i + 1,
    })),
  );
}
/** Ignore placement and decoration; compare the actual ordered traversal types. */
export function chainFingerprint(steps: Obstacle[]) {
  return steps
    .map(
      (o) =>
        o.technique ??
        (o.feature === "window"
          ? "window-dive"
          : o.feature === "wall-billboard"
            ? "wall-run"
            : o.kind === "vault"
              ? `vault:${o.vault}`
              : o.kind),
    )
    .join(" > ");
}

/** Full support interval, including the landing side of a suspended crossing. */
export function obstacleEnd(o: Pick<Obstacle, "x" | "width" | "technique">) {
  return o.x + o.width + (isSwing(o.technique) ? SWING_GAP_EXTRA : 0);
}
export function overlapsChain(o: Obstacle, section: ChainSection) {
  return (
    (!o.route || o.route === section.route) &&
    o.x < section.end &&
    obstacleEnd(o) > section.start
  );
}
