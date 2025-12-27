import { Scene } from "phaser";
import { BrickData, LevelData } from "../../types";
import { createBrickDOM } from "../../../bricks/createBrickDOM";

type BrickSprite = Phaser.GameObjects.DOMElement & { brickData?: BrickData };

/**
 * Create a brick from brick data
 */
export function createBrickFromData(
  scene: Scene,
  brickData: BrickData,
  brickWidth: number,
  brickHeight: number
): BrickSprite | null {
  // Create DOM element using the same function as React components
  const element = createBrickDOM(brickData, brickWidth, brickHeight);

  // Create Phaser DOM element
  const domElement = scene.add.dom(brickData.x, brickData.y, element);
  domElement.setOrigin(0.5, 0.5);
  // Set depth for bricks to ensure they render below UI elements
  domElement.setDepth(100);

  // Explicitly set position to ensure it's correct
  domElement.setPosition(brickData.x, brickData.y);

  // Make it a physics body
  const physicsBrick = scene.physics.add.existing(
    domElement,
    true
  ) as BrickSprite;
  physicsBrick.brickData = brickData;

  // Set size for physics
  (physicsBrick.body as Phaser.Physics.Arcade.Body).setSize(
    brickWidth,
    brickHeight
  );

  return physicsBrick;
}
