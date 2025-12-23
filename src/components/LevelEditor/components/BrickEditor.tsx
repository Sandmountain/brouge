import { BrickData, LevelData } from "../../../game/types";

interface BrickEditorProps {
  selectedBrick: BrickData;
  onUpdate: (brick: BrickData, updates: Partial<BrickData>) => void;
  onClose: () => void;
  levelData: LevelData;
}

export function BrickEditor({
  selectedBrick,
  onUpdate,
  onClose,
  levelData,
}: BrickEditorProps) {
  // Find connected portal for portal bricks
  let connectedPortal: BrickData | null = null;
  if (selectedBrick.type === "portal" && selectedBrick.id) {
    connectedPortal = levelData.bricks.find(
      (b) =>
        b.type === "portal" &&
        b.id === selectedBrick.id &&
        (b.col !== selectedBrick.col || b.row !== selectedBrick.row)
    ) || null;
  }

  return (
    <div className="brick-editor-panel">
      <div className="brick-editor-header">
        <h3>Edit Brick</h3>
        <button className="brick-editor-close" onClick={onClose}>
          <span className="material-icons">close</span>
        </button>
      </div>
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
        {/* HP field for all breakable blocks (not unbreakable, not portal) */}
        {selectedBrick.type !== "unbreakable" && selectedBrick.type !== "portal" && (
          <label>
            HP:
            <input
              type="number"
              min="1"
              max="999"
              value={selectedBrick.health}
              onChange={(e) => {
                const newHealth = Math.max(1, Math.min(999, parseInt(e.target.value) || 1));
                onUpdate(selectedBrick, {
                  health: newHealth,
                  maxHealth: newHealth,
                });
              }}
            />
          </label>
        )}
        {selectedBrick.type === "portal" && (
          <>
            {connectedPortal ? (
              <label>
                Connected to: ({connectedPortal.col}, {connectedPortal.row})
                {connectedPortal.isHalfSize && (
                  <span> - {connectedPortal.halfSizeAlign} half</span>
                )}
              </label>
            ) : (
              <label style={{ color: "#ff6b6b" }}>
                No connection (portal needs a pair)
              </label>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                checked={selectedBrick.isOneWay || false}
                onChange={(e) =>
                  onUpdate(selectedBrick, { isOneWay: e.target.checked })
                }
              />
              <span>One-way (receive only)</span>
            </label>
          </>
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
        {selectedBrick.type !== "unbreakable" && selectedBrick.type !== "portal" && (
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={selectedBrick.isRequired !== false}
              onChange={(e) =>
                onUpdate(selectedBrick, { isRequired: e.target.checked })
              }
            />
            <span>Required to break</span>
          </label>
        )}
      </div>
    </div>
  );
}

