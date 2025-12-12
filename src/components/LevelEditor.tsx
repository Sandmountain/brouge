import { useState, useCallback, useEffect } from "react";
import { LevelData, BrickData, BrickType } from "../game/types";
import "./LevelEditor.css";
import { EventBus } from "../game/EventBus";
import { Brick } from "../bricks/Brick";

interface LevelEditorProps {
  onTestLevel?: (levelData: LevelData) => void;
  onReturnFromTest?: () => void;
  onBackToGame?: () => void;
}

const BRICK_TYPES: {
  type: BrickType;
  name: string;
  color: number;
  description: string;
}[] = [
  {
    type: "default",
    name: "Default",
    color: 0xff6b6b,
    description: "1 hit, any color",
  },
  {
    type: "metal",
    name: "Metal",
    color: 0x888888,
    description: "5 hits, darkens each hit",
  },
  {
    type: "unbreakable",
    name: "Unbreakable",
    color: 0x333333,
    description: "Cannot be destroyed",
  },
  {
    type: "tnt",
    name: "TNT",
    color: 0xff0000,
    description: "Explodes area around it",
  },
  {
    type: "fuse-horizontal",
    name: "Fuse",
    color: 0x00ff00,
    description: "Drag to place fuses - automatically detects direction",
  },
  {
    type: "gold",
    name: "Gold",
    color: 0xffd700,
    description: "3 hits, high coin value",
  },
  {
    type: "boost",
    name: "Boost",
    color: 0x8b4513,
    description: "Random buff/debuff",
  },
  {
    type: "portal",
    name: "Portal",
    color: 0x9b59b6,
    description: "Teleports to paired portal",
  },
  {
    type: "chaos",
    name: "Chaos",
    color: 0x4a2c1a,
    description: "Randomizes ball direction",
  },
];

const DEFAULT_COLORS = [
  0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xffa07a, 0x98d8c8, 0xf7dc6f, 0xbb8fce,
  0x85c1e2, 0xff9ff3, 0x54a0ff, 0x5f27cd, 0x00d2d3, 0xff6348, 0xffa502,
  0xff3838, 0xff9ff3,
];

const STORAGE_KEY = "brickBreaker_levelEditor_workingCopy";

