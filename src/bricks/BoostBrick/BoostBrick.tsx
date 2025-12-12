import React from 'react';
import { BaseBrick } from '../BaseBrick';
import { BrickComponentProps } from '../types';
import { BRICK_CLASSES } from '../brickClassNames';
import './BoostBrick.module.css'; // Import to inject styles

export function BoostBrick(props: BrickComponentProps) {
  return (
    <BaseBrick {...props} brickClassName={BRICK_CLASSES.boost}>
      <div className={BRICK_CLASSES.boostChest}></div>
    </BaseBrick>
  );
}

