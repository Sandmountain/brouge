import { BrickData } from "../../../game/types";
import { createBrickData } from "./brickCreation";

/**
 * Check if two colors are similar within a threshold
 * @param color1 RGB color as number (0xRRGGBB)
 * @param color2 RGB color as number (0xRRGGBB)
 * @param threshold Maximum difference per channel (default: 10)
 * @returns true if colors are similar
 */
export function areColorsSimilar(
  color1: number,
  color2: number,
  threshold: number = 10
): boolean {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;

  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;

  return (
    Math.abs(r1 - r2) <= threshold &&
    Math.abs(g1 - g2) <= threshold &&
    Math.abs(b1 - b2) <= threshold
  );
}

/**
 * Convert RGBA pixel data to RGB color number
 * @param r Red channel (0-255)
 * @param g Green channel (0-255)
 * @param b Blue channel (0-255)
 * @param a Alpha channel (0-255) - used to determine if pixel is transparent
 * @returns RGB color as number (0xRRGGBB) or null if transparent
 */
function rgbaToColor(r: number, g: number, b: number, a: number): number | null {
  // Treat pixels with alpha < 128 as transparent (skip them)
  if (a < 128) {
    return null;
  }
  return (r << 16) | (g << 8) | b;
}

/**
 * Load and process an image file
 * @param imageFile The image file to process
 * @returns Promise that resolves to an Image element
 */
