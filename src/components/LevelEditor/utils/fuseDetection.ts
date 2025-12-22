import { BrickType } from "../../../game/types";

export interface PathPoint {
  col: number;
  row: number;
}

export const detectFuseType = (
  current: PathPoint,
  prev: PathPoint | null,
  next: PathPoint | null
): BrickType => {
  if (!prev && !next) {
    // Single cell - use horizontal as default
    return "fuse-horizontal";
  }

  // Determine direction changes
  const hasPrev = prev !== null;
  const hasNext = next !== null;

  let colChange = 0;
  let rowChange = 0;

  if (hasPrev) {
    colChange = current.col - prev.col;
    rowChange = current.row - prev.row;
  }

  let nextColChange = 0;
  let nextRowChange = 0;

  if (hasNext) {
    nextColChange = next.col - current.col;
    nextRowChange = next.row - current.row;
  }

  // Determine fuse type based on direction changes
  let fuseType: BrickType;

  if (hasPrev && hasNext) {
    // Middle segment - check for direction change
    const prevIsHorizontal = colChange !== 0 && rowChange === 0;
    const nextIsHorizontal = nextColChange !== 0 && nextRowChange === 0;
    const prevIsVertical = colChange === 0 && rowChange !== 0;
    const nextIsVertical = nextColChange === 0 && nextRowChange !== 0;

    if (prevIsHorizontal && nextIsVertical) {
      // Horizontal to vertical - corner fuse
      if (colChange > 0 && nextRowChange < 0) {
        fuseType = "fuse-left-up";
      } else if (colChange > 0 && nextRowChange > 0) {
        fuseType = "fuse-left-down";
      } else if (colChange < 0 && nextRowChange < 0) {
        fuseType = "fuse-right-up";
      } else {
        fuseType = "fuse-right-down";
      }
    } else if (prevIsVertical && nextIsHorizontal) {
      // Vertical to horizontal - corner fuse
      if (rowChange < 0 && nextColChange > 0) {
        fuseType = "fuse-right-down";
      } else if (rowChange < 0 && nextColChange < 0) {
        fuseType = "fuse-left-down";
      } else if (rowChange > 0 && nextColChange > 0) {
        fuseType = "fuse-right-up";
      } else {
        fuseType = "fuse-left-up";
      }
    } else if (prevIsHorizontal && nextIsHorizontal) {
      fuseType = "fuse-horizontal";
    } else if (prevIsVertical && nextIsVertical) {
      fuseType = "fuse-vertical";
    } else {
      fuseType = "fuse-horizontal";
    }
  } else if (hasPrev) {
    // Last segment
    if (colChange !== 0 && rowChange === 0) {
      fuseType = "fuse-horizontal";
    } else if (colChange === 0 && rowChange !== 0) {
      fuseType = "fuse-vertical";
    } else {
      fuseType = "fuse-horizontal";
    }
  } else if (hasNext) {
    // First segment
    if (nextColChange !== 0 && nextRowChange === 0) {
      fuseType = "fuse-horizontal";
    } else if (nextColChange === 0 && nextRowChange !== 0) {
      fuseType = "fuse-vertical";
    } else {
      fuseType = "fuse-horizontal";
    }
  } else {
    fuseType = "fuse-horizontal";
  }

  return fuseType;
};

export const isFuseType = (type: BrickType): boolean => {
  return (
    type === "fuse-horizontal" ||
    type === "fuse-vertical" ||
    type === "fuse-left-up" ||
    type === "fuse-right-up" ||
    type === "fuse-left-down" ||
    type === "fuse-right-down"
  );
};

