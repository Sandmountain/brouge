import React from 'react';
import { BaseBrick } from '../BaseBrick';
import { BrickComponentProps } from '../types';
import { BRICK_CLASSES } from '../brickClassNames';
import './TNTBrick.module.css'; // Import to inject styles

export function TNTBrick(props: BrickComponentProps) {
  return (
    <BaseBrick {...props} brickClassName={BRICK_CLASSES.tnt}>
      <div className={BRICK_CLASSES.tntFuse}></div>
    </BaseBrick>
  );
}

