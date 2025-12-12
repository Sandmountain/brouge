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
    name: "Fuse Horizontal",
    color: 0x00ff00,
    description: "Horizontal fuse line",
  },
  {
    type: "fuse-left-up",
    name: "Fuse Left-Up",
    color: 0x00ff00,
    description: "Horizontal left + vertical up",
  },
  {
    type: "fuse-right-up",
    name: "Fuse Right-Up",
    color: 0x00ff00,
    description: "Horizontal right + vertical up",
  },
  {
    type: "fuse-left-down",
    name: "Fuse Left-Down",
    color: 0x00ff00,
    description: "Horizontal left + vertical down",
  },
  {
    type: "fuse-right-down",
    name: "Fuse Right-Down",
    color: 0x00ff00,
    description: "Horizontal right + vertical down",
  },
  {
    type: "fuse-vertical",
    name: "Fuse Vertical",
    color: 0x00ff00,
    description: "Vertical fuse line",
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

  const [levelData, setLevelData] = useState<LevelData>(() => {
    const stored = loadFromStorage();
    return (
      stored || {
        name: "New Level",
        width: 10,
        height: 8,
        bricks: [],
        backgroundColor: 0x1a1a2e,
        brickWidth: 90,
        brickHeight: 30,
        padding: 5,
      }
    );
  });

  const [selectedBrickType, setSelectedBrickType] =
    useState<BrickType>("default");
  const [selectedColor, setSelectedColor] = useState<number>(DEFAULT_COLORS[0]);
  const [selectedBrick, setSelectedBrick] = useState<BrickData | null>(null);
  const [brushMode, setBrushMode] = useState<"paint" | "erase">("paint");

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

  const handleCellClick = useCallback(
    (col: number, row: number) => {
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
        id:
          selectedBrickType === "portal"
            ? portalPairId
            : undefined,
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
                  className={`brick-type-preview ${type.type} ${
                    selectedBrickType === type.type ? "active" : ""
                  }`}
                  onClick={() => setSelectedBrickType(type.type)}
                  title={`${type.name}: ${type.description}`}
                >
                  <div className="brick-preview-content">
                    {type.type === "tnt" && <div className="tnt-fuse"></div>}
                    {(type.type === "fuse-horizontal" ||
                      type.type === "fuse-left-up" ||
                      type.type === "fuse-right-up" ||
                      type.type === "fuse-left-down" ||
                      type.type === "fuse-right-down" ||
                      type.type === "fuse-vertical") && (
                      <div className={`fuse-link fuse-link-${type.type.replace("fuse-", "")}`}></div>
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
                {levelData.bricks.filter(
                  (b) =>
                    b.type === "fuse-horizontal" ||
                    b.type === "fuse-left-up" ||
                    b.type === "fuse-right-up" ||
                    b.type === "fuse-left-down" ||
                    b.type === "fuse-right-down" ||
                    b.type === "fuse-vertical"
                ).length}
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

                  return (
                    <div
                      key={`${col}-${row}`}
                      className={`grid-cell ${brick ? "has-brick" : ""} ${
                        brick?.type || ""
                      }`}
                      style={{
                        backgroundColor: brick
                          ? `#${brick.color.toString(16).padStart(6, "0")}`
                          : "transparent",
                        border: brick ? "2px solid #fff" : "1px solid #333",
                      }}
                      onClick={() => handleCellClick(col, row)}
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
