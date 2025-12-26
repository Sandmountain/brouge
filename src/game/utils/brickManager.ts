import { Scene } from "phaser";
import { GameState, BrickData, LevelData } from "../types";

type BrickSprite = Phaser.GameObjects.DOMElement & { brickData?: BrickData };
import { createBricksFromLevel, createDefaultLevel } from "../logics/brickCreation/brickGrid";
import { createBrickFromData } from "../logics/brickCreation/brickFactory";
import { EndlessModeManager } from "../logics/endlessMode/endlessModeManager";
import { handleBrickHit } from "../logics/brickInteractions/brickHitHandler";
import { explodeTNT } from "../logics/explosions/tntExplosion";
import { explodeFuse } from "../logics/explosions/fuseExplosion";
import { damageNeighbors } from "../logics/explosions/damageNeighbors";
import { updateMetalBrickAppearance } from "../logics/brickInteractions/metalBrickAppearance";
import { destroyBrick } from "../logics/gameState/brickDestruction";
import { teleportBall } from "../logics/brickInteractions/portalTeleport";
import { randomizeBallDirection } from "../logics/brickInteractions/chaosEffect";

export interface BrickManager {
  bricks: Phaser.Physics.Arcade.StaticGroup;
  breakableBrickCount: { value: number };
  endlessModeManager?: any;
  hitBrick: (
    ball: Phaser.GameObjects.GameObject,
    brick: Phaser.GameObjects.GameObject,
    context: {
      scene: Scene;
      gameState: GameState;
      ballSprite: Phaser.Physics.Arcade.Sprite;
      prevBallVelocity: { x: number; y: number };
      isEndlessMode: boolean;
      endlessModeManager?: any;
      onBrickHit?: () => void;
      onDestroyBrick?: (brick: BrickSprite, brickData: BrickData) => void;
      onDropItem?: (x: number, y: number) => void;
      onLevelComplete?: () => void;
      updateUI?: () => void;
    }
  ) => void;
  destroy: () => void;
}

interface BrickManagerContext {
  scene: Scene;
  levelData?: LevelData;
  isEndlessMode: boolean;
  gameState: GameState;
  shieldArc: Phaser.Physics.Arcade.Sprite;
  ball: Phaser.Physics.Arcade.Sprite;
  onDestroyBrick?: (brick: BrickSprite, brickData: BrickData) => void;
  onDropItem?: (x: number, y: number) => void;
  onLevelComplete?: () => void;
  updateUI?: () => void;
  coinMultiplier?: number;
  dropChanceBonus?: number;
}

/**
 * Creates a brick manager that handles brick creation, collisions, and interactions
 * @param context Configuration and callbacks
 * @returns BrickManager with bricks group and methods
 */
