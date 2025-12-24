import { LevelData } from "../../../game/types";
import {
  Home,
  Menu,
  PanelLeftOpen,
  Play,
  Save,
  Download,
  Upload,
  Trash2,
} from "lucide-react";

interface EditorHeaderProps {
  levelData: LevelData;
  onLevelNameChange: (name: string) => void;
  onTestLevel: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onBackToGame?: () => void;
  onToggleSidebar?: () => void;
  isSidebarVisible?: boolean;
}

export function EditorHeader({
  levelData,
  onLevelNameChange,
  onTestLevel,
  onSave,
  onExport,
  onImport,
  onClear,
  onBackToGame,
  onToggleSidebar,
  isSidebarVisible = true,
}: EditorHeaderProps) {
  return (
    <div className="editor-header">
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {onBackToGame && (
          <button
            onClick={onBackToGame}
            className="btn btn-secondary"
            style={{
              marginRight: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            title="Return to main menu"
          >
            <Home size={20} />
          </button>
        )}
        <h1>Level Editor</h1>
      </div>
      <div className="header-actions">
        <input
          type="text"
          value={levelData.name}
          onChange={(e) => onLevelNameChange(e.target.value)}
          className="level-name-input"
          placeholder="Level Name"
        />
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="btn btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
          >
            {isSidebarVisible ? (
              <PanelLeftOpen size={20} />
            ) : (
              <Menu size={20} />
            )}
          </button>
        )}
        <button
          onClick={onTestLevel}
          className="btn btn-primary"
          disabled={levelData.bricks.length === 0}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={
            levelData.bricks.length === 0
              ? "Add some bricks first!"
              : "Test your level in the game"
          }
        >
          <Play size={20} />
        </button>
        <button
          onClick={onSave}
          className="btn btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Save level to local storage"
        >
          <Save size={20} />
        </button>
        <button
          onClick={onExport}
          className="btn btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Export level as JSON file"
        >
          <Download size={20} />
        </button>
        <label
          className="btn btn-secondary"
          title="Import level from JSON file"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Upload size={20} />
          <input
            type="file"
            accept=".json"
            onChange={onImport}
            style={{ display: "none" }}
          />
        </label>
        <button
          onClick={onClear}
          className="btn btn-danger"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Clear all bricks and reset level"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}
