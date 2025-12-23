import { Scene } from "phaser";
import { BrickData } from "../../types";
import { isFuseType } from "../utils/brickTypeUtils";

type BrickSprite = Phaser.GameObjects.DOMElement & { brickData?: BrickData };

interface TNTExplosionContext {
  scene: Scene;
  bricks: Phaser.Physics.Arcade.StaticGroup;
  destroyBrick: (brick: BrickSprite, brickData: BrickData) => void;
  updateMetalBrickAppearance: (
    brick: BrickSprite,
    brickData: BrickData
  ) => void;
}

/**
 * Calculate half-block distance between two half-positions
 */
function calculateHalfBlockDistance(
  tntHalf: { col: number; half: "left" | "right" },
  targetHalf: { col: number; half: "left" | "right" },
  tntRow: number,
  targetRow: number
): number {
  const colDiff = Math.abs(tntHalf.col - targetHalf.col);
  const rowDiff = Math.abs(tntRow - targetRow);

  if (colDiff === 0 && rowDiff === 0) {
    // Same cell
    if (tntHalf.half !== targetHalf.half) {
      return 0.5; // Adjacent halves
    }
    return 0; // Same half (shouldn't happen)
  }

  // Calculate column distance in half-blocks
  let colHalfDist: number;
  if (colDiff === 0) {
    colHalfDist = 0;
  } else if (colDiff === 1) {
    // Adjacent columns
    const areTouching =
      (tntHalf.col > targetHalf.col &&
        tntHalf.half === "left" &&
        targetHalf.half === "right") ||
      (tntHalf.col < targetHalf.col &&
        tntHalf.half === "right" &&
        targetHalf.half === "left");

    if (areTouching) {
      colHalfDist = 0.5; // Touching halves
    } else {
      colHalfDist = 1.5; // Opposite sides
    }
  } else {
    // Non-adjacent columns
    const baseColDist = colDiff * 2;
    const areAdjacent =
      (tntHalf.col > targetHalf.col &&
        tntHalf.half === "left" &&
        targetHalf.half === "right") ||
      (tntHalf.col < targetHalf.col &&
        tntHalf.half === "right" &&
        targetHalf.half === "left");

    if (areAdjacent) {
      colHalfDist = baseColDist - 1;
    } else {
      colHalfDist = baseColDist;
    }
  }

  // Calculate row distance (each row = 2 half-blocks)
  const rowHalfDist = rowDiff * 2;

  // Manhattan distance
  return colHalfDist + rowHalfDist;
}

/**
 * Calculate damage based on half-block distance
 */
function calculateDamageByDistance(distance: number): number {
  if (distance <= 2.5) {
    return 5; // Ring 1: All 8 directly adjacent cells
  } else if (distance <= 4.5) {
    return 3; // Ring 2: One cell away
  } else if (distance <= 6.5) {
    return 1; // Ring 3: Two cells away
  }
  return 0;
}

/**
 * Get half-block positions for a brick
 */
