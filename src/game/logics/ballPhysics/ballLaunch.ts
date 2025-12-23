interface BallLaunchContext {
  ball: Phaser.Physics.Arcade.Sprite;
  shieldArc: Phaser.Physics.Arcade.Sprite;
  physics: Phaser.Physics.Arcade.ArcadePhysics;
  ballSpeed: number;
}

/**
 * Launch the ball from the shield
 */
export function launchBall(context: BallLaunchContext): void {
  const { ball, shieldArc, physics, ballSpeed } = context;

  // Calculate launch angle based on shield's X position
  const worldBounds = physics.world.bounds;
  const shieldX = shieldArc.x;

  // Normalize shield position relative to world bounds (0 = left edge, 1 = right edge)
  const normalizedX = Math.max(
    0,
    Math.min(1, (shieldX - worldBounds.x) / worldBounds.width)
  );

  // Map to angle: 10 degrees (left edge, fires right) to 170 degrees (right edge, fires left)
  // Center (0.5) = 90 degrees (straight up)
  const launchAngle = 10 + normalizedX * 160; // Maps to 10-170 degrees

  // Convert angle to radians and calculate velocity
  const angleRad = (launchAngle * Math.PI) / 180;
  const velocityX = Math.cos(angleRad) * ballSpeed;
  const velocityY = -Math.sin(angleRad) * ballSpeed; // Negative because Y increases downward

  ball.setVelocity(velocityX, velocityY);
}
