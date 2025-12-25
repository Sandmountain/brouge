import React from "react";
import { BaseBrick } from "../BaseBrick";
import { BrickComponentProps } from "../types";
import { BRICK_CLASSES } from "../brickClassNames";
import "./InvisibleBrick.module.css"; // Import to inject styles

export function InvisibleBrick(props: BrickComponentProps) {
  const { brickData, mode } = props;
  
  // In editor mode, always show with dashed border
  // In game mode, visibility is controlled by data attribute set in createBrickDOM
  const isVisible = mode === "editor" || brickData.health < brickData.maxHealth;
  
  return (
    <BaseBrick 
      {...props} 
      brickClassName={`${BRICK_CLASSES.invisible} ${isVisible ? 'visible' : 'hidden'}`}
    >
      {isVisible && <div className={`invisible-glow ${mode}-mode`}></div>}
    </BaseBrick>
  );
}

