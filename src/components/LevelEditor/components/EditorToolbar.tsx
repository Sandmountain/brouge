import { BrickType, LevelData } from "../../../game/types";
import { BrickTypeDropdown } from "./BrickTypeDropdown";
import {
  Brush,
  Eraser,
  MousePointer2,
  SquareDashedMousePointer,
  Square,
  Columns,
  Settings,
  Upload,
} from "lucide-react";
import { useRef } from "react";

export type BrushMode = "paint" | "erase" | "single-select" | "multi-select";

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
  onImageUploadClick?: () => void;
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
  onImageUploadClick,
}: EditorToolbarProps) {
  const handleUploadClick = () => {
    onImageUploadClick?.();
  };

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
          title="Paint (B)"
        >
          <Brush size={20} />
        </button>
        <button
          className={`toolbar-button ${brushMode === "erase" ? "active" : ""}`}
          onClick={() => onBrushModeChange("erase")}
          title="Erase (E)"
        >
          <Eraser size={20} />
        </button>
        <button
          className={`toolbar-button ${
            brushMode === "single-select" ? "active" : ""
          }`}
          onClick={() => onBrushModeChange("single-select")}
          title="Arrow Selector Tool (A)"
        >
          <MousePointer2 size={20} />
        </button>
        <button
          className={`toolbar-button ${
            brushMode === "multi-select" ? "active" : ""
          }`}
          onClick={() => onBrushModeChange("multi-select")}
          title="Ink Selection (S)"
        >
          <SquareDashedMousePointer size={20} />
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
          title="Full Size (M)"
        >
          <Square size={20} />
        </button>
        <button
          className={`toolbar-button ${isHalfSize ? "active" : ""}`}
          onClick={() => onHalfSizeToggle(true)}
          title="Half Size (N)"
        >
          <Columns size={20} />
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
        <Settings size={20} />
      </button>

      {onImageUploadClick && (
        <>
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
            onClick={handleUploadClick}
            title="Upload Image"
          >
            <Upload size={20} />
          </button>
        </>
      )}
    </div>
  );
}
