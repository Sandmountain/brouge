import React from "react";
import { LevelData } from "../../../game/types";
import { GridSizeControls } from "./GridSizeControls";
import { LevelStats } from "./LevelStats";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelData: LevelData;
  brickWidth: number;
  brickHeight: number;
  padding: number;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  levelData,
  brickWidth,
  brickHeight,
  padding,
  onWidthChange,
  onHeightChange,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className="modal-body">
          <GridSizeControls
            levelData={levelData}
            brickWidth={brickWidth}
            brickHeight={brickHeight}
            padding={padding}
            onWidthChange={onWidthChange}
            onHeightChange={onHeightChange}
          />
          <LevelStats levelData={levelData} />
        </div>
      </div>
    </div>
  );
}

