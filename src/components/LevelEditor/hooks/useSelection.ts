import { useState, useCallback, useEffect, useRef } from "react";
import { BrickData, LevelData } from "../../../game/types";

interface SelectionState {
  isSelecting: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const useSelection = (
  levelData: LevelData,
  brickWidth: number,
  brickHeight: number,
  padding: number,
  getBrickAtPosition: (
    col: number,
    row: number,
    halfSlot?: "left" | "right"
  ) => BrickData | null,
  gridContainerRef: React.RefObject<HTMLDivElement | null>
) => {
  const [selectionState, setSelectionState] = useState<SelectionState | null>(
    null
  );
  const [selectedBricks, setSelectedBricks] = useState<Set<BrickData>>(
    new Set()
  );
  const selectionRef = useRef<HTMLDivElement>(null);

  const getBricksInSelection = useCallback(
    (
      startCol: number,
      startRow: number,
      endCol: number,
      endRow: number
    ): BrickData[] => {
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);

      const bricks: BrickData[] = [];

      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          // Check for full-size blocks
          const fullBrick = getBrickAtPosition(col, row);
          if (fullBrick && !fullBrick.isHalfSize) {
            bricks.push(fullBrick);
          } else {
            // Check for half-size blocks
            const leftBrick = getBrickAtPosition(col, row, "left");
            const rightBrick = getBrickAtPosition(col, row, "right");
            if (leftBrick) bricks.push(leftBrick);
            if (rightBrick) bricks.push(rightBrick);
          }
        }
      }

      return bricks;
    },
    [getBrickAtPosition]
  );

  const pixelToGrid = useCallback(
    (x: number, y: number): { col: number; row: number } => {
      const col = Math.floor(x / (brickWidth + padding));
      const row = Math.floor(y / (brickHeight + padding));
      return {
        col: Math.max(0, Math.min(col, levelData.width - 1)),
        row: Math.max(0, Math.min(row, levelData.height - 1)),
      };
    },
    [brickWidth, brickHeight, padding, levelData.width, levelData.height]
  );

  const handleSelectionStart = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left mouse button

      const gridContainer = gridContainerRef.current;
      if (!gridContainer) return;

      // Get coordinates relative to the grid container (which has padding)
      const rect = gridContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Use exact pixel coordinates, no snapping
      setSelectionState({
        isSelecting: true,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      });
      setSelectedBricks(new Set()); // Clear previous selection
    },
    [gridContainerRef]
  );

  const handleSelectionMove = useCallback(
    (e: MouseEvent) => {
      if (!selectionState?.isSelecting) return;

      const gridContainer = gridContainerRef.current;
      if (!gridContainer) return;

      // Get coordinates relative to the grid container
      const rect = gridContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Use exact pixel coordinates, no snapping
      setSelectionState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentX: x,
          currentY: y,
        };
      });
    },
    [selectionState, gridContainerRef]
  );

  const handleSelectionEnd = useCallback(() => {
    if (!selectionState?.isSelecting) return;

    // Grid has 20px padding, so subtract that from coordinates
    const gridPadding = 20;
    const adjustedStartX = Math.max(0, selectionState.startX - gridPadding);
    const adjustedStartY = Math.max(0, selectionState.startY - gridPadding);
    const adjustedCurrentX = Math.max(0, selectionState.currentX - gridPadding);
    const adjustedCurrentY = Math.max(0, selectionState.currentY - gridPadding);

    // Convert pixel positions to grid coordinates
    const startCol = Math.floor(adjustedStartX / (brickWidth + padding));
    const startRow = Math.floor(adjustedStartY / (brickHeight + padding));
    const endCol = Math.floor(adjustedCurrentX / (brickWidth + padding));
    const endRow = Math.floor(adjustedCurrentY / (brickHeight + padding));

    const bricks = getBricksInSelection(
      startCol,
      startRow,
      endCol,
      endRow
    );

    setSelectedBricks(new Set(bricks));
    setSelectionState(null);
  }, [selectionState, brickWidth, brickHeight, padding, getBricksInSelection]);

  useEffect(() => {
    if (selectionState?.isSelecting) {
      window.addEventListener("mousemove", handleSelectionMove);
      window.addEventListener("mouseup", handleSelectionEnd);
      return () => {
        window.removeEventListener("mousemove", handleSelectionMove);
        window.removeEventListener("mouseup", handleSelectionEnd);
      };
    }
  }, [selectionState, handleSelectionMove, handleSelectionEnd]);

  const clearSelection = useCallback(() => {
    setSelectedBricks(new Set());
    setSelectionState(null);
  }, []);

  return {
    selectionState,
    selectedBricks,
    setSelectedBricks,
    selectionRef,
    handleSelectionStart,
    clearSelection,
  };
};