function getHalfPositions(
  col: number,
  isHalfSize: boolean,
  halfAlign: "left" | "right"
): Array<{ col: number; half: "left" | "right" }> {
  if (isHalfSize) {
    return [{ col, half: halfAlign }];
  }
  return [
    { col, half: "left" },
    { col, half: "right" },
  ];
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
 * Handle TNT explosion with grid-based damage calculation
 */
export function explodeTNT(
  brick: Phaser.GameObjects.DOMElement,
  brickData: BrickData,
  context: TNTExplosionContext
): void {
  const { scene, bricks, destroyBrick, updateMetalBrickAppearance } = context;

  console.log("[TNT Explosion] Starting explosion at:", {
    col: brickData.col,
    row: brickData.row,
    isHalfSize: brickData.isHalfSize,
    halfSizeAlign: brickData.halfSizeAlign,
    position: { x: brick.x, y: brick.y },
  });

  if (brickData.col === undefined || brickData.row === undefined) {
    console.warn(
      "[TNT Explosion] TNT brick missing grid coordinates, using fallback pixel-based system"
    );
    // Fallback to pixel-based system
    const explosionRadius = 80;
    const explosionBricks: BrickSprite[] = [];

    bricks.children.entries.forEach((b) => {
      const brickSprite = b as BrickSprite;
      if (
        brickSprite.brickData &&
        brickSprite.brickData.type !== "unbreakable"
      ) {
        const dx = brick.x - brickSprite.x;
        const dy = brick.y - brickSprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= explosionRadius) {
          explosionBricks.push(brickSprite);
        }
      }
    });

    explosionBricks.forEach((b) => {
      if (b.brickData) {
        destroyBrick(b, b.brickData);
      }
    });
    destroyBrick(brick as BrickSprite, brickData);
    return;
  }

  const gridMap = buildGridMap(bricks);
  const tntCol = brickData.col;
  const tntRow = brickData.row;
  const tntIsHalfSize = brickData.isHalfSize || false;
  const tntHalfAlign = brickData.halfSizeAlign || "left";

  console.log("[TNT Explosion] TNT properties:", {
    tntCol,
    tntRow,
    tntIsHalfSize,
    tntHalfAlign,
  });

  const tntHalfPositions = getHalfPositions(tntCol, tntIsHalfSize, tntHalfAlign);
  const bricksToDamage = new Map<BrickSprite, number>();

  console.log("[TNT Explosion] Checking", gridMap.size, "bricks in grid");

  gridMap.forEach((brickSprite) => {
    if (!brickSprite.brickData) return;
    if (brickSprite.brickData.type === "unbreakable") {
      console.log("[TNT Explosion] Skipping unbreakable brick at:", {
        col: brickSprite.brickData.col,
        row: brickSprite.brickData.row,
      });
      return;
    }
    if (brickSprite === brick) {
      console.log("[TNT Explosion] Skipping TNT itself");
      return;
    }

    const targetCol = brickSprite.brickData.col!;
    const targetRow = brickSprite.brickData.row!;
    const targetIsHalfSize = brickSprite.brickData.isHalfSize || false;
    const targetHalfAlign = brickSprite.brickData.halfSizeAlign || "left";

    console.log("[TNT Explosion] Checking brick:", {
      type: brickSprite.brickData.type,
      col: targetCol,
      row: targetRow,
      isHalfSize: targetIsHalfSize,
      halfSizeAlign: targetHalfAlign,
      health: brickSprite.brickData.health,
    });

    const targetHalfPositions = getHalfPositions(
      targetCol,
      targetIsHalfSize,
      targetHalfAlign
    );

    // Calculate total damage for this brick
    let totalDamage = 0;

    for (const targetHalf of targetHalfPositions) {
      let minHalfDistance = Infinity;

      for (const tntHalf of tntHalfPositions) {
        const distance = calculateHalfBlockDistance(
          tntHalf,
          targetHalf,
          tntRow,
          targetRow
        );

        console.log("[TNT Explosion] Distance calculation detail:", {
          tntHalf: `${tntHalf.col},${tntHalf.half}`,
          targetHalf: `${targetHalf.col},${targetHalf.half}`,
          colDiff: Math.abs(tntHalf.col - targetHalf.col),
          rowDiff: Math.abs(tntRow - targetRow),
          totalDistance: distance,
        });

        minHalfDistance = Math.min(minHalfDistance, distance);
      }

      console.log("[TNT Explosion] Half distance calculation:", {
        targetHalf: targetHalf.half,
        minHalfDistance,
      });

      const halfDamage = calculateDamageByDistance(minHalfDistance);

      console.log("[TNT Explosion] Half damage:", {
        targetHalf: targetHalf.half,
        distance: minHalfDistance,
        damage: halfDamage,
      });

      totalDamage += halfDamage;
    }

    if (totalDamage > 0) {
      const currentDamage = bricksToDamage.get(brickSprite) || 0;
      const finalDamage = Math.max(currentDamage, totalDamage);
      bricksToDamage.set(brickSprite, finalDamage);
      console.log("[TNT Explosion] Brick will take damage:", {
        type: brickSprite.brickData.type,
        col: targetCol,
        row: targetRow,
        currentHealth: brickSprite.brickData.health,
        damage: finalDamage,
        newHealth: brickSprite.brickData.health - finalDamage,
      });
    } else {
      console.log("[TNT Explosion] Brick out of range:", {
        type: brickSprite.brickData.type,
        col: targetCol,
        row: targetRow,
      });
    }
  });

  console.log("[TNT Explosion] Total bricks to damage:", bricksToDamage.size);

  // Create explosion effect
  const explosion = scene.add.circle(brick.x, brick.y, 100, 0xff0000, 0.5);
  scene.tweens.add({
    targets: explosion,
    alpha: 0,
    scale: 2,
    duration: 300,
    onComplete: () => explosion.destroy(),
  });

  // Apply damage to all affected bricks
  bricksToDamage.forEach((damage, brickSprite) => {
    if (brickSprite.brickData) {
      const oldHealth = brickSprite.brickData.health;
      brickSprite.brickData.health -= damage;
      console.log("[TNT Explosion] Applying damage:", {
        type: brickSprite.brickData.type,
        col: brickSprite.brickData.col,
        row: brickSprite.brickData.row,
        oldHealth,
        damage,
        newHealth: brickSprite.brickData.health,
        willDestroy: brickSprite.brickData.health <= 0,
      });

      if (brickSprite.brickData.health <= 0) {
        console.log("[TNT Explosion] Destroying brick:", {
          type: brickSprite.brickData.type,
          col: brickSprite.brickData.col,
          row: brickSprite.brickData.row,
        });
        destroyBrick(brickSprite, brickSprite.brickData);
      } else {
        // Update visual appearance for metal bricks
        if (brickSprite.brickData.type === "metal") {
          updateMetalBrickAppearance(brickSprite, brickSprite.brickData);
        }
        // Update health badge
        const element = brickSprite.node as HTMLElement;
        if (element) {
          const healthBadge = element.querySelector(
            ".health-badge"
          ) as HTMLElement;
          if (
            healthBadge &&
            brickSprite.brickData.health > 1 &&
            brickSprite.brickData.health < 999
          ) {
            healthBadge.textContent = brickSprite.brickData.health.toString();
          } else if (
            healthBadge &&
            (brickSprite.brickData.health <= 1 ||
              brickSprite.brickData.health >= 999)
          ) {
            healthBadge.remove();
          }
        }
        // Visual feedback
        scene.tweens.add({
          targets: brickSprite,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 50,
          yoyo: true,
        });
      }
    }
  });

  // Destroy the TNT brick itself
  destroyBrick(brick as BrickSprite, brickData);
}

