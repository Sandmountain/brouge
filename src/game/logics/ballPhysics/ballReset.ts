interface BallResetContext {
  ball: Phaser.Physics.Arcade.Sprite;
  shieldArc: Phaser.Physics.Arcade.Sprite;
  ballLaunched: { value: boolean };
}

/**
 * Reset ball to connected state on shield
 */
export function resetBall(context: BallResetContext): void {
  const { ball, shieldArc, ballLaunched } = context;
  // Reset ball to connected state on shield arc
  ball.setPosition(shieldArc.x, shieldArc.y - 15);
  ball.setVelocity(0, 0);
  ballLaunched.value = false;
  // Ball will launch when user presses space or clicks mouse
}

