import React from "react";
import { BrickType, LevelData } from "../../../game/types";
import { BrickTypeDropdown } from "./BrickTypeDropdown";

export type BrushMode = "paint" | "erase" | "select";

interface EditorToolbarProps {
  brushMode: BrushMode;
  onBrushModeChange: (mode: BrushMode) => void;
  isHalfSize: boolean;
  onHalfSizeToggle: (isHalfSize: boolean) => void;
  onSettingsClick: () => void;
  selectedBrickType: BrickType;
  selectedColor: number;
  isFuseMode: boolean;
  levelData: LevelData;
  onBrickTypeSelect: (type: BrickType) => void;
  onFuseModeToggle: () => void;
  onColorSelect: (color: number) => void;
}

export function EditorToolbar({
  brushMode,
  onBrushModeChange,
  isHalfSize,
  onHalfSizeToggle,
  onSettingsClick,
  selectedBrickType,
  selectedColor,
  isFuseMode,
  levelData,
  onBrickTypeSelect,
  onFuseModeToggle,
  onColorSelect,
}: EditorToolbarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <div style={{ display: "flex", gap: "4px" }}>
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
        <button
          className={`toolbar-button ${brushMode === "select" ? "active" : ""}`}
          onClick={() => onBrushModeChange("select")}
          title="Select"
        >
          <span className="material-icons">select_all</span>
        </button>
      </div>

      <div
        style={{
          width: "1px",
          height: "24px",
          background: "#e63946",
          opacity: 0.3,
        }}
      />

      {/* Brick type dropdown */}
      <BrickTypeDropdown
        selectedBrickType={selectedBrickType}
        selectedColor={selectedColor}
        isFuseMode={isFuseMode}
        levelData={levelData}
        onBrickTypeSelect={onBrickTypeSelect}
        onFuseModeToggle={onFuseModeToggle}
        onColorSelect={onColorSelect}
      />

      <div
        style={{
          width: "1px",
          height: "24px",
          background: "#e63946",
          opacity: 0.3,
        }}
      />

      <div style={{ display: "flex", gap: "4px" }}>
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

      <div
        style={{
          width: "1px",
          height: "24px",
          background: "#e63946",
          opacity: 0.3,
        }}
      />

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

