import { useState, useRef, useEffect } from "react";
import { BrickType, LevelData } from "../../../game/types";
import { BRICK_TYPES, DEFAULT_COLORS } from "../constants";

interface BrickTypeDropdownProps {
  selectedBrickType: BrickType;
  selectedColor: number;
  isFuseMode: boolean;
  levelData: LevelData;
  onBrickTypeSelect: (type: BrickType) => void;
  onFuseModeToggle: () => void;
  onColorSelect: (color: number) => void;
}

export function BrickTypeDropdown({
  selectedBrickType,
  selectedColor,
  isFuseMode,
  levelData,
  onBrickTypeSelect,
  onFuseModeToggle,
  onColorSelect,
}: BrickTypeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node)
      ) {
        setIsColorPickerOpen(false);
      }
    };

    if (isOpen || isColorPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, isColorPickerOpen]);

  // Extract unique colors from bricks in the level
  const usedColors = Array.from(
    new Set(
      levelData.bricks
        .filter((brick) => brick.type === "default")
        .map((brick) => brick.color)
    )
  ).sort((a, b) => a - b);

  const showColorPicker = selectedBrickType === "default" && !isFuseMode;

  // Find the currently selected brick type info
  const currentBrickType =
    BRICK_TYPES.find(
      (bt) =>
        (bt.type === "fuse-horizontal" && isFuseMode) ||
        (bt.type === selectedBrickType && !isFuseMode)
    ) || BRICK_TYPES[0];

  const colorHex = `#${selectedColor.toString(16).padStart(6, "0")}`;

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {/* Brick type dropdown */}
      <div
        ref={dropdownRef}
        style={{
          position: "relative",
          display: "inline-block",
        }}
      >
        <button
          className="toolbar-button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 8px",
            minWidth: "auto",
            width: "auto",
          }}
          title={`Selected: ${currentBrickType.name}`}
        >
          {/* Current brick preview square */}
          <div
            className={`brick-type-preview brick ${currentBrickType.type} ${
              isFuseMode || selectedBrickType === currentBrickType.type
                ? "active"
                : ""
            }`}
            style={{
              width: "24px",
              height: "24px",
              minWidth: "24px",
              minHeight: "24px",
              maxWidth: "24px",
              maxHeight: "24px",
              backgroundColor:
                currentBrickType.type === "default" ? colorHex : undefined,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              flexShrink: 0,
              flexGrow: 0,
              aspectRatio: "1",
            }}
          >
            <div
              className="brick-preview-content"
              style={{ width: "100%", height: "100%" }}
            >
              {currentBrickType.type === "tnt" && (
                <div className="tnt-fuse"></div>
              )}
              {currentBrickType.type === "fuse-horizontal" && (
                <div className="fuse-link"></div>
              )}
              {currentBrickType.type === "gold" && (
                <div className="gold-shine"></div>
              )}
              {currentBrickType.type === "boost" && (
                <div className="boost-chest"></div>
              )}
              {currentBrickType.type === "portal" && (
                <div className="portal-core"></div>
              )}
              {currentBrickType.type === "unbreakable" && (
                <div className="shield-pattern"></div>
              )}
              {currentBrickType.type === "metal" && (
                <div className="metal-rivets"></div>
              )}
            </div>
          </div>
          {/* Dropdown arrow */}
          <span
            className="material-icons"
            style={{
              fontSize: "16px",
              flexShrink: 0,
              display: "inline-block",
              transition: "transform 0.2s",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            arrow_drop_down
          </span>
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "4px",
              background: "#1a1a1a",
              border: "1px solid #e63946",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
              zIndex: 1000,
              minWidth: "160px",
              maxHeight: "400px",
              overflowY: "auto",
              padding: "6px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "4px",
              }}
            >
              {BRICK_TYPES.map((type) => {
                const typeColorHex = `#${selectedColor
                  .toString(16)
                  .padStart(6, "0")}`;
                const isActive =
                  type.type === "fuse-horizontal"
                    ? isFuseMode
                    : selectedBrickType === type.type;

                return (
                  <button
                    key={type.type}
                    className={`brick-type-preview brick ${type.type} ${
                      isActive ? "active" : ""
                    }`}
                    style={{
                      backgroundColor:
                        type.type === "default" ? typeColorHex : undefined,
                      width: "100%",
                      height: "32px",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "4px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (type.type === "fuse-horizontal") {
                        onFuseModeToggle();
                      } else {
                        onBrickTypeSelect(type.type);
                      }
                      setIsOpen(false);
                    }}
                    title={`${type.name}: ${type.description}`}
                  >
                    <div
                      className="brick-preview-content"
                      style={{ width: "100%", height: "100%" }}
                    >
                      {type.type === "tnt" && <div className="tnt-fuse"></div>}
                      {type.type === "fuse-horizontal" && (
                        <div className="fuse-link"></div>
                      )}
                      {type.type === "gold" && (
                        <div className="gold-shine"></div>
                      )}
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
                    </div>
                    <div
                      className="brick-preview-label"
                      style={{
                        fontSize: "8px",
                        marginTop: "2px",
                        textAlign: "center",
                      }}
                    >
                      {type.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Color picker square - only show for default bricks */}
      {showColorPicker && (
        <div
          ref={colorPickerRef}
          style={{
            position: "relative",
            display: "inline-block",
          }}
        >
          <button
            className="toolbar-button"
            onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              width: "32px",
              height: "32px",
            }}
            title="Select color"
          >
            {/* Color square */}
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: colorHex,

                borderRadius: "4px",
              }}
            />
          </button>

          {/* Color picker dropdown */}
          {isColorPickerOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: "4px",
                background: "#1a1a1a",
                border: "1px solid #e63946",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                zIndex: 1001,
                minWidth: "300px",
                maxHeight: "400px",
                overflowY: "auto",
                padding: "12px",
              }}
            >
              {usedColors.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#aaa",
                      marginBottom: "8px",
                    }}
                  >
                    Used in Level:
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px",
                    }}
                  >
                    {usedColors.map((color, idx) => {
                      const colorHex = `#${color
                        .toString(16)
                        .padStart(6, "0")}`;
                      return (
                        <button
                          key={`used-${color}-${idx}`}
                          onClick={() => {
                            onColorSelect(color);
                            setIsColorPickerOpen(false);
                          }}
                          style={{
                            width: "24px",
                            height: "24px",
                            backgroundColor: colorHex,
                            border:
                              selectedColor === color
                                ? "2px solid #e63946"
                                : "1px solid #666",
                            borderRadius: "4px",
                            cursor: "pointer",
                            boxShadow:
                              selectedColor === color
                                ? "0 0 8px rgba(230, 57, 70, 0.8)"
                                : "none",
                          }}
                          title={colorHex}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  gap: "4px",
                }}
              >
                {DEFAULT_COLORS.map((color, idx) => {
                  const colorHex = `#${color.toString(16).padStart(6, "0")}`;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        onColorSelect(color);
                        setIsColorPickerOpen(false);
                      }}
                      style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: colorHex,
                        border:
                          selectedColor === color
                            ? "2px solid #e63946"
                            : "1px solid #333",
                        borderRadius: "3px",
                        cursor: "pointer",
                        boxShadow:
                          selectedColor === color
                            ? "0 0 6px rgba(230, 57, 70, 0.8)"
                            : "none",
                      }}
                      title={colorHex}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
