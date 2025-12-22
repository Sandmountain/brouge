export interface GameState {
  coins: number;
  lives: number;
  level: number;
  score: number;
  talents: string[];
}

export interface Talent {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export type BrickType = 'default' | 'metal' | 'unbreakable' | 'tnt' | 'fuse-horizontal' | 'fuse-left-up' | 'fuse-right-up' | 'fuse-left-down' | 'fuse-right-down' | 'fuse-vertical' | 'gold' | 'boost' | 'portal' | 'chaos';

export interface BrickData {
  x: number; // Pixel position (calculated from grid)
  y: number; // Pixel position (calculated from grid)
  col?: number; // Grid column (for reliable positioning) - optional for backwards compatibility
  row?: number; // Grid row (for reliable positioning) - optional for backwards compatibility
  health: number;
  maxHealth: number;
  color: number;
  dropChance: number;
  coinValue: number;
  type: BrickType;
  id?: string; // For fuse bricks to identify connections
  isHalfSize?: boolean; // If true, brick takes up half the width of a grid cell
  halfSizeAlign?: 'left' | 'right'; // Alignment for half-size blocks (default: 'left')
}

export interface LevelData {
  name: string;
  width: number;
  height: number;
  bricks: BrickData[];
  backgroundColor?: number;
  brickWidth?: number; // Brick dimensions used in editor
  brickHeight?: number;
  padding?: number; // Padding between bricks
}

