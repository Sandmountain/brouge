import { Scene } from "phaser";
import { GameState } from "../../types";

interface BallMissedContext {
  scene: Scene;
  gameState: GameState;
  updateUI: () => void;
  resetBall: () => void;
}

/**
 * Handle ball falling off screen
 */
export function handleBallMissed(context: BallMissedContext): void {
  const { scene, gameState, updateUI, resetBall } = context;

  gameState.lives--;
  updateUI();

  if (gameState.lives <= 0) {
    // Game over
    scene.scene.start("GameOver", { gameState });
  } else {
    // Reset ball
    resetBall();
  }
}

