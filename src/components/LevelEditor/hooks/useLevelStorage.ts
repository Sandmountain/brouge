import { useState, useEffect } from "react";
import { LevelData } from "../../../game/types";
import { loadFromStorage, saveToStorage } from "../utils/storage";
import { cleanBricks } from "../utils/validation";

const DEFAULT_LEVEL: LevelData = {
  name: "New Level",
  width: 10,
  height: 8,
  bricks: [],
  backgroundColor: 0x1a1a2e,
  brickWidth: 90,
  brickHeight: 30,
  padding: 5,
};

export const useLevelStorage = (
  brickWidth: number,
  brickHeight: number,
  padding: number
) => {
  const [levelData, setLevelData] = useState<LevelData>(() => {
    const stored = loadFromStorage();
    const initialData = stored || DEFAULT_LEVEL;

    // Clean up any invalid bricks on load
    if (stored) {
      const cleanedBricks = cleanBricks(
        initialData.bricks,
        initialData.width,
        initialData.height
      );
      if (cleanedBricks.length !== initialData.bricks.length) {
        initialData.bricks = cleanedBricks;
      }
    }

    return initialData;
  });

  // Auto-save to localStorage whenever levelData or brick dimensions change
  useEffect(() => {
    // Clean bricks before saving to prevent ghost blocks
    const cleanedBricks = cleanBricks(
      levelData.bricks,
      levelData.width,
      levelData.height
    );

    // If bricks were cleaned, update state first (this will trigger this effect again, but with clean data)
    if (cleanedBricks.length !== levelData.bricks.length) {
      setLevelData((prev) => ({
        ...prev,
        bricks: cleanedBricks,
      }));
      return; // Exit early, will save on next render with cleaned data
    }

    // Ensure brick dimensions are always saved
    const dataToSave = {
      ...levelData,
      brickWidth: brickWidth,
      brickHeight: brickHeight,
      padding: padding,
    };
    saveToStorage(dataToSave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelData, brickWidth, brickHeight, padding]);

  return { levelData, setLevelData };
};
