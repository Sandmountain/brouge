import { LevelData } from "../../../game/types";

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
            style={{ marginRight: "10px" }}
            title="Return to main menu"
          >
            ← Back to Game
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
            title={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
          >
            {isSidebarVisible ? "◀ Hide Panel" : "▶ Show Panel"}
          </button>
        )}
        <button
          onClick={onTestLevel}
          className="btn btn-primary"
          disabled={levelData.bricks.length === 0}
          title={
            levelData.bricks.length === 0
              ? "Add some bricks first!"
              : "Test your level in the game"
          }
        >
          Test Level
        </button>
        <button
          onClick={onSave}
          className="btn btn-primary"
          title="Save level to local storage"
        >
          Save
        </button>
        <button
          onClick={onExport}
          className="btn btn-primary"
          title="Export level as JSON file"
        >
          Export Level
        </button>
        <label className="btn btn-secondary" title="Import level from JSON file">
          Import Level
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
          title="Clear all bricks and reset level"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}