export function createBrickManager(context: BrickManagerContext): BrickManager {
  const {
    scene,
    levelData,
    isEndlessMode,
    gameState,
    shieldArc,
    ball,
    onDestroyBrick,
    onDropItem,
    onLevelComplete,
    updateUI,
    coinMultiplier = 1,
    dropChanceBonus = 0,
  } = context;

  // Create bricks group
  const bricks = scene.physics.add.staticGroup();
  const breakableBrickCount = { value: 0 };

  // Track last hit times per brick to prevent rapid hits
  const lastBrickHits = new Map<Phaser.GameObjects.GameObject, number>();

  // Set world bounds to screen size
  scene.physics.world.setBounds(0, 0, scene.scale.width, scene.scale.height);

  // Initialize endless mode manager if needed
  let endlessModeManager: any = null;

  if (isEndlessMode) {
    // Calculate brick dimensions for 16x16 grid
    const gridWidth = 16;
    const availableWidth = scene.scale.width;

    const paddingRatio = 0.055;
    const brickWidth =
      availableWidth / (gridWidth + (gridWidth - 1) * paddingRatio);
    const padding = brickWidth * paddingRatio;
    const brickHeight = brickWidth / 3;

    // Initialize endless mode manager
    endlessModeManager = new EndlessModeManager({
      scene,
      bricks,
      breakableBrickCount,
      level: gameState.level,
      brickWidth,
      brickHeight,
      padding,
      createBrickFromData,
    });

    endlessModeManager.initialize();
  } else if (levelData && levelData.bricks.length > 0) {
    createBricksFromLevel({
      scene,
      levelData,
      bricks,
      breakableBrickCount,
      shieldArc,
      ball,
    });
  } else {
    createDefaultLevel({
      scene,
      levelData: { name: "Default", width: 10, height: 8, bricks: [] },
      bricks,
      breakableBrickCount,
      shieldArc,
      ball,
    });
  }

  // Handle brick hit
  const hitBrick = (
    _ball: Phaser.GameObjects.GameObject,
    brick: Phaser.GameObjects.GameObject,
    hitContext: {
      scene: Scene;
      gameState: GameState;
      ballSprite: Phaser.Physics.Arcade.Sprite;
      prevBallVelocity: { x: number; y: number };
      isEndlessMode: boolean;
      endlessModeManager?: any;
      onBrickHit?: () => void;
      onDestroyBrick?: (brick: BrickSprite, brickData: BrickData) => void;
      onDropItem?: (x: number, y: number) => void;
      onLevelComplete?: () => void;
      updateUI?: () => void;
    }
  ) => {
    const {
      scene,
      gameState,
      ballSprite,
      prevBallVelocity,
      isEndlessMode,
      endlessModeManager,
      onBrickHit,
      onDestroyBrick,
      onDropItem,
      onLevelComplete,
      updateUI,
    } = hitContext;

    // Throttle collision handler per brick to prevent multiple rapid hits
    const now = scene.time.now;
    const lastHitTime = lastBrickHits.get(brick);
    if (lastHitTime && now - lastHitTime < 50) {
      return; // Ignore if same brick hit within 50ms
    }
    lastBrickHits.set(brick, now);

    // Clean up old entries (older than 1 second) to prevent memory leak
    if (lastBrickHits.size > 100) {
      for (const [b, time] of lastBrickHits.entries()) {
        if (now - time > 1000) {
          lastBrickHits.delete(b);
        }
      }
    }

    // Track brick hit for endless mode
    if (isEndlessMode && endlessModeManager) {
      endlessModeManager.onBrickHit();
      if (onBrickHit) {
        onBrickHit();
      }
    }

    // Handle brick hit with all interactions
    handleBrickHit(brick, {
      scene,
      gameState,
      ball: ballSprite,
      prevBallVelocity,
      explodeTNT: (b, d) => {
        explodeTNT(b, d, {
          scene,
          bricks,
          destroyBrick: (brick, brickData) => {
            if (onDestroyBrick) {
              onDestroyBrick(brick, brickData);
            }
          },
          updateMetalBrickAppearance: (b, d) => updateMetalBrickAppearance(b, d),
        });
      },
      explodeFuse: (b, d) => {
        explodeFuse(b, d, {
          scene,
          bricks,
          time: scene.time,
          destroyBrick: (brick, brickData) => {
            if (onDestroyBrick) {
              onDestroyBrick(brick, brickData);
            }
          },
          damageNeighbors: (brick, brickData, gridMap) => {
            damageNeighbors(brick, brickData, gridMap, {
              scene,
              updateMetalBrickAppearance: (b, d) => updateMetalBrickAppearance(b, d),
              explodeFuse: (b, d) => {
                explodeFuse(b, d, {
                  scene,
                  bricks,
                  time: scene.time,
                  destroyBrick: (brick, brickData) => {
                    if (onDestroyBrick) {
                      onDestroyBrick(brick, brickData);
                    }
                  },
                  damageNeighbors: (brick, brickData, gridMap) => {
                    damageNeighbors(brick, brickData, gridMap, {
                      scene,
                      updateMetalBrickAppearance: (b, d) => updateMetalBrickAppearance(b, d),
                      explodeFuse: (b, d) => {
                        explodeFuse(b, d, {
                          scene,
                          bricks,
                          time: scene.time,
                          destroyBrick: (brick, brickData) => {
                            if (onDestroyBrick) {
                              onDestroyBrick(brick, brickData);
                            }
                          },
                          damageNeighbors: () => {}, // Prevent infinite recursion
                        });
                      },
                      explodeTNT: (b, d) => {
                        explodeTNT(b, d, {
                          scene,
                          bricks,
                          destroyBrick: (brick, brickData) => {
                            if (onDestroyBrick) {
                              onDestroyBrick(brick, brickData);
                            }
                          },
                          updateMetalBrickAppearance: (b, d) => updateMetalBrickAppearance(b, d),
                        });
                      },
                      destroyBrick: (brick, brickData) => {
                        if (onDestroyBrick) {
                          onDestroyBrick(brick, brickData);
                        }
                      },
                    });
                  },
                });
              },
              explodeTNT: (b, d) => {
                explodeTNT(b, d, {
                  scene,
                  bricks,
                  destroyBrick: (brick, brickData) => {
                    if (onDestroyBrick) {
                      onDestroyBrick(brick, brickData);
                    }
                  },
                  updateMetalBrickAppearance: (b, d) => updateMetalBrickAppearance(b, d),
                });
              },
              destroyBrick: (brick, brickData) => {
                if (onDestroyBrick) {
                  onDestroyBrick(brick, brickData);
                }
              },
            });
          },
        });
      },
      teleportBall: (b, d) =>
        teleportBall(b, d, {
          scene,
          ball: ballSprite,
          bricks,
          prevBallVelocity,
        }),
      randomizeBallDirection: () =>
        randomizeBallDirection({
          ball: ballSprite,
        }),
      updateMetalBrickAppearance: (b, d) => updateMetalBrickAppearance(b, d),
      destroyBrick: (brick, brickData) => {
        destroyBrick(brick, brickData, {
          scene,
          gameState,
          coinMultiplier,
          dropChanceBonus,
          breakableBrickCount,
          shieldArc,
          updateUI: updateUI || (() => {}),
          dropItem: onDropItem || (() => {}),
          levelComplete: onLevelComplete || (() => {}),
        });
        if (onDestroyBrick) {
          onDestroyBrick(brick, brickData);
        }
      },
    });
  };

  // Cleanup function
  const destroy = () => {
    lastBrickHits.clear();
  };

  return {
    bricks,
    breakableBrickCount,
    endlessModeManager,
    hitBrick,
    destroy,
  };
}

