import { BrickType } from "../../game/types";

export const BRICK_TYPES: {
  type: BrickType;
  name: string;
  color: number;
  description: string;
}[] = [
  {
    type: "default",
    name: "Default",
    color: 0xff6b6b,
    description: "1 hit, any color",
  },
  {
    type: "metal",
    name: "Metal",
    color: 0x888888,
    description: "5 hits, darkens each hit",
  },
  {
    type: "unbreakable",
    name: "Unbreakable",
    color: 0x333333,
    description: "Cannot be destroyed",
  },
  {
    type: "tnt",
    name: "TNT",
    color: 0xff0000,
    description: "Explodes area around it",
  },
  {
    type: "fuse-horizontal",
    name: "Fuse",
    color: 0x00ff00,
    description: "Drag to place fuses - automatically detects direction",
  },
  {
    type: "gold",
    name: "Gold",
    color: 0xffd700,
    description: "3 hits, high coin value",
  },
  {
    type: "boost",
    name: "Boost",
    color: 0x8b4513,
    description: "Random buff/debuff",
  },
  {
    type: "portal",
    name: "Portal",
    color: 0x9b59b6,
    description: "Teleports to paired portal",
  },
  {
    type: "chaos",
    name: "Chaos",
    color: 0x4a2c1a,
    description: "Randomizes ball direction",
  },
  {
    type: "invisible",
    name: "Invisible",
    color: 0xc8c8ff,
    description: "2 hits, invisible until hit",
  },
];

// Generate a 12x12 color palette (144 colors)
// First row: white to black gradient
// Remaining rows: 6 gradient steps horizontally, then another 6 gradient steps with different color families
function generateColorPalette(): number[] {
  const colors: number[] = [];
  const rows = 12;
  const cols = 12;
  const gradientSteps = 6;
  
  // Different color families for the second gradient
  const colorFamilies = [
    0,    // Red
    30,   // Orange
    60,   // Yellow
    120,  // Green
    180,  // Cyan
    240,  // Blue
    270,  // Purple
    300,  // Magenta
    330,  // Pink
    15,   // Red-orange
    45,   // Yellow-orange
    90,   // Yellow-green
  ];
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let red: number, green: number, blue: number;
      
      if (row === 0) {
        // First row: white to black gradient
        const grayValue = Math.round(255 * (1 - col / (cols - 1)));
        red = grayValue;
        green = grayValue;
        blue = grayValue;
      } else {
        // Remaining rows: colored gradients
        let hue: number, saturation: number, lightness: number;
        const adjustedRow = row - 1; // Adjust for grayscale row
        
        if (col < gradientSteps) {
          // First 6 columns: gradient based on saturation with base hue
          const baseHue = (adjustedRow * 360) / (rows - 1);
          hue = baseHue;
          saturation = 60 + (col * 8); // 60% to 100%
          lightness = 40 + (adjustedRow * 3); // 40% to 73%
        } else {
          // Remaining 6 columns: second gradient with different color family and different lightness
          const gradientIndex = col - gradientSteps;
          const colorFamilyHue = colorFamilies[adjustedRow % colorFamilies.length];
          
          // Use different saturation and lightness ranges to make them distinct
          saturation = 70 + (gradientIndex * 6); // 70% to 100% (higher saturation)
          hue = colorFamilyHue;
          lightness = 35 + (adjustedRow * 3.5); // 35% to 70% (slightly darker, different range)
        }
        
        // Convert HSL to RGB
        const h = hue / 360;
        const s = saturation / 100;
        const l = lightness / 100;
        
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
        const m = l - c / 2;
        
        let r = 0, g = 0, b = 0;
        
        if (h * 6 < 1) {
          r = c; g = x; b = 0;
        } else if (h * 6 < 2) {
          r = x; g = c; b = 0;
        } else if (h * 6 < 3) {
          r = 0; g = c; b = x;
        } else if (h * 6 < 4) {
          r = 0; g = x; b = c;
        } else if (h * 6 < 5) {
          r = x; g = 0; b = c;
        } else {
          r = c; g = 0; b = x;
        }
        
        red = Math.round((r + m) * 255);
        green = Math.round((g + m) * 255);
        blue = Math.round((b + m) * 255);
      }
      
      const color = (red << 16) | (green << 8) | blue;
      colors.push(color);
    }
  }
  
  return colors;
}

export const DEFAULT_COLORS = generateColorPalette();

export const STORAGE_KEY = "brickBreaker_levelEditor_workingCopy";

