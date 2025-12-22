import { LevelData } from "../../../game/types";

interface LevelStatsProps {
  levelData: LevelData;
}

export function LevelStats({ levelData }: LevelStatsProps) {
  return (
    <div className="sidebar-section">
      <h3>Level Stats</h3>
      <div className="level-stats">
        <div>Total Bricks: {levelData.bricks.length}</div>
        <div>
          Default:{" "}
          {levelData.bricks.filter((b) => b.type === "default").length}
        </div>
        <div>
          Metal: {levelData.bricks.filter((b) => b.type === "metal").length}
        </div>
        <div>
          Unbreakable:{" "}
          {levelData.bricks.filter((b) => b.type === "unbreakable").length}
        </div>
        <div>
          TNT: {levelData.bricks.filter((b) => b.type === "tnt").length}
        </div>
        <div>
          Fuse:{" "}
          {
            levelData.bricks.filter(
              (b) =>
                b.type === "fuse-horizontal" ||
                b.type === "fuse-left-up" ||
                b.type === "fuse-right-up" ||
                b.type === "fuse-left-down" ||
                b.type === "fuse-right-down" ||
                b.type === "fuse-vertical"
            ).length
          }
        </div>
      </div>
    </div>
  );
}

