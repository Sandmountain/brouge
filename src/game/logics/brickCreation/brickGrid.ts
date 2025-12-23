import { Scene } from "phaser";
import { BrickData, LevelData } from "../../types";
import { createBrickFromData } from "./brickFactory";

type BrickSprite = Phaser.GameObjects.DOMElement & { brickData?: BrickData };

interface BrickGridContext {
  scene: Scene;
  levelData: LevelData;
  bricks: Phaser.Physics.Arcade.StaticGroup;
  breakableBrickCount: { value: number };
  shieldArc: Phaser.Physics.Arcade.Sprite;
  ball: Phaser.Physics.Arcade.Sprite;
}

/**
 * Calculate brick dimensions to fit screen
 */
function calculateBrickDimensions(
  gridWidth: number,
  gridHeight: number,
  availableWidth: number,
  availableHeight: number
): {
  brickWidth: number;
  brickHeight: number;
  padding: number;
  levelPixelWidth: number;
  levelPixelHeight: number;
} {
  const paddingRatio = 0.055; // padding is ~5.5% of brick width

  // Solve for brickWidth: gridWidth * brickWidth + (gridWidth - 1) * padding = availableWidth
  const brickWidth =
    availableWidth / (gridWidth + (gridWidth - 1) * paddingRatio);
  const padding = brickWidth * paddingRatio;
  const brickHeight = brickWidth / 3; // Maintain 3:1 aspect ratio

  const levelPixelWidth = (gridWidth - 1) * (brickWidth + padding) + brickWidth;
  const levelPixelHeight =
    (gridHeight - 1) * (brickHeight + padding) + brickHeight;

  return {
    brickWidth,
    brickHeight,
    padding,
    levelPixelWidth,
    levelPixelHeight,
  };
}

/**
 * Recalculate brick position from grid coordinates
 */
function recalculateBrickPosition(
  brickData: BrickData,
  col: number,
  row: number,
  brickWidth: number,
  brickHeight: number,
  padding: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  let gridX: number;
  let gridY: number;

  if (brickData.isHalfSize && brickData.halfSizeAlign) {
    // For half-size blocks, calculate position with gap matching grid padding
    const halfBlockGap = padding;
    const halfWidth = (brickWidth - halfBlockGap) / 2;
    const cellLeft = col * (brickWidth + padding);
    const cellCenter = cellLeft + brickWidth / 2;

    if (brickData.halfSizeAlign === "left") {
      gridX = cellLeft + halfWidth / 2; // Center of left half block
    } else {
      gridX = cellCenter + halfBlockGap / 2 + halfWidth / 2; // Center of right half block
    }
    gridY = row * (brickHeight + padding) + brickHeight / 2;
  } else {
    // Full-size blocks - center of cell
    gridX = col * (brickWidth + padding) + brickWidth / 2;
    gridY = row * (brickHeight + padding) + brickHeight / 2;
  }

  return {
    x: gridX + offsetX,
    y: gridY + offsetY,
  };
}

/**
 * Create bricks from level data
 */
export function createBricksFromLevel(context: BrickGridContext): number {
  const { scene, levelData, bricks, breakableBrickCount, shieldArc, ball } =
    context;

  const gridWidth = levelData.width;
  const gridHeight = levelData.height;

  // Calculate available screen space
  const availableWidth = scene.scale.width;
  const availableHeight = scene.scale.height - 100; // Leave space for paddle

  const { brickWidth, brickHeight, padding, levelPixelWidth } =
    calculateBrickDimensions(
      gridWidth,
      gridHeight,
      availableWidth,
      availableHeight
    );

  const offsetX = 0;
  const offsetY = 0;

  // Process each brick in level data
  levelData.bricks.forEach((brickData, brickIndex) => {
    let col: number;
    let row: number;

    // Get grid coordinates
    if (brickData.col !== undefined && brickData.row !== undefined) {
      col = brickData.col;
      row = brickData.row;
    } else {
      // Migrate old bricks: calculate grid coordinates from pixel positions
      col = Math.round((brickData.x - brickWidth / 2) / (brickWidth + padding));
      row = Math.round(
        (brickData.y - brickHeight / 2) / (brickHeight + padding)
      );

      // Clamp to valid grid bounds
      col = Math.max(0, Math.min(gridWidth - 1, col));
      row = Math.max(0, Math.min(gridHeight - 1, row));
    }

    // Recalculate position from grid coordinates
    const { x, y } = recalculateBrickPosition(
      brickData,
      col,
      row,
      brickWidth,
      brickHeight,
      padding,
      offsetX,
      offsetY
    );

    const adjustedBrickData = {
      ...brickData,
      x,
      y,
      col,
      row,
    };

    // Calculate actual width for half-size blocks
    const actualBrickWidth = adjustedBrickData.isHalfSize
      ? (brickWidth - padding) / 2
      : brickWidth;

    const brick = createBrickFromData(
      scene,
      adjustedBrickData,
      actualBrickWidth,
      brickHeight
    );

    if (brick && brick.brickData) {
      bricks.add(brick);
      // Set physics body size
      if (brick.body) {
        (brick.body as Phaser.Physics.Arcade.Body).setSize(
          actualBrickWidth,
          brickHeight
        );
      }
      // Count required breakable bricks
      if (
        brick.brickData.type !== "unbreakable" &&
        brick.brickData.isRequired !== false
      ) {
        breakableBrickCount.value++;
      }
    }
  });

  // Center shield and ball with level
  const levelCenterX = offsetX + levelPixelWidth / 2;
  shieldArc.setX(levelCenterX);
  ball.setX(levelCenterX);

  return breakableBrickCount.value;
}

/**
 * Create default level bricks
 */
export function createDefaultLevel(context: BrickGridContext): number {
  const { scene, bricks, breakableBrickCount } = context;

  const rows = 8;
  const cols = 10;
  const availableWidth = scene.scale.width;
  const paddingRatio = 0.055;
  const brickWidth = availableWidth / (cols + (cols - 1) * paddingRatio);
  const padding = brickWidth * paddingRatio;
  const brickHeight = brickWidth / 3;

  const offsetX = 0;
  const offsetY = 0;

  const colors = [
    0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xffa07a, 0x98d8c8, 0xf7dc6f, 0xbb8fce,
    0x85c1e2,
  ];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * (brickWidth + padding) + brickWidth / 2;
      const y = offsetY + row * (brickHeight + padding) + brickHeight / 2;

      const color = colors[row % colors.length];

      const brickData: BrickData = {
        x,
        y,
        col,
        row,
        health: Math.floor(row / 2) + 1,
        maxHealth: Math.floor(row / 2) + 1,
        color: color,
        dropChance: 0.15 + row * 0.05,
        coinValue: (row + 1) * 2,
        type: "default",
      };

      const brick = createBrickFromData(
        scene,
        brickData,
        brickWidth,
        brickHeight
      );
      if (brick && brick.brickData) {
        bricks.add(brick);
        if (
          brick.brickData.type !== "unbreakable" &&
          brick.brickData.isRequired !== false
        ) {
          breakableBrickCount.value++;
        }
      }
    }
  }

  return breakableBrickCount.value;
}
