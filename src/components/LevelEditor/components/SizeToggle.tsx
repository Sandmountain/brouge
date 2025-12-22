interface SizeToggleProps {
  isHalfSize: boolean;
  onToggle: (isHalfSize: boolean) => void;
}

export function SizeToggle({ isHalfSize, onToggle }: SizeToggleProps) {
  return (
    <div className="sidebar-section">
      <h3>Block Size</h3>
      <div className="tool-buttons">
        <button
          className={`btn ${!isHalfSize ? "btn-primary" : "btn-secondary"}`}
          onClick={() => onToggle(false)}
        >
          Full Size
        </button>
        <button
          className={`btn ${isHalfSize ? "btn-primary" : "btn-secondary"}`}
          onClick={() => onToggle(true)}
        >
          Half Size
        </button>
      </div>
    </div>
  );
}

