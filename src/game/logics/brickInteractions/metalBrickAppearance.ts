import { BrickData } from "../../types";

type BrickSprite = Phaser.GameObjects.DOMElement & { brickData?: BrickData };

/**
 * Update metal brick visual appearance based on health
 */
export function updateMetalBrickAppearance(
  brick: BrickSprite,
  brickData: BrickData
): void {
  const healthPercent = brickData.health / brickData.maxHealth;
  const stages = 4;
  const currentStage = Math.floor((1 - healthPercent) * stages);

  // Metal colors from light to dark (matching CSS)
  const metalColors = ["#a0a0a0", "#888888", "#666666", "#444444", "#222222"];
  const color = metalColors[Math.min(currentStage, metalColors.length - 1)];

  // Update the DOM element's background gradient
  const element = brick.node as HTMLElement;
  if (element) {
    element.style.background = `linear-gradient(135deg, ${color} 0%, ${color} 100%)`;
  }
}

