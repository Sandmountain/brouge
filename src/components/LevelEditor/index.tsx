import { useState, useCallback, useEffect } from "react";
import { LevelData, BrickData, BrickType } from "../../game/types";
import "../LevelEditor.css";
import { EventBus } from "../../game/EventBus";
import { DEFAULT_COLORS } from "./constants";
import { useWindowSize } from "./hooks/useWindowSize";
import { useLevelStorage } from "./hooks/useLevelStorage";
import { useDragToPlace } from "./hooks/useDragToPlace";
import { getNextPortalPairId } from "./utils/portalPairing";
import { createBrickData } from "./utils/brickCreation";
import { saveToStorage } from "./utils/storage";
import { EditorHeader } from "./components/EditorHeader";
import { BrickSelector } from "./components/BrickSelector";
import { ColorPicker } from "./components/ColorPicker";
import { ToolsPanel } from "./components/ToolsPanel";
import { BrickEditor } from "./components/BrickEditor";
import { GridSizeControls } from "./components/GridSizeControls";
import { LevelStats } from "./components/LevelStats";
import { EditorGrid } from "./components/EditorGrid";
import { SizeToggle } from "./components/SizeToggle";

interface LevelEditorProps {
  onTestLevel?: (levelData: LevelData) => void;
  onReturnFromTest?: () => void;
  onBackToGame?: () => void;
}

const padding = 5;
const maxCellWidth = 90;
const maxCellHeight = 30;
const minCellWidth = 25;
const minCellHeight = 10;

