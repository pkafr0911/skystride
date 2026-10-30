import * as sunset from "./sunset-course";
import { harborGeometry } from "./harbor-course";

export type LevelId = "sunset-relay" | "harbor-run";
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
  tagline: string;
  description: string;
  finish: number;
  sectors: SectorDefinition[];
  atmosphere: "sunset" | "harbor";
};
export const sunsetRelay: LevelDefinition = {
  ...sunset,
  id: "sunset-relay",
  version: "sunset-relay-v41",
  name: "Sunset Relay",
  number: "01",
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
  version: "harbor-run-v1",
  name: "Harbor Run",
  number: "02",
  tagline: "Sea air. Steel nerves.",
  description:
    "Run the waterfront from freight warehouses to crane crossings and high port roofs. Open lines below; faster, technical routes above.",
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
export const levels: LevelDefinition[] = [sunsetRelay, harborRun];
export const LEVEL_STORAGE = "skystride.selected-level";
export function readLevel(value: string | null): LevelDefinition {
  return levels.find((level) => level.id === value) ?? sunsetRelay;
}
