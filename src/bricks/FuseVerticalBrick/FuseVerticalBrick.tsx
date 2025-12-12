import React from 'react';
import { BaseBrick } from '../BaseBrick';
import { BrickComponentProps } from '../types';
import { BRICK_CLASSES } from '../brickClassNames';
import './FuseVerticalBrick.module.css'; // Import to inject styles

export function FuseVerticalBrick(props: BrickComponentProps) {
  return (
    <BaseBrick {...props} brickClassName={BRICK_CLASSES.fuseVertical}>
      <div className={BRICK_CLASSES.fuseLink}></div>
    </BaseBrick>
  );
}