export function LevelEditor({
  onTestLevel,
  onReturnFromTest,
  onBackToGame,
}: LevelEditorProps) {
  const windowSize = useWindowSize();
  const [selectedBrickType, setSelectedBrickType] =
    useState<BrickType>("default");
  const [selectedColor, setSelectedColor] = useState<number>(DEFAULT_COLORS[0]);
  const [selectedBrick, setSelectedBrick] = useState<BrickData | null>(null);
  const [brushMode, setBrushMode] = useState<"paint" | "erase">("paint");
  const [isFuseMode, setIsFuseMode] = useState(false);
  const [isHalfSize, setIsHalfSize] = useState(false);

  // Calculate available space (accounting for sidebar ~300px and padding)
  const availableWidth = windowSize.width - 400;
  const availableHeight = windowSize.height - 250;

  // We need a default levelData to calculate initial dimensions
  // This will be replaced by useLevelStorage
  const defaultLevelData: LevelData = {
    name: "New Level",
    width: 10,
    height: 8,
    bricks: [],
    backgroundColor: 0x1a1a2e,
    brickWidth: 90,
    brickHeight: 30,
    padding: 5,
  };

  // Calculate cell size - scale down for larger grids (using default for initial calc)
  const calculatedWidth = Math.max(
    minCellWidth,
    Math.min(maxCellWidth, availableWidth / defaultLevelData.width - padding)
  );
  const calculatedHeight = Math.max(
    minCellHeight,
    Math.min(maxCellHeight, availableHeight / defaultLevelData.height - padding)
  );

  // Use calculated size or maintain aspect ratio
  const initialBrickWidth = Math.min(calculatedWidth, calculatedHeight * 3);
  const initialBrickHeight = initialBrickWidth / 3;

  const { levelData, setLevelData } = useLevelStorage(
    initialBrickWidth,
    initialBrickHeight,
    padding
  );

  // Recalculate dimensions based on actual levelData
  const recalculatedWidth = Math.max(
    minCellWidth,
    Math.min(maxCellWidth, availableWidth / levelData.width - padding)
  );
  const recalculatedHeight = Math.max(
    minCellHeight,
    Math.min(maxCellHeight, availableHeight / levelData.height - padding)
  );
  const brickWidth = Math.min(recalculatedWidth, recalculatedHeight * 3);
  const brickHeight = brickWidth / 3;

  // Listen for return from test mode
  useEffect(() => {
    const handleReturnFromTest = () => {
      onReturnFromTest?.();
    };

    EventBus.on("return-to-editor", handleReturnFromTest);
    return () => {
      EventBus.removeListener("return-to-editor");
    };
  }, [onReturnFromTest]);

  const getBrickAtPosition = useCallback(
    (
      col: number,
      row: number,
      halfSlot?: "left" | "right"
    ): BrickData | null => {
      // If halfSlot is specified, ONLY look for half-size bricks in that specific half
      // Don't return full-size blocks when a specific half is requested
      if (halfSlot !== undefined) {
        const halfSizeBrick = levelData.bricks.find(
          (b) =>
            b.col === col &&
            b.row === row &&
            b.isHalfSize &&
            b.halfSizeAlign === halfSlot
        );
        return halfSizeBrick || null;
      }

      // No halfSlot specified - look for full-size brick (occupies both halves)
      // Full-size blocks don't have isHalfSize=true
      const fullSizeBrick = levelData.bricks.find(
        (b) => b.col === col && b.row === row && !b.isHalfSize
      );
      if (fullSizeBrick) return fullSizeBrick;

      // Fallback: position-based lookup for backwards compatibility
      const refWidth = levelData.brickWidth || brickWidth;
      const refHeight = levelData.brickHeight || brickHeight;
      const refPadding = levelData.padding || padding;

      return (
        levelData.bricks.find(
          (b) =>
            Math.floor(b.x / (refWidth + refPadding)) === col &&
            Math.floor(b.y / (refHeight + refPadding)) === row
        ) || null
      );
    },
    [
      levelData.bricks,
      levelData.brickWidth,
      levelData.brickHeight,
      levelData.padding,
      brickWidth,
      brickHeight,
      padding,
    ]
  );

  const handleEraseBrick = useCallback(
    (col: number, row: number) => {
      setLevelData((prev) => {
        const brickToErase = prev.bricks.find(
          (b) => b.col === col && b.row === row
        );

        // If erasing a portal, also remove its pair
        if (brickToErase?.type === "portal" && brickToErase.id) {
          return {
            ...prev,
            bricks: prev.bricks.filter(
              (b) =>
                !(b.col === col && b.row === row) && b.id !== brickToErase.id
            ),
          };
        }

        // Otherwise, just remove the clicked brick
        return {
          ...prev,
          bricks: prev.bricks.filter((b) => !(b.col === col && b.row === row)),
        };
      });
    },
    [setLevelData]
  );

  const handleBricksPlaced = useCallback(
    (newBricks: BrickData[]) => {
      if (newBricks.length === 0) return;

      setLevelData((prev) => {
        // Create a set of positions being replaced for efficient lookup
        // For half-size blocks, include halfSlot in the key to only replace that specific half
        const positionsToReplace = new Set(
          newBricks.map((b) => {
            if (b.isHalfSize && b.halfSizeAlign) {
              return `${b.col},${b.row},${b.halfSizeAlign}`;
            }
            // For full-size blocks, use col,row to replace any block at that position
            return `${b.col},${b.row}`;
          })
        );

        return {
          ...prev,
          bricks: [
            // Remove bricks at positions being replaced
            ...prev.bricks.filter((b) => {
              if (b.col === undefined || b.row === undefined) return false;

              // For half-size blocks, check if this specific half is being replaced
              if (b.isHalfSize && b.halfSizeAlign) {
                const key = `${b.col},${b.row},${b.halfSizeAlign}`;
                return !positionsToReplace.has(key);
              }

              // For full-size blocks, check if this position is being replaced
              const key = `${b.col},${b.row}`;
              return !positionsToReplace.has(key);
            }),
            // Add new bricks (already validated)
            ...newBricks,
          ],
          brickWidth: prev.brickWidth || brickWidth,
          brickHeight: prev.brickHeight || brickHeight,
          padding: prev.padding || padding,
        };
      });
    },
    [setLevelData, brickWidth, brickHeight, padding]
  );

  const { dragState, handleMouseDown, handleMouseEnter } = useDragToPlace(
    levelData,
    brickWidth,
    brickHeight,
    padding,
    selectedColor,
    selectedBrickType,
    isFuseMode,
    brushMode,
    handleBricksPlaced,
    isHalfSize,
    "left" // Default to left alignment
  );

  const handleCellClick = useCallback(
    (col: number, row: number, halfSlot?: "left" | "right") => {
      // Don't handle clicks in fuse mode - fuse mode uses drag
      if (isFuseMode) {
        return;
      }

      if (brushMode === "erase") {
        // If half-size mode, erase the specific half; otherwise erase any brick at position
        if (isHalfSize && halfSlot) {
          setLevelData((prev) => ({
            ...prev,
            bricks: prev.bricks.filter(
              (b) =>
                !(
                  b.col === col &&
                  b.row === row &&
                  b.isHalfSize &&
                  b.halfSizeAlign === halfSlot
                )
            ),
          }));
        } else {
          handleEraseBrick(col, row);
        }
        return;
      }

      // Check for existing brick in the specific half we're trying to place
      if (isHalfSize && halfSlot !== undefined) {
        // Check for existing brick in this specific half
        const existingBrickInHalf = getBrickAtPosition(col, row, halfSlot);
        if (existingBrickInHalf) {
          setSelectedBrick(existingBrickInHalf);
          return;
        }

        // Also check if there's a full-size block that would prevent placement
        const fullSizeBlock = getBrickAtPosition(col, row);
        if (fullSizeBlock && !fullSizeBlock.isHalfSize) {
          // Can't place half-size block where full-size block exists
          return;
        }
      } else {
        // Full-size mode - check for any brick at this position
        const existingBrick = getBrickAtPosition(col, row);
        if (existingBrick) {
          setSelectedBrick(existingBrick);
          return;
        }
      }

      // Use stored dimensions or current dimensions for position calculation
      const refWidth = levelData.brickWidth || brickWidth;
      const refHeight = levelData.brickHeight || brickHeight;
      const refPadding = levelData.padding || padding;

      // Handle portal pairing logic
      let portalPairId: string | undefined = undefined;
      if (selectedBrickType === "portal") {
        portalPairId = getNextPortalPairId(levelData);
      }

      // Determine if we're placing half-size or full-size
      // If isHalfSize is true and halfSlot is provided, place half-size block
      // Otherwise, place full-size block (default)
      const shouldPlaceHalfSize = isHalfSize && halfSlot !== undefined;
      const halfSlotAlign = shouldPlaceHalfSize ? halfSlot || "left" : "left";

      const newBrick = createBrickData(
        col,
        row,
        selectedBrickType,
        selectedColor,
        refWidth,
        refHeight,
        refPadding,
        portalPairId,
        shouldPlaceHalfSize,
        halfSlotAlign
      );

      console.log("[LevelEditor] Creating brick:", {
        col,
        row,
        position: { x: newBrick.x, y: newBrick.y },
        storedDimensions: { refWidth, refHeight, refPadding },
        currentDimensions: { brickWidth, brickHeight, padding },
        brick: newBrick,
        portalPairId: selectedBrickType === "portal" ? portalPairId : undefined,
      });

      setLevelData((prev) => {
        // For half-size blocks, only remove the brick in the same half
        // For full-size blocks, remove any brick at that position
        const bricksToKeep = prev.bricks.filter((b) => {
          if (b.col === col && b.row === row) {
            if (shouldPlaceHalfSize && newBrick.halfSizeAlign) {
              // Only remove if it's the same half
              return !(
                b.isHalfSize && b.halfSizeAlign === newBrick.halfSizeAlign
              );
            } else {
              // Full-size block replaces everything at this position
              return false;
            }
          }
          return true;
        });

        return {
          ...prev,
          bricks: [...bricksToKeep, newBrick],
          brickWidth: prev.brickWidth || brickWidth,
          brickHeight: prev.brickHeight || brickHeight,
          padding: prev.padding || padding,
        };
      });
    },
    [
      isFuseMode,
      brushMode,
      handleEraseBrick,
      getBrickAtPosition,
      selectedBrickType,
      selectedColor,
      levelData,
      brickWidth,
      brickHeight,
      padding,
      setLevelData,
    ]
  );

  const handleCellRightClick = useCallback(
    (
      e: React.MouseEvent,
      col: number,
      row: number,
      halfSlot?: "left" | "right"
    ) => {
      e.preventDefault(); // Prevent context menu
      if (isHalfSize && halfSlot) {
        setLevelData((prev) => ({
          ...prev,
          bricks: prev.bricks.filter(
            (b) =>
              !(
                b.col === col &&
                b.row === row &&
                b.isHalfSize &&
                b.halfSizeAlign === halfSlot
              )
          ),
        }));
      } else {
        handleEraseBrick(col, row);
      }
    },
    [handleEraseBrick, isHalfSize, setLevelData]
  );

  const handleCellMouseDown = useCallback(
    (
      _e: React.MouseEvent,
      col: number,
      row: number,
      halfSlot?: "left" | "right"
    ) => {
      const brick = halfSlot
        ? getBrickAtPosition(col, row, halfSlot)
        : getBrickAtPosition(col, row);
      handleMouseDown(col, row, brick, halfSlot);
    },
    [getBrickAtPosition, handleMouseDown]
  );

  const handleCellMouseEnter = useCallback(
    (col: number, row: number, halfSlot?: "left" | "right") => {
      handleMouseEnter(col, row, halfSlot);
    },
    [handleMouseEnter]
  );

  const handleExport = () => {
    const dataStr = JSON.stringify(levelData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${levelData.name.replace(/\s+/g, "_")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as LevelData;
        setLevelData(imported);
      } catch {
        alert("Invalid level file");
      }
    };
    reader.readAsText(file);
  };

  const clearLevel = () => {
    if (confirm("Clear all bricks? This will reset the entire level.")) {
      const defaultLevel: LevelData = {
        name: "New Level",
        width: 10,
        height: 8,
        bricks: [],
        backgroundColor: 0x1a1a2e,
        brickWidth: 90,
        brickHeight: 30,
        padding: 5,
      };
      setLevelData(defaultLevel);
      saveToStorage(defaultLevel);
    }
  };

  const handleSave = () => {
    const dataToSave = {
      ...levelData,
      brickWidth: brickWidth,
      brickHeight: brickHeight,
      padding: padding,
    };
    saveToStorage(dataToSave);
    alert("Level saved to local storage!");
  };

  const updateBrick = (brick: BrickData, updates: Partial<BrickData>) => {
    setLevelData((prev) => ({
      ...prev,
      bricks: prev.bricks.map((b) => (b === brick ? { ...b, ...updates } : b)),
    }));
    setSelectedBrick(null);
  };

  return (
    <div className="level-editor">
      <EditorHeader
        levelData={levelData}
        onLevelNameChange={(name) =>
          setLevelData((prev) => ({ ...prev, name }))
        }
        onTestLevel={() => {
          const testData = {
            ...levelData,
            brickWidth: brickWidth,
            brickHeight: brickHeight,
            padding: padding,
          };
          console.log("[LevelEditor] Testing level with data:", {
            ...testData,
            brickCount: testData.bricks.length,
            firstBrick: testData.bricks[0],
            dimensions: { brickWidth, brickHeight, padding },
          });
          onTestLevel?.(testData);
        }}
        onSave={handleSave}
        onExport={handleExport}
        onImport={handleImport}
        onClear={clearLevel}
        onBackToGame={onBackToGame}
      />

      <div className="editor-content">
        <div className="editor-sidebar">
          <BrickSelector
            selectedBrickType={selectedBrickType}
            selectedColor={selectedColor}
            isFuseMode={isFuseMode}
            onBrickTypeSelect={(type) => {
              setSelectedBrickType(type);
              setIsFuseMode(false);
            }}
            onFuseModeToggle={() => {
              setIsFuseMode(!isFuseMode);
              if (!isFuseMode) {
                setSelectedBrickType("default");
              }
            }}
          />

          {isFuseMode && (
            <div className="sidebar-section">
              <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>
                Click and drag to place fuses. The system will automatically
                choose the correct fuse type based on your drag direction.
              </p>
            </div>
          )}

          {selectedBrickType === "default" && (
            <ColorPicker
              selectedColor={selectedColor}
              onColorSelect={setSelectedColor}
            />
          )}

          <ToolsPanel brushMode={brushMode} onBrushModeChange={setBrushMode} />

          <SizeToggle isHalfSize={isHalfSize} onToggle={setIsHalfSize} />

          {selectedBrick && (
            <BrickEditor
              selectedBrick={selectedBrick}
              onUpdate={updateBrick}
              onClose={() => setSelectedBrick(null)}
            />
          )}

          <GridSizeControls
            levelData={levelData}
            brickWidth={brickWidth}
            brickHeight={brickHeight}
            padding={padding}
            onWidthChange={(newWidth) => {
              setLevelData((prev) => {
                const maxX =
                  (newWidth - 1) * (brickWidth + padding) + brickWidth / 2;
                return {
                  ...prev,
                  width: newWidth,
                  bricks: prev.bricks.filter((b) => b.x <= maxX),
                };
              });
            }}
            onHeightChange={(newHeight) => {
              setLevelData((prev) => {
                const maxY =
                  (newHeight - 1) * (brickHeight + padding) + brickHeight / 2;
                return {
                  ...prev,
                  height: newHeight,
                  bricks: prev.bricks.filter((b) => b.y <= maxY),
                };
              });
            }}
          />

          <LevelStats levelData={levelData} />
        </div>

        <EditorGrid
          levelData={levelData}
          brickWidth={brickWidth}
          brickHeight={brickHeight}
          padding={padding}
          getBrickAtPosition={getBrickAtPosition}
          dragState={dragState}
          isHalfSize={isHalfSize}
          onCellClick={handleCellClick}
          onCellMouseDown={handleCellMouseDown}
          onCellMouseEnter={handleCellMouseEnter}
          onCellRightClick={handleCellRightClick}
        />
      </div>
    </div>
  );
}
