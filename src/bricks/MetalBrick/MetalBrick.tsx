import React from 'react';
import { BaseBrick } from '../BaseBrick';
import { BrickComponentProps } from '../types';
import { BRICK_CLASSES } from '../brickClassNames';
import './MetalBrick.module.css'; // Import to inject styles

export function MetalBrick(props: BrickComponentProps) {
  return (
    <BaseBrick {...props} brickClassName={BRICK_CLASSES.metal}>
      <div className={BRICK_CLASSES.metalRivets}></div>
    </BaseBrick>
  );
}

