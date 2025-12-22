import { BrickType } from "../../../game/types";
import { BRICK_TYPES } from "../constants";

interface BrickSelectorProps {
  selectedBrickType: BrickType;
  selectedColor: number;
  isFuseMode: boolean;
  onBrickTypeSelect: (type: BrickType) => void;
  onFuseModeToggle: () => void;
}

export function BrickSelector({
  selectedBrickType,
  selectedColor,
  isFuseMode,
  onBrickTypeSelect,
  onFuseModeToggle,
}: BrickSelectorProps) {
  return (
    <div className="sidebar-section">
      <h3>Brick Types</h3>
      <div className="brick-type-grid">
        {BRICK_TYPES.map((type) => {
          const colorHex = `#${selectedColor.toString(16).padStart(6, "0")}`;
          return (
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
              style={
                type.type === "default"
                  ? { backgroundColor: colorHex }
                  : undefined
              }
              onClick={() => {
                if (type.type === "fuse-horizontal") {
                  onFuseModeToggle();
                } else {
                  onBrickTypeSelect(type.type);
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
              {type.type === "boost" && <div className="boost-chest"></div>}
              {type.type === "portal" && <div className="portal-core"></div>}
              {type.type === "unbreakable" && (
                <div className="shield-pattern"></div>
              )}
              {type.type === "metal" && <div className="metal-rivets"></div>}
            </div>
              <div className="brick-preview-label">{type.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

