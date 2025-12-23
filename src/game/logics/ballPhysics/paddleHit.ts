interface PaddleHitContext {
  ball: Phaser.Physics.Arcade.Sprite;
  shieldArc: Phaser.Physics.Arcade.Sprite;
  ballSpeed: number;
  scene: Phaser.Scene;
}

/**
 * Handle ball collision with paddle/shield
 */
export function handlePaddleHit(
  ball: Phaser.Physics.Arcade.Sprite,
  shield: Phaser.Physics.Arcade.Sprite,
  context: PaddleHitContext
): void {
  const { ballSpeed, scene } = context;

  const shieldWidth = 120; // TODO: Should be passed as parameter
  const hitPosition = (ball.x - shield.x) / (shieldWidth / 2);

  // Clamp hit position
  const clampedHit = Math.max(-1, Math.min(1, hitPosition));

  // Calculate new angle based on hit position on the arc
  const maxAngle = 75; // degrees
  const angle = clampedHit * maxAngle;

  // Calculate new velocity
  const speed = ballSpeed;
  const angleRad = (angle * Math.PI) / 180;
  const velocityX = Math.sin(angleRad) * speed;
  const velocityY = -Math.abs(Math.cos(angleRad) * speed); // Always upward

  // Set ball velocity (always bounce upward)
  ball.setVelocity(velocityX, velocityY);

  // Visual feedback on shield
  scene.tweens.add({
    targets: shield,
    scaleX: 1.1,
    scaleY: 1.1,
    duration: 100,
    yoyo: true,
  });
}

