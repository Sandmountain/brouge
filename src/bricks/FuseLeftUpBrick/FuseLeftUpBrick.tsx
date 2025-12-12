import React from 'react';
import { BaseBrick } from '../BaseBrick';
import { BrickComponentProps } from '../types';
import { BRICK_CLASSES } from '../brickClassNames';
import './FuseLeftUpBrick.module.css'; // Import to inject styles

export function FuseLeftUpBrick(props: BrickComponentProps) {
  return (
    <BaseBrick {...props} brickClassName={BRICK_CLASSES.fuseLeftUp}>
      <div className={BRICK_CLASSES.fuseLink}>
        <div className={BRICK_CLASSES.horizontal}></div>
        <div className={BRICK_CLASSES.vertical}></div>
      </div>
    </BaseBrick>
  );
}

