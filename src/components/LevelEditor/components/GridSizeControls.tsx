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
              const maxX =
                (newWidth - 1) * (brickWidth + padding) + brickWidth / 2;
              onWidthChange(newWidth);
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
              const maxY =
                (newHeight - 1) * (brickHeight + padding) + brickHeight / 2;
              onHeightChange(newHeight);
            }}
            className="size-input"
          />
        </label>
      </div>
    </div>
  );
}

