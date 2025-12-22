import React from "react";

type BrushMode = "paint" | "erase";

interface EditorToolbarProps {
  brushMode: BrushMode;
  onBrushModeChange: (mode: BrushMode) => void;
  isHalfSize: boolean;
  onHalfSizeToggle: (isHalfSize: boolean) => void;
  onSettingsClick: () => void;
}

export function EditorToolbar({
  brushMode,
  onBrushModeChange,
  isHalfSize,
  onHalfSizeToggle,
  onSettingsClick,
}: EditorToolbarProps) {
  return (
    <div className="editor-toolbar">
      <div className="toolbar-group">
        <button
          className={`toolbar-button ${brushMode === "paint" ? "active" : ""}`}
          onClick={() => onBrushModeChange("paint")}
          title="Paint"
        >
          <span className="material-icons">brush</span>
        </button>
        <button
          className={`toolbar-button ${brushMode === "erase" ? "active" : ""}`}
          onClick={() => onBrushModeChange("erase")}
          title="Erase"
        >
          <span className="material-icons">clear</span>
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-group">
        <button
          className={`toolbar-button ${!isHalfSize ? "active" : ""}`}
          onClick={() => onHalfSizeToggle(false)}
          title="Full Size"
        >
          <span className="material-icons">crop_square</span>
        </button>
        <button
          className={`toolbar-button ${isHalfSize ? "active" : ""}`}
          onClick={() => onHalfSizeToggle(true)}
          title="Half Size"
        >
          <span className="material-icons">view_column</span>
        </button>
      </div>

      <div className="toolbar-spacer"></div>

      <button
        className="toolbar-button"
        onClick={onSettingsClick}
        title="Settings"
      >
        <span className="material-icons">settings</span>
      </button>
    </div>
  );
}

