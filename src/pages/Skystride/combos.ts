import type { Obstacle } from "./model";

export const techniques = [
  "tic-tac",
  "underbar",
  "double-kong",
  "lache",
  "rebound",
  "precision",
  "canopy",
  "palm-drop",
  "monkey",
  "reverse",
  "cat-leap",
  "squeeze",
  "stride",
  "shimmy",
  "transfer",
  "drop-through",
  "wall-pop",
  "duck",
] as const;
export type Technique = (typeof techniques)[number];
export const isSwing = (t?: Technique) =>
  t === "underbar" || t === "lache" || t === "monkey";
export const comboNames = [
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
  "Wall Pop",
  "Beam Duck",
  "Roof Rollout",
] as const;
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
  height: isSwing(technique)
    ? 3
    : technique === "wall-pop" || technique === "cat-leap"
      ? 2
      : technique === "duck"
        ? 1.3
        : 1.1,
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
/** Authored five-contact phrases. Their final run-out belongs to the next approach. */
export function comboCourse(): Obstacle[] {
  return comboNames.flatMap((combo, i) => {
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
          special(8, "palm-drop"),
          special(18, "canopy"),
          special(28, "palm-drop"),
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
        steps = [
          vault(0),
          special(8, "wall-pop"),
          special(18, "cat-leap"),
          special(28, "precision"),
          vault(36),
        ];
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
          special(8, "cat-leap"),
          special(18, "shimmy"),
          special(28, "palm-drop"),
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
        steps = [
          vault(0),
          special(8, "wall-pop"),
          special(18, "monkey"),
          vault(28),
          vault(36),
        ];
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
          special(8, "canopy"),
          special(18, "precision"),
          vault(28),
          vault(36),
        ];
    }
    return (["lower", "upper"] as const).flatMap((route) =>
      steps.map((o, contact) => ({
        ...(route === "lower" && (o.kind === "gap" || o.kind === "ramp")
          ? vault(o.x, "dash")
          : route === "upper" && o.kind === "slide"
            ? vault(o.x, "kong")
            : o),
        ...(route === "lower" && isSwing(o.technique)
          ? { height: 2.3 }
          : route === "lower" &&
              (o.technique === "cat-leap" || o.technique === "wall-pop")
            ? { height: 1.4 }
            : {}),
        x: 512 + i * 44 + o.x,
        route,
        combo,
        contact: contact + 1,
        side: (i === 2 && contact === 1 ? -1 : 1) as 1 | -1,
      })),
    );
  });
}