function loadImage(imageFile: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Scale image to fit within grid dimensions while maintaining aspect ratio
 * @param image The image element
 * @param gridWidth Grid width in cells
 * @param gridHeight Grid height in cells
 * @param paddingCells Number of cells to use as padding on each side (default: 1)
 * @returns Object with scaled dimensions and offsets for centering (in cell coordinates)
 */
function calculateImageScale(
  image: HTMLImageElement,
  gridWidth: number,
  gridHeight: number,
  paddingCells: number = 1
): {
  scaledWidth: number;
  scaledHeight: number;
  offsetX: number;
  offsetY: number;
} {
  // Calculate available space after padding (at least 1 cell on each side)
  const availableWidth = Math.max(1, gridWidth - paddingCells * 2);
  const availableHeight = Math.max(1, gridHeight - paddingCells * 2);

  // Scale image to fit within available space while maintaining aspect ratio
  const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;

  // Center the image within the grid (in cell coordinates), accounting for padding
  const offsetX = (gridWidth - scaledWidth) / 2;
  const offsetY = (gridHeight - scaledHeight) / 2;

  return {
    scaledWidth,
    scaledHeight,
    offsetX,
    offsetY,
  };
}

/**
 * Sample pixel color from image at a specific position
 * @param imageData ImageData from canvas
 * @param x X coordinate in cell space (can be fractional)
 * @param y Y coordinate in cell space (can be fractional)
 * @param imageWidth Canvas width (grid width in cells)
 * @returns RGB color as number or null if transparent
 */
function samplePixel(
  imageData: ImageData,
  x: number,
  y: number,
  imageWidth: number
): number | null {
  // Round to nearest pixel (cell)
  const pixelX = Math.round(x);
  const pixelY = Math.round(y);

  // Clamp to canvas bounds
  const clampedX = Math.max(0, Math.min(pixelX, imageWidth - 1));
  const clampedY = Math.max(0, Math.min(pixelY, imageData.height - 1));

  const index = (clampedY * imageWidth + clampedX) * 4;
  const r = imageData.data[index];
  const g = imageData.data[index + 1];
  const b = imageData.data[index + 2];
  const a = imageData.data[index + 3];

  return rgbaToColor(r, g, b, a);
}

/**
 * Process an image file and convert it to bricks
 * @param imageFile The image file to process
 * @param gridWidth Grid width in cells
 * @param gridHeight Grid height in cells
 * @param brickWidth Brick width in pixels
 * @param brickHeight Brick height in pixels
 * @param padding Padding between bricks in pixels
 * @param imageScale Additional scale factor for the image (default: 1.0)
 * @returns Promise that resolves to an array of BrickData
 */
export async function processImageToBricks(
  imageFile: File,
  gridWidth: number,
  gridHeight: number,
  brickWidth: number,
  brickHeight: number,
  padding: number,
  imageScale: number = 1.0
): Promise<BrickData[]> {
  // Load the image
  const image = await loadImage(imageFile);

  // Calculate scaling to fit grid while maintaining aspect ratio
  // Use at least 1 cell of padding on all sides
  const { scaledWidth, scaledHeight, offsetX, offsetY } = calculateImageScale(
    image,
    gridWidth,
    gridHeight,
    1 // 1 cell padding on each side
  );

  // Apply additional image scale factor
  const finalScaledWidth = scaledWidth * imageScale;
  const finalScaledHeight = scaledHeight * imageScale;
  const finalOffsetX = (gridWidth - finalScaledWidth) / 2;
  const finalOffsetY = (gridHeight - finalScaledHeight) / 2;

  // Create a canvas large enough to properly render the scaled image
  // Use a reasonable size (at least 4x the grid size for quality)
  const canvasScale = 4;
  const canvasWidth = gridWidth * canvasScale;
  const canvasHeight = gridHeight * canvasScale;
  
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Fill canvas with transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the image scaled to fit the grid while maintaining aspect ratio
  // Scale the destination coordinates by canvasScale to match the larger canvas
  ctx.drawImage(
    image,
    0, // Source X
    0, // Source Y
    image.width, // Source width (entire image)
    image.height, // Source height (entire image)
    finalOffsetX * canvasScale, // Destination X (centered, scaled)
    finalOffsetY * canvasScale, // Destination Y (centered, scaled)
    finalScaledWidth * canvasScale, // Destination width (scaled to fit)
    finalScaledHeight * canvasScale // Destination height (scaled to fit, maintains aspect ratio)
  );

  // Get image data for pixel sampling
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const bricks: BrickData[] = [];

  // Process each grid cell
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      // Sample left and right half of the cell
      // Convert grid coordinates to canvas coordinates (multiply by canvasScale)
      const cellCenterX = (col + 0.5) * canvasScale;
      const cellCenterY = (row + 0.5) * canvasScale;
      const leftHalfX = (col + 0.25) * canvasScale;
      const rightHalfX = (col + 0.75) * canvasScale;

      const leftColor = samplePixel(
        imageData,
        leftHalfX,
        cellCenterY,
        canvas.width
      );
      const rightColor = samplePixel(
        imageData,
        rightHalfX,
        cellCenterY,
        canvas.width
      );

      // If both halves are transparent, skip this cell
      if (leftColor === null && rightColor === null) {
        continue;
      }

      // If only one half has a color, create a half block
      if (leftColor === null && rightColor !== null) {
        // Only right half has color
        const brick = createBrickData(
          col,
          row,
          "default",
          rightColor,
          brickWidth,
          brickHeight,
          padding,
          undefined,
          true,
          "right"
        );
        bricks.push(brick);
      } else if (leftColor !== null && rightColor === null) {
        // Only left half has color
        const brick = createBrickData(
          col,
          row,
          "default",
          leftColor,
          brickWidth,
          brickHeight,
          padding,
          undefined,
          true,
          "left"
        );
        bricks.push(brick);
      } else if (leftColor !== null && rightColor !== null) {
        // Both halves have color
        if (areColorsSimilar(leftColor, rightColor, 10)) {
          // Colors are similar, create a full block with left color
          const brick = createBrickData(
            col,
            row,
            "default",
            leftColor,
            brickWidth,
            brickHeight,
            padding,
            undefined,
            false,
            "left"
          );
          bricks.push(brick);
        } else {
          // Colors are different, create two half blocks
          const leftBrick = createBrickData(
            col,
            row,
            "default",
            leftColor,
            brickWidth,
            brickHeight,
            padding,
            undefined,
            true,
            "left"
          );
          const rightBrick = createBrickData(
            col,
            row,
            "default",
            rightColor,
            brickWidth,
            brickHeight,
            padding,
            undefined,
            true,
            "right"
          );
          bricks.push(leftBrick, rightBrick);
        }
      }
    }
  }

  return bricks;
}

