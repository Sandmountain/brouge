import { Scene } from "phaser";
import { BrickData } from "../../types";
import { isFuseType } from "../utils/brickTypeUtils";

type BrickSprite = Phaser.GameObjects.DOMElement & { brickData?: BrickData };

interface DamageNeighborsContext {
  scene: Scene;
  updateMetalBrickAppearance: (
    brick: BrickSprite,
    brickData: BrickData
  ) => void;
  explodeFuse: (brick: BrickSprite, brickData: BrickData) => void;
  explodeTNT: (brick: BrickSprite, brickData: BrickData) => void;
  destroyBrick: (brick: BrickSprite, brickData: BrickData) => void;
}

/**
 * Apply damage to 4 cardinal neighbors of a brick
 */
export function damageNeighbors(
  _brick: BrickSprite,
  brickData: BrickData,
  gridMap: Map<string, BrickSprite>,
  context: DamageNeighborsContext
): void {
  const {
    scene,
    updateMetalBrickAppearance,
    explodeFuse,
    explodeTNT,
    destroyBrick,
  } = context;

  if (brickData.col === undefined || brickData.row === undefined) return;

  const directions = [
    { col: 0, row: -1 }, // up
    { col: 0, row: 1 }, // down
    { col: -1, row: 0 }, // left
    { col: 1, row: 0 }, // right
  ];

  directions.forEach((dir) => {
    const neighborCol = brickData.col! + dir.col;
    const neighborRow = brickData.row! + dir.row;
    const neighborKey = `${neighborCol},${neighborRow}`;

    const neighborBrick = gridMap.get(neighborKey);
    if (
      neighborBrick &&
      neighborBrick.brickData &&
      !isFuseType(neighborBrick.brickData.type) &&
      neighborBrick.brickData.type !== "unbreakable"
    ) {
      // Apply 1 damage to non-fuse neighbors
      neighborBrick.brickData.health -= 1;

      // Update visual appearance for metal bricks
      if (neighborBrick.brickData.type === "metal") {
        updateMetalBrickAppearance(neighborBrick, neighborBrick.brickData);
      }

      // Update health badge if it exists
      const element = neighborBrick.node as HTMLElement;
      if (element) {
        const healthBadge = element.querySelector(
          ".health-badge"
        ) as HTMLElement;
        if (
          healthBadge &&
          neighborBrick.brickData.health > 1 &&
          neighborBrick.brickData.health < 999
        ) {
          healthBadge.textContent = neighborBrick.brickData.health.toString();
        } else if (
          healthBadge &&
          (neighborBrick.brickData.health <= 1 ||
            neighborBrick.brickData.health >= 999)
        ) {
          healthBadge.remove();
        }
      }

      // Visual feedback
      scene.tweens.add({
        targets: neighborBrick,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
      });

      // Destroy brick if health is 0
      if (neighborBrick.brickData.health <= 0) {
        // Handle special brick types
        if (isFuseType(neighborBrick.brickData.type)) {
          explodeFuse(neighborBrick, neighborBrick.brickData);
        } else if (neighborBrick.brickData.type === "tnt") {
          explodeTNT(neighborBrick, neighborBrick.brickData);
        } else {
          destroyBrick(neighborBrick, neighborBrick.brickData);
        }
      }
    }
  });
}

