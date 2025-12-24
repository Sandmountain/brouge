import { BrickData, BrickType, LevelData } from "../../../game/types";
import { Brick } from "../../../bricks/Brick";
import { isFuseType } from "../utils/fuseDetection";
import { BrushMode } from "./EditorToolbar";

interface EditorGridProps {
  levelData: LevelData;
  brickWidth: number;
  brickHeight: number;
  padding: number;
  getBrickAtPosition: (
    col: number,
    row: number,
    halfSlot?: "left" | "right"
  ) => BrickData | null;
  dragState: {
    isDragging: boolean;
    brickType: BrickType;
    path: Array<{ col: number; row: number; halfSlot?: "left" | "right" }>;
  } | null;
  isHalfSize: boolean;
  brushMode: "paint" | "erase" | "single-select" | "multi-select";
  selectedBricks: Set<BrickData>;
  selectedBrick: BrickData | null;
  selectionState: {
    isSelecting: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null;
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  onCellClick: (col: number, row: number, halfSlot?: "left" | "right") => void;
  onCellMouseDown: (
    e: React.MouseEvent,
    col: number,
    row: number,
    halfSlot?: "left" | "right"
  ) => void;
  onCellMouseEnter: (
    col: number,
    row: number,
    halfSlot?: "left" | "right"
  ) => void;
  onCellRightClick: (
    e: React.MouseEvent,
    col: number,
    row: number,
    halfSlot?: "left" | "right"
  ) => void;
  onSelectionStart?: (e: React.MouseEvent) => void;
  onWidthChange?: (width: number) => void;
  onHeightChange?: (height: number) => void;
  onBrushModeChange?: (mode: BrushMode) => void;
  onHalfSizeToggle?: (isHalfSize: boolean) => void;
  onSettingsClick?: () => void;
}

export function EditorGrid({
  levelData,
  brickWidth,
  brickHeight,
  padding,
  getBrickAtPosition,
  dragState,
  isHalfSize,
  brushMode,
  selectedBricks,
  selectedBrick,
  selectionState,
  gridContainerRef,
  onCellClick,
  onCellMouseDown,
  onCellMouseEnter,
  onCellRightClick,
  onSelectionStart,
}: EditorGridProps) {
  // Calculate half-size block width
  // Gap between half blocks should match the grid padding (spacing between cells)
  const halfBlockGap = padding; // Use grid padding to match spacing between cells
  const halfBrickWidth = (brickWidth - halfBlockGap) / 2;

  // Calculate the width of each half container div
  // Each half div should be 50% of the cell width
  const halfDivWidth = "50%";

  // Calculate selection rectangle bounds (pixel coordinates, constrained to grid)
  // Grid has 20px padding, so coordinates are already relative to grid container
  const selectionRect = selectionState
    ? (() => {
        // Grid padding is 20px
        const gridPadding = 20;
        const gridWidth = levelData.width * (brickWidth + padding) - padding;
        const gridHeight = levelData.height * (brickHeight + padding) - padding;

        // Constrain coordinates to grid bounds (accounting for padding)
        const startX = Math.max(
          gridPadding,
          Math.min(selectionState.startX, gridWidth + gridPadding)
        );
        const startY = Math.max(
          gridPadding,
          Math.min(selectionState.startY, gridHeight + gridPadding)
        );
        const currentX = Math.max(
          gridPadding,
          Math.min(selectionState.currentX, gridWidth + gridPadding)
        );
        const currentY = Math.max(
          gridPadding,
          Math.min(selectionState.currentY, gridHeight + gridPadding)
        );

        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        return { left, top, width, height };
      })()
    : null;

  return (
    <div
      className="editor-canvas"
      style={{ overflow: "visible", width: "100%", boxSizing: "border-box" }}
      onMouseDown={brushMode === "multi-select" ? onSelectionStart : undefined}
    >
      <div
        className="canvas-wrapper"
        style={{ overflow: "visible", position: "relative" }}
      >
        <div
          ref={gridContainerRef}
          className="canvas-grid"
          style={
            {
              gridTemplateColumns: `repeat(${levelData.width}, 1fr)`,
              "--grid-width": levelData.width.toString(),
              "--grid-height": levelData.height.toString(),
              "--cell-width": `${brickWidth}px`,
              "--cell-height": `${brickHeight}px`,
              overflow: "visible", // Allow full-size blocks to overflow
              position: "relative",
            } as React.CSSProperties
          }
        >
          {/* Selection rectangle - positioned using absolute pixels, constrained to grid */}
          {selectionRect && brushMode === "multi-select" && (
            <div
              className="selection-rectangle"
              style={{
                position: "absolute",
                left: `${selectionRect.left}px`,
                top: `${selectionRect.top}px`,
                width: `${selectionRect.width}px`,
                height: `${selectionRect.height}px`,
                border: "2px dashed rgba(100, 150, 255, 0.8)",
                backgroundColor: "rgba(100, 150, 255, 0.1)",
                pointerEvents: "none",
                zIndex: 1000,
              }}
            />
          )}

          {/* Selected brick highlights - positioned using exact pixel coordinates */}
          {brushMode === "multi-select" &&
            Array.from(selectedBricks).map((brick) => {
              if (brick.col === undefined || brick.row === undefined)
                return null;

              // Use stored dimensions or current dimensions
              const refWidth = levelData.brickWidth || brickWidth;
              const refHeight = levelData.brickHeight || brickHeight;
              const refPadding = levelData.padding || padding;
              const gridPadding = 20; // Grid container padding

              let highlightLeft: number;
              let highlightTop: number;
              let highlightWidth: number;
              let highlightHeight: number;

              if (brick.isHalfSize && brick.halfSizeAlign) {
                // Half-size block - calculate exact position
                const halfBlockGap = refPadding;
                const halfWidth = (refWidth - halfBlockGap) / 2;
                const cellLeft = brick.col * (refWidth + refPadding);
                const cellTop = brick.row * (refHeight + refPadding);

                if (brick.halfSizeAlign === "left") {
                  highlightLeft = gridPadding + cellLeft;
                } else {
                  // Right half
                  const cellCenter = cellLeft + refWidth / 2;
                  highlightLeft = gridPadding + cellCenter + halfBlockGap / 2;
                }
                highlightTop = gridPadding + cellTop;
                highlightWidth = halfWidth;
                highlightHeight = refHeight;
              } else {
                // Full-size block - centered in cell
                const cellLeft = brick.col * (refWidth + refPadding);
                const cellTop = brick.row * (refHeight + refPadding);
                highlightLeft = gridPadding + cellLeft;
                highlightTop = gridPadding + cellTop;
                highlightWidth = refWidth;
                highlightHeight = refHeight;
              }

              return (
                <div
                  key={`${brick.col}-${brick.row}-${
                    brick.isHalfSize ? brick.halfSizeAlign : "full"
                  }`}
                  className="selected-brick-highlight"
                  style={{
                    position: "absolute",
                    left: `${highlightLeft}px`,
                    top: `${highlightTop}px`,
                    width: `${highlightWidth}px`,
                    height: `${highlightHeight}px`,
                    border: "2px solid rgba(100, 150, 255, 0.8)",
                    backgroundColor: "rgba(100, 150, 255, 0.2)",
                    pointerEvents: "none",
                    zIndex: 999,
                  }}
                />
              );
            })}

          {/* Single selected brick highlight */}
          {selectedBrick &&
            selectedBrick.col !== undefined &&
            selectedBrick.row !== undefined &&
            (() => {
              // Use stored dimensions or current dimensions
              const refWidth = levelData.brickWidth || brickWidth;
              const refHeight = levelData.brickHeight || brickHeight;
              const refPadding = levelData.padding || padding;
              const gridPadding = 20; // Grid container padding

              let highlightLeft: number;
              let highlightTop: number;
              let highlightWidth: number;
              let highlightHeight: number;

              if (selectedBrick.isHalfSize && selectedBrick.halfSizeAlign) {
                // Half-size block - calculate exact position
                const halfBlockGap = refPadding;
                const halfWidth = (refWidth - halfBlockGap) / 2;
                const cellLeft = selectedBrick.col * (refWidth + refPadding);
                const cellTop = selectedBrick.row * (refHeight + refPadding);

                if (selectedBrick.halfSizeAlign === "left") {
                  highlightLeft = gridPadding + cellLeft;
                } else {
                  // Right half
                  const cellCenter = cellLeft + refWidth / 2;
                  highlightLeft = gridPadding + cellCenter + halfBlockGap / 2;
                }
                highlightTop = gridPadding + cellTop;
                highlightWidth = halfWidth;
                highlightHeight = refHeight;
              } else {
                // Full-size block - centered in cell
                const cellLeft = selectedBrick.col * (refWidth + refPadding);
                const cellTop = selectedBrick.row * (refHeight + refPadding);
                highlightLeft = gridPadding + cellLeft;
                highlightTop = gridPadding + cellTop;
                highlightWidth = refWidth;
                highlightHeight = refHeight;
              }

              return (
                <div
                  key={`selected-${selectedBrick.col}-${selectedBrick.row}-${
                    selectedBrick.isHalfSize
                      ? selectedBrick.halfSizeAlign
                      : "full"
                  }`}
                  className="selected-brick-highlight"
                  style={{
                    position: "absolute",
                    left: `${highlightLeft}px`,
                    top: `${highlightTop}px`,
                    width: `${highlightWidth - 6}px`,
                    height: `${highlightHeight - 6}px`,
                    border: "3px solid rgba(100, 150, 255, 1)",
                    backgroundColor: "rgba(100, 150, 255, 0.3)",
                    pointerEvents: "none",
                    zIndex: 998,
                    boxShadow: "0 0 8px rgba(100, 150, 255, 0.6)",
                  }}
                />
              );
            })()}

          {Array.from({ length: levelData.height }).map((_, row) =>
            Array.from({ length: levelData.width }).map((_, col) => {
              // Grid is always built on half-size foundation
              // Check for half-size blocks in each half
              const leftBrick = getBrickAtPosition(col, row, "left");
              const rightBrick = getBrickAtPosition(col, row, "right");

              // Check if there's a full-size block (occupies both halves)
              // Full-size blocks don't have isHalfSize=true, so they won't be found by half-slot queries
              const fullBrick = getBrickAtPosition(col, row);
              const isFullSizeBlock = fullBrick && !fullBrick.isHalfSize;

              // Check if left half is in drag path
              const isLeftInDragPath =
                dragState?.path.some(
                  (p: {
                    col: number;
                    row: number;
                    halfSlot?: "left" | "right";
                  }) => {
                    if (isHalfSize) {
                      // In half-size mode, check specific half
                      return (
                        p.col === col && p.row === row && p.halfSlot === "left"
                      );
                    }
                    // In full-size mode, check if path includes this cell (spans both halves)
                    return p.col === col && p.row === row;
                  }
                ) || false;

              // Check if right half is in drag path
              const isRightInDragPath =
                dragState?.path.some(
                  (p: {
                    col: number;
                    row: number;
                    halfSlot?: "left" | "right";
                  }) => {
                    if (isHalfSize) {
                      // In half-size mode, check specific half
                      return (
                        p.col === col && p.row === row && p.halfSlot === "right"
                      );
                    }
                    // In full-size mode, check if path includes this cell (spans both halves)
                    return p.col === col && p.row === row;
                  }
                ) || false;

              const isFuseDrag = dragState?.brickType
                ? isFuseType(dragState.brickType)
                : false;

              // Always render with left/right halves - grid is built on half-size foundation
              return (
                <div
                  key={`${col}-${row}`}
                  className="grid-cell"
                  style={{
                    display: "flex",
                    borderTop: "2px solid #333",
                    borderBottom: "2px solid #333",
                    borderLeft: "2px solid #333",
                    borderRight: "2px solid #333",
                    position: "relative",
                    gap: "0", // Gap is now handled by padding on half divs to center blocks
                    overflow: "visible", // Allow full-size blocks to overflow
                  }}
                >
                  {/* Grid coordinate label */}
                  {/* <div
                    style={{
                      position: "absolute",
                      top: "2px",
                      left: "2px",
                      fontSize: "10px",
                      color: "rgba(255, 0, 0, 0.5)",
                      zIndex: 1000,
                      pointerEvents: "none",
                      fontFamily: "monospace",
                      lineHeight: "1",
                    }}
                  >
                    {col},{row}
                  </div> */}
                  {/* Render full-size block at grid-cell level to span both halves */}
                  {isFullSizeBlock && (
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: `${brickWidth}px`,
                        height: `${brickHeight}px`,
                        zIndex: 10,
                        pointerEvents: "none", // Allow clicks to pass through to grid cells
                      }}
                    >
                      <Brick
                        brickData={fullBrick!}
                        width={brickWidth}
                        height={brickHeight}
                        mode="editor"
                      />
                    </div>
                  )}

                  {/* Left half - always rendered as separate cell */}
                  <div
                    className={`grid-cell-half ${
                      isFullSizeBlock || leftBrick ? "has-brick" : ""
                    } ${
                      isFullSizeBlock
                        ? fullBrick?.type || ""
                        : leftBrick?.type || ""
                    }`}
                    style={{
                      width: halfDivWidth, // Always 50% for the container
                      height: "100%",
                      backgroundColor: leftBrick
                        ? "transparent" // No background color for half blocks
                        : isFullSizeBlock
                        ? `#${
                            fullBrick?.color.toString(16).padStart(6, "0") ||
                            "ffffff"
                          }`
                        : isLeftInDragPath
                        ? isFuseDrag
                          ? "rgba(0, 255, 0, 0.2)"
                          : "rgba(255, 255, 255, 0.1)"
                        : "transparent",
                      borderTop: "none",
                      borderBottom: "none",
                      borderLeft: "none",
                      borderRight:
                        isHalfSize &&
                        !isFullSizeBlock &&
                        !leftBrick &&
                        !rightBrick
                          ? `1px solid rgb(51,51,51)` // Center divider line - only show when both halves are empty
                          : "none",
                      marginRight: leftBrick && !rightBrick ? "0px" : "0", // Only add margin for single half-blocks
                      marginLeft: leftBrick && !rightBrick ? "-2px" : "0", // Only add margin for single half-blocks
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        leftBrick && !rightBrick ? "flex-start" : "center", // Align left when only left block exists
                      overflow: "visible", // Remove overflow hidden for half blocks
                      paddingRight: rightBrick ? `${halfBlockGap / 2}px` : "0", // Add padding when right block exists to create gap (regardless of mode)
                    }}
                    onClick={() => {
                      if (!dragState?.isDragging) {
                        onCellClick(col, row, "left");
                      }
                    }}
                    onMouseDown={(e) => onCellMouseDown(e, col, row, "left")}
                    onMouseEnter={() => onCellMouseEnter(col, row, "left")}
                    onContextMenu={(e) => onCellRightClick(e, col, row, "left")}
                  >
                    {!isFullSizeBlock && leftBrick && (
                      <Brick
                        brickData={leftBrick}
                        width={halfBrickWidth}
                        height={brickHeight}
                        mode="editor"
                      />
                    )}
                  </div>
                  {/* Right half - always rendered as separate cell */}
                  <div
                    className={`grid-cell-half ${
                      isFullSizeBlock || rightBrick ? "has-brick" : ""
                    } ${
                      isFullSizeBlock
                        ? fullBrick?.type || ""
                        : rightBrick?.type || ""
                    }`}
                    style={{
                      width: halfDivWidth, // Always 50% for the container
                      height: "100%",
                      backgroundColor: rightBrick
                        ? "transparent" // No background color for half blocks
                        : isFullSizeBlock
                        ? `#${
                            fullBrick?.color.toString(16).padStart(6, "0") ||
                            "ffffff"
                          }`
                        : isRightInDragPath
                        ? isFuseDrag
                          ? "rgba(0, 255, 0, 0.2)"
                          : "rgba(255, 255, 255, 0.1)"
                        : "transparent",
                      borderTop: "none",
                      borderBottom: "none",
                      borderRight: "none",
                      borderLeft:
                        isHalfSize &&
                        !isFullSizeBlock &&
                        !leftBrick &&
                        !rightBrick
                          ? `1px solid rgb(51,51,51)` // Center divider line - only show when both halves are empty
                          : "none",
                      marginLeft: rightBrick && !leftBrick ? "0px" : "0", // Only add margin for single half-blocks
                      marginRight: rightBrick && !leftBrick ? "-2px" : "0", // Only add margin for single half-blocks
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        rightBrick && !leftBrick ? "flex-end" : "center", // Align right when only right block exists
                      overflow: "visible", // Remove overflow hidden for half blocks
                      paddingLeft: leftBrick ? `${halfBlockGap / 2}px` : "0", // Add padding when left block exists to create gap (regardless of mode)
                    }}
                    onClick={() => {
                      if (!dragState?.isDragging) {
                        onCellClick(col, row, "right");
                      }
                    }}
                    onMouseDown={(e) => onCellMouseDown(e, col, row, "right")}
                    onMouseEnter={() => onCellMouseEnter(col, row, "right")}
                    onContextMenu={(e) =>
                      onCellRightClick(e, col, row, "right")
                    }
                  >
                    {!isFullSizeBlock && rightBrick && (
                      <Brick
                        brickData={rightBrick}
                        width={halfBrickWidth}
                        height={brickHeight}
                        mode="editor"
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
