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
  onBricksErased?: (path: Array<{ col: number; row: number; halfSlot?: "left" | "right" }>) => void,
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
      if (brushMode === "erase") {
        // Start drag erase - track path of bricks to erase
        setDragState({
          isDragging: true,
          brickType: "default", // Not used for erase, but required by type
          startCol: col,
          startRow: row,
          lastCol: col,
          lastRow: row,
          path: [{ col, row, halfSlot }],
          halfSlot: isHalfSize ? halfSlot || "left" : undefined,
        });
      } else if (
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
        (brushMode === "paint" || brushMode === "erase") &&
        (brushMode === "erase" ||
          (selectedBrickType !== "boost" && selectedBrickType !== "portal")) &&
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

        // Handle erase mode
        if (brushMode === "erase" && onBricksErased) {
          onBricksErased(path);
          setDragState(null);
          return;
        }

        // Only proceed with placing bricks if in paint mode
        if (brushMode !== "paint") {
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
            halfSlot?: "left" | "right";
          }> = [];

          for (let i = 0; i < path.length; i++) {
            const current = path[i];
            // Look ahead to find the next point that's in a different cell or different half
            let next: (PathPoint & { halfSlot?: "left" | "right" }) | null = null;
            for (let j = i + 1; j < path.length; j++) {
              const candidate = path[j];
              // Different cell, or same cell but different half
              if (candidate.col !== current.col || candidate.row !== current.row ||
                  (candidate.halfSlot && current.halfSlot && candidate.halfSlot !== current.halfSlot)) {
                next = candidate;
                break;
              }
            }
            
            // Look back to find the previous point that's in a different cell or different half
            let prev: (PathPoint & { halfSlot?: "left" | "right" }) | null = null;
            for (let j = i - 1; j >= 0; j--) {
              const candidate = path[j];
              // Different cell, or same cell but different half
              if (candidate.col !== current.col || candidate.row !== current.row ||
                  (candidate.halfSlot && current.halfSlot && candidate.halfSlot !== current.halfSlot)) {
                prev = candidate;
                break;
              }
            }

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
    brushMode,
    onBricksErased,
  ]);

  return { dragState, handleMouseDown, handleMouseEnter };
};
