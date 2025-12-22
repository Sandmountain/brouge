import { BrickType } from "../../game/types";

export const BRICK_TYPES: {
  type: BrickType;
  name: string;
  color: number;
  description: string;
}[] = [
  {
    type: "default",
    name: "Default",
    color: 0xff6b6b,
    description: "1 hit, any color",
  },
  {
    type: "metal",
    name: "Metal",
    color: 0x888888,
    description: "5 hits, darkens each hit",
  },
  {
    type: "unbreakable",
    name: "Unbreakable",
    color: 0x333333,
    description: "Cannot be destroyed",
  },
  {
    type: "tnt",
    name: "TNT",
    color: 0xff0000,
    description: "Explodes area around it",
  },
  {
    type: "fuse-horizontal",
    name: "Fuse",
    color: 0x00ff00,
    description: "Drag to place fuses - automatically detects direction",
  },
  {
    type: "gold",
    name: "Gold",
    color: 0xffd700,
    description: "3 hits, high coin value",
  },
  {
    type: "boost",
    name: "Boost",
    color: 0x8b4513,
    description: "Random buff/debuff",
  },
  {
    type: "portal",
    name: "Portal",
    color: 0x9b59b6,
    description: "Teleports to paired portal",
  },
  {
    type: "chaos",
    name: "Chaos",
    color: 0x4a2c1a,
    description: "Randomizes ball direction",
  },
];

export const DEFAULT_COLORS = [
  0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xffa07a, 0x98d8c8, 0xf7dc6f, 0xbb8fce,
  0x85c1e2, 0xff9ff3, 0x54a0ff, 0x5f27cd, 0x00d2d3, 0xff6348, 0xffa502,
  0xff3838, 0xff9ff3,
];

export const STORAGE_KEY = "brickBreaker_levelEditor_workingCopy";

