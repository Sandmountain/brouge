interface ChaosEffectContext {
  ball: Phaser.Physics.Arcade.Sprite;
}

/**
 * Randomize ball direction (chaos brick effect)
 */
export function randomizeBallDirection(
  context: ChaosEffectContext
): void {
  const { ball } = context;

  // Get current ball speed
  const ballBody = ball.body as Phaser.Physics.Arcade.Body;
  const currentSpeed = Math.sqrt(
    ballBody.velocity.x ** 2 + ballBody.velocity.y ** 2
  );

  // Generate completely random angle (0 to 360 degrees)
  // We want to ensure it goes upward, so use angles from -90 to 90 degrees from vertical
  const randomAngle = Math.floor(Math.random() * 181) - 90; // -90 to 90
  const angleRad = (randomAngle * Math.PI) / 180;

  // Calculate new velocity with random direction
  // Keep speed constant but randomize direction
  const velocityX = Math.sin(angleRad) * currentSpeed;
  const velocityY = -Math.abs(Math.cos(angleRad) * currentSpeed); // Always upward

  ball.setVelocity(velocityX, velocityY);
}

