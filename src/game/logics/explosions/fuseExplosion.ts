import { Scene } from "phaser";
import { BrickData } from "../../types";
import { isFuseType } from "../utils/brickTypeUtils";

type BrickSprite = Phaser.GameObjects.DOMElement & { brickData?: BrickData };

interface FuseExplosionContext {
  scene: Scene;
  bricks: Phaser.Physics.Arcade.StaticGroup;
  time: Phaser.Time.Clock;
  destroyBrick: (brick: BrickSprite, brickData: BrickData) => void;
  damageNeighbors: (
    brick: BrickSprite,
    brickData: BrickData,
    gridMap: Map<string, BrickSprite>
  ) => void;
}

/**
 * Build a grid map from bricks for efficient lookup
 */
function buildGridMap(
  bricks: Phaser.Physics.Arcade.StaticGroup
): Map<string, BrickSprite> {
  const gridMap = new Map<string, BrickSprite>();
  bricks.children.entries.forEach((b) => {
    const brickSprite = b as BrickSprite;
    if (
      brickSprite.brickData &&
      brickSprite.brickData.col !== undefined &&
      brickSprite.brickData.row !== undefined
    ) {
      const key = `${brickSprite.brickData.col},${brickSprite.brickData.row}`;
      gridMap.set(key, brickSprite);
    }
  });
  return gridMap;
}

/**
 * Find all connected fuse bricks using flood-fill
 */
function findConnectedFuses(
  startCol: number,
  startRow: number,
  gridMap: Map<string, BrickSprite>
): BrickSprite[] {
  const visited = new Set<string>();
  const fuseBricks: BrickSprite[] = [];
  const queue: Array<{ col: number; row: number }> = [
    { col: startCol, row: startRow },
  ];

  const directions = [
    { col: 0, row: -1 }, // up
    { col: 0, row: 1 }, // down
    { col: -1, row: 0 }, // left
    { col: 1, row: 0 }, // right
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.col},${current.row}`;

    if (visited.has(key)) continue;
    visited.add(key);

    const currentBrick = gridMap.get(key);
    if (
      currentBrick &&
      currentBrick.brickData &&
      isFuseType(currentBrick.brickData.type)
    ) {
      fuseBricks.push(currentBrick);

      // Check neighbors for more fuse bricks
      directions.forEach((dir) => {
        const neighborCol = current.col + dir.col;
        const neighborRow = current.row + dir.row;
        const neighborKey = `${neighborCol},${neighborRow}`;

        if (!visited.has(neighborKey)) {
          queue.push({ col: neighborCol, row: neighborRow });
        }
      });
    }
  }

  return fuseBricks;
}

/**
 * Handle fuse explosion with chain reaction
 */
export function explodeFuse(
  brick: Phaser.GameObjects.DOMElement,
  brickData: BrickData,
  context: FuseExplosionContext
): void {
  const { scene, bricks, time, destroyBrick, damageNeighbors } = context;

  const brickElement = brick as BrickSprite;
  if (!brickElement.brickData) return;

  // Add burning class to the initial fuse brick
  const element = brickElement.node as HTMLElement;
  if (element) {
    element.classList.add("burning");
  }

  // Create explosion effect - orange/yellow for fuse
  const explosion = scene.add.circle(brick.x, brick.y, 60, 0xff8800, 0.6);
  scene.tweens.add({
    targets: explosion,
    alpha: 0,
    scale: 1.5,
    duration: 200,
    ease: "Power2",
    onComplete: () => explosion.destroy(),
  });

  // Create spark particles
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const spark = scene.add.circle(brick.x, brick.y, 3, 0xffaa00, 1);
    scene.tweens.add({
      targets: spark,
      x: brick.x + Math.cos(angle) * 60 * 0.8,
      y: brick.y + Math.sin(angle) * 60 * 0.8,
      alpha: 0,
      scale: 0,
      duration: 150,
      ease: "Power2",
      onComplete: () => spark.destroy(),
    });
  }

  // Need grid coordinates to find connected fuse bricks and neighbors
  if (brickData.col !== undefined && brickData.row !== undefined) {
    const gridMap = buildGridMap(bricks);
    const fuseBricks = findConnectedFuses(
      brickData.col,
      brickData.row,
      gridMap
    );

    // Cascade explosion of connected fuse bricks with delays
    fuseBricks.forEach((fuseBrick, index) => {
      const delay = index * 100; // 100ms delay between each explosion

      // Add burning class immediately when fuse is triggered
      const fuseElement = fuseBrick.node as HTMLElement;
      if (fuseElement) {
        fuseElement.classList.add("burning");
      }

      time.delayedCall(delay, () => {
        if (fuseBrick.active && fuseBrick.brickData) {
          // Apply damage to 4 cardinal neighbors of this fuse brick
          damageNeighbors(fuseBrick, fuseBrick.brickData, gridMap);

          // Create explosion effect for this fuse brick
          const explosion = scene.add.circle(
            fuseBrick.x,
            fuseBrick.y,
            60,
            0xff8800,
            0.6
          );
          scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 1.5,
            duration: 200,
            ease: "Power2",
            onComplete: () => explosion.destroy(),
          });

          // Destroy this fuse brick
          destroyBrick(fuseBrick, fuseBrick.brickData);
        }
      });
    });

    // Apply damage to 4 cardinal neighbors of the initial fuse brick
    damageNeighbors(brickElement, brickData, gridMap);
  }

  // Destroy this fuse brick
  destroyBrick(brickElement, brickData);
}

