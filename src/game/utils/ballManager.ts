import { Scene } from "phaser";
import { launchBall } from "../logics/ballPhysics/ballLaunch";
import { resetBall } from "../logics/ballPhysics/ballReset";

export interface BallManager {
  ball: Phaser.Physics.Arcade.Sprite;
  prevBallVelocity: { x: number; y: number };
  update: (
    delta: number,
    ballLaunched: { value: boolean },
    shieldArc: Phaser.Physics.Arcade.Sprite
  ) => void;
  launch: (
    shieldArc: Phaser.Physics.Arcade.Sprite,
    physics: Phaser.Physics.Arcade.ArcadePhysics,
    ballSpeed: number
  ) => void;
  reset: (
    shieldArc: Phaser.Physics.Arcade.Sprite,
    ballLaunched: { value: boolean }
  ) => void;
  destroy: () => void;
}

/**
 * Creates a ball manager that handles ball sprite, trail effects, and physics
 * @param scene The Phaser scene
 * @param options Configuration options
 * @returns BallManager with update, launch, reset, and destroy methods
 */
export function createBallManager(
  scene: Scene,
  options: {
    initialX: number;
    initialY: number;
  }
): BallManager {
  const { initialX, initialY } = options;

  // Create ball with gray appearance and border
  const ballGraphics = scene.add.graphics();
  const ballSize = 10;
  const ballCenter = 11; // Center in 22x22 texture
  const borderWidth = 1;

  // Light gray border/frame (outer circle)
  ballGraphics.fillStyle(0xcccccc);
  ballGraphics.fillCircle(ballCenter, ballCenter, ballSize + borderWidth);

  // Main gray circle
  ballGraphics.fillStyle(0xaaaaaa);
  ballGraphics.fillCircle(ballCenter, ballCenter, ballSize);

  // Lighter gray highlight on top-left for depth
  ballGraphics.fillStyle(0xbbbbbb);
  ballGraphics.fillCircle(ballCenter - 2, ballCenter - 2, ballSize - 3);

  // Dimmed highlight on top-left (glossy effect)
  ballGraphics.fillStyle(0xdddddd, 0.5);
  ballGraphics.fillCircle(ballCenter - 3, ballCenter - 3, 4);

  // Smaller dimmed spot for extra shine
  ballGraphics.fillStyle(0xeeeeee, 0.6);
  ballGraphics.fillCircle(ballCenter - 2, ballCenter - 2, 2);

  // Generate texture
  ballGraphics.generateTexture("ball", 22, 22);
  ballGraphics.destroy();

  // Create ball sprite
  const ball = scene.physics.add.sprite(initialX, initialY, "ball");
  ball.setCollideWorldBounds(true);
  ball.setBounce(1, 1);
  ball.setCircle(10);
  ball.setVelocity(0, 0);
  // Set depth above planets (planets are at depth 11-15, so ball should be higher)
  ball.setDepth(20);

  // Ball trail effect
  const ballTrail: Phaser.GameObjects.Sprite[] = [];
  let previousBallX = initialX;
  let previousBallY = initialY;
  let ballTrailTimer = 0;

  // Previous velocity tracking (for portal teleportation)
  const prevBallVelocity = { x: 0, y: 0 };

  // Update function
  const update = (
    delta: number,
    ballLaunched: { value: boolean },
    shieldArc: Phaser.Physics.Arcade.Sprite
  ) => {
    // Store ball velocity before collisions (for portal teleportation)
    if (ball?.body) {
      const ballBody = ball.body as Phaser.Physics.Arcade.Body;
      if (ballBody.velocity.x !== 0 || ballBody.velocity.y !== 0) {
        prevBallVelocity.x = ballBody.velocity.x;
        prevBallVelocity.y = ballBody.velocity.y;
      }
    }

    // Ball motion blur trail effect
    const ballMoved =
      Math.abs(ball.x - previousBallX) > 0.5 ||
      Math.abs(ball.y - previousBallY) > 0.5;

    if (ballMoved && ballLaunched.value) {
      const deltaTime = scene.game.loop.delta;
      ballTrailTimer += deltaTime;
      if (ballTrailTimer >= 8) {
        ballTrailTimer = 0;

        const ballTrailSprite = scene.add.sprite(
          previousBallX,
          previousBallY,
          "ball"
        );
        ballTrailSprite.setDepth(19); // Just below the ball but above planets
        ballTrailSprite.setOrigin(0.5, 0.5);
        ballTrailSprite.setAlpha(0.08);
        ballTrailSprite.setTint(0x88aaff);

        ballTrail.push(ballTrailSprite);

        scene.tweens.add({
          targets: ballTrailSprite,
          alpha: 0,
          scale: 0.7,
          duration: 400,
          ease: "Power2",
          onComplete: () => {
            ballTrailSprite.destroy();
            const index = ballTrail.indexOf(ballTrailSprite);
            if (index > -1) {
              ballTrail.splice(index, 1);
            }
          },
        });
      }
    }

    // Update previous ball position
    previousBallX = ball.x;
    previousBallY = ball.y;

    // If ball is not launched, keep it connected to the shield arc
    if (!ballLaunched.value) {
      ball.setX(shieldArc.x);
      ball.setY(shieldArc.y - 15);
      ball.setVelocity(0, 0);
      // Reset trail position when ball is not launched
      previousBallX = ball.x;
      previousBallY = ball.y;
    }
  };

  // Launch function
  const launch = (
    shieldArc: Phaser.Physics.Arcade.Sprite,
    physics: Phaser.Physics.Arcade.ArcadePhysics,
    ballSpeed: number
  ) => {
    launchBall({
      ball,
      shieldArc,
      physics,
      ballSpeed,
    });
  };

  // Reset function
  const reset = (
    shieldArc: Phaser.Physics.Arcade.Sprite,
    ballLaunched: { value: boolean }
  ) => {
    resetBall({
      ball,
      shieldArc,
      ballLaunched,
    });
    // Reset trail position
    previousBallX = ball.x;
    previousBallY = ball.y;
  };

  // Cleanup function
  const destroy = () => {
    ballTrail.forEach((trail) => trail.destroy());
  };

  return {
    ball,
    prevBallVelocity,
    update,
    launch,
    reset,
    destroy,
  };
}

