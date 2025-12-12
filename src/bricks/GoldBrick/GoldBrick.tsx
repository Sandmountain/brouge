import React from 'react';
import { BaseBrick } from '../BaseBrick';
import { BrickComponentProps } from '../types';
import { BRICK_CLASSES } from '../brickClassNames';
import './GoldBrick.module.css'; // Import to inject styles

export function GoldBrick(props: BrickComponentProps) {
  return (
    <BaseBrick {...props} brickClassName={BRICK_CLASSES.gold}>
      <div className={BRICK_CLASSES.goldShine}></div>
    </BaseBrick>
  );
}

