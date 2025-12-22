import React from 'react';
import { BaseBrick } from '../BaseBrick';
import { BrickComponentProps } from '../types';
import { BRICK_CLASSES } from '../brickClassNames';
import './PortalBrick.module.css'; // Import to inject styles

export function PortalBrick(props: BrickComponentProps) {
  const isOneWay = props.brickData.isOneWay || false;
  const className = isOneWay 
    ? `${BRICK_CLASSES.portal} ${BRICK_CLASSES.portalOneWay}`
    : BRICK_CLASSES.portal;
  
  return (
    <BaseBrick {...props} brickClassName={className}>
    </BaseBrick>
  );
}

