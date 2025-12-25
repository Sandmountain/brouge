import { Scene } from "phaser";
import { BrickData, LevelData } from "../../types";
import { generateShapeBricks } from "./shapeGenerator";

type BrickSprite = Phaser.GameObjects.DOMElement & { brickData?: BrickData };

interface EndlessModeContext {
  scene: Scene;
  bricks: Phaser.Physics.Arcade.StaticGroup;
  breakableBrickCount: { value: number };
  level: number;
  brickWidth: number;
  brickHeight: number;
  padding: number;
  createBrickFromData: (
    scene: Scene,
    brickData: BrickData,
    brickWidth: number,
    brickHeight: number
  ) => BrickSprite | null;
}

const GRID_WIDTH = 16;
const GRID_HEIGHT = 16;

export class EndlessModeManager {
  private context: EndlessModeContext;
  private bricksHitThisShot: boolean = false;
  private lastPaddleHitTime: number = 0;
  private currentLevel: number = 1;

  constructor(context: EndlessModeContext) {
    this.context = context;
  }

  /**
   * Initialize endless mode with first shape
   */
  initialize(): void {
    this.currentLevel = 1;
    this.bricksHitThisShot = false;
    this.generateNewShape();
  }

  /**
   * Generate a new shape and create bricks
   */
  generateNewShape(): void {
    const { scene, bricks, breakableBrickCount, brickWidth, brickHeight, padding, createBrickFromData } = this.context;

    // Clear existing bricks
    bricks.clear(true, true);
    breakableBrickCount.value = 0;

    // Generate new shape bricks
    const brickDataArray = generateShapeBricks(this.currentLevel, brickWidth, brickHeight, padding);

    // Create bricks from data
    brickDataArray.forEach((brickData) => {
      const actualBrickWidth = brickData.isHalfSize
        ? (brickWidth - padding) / 2
        : brickWidth;

      const brick = createBrickFromData(scene, brickData, actualBrickWidth, brickHeight);

      if (brick && brick.brickData) {
        bricks.add(brick);
        if (brick.body) {
          (brick.body as Phaser.Physics.Arcade.Body).setSize(actualBrickWidth, brickHeight);
        }
        if (
          brick.brickData.type !== "unbreakable" &&
          brick.brickData.isRequired !== false
        ) {
          breakableBrickCount.value++;
        }
      }
    });
  }

  /**
   * Mark that a brick was hit
   */
  onBrickHit(): void {
    this.bricksHitThisShot = true;
  }

  /**
   * Check if we should move blocks down and handle it
   * Returns the number of bricks lost (that reached bottom)
   */
  checkAndMoveBlocksDown(paddleHitTime: number, ballMissed: boolean): number {
    const shouldMove = (!this.bricksHitThisShot && paddleHitTime > this.lastPaddleHitTime) || ballMissed;

    if (shouldMove) {
      // Count bricks that will be lost before moving
      const lostBricks = this.getBricksAtBottomCount();
      this.moveAllBlocksDown();
      this.bricksHitThisShot = false;
      this.lastPaddleHitTime = paddleHitTime;
      return lostBricks;
    }

    return 0;
  }

  /**
   * Move all blocks down by one row
   */
  private moveAllBlocksDown(): void {
    const { bricks, brickWidth, brickHeight, createBrickFromData, scene } = this.context;
    const padding = this.context.padding;

    // Get all current bricks
    const currentBricks: Array<{ sprite: BrickSprite; data: BrickData }> = [];
    bricks.children.entries.forEach((b) => {
      const brickSprite = b as BrickSprite;
      if (brickSprite.brickData) {
        currentBricks.push({
          sprite: brickSprite,
          data: { ...brickSprite.brickData },
        });
      }
    });

    // Clear existing bricks
    bricks.clear(true, true);
    this.context.breakableBrickCount.value = 0;

    // Move each brick down and recreate
    currentBricks.forEach(({ data }) => {
      // Increment row
      const newRow = (data.row || 0) + 1;

      // Check if brick has reached bottom (row >= 16)
      if (newRow >= GRID_HEIGHT) {
        // Don't recreate this brick - it's been lost
        return;
      }

      // Recalculate position
      let x: number;
      if (data.isHalfSize && data.halfSizeAlign) {
        const halfBlockGap = padding;
        const halfWidth = (brickWidth - halfBlockGap) / 2;
        const cellLeft = (data.col || 0) * (brickWidth + padding);
        const cellCenter = cellLeft + brickWidth / 2;

        if (data.halfSizeAlign === "left") {
          x = cellLeft + halfWidth / 2;
        } else {
          x = cellCenter + halfBlockGap / 2 + halfWidth / 2;
        }
      } else {
        x = (data.col || 0) * (brickWidth + padding) + brickWidth / 2;
      }

      const y = newRow * (brickHeight + padding) + brickHeight / 2;

      const newBrickData: BrickData = {
        ...data,
        x,
        y,
        row: newRow,
      };

      // Recreate brick at new position
      const actualBrickWidth = newBrickData.isHalfSize
        ? (brickWidth - padding) / 2
        : brickWidth;

      const brick = createBrickFromData(scene, newBrickData, actualBrickWidth, brickHeight);

      if (brick && brick.brickData) {
        bricks.add(brick);
        if (brick.body) {
          (brick.body as Phaser.Physics.Arcade.Body).setSize(actualBrickWidth, brickHeight);
        }
        if (
          brick.brickData.type !== "unbreakable" &&
          brick.brickData.isRequired !== false
        ) {
          this.context.breakableBrickCount.value++;
        }
      }
    });

    // Add new row at the top (random blocks)
    this.addNewRowAtTop();
  }

