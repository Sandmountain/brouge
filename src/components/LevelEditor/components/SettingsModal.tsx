import React from "react";
import { LevelData } from "../../../game/types";
import { LevelStats } from "./LevelStats";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelData: LevelData;
}

export function SettingsModal({
  isOpen,
  onClose,
  levelData,
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
          <LevelStats levelData={levelData} />
        </div>
      </div>
    </div>
  );
}

