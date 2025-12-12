import React from 'react';
import { BaseBrick } from '../BaseBrick';
import { BrickComponentProps } from '../types';
import { BRICK_CLASSES } from '../brickClassNames';
import './UnbreakableBrick.module.css'; // Import to inject styles

export function UnbreakableBrick(props: BrickComponentProps) {
  return (
    <BaseBrick {...props} brickClassName={BRICK_CLASSES.unbreakable}>
      <div className={BRICK_CLASSES.shieldPattern}></div>
    </BaseBrick>
  );
}