  /**
   * Add a new row of random blocks at the top
   */
  private addNewRowAtTop(): void {
    const { scene, bricks, brickWidth, brickHeight, padding, createBrickFromData } = this.context;
    const row = 0; // Top row

    // Add 3-6 random blocks in the top row
    const blockCount = Math.floor(Math.random() * 4) + 3;
    const positions = new Set<number>();

    while (positions.size < blockCount) {
      const col = Math.floor(Math.random() * GRID_WIDTH);
      positions.add(col);
    }

    positions.forEach((col) => {
      // Randomly decide if it's a half block or full block
      const isHalfSize = Math.random() < 0.3;
      const halfSizeAlign = isHalfSize ? (Math.random() < 0.5 ? "left" : "right") : undefined;

      // Calculate position
      let x: number;
      if (isHalfSize) {
        const halfBlockGap = padding;
        const halfWidth = (brickWidth - halfBlockGap) / 2;
        const cellLeft = col * (brickWidth + padding);
        const cellCenter = cellLeft + brickWidth / 2;

        if (halfSizeAlign === "left") {
          x = cellLeft + halfWidth / 2;
        } else {
          x = cellCenter + halfBlockGap / 2 + halfWidth / 2;
        }
      } else {
        x = col * (brickWidth + padding) + brickWidth / 2;
      }

      const y = row * (brickHeight + padding) + brickHeight / 2;

      // Random brick type
      const brickTypes: Array<"default" | "metal" | "gold"> = ["default", "metal", "gold"];
      const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xffa07a, 0x98d8c8, 0xf7dc6f];
      const brickType = brickTypes[Math.floor(Math.random() * Math.min(this.currentLevel, brickTypes.length))];
      const color = colors[Math.floor(Math.random() * colors.length)];

      let health = 1;
      if (brickType === "metal") {
        health = 3 + Math.floor(this.currentLevel / 3);
      } else if (brickType === "gold") {
        health = 2 + Math.floor(this.currentLevel / 2);
      }

      const brickData: BrickData = {
        x,
        y,
        col,
        row,
        health,
        maxHealth: health,
        color,
        dropChance: 0.1 + this.currentLevel * 0.02,
        coinValue: (this.currentLevel + 1) * 2,
        type: brickType,
        isHalfSize,
        halfSizeAlign,
      };

      const actualBrickWidth = brickData.isHalfSize
        ? (brickWidth - padding) / 2
        : brickWidth;

      const brick = createBrickFromData(scene, brickData, actualBrickWidth, brickHeight);

      if (brick && brick.brickData) {
        bricks.add(brick);
        if (brick.body) {
          (brick.body as Phaser.Physics.Arcade.Body).setSize(actualBrickWidth, brickHeight);
        }
        if (
          brick.brickData.type !== "unbreakable" &&
          brick.brickData.isRequired !== false
        ) {
          this.context.breakableBrickCount.value++;
        }
      }
    });
  }

  /**
   * Check if any bricks have reached the bottom (row >= 16)
   * Returns the number of bricks that have been lost
   */
  checkBricksAtBottom(): number {
    // This is called after moveAllBlocksDown, which already removes bricks at row >= 16
    // So we just need to check if any bricks exist at row >= 16 (shouldn't happen, but safety check)
    let lostBricks = 0;
    this.context.bricks.children.entries.forEach((b) => {
      const brickSprite = b as BrickSprite;
      if (brickSprite.brickData && brickSprite.brickData.row !== undefined) {
        if (brickSprite.brickData.row >= GRID_HEIGHT) {
          lostBricks++;
        }
      }
    });
    return lostBricks;
  }

  /**
   * Get count of bricks that would be lost if moved down (before moving)
   */
  getBricksAtBottomCount(): number {
    let count = 0;
    this.context.bricks.children.entries.forEach((b) => {
      const brickSprite = b as BrickSprite;
      if (brickSprite.brickData && brickSprite.brickData.row !== undefined) {
        // Check if moving down would put it at row >= 16
        if (brickSprite.brickData.row >= GRID_HEIGHT - 1) {
          count++;
        }
      }
    });
    return count;
  }

  /**
   * Check if all breakable bricks are destroyed
   */
  areAllBricksDestroyed(): boolean {
    return this.context.breakableBrickCount.value === 0;
  }

  /**
   * Increment level and generate new shape
   */
  nextLevel(): void {
    this.currentLevel++;
    this.generateNewShape();
  }

  /**
   * Reset hit tracking for new shot
   */
  resetHitTracking(): void {
    this.bricksHitThisShot = false;
  }
}

