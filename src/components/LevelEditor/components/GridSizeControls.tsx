import { LevelData } from "../../../game/types";

interface GridSizeControlsProps {
  levelData: LevelData;
  brickWidth: number;
  brickHeight: number;
  padding: number;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
}

export function GridSizeControls({
  levelData,
  brickWidth,
  brickHeight,
  padding,
  onWidthChange,
  onHeightChange,
}: GridSizeControlsProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: "#ffffff",
          }}
        >
          W:
          <input
            type="number"
            min="5"
            max="50"
            value={levelData.width}
            onChange={(e) => {
              const newWidth = parseInt(e.target.value) || 10;
              const maxX =
                (newWidth - 1) * (brickWidth + padding) + brickWidth / 2;
              onWidthChange(newWidth);
            }}
            style={{
              width: "50px",
              padding: "4px 6px",
              background: "#2a2a2a",
              border: "1px solid #e63946",
              borderRadius: "4px",
              color: "#ffffff",
              fontSize: "12px",
            }}
          />
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: "#ffffff",
          }}
        >
          H:
          <input
            type="number"
            min="3"
            max="30"
            value={levelData.height}
            onChange={(e) => {
              const newHeight = parseInt(e.target.value) || 8;
              const maxY =
                (newHeight - 1) * (brickHeight + padding) + brickHeight / 2;
              onHeightChange(newHeight);
            }}
            style={{
              width: "50px",
              padding: "4px 6px",
              background: "#2a2a2a",
              border: "1px solid #e63946",
              borderRadius: "4px",
              color: "#ffffff",
              fontSize: "12px",
            }}
          />
        </label>
    </div>
  );
}

