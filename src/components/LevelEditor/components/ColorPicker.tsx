import { DEFAULT_COLORS } from "../constants";

interface ColorPickerProps {
  selectedColor: number;
  onColorSelect: (color: number) => void;
}

export function ColorPicker({
  selectedColor,
  onColorSelect,
}: ColorPickerProps) {
  return (
    <div className="sidebar-section">
      <h3>Color Picker</h3>
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

