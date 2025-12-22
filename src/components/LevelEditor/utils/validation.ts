import { BrickData } from "../../../game/types";

export const cleanBricks = (
  bricks: BrickData[],
  width: number,
  height: number
): BrickData[] => {
  return bricks.filter((brick) => {
    // Remove bricks with invalid positions
    if (
      brick.col === undefined ||
      brick.row === undefined ||
      brick.col < 0 ||
      brick.col >= width ||
      brick.row < 0 ||
      brick.row >= height ||
      isNaN(brick.x) ||
      isNaN(brick.y)
    ) {
      console.warn("[LevelEditor] Removing invalid brick:", brick);
      return false;
    }

    // Remove non-portal bricks that have portal IDs (ghost blocks)
    if (
      brick.type !== "portal" &&
      brick.id &&
      brick.id.startsWith("portal_")
    ) {
      console.warn(
        "[LevelEditor] Removing non-portal brick with portal ID:",
        brick
      );
      return false;
    }

    // Ensure portal bricks have valid IDs
    if (brick.type === "portal" && !brick.id) {
      console.warn("[LevelEditor] Portal brick missing ID, removing:", brick);
      return false;
    }

    return true;
  });
};

