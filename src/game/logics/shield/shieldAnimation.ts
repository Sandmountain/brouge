import { Scene } from "phaser";

interface ShieldWithProps extends Phaser.Physics.Arcade.Sprite {
  shieldWidth?: number;
  shieldHeight?: number;
  shieldRadius?: number;
  pulsePhase?: number;
}

interface ShieldAnimationContext {
  shieldArc: Phaser.Physics.Arcade.Sprite;
  shieldGraphics: Phaser.GameObjects.Graphics;
}

/**
 * Animate the shield arc with pulsing energy effect
 */
export function animateShield(context: ShieldAnimationContext): void {
  const { shieldArc, shieldGraphics } = context;
  const shield = shieldArc as ShieldWithProps;

  if (!shield.shieldWidth || !shield.shieldHeight || !shield.shieldRadius)
    return;

  shield.pulsePhase = (shield.pulsePhase || 0) + 0.05; // Animation speed
  if (shield.pulsePhase > Math.PI * 2) shield.pulsePhase = 0;

  const shieldWidth = shield.shieldWidth;
  const shieldHeight = shield.shieldHeight;
  const pulseIntensity = Math.sin(shield.pulsePhase);
  const baseThickness = 2;
  const pulseThickness = baseThickness + pulseIntensity * 0.5; // Subtle pulse between 1.5-2.5px
  const glowIntensity = 0.85 + pulseIntensity * 0.15; // Subtle pulse opacity 0.85-1.0

  // Position graphics at shield arc position
  const shieldX = shieldArc.x;
  const shieldY = shieldArc.y;

  // Draw a subtle arc that fits within the 10px height bounds
  const leftX = shieldX - shieldWidth / 2;
  const rightX = shieldX + shieldWidth / 2;
  const bottomY = shieldY + shieldHeight / 2; // Bottom of sprite

  // Use thinner lines for a subtle effect with gentle humming pulse
  const lineThickness = Math.max(1.5, pulseThickness); // Subtle pulse (1.5-2.5px)

  // Draw the arc as a curved line using multiple segments
  // Reduced segments for better performance
  const segments = 12;
  
  // Clear and redraw shield with current pulse state
  shieldGraphics.clear();
  // Outer glow (very subtle, always visible)
  shieldGraphics.lineStyle(
    lineThickness + 0.5,
    0x4ecdc4,
    glowIntensity * 0.4
  );
  shieldGraphics.beginPath();
  shieldGraphics.moveTo(leftX, bottomY);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const x = leftX + (rightX - leftX) * t;
    const curveHeight = shieldHeight * 0.8 + pulseIntensity * 0.5; // Very subtle pulse
    const y = bottomY - curveHeight * 4 * t * (1 - t);
    shieldGraphics.lineTo(x, y);
  }
  shieldGraphics.strokePath();

  // Main shield arc (brightest, with humming glow)
  shieldGraphics.lineStyle(lineThickness, 0x4ecdc4, glowIntensity);
  shieldGraphics.beginPath();
  shieldGraphics.moveTo(leftX, bottomY);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const x = leftX + (rightX - leftX) * t;
    const curveHeight = shieldHeight * 0.7;
    const y = bottomY - curveHeight * 4 * t * (1 - t);
    shieldGraphics.lineTo(x, y);
  }
  shieldGraphics.strokePath();

  // Inner core (brightest center, always visible)
  shieldGraphics.lineStyle(
    lineThickness * 0.7,
    0xffffff,
    Math.max(0.9, glowIntensity)
  );
  shieldGraphics.beginPath();
  shieldGraphics.moveTo(leftX + 2, bottomY - 1);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const x = leftX + 2 + (rightX - leftX - 4) * t;
    const curveHeight = shieldHeight * 0.6;
    const y = bottomY - 1 - curveHeight * 4 * t * (1 - t);
    shieldGraphics.lineTo(x, y);
  }
  shieldGraphics.strokePath();

  // Add subtle energy particles/sparks along the arc
  // Reduced particle count for better performance
  const particleCount = 2;
  for (let i = 0; i < particleCount; i++) {
    const t = i / particleCount; // 0 to 1 along the arc
    const particleX = leftX + (rightX - leftX) * t;
    // Calculate Y position along the curve
    const curveHeight = shieldHeight * 0.7;
    const particleY = bottomY - curveHeight * 4 * t * (1 - t);
    const particlePhase = shield.pulsePhase + i * 0.5;
    // More subtle particle glow - stays visible, just gently pulses
    const particleGlow = 0.7 + Math.sin(particlePhase) * 0.3;

    shieldGraphics.fillStyle(
      0xffffff,
      Math.max(0.5, particleGlow * 0.8)
    );
    shieldGraphics.fillCircle(particleX, particleY, 1); // Smaller particles
  }
}

