import { BrickData } from "../../types";

const GRID_WIDTH = 16;
const GRID_HEIGHT = 16;

export type ShapeType = "rectangle" | "ellipse" | "triangle" | "diamond" | "cross" | "random";

interface ShapeConfig {
  type: ShapeType;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  filled: boolean; // If false, only outline
}

/**
 * Generate a random shape configuration
 */
function generateRandomShape(): ShapeConfig {
  const shapes: ShapeType[] = ["rectangle", "ellipse", "triangle", "diamond", "cross"];
  const type = shapes[Math.floor(Math.random() * shapes.length)];
  
  // Random size (between 4-10 for width/height)
  const width = Math.floor(Math.random() * 7) + 4;
  const height = Math.floor(Math.random() * 7) + 4;
  
  // Center position (ensure shape fits in grid)
  const centerX = Math.floor(Math.random() * (GRID_WIDTH - width)) + Math.floor(width / 2);
  const centerY = Math.floor(Math.random() * (GRID_HEIGHT - height)) + Math.floor(height / 2);
  
  // Sometimes make it filled, sometimes outline
  const filled = Math.random() > 0.3;
  
  return { type, width, height, centerX, centerY, filled };
}

/**
 * Check if a point is inside a rectangle
 */
function isInRectangle(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  width: number,
  height: number
): boolean {
  const left = centerX - Math.floor(width / 2);
  const right = centerX + Math.floor(width / 2);
  const top = centerY - Math.floor(height / 2);
  const bottom = centerY + Math.floor(height / 2);
  
  return x >= left && x <= right && y >= top && y <= bottom;
}

/**
 * Check if a point is inside an ellipse
 */
function isInEllipse(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  width: number,
  height: number
): boolean {
  const a = width / 2;
  const b = height / 2;
  const dx = (x - centerX) / a;
  const dy = (y - centerY) / b;
  return dx * dx + dy * dy <= 1;
}

/**
 * Check if a point is inside a triangle
 */
function isInTriangle(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  width: number,
  height: number
): boolean {
  // Triangle pointing up
  const topX = centerX;
  const topY = centerY - Math.floor(height / 2);
  const bottomLeftX = centerX - Math.floor(width / 2);
  const bottomLeftY = centerY + Math.floor(height / 2);
  const bottomRightX = centerX + Math.floor(width / 2);
  const bottomRightY = centerY + Math.floor(height / 2);
  
  // Barycentric coordinates
  const v0x = bottomRightX - topX;
  const v0y = bottomRightY - topY;
  const v1x = bottomLeftX - topX;
  const v1y = bottomLeftY - topY;
  const v2x = x - topX;
  const v2y = y - topY;
  
  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;
  
  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
  
  return u >= 0 && v >= 0 && u + v <= 1;
}

/**
 * Check if a point is inside a diamond
 */
function isInDiamond(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  width: number,
  height: number
): boolean {
  const dx = Math.abs(x - centerX);
  const dy = Math.abs(y - centerY);
  return dx / (width / 2) + dy / (height / 2) <= 1;
}

/**
 * Check if a point is inside a cross
 */
function isInCross(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  width: number,
  height: number
): boolean {
  const armWidth = Math.max(1, Math.floor(width / 3));
  const armHeight = Math.max(1, Math.floor(height / 3));
  
  // Horizontal arm
  const inHorizontal = 
    Math.abs(y - centerY) <= armHeight &&
    Math.abs(x - centerX) <= Math.floor(width / 2);
  
  // Vertical arm
  const inVertical =
    Math.abs(x - centerX) <= armWidth &&
    Math.abs(y - centerY) <= Math.floor(height / 2);
  
  return inHorizontal || inVertical;
}

/**
 * Check if a point is on the border of a shape
 */
function isOnBorder(
  x: number,
  y: number,
  shape: ShapeConfig
): boolean {
  const { type, centerX, centerY, width, height } = shape;
  
  // Check if point is inside
  let inside = false;
  switch (type) {
    case "rectangle":
      inside = isInRectangle(x, y, centerX, centerY, width, height);
      break;
    case "ellipse":
      inside = isInEllipse(x, y, centerX, centerY, width, height);
      break;
    case "triangle":
      inside = isInTriangle(x, y, centerX, centerY, width, height);
      break;
    case "diamond":
      inside = isInDiamond(x, y, centerX, centerY, width, height);
      break;
    case "cross":
      inside = isInCross(x, y, centerX, centerY, width, height);
      break;
  }
  
  if (!inside) return false;
  
  // Check neighbors to see if we're on the border
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];
  
  for (const [nx, ny] of neighbors) {
    let neighborInside = false;
    switch (type) {
      case "rectangle":
        neighborInside = isInRectangle(nx, ny, centerX, centerY, width, height);
        break;
      case "ellipse":
        neighborInside = isInEllipse(nx, ny, centerX, centerY, width, height);
        break;
      case "triangle":
        neighborInside = isInTriangle(nx, ny, centerX, centerY, width, height);
        break;
      case "diamond":
        neighborInside = isInDiamond(nx, ny, centerX, centerY, width, height);
        break;
      case "cross":
        neighborInside = isInCross(nx, ny, centerX, centerY, width, height);
        break;
    }
    
    if (!neighborInside) {
      return true; // We have a neighbor outside, so we're on the border
    }
  }
  
  return false; // All neighbors are inside, so we're not on the border
}

/**
 * Generate bricks for a shape
 */
export function generateShapeBricks(
  level: number,
  brickWidth: number,
  brickHeight: number,
  padding: number
): BrickData[] {
  const shape = generateRandomShape();
  const bricks: BrickData[] = [];
  
  // Random brick type selection
  const brickTypes: Array<"default" | "metal" | "gold"> = ["default", "metal", "gold"];
  const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xffa07a, 0x98d8c8, 0xf7dc6f];
  
  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      let shouldPlace = false;
      
      // Check if this cell should have a brick
      if (shape.filled) {
        // Filled shape - check if inside
        switch (shape.type) {
          case "rectangle":
            shouldPlace = isInRectangle(col, row, shape.centerX, shape.centerY, shape.width, shape.height);
            break;
          case "ellipse":
            shouldPlace = isInEllipse(col, row, shape.centerX, shape.centerY, shape.width, shape.height);
            break;
          case "triangle":
            shouldPlace = isInTriangle(col, row, shape.centerX, shape.centerY, shape.width, shape.height);
            break;
          case "diamond":
            shouldPlace = isInDiamond(col, row, shape.centerX, shape.centerY, shape.width, shape.height);
            break;
          case "cross":
            shouldPlace = isInCross(col, row, shape.centerX, shape.centerY, shape.width, shape.height);
            break;
        }
      } else {
        // Outline only - check if on border
        shouldPlace = isOnBorder(col, row, shape);
      }
      
      if (shouldPlace) {
        // Randomly decide if it's a half block or full block (70% full, 30% half)
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
        
        // Select brick type and properties based on level
        const brickType = brickTypes[Math.floor(Math.random() * Math.min(level, brickTypes.length))];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        let health = 1;
        if (brickType === "metal") {
          health = 3 + Math.floor(level / 3);
        } else if (brickType === "gold") {
          health = 2 + Math.floor(level / 2);
        }
        
        const brickData: BrickData = {
          x,
          y,
          col,
          row,
          health,
          maxHealth: health,
          color,
          dropChance: 0.1 + level * 0.02,
          coinValue: (level + 1) * 2,
          type: brickType,
          isHalfSize,
          halfSizeAlign,
        };
        
        bricks.push(brickData);
      }
    }
  }
  
  return bricks;
}

