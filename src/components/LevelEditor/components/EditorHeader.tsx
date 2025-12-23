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
            style={{
              marginRight: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            title="Return to main menu"
          >
            <span className="material-icons">home</span>
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
            <span className="material-icons">
              {isSidebarVisible ? "menu_open" : "menu"}
            </span>
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
          <span className="material-icons">play_arrow</span>
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
          <span className="material-icons">save</span>
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
          <span className="material-icons">file_download</span>
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
          <span className="material-icons">file_upload</span>
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
          <span className="material-icons">delete</span>
        </button>
      </div>
    </div>
  );
}
