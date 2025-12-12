import React from 'react';
import { BaseBrick } from '../BaseBrick';
import { BrickComponentProps } from '../types';
import { BRICK_CLASSES } from '../brickClassNames';
import './FuseRightUpBrick.module.css'; // Import to inject styles

export function FuseRightUpBrick(props: BrickComponentProps) {
  return (
    <BaseBrick {...props} brickClassName={BRICK_CLASSES.fuseRightUp}>
      <div className={BRICK_CLASSES.fuseLink}>
        <div className={BRICK_CLASSES.horizontal}></div>
        <div className={BRICK_CLASSES.vertical}></div>
      </div>
    </BaseBrick>
  );
}

