import { LevelData } from "../../../game/types";
import { STORAGE_KEY } from "../constants";

export const loadFromStorage = (): LevelData | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as LevelData;
    }
  } catch {
    console.error("Failed to load from localStorage");
  }
  return null;
};

export const saveToStorage = (data: LevelData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
};

