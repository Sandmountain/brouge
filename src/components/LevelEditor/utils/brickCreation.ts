import { BrickData, BrickType, LevelData } from "../../../game/types";
import { BRICK_TYPES } from "../constants";
import { calculatePositionFromGrid } from "./position";
import { generatePortalPairIds } from "./portalPairing";

export interface PathPoint {
  col: number;
  row: number;
}

export const getBrickHealth = (type: BrickType): number => {
  switch (type) {
    case "default":
      return 1;
    case "metal":
      return 5;
    case "gold":
      return 3;
    case "boost":
    case "portal":
      return 1;
    case "unbreakable":
      return 999;
    default:
      return 1;
  }
};

export const getBrickColor = (
  type: BrickType,
  selectedColor: number
): number => {
  if (type === "default") {
    return selectedColor;
  }
  return BRICK_TYPES.find((t) => t.type === type)?.color || selectedColor;
};

export const createBrickData = (
  col: number,
  row: number,
  type: BrickType,
  selectedColor: number,
  refWidth: number,
  refHeight: number,
  refPadding: number,
  portalId?: string,
  isHalfSize?: boolean,
  halfSizeAlign: 'left' | 'right' = 'left'
): BrickData => {
  // For half-size blocks, adjust the x position based on alignment
  let x: number;
  let y: number;
  
  if (isHalfSize) {
    // For half-size blocks, calculate width with gap matching grid padding
    // Gap between half blocks should match the spacing between grid cells
    const halfBlockGap = refPadding; // Use grid padding to match spacing between cells
    const halfWidth = (refWidth - halfBlockGap) / 2;
    const cellLeft = col * (refWidth + refPadding);
    const cellCenter = cellLeft + refWidth / 2;
    
    // Adjust x position based on alignment
    // Left half: center of left half block
    // Right half: center of right half block (with small gap in between)
    if (halfSizeAlign === 'left') {
      x = cellLeft + halfWidth / 2; // Center of left half block
    } else {
      x = cellCenter + halfBlockGap / 2 + halfWidth / 2; // Center of right half block
    }
    
    y = row * (refHeight + refPadding) + refHeight / 2;
  } else {
    const pos = calculatePositionFromGrid(col, row, refWidth, refHeight, refPadding);
    x = pos.x;
    y = pos.y;
  }

  const health = getBrickHealth(type);
  const color = getBrickColor(type, selectedColor);

  return {
    x,
    y,
    col,
    row,
    health,
    maxHealth: health,
    color,
    dropChance: 0.15,
    coinValue: type === "gold" ? 10 : (row + 1) * 2,
    type,
    id: type === "portal" ? portalId : undefined,
    isHalfSize,
    halfSizeAlign: isHalfSize ? halfSizeAlign : undefined,
  };
};

export const createBricksFromPath = (
  path: PathPoint[],
  brickType: BrickType,
  selectedColor: number,
  levelData: LevelData,
  brickWidth: number,
  brickHeight: number,
  padding: number,
  isHalfSize?: boolean,
  halfSizeAlign: 'left' | 'right' = 'left'
): BrickData[] => {
  const refWidth = levelData.brickWidth || brickWidth;
  const refHeight = levelData.brickHeight || brickHeight;
  const refPadding = levelData.padding || padding;

  // Filter out positions that are outside the grid bounds
  const validPath = path.filter(
    ({ col, row }) =>
      col >= 0 &&
      col < levelData.width &&
      row >= 0 &&
      row < levelData.height
  );

  // Remove duplicates from path (same col/row/halfSlot)
  const uniquePath = validPath.filter(
    (point, index, self) => {
      const pointWithHalfSlot = point as PathPoint & { halfSlot?: "left" | "right" };
      return index ===
        self.findIndex((p) => {
          const pWithHalfSlot = p as PathPoint & { halfSlot?: "left" | "right" };
          return (
            p.col === pointWithHalfSlot.col &&
            p.row === pointWithHalfSlot.row &&
            (!isHalfSize || pWithHalfSlot.halfSlot === pointWithHalfSlot.halfSlot)
          );
        });
    }
  );

  // Handle portal pairing logic
  const portalsInPath = brickType === "portal" ? uniquePath.length : 0;
  let portalPairIds: string[] = [];

  if (brickType === "portal" && portalsInPath > 0) {
    portalPairIds = generatePortalPairIds(portalsInPath, levelData.bricks);

    // Validate that portalPairIds array matches uniquePath length
    if (portalPairIds.length !== uniquePath.length) {
      console.error("[LevelEditor] Portal ID count mismatch:", {
        uniquePathLength: uniquePath.length,
        portalPairIdsLength: portalPairIds.length,
      });
      // Fix the mismatch by extending or truncating
      while (portalPairIds.length < uniquePath.length) {
        const isFirstInPair = portalPairIds.length % 2 === 0;
        if (isFirstInPair) {
          const newPairId = `portal_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          portalPairIds.push(newPairId);
        } else {
          portalPairIds.push(portalPairIds[portalPairIds.length - 1]);
        }
      }
      portalPairIds = portalPairIds.slice(0, uniquePath.length);
    }
  }

  const newBricks: BrickData[] = uniquePath
    .map((point, index) => {
      const { col, row, halfSlot } = point as PathPoint & { halfSlot?: "left" | "right" };
      // Double-check bounds
      if (
        col < 0 ||
        col >= levelData.width ||
        row < 0 ||
        row >= levelData.height
      ) {
        return null;
      }

      // Use the halfSlot from path if available, otherwise use the parameter
      const align = isHalfSize && halfSlot ? halfSlot : halfSizeAlign;

      // Ensure all required fields are valid
      if (
        isNaN(col) ||
        isNaN(row) ||
        col === undefined ||
        row === undefined
      ) {
        console.error("[LevelEditor] Invalid brick data:", {
          col,
          row,
          brickType,
        });
        return null;
      }

      const portalId =
        brickType === "portal" && portalPairIds[index]
          ? portalPairIds[index]
          : undefined;

      return createBrickData(
        col,
        row,
        brickType,
        selectedColor,
        refWidth,
        refHeight,
        refPadding,
        portalId,
        isHalfSize,
        align
      );
    })
    .filter((b): b is BrickData => b !== null);

  return newBricks;
};

