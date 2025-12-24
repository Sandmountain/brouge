import { useState, useCallback, useEffect, useRef } from "react";
import { LevelData, BrickData, BrickType } from "../../game/types";
import { Undo, Redo } from "lucide-react";
import "../LevelEditor.css";
import { EventBus } from "../../game/EventBus";
import { DEFAULT_COLORS } from "./constants";
import { useWindowSize } from "./hooks/useWindowSize";
import { useDragToPlace } from "./hooks/useDragToPlace";
import { getNextPortalPairId } from "./utils/portalPairing";
import { createBrickData } from "./utils/brickCreation";
import { saveToStorage, loadFromStorage } from "./utils/storage";
import { cleanBricks } from "./utils/validation";
import { EditorHeader } from "./components/EditorHeader";
// BrickSelector and ColorPicker removed - functionality moved to toolbar dropdown
import { BrickEditor } from "./components/BrickEditor";
import { EditorGrid } from "./components/EditorGrid";
import { EditorToolbar, BrushMode } from "./components/EditorToolbar";
import { GridSizeControls } from "./components/GridSizeControls";
import { SettingsModal } from "./components/SettingsModal";
import { useSelection } from "./hooks/useSelection";
import { useHistory } from "./hooks/useHistory";

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
  const [brushMode, setBrushMode] = useState<BrushMode>("paint");
  const rightClickJustHappened = useRef(false);
  const [isFuseMode, setIsFuseMode] = useState(false);
  const [isHalfSize, setIsHalfSize] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Sidebar removed - brick selection moved to toolbar dropdown

  // Calculate available space (no sidebar anymore)
  const availableWidth = windowSize.width - 100;
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

  // Load initial data from storage
  const [initialLevelData] = useState<LevelData>(() => {
    const stored = loadFromStorage();
    if (stored) return stored;
    return {
      name: "New Level",
      width: 10,
      height: 8,
      bricks: [],
      backgroundColor: 0x1a1a2e,
      brickWidth: initialBrickWidth,
      brickHeight: initialBrickHeight,
      padding: padding,
    };
  });

  // Wrap levelData with history management
  const {
    state: levelData,
    setState: setLevelDataWithHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory(initialLevelData);

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

  // Auto-save to localStorage whenever levelData changes (but not during undo/redo)
  const isUndoRedoRef = useRef(false);
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    // Clean bricks before saving
    const cleanedBricks = cleanBricks(
      levelData.bricks,
      levelData.width,
      levelData.height
    );

    const dataToSave = {
      ...levelData,
      bricks: cleanedBricks,
      brickWidth: brickWidth,
      brickHeight: brickHeight,
      padding: padding,
    };
    saveToStorage(dataToSave);
  }, [levelData, brickWidth, brickHeight, padding]);

  // Wrapper that updates history (which will trigger auto-save)
  const setLevelData = useCallback(
    (updater: LevelData | ((prev: LevelData) => LevelData)) => {
      setLevelDataWithHistory(updater);
    },
    [setLevelDataWithHistory]
  );

  // Enhanced undo/redo that marks the operation
  const handleUndo = useCallback(() => {
    isUndoRedoRef.current = true;
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    isUndoRedoRef.current = true;
    redo();
  }, [redo]);

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

  // Keyboard shortcuts for brush modes and block sizes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Don't trigger if modifier keys are pressed (except for undo/redo which are handled elsewhere)
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          setBrushMode("paint");
          break;
        case "e":
          e.preventDefault();
          setBrushMode("erase");
          break;
        case "a":
          e.preventDefault();
          setBrushMode("single-select");
          break;
        case "s":
          e.preventDefault();
          setBrushMode("multi-select");
          break;
        case "m":
          e.preventDefault();
          setIsHalfSize(false);
          break;
        case "n":
          e.preventDefault();
          setIsHalfSize(true);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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

  const handleBricksErased = useCallback(
    (
      path: Array<{ col: number; row: number; halfSlot?: "left" | "right" }>
    ) => {
      setLevelData((prev) => {
        // Create a set of positions to erase for efficient lookup
        const positionsToErase = new Set(
          path.map((p) => {
            if (p.halfSlot !== undefined) {
              return `${p.col},${p.row},${p.halfSlot}`;
            }
            return `${p.col},${p.row}`;
          })
        );

        // Filter out bricks at positions in the path
        // For half-size blocks, check specific halfSlot
        // For full-size blocks, check if any brick at that position
        const filteredBricks = prev.bricks.filter((brick) => {
          if (brick.col === undefined || brick.row === undefined) return true;

          if (brick.isHalfSize && brick.halfSizeAlign) {
            const key = `${brick.col},${brick.row},${brick.halfSizeAlign}`;
            return !positionsToErase.has(key);
          } else {
            // For full-size blocks, check if this position is in the erase path
            const key = `${brick.col},${brick.row}`;
            // Also check for half-slot keys that might overlap
            const leftKey = `${brick.col},${brick.row},left`;
            const rightKey = `${brick.col},${brick.row},right`;
            return (
              !positionsToErase.has(key) &&
              !positionsToErase.has(leftKey) &&
              !positionsToErase.has(rightKey)
            );
          }
        });

        // Also handle portal pairs - if erasing a portal, remove its pair
        const erasedBrickIds = new Set<string>();
        prev.bricks.forEach((brick) => {
          if (brick.col === undefined || brick.row === undefined) return;
          const key =
            brick.isHalfSize && brick.halfSizeAlign
              ? `${brick.col},${brick.row},${brick.halfSizeAlign}`
              : `${brick.col},${brick.row}`;
          if (
            positionsToErase.has(key) &&
            brick.type === "portal" &&
            brick.id
          ) {
            erasedBrickIds.add(brick.id);
          }
        });

        // Remove portal pairs
        const finalBricks = filteredBricks.filter(
          (brick) => !(brick.id && erasedBrickIds.has(brick.id))
        );

        return {
          ...prev,
          bricks: finalBricks,
        };
      });
    },
    [setLevelData]
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
    handleBricksErased,
    isHalfSize,
    "left" // Default to left alignment
  );

  const gridContainerRef = useRef<HTMLDivElement>(null);

  const {
    selectionState,
    selectedBricks,
    setSelectedBricks,
    handleSelectionStart,
  } = useSelection(
    levelData,
    brickWidth,
    brickHeight,
    padding,
    getBrickAtPosition,
    gridContainerRef
  );

  // Handle Delete key to remove selected bricks (multi-select or single select)
  useEffect(() => {
    const hasMultiSelect =
      brushMode === "multi-select" && selectedBricks.size > 0;
    const hasSingleSelect = selectedBrick !== null;

    if (!hasMultiSelect && !hasSingleSelect) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") {
        return;
      }

      e.preventDefault();

      setLevelData((prev) => {
        // Collect IDs of portal bricks to remove pairs
        const portalIdsToRemove = new Set<string>();
        const bricksToRemove = new Set<BrickData>();

        if (hasMultiSelect) {
          // Multi-select: remove all selected bricks
          selectedBricks.forEach((brick) => {
            bricksToRemove.add(brick);
            if (brick.type === "portal" && brick.id) {
              portalIdsToRemove.add(brick.id);
            }
          });
        } else if (hasSingleSelect && selectedBrick) {
          // Single select: remove the selected brick
          bricksToRemove.add(selectedBrick);
          if (selectedBrick.type === "portal" && selectedBrick.id) {
            portalIdsToRemove.add(selectedBrick.id);
          }
        }

        // Remove selected bricks and their portal pairs
        const filteredBricks = prev.bricks.filter(
          (brick) =>
            !bricksToRemove.has(brick) &&
            !(brick.id && portalIdsToRemove.has(brick.id))
        );

        return {
          ...prev,
          bricks: filteredBricks,
        };
      });

      // Clear selections after deletion
      if (hasMultiSelect) {
        setSelectedBricks(new Set());
      }
      if (hasSingleSelect) {
        setSelectedBrick(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    brushMode,
    selectedBricks,
    selectedBrick,
    setLevelData,
    setSelectedBricks,
  ]);

  // Handle "d" key to deselect/clear selection
  useEffect(() => {
    const hasMultiSelect =
      brushMode === "multi-select" && selectedBricks.size > 0;
    const hasSingleSelect = selectedBrick !== null;

    if (!hasMultiSelect && !hasSingleSelect) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle "d" key, and make sure we're not in an input field
      if (e.key !== "d" && e.key !== "D") {
        return;
      }

      // Don't handle if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      e.preventDefault();

      // Clear selections
      if (hasMultiSelect) {
        setSelectedBricks(new Set());
      }
      if (hasSingleSelect) {
        setSelectedBrick(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [brushMode, selectedBricks, selectedBrick, setSelectedBricks]);

  // Handle arrow key movement for selected bricks
  useEffect(() => {
    if (brushMode !== "multi-select" || selectedBricks.size === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key !== "ArrowUp" &&
        e.key !== "ArrowDown" &&
        e.key !== "ArrowLeft" &&
        e.key !== "ArrowRight"
      ) {
        return;
      }

      e.preventDefault();

      const deltaCol =
        e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      const deltaRow = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;

      if (deltaCol === 0 && deltaRow === 0) return;

      setLevelData((prev) => {
        // Track original positions of selected bricks for updating selection
        const originalPositions = new Map<
          BrickData,
          { col: number; row: number; halfSizeAlign?: "left" | "right" }
        >();
        selectedBricks.forEach((brick) => {
          if (brick.col !== undefined && brick.row !== undefined) {
            originalPositions.set(brick, {
              col: brick.col,
              row: brick.row,
              halfSizeAlign: brick.halfSizeAlign,
            });
          }
        });

        // Create a map of current brick positions to avoid conflicts
        const currentBrickMap = new Map<string, BrickData>();
        prev.bricks.forEach((b) => {
          if (b.col !== undefined && b.row !== undefined) {
            if (b.isHalfSize && b.halfSizeAlign) {
              currentBrickMap.set(`${b.col},${b.row},${b.halfSizeAlign}`, b);
            } else {
              currentBrickMap.set(`${b.col},${b.row}`, b);
            }
          }
        });

        // Calculate new positions for all selected bricks
        // All blocks move by half-cell increments
        const newPositions = new Map<
          BrickData,
          { col: number; row: number; halfSizeAlign?: "left" | "right" }
        >();

        let canMove = true;
        for (const brick of selectedBricks) {
          if (brick.col === undefined || brick.row === undefined) continue;

          // For all blocks, treat them as having a half-size alignment for movement
          // Full-size blocks will use a stored alignment or default to "left"
          const currentAlign = brick.isHalfSize
            ? brick.halfSizeAlign || "left"
            : (brick as any).movementAlign || "left";

          let newCol = brick.col;
          let newRow = brick.row;
          let newHalfSizeAlign: "left" | "right" = currentAlign;

          // Handle horizontal movement (half-cell increments)
          if (deltaCol !== 0) {
            if (deltaCol < 0) {
              // Moving left
              if (currentAlign === "right") {
                // Switch to left in same cell
                newHalfSizeAlign = "left";
              } else {
                // Currently left - move to right of cell to the left
                newCol = brick.col - 1;
                newHalfSizeAlign = "right";
              }
            } else {
              // Moving right
              if (currentAlign === "left") {
                // Switch to right in same cell
                newHalfSizeAlign = "right";
              } else {
                // Currently right - move to left of cell to the right
                newCol = brick.col + 1;
                newHalfSizeAlign = "left";
              }
            }
          }

          // Handle vertical movement (full row, same half-slot)
          if (deltaRow !== 0) {
            newRow = brick.row + deltaRow;
          }

          // Check bounds
          if (
            newCol < 0 ||
            newCol >= prev.width ||
            newRow < 0 ||
            newRow >= prev.height
          ) {
            canMove = false;
            break;
          }

          // For full-size blocks, check if the target cell is occupied
          // For half-size blocks, check if the specific half-slot is occupied
          if (brick.isHalfSize) {
            const targetKey = `${newCol},${newRow},${newHalfSizeAlign}`;
            if (currentBrickMap.has(targetKey)) {
              const existingBrick = currentBrickMap.get(targetKey);
              if (!existingBrick || !selectedBricks.has(existingBrick)) {
                canMove = false;
                break;
              }
            }
          } else {
            // Full-size block - check if target cell has any blocks
            const leftKey = `${newCol},${newRow},left`;
            const rightKey = `${newCol},${newRow},right`;
            const fullKey = `${newCol},${newRow}`;

            const leftBrick = currentBrickMap.get(leftKey);
            const rightBrick = currentBrickMap.get(rightKey);
            const fullBrick = currentBrickMap.get(fullKey);

            // Check if any position is occupied by a non-selected brick
            if (leftBrick && !selectedBricks.has(leftBrick)) {
              canMove = false;
              break;
            }
            if (rightBrick && !selectedBricks.has(rightBrick)) {
              canMove = false;
              break;
            }
            if (fullBrick && !selectedBricks.has(fullBrick)) {
              canMove = false;
              break;
            }
          }

          newPositions.set(brick, {
            col: newCol,
            row: newRow,
            halfSizeAlign: brick.isHalfSize ? newHalfSizeAlign : undefined,
          });

          // Store movement alignment for full-size blocks
          if (!brick.isHalfSize) {
            (brick as any).movementAlign = newHalfSizeAlign;
          }
        }

        // Update all bricks - move selected ones, keep others in place
        const updatedBricks = prev.bricks.map((brick) => {
          if (!selectedBricks.has(brick)) {
            // Not selected - keep in place
            return brick;
          }

          const newPos = newPositions.get(brick);
          if (!newPos) {
            // Out of bounds - don't move
            return brick;
          }

          // Recalculate position
          const refWidth = prev.brickWidth || brickWidth;
          const refHeight = prev.brickHeight || brickHeight;
          const refPadding = prev.padding || padding;

          let newX: number;
          let newY: number;
          const newHalfSizeAlign = newPos.halfSizeAlign;
          const movementAlign =
            (brick as any).movementAlign || newHalfSizeAlign || "left";

          if (brick.isHalfSize && newHalfSizeAlign) {
            const halfBlockGap = refPadding;
            const halfWidth = (refWidth - halfBlockGap) / 2;
            const cellLeft = newPos.col * (refWidth + refPadding);
            const cellCenter = cellLeft + refWidth / 2;

            if (newHalfSizeAlign === "left") {
              newX = cellLeft + halfWidth / 2;
            } else {
              newX = cellCenter + halfBlockGap / 2 + halfWidth / 2;
            }
            newY = newPos.row * (refHeight + refPadding) + refHeight / 2;
          } else {
            // Full-size block - position based on movement alignment
            const cellLeft = newPos.col * (refWidth + refPadding);
            const cellCenter = cellLeft + refWidth / 2;

            if (movementAlign === "left") {
              // Align to left half of cell, but still full width
              newX = cellLeft + refWidth / 2;
            } else {
              // Align to right half of cell, but still full width
              newX = cellCenter + refWidth / 2;
            }
            newY = newPos.row * (refHeight + refPadding) + refHeight / 2;
          }

          const updatedBrick: BrickData = {
            ...brick,
            col: newPos.col,
            row: newPos.row,
            halfSizeAlign: newHalfSizeAlign,
            x: newX,
            y: newY,
          };

          // Store movement alignment for full-size blocks
          if (!brick.isHalfSize) {
            (updatedBrick as any).movementAlign = movementAlign;
          }

          return updatedBrick;
        });

        // Update selectedBricks Set with new brick objects (keep selection)
        // Match moved bricks to their new positions, or keep them if they didn't move
        const newSelectedBricks = new Set<BrickData>();
        originalPositions.forEach((originalPos, originalBrick) => {
          if (canMove) {
            // Movement was allowed - find brick at new position
            const newPos = newPositions.get(originalBrick);
            if (newPos) {
              const foundBrick = updatedBricks.find((b) => {
                if (b.col === undefined || b.row === undefined) return false;
                if (b.col !== newPos.col || b.row !== newPos.row) return false;
                if (originalBrick.isHalfSize) {
                  return (
                    b.isHalfSize && b.halfSizeAlign === newPos.halfSizeAlign
                  );
                }
                return !b.isHalfSize;
              });

              if (foundBrick) {
                newSelectedBricks.add(foundBrick);
              }
            }
          } else {
            // Movement was prevented - find brick at original position
            const foundBrick = updatedBricks.find((b) => {
              if (b.col === undefined || b.row === undefined) return false;
              if (b.col !== originalPos.col || b.row !== originalPos.row)
                return false;
              if (originalPos.halfSizeAlign !== undefined) {
                return (
                  b.isHalfSize && b.halfSizeAlign === originalPos.halfSizeAlign
                );
              }
              return !b.isHalfSize;
            });

            if (foundBrick) {
              newSelectedBricks.add(foundBrick);
            }
          }
        });

        setSelectedBricks(newSelectedBricks);

        return {
          ...prev,
          bricks: updatedBricks,
        };
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    brushMode,
    selectedBricks,
    setLevelData,
    getBrickAtPosition,
    brickWidth,
    brickHeight,
    padding,
    dragState,
    brushMode,
    isHalfSize,
    handleEraseBrick,
    dragState,
  ]);

  const handleCellClick = useCallback(
    (col: number, row: number, halfSlot?: "left" | "right") => {
      // Skip if a right-click just happened (to prevent recreating deleted blocks)
      if (rightClickJustHappened.current) {
        rightClickJustHappened.current = false;
        return;
      }

      // Don't handle clicks in fuse mode - fuse mode uses drag
      if (isFuseMode) {
        return;
      }

      // Handle single-select mode - select a single brick on click
      if (brushMode === "single-select") {
        // Clear multi-select when using single-select
        setSelectedBricks(new Set());

        // Smart brick detection: always check for both full and half blocks
        const fullSizeBlock = getBrickAtPosition(col, row);
        if (fullSizeBlock && !fullSizeBlock.isHalfSize) {
          setSelectedBrick(fullSizeBlock);
          // Update selected brick type and color to match the selected brick
          if (fullSizeBlock.type === "default") {
            setSelectedBrickType("default");
            setSelectedColor(fullSizeBlock.color);
          } else if (fullSizeBlock.type === "fuse-horizontal") {
            setIsFuseMode(true);
          } else {
            setSelectedBrickType(fullSizeBlock.type);
          }
          return;
        }

        // If no full-size block, check for half blocks
        if (halfSlot !== undefined) {
          const brickInClickedHalf = getBrickAtPosition(col, row, halfSlot);
          if (brickInClickedHalf) {
            setSelectedBrick(brickInClickedHalf);
            if (brickInClickedHalf.type === "default") {
              setSelectedBrickType("default");
              setSelectedColor(brickInClickedHalf.color);
            } else if (brickInClickedHalf.type === "fuse-horizontal") {
              setIsFuseMode(true);
            } else {
              setSelectedBrickType(brickInClickedHalf.type);
            }
            return;
          }

          // As fallback, check the other half
          const otherHalf = halfSlot === "left" ? "right" : "left";
          const brickInOtherHalf = getBrickAtPosition(col, row, otherHalf);
          if (brickInOtherHalf) {
            setSelectedBrick(brickInOtherHalf);
            if (brickInOtherHalf.type === "default") {
              setSelectedBrickType("default");
              setSelectedColor(brickInOtherHalf.color);
            } else if (brickInOtherHalf.type === "fuse-horizontal") {
              setIsFuseMode(true);
            } else {
              setSelectedBrickType(brickInOtherHalf.type);
            }
            return;
          }
        }

        // If no brick found, clear selection
        setSelectedBrick(null);
        return;
      }

      // Don't handle single clicks in erase mode if we're using drag - let drag handle it
      // Only handle if there's no active drag
      if (brushMode === "erase") {
        if (!dragState?.isDragging) {
          // Single click erase (not drag)
          // Smart erase: check for full block first, then half blocks
          const fullBlock = getBrickAtPosition(col, row);
          if (fullBlock && !fullBlock.isHalfSize) {
            // Erase full-size block
            handleEraseBrick(col, row);
          } else if (halfSlot !== undefined) {
            // Erase half block in clicked half
            const halfBlock = getBrickAtPosition(col, row, halfSlot);
            if (halfBlock) {
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
            }
          }
        }
        return;
      }

      // Paint mode: always place bricks, never select
      // Only place bricks in paint mode, not in single-select mode
      if (brushMode !== "paint") {
        return;
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
      e.stopPropagation(); // Prevent onClick from firing

      // Mark that a right-click just happened to prevent onClick from placing a block
      rightClickJustHappened.current = true;

      // Smart erase: check for full block first, then half blocks
      const fullBlock = getBrickAtPosition(col, row);
      if (fullBlock && !fullBlock.isHalfSize) {
        // Erase full-size block
        handleEraseBrick(col, row);
      } else if (halfSlot !== undefined) {
        // Erase half block in clicked half
        const halfBlock = getBrickAtPosition(col, row, halfSlot);
        if (halfBlock) {
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
        }
      }

      // Reset the flag after a short delay to allow normal clicks to work again
      setTimeout(() => {
        rightClickJustHappened.current = false;
      }, 100);
    },
    [handleEraseBrick, getBrickAtPosition, setLevelData]
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

          onTestLevel?.(testData);
        }}
        onSave={handleSave}
        onExport={handleExport}
        onImport={handleImport}
        onClear={clearLevel}
        onBackToGame={onBackToGame}
      />

      <div className="editor-content">
        {/* Sidebar removed - brick selection moved to toolbar dropdown */}

        <div
          className="editor-main-area"
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            margin: "8px",
          }}
        >
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {/* Toolbar and grid size controls at top left */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                zIndex: 1000,
                boxSizing: "border-box",
                width: "100%",
                padding: "0 25px",
              }}
            >
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                {/* Undo/Redo buttons */}
                <div
                  style={{
                    background: "#1a1a1a",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid #e63946",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                    display: "flex",
                    gap: "4px",
                  }}
                >
                  <button
                    onClick={handleUndo}
                    className="toolbar-button"
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                    style={{
                      opacity: canUndo ? 1 : 0.5,
                      cursor: canUndo ? "pointer" : "not-allowed",
                    }}
                  >
                    <Undo size={20} />
                  </button>
                  <button
                    onClick={handleRedo}
                    className="toolbar-button"
                    disabled={!canRedo}
                    title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
                    style={{
                      opacity: canRedo ? 1 : 0.5,
                      cursor: canRedo ? "pointer" : "not-allowed",
                    }}
                  >
                    <Redo size={20} />
                  </button>
                </div>

                {/* Toolbar */}
                {brushMode !== undefined && (
                  <div
                    style={{
                      background: "#1a1a1a",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid #e63946",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    <EditorToolbar
                      brushMode={brushMode}
                      onBrushModeChange={setBrushMode}
                      isHalfSize={isHalfSize}
                      onHalfSizeToggle={setIsHalfSize}
                      onSettingsClick={() => setIsSettingsOpen(true)}
                      selectedBrickType={selectedBrickType}
                      selectedColor={selectedColor}
                      isFuseMode={isFuseMode}
                      levelData={levelData}
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
                      onColorSelect={setSelectedColor}
                    />
                  </div>
                )}
              </div>

              {/* Grid size controls */}
              <div
                style={{
                  background: "#1a1a1a",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid #e63946",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <GridSizeControls
                  levelData={levelData}
                  brickWidth={brickWidth}
                  brickHeight={brickHeight}
                  padding={padding}
                  onWidthChange={(newWidth) => {
                    setLevelData((prev) => {
                      const maxX =
                        (newWidth - 1) * (brickWidth + padding) +
                        brickWidth / 2;
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
                        (newHeight - 1) * (brickHeight + padding) +
                        brickHeight / 2;
                      return {
                        ...prev,
                        height: newHeight,
                        bricks: prev.bricks.filter((b) => b.y <= maxY),
                      };
                    });
                  }}
                />
              </div>
            </div>
            {selectedBrick && (
              <BrickEditor
                selectedBrick={selectedBrick}
                onUpdate={updateBrick}
                onClose={() => setSelectedBrick(null)}
                levelData={levelData}
              />
            )}
            <EditorGrid
              levelData={levelData}
              brickWidth={brickWidth}
              brickHeight={brickHeight}
              padding={padding}
              getBrickAtPosition={getBrickAtPosition}
              dragState={dragState}
              isHalfSize={isHalfSize}
              brushMode={brushMode}
              selectedBricks={selectedBricks}
              selectedBrick={selectedBrick}
              selectionState={selectionState}
              gridContainerRef={gridContainerRef}
              onCellClick={handleCellClick}
              onCellMouseDown={handleCellMouseDown}
              onCellMouseEnter={handleCellMouseEnter}
              onCellRightClick={handleCellRightClick}
              onSelectionStart={handleSelectionStart}
            />
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        levelData={levelData}
      />
    </div>
  );
}
