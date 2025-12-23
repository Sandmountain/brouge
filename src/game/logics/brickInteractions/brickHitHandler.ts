import { Scene } from "phaser";
import { BrickData, GameState } from "../../types";
import { isFuseType } from "../utils/brickTypeUtils";

type BrickSprite = Phaser.GameObjects.DOMElement & { brickData?: BrickData };

interface BrickHitContext {
  scene: Scene;
  gameState: GameState;
  ball: Phaser.Physics.Arcade.Sprite;
  prevBallVelocity: { x: number; y: number };
  explodeTNT: (brick: BrickSprite, brickData: BrickData) => void;
  explodeFuse: (brick: BrickSprite, brickData: BrickData) => void;
  teleportBall: (brick: BrickSprite, brickData: BrickData) => void;
  randomizeBallDirection: () => void;
  updateMetalBrickAppearance: (
    brick: BrickSprite,
    brickData: BrickData
  ) => void;
  destroyBrick: (brick: BrickSprite, brickData: BrickData) => void;
}

/**
 * Update health badge on a brick element
 */
// Cache for health badge elements to avoid repeated DOM queries
const healthBadgeCache = new WeakMap<HTMLElement, HTMLElement | null>();

function updateHealthBadge(
  element: HTMLElement,
  health: number
): void {
  // Use cache to avoid repeated querySelector calls
  let healthBadge = healthBadgeCache.get(element);
  if (!healthBadge && healthBadge !== null) {
    healthBadge = element.querySelector(".health-badge") as HTMLElement | null;
    healthBadgeCache.set(element, healthBadge);
  }
  
  if (healthBadge && health > 1 && health < 999) {
    healthBadge.textContent = health.toString();
  } else if (healthBadge && (health <= 1 || health >= 999)) {
    healthBadge.remove();
    healthBadgeCache.set(element, null); // Mark as removed
  }
}

/**
 * Handle brick hit and apply damage
 */
export function handleBrickHit(
  brick: Phaser.GameObjects.GameObject,
  context: BrickHitContext
): void {
  const {
    scene,
    gameState,
    explodeTNT,
    explodeFuse,
    teleportBall,
    randomizeBallDirection,
    updateMetalBrickAppearance,
    destroyBrick,
  } = context;

  const brickElement = brick as BrickSprite;
  if (!brickElement.brickData) return;

  const brickData = brickElement.brickData;

  // Handle unbreakable bricks - just bounce, no damage
  if (brickData.type === "unbreakable") {
    if (!gameState.talents.includes("unbreakable-breaker")) {
      scene.tweens.add({
        targets: brickElement,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 100,
        yoyo: true,
      });
      return;
    }
  }

  // Handle TNT bricks
  if (brickData.type === "tnt") {
    explodeTNT(brickElement, brickData);
    return;
  }

  // Handle portal bricks - teleport to paired portal
  if (brickData.type === "portal" && brickData.id) {
    teleportBall(brickElement, brickData);
    return;
  }

  // Handle chaos bricks - randomize ball direction
  if (brickData.type === "chaos") {
    randomizeBallDirection();
    scene.tweens.add({
      targets: brickElement,
      scaleX: 1.2,
      scaleY: 1.2,
      rotation: Math.random() * 0.6 - 0.3, // -0.3 to 0.3
      duration: 200,
      yoyo: true,
    });
  }

  // Handle boost bricks (random buff/debuff)
  if (brickData.type === "boost") {
    // TODO: Implement random buff/debuff system
    scene.tweens.add({
      targets: brickElement,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
    });
  }

  // Reduce brick health (apply brick-breaker talent if active)
  const damage = gameState.talents.includes("brick-breaker") ? 2 : 1;
  brickData.health -= damage;

  // Update visual appearance for metal bricks
  if (brickData.type === "metal") {
    updateMetalBrickAppearance(brickElement, brickData);
  }

  // Update health badge if it exists
  const element = brickElement.node as HTMLElement;
  if (element) {
    updateHealthBadge(element, brickData.health);
  }

  // Visual feedback
  scene.tweens.add({
    targets: brickElement,
    scaleX: 0.95,
    scaleY: 0.95,
    duration: 50,
    yoyo: true,
  });

  // Add burning class to fuse bricks when hit
  if (isFuseType(brickData.type)) {
    if (element) {
      element.classList.add("burning");
    }
  }

  // Destroy brick if health is 0
  if (brickData.health <= 0) {
    if (isFuseType(brickData.type)) {
      explodeFuse(brickElement, brickData);
    } else {
      destroyBrick(brickElement, brickData);
    }
  }
}

