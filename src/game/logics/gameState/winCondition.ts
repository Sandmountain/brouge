import { EventBus } from "../../EventBus";
import { GameState } from "../../types";

interface WinConditionContext {
  scene: Phaser.Scene;
  gameState: GameState;
  isTestMode: boolean;
}

/**
 * Handle level completion
 */
export function levelComplete(context: WinConditionContext): void {
  const { scene, gameState, isTestMode } = context;

  // If in test mode, emit event to return to editor instead of going to talent selection
  if (isTestMode) {
    EventBus.emit("test-level-complete", { gameState });
    // Show completion message briefly, then return to editor
    scene.add
      .text(
        scene.scale.width / 2,
        scene.scale.height / 2,
        "Level Complete!\nReturning to editor...",
        {
          fontSize: "48px",
          color: "#4ecdc4",
          fontFamily: "Arial Black",
          align: "center",
          stroke: "#000000",
          strokeThickness: 4,
        }
      )
      .setOrigin(0.5)
      .setDepth(1000);

    scene.time.delayedCall(2000, () => {
      EventBus.emit("return-to-editor");
    });
    return;
  }

  // Increment level
  gameState.level++;

  // Save game state
  EventBus.emit("level-complete", gameState);

  // Go to talent selection
  scene.scene.start("TalentSelection", { gameState });
}

