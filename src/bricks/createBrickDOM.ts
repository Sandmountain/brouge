import { BrickData } from '../game/types';
import { BRICK_CLASSES } from './brickClassNames';

/**
 * Creates a DOM element for a brick that can be used in Phaser
 * This mirrors the structure created by the React Brick components
 * Uses the same CSS modules via global class names
 */
export function createBrickDOM(
  brickData: BrickData,
  brickWidth: number,
  brickHeight: number
): HTMLElement {
  const element = document.createElement('div');
  // Use global class names that match CSS modules (defined with :global())
  let className = `${BRICK_CLASSES.brick} ${BRICK_CLASSES.gameMode} ${BRICK_CLASSES.hasBrick} ${brickData.type}`;
  
  // Add one-way class for portals
  if (brickData.type === 'portal' && brickData.isOneWay) {
    className += ` ${BRICK_CLASSES.portalOneWay}`;
  }
  
  element.className = className;
  
  // Set explicit size
  // Note: brickWidth is already the correct size (accounting for gap if half-size)
  // So we use it directly without further division
  element.style.width = `${brickWidth}px`;
  element.style.height = `${brickHeight}px`;
  element.style.boxSizing = 'border-box';
  element.style.display = 'block';
  element.style.position = 'relative';
  element.style.margin = '0';
  element.style.padding = '0';
  element.style.left = '0';
  element.style.top = '0';
  element.style.transform = 'none';
  
  // Allow fuse to extend beyond block boundaries
  if (brickData.type.startsWith('fuse-')) {
    element.style.overflow = 'visible';
  }
  
  // Set background color for default bricks
  if (brickData.type === 'default') {
    const colorHex = `#${brickData.color.toString(16).padStart(6, '0')}`;
    element.style.backgroundColor = colorHex;
  }
  
  // Add type-specific children based on brick type
  switch (brickData.type) {
    case 'tnt':
      const tntFuse = document.createElement('div');
      tntFuse.className = BRICK_CLASSES.tntFuse;
      element.appendChild(tntFuse);
      break;
      
    case 'metal':
      const metalRivets = document.createElement('div');
      metalRivets.className = BRICK_CLASSES.metalRivets;
      element.appendChild(metalRivets);
      break;
      
    case 'unbreakable':
      const shieldPattern = document.createElement('div');
      shieldPattern.className = BRICK_CLASSES.shieldPattern;
      element.appendChild(shieldPattern);
      break;
      
    case 'gold':
      const goldShine = document.createElement('div');
      goldShine.className = BRICK_CLASSES.goldShine;
      element.appendChild(goldShine);
      break;
      
    case 'boost':
      const boostChest = document.createElement('div');
      boostChest.className = BRICK_CLASSES.boostChest;
      element.appendChild(boostChest);
      break;
      
    case 'fuse-horizontal':
      const fuseH = document.createElement('div');
      fuseH.className = BRICK_CLASSES.fuseLink;
      element.appendChild(fuseH);
      break;
      
    case 'fuse-left-up':
    case 'fuse-right-up':
    case 'fuse-left-down':
    case 'fuse-right-down':
      const fuseLink = document.createElement('div');
      fuseLink.className = BRICK_CLASSES.fuseLink;
      const horizontal = document.createElement('div');
      horizontal.className = BRICK_CLASSES.horizontal;
      const vertical = document.createElement('div');
      vertical.className = BRICK_CLASSES.vertical;
      fuseLink.appendChild(horizontal);
      fuseLink.appendChild(vertical);
      element.appendChild(fuseLink);
      break;
      
    case 'fuse-vertical':
      const fuseV = document.createElement('div');
      fuseV.className = BRICK_CLASSES.fuseLink;
      element.appendChild(fuseV);
      break;
      
    // Portal and Chaos use ::before and ::after pseudo-elements only
  }
  
  // Add health badge for multi-hit bricks
  if (brickData.health > 1 && brickData.health < 999) {
    const healthBadge = document.createElement('span');
    healthBadge.className = BRICK_CLASSES.healthBadge;
    healthBadge.textContent = brickData.health.toString();
    element.appendChild(healthBadge);
  }
  
  return element;
}

