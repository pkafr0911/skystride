import { STREET_PROPS, type StreetProp } from "../obstacles/street-props";
import { saigonGeometry } from "./saigon-course";
import * as sunset from "./sunset-course";
import { harborGeometry } from "./harbor-course";

export type LevelId =
  | "sunset-relay"
  | "harbor-run"
  | "saigon-rooftops"
  | "street-level";
export type DodgeZone = {
  start: number;
  end: number;
  halfWidth: number;
  lanes: readonly [number, number, number];
  speedStages: { start: number; speed: number }[];
  hazards: {
    x: number;
    length: number;
    z: number;
    width: number;
    kind: StreetProp;
  }[];
};
const dodgeLanes = [-2.45, 0.55, 3.55] as const;
const streetFinish = 2100;
const streetStages = [
  {
    start: 0,
    end: 700,
    speed: 22,
    gap: 16,
    pattern: [1, 2, 0, 2, 1, 0, 2, 0, 1, 2, 1, 0],
  },
  {
    start: 700,
    end: 1400,
    speed: 24,
    gap: 14,
    pattern: [0, 2, 0, 1, 2, 0, 2, 1, 0, 2, 1, 2],
  },
  {
    start: 1400,
    end: 2100,
    speed: 26,
    gap: 12,
    pattern: [2, 0, 2, 1, 0, 2, 0, 1, 2, 0, 1, 0],
  },
];
let streetGateIndex = 0;
export const streetDodge: DodgeZone = {
  start: 0,
  end: streetFinish,
  halfWidth: 4.5,
  lanes: dodgeLanes,
  speedStages: streetStages.map(({ start, speed }) => ({ start, speed })),
  hazards: streetStages.flatMap((stage) => {
    const hazards: DodgeZone["hazards"] = [];
    let x = stage.start + (stage.start === 0 ? 70 : 40);
    for (let row = 0; x < stage.end - 45; row++) {
      const safe = stage.pattern[row % stage.pattern.length];
      for (const [lane, z] of dodgeLanes.entries()) {
        if (lane !== safe)
          hazards.push({
            x,
            length: 2.4,
            z,
            width: 2.7,
            kind: STREET_PROPS[
              (streetGateIndex * 2 + (lane > safe ? lane - 1 : lane)) %
                STREET_PROPS.length
            ],
          });
      }
      streetGateIndex++;
      const nextSafe = stage.pattern[(row + 1) % stage.pattern.length];
      // Two-lane reversals retain time for two inputs and the full lateral crossing.
      x +=
        Math.abs(nextSafe - safe) === 2 ? Math.max(16, stage.gap) : stage.gap;
    }
    return hazards;
  }),
};
export type SectorDefinition = {
  name: string;
  start: number;
  end: number;
  description: string;
};
type Geometry = Pick<
  typeof sunset,
  | "sideRamps"
  | "obstacles"
  | "surfaces"
  | "ground"
  | "skybridges"
  | "skybridgeAt"
  | "lowerRoofDrops"
  | "canMantle"
  | "ramps"
  | "rampHeight"
  | "interactiveTops"
  | "billboardHeaders"
  | "glassObstacles"
  | "supportSurfaces"
