import { DEFAULT_COLORS } from "../constants";
import { LevelData } from "../../../game/types";

interface ColorPickerProps {
  selectedColor: number;
  onColorSelect: (color: number) => void;
  levelData: LevelData;
}

export function ColorPicker({
  selectedColor,
  onColorSelect,
  levelData,
}: ColorPickerProps) {
  // Extract unique colors from bricks in the level
  const usedColors = Array.from(
    new Set(
      levelData.bricks
        .filter((brick) => brick.type === "default")
        .map((brick) => brick.color)
    )
  ).sort((a, b) => a - b);

  return (
    <div className="sidebar-section">
      <h3>Color Picker</h3>
      
      {usedColors.length > 0 && (
        <div className="used-colors-row">
          <div className="used-colors-label">Used in Level:</div>
          <div className="used-colors-list">
            {usedColors.map((color, idx) => (
              <button
                key={`used-${color}-${idx}`}
                className={`color-swatch-large ${
                  selectedColor === color ? "active" : ""
                }`}
                style={{
                  backgroundColor: `#${color.toString(16).padStart(6, "0")}`,
                }}
                onClick={() => onColorSelect(color)}
                title={`#${color.toString(16).padStart(6, "0")}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="color-picker">
        {DEFAULT_COLORS.map((color, idx) => (
          <button
            key={idx}
            className={`color-swatch ${selectedColor === color ? "active" : ""}`}
            style={{
              backgroundColor: `#${color.toString(16).padStart(6, "0")}`,
            }}
            onClick={() => onColorSelect(color)}
          />
        ))}
      </div>
    </div>
  );
}

