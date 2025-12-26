import { Scene } from "phaser";
import { animateShield } from "../logics/shield/shieldAnimation";

interface ShieldWithProps extends Phaser.Physics.Arcade.Sprite {
  shieldWidth?: number;
  shieldHeight?: number;
  shieldRadius?: number;
  pulsePhase?: number;
}

interface KeyboardState {
  cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  keyState?: { [key: string]: boolean };
}

export interface PlayerManager {
  shieldArc: Phaser.Physics.Arcade.Sprite;
  update: (
    delta: number,
    keyboardState: KeyboardState,
    worldBounds: Phaser.Geom.Rectangle,
    ballLaunched: { value: boolean },
    ball?: Phaser.Physics.Arcade.Sprite
  ) => void;
  destroy: () => void;
}

/**
 * Creates a player manager that handles shield, ship, fire effects, and trails
 * @param scene The Phaser scene
 * @param options Configuration options
 * @returns PlayerManager with update and destroy methods
 */
export function createPlayerManager(
  scene: Scene,
  options: {
    paddleWidth: number;
    paddleSpeed: number;
    paddleAcceleration: number;
    paddleDeceleration: number;
    initialX: number;
    initialY: number;
  }
): PlayerManager {
  const {
    paddleWidth,
    paddleSpeed,
    paddleAcceleration,
    paddleDeceleration,
    initialX,
    initialY,
  } = options;

  // Enable smooth texture filtering for ship and fire sprites
  const shipTexture = scene.textures.get("playerShip2_blue");
  if (shipTexture) {
    shipTexture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  // Set linear filtering for all fire textures
  for (let i = 0; i <= 19; i++) {
    const fireNum = i.toString().padStart(2, "0");
    const fireTexture = scene.textures.get(`fire${fireNum}`);
    if (fireTexture) {
      fireTexture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }

  // Create shield arc
  const shieldWidth = paddleWidth;
  const shieldHeight = 10;
  const shieldRadius = (shieldWidth * shieldWidth) / (8 * shieldHeight);

  // Create initial shield texture
  const shieldGraphics = scene.add.graphics();
  shieldGraphics.generateTexture("shield", shieldWidth, shieldHeight);
  shieldGraphics.destroy();

  // Create shield arc sprite
  const shieldArc = scene.physics.add.sprite(initialX, initialY, "shield");
  shieldArc.setCollideWorldBounds(true);
  shieldArc.setImmovable(true);
  shieldArc.setSize(shieldWidth, shieldHeight);

  // Store shield properties
  const shieldWithProps = shieldArc as ShieldWithProps;
  shieldWithProps.shieldWidth = shieldWidth;
  shieldWithProps.shieldHeight = shieldHeight;
  shieldWithProps.shieldRadius = shieldRadius;
  shieldWithProps.pulsePhase = 0;

  // Create graphics object for drawing the shield
  const shieldGraphicsDraw = scene.add.graphics();
  shieldGraphicsDraw.setDepth(10);

  // Draw initial shield
  animateShield({
    shieldArc,
    shieldGraphics: shieldGraphicsDraw,
  });

  // Create player ship sprite
  const playerShip = scene.add.sprite(
    shieldArc.x,
    shieldArc.y + 20,
    "playerShip2_blue"
  );
  playerShip.setDepth(5);
  playerShip.setOrigin(0.5, 0.5);
  playerShip.setScale(0.5);
  if (playerShip.texture) {
    playerShip.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  // Initialize trail variables
  let previousShipX = shieldArc.x;
  let previousShipY = shieldArc.y + 20;
  let previousFireLeftX = shieldArc.x - 10;
  let previousFireLeftY = shieldArc.y + 40;
  let previousFireRightX = shieldArc.x + 10;
  let previousFireRightY = shieldArc.y + 40;
  let trailTimer = 0;

  // Create left wing fire effect sprite
  const shipFireLeft = scene.add.sprite(
    shieldArc.x - 10,
    shieldArc.y + 40,
    "fire06"
  );
  shipFireLeft.setDepth(6);
  shipFireLeft.setOrigin(0.5, 0.5);
  shipFireLeft.setScale(0.6);
  shipFireLeft.setRotation(Math.PI);
  shipFireLeft.setVisible(true);
  if (shipFireLeft.texture) {
    shipFireLeft.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  // Create right wing fire effect sprite
  const shipFireRight = scene.add.sprite(
    shieldArc.x + 10,
    shieldArc.y + 40,
    "fire06"
  );
  shipFireRight.setDepth(6);
  shipFireRight.setOrigin(0.5, 0.5);
  shipFireRight.setScale(0.6);
  shipFireRight.setRotation(Math.PI);
  shipFireRight.setVisible(true);
  if (shipFireRight.texture) {
    shipFireRight.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  // Fire animation variables
  let fireFrameIndex = 0; // 0 = fire06, 1 = fire07
  let fireFrameTimer = 0;

  // Motion blur trails
  const shipTrail: Phaser.GameObjects.Sprite[] = [];
  const fireTrailLeft: Phaser.GameObjects.Sprite[] = [];
  const fireTrailRight: Phaser.GameObjects.Sprite[] = [];

  // Movement state
  let paddleVelocity = 0;

  // Update function
  const update = (
    delta: number,
    keyboardState: KeyboardState,
    worldBounds: Phaser.Geom.Rectangle,
    ballLaunched: { value: boolean },
    ball?: Phaser.Physics.Arcade.Sprite
  ) => {
    const deltaTime = scene.game.loop.delta;
    const clampedDeltaTime = Math.min(deltaTime, 50);
    const deltaTimeSeconds = clampedDeltaTime / 1000;

    // Check keyboard input
    const { cursors, wasdKeys, keyState = {} } = keyboardState;
    const leftPressed =
      cursors?.left?.isDown ||
      wasdKeys?.A?.isDown ||
      keyState["a"] ||
      keyState["arrowleft"] ||
      keyState["keya"];
    const rightPressed =
      cursors?.right?.isDown ||
      wasdKeys?.D?.isDown ||
      keyState["d"] ||
      keyState["arrowright"] ||
      keyState["keyd"];

    // Apply acceleration or deceleration
    if (leftPressed) {
      paddleVelocity -= paddleAcceleration * deltaTimeSeconds;
      paddleVelocity = Math.max(-paddleSpeed, paddleVelocity);
    } else if (rightPressed) {
      paddleVelocity += paddleAcceleration * deltaTimeSeconds;
      paddleVelocity = Math.min(paddleSpeed, paddleVelocity);
    } else {
      if (Math.abs(paddleVelocity) > 0.1) {
        if (paddleVelocity > 0) {
          paddleVelocity -= paddleDeceleration * deltaTimeSeconds;
          paddleVelocity = Math.max(0, paddleVelocity);
        } else {
          paddleVelocity += paddleDeceleration * deltaTimeSeconds;
          paddleVelocity = Math.min(0, paddleVelocity);
        }
      } else {
        paddleVelocity = 0;
      }
    }

    // Apply velocity to position
    const moveDistance = paddleVelocity * deltaTimeSeconds;
    if (Math.abs(moveDistance) > 0.1) {
      const newX = Math.max(
        worldBounds.x + paddleWidth / 2,
        Math.min(
          worldBounds.right - paddleWidth / 2,
          shieldArc.x + moveDistance
        )
      );
      shieldArc.setX(newX);
      playerShip.setX(newX);
    }

    // Calculate rotation based on velocity
    const maxRotation = 15 * (Math.PI / 180);
    const normalizedVelocity = paddleVelocity / paddleSpeed;
    const targetRotation = normalizedVelocity * maxRotation;

    // Smoothly interpolate rotation
    const rotationSpeed = 8;
    const currentShipRotation = playerShip.rotation;
    const rotationDiff = targetRotation - currentShipRotation;
    const newRotation =
      currentShipRotation +
      rotationDiff * Math.min(1, rotationSpeed * deltaTimeSeconds);

    // Apply rotation
    playerShip.setRotation(newRotation);
    shieldArc.setRotation(newRotation);

    // Update fire positions with rotation
    const shipX = shieldArc.x;
    const shipY = shieldArc.y + 20;
    const fireOffsetX = 10;
    const fireOffsetY = 20;
    const cosRot = Math.cos(newRotation);
    const sinRot = Math.sin(newRotation);

    const leftFireX = shipX + (-fireOffsetX * cosRot - fireOffsetY * sinRot);
    const leftFireY = shipY + (-fireOffsetX * sinRot + fireOffsetY * cosRot);
    const rightFireX = shipX + (fireOffsetX * cosRot - fireOffsetY * sinRot);
    const rightFireY = shipY + (fireOffsetX * sinRot + fireOffsetY * cosRot);

    shipFireLeft.setPosition(leftFireX, leftFireY);
    shipFireLeft.setRotation(Math.PI + newRotation);
    shipFireRight.setPosition(rightFireX, rightFireY);
    shipFireRight.setRotation(Math.PI + newRotation);

    // Motion blur trail for ship
    const currentShipX = shieldArc.x;
    const currentShipY = shieldArc.y + 20;
    const shipMoved =
      Math.abs(currentShipX - previousShipX) > 0.5 ||
      Math.abs(currentShipY - previousShipY) > 0.5;

    if (shipMoved) {
      trailTimer += delta;
      if (trailTimer >= 16) {
        trailTimer = 0;

        const trailSprite = scene.add.sprite(
          previousShipX,
          previousShipY,
          "playerShip2_blue"
        );
        trailSprite.setDepth(4);
        trailSprite.setOrigin(0.5, 0.5);
        trailSprite.setScale(0.5);
        trailSprite.setRotation(playerShip.rotation);
        trailSprite.setAlpha(0.1);
        trailSprite.setTint(0x88aaff);

        shipTrail.push(trailSprite);

        scene.tweens.add({
          targets: trailSprite,
          alpha: 0,
          duration: 200,
          ease: "Power2",
          onComplete: () => {
            trailSprite.destroy();
            const index = shipTrail.indexOf(trailSprite);
            if (index > -1) {
              shipTrail.splice(index, 1);
            }
          },
        });
      }
    }

    previousShipX = currentShipX;
    previousShipY = currentShipY;

    // Motion blur trail for fires
    const fireLeftMoved =
      Math.abs(leftFireX - previousFireLeftX) > 0.5 ||
      Math.abs(leftFireY - previousFireLeftY) > 0.5;
    const fireRightMoved =
      Math.abs(rightFireX - previousFireRightX) > 0.5 ||
      Math.abs(rightFireY - previousFireRightY) > 0.5;

    if (fireLeftMoved && trailTimer >= 16) {
      const fireTrailSprite = scene.add.sprite(
        previousFireLeftX,
        previousFireLeftY,
        `fire${fireFrameIndex === 0 ? "06" : "07"}`
      );
      fireTrailSprite.setDepth(3);
      fireTrailSprite.setOrigin(0.5, 0.5);
      fireTrailSprite.setScale(0.6);
      fireTrailSprite.setRotation(Math.PI + playerShip.rotation);
      fireTrailSprite.setAlpha(0.12);
      fireTrailSprite.setTint(0xffaa88);

      fireTrailLeft.push(fireTrailSprite);

      scene.tweens.add({
        targets: fireTrailSprite,
        alpha: 0,
        duration: 150,
        ease: "Power2",
        onComplete: () => {
          fireTrailSprite.destroy();
          const index = fireTrailLeft.indexOf(fireTrailSprite);
          if (index > -1) {
            fireTrailLeft.splice(index, 1);
          }
        },
      });
    }

    if (fireRightMoved && trailTimer >= 16) {
      const fireTrailSprite = scene.add.sprite(
        previousFireRightX,
        previousFireRightY,
        `fire${fireFrameIndex === 0 ? "06" : "07"}`
      );
      fireTrailSprite.setDepth(3);
      fireTrailSprite.setOrigin(0.5, 0.5);
      fireTrailSprite.setScale(0.6);
      fireTrailSprite.setRotation(Math.PI + playerShip.rotation);
      fireTrailSprite.setAlpha(0.12);
      fireTrailSprite.setTint(0xffaa88);

      fireTrailRight.push(fireTrailSprite);

      scene.tweens.add({
        targets: fireTrailSprite,
        alpha: 0,
        duration: 150,
        ease: "Power2",
        onComplete: () => {
          fireTrailSprite.destroy();
          const index = fireTrailRight.indexOf(fireTrailSprite);
          if (index > -1) {
            fireTrailRight.splice(index, 1);
          }
        },
      });
    }

    previousFireLeftX = leftFireX;
    previousFireLeftY = leftFireY;
    previousFireRightX = rightFireX;
    previousFireRightY = rightFireY;

    // Keep ball connected to shield when not launched
    if (ball && !ballLaunched.value) {
      ball.setX(shieldArc.x);
      ball.setY(shieldArc.y - 15);
      ball.setVelocity(0, 0);
    }

    // Animate shield
    animateShield({
      shieldArc,
      shieldGraphics: shieldGraphicsDraw,
    });

    // Animate fire effect
    fireFrameTimer += delta;
    const fireFrameDuration = 100;
    if (fireFrameTimer >= fireFrameDuration) {
      fireFrameTimer = 0;
      fireFrameIndex = (fireFrameIndex + 1) % 2;
      const fireNum = fireFrameIndex === 0 ? "06" : "07";
      shipFireLeft.setTexture(`fire${fireNum}`);
      shipFireRight.setTexture(`fire${fireNum}`);
    }
  };

  // Cleanup function
  const destroy = () => {
    // Clean up all trail sprites
    shipTrail.forEach((trail) => trail.destroy());
    fireTrailLeft.forEach((trail) => trail.destroy());
    fireTrailRight.forEach((trail) => trail.destroy());
    shieldGraphicsDraw.destroy();
  };

  return {
    shieldArc,
    update,
    destroy,
  };
}