>;
export type LevelDefinition = Geometry & {
  id: LevelId;
  version: string;
  name: string;
  number: string;
  tutorial: boolean;
  tagline: string;
  description: string;
  finish: number;
  dodge?: DodgeZone;
  sectors: SectorDefinition[];
  atmosphere: "sunset" | "harbor" | "saigon" | "street";
};
export const sunsetRelay: LevelDefinition = {
  ...sunset,
  id: "sunset-relay",
  version: "sunset-relay-v47",
  name: "Sunset Relay",
  number: "02",
  tutorial: false,
  tagline: "Golden hour. Endless rooftops.",
  description:
    "Chase the warm skyline through rooftop shortcuts and intricate parkour chains. The original Skystride course.",
  finish: 3000,
  atmosphere: "sunset",
  sectors: [
    {
      name: "Rooftop Approach",
      start: 0,
      end: 1000,
      description: "Find your rhythm",
    },
    {
      name: "Technical District",
      start: 1000,
      end: 2000,
      description: "Connect your moves",
    },
    {
      name: "Sunset Skyline",
      start: 2000,
      end: 3000,
      description: "Chase your best line",
    },
  ],
};
export const harborRun: LevelDefinition = {
  ...harborGeometry(),
  id: "harbor-run",
  version: "harbor-run-v2",
  name: "Harbor Run",
  number: "01",
  tutorial: true,
  tagline: "Learn the moves. Find your flow.",
  description:
    "Your tutorial course. Learn vaults, slides, jumps, crane crossings, and landing rolls with on-screen guidance across three waterfront sectors.",
  finish: 3000,
  atmosphere: "harbor",
  sectors: [
    {
      name: "Warehouse Row",
      start: 0,
      end: 1000,
      description: "Vault, slide, build speed",
    },
    {
      name: "Crane District",
      start: 1000,
      end: 2000,
      description: "Catch the elevated line",
    },
    {
      name: "Port Skyline",
      start: 2000,
      end: 3000,
      description: "Drop, roll, finish strong",
    },
  ],
};
export const saigonRooftops: LevelDefinition = {
  ...saigonGeometry(),
  id: "saigon-rooftops",
  version: "saigon-rooftops-v4",
  name: "Saigon Rooftops",
  number: "03",
  tutorial: false,
  tagline: "Above the alleys. Beyond the ordinary.",
  description:
    "A Vietnamese rooftop run through narrow townhouses, market terraces, and the riverfront. Dense rooftop chains, quick transitions, and demanding elevated routes.",
  finish: 3000,
  atmosphere: "saigon",
  sectors: [
    {
      name: "Alley Roofs",
      start: 0,
      end: 1000,
      description: "Vault the neighborhood roofline",
    },
    {
      name: "Market Quarter",
      start: 1000,
      end: 2000,
      description: "Link shutters, signs, and drying bars",
    },
    {
      name: "Riverfront",
      start: 2000,
      end: 3000,
      description: "Take the high line home",
    },
  ],
};
const streetSurfaces = [
  { start: 0, end: streetFinish + 20, y: 0, upper: false },
];
export const streetLevel: LevelDefinition = {
  ...sunset,
  id: "street-level",
  version: "street-level-v3",
  name: "Street Level",
  number: "04",
  tutorial: false,
  tagline: "Down at street level. Keep moving.",
  description:
    "A 2.1 km street endurance run across three escalating districts. Tighter gates, rapid lane reversals, and speeds up to 26 m/s.",
  finish: streetFinish,
  dodge: streetDodge,
  obstacles: [],
  surfaces: streetSurfaces,
  ground: () => 0,
  sideRamps: [],
  skybridges: [],
  lowerRoofDrops: [],
  ramps: [],
  interactiveTops: [],
  billboardHeaders: [],
  glassObstacles: [],
  supportSurfaces: { lower: streetSurfaces, upper: [] },
  atmosphere: "street",
  sectors: [
    {
      name: "Downtown Dash",
      start: 0,
      end: 700,
      description: "22 m/s · learn the reversals",
    },
    {
      name: "Market Rush",
      start: 700,
      end: 1400,
      description: "24 m/s · tighter traffic gates",
    },
    {
      name: "Expressway Gauntlet",
      start: 1400,
      end: streetFinish,
      description: "26 m/s · rapid switches and double reversals",
    },
  ],
};
export const levels: LevelDefinition[] = [
  harborRun,
  sunsetRelay,
  saigonRooftops,
  streetLevel,
];
export const LEVEL_STORAGE = "skystride.selected-level";
export function readLevel(value: string | null): LevelDefinition {
  return levels.find((level) => level.id === value) ?? harborRun;
}
