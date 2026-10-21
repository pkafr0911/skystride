/** Stable IDs keep saved selections independent of display names. */
export const CHARACTERS = {
  courier: {
    label: "Rooftop Courier",
    description: "Teal jacket, goggles, and orange trail shoes.",
    palette: [
      0xc58c68, 0x238c88, 0xf07838, 0x18232d, 0x344957, 0xeee0c4, 0x9de5e5,
    ],
    accessories: true,
    arm: 5,
    shoe: 2,
    sole: 5,
    hands: [3, 3],
    panels: 4,
  },
  climber: {
    label: "Rooftop Climber",
    description:
      "Mustard hooded top, olive shorts, wrist wraps, and burgundy shoes.",
    palette: [
      0xc99169, 0xc79532, 0x743d42, 0x242a30, 0x666e48, 0xeee2ca, 0x3b302a,
    ],
    accessories: false,
    arm: 0,
    shoe: 2,
    sole: 3,
    hands: [0, 0],
    panels: 2,
  },
  hopbot: {
    label: "Hop Bot",
    description:
      "Ivory robot with orange armor, articulated joints, and a glowing face display.",
    palette: [
      0xe9dfc9, 0xe9dfc9, 0xd95c3b, 0x222d37, 0x39434b, 0xdef9ff, 0x121d2b,
    ],
    accessories: false,
    arm: 3,
    shoe: 0,
    sole: 3,
    hands: [3, 3],
    panels: 2,
  },
  silhouette: {
    label: "Original Silhouette",
    description: "The original dark athletic runner with amber soles.",
    palette: [0x111821, 0x121a24, 0xf3ae65, 0x0b1119, 0x1c2735],
    accessories: false,
    arm: 0,
    shoe: 3,
    sole: 2,
    hands: [4, 0],
    panels: 0,
  },
} as const;
export type CharacterId = keyof typeof CHARACTERS;
export const DEFAULT_CHARACTER: CharacterId = "climber";
export const CHARACTER_STORAGE = "skystride.character";
export function readCharacter(value: string | null): CharacterId {
  return value && Object.prototype.hasOwnProperty.call(CHARACTERS, value)
    ? (value as CharacterId)
    : DEFAULT_CHARACTER;
}
