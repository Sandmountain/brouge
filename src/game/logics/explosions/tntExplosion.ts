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
 * Calculate half-block distance between TNT and target brick
 * Returns the minimum distance in half-blocks
 */
function calculateHalfBlockDistance(
  tntCol: number,
  tntRow: number,
  tntIsHalfSize: boolean,
  tntHalfAlign: "left" | "right" | undefined,
  targetCol: number,
  targetRow: number,
  targetIsHalfSize: boolean,
  targetHalfAlign: "left" | "right" | undefined
): number {
  // Get all TNT half-positions
  const tntHalves: Array<{ col: number; half: "left" | "right" }> = [];
  if (tntIsHalfSize && tntHalfAlign) {
    tntHalves.push({ col: tntCol, half: tntHalfAlign });
  } else {
    // Full-size TNT occupies both halves
    tntHalves.push({ col: tntCol, half: "left" });
    tntHalves.push({ col: tntCol, half: "right" });
  }

  // Get all target half-positions
  const targetHalves: Array<{ col: number; half: "left" | "right" }> = [];
  if (targetIsHalfSize && targetHalfAlign) {
    targetHalves.push({ col: targetCol, half: targetHalfAlign });
  } else {
    // Full-size target occupies both halves
    targetHalves.push({ col: targetCol, half: "left" });
    targetHalves.push({ col: targetCol, half: "right" });
  }

  // Calculate minimum distance between any TNT half and any target half
  let minDistance = Infinity;

  for (const tntHalf of tntHalves) {
    for (const targetHalf of targetHalves) {
      const colDiff = Math.abs(tntHalf.col - targetHalf.col);
      const rowDiff = Math.abs(tntRow - targetRow);

      // Calculate half-block distance
      let halfBlockDistance: number;

      if (colDiff === 0 && rowDiff === 0) {
        // Same cell
        if (tntHalf.half !== targetHalf.half) {
          halfBlockDistance = 0.5; // Adjacent halves in same cell
        } else {
          halfBlockDistance = 0; // Same half (shouldn't happen for TNT)
        }
      } else {
        // Different cells
        // Column distance in half-blocks
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
          colHalfDist = areTouching ? 0.5 : 1.5; // Touching or opposite sides
        } else {
          // Non-adjacent columns
          const baseColDist = (colDiff - 1) * 2; // Distance between cells (excluding the cells themselves)
          const areAdjacent =
            (tntHalf.col > targetHalf.col &&
              tntHalf.half === "left" &&
              targetHalf.half === "right") ||
            (tntHalf.col < targetHalf.col &&
              tntHalf.half === "right" &&
              targetHalf.half === "left");
          // If the outer halves are touching, subtract 1 half-block
          colHalfDist = areAdjacent ? baseColDist + 0.5 : baseColDist + 1.5;
        }

        // Row distance in half-block units (gap between rows = 1 half-block unit)
        // Same row = 0, adjacent row = 1, etc.
        const rowHalfDist = rowDiff;

        // Chebyshev distance in half-blocks
        halfBlockDistance = Math.max(colHalfDist, rowHalfDist);
      }

      minDistance = Math.min(minDistance, halfBlockDistance);
    }
  }

  return minDistance;
}

/**
 * Calculate damage based on half-block distance (ring)
 * Ring 1 (<= 1 half-block): 5 damage - directly adjacent half-blocks
 * Ring 2 (<= 2 half-blocks): 5 damage - one half-block away
 * Ring 3 (<= 3 half-blocks): 1 damage - two half-blocks away
 * Ring 4+: 0 damage - out of range
 */
function calculateDamageByHalfBlockDistance(distance: number): number {
  // Use ceiling to determine ring (anything <= 1 is ring 1, <= 2 is ring 2, etc.)
  const ring = Math.ceil(distance);

  if (ring === 1 || ring === 0) {
    return 5; // Ring 1: Directly adjacent half-blocks (distance <= 1)
  } else if (ring === 2) {
    return 5; // Ring 2: One half-block away (distance <= 2)
  } else if (ring === 3) {
    return 1; // Ring 3: Two half-blocks away (distance <= 3)
  }
  return 0; // Out of range
}

/**
 * Get all bricks with grid coordinates
 * Returns an array instead of a map to handle multiple half-blocks in the same cell
 */
function getAllBricksWithCoords(
  bricks: Phaser.Physics.Arcade.StaticGroup
): BrickSprite[] {
  const result: BrickSprite[] = [];
  bricks.children.entries.forEach((b) => {
    const brickSprite = b as BrickSprite;
    if (
      brickSprite.brickData &&
      brickSprite.brickData.col !== undefined &&
      brickSprite.brickData.row !== undefined
    ) {
      result.push(brickSprite);
    }
  });
  return result;
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

  const allBricks = getAllBricksWithCoords(bricks);
  const tntCol = brickData.col;
  const tntRow = brickData.row;
  const tntIsHalfSize = brickData.isHalfSize || false;
  const tntHalfAlign = brickData.halfSizeAlign;

  const bricksToDamage = new Map<BrickSprite, number>();

  const damageByRing = new Map<number, { count: number; types: string[] }>();

  allBricks.forEach((brickSprite) => {
    if (!brickSprite.brickData) return;
    if (brickSprite.brickData.type === "unbreakable") {
      return;
    }
    if (brickSprite === brick) {
      return;
    }

    const targetCol = brickSprite.brickData.col!;
    const targetRow = brickSprite.brickData.row!;
    const targetIsHalfSize = brickSprite.brickData.isHalfSize || false;
    const targetHalfAlign = brickSprite.brickData.halfSizeAlign;

    // Calculate half-block distance
    const halfBlockDistance = calculateHalfBlockDistance(
      tntCol,
      tntRow,
      tntIsHalfSize,
      tntHalfAlign,
      targetCol,
      targetRow,
      targetIsHalfSize,
      targetHalfAlign
    );

    // Calculate damage based on half-block distance (ring)
    const ring = Math.ceil(halfBlockDistance);
    const damage = calculateDamageByHalfBlockDistance(halfBlockDistance);

    if (damage > 0) {
      bricksToDamage.set(brickSprite, damage);

      // Track damage by ring for summary
      if (!damageByRing.has(ring)) {
        damageByRing.set(ring, { count: 0, types: [] });
      }
      const ringData = damageByRing.get(ring)!;
      ringData.count++;
      if (!ringData.types.includes(brickSprite.brickData.type)) {
        ringData.types.push(brickSprite.brickData.type);
      }
    }
  });

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
      brickSprite.brickData.health -= damage;

      if (brickSprite.brickData.health <= 0) {
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
