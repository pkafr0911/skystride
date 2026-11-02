import { saigonGeometry } from "./saigon-course";
import * as sunset from "./sunset-course";
import { harborGeometry } from "./harbor-course";

export type LevelId = "sunset-relay" | "harbor-run" | "saigon-rooftops";
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
  sectors: SectorDefinition[];
  atmosphere: "sunset" | "harbor" | "saigon";
};
export const sunsetRelay: LevelDefinition = {
  ...sunset,
  id: "sunset-relay",
  version: "sunset-relay-v42",
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
  version: "saigon-rooftops-v2",
  name: "Saigon Rooftops",
  number: "03",
  tutorial: false,
  tagline: "Above the alleys. Beyond the ordinary.",
  description:
    "A Vietnamese rooftop run through narrow townhouses, market terraces, and the riverfront. Sunset Relay difficulty, with original rooftop routes and contact sequences.",
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
export const levels: LevelDefinition[] = [
  harborRun,
  sunsetRelay,
  saigonRooftops,
];
export const LEVEL_STORAGE = "skystride.selected-level";
export function readLevel(value: string | null): LevelDefinition {
  return levels.find((level) => level.id === value) ?? harborRun;
}
