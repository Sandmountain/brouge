import { BrickData, BrickType, LevelData } from "../../../game/types";
import { Brick } from "../../../bricks/Brick";
import { isFuseType } from "../utils/fuseDetection";

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
}

export function EditorGrid({
  levelData,
  brickWidth,
  brickHeight,
  padding,
  getBrickAtPosition,
  dragState,
  isHalfSize,
  onCellClick,
  onCellMouseDown,
  onCellMouseEnter,
  onCellRightClick,
}: EditorGridProps) {
  // Calculate half-size block width
  // Gap between half blocks should match the grid padding (spacing between cells)
  const halfBlockGap = padding; // Use grid padding to match spacing between cells
  const halfBrickWidth = (brickWidth - halfBlockGap) / 2;

  // Calculate the width of each half container div
  // Each half div should be 50% of the cell width
  const halfDivWidth = "50%";
  return (
    <div className="editor-canvas" style={{ overflow: "visible" }}>
      <div className="canvas-wrapper" style={{ overflow: "visible" }}>
        <div
          className="canvas-grid"
          style={
            {
              gridTemplateColumns: `repeat(${levelData.width}, 1fr)`,
              "--grid-width": levelData.width.toString(),
              "--grid-height": levelData.height.toString(),
              "--cell-width": `${brickWidth}px`,
              "--cell-height": `${brickHeight}px`,
              overflow: "visible", // Allow full-size blocks to overflow
            } as React.CSSProperties
          }
        >
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
                        onCellClick(col, row, isHalfSize ? "left" : undefined);
                      }
                    }}
                    onMouseDown={(e) =>
                      onCellMouseDown(
                        e,
                        col,
                        row,
                        isHalfSize ? "left" : undefined
                      )
                    }
                    onMouseEnter={() =>
                      onCellMouseEnter(
                        col,
                        row,
                        isHalfSize ? "left" : undefined
                      )
                    }
                    onContextMenu={(e) =>
                      onCellRightClick(
                        e,
                        col,
                        row,
                        isHalfSize ? "left" : undefined
                      )
                    }
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
                        onCellClick(col, row, isHalfSize ? "right" : undefined);
                      }
                    }}
                    onMouseDown={(e) =>
                      onCellMouseDown(
                        e,
                        col,
                        row,
                        isHalfSize ? "right" : undefined
                      )
                    }
                    onMouseEnter={() =>
                      onCellMouseEnter(
                        col,
                        row,
                        isHalfSize ? "right" : undefined
                      )
                    }
                    onContextMenu={(e) =>
                      onCellRightClick(
                        e,
                        col,
                        row,
                        isHalfSize ? "right" : undefined
                      )
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
