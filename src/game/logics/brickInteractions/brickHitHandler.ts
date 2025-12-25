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
 * Generate color variations from a base color
 */
function generateColorVariations(baseColor: number): number[] {
  // Extract RGB components
  const r = (baseColor >> 16) & 0xff;
  const g = (baseColor >> 8) & 0xff;
  const b = baseColor & 0xff;
  
  // Generate lighter and darker variations
  const lighten = (val: number, factor: number) => Math.min(255, val + (255 - val) * factor);
  const darken = (val: number, factor: number) => Math.max(0, val * (1 - factor));
  
  return [
    baseColor, // Original color
    (Math.min(255, r + 30) << 16) | (Math.min(255, g + 30) << 8) | Math.min(255, b + 30), // Lighter
    (Math.max(0, r - 30) << 16) | (Math.max(0, g - 30) << 8) | Math.max(0, b - 30), // Darker
    (lighten(r, 0.3) << 16) | (lighten(g, 0.3) << 8) | lighten(b, 0.3), // Very light
    (darken(r, 0.2) << 16) | (darken(g, 0.2) << 8) | darken(b, 0.2), // Very dark
    0xffffff, // White for highlights
  ];
}

/**
 * Create spark/debris effect for any brick when hit
 */
function createBrickHitEffect(
  brick: Phaser.GameObjects.DOMElement,
  brickData: BrickData,
  scene: Scene,
  isInvisible: boolean = false
): void {
  const centerX = brick.x;
  const centerY = brick.y;
  
  // Get the brick's color
  let baseColor = brickData.color;
  
  // For special brick types, use their type-specific color
  if (brickData.type !== "default") {
    // Import BRICK_TYPES to get type colors
    const typeColors: Record<string, number> = {
      metal: 0x888888,
      unbreakable: 0x333333,
      tnt: 0xff0000,
      gold: 0xffd700,
      boost: 0x8b4513,
      portal: 0x9b59b6,
      chaos: 0x4a2c1a,
      invisible: 0xc8c8ff,
    };
    
    // Handle fuse types
    if (brickData.type.startsWith("fuse-")) {
      baseColor = 0x00ff00;
    } else if (typeColors[brickData.type]) {
      baseColor = typeColors[brickData.type];
    }
  }
  
  const colorVariations = generateColorVariations(baseColor);
  
  // Calculate size scale based on HP (for multi-HP bricks)
  // More HP = smaller effect, less HP = larger effect
  // Last hit (health = 1) = default size (scale = 1.0)
  let sizeScale = 1.0;
  if (brickData.maxHealth > 1 && brickData.health > 1) {
    // Scale from 0.5 (at max HP) to 1.0 (at 1 HP remaining)
    // hpPercent represents remaining HP: 1.0 at max HP, 0.0 at 1 HP
    const hpPercent = (brickData.health - 1) / (brickData.maxHealth - 1);
    // Invert so that more HP = smaller scale
    sizeScale = 0.5 + ((1 - hpPercent) * 0.5); // 0.5 at max HP, 1.0 at 1 HP
  }
  
  // Base sizes (smaller for regular bricks, larger for invisible)
  const baseBurstSize = isInvisible ? 20 : 18;
  const baseSparkCount = isInvisible ? 12 : 10;
  const baseDebrisCount = isInvisible ? 8 : 6;
  const baseSparkDistance = isInvisible ? 40 : 30;
  const baseSparkSize = isInvisible ? 2 : 1.5;
  const baseDebrisDistance = isInvisible ? 25 : 20;
  const baseDebrisSize = isInvisible ? 1 : 0.8;
  
  // Apply HP-based scaling
  const burstSize = baseBurstSize * sizeScale;
  const sparkCount = Math.round(baseSparkCount * sizeScale);
  const debrisCount = Math.round(baseDebrisCount * sizeScale);
  const sparkDistance = baseSparkDistance * sizeScale;
  const sparkSize = baseSparkSize * sizeScale;
  const debrisDistance = baseDebrisDistance * sizeScale;
  const debrisSize = baseDebrisSize * sizeScale;
  
  // Create a burst of light at the center
  const burst = scene.add.circle(centerX, centerY, burstSize, baseColor, 0.9);
  scene.tweens.add({
    targets: burst,
    alpha: 0,
    scale: 2.5,
    duration: 250,
    ease: "Power2",
    onComplete: () => burst.destroy(),
  });
  
  // Create spark particles shooting out
  for (let i = 0; i < sparkCount; i++) {
    const angle = (i / sparkCount) * Math.PI * 2;
    const distance = sparkDistance + Math.random() * (sparkDistance * 0.75); // Random distance variation
    const particleSize = sparkSize + Math.random() * sparkSize; // Random size variation
    
    // Use color variations
    const color = colorVariations[Math.floor(Math.random() * colorVariations.length)];
    
    const spark = scene.add.circle(centerX, centerY, particleSize, color, 1);
    
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
  
  // Create debris particles
  for (let i = 0; i < debrisCount; i++) {
    const angle = (i / debrisCount) * Math.PI * 2 + Math.random() * 0.5; // Random offset
    const distance = debrisDistance + Math.random() * (debrisDistance * 0.8); // Random distance variation
    const particleSize = debrisSize + Math.random() * debrisSize; // Random size variation
    
    // Use darker variations for debris
    const darkerColors = colorVariations.filter((_, idx) => idx >= 2); // Skip lightest colors
    const color = darkerColors[Math.floor(Math.random() * darkerColors.length)];
    
    const debris = scene.add.circle(centerX, centerY, particleSize, color, 0.8);
    
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
      // Create smaller spark effect for bounce
      createBrickHitEffect(brickElement, brickData, scene);
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

  // Handle portal bricks - teleport to paired portal (no effect)
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

  // Create spark/debris effect for all bricks when hit (except TNT and portal which have their own effects)
  if (brickData.type !== "tnt" && brickData.type !== "portal") {
    createBrickHitEffect(brickElement, brickData, scene, false);
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
      
      // Create sparks/debris effect shooting out from the brick (invisible brick gets special larger effect)
      createBrickHitEffect(brickElement, brickData, scene, true);
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