export function LevelEditor({
  onTestLevel,
  onReturnFromTest,
  onBackToGame,
}: LevelEditorProps) {
  // Load from localStorage on mount
  const loadFromStorage = (): LevelData | null => {
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

  // Save to localStorage
  const saveToStorage = (data: LevelData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  };

  // Clean up invalid bricks (e.g., non-portal bricks with portal IDs, invalid positions)
  // Defined as regular function so it can be used in useState initializer
  const cleanBricks = (
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

  const [levelData, setLevelData] = useState<LevelData>(() => {
    const stored = loadFromStorage();
    const initialData = stored || {
      name: "New Level",
      width: 10,
      height: 8,
      bricks: [],
      backgroundColor: 0x1a1a2e,
      brickWidth: 90,
      brickHeight: 30,
      padding: 5,
    };

    // Clean up any invalid bricks on load
    if (stored) {
      const cleanedBricks = cleanBricks(
        initialData.bricks,
        initialData.width,
        initialData.height
      );
      if (cleanedBricks.length !== initialData.bricks.length) {
        console.log(
          `[LevelEditor] Cleaned ${
            initialData.bricks.length - cleanedBricks.length
          } invalid bricks on load`
        );
        initialData.bricks = cleanedBricks;
      }
    }

    return initialData;
  });

  const [selectedBrickType, setSelectedBrickType] =
    useState<BrickType>("default");
  const [selectedColor, setSelectedColor] = useState<number>(DEFAULT_COLORS[0]);
  const [selectedBrick, setSelectedBrick] = useState<BrickData | null>(null);
  const [brushMode, setBrushMode] = useState<"paint" | "erase">("paint");

  // Drag state for placing bricks (including fuses)
  const [isFuseMode, setIsFuseMode] = useState(false);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    brickType: BrickType;
    startCol: number;
    startRow: number;
    lastCol: number;
    lastRow: number;
    path: Array<{ col: number; row: number }>;
  } | null>(null);

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

  const padding = 5;

  // Calculate dynamic cell size based on grid dimensions
  // Max size is 90x30, but scales down for larger grids
  const maxCellWidth = 90;
  const maxCellHeight = 30;
  const minCellWidth = 25;
  const minCellHeight = 10;

  // State for window dimensions to recalculate on resize
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 600,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate available space (accounting for sidebar ~300px and padding)
  const availableWidth = windowSize.width - 400;
  const availableHeight = windowSize.height - 250;

  // Calculate cell size - scale down for larger grids
  const calculatedWidth = Math.max(
    minCellWidth,
    Math.min(maxCellWidth, availableWidth / levelData.width - padding)
  );
  const calculatedHeight = Math.max(
    minCellHeight,
    Math.min(maxCellHeight, availableHeight / levelData.height - padding)
  );

  // Use calculated size or maintain aspect ratio
  const brickWidth = Math.min(calculatedWidth, calculatedHeight * 3);
  const brickHeight = brickWidth / 3;

  // Auto-save to localStorage whenever levelData or brick dimensions change
  useEffect(() => {
    // Clean bricks before saving to prevent ghost blocks
    const cleanedBricks = cleanBricks(
      levelData.bricks,
      levelData.width,
      levelData.height
    );

    // If bricks were cleaned, update state first (this will trigger this effect again, but with clean data)
    if (cleanedBricks.length !== levelData.bricks.length) {
      setLevelData((prev) => ({
        ...prev,
        bricks: cleanedBricks,
      }));
      return; // Exit early, will save on next render with cleaned data
    }

    // Ensure brick dimensions are always saved
    const dataToSave = {
      ...levelData,
      brickWidth: brickWidth,
      brickHeight: brickHeight,
      padding: padding,
    };
    saveToStorage(dataToSave);
  }, [levelData, brickWidth, brickHeight, padding]);

  const getBrickAtPosition = useCallback(
    (col: number, row: number): BrickData | null => {
      // First try to find by grid coordinates (most reliable)
      const byGrid = levelData.bricks.find(
        (b) => b.col === col && b.row === row
      );
      if (byGrid) return byGrid;

      // Fallback to position-based lookup for backwards compatibility
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

  const handleEraseBrick = useCallback((col: number, row: number) => {
    setLevelData((prev) => {
      const brickToErase = prev.bricks.find(
        (b) => b.col === col && b.row === row
      );

      // If erasing a portal, also remove its pair
      if (brickToErase?.type === "portal" && brickToErase.id) {
        return {
          ...prev,
          bricks: prev.bricks.filter(
            (b) => !(b.col === col && b.row === row) && b.id !== brickToErase.id
          ),
        };
      }

      // Otherwise, just remove the clicked brick
      return {
        ...prev,
        bricks: prev.bricks.filter((b) => !(b.col === col && b.row === row)),
      };
    });
  }, []);

  const handleCellRightClick = useCallback(
    (e: React.MouseEvent, col: number, row: number) => {
      e.preventDefault(); // Prevent context menu
      handleEraseBrick(col, row);
    },
    [handleEraseBrick]
  );

  // Helper to calculate pixel position from grid coordinates using stored dimensions
  const calculatePositionFromGrid = useCallback(
    (
      col: number,
      row: number,
      refWidth: number,
      refHeight: number,
      refPadding: number
    ) => {
      const x = col * (refWidth + refPadding) + refWidth / 2;
      const y = row * (refHeight + refPadding) + refHeight / 2;
      return { x, y };
    },
    []
  );

  // Handle drag end for all brick types
  useEffect(() => {
    const handleMouseUp = () => {
      if (dragState?.isDragging) {
        const { path, brickType } = dragState;

        // Check if this is a fuse type
        const isFuseType =
          brickType === "fuse-horizontal" ||
          brickType === "fuse-vertical" ||
          brickType === "fuse-left-up" ||
          brickType === "fuse-right-up" ||
          brickType === "fuse-left-down" ||
          brickType === "fuse-right-down";

        if (path.length === 0) {
          setDragState(null);
          return;
        }

        // For fuse types, use complex logic to determine the correct fuse type
        if (isFuseType) {
          // Determine fuse types for each cell in the path
          const fuseBricks: Array<{
            col: number;
            row: number;
            type: BrickType;
          }> = [];

          for (let i = 0; i < path.length; i++) {
            const current = path[i];
            const prev = i > 0 ? path[i - 1] : null;
            const next = i < path.length - 1 ? path[i + 1] : null;

            if (!prev && !next) {
              // Single cell - use horizontal as default
              fuseBricks.push({ ...current, type: "fuse-horizontal" });
              continue;
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
              const nextIsHorizontal =
                nextColChange !== 0 && nextRowChange === 0;
              const prevIsVertical = colChange === 0 && rowChange !== 0;
              const nextIsVertical = nextColChange === 0 && nextRowChange !== 0;

              if (prevIsHorizontal && nextIsVertical) {
                // Horizontal to vertical - corner fuse
                // colChange > 0 means we came from left, colChange < 0 means we came from right
                // nextRowChange < 0 means going up, nextRowChange > 0 means going down
                if (colChange > 0 && nextRowChange < 0) {
                  // Came from left, going up -> fuse-left-up
                  fuseType = "fuse-left-up";
                } else if (colChange > 0 && nextRowChange > 0) {
                  // Came from left, going down -> fuse-left-down
                  fuseType = "fuse-left-down";
                } else if (colChange < 0 && nextRowChange < 0) {
                  // Came from right, going up -> fuse-right-up
                  fuseType = "fuse-right-up";
                } else {
                  // Came from right, going down -> fuse-right-down
                  fuseType = "fuse-right-down";
                }
              } else if (prevIsVertical && nextIsHorizontal) {
                // Vertical to horizontal - corner fuse
                // rowChange < 0 means current.row < prev.row (moved up, came from below)
                // rowChange > 0 means current.row > prev.row (moved down, came from above)
                // nextColChange > 0 means going right, nextColChange < 0 means going left
                if (rowChange < 0 && nextColChange > 0) {
                  // Came from below, going right -> need connection down and right -> fuse-right-down
                  fuseType = "fuse-right-down";
                } else if (rowChange < 0 && nextColChange < 0) {
                  // Came from below, going left -> need connection down and left -> fuse-left-down
                  fuseType = "fuse-left-down";
                } else if (rowChange > 0 && nextColChange > 0) {
                  // Came from above, going right -> need connection up and right -> fuse-right-up
                  fuseType = "fuse-right-up";
                } else {
                  // Came from above, going left -> need connection up and left -> fuse-left-up
                  fuseType = "fuse-left-up";
                }
              } else if (prevIsHorizontal && nextIsHorizontal) {
                fuseType = "fuse-horizontal";
              } else if (prevIsVertical && nextIsVertical) {
                fuseType = "fuse-vertical";
              } else {
                // Default to horizontal
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

            fuseBricks.push({ ...current, type: fuseType });
          }

          // Place all fuse bricks
          const refWidth = levelData.brickWidth || brickWidth;
          const refHeight = levelData.brickHeight || brickHeight;
          const refPadding = levelData.padding || padding;

          const newBricks: BrickData[] = fuseBricks.map(
            ({ col, row, type }) => {
              const { x, y } = calculatePositionFromGrid(
                col,
                row,
                refWidth,
                refHeight,
                refPadding
              );

              return {
                x,
                y,
                col,
                row,
                health: 1,
                maxHealth: 1,
                color: 0x00ff00,
                dropChance: 0.15,
                coinValue: (row + 1) * 2,
                type,
              };
            }
          );

          setLevelData((prev) => ({
            ...prev,
            // Remove existing bricks at these positions (including non-fuse bricks)
            bricks: [
              ...prev.bricks.filter(
                (b) =>
                  !fuseBricks.some((fb) => fb.col === b.col && fb.row === b.row)
              ),
              ...newBricks,
            ],
            brickWidth: prev.brickWidth || brickWidth,
            brickHeight: prev.brickHeight || brickHeight,
            padding: prev.padding || padding,
          }));

          setDragState(null);
          return;
        }

        // For regular bricks, just place them at each cell in the path
        if (!isFuseType) {
          const refWidth = levelData.brickWidth || brickWidth;
          const refHeight = levelData.brickHeight || brickHeight;
          const refPadding = levelData.padding || padding;

          // Filter out positions that are outside the grid bounds
          const validPath = path.filter(
            ({ col, row }) =>
              col >= 0 &&
              col < levelData.width &&
              row >= 0 &&
              row < levelData.height
          );

          // Remove duplicates from path (same col/row)
          const uniquePath = validPath.filter(
            (point, index, self) =>
              index ===
              self.findIndex((p) => p.col === point.col && p.row === point.row)
          );

          // Handle portal pairing logic ONCE for the entire drag operation
          // Count how many portals are being placed in this drag
          const portalsInPath = brickType === "portal" ? uniquePath.length : 0;
          let portalPairIds: (string | undefined)[] = [];

          if (brickType === "portal" && portalsInPath > 0) {
            // Count existing portals in levelData
            const portalIdCounts = new Map<string, number>();
            levelData.bricks
              .filter((b) => b.type === "portal" && b.id)
              .forEach((b) => {
                const count = portalIdCounts.get(b.id!) || 0;
                portalIdCounts.set(b.id!, count + 1);
              });

            // Find unpaired portals
            const unpairedPortalIds: string[] = [];
            for (const [id, count] of portalIdCounts.entries()) {
              if (count === 1) {
                unpairedPortalIds.push(id);
              }
            }

            // Assign portal IDs: pair new portals together, or link to existing unpaired ones
            for (let i = 0; i < portalsInPath; i++) {
              if (i < unpairedPortalIds.length) {
                // Link to existing unpaired portal
                portalPairIds.push(unpairedPortalIds[i]);
              } else {
                // Create new pair - portals in pairs get the same ID
                const isFirstInPair = (i - unpairedPortalIds.length) % 2 === 0;
                if (isFirstInPair) {
                  // First portal in new pair - create new ID
                  const newPairId = `portal_${Date.now()}_${Math.random()
                    .toString(36)
                    .substr(2, 9)}`;
                  portalPairIds.push(newPairId);
                } else {
                  // Second portal in pair - use the ID from the previous portal
                  portalPairIds.push(portalPairIds[portalPairIds.length - 1]);
                }
              }
            }
          }

          // Validate that portalPairIds array matches uniquePath length for portals
          if (
            brickType === "portal" &&
            portalPairIds.length !== uniquePath.length
          ) {
            console.error("[LevelEditor] Portal ID count mismatch:", {
              uniquePathLength: uniquePath.length,
              portalPairIdsLength: portalPairIds.length,
            });
            // Fix the mismatch by extending or truncating
            while (portalPairIds.length < uniquePath.length) {
              const isFirstInPair = portalPairIds.length % 2 === 0;
              if (isFirstInPair) {
                const newPairId = `portal_${Date.now()}_${Math.random()
                  .toString(36)
                  .substr(2, 9)}`;
                portalPairIds.push(newPairId);
              } else {
                portalPairIds.push(portalPairIds[portalPairIds.length - 1]);
              }
            }
            portalPairIds = portalPairIds.slice(0, uniquePath.length);
          }

          const newBricks: BrickData[] = uniquePath
            .map(({ col, row }, index) => {
              // Double-check bounds
              if (
                col < 0 ||
                col >= levelData.width ||
                row < 0 ||
                row >= levelData.height
              ) {
                return null;
              }

              const { x, y } = calculatePositionFromGrid(
                col,
                row,
                refWidth,
                refHeight,
                refPadding
              );

              // Ensure all required fields are valid
              if (
                isNaN(x) ||
                isNaN(y) ||
                isNaN(col) ||
                isNaN(row) ||
                col === undefined ||
                row === undefined
              ) {
                console.error("[LevelEditor] Invalid brick data:", {
                  col,
                  row,
                  x,
                  y,
                  brickType,
                });
                return null;
              }

              const brick: BrickData = {
                x,
                y,
                col,
                row,
                health:
                  brickType === "default"
                    ? 1
                    : brickType === "metal"
                    ? 5
                    : brickType === "gold"
                    ? 3
                    : brickType === "boost"
                    ? 1
                    : brickType === "portal"
                    ? 1
                    : brickType === "unbreakable"
                    ? 999
                    : 1,
                maxHealth:
                  brickType === "default"
                    ? 1
                    : brickType === "metal"
                    ? 5
                    : brickType === "gold"
                    ? 3
                    : brickType === "boost"
                    ? 1
                    : brickType === "portal"
                    ? 1
                    : brickType === "unbreakable"
                    ? 999
                    : 1,
                color:
                  brickType === "default"
                    ? selectedColor
                    : BRICK_TYPES.find((t) => t.type === brickType)?.color ||
                      selectedColor,
                dropChance: 0.15,
                coinValue: brickType === "gold" ? 10 : (row + 1) * 2,
                type: brickType,
                // Only assign portal IDs to portal bricks
                id:
                  brickType === "portal" && portalPairIds[index]
                    ? portalPairIds[index]
                    : undefined,
              };

              return brick;
            })
            .filter((b): b is BrickData => b !== null);

          setLevelData((prev) => {
            // Create a set of positions being replaced for efficient lookup
            const positionsToReplace = new Set(
              uniquePath.map((p) => `${p.col},${p.row}`)
            );

            return {
              ...prev,
              bricks: [
                // Remove bricks at positions being replaced
                ...prev.bricks.filter(
                  (b) =>
                    b.col !== undefined &&
                    b.row !== undefined &&
                    !positionsToReplace.has(`${b.col},${b.row}`)
                ),
                // Add new bricks (already validated)
                ...newBricks,
              ],
              brickWidth: prev.brickWidth || brickWidth,
              brickHeight: prev.brickHeight || brickHeight,
              padding: prev.padding || padding,
            };
          });

          setDragState(null);
        }
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
    calculatePositionFromGrid,
    selectedColor,
  ]);

  const handleCellClick = useCallback(
    (col: number, row: number) => {
      // Don't handle clicks in fuse mode - fuse mode uses drag
      if (isFuseMode) {
        return;
      }

      if (brushMode === "erase") {
        handleEraseBrick(col, row);
        return;
      }

      const existingBrick = getBrickAtPosition(col, row);

      if (existingBrick) {
        setSelectedBrick(existingBrick);
        return;
      }

      // Use stored dimensions or current dimensions for position calculation
      const refWidth = levelData.brickWidth || brickWidth;
      const refHeight = levelData.brickHeight || brickHeight;
      const refPadding = levelData.padding || padding;

      // Calculate position using reference dimensions (not current dynamic size)
      const { x, y } = calculatePositionFromGrid(
        col,
        row,
        refWidth,
        refHeight,
        refPadding
      );

      // Handle portal pairing logic
      let portalPairId: string | undefined = undefined;
      if (selectedBrickType === "portal") {
        // Check if there's an unpaired portal (a portal with an ID that appears only once)
        const portalIdCounts = new Map<string, number>();
        levelData.bricks
          .filter((b) => b.type === "portal" && b.id)
          .forEach((b) => {
            const count = portalIdCounts.get(b.id!) || 0;
            portalIdCounts.set(b.id!, count + 1);
          });

        // Find an unpaired portal (ID that appears only once)
        let unpairedPortalId: string | undefined = undefined;
        for (const [id, count] of portalIdCounts.entries()) {
          if (count === 1) {
            unpairedPortalId = id;
            break;
          }
        }

        // If there's an unpaired portal, link to it; otherwise create a new pair ID
        portalPairId =
          unpairedPortalId ||
          `portal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      const newBrick: BrickData = {
        x,
        y,
        col, // Store grid coordinates for reliable positioning
        row,
        health:
          selectedBrickType === "default"
            ? 1
            : selectedBrickType === "metal"
            ? 5
            : selectedBrickType === "gold"
            ? 3
            : selectedBrickType === "boost"
            ? 1
            : selectedBrickType === "portal"
            ? 1
            : selectedBrickType === "unbreakable"
            ? 999
            : 1,
        maxHealth:
          selectedBrickType === "default"
            ? 1
            : selectedBrickType === "metal"
            ? 5
            : selectedBrickType === "gold"
            ? 3
            : selectedBrickType === "boost"
            ? 1
            : selectedBrickType === "portal"
            ? 1
            : selectedBrickType === "unbreakable"
            ? 999
            : 1,
        color:
          selectedBrickType === "default"
            ? selectedColor
            : BRICK_TYPES.find((t) => t.type === selectedBrickType)?.color ||
              selectedColor,
        dropChance: 0.15,
        coinValue: selectedBrickType === "gold" ? 10 : (row + 1) * 2,
        type: selectedBrickType,
        id: selectedBrickType === "portal" ? portalPairId : undefined,
      };

      console.log("[LevelEditor] Creating brick:", {
        col,
        row,
        position: { x, y },
        storedDimensions: { refWidth, refHeight, refPadding },
        currentDimensions: { brickWidth, brickHeight, padding },
        brick: newBrick,
        portalPairId: selectedBrickType === "portal" ? portalPairId : undefined,
      });

      setLevelData((prev) => ({
        ...prev,
        bricks: [...prev.bricks, newBrick],
        // Store reference dimensions (use stored if exists, otherwise current)
        brickWidth: prev.brickWidth || brickWidth,
        brickHeight: prev.brickHeight || brickHeight,
        padding: prev.padding || padding,
      }));
    },
    [
      brushMode,
      selectedBrickType,
      selectedColor,
      getBrickAtPosition,
      brickWidth,
      brickHeight,
      padding,
      handleEraseBrick,
      calculatePositionFromGrid,
      levelData.brickWidth,
      levelData.brickHeight,
      levelData.padding,
      levelData.bricks,
      isFuseMode,
    ]
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
      <div className="editor-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {onBackToGame && (
            <button
              onClick={onBackToGame}
              className="btn btn-secondary"
              style={{ marginRight: "10px" }}
              title="Return to main menu"
            >
              ← Back to Game
            </button>
          )}
          <h1>Level Editor</h1>
        </div>
        <div className="header-actions">
          <input
            type="text"
            value={levelData.name}
            onChange={(e) =>
              setLevelData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="level-name-input"
            placeholder="Level Name"
          />
          <button
            onClick={() => {
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
            className="btn btn-primary"
            disabled={levelData.bricks.length === 0}
            title={
              levelData.bricks.length === 0
                ? "Add some bricks first!"
                : "Test your level in the game"
            }
          >
            Test Level
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            title="Save level to local storage"
          >
            Save
          </button>
          <button
            onClick={handleExport}
            className="btn btn-primary"
            title="Export level as JSON file"
          >
            Export Level
          </button>
          <label
            className="btn btn-secondary"
            title="Import level from JSON file"
          >
            Import Level
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: "none" }}
            />
          </label>
          <button
            onClick={clearLevel}
            className="btn btn-danger"
            title="Clear all bricks and reset level"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="editor-sidebar">
          <div className="sidebar-section">
            <h3>Brick Types</h3>
            <div className="brick-type-grid">
              {BRICK_TYPES.map((type) => (
                <button
                  key={type.type}
                  className={`brick-type-preview brick ${type.type} ${
                    type.type === "fuse-horizontal"
                      ? isFuseMode
                        ? "active"
                        : ""
                      : selectedBrickType === type.type
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    if (type.type === "fuse-horizontal") {
                      setIsFuseMode(!isFuseMode);
                      if (!isFuseMode) {
                        setSelectedBrickType("default");
                      }
                    } else {
                      setSelectedBrickType(type.type);
                      setIsFuseMode(false);
                    }
                  }}
                  title={`${type.name}: ${type.description}`}
                >
                  <div className="brick-preview-content">
                    {type.type === "tnt" && <div className="tnt-fuse"></div>}
                    {type.type === "fuse-horizontal" && (
                      <div className="fuse-link"></div>
                    )}
                    {type.type === "gold" && <div className="gold-shine"></div>}
                    {type.type === "boost" && (
                      <div className="boost-chest"></div>
                    )}
                    {type.type === "portal" && (
                      <div className="portal-core"></div>
                    )}
                    {type.type === "unbreakable" && (
                      <div className="shield-pattern"></div>
                    )}
                    {type.type === "metal" && (
                      <div className="metal-rivets"></div>
                    )}
                    {/* Chaos uses ::before and ::after pseudo-elements only, no div needed */}
                  </div>
                  <div className="brick-preview-label">{type.name}</div>
                </button>
              ))}
            </div>
          </div>

          {isFuseMode && (
            <div className="sidebar-section">
              <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>
                Click and drag to place fuses. The system will automatically
                choose the correct fuse type based on your drag direction.
              </p>
            </div>
          )}

          {selectedBrickType === "default" && (
            <div className="sidebar-section">
              <h3>Color Picker</h3>
              <div className="color-picker">
                {DEFAULT_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    className={`color-swatch ${
                      selectedColor === color ? "active" : ""
                    }`}
                    style={{
                      backgroundColor: `#${color
                        .toString(16)
                        .padStart(6, "0")}`,
                    }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="sidebar-section">
            <h3>Tools</h3>
            <div className="tool-buttons">
              <button
                className={`btn ${
                  brushMode === "paint" ? "btn-primary" : "btn-secondary"
                }`}
                onClick={() => setBrushMode("paint")}
              >
                Paint
              </button>
              <button
                className={`btn ${
                  brushMode === "erase" ? "btn-danger" : "btn-secondary"
                }`}
                onClick={() => setBrushMode("erase")}
              >
                Erase
              </button>
            </div>
          </div>

          {selectedBrick && (
            <div className="sidebar-section">
              <h3>Edit Brick</h3>
              <div className="brick-properties">
                <label>Type: {selectedBrick.type}</label>
                {selectedBrick.type === "default" && (
                  <label>
                    Color:
                    <input
                      type="color"
                      value={`#${selectedBrick.color
                        .toString(16)
                        .padStart(6, "0")}`}
                      onChange={(e) => {
                        const newColor = parseInt(e.target.value.slice(1), 16);
                        updateBrick(selectedBrick, { color: newColor });
                      }}
                    />
                  </label>
                )}
                <label>
                  Drop Chance:
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedBrick.dropChance}
                    onChange={(e) =>
                      updateBrick(selectedBrick, {
                        dropChance: parseFloat(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Coin Value:
                  <input
                    type="number"
                    min="0"
                    value={selectedBrick.coinValue}
                    onChange={(e) =>
                      updateBrick(selectedBrick, {
                        coinValue: parseInt(e.target.value),
                      })
                    }
                  />
                </label>
                <button
                  onClick={() => setSelectedBrick(null)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <div className="sidebar-section">
            <h3>Grid Size</h3>
            <div className="grid-size-controls">
              <label>
                Width:
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={levelData.width}
                  onChange={(e) => {
                    const newWidth = parseInt(e.target.value) || 10;
                    setLevelData((prev) => {
                      // Remove bricks outside new bounds
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
                  className="size-input"
                />
              </label>
              <label>
                Height:
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={levelData.height}
                  onChange={(e) => {
                    const newHeight = parseInt(e.target.value) || 8;
                    setLevelData((prev) => {
                      // Remove bricks outside new bounds
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
                  className="size-input"
                />
              </label>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Level Stats</h3>
            <div className="level-stats">
              <div>Total Bricks: {levelData.bricks.length}</div>
              <div>
                Default:{" "}
                {levelData.bricks.filter((b) => b.type === "default").length}
              </div>
              <div>
                Metal:{" "}
                {levelData.bricks.filter((b) => b.type === "metal").length}
              </div>
              <div>
                Unbreakable:{" "}
                {
                  levelData.bricks.filter((b) => b.type === "unbreakable")
                    .length
                }
              </div>
              <div>
                TNT: {levelData.bricks.filter((b) => b.type === "tnt").length}
              </div>
              <div>
                Fuse:{" "}
                {
                  levelData.bricks.filter(
                    (b) =>
                      b.type === "fuse-horizontal" ||
                      b.type === "fuse-left-up" ||
                      b.type === "fuse-right-up" ||
                      b.type === "fuse-left-down" ||
                      b.type === "fuse-right-down" ||
                      b.type === "fuse-vertical"
                  ).length
                }
              </div>
            </div>
          </div>
        </div>

        <div className="editor-canvas">
          <div className="canvas-wrapper">
            <div
              className="canvas-grid"
              style={
                {
                  gridTemplateColumns: `repeat(${levelData.width}, 1fr)`,
                  "--grid-width": levelData.width.toString(),
                  "--grid-height": levelData.height.toString(),
                  "--cell-width": `${brickWidth}px`,
                  "--cell-height": `${brickHeight}px`,
                } as React.CSSProperties
              }
            >
              {Array.from({ length: levelData.height }).map((_, row) =>
                Array.from({ length: levelData.width }).map((_, col) => {
                  const brick = getBrickAtPosition(col, row);
                  const isInDragPath =
                    dragState?.path.some(
                      (p: { col: number; row: number }) =>
                        p.col === col && p.row === row
                    ) || false;

                  return (
                    <div
                      key={`${col}-${row}`}
                      className={`grid-cell ${brick ? "has-brick" : ""} ${
                        brick?.type || ""
                      } ${isInDragPath ? "drag-path-preview" : ""}`}
                      style={{
                        backgroundColor: brick
                          ? `#${brick.color.toString(16).padStart(6, "0")}`
                          : isInDragPath
                          ? dragState?.brickType === "fuse-horizontal" ||
                            dragState?.brickType === "fuse-vertical" ||
                            dragState?.brickType === "fuse-left-up" ||
                            dragState?.brickType === "fuse-right-up" ||
                            dragState?.brickType === "fuse-left-down" ||
                            dragState?.brickType === "fuse-right-down"
                            ? "rgba(0, 255, 0, 0.2)"
                            : "rgba(255, 255, 255, 0.1)"
                          : "transparent",
                        border: brick
                          ? "2px solid #fff"
                          : isInDragPath
                          ? dragState?.brickType === "fuse-horizontal" ||
                            dragState?.brickType === "fuse-vertical" ||
                            dragState?.brickType === "fuse-left-up" ||
                            dragState?.brickType === "fuse-right-up" ||
                            dragState?.brickType === "fuse-left-down" ||
                            dragState?.brickType === "fuse-right-down"
                            ? "2px solid #00ff00"
                            : "2px solid #fff"
                          : "1px solid #333",
                      }}
                      onClick={() => {
                        if (!dragState?.isDragging) {
                          handleCellClick(col, row);
                        }
                      }}
                      onMouseDown={(e) => {
                        if (
                          brushMode === "paint" &&
                          selectedBrickType !== "boost" &&
                          selectedBrickType !== "portal" &&
                          !brick
                        ) {
                          e.preventDefault();
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
                            path: [{ col, row }],
                          });
                        }
                      }}
                      onMouseEnter={() => {
                        if (
                          dragState?.isDragging &&
                          brushMode === "paint" &&
                          selectedBrickType !== "boost" &&
                          selectedBrickType !== "portal" &&
                          // Only add if within grid bounds
                          col >= 0 &&
                          col < levelData.width &&
                          row >= 0 &&
                          row < levelData.height
                        ) {
                          setDragState((prev) => {
                            if (!prev) return null;
                            const newPath = [...prev.path];
                            const lastPoint = newPath[newPath.length - 1];
                            // Only add if it's a different position and not already in path
                            if (
                              (lastPoint.col !== col ||
                                lastPoint.row !== row) &&
                              !newPath.some(
                                (p) => p.col === col && p.row === row
                              )
                            ) {
                              newPath.push({ col, row });
                            }
                            return {
                              ...prev,
                              lastCol: col,
                              lastRow: row,
                              path: newPath,
                            };
                          });
                        }
                      }}
                      onContextMenu={(e) => handleCellRightClick(e, col, row)}
                      title={
                        brick
                          ? `${brick.type} - ${brick.health}HP`
                          : "Empty (Right-click to remove)"
                      }
                    >
                      {brick && (
                        <Brick
                          brickData={brick}
                          width={brickWidth}
                          height={brickHeight}
                          mode="editor"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
