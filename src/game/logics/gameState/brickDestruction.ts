import { Scene } from "phaser";
import { BrickData, GameState } from "../../types";

type BrickSprite = Phaser.GameObjects.DOMElement & { brickData?: BrickData };

interface BrickDestructionContext {
  scene: Scene;
  gameState: GameState;
  coinMultiplier: number;
  dropChanceBonus: number;
  breakableBrickCount: { value: number };
  shieldArc: Phaser.Physics.Arcade.Sprite;
  updateUI: () => void;
  levelComplete: () => void;
  dropItem: (x: number, y: number) => void;
}

/**
 * Destroy a brick and handle rewards/win condition
 */
export function destroyBrick(
  brick: BrickSprite,
  brickData: BrickData,
  context: BrickDestructionContext
): void {
  const {
    scene,
    gameState,
    coinMultiplier,
    dropChanceBonus,
    breakableBrickCount,
    updateUI,
    levelComplete,
    dropItem,
  } = context;

  // Award coins
  const coinsEarned = Math.floor(brickData.coinValue * coinMultiplier);
  gameState.coins += coinsEarned;
  gameState.score += brickData.coinValue * 10;

  // Check for drop
  const dropChance = Math.min(brickData.dropChance + dropChanceBonus, 1);
  if (Math.random() < dropChance) {
    dropItem(brick.x, brick.y);
  }

  brick.destroy();
  updateUI();

  // Check if level is complete (only count required breakable bricks)
  if (brickData.type !== "unbreakable" && brickData.isRequired !== false) {
    breakableBrickCount.value--;
    if (breakableBrickCount.value <= 0) {
      levelComplete();
    }
  }
}

