import { BrickData } from '../game/types';

export interface BrickComponentProps {
  brickData: BrickData;
  width?: number;
  height?: number;
  mode?: 'editor' | 'game';
  className?: string;
}

export interface BrickLogicContext {
  scene?: any; // Phaser Scene
  gameState?: any; // GameState
  onHit?: (brickData: BrickData) => void;
  onDestroy?: (brickData: BrickData) => void;
}

