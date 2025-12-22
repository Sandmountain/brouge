import { BrickData } from "../../../game/types";

interface BrickEditorProps {
  selectedBrick: BrickData;
  onUpdate: (brick: BrickData, updates: Partial<BrickData>) => void;
  onClose: () => void;
}

export function BrickEditor({
  selectedBrick,
  onUpdate,
  onClose,
}: BrickEditorProps) {
  return (
    <div className="sidebar-section">
      <h3>Edit Brick</h3>
      <div className="brick-properties">
        <label>Type: {selectedBrick.type}</label>
        {selectedBrick.type === "default" && (
          <label>
            Color:
            <input
              type="color"
              value={`#${selectedBrick.color.toString(16).padStart(6, "0")}`}
              onChange={(e) => {
                const newColor = parseInt(e.target.value.slice(1), 16);
                onUpdate(selectedBrick, { color: newColor });
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
              onUpdate(selectedBrick, {
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
              onUpdate(selectedBrick, {
                coinValue: parseInt(e.target.value),
              })
            }
          />
        </label>
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
      </div>
    </div>
  );
}

