import React from "react";
import { BrickComponentProps } from "./types";
import { BRICK_CLASSES } from "./brickClassNames";
import "./BaseBrick.module.css"; // Import to inject styles

interface BaseBrickProps extends BrickComponentProps {
  children?: React.ReactNode;
  brickClassName?: string;
}

/**
 * Base brick component that provides common structure and styling
 * Uses global class names so the same styles work in both React and Phaser
 */
export function BaseBrick({
  brickData,
  width,
  height,
  mode = "editor",
  className,
  children,
  brickClassName = "",
}: BaseBrickProps) {
  const colorHex = `#${brickData.color.toString(16).padStart(6, "0")}`;

  // Width is already calculated correctly when passed in
  // For half-size blocks, the width prop is already the correct half width
  const style: React.CSSProperties = {
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
    backgroundColor: brickData.type === "default" ? colorHex : undefined,
  };

  const combinedClassName = [
    BRICK_CLASSES.brick,
    mode === "game" ? BRICK_CLASSES.gameMode : BRICK_CLASSES.editorMode,
    BRICK_CLASSES.hasBrick,
    brickClassName,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={combinedClassName} style={style}>
      {children}
      {brickData.health > 1 && brickData.health < 999 && (
        <span className={BRICK_CLASSES.healthBadge}>{brickData.health}</span>
      )}
    </div>
  );
}
