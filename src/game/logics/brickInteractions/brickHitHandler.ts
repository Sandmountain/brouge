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
 * Create spark/debris effect when invisible brick becomes visible
 */
function createInvisibleBrickRevealEffect(
  brick: Phaser.GameObjects.DOMElement,
  scene: Scene
): void {
  const centerX = brick.x;
  const centerY = brick.y;
  
  // Create a burst of light at the center
  const burst = scene.add.circle(centerX, centerY, 20, 0xc8c8ff, 0.8);
  scene.tweens.add({
    targets: burst,
    alpha: 0,
    scale: 2,
    duration: 200,
    ease: "Power2",
    onComplete: () => burst.destroy(),
  });
  
  // Create spark particles shooting out in all directions
  const sparkCount = 12;
  for (let i = 0; i < sparkCount; i++) {
    const angle = (i / sparkCount) * Math.PI * 2;
    const distance = 40 + Math.random() * 30; // Random distance between 40-70
    const sparkSize = 2 + Math.random() * 2; // Random size between 2-4
    
    // Use light blue/purple colors to match the invisible brick theme
    const colors = [0xc8c8ff, 0xa0a0ff, 0xffffff, 0xe0e0ff];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const spark = scene.add.circle(centerX, centerY, sparkSize, color, 1);
    
    // Random velocity variation
    const velocityVariation = 0.3;
    const finalX = centerX + Math.cos(angle) * distance * (1 + (Math.random() - 0.5) * velocityVariation);
    const finalY = centerY + Math.sin(angle) * distance * (1 + (Math.random() - 0.5) * velocityVariation);
    
    scene.tweens.add({
      targets: spark,
      x: finalX,
      y: finalY,
      alpha: 0,
      scale: 0,
      duration: 300 + Math.random() * 100, // Random duration between 300-400ms
      ease: "Power2",
      onComplete: () => spark.destroy(),
    });
  }
  
  // Create smaller debris particles
  const debrisCount = 8;
  for (let i = 0; i < debrisCount; i++) {
    const angle = (i / debrisCount) * Math.PI * 2 + Math.random() * 0.5; // Slight random offset
    const distance = 25 + Math.random() * 20; // Random distance between 25-45
    const debrisSize = 1 + Math.random() * 1.5; // Random size between 1-2.5
    
    // Slightly darker colors for debris
    const debrisColors = [0x9696cc, 0x7878aa, 0xb4b4e0];
    const color = debrisColors[Math.floor(Math.random() * debrisColors.length)];
    
    const debris = scene.add.circle(centerX, centerY, debrisSize, color, 0.8);
    
    const finalX = centerX + Math.cos(angle) * distance;
    const finalY = centerY + Math.sin(angle) * distance;
    
    scene.tweens.add({
      targets: debris,
      x: finalX,
      y: finalY,
      alpha: 0,
      scale: 0,
      duration: 250 + Math.random() * 50, // Random duration between 250-300ms
      ease: "Power2",
      onComplete: () => debris.destroy(),
    });
  }
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

  // Handle invisible bricks - make visible when first hit
  const element = brickElement.node as HTMLElement;
  if (brickData.type === "invisible" && element) {
    // Check if this is the first hit (health was at max, now below)
    const wasHidden = brickData.health >= brickData.maxHealth - damage;
    if (wasHidden && brickData.health < brickData.maxHealth) {
      // First hit - make visible and solid
      element.classList.remove("hidden");
      element.classList.add("visible");
      
      // Add glow element if it doesn't exist
      if (!element.querySelector(".invisible-glow")) {
        const invisibleGlow = document.createElement("div");
        invisibleGlow.className = "invisible-glow game-mode";
        element.appendChild(invisibleGlow);
      }
      
      // Create sparks/debris effect shooting out from the brick
      createInvisibleBrickRevealEffect(brickElement, scene);
    }
  }

  // Update health badge if it exists (but not for invisible bricks)
  if (element && brickData.type !== "invisible") {
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

