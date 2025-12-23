import { useState, useEffect, useCallback } from "react";
import { BrickType, BrickData, LevelData } from "../../../game/types";
import { detectFuseType, isFuseType, PathPoint } from "../utils/fuseDetection";
import { createBricksFromPath, createBrickData } from "../utils/brickCreation";

interface DragState {
  isDragging: boolean;
  brickType: BrickType;
  startCol: number;
  startRow: number;
  lastCol: number;
  lastRow: number;
  path: Array<PathPoint & { halfSlot?: "left" | "right" }>;
  halfSlot?: "left" | "right";
}

export const useDragToPlace = (
  levelData: LevelData,
  brickWidth: number,
  brickHeight: number,
  padding: number,
  selectedColor: number,
  selectedBrickType: BrickType,
  isFuseMode: boolean,
  brushMode: "paint" | "erase" | "select",
  onBricksPlaced: (bricks: BrickData[]) => void,
  isHalfSize?: boolean,
  halfSizeAlign: "left" | "right" = "left"
) => {
  const [dragState, setDragState] = useState<DragState | null>(null);

  const handleMouseDown = useCallback(
    (
      col: number,
      row: number,
      brick: BrickData | null,
      halfSlot?: "left" | "right"
    ) => {
      if (
        brushMode === "paint" &&
        selectedBrickType !== "boost" &&
        selectedBrickType !== "portal" &&
        !brick
      ) {
        const brickTypeToPlace = isFuseMode
          ? "fuse-horizontal"
          : selectedBrickType;
        setDragState({
          isDragging: true,
          brickType: brickTypeToPlace,
          startCol: col,
          startRow: row,
          lastCol: col,
          lastRow: row,
          path: [{ col, row, halfSlot }],
          halfSlot: isHalfSize ? halfSlot || "left" : undefined,
        });
      }
    },
    [brushMode, selectedBrickType, isFuseMode, isHalfSize]
  );

  const handleMouseEnter = useCallback(
    (col: number, row: number, halfSlot?: "left" | "right") => {
      if (
        dragState?.isDragging &&
        brushMode === "paint" &&
        selectedBrickType !== "boost" &&
        selectedBrickType !== "portal" &&
        col >= 0 &&
        col < levelData.width &&
        row >= 0 &&
        row < levelData.height
      ) {
        setDragState((prev) => {
          if (!prev) return null;
          const newPath = [...prev.path];
          const lastPoint = newPath[newPath.length - 1];
          // Use the halfSlot from dragState if not provided, or use the provided one
          const currentHalfSlot = isHalfSize
            ? halfSlot || prev.halfSlot || "left"
            : undefined;
          // Only add if it's a different position/half and not already in path
          const isDifferent =
            lastPoint.col !== col ||
            lastPoint.row !== row ||
            (isHalfSize && lastPoint.halfSlot !== currentHalfSlot);
          const alreadyInPath = newPath.some(
            (p) =>
              p.col === col &&
              p.row === row &&
              (!isHalfSize || p.halfSlot === currentHalfSlot)
          );
          if (isDifferent && !alreadyInPath) {
            newPath.push({ col, row, halfSlot: currentHalfSlot });
          }
          return {
            ...prev,
            lastCol: col,
            lastRow: row,
            path: newPath,
            halfSlot: currentHalfSlot,
          };
        });
      }
    },
    [
      dragState,
      brushMode,
      selectedBrickType,
      levelData.width,
      levelData.height,
      isHalfSize,
    ]
  );

  useEffect(() => {
    const handleMouseUp = () => {
      if (dragState?.isDragging) {
        const { path, brickType } = dragState;

        if (path.length === 0) {
          setDragState(null);
          return;
        }

        const refWidth = levelData.brickWidth || brickWidth;
        const refHeight = levelData.brickHeight || brickHeight;
        const refPadding = levelData.padding || padding;

        // For fuse types, use complex logic to determine the correct fuse type
        if (isFuseType(brickType)) {
          const fuseBricks: Array<{
            col: number;
            row: number;
            type: BrickType;
          }> = [];

          for (let i = 0; i < path.length; i++) {
            const current = path[i];
            const prev = i > 0 ? path[i - 1] : null;
            const next = i < path.length - 1 ? path[i + 1] : null;

            const fuseType = detectFuseType(current, prev, next);
            fuseBricks.push({ ...current, type: fuseType });
          }

          const newBricks: BrickData[] = fuseBricks.map(
            ({ col, row, type }, index) => {
              // Use the halfSlot from the path if available
              const pathPoint = path[index];
              const align =
                isHalfSize && pathPoint?.halfSlot
                  ? pathPoint.halfSlot
                  : halfSizeAlign;
              return createBrickData(
                col,
                row,
                type,
                0x00ff00, // Fuse color
                refWidth,
                refHeight,
                refPadding,
                undefined,
                isHalfSize,
                align
              );
            }
          );

          onBricksPlaced(newBricks);
          setDragState(null);
          return;
        }

        // For regular bricks, use the utility function
        const newBricks = createBricksFromPath(
          path,
          brickType,
          selectedColor,
          levelData,
          brickWidth,
          brickHeight,
          padding,
          isHalfSize,
          halfSizeAlign
        );

        onBricksPlaced(newBricks);
        setDragState(null);
      }
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragState,
    levelData,
    brickWidth,
    brickHeight,
    padding,
    selectedColor,
    onBricksPlaced,
    isHalfSize,
    halfSizeAlign,
  ]);

  return { dragState, handleMouseDown, handleMouseEnter };
};
