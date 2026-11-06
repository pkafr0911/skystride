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
  hazards: {
    x: number;
    length: number;
    z: number;
    width: number;
    kind:
      | "hvac"
      | "water-tank"
      | "vent"
      | "solar"
      | "satellite"
      | "duct"
      | "parked-car"
      | "road-barrier"
      | "trash-bins"
      | "planter"
      | "hydrant"
      | "scaffold";
  }[];
};
const dodgeLanes = [-2.45, 0.55, 3.55] as const;
const streetFinish = 700;
export const streetDodge: DodgeZone = {
  start: 0,
  end: streetFinish,
  halfWidth: 4.5,
  lanes: dodgeLanes,
  // Each gate blocks two lanes. Outer-lane reversals demand two quick inputs.
  hazards: Array.from({ length: 36 }, (_, row) => row).flatMap((row) =>
    dodgeLanes.flatMap((z, lane) => {
      const safe = [1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0][row % 12];
      return lane === safe
        ? []
        : [
            {
              x: 70 + row * 16,
              length: 2.4,
              z,
              width: 2.7,
              kind: (
                [
                  "parked-car",
                  "road-barrier",
                  "trash-bins",
                  "planter",
                  "hydrant",
                  "scaffold",
                ] as const
              )[row % 6],
            },
          ];
    }),
  ),
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
  version: "street-level-v1",
  name: "Street Level",
  number: "04",
  tutorial: false,
  tagline: "Down at street level. Keep moving.",
  description:
    "A fast urban lane run through city streets, storefronts, traffic barriers, parked cars, and everyday street fixtures.",
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
      end: streetFinish,
      description: "Switch lanes through city traffic",
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
