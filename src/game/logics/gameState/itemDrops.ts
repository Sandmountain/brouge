import { Scene } from "phaser";
import { GameState } from "../../types";

interface ItemDropContext {
  scene: Scene;
  gameState: GameState;
  shieldArc: Phaser.Physics.Arcade.Sprite;
  deathZone: Phaser.GameObjects.Zone;
  physics: Phaser.Physics.Arcade.ArcadePhysics;
  updateUI: () => void;
}

/**
 * Create and handle item drops (coins)
 */
export function dropItem(
  x: number,
  y: number,
  context: ItemDropContext
): void {
  const { scene, gameState, shieldArc, deathZone, physics, updateUI } =
    context;

  // Create a coin that falls
  const coinGraphics = scene.add.graphics();
  coinGraphics.fillStyle(0xffd700);
  coinGraphics.fillCircle(15, 15, 15);
  coinGraphics.lineStyle(2, 0xffed4e);
  coinGraphics.strokeCircle(15, 15, 15);
  coinGraphics.generateTexture("coin", 30, 30);
  coinGraphics.destroy();

  const item = physics.add.sprite(x, y, "coin");
  item.setVelocityY(200);
  item.setCircle(15);

  // Collect when it hits the shield or bottom
  physics.add.overlap(item, shieldArc, () => {
    gameState.coins += 5; // Bonus coins from drops
    updateUI();
    item.destroy();
  });

  // Remove if it falls off screen
  physics.add.overlap(item, deathZone, () => {
    item.destroy();
  });
}

