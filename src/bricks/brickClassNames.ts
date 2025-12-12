/**
 * Centralized class name constants for bricks
 * These match the global class names defined in CSS modules using :global()
 */
export const BRICK_CLASSES = {
  brick: 'brick',
  gameMode: 'game-mode',
  editorMode: 'editor-mode',
  hasBrick: 'has-brick',
  healthBadge: 'health-badge',
  // Brick type classes
  default: 'default',
  metal: 'metal',
  unbreakable: 'unbreakable',
  tnt: 'tnt',
  gold: 'gold',
  boost: 'boost',
  portal: 'portal',
  chaos: 'chaos',
  fuseHorizontal: 'fuse-horizontal',
  fuseLeftUp: 'fuse-left-up',
  fuseRightUp: 'fuse-right-up',
  fuseLeftDown: 'fuse-left-down',
  fuseRightDown: 'fuse-right-down',
  fuseVertical: 'fuse-vertical',
  // Child element classes
  tntFuse: 'tnt-fuse',
  metalRivets: 'metal-rivets',
  shieldPattern: 'shield-pattern',
  goldShine: 'gold-shine',
  boostChest: 'boost-chest',
  fuseLink: 'fuse-link',
  horizontal: 'horizontal',
  vertical: 'vertical',
} as const;

