type BrushMode = "paint" | "erase";

interface ToolsPanelProps {
  brushMode: BrushMode;
  onBrushModeChange: (mode: BrushMode) => void;
}

export function ToolsPanel({ brushMode, onBrushModeChange }: ToolsPanelProps) {
  return (
    <div className="sidebar-section">
      <h3>Tools</h3>
      <div className="tool-buttons">
        <button
          className={`btn ${
            brushMode === "paint" ? "btn-primary" : "btn-secondary"
          }`}
          onClick={() => onBrushModeChange("paint")}
        >
          Paint
        </button>
        <button
          className={`btn ${
            brushMode === "erase" ? "btn-danger" : "btn-secondary"
          }`}
          onClick={() => onBrushModeChange("erase")}
        >
          Erase
        </button>
      </div>
    </div>
  );
}

