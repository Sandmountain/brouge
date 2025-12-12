import React from 'react';
import { BaseBrick } from '../BaseBrick';
import { BrickComponentProps } from '../types';
import { BRICK_CLASSES } from '../brickClassNames';
import './FuseHorizontalBrick.module.css'; // Import to inject styles

export function FuseHorizontalBrick(props: BrickComponentProps) {
  return (
    <BaseBrick {...props} brickClassName={BRICK_CLASSES.fuseHorizontal}>
      <div className={BRICK_CLASSES.fuseLink}></div>
    </BaseBrick>
  );
}

