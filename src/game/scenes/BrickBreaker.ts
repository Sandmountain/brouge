import { EventBus } from "../EventBus";
import { Scene } from "phaser";
import { GameState, BrickData, LevelData } from "../types";
import {
  createAnimatedBackground,
  BackgroundManager,
} from "../utils/backgroundUtils";
// Game logic modules
import { explodeTNT } from "../logics/explosions/tntExplosion";
import { explodeFuse } from "../logics/explosions/fuseExplosion";
import { damageNeighbors } from "../logics/explosions/damageNeighbors";
import { handleBrickHit } from "../logics/brickInteractions/brickHitHandler";
import { teleportBall } from "../logics/brickInteractions/portalTeleport";
import { randomizeBallDirection } from "../logics/brickInteractions/chaosEffect";
import { updateMetalBrickAppearance } from "../logics/brickInteractions/metalBrickAppearance";
import { launchBall } from "../logics/ballPhysics/ballLaunch";
import { handlePaddleHit } from "../logics/ballPhysics/paddleHit";
import { resetBall } from "../logics/ballPhysics/ballReset";
import { handleBallMissed } from "../logics/ballPhysics/ballMissed";
import {
  createBricksFromLevel,
  createDefaultLevel,
} from "../logics/brickCreation/brickGrid";
import { destroyBrick } from "../logics/gameState/brickDestruction";
import { dropItem } from "../logics/gameState/itemDrops";
import { levelComplete } from "../logics/gameState/winCondition";
import { animateShield } from "../logics/shield/shieldAnimation";
import { EndlessModeManager } from "../logics/endlessMode/endlessModeManager";
import { createBrickFromData } from "../logics/brickCreation/brickFactory";

type BrickSprite = Phaser.GameObjects.DOMElement & { brickData?: BrickData };

export class BrickBreaker extends Scene {
  private ball!: Phaser.Physics.Arcade.Sprite;
  private bricks!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private gameState: GameState = {
    coins: 0,
    lives: 3,
    level: 1,
    score: 0,
    talents: [],
  };

  private levelData?: LevelData;

  private uiText!: {
    coins: Phaser.GameObjects.Text;
    lives: Phaser.GameObjects.Text;
    level: Phaser.GameObjects.Text;
    score: Phaser.GameObjects.Text;
  };

  private ballSpeed: number = 400;
  private paddleSpeed: number = 500;
  private paddleAcceleration: number = 3000; // pixels per second squared
  private paddleDeceleration: number = 2500; // pixels per second squared
  private paddleVelocity: number = 0; // current velocity in pixels per second
  private paddleWidth: number = 120;
  private ballLaunched: { value: boolean } = { value: false };
  private prevBallVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private cachedWorldBounds?: Phaser.Geom.Rectangle;
  private lastPaddleHitTime: number = 0;
  private lastBrickHits: Map<Phaser.GameObjects.GameObject, number> = new Map();
  private shieldArc!: Phaser.Physics.Arcade.Sprite; // Shield arc that bounces the ball
  private shieldGraphics!: Phaser.GameObjects.Graphics; // Graphics object for drawing the shield
  private playerShip!: Phaser.GameObjects.Sprite; // Player ship sprite
  private shipFireLeft!: Phaser.GameObjects.Sprite; // Left wing fire animation sprite
  private shipFireRight!: Phaser.GameObjects.Sprite; // Right wing fire animation sprite
  private fireFrameIndex: number = 0; // Current frame index for fire animation (0 = fire06, 1 = fire07)
  private fireFrameTimer: number = 0; // Timer for fire animation
  private shipTrail: Phaser.GameObjects.Sprite[] = []; // Motion blur trail sprites
  private fireTrailLeft: Phaser.GameObjects.Sprite[] = []; // Motion blur trail for left fire
  private fireTrailRight: Phaser.GameObjects.Sprite[] = []; // Motion blur trail for right fire
  private trailTimer: number = 0; // Timer for creating trail sprites
  private previousShipX: number = 0; // Previous ship X position
  private previousShipY: number = 0; // Previous ship Y position
  private previousFireLeftX: number = 0; // Previous left fire X position
  private previousFireLeftY: number = 0; // Previous left fire Y position
  private previousFireRightX: number = 0; // Previous right fire X position
  private previousFireRightY: number = 0; // Previous right fire Y position
  private ballTrail: Phaser.GameObjects.Sprite[] = []; // Motion blur trail for ball
  private previousBallX: number = 0; // Previous ball X position
  private previousBallY: number = 0; // Previous ball Y position
  private ballTrailTimer: number = 0; // Timer for ball trail sprites
  private deathZone!: Phaser.GameObjects.Zone;
  private coinMultiplier: number = 1;
  private dropChanceBonus: number = 0;
  private breakableBrickCount: { value: number } = { value: 0 };
  private isTestMode: boolean = false;
  private isEndlessMode: boolean = false;
  private endlessModeManager: any = null; // Will be EndlessModeManager

  // Background manager
  private backgroundManager?: BackgroundManager;

  constructor() {
    super("BrickBreaker");
  }

  init(data?: {
    gameState?: GameState;
    levelData?: LevelData;
    isTestMode?: boolean;
    isEndlessMode?: boolean;
  }) {
    if (data?.gameState) {
      this.gameState = { ...data.gameState };
    }
    if (data?.levelData) {
      this.levelData = data.levelData;
    }
    if (data?.isTestMode) {
      this.isTestMode = data.isTestMode;
    }
    if (data?.isEndlessMode) {
      this.isEndlessMode = data.isEndlessMode;
    }

    // Apply talent effects
    if (this.gameState.talents.includes("paddle-size")) {
      this.paddleWidth = 144; // 20% increase
    }
    if (this.gameState.talents.includes("ball-speed")) {
      this.ballSpeed = 460; // 15% increase
    }
    if (this.gameState.talents.includes("coin-multiplier")) {
      this.coinMultiplier = 1.5;
    }
    if (this.gameState.talents.includes("drop-rate")) {
      this.dropChanceBonus = 0.1;
    }
  }

  create() {
    // Create animated background (reusable function)
    this.backgroundManager = createAnimatedBackground(this);

    // Enable smooth texture filtering for ship and fire sprites to reduce pixelation
    const shipTexture = this.textures.get("playerShip2_blue");
    if (shipTexture) {
      shipTexture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

    // Set linear filtering for all fire textures
    for (let i = 0; i <= 19; i++) {
      const fireNum = i.toString().padStart(2, "0");
      const fireTexture = this.textures.get(`fire${fireNum}`);
      if (fireTexture) {
        fireTexture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }

    // Create shield arc (shallow arc, less round) - energy force field
    // We'll create this as a sprite that we can animate
    const shieldWidth = this.paddleWidth; // Keep the same width as before (120px)
    const shieldHeight = 10; // Small height for shallow arc
    // For a very shallow arc that fits within 10px height, use a much larger radius
    // This creates a subtle curve that doesn't extend beyond the height
    // Using: R ≈ w² / (8h) for a shallow arc
    const shieldRadius = (shieldWidth * shieldWidth) / (8 * shieldHeight);

    // Create initial shield texture (will be animated in update loop)
    // Just create empty texture, animation will draw it immediately
    const shieldGraphics = this.add.graphics();
    shieldGraphics.generateTexture("shield", shieldWidth, shieldHeight);
    shieldGraphics.destroy();

    // Create shield arc sprite
    this.shieldArc = this.physics.add.sprite(
      this.scale.width / 2,
      this.scale.height - 50,
      "shield"
    );
    this.shieldArc.setCollideWorldBounds(true);
    this.shieldArc.setImmovable(true);
    // Set collision shape to match the arc (rectangular collision for shallow arc)
    this.shieldArc.setSize(shieldWidth, shieldHeight);

    // Store shield properties for animation
    interface ShieldWithProps extends Phaser.Physics.Arcade.Sprite {
      shieldWidth?: number;
      shieldHeight?: number;
      shieldRadius?: number;
      pulsePhase?: number;
    }
    const shieldWithProps = this.shieldArc as ShieldWithProps;
    shieldWithProps.shieldWidth = shieldWidth;
    shieldWithProps.shieldHeight = shieldHeight;
    shieldWithProps.shieldRadius = shieldRadius;
    shieldWithProps.pulsePhase = 0;

    // Create graphics object for drawing the shield (added to scene, not as texture)
    this.shieldGraphics = this.add.graphics();
    this.shieldGraphics.setDepth(10); // Draw above other objects

    // Draw initial shield immediately so it's visible
    this.animateShield();

    // Create player ship sprite - positioned below the shield
    this.playerShip = this.add.sprite(
      this.shieldArc.x,
      this.shieldArc.y + 20, // Position below the shield
      "playerShip2_blue"
    );
    this.playerShip.setDepth(5); // Below shield but above background
    this.playerShip.setOrigin(0.5, 0.5); // Center origin
    this.playerShip.setScale(0.5); // 50% smaller
    // Enable smooth texture filtering to reduce pixelation
    if (this.playerShip.texture) {
      this.playerShip.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

    // Initialize trail variables
    this.previousShipX = this.shieldArc.x;
    this.previousShipY = this.shieldArc.y + 20;
    this.previousFireLeftX = this.shieldArc.x - 10;
    this.previousFireLeftY = this.shieldArc.y + 40;
    this.previousFireRightX = this.shieldArc.x + 10;
    this.previousFireRightY = this.shieldArc.y + 40;
    this.trailTimer = 0;

    // Create left wing fire effect sprite
    this.shipFireLeft = this.add.sprite(
      this.shieldArc.x - 10, // Left side of ship
      this.shieldArc.y + 40, // Position below the wings
      "fire06"
    );
    this.shipFireLeft.setDepth(6); // Above ship but below shield
    this.shipFireLeft.setOrigin(0.5, 0.5);
    this.shipFireLeft.setScale(0.6); // 50% smaller
    this.shipFireLeft.setRotation(Math.PI); // Rotate 180 degrees (pointing down)
    this.shipFireLeft.setVisible(true); // Ensure visible
    // Enable smooth texture filtering to reduce pixelation
    if (this.shipFireLeft.texture) {
      this.shipFireLeft.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

    // Create right wing fire effect sprite
    this.shipFireRight = this.add.sprite(
      this.shieldArc.x + 10, // Right side of ship
      this.shieldArc.y + 40, // Position below the wings
      "fire06"
    );
    this.shipFireRight.setDepth(6); // Above ship but below shield
    this.shipFireRight.setOrigin(0.5, 0.5);
    this.shipFireRight.setScale(0.6); // 50% smaller
    this.shipFireRight.setRotation(Math.PI); // Rotate 180 degrees (pointing down)
    this.shipFireRight.setVisible(true); // Ensure visible
    // Enable smooth texture filtering to reduce pixelation
    if (this.shipFireRight.texture) {
      this.shipFireRight.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

    // Initialize fire animation variables
    this.fireFrameIndex = 0; // 0 = fire06, 1 = fire07
    this.fireFrameTimer = 0;

    // Create ball with gray appearance and border (like the image)
    const ballGraphics = this.add.graphics();
    const ballSize = 10;
    const ballCenter = 11; // Center in 22x22 texture
    const borderWidth = 1;

    // Light gray border/frame (outer circle) - lighter, more towards white
    ballGraphics.fillStyle(0xcccccc);
    ballGraphics.fillCircle(ballCenter, ballCenter, ballSize + borderWidth);

    // Main gray circle - lighter, more towards white
    ballGraphics.fillStyle(0xaaaaaa);
    ballGraphics.fillCircle(ballCenter, ballCenter, ballSize);

    // Lighter gray highlight on top-left for depth - more subtle
    ballGraphics.fillStyle(0xbbbbbb);
    ballGraphics.fillCircle(ballCenter - 2, ballCenter - 2, ballSize - 3);

    // Dimmed highlight on top-left (glossy effect) - lighter
    ballGraphics.fillStyle(0xdddddd, 0.5);
    ballGraphics.fillCircle(ballCenter - 3, ballCenter - 3, 4);

    // Smaller dimmed spot for extra shine - lighter
    ballGraphics.fillStyle(0xeeeeee, 0.6);
    ballGraphics.fillCircle(ballCenter - 2, ballCenter - 2, 2);

    // Generate texture with exact size to ensure it's perfectly round
    ballGraphics.generateTexture("ball", 22, 22);
    ballGraphics.destroy();

    // Create ball - start it connected to the shield arc
    this.ball = this.physics.add.sprite(
      this.scale.width / 2,
      this.scale.height - 50 - 15, // Position above the shield arc
      "ball"
    );
    this.ball.setCollideWorldBounds(true);
    this.ball.setBounce(1, 1);
    this.ball.setCircle(10);
    // Initially, ball has no velocity (connected to shield)
    this.ball.setVelocity(0, 0);

    // Setup input - ensure keyboard is available
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    // Create cursor keys
    this.cursors = keyboard.createCursorKeys();

    // Create WASD keys
    this.wasdKeys = keyboard.addKeys("W,S,A,D") as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };

    // Add native keyboard event listeners as fallback
    const keyState: { [key: string]: boolean } = {};

    const handleKeyDown = (event: KeyboardEvent) => {
      keyState[event.key.toLowerCase()] = true;
      keyState[event.code.toLowerCase()] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keyState[event.key.toLowerCase()] = false;
      keyState[event.code.toLowerCase()] = false;
    };

    // Add event listeners to window (works even if canvas doesn't have focus)
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Store keyState and cleanup function
    interface BrickBreakerWithKeyState extends BrickBreaker {
      keyState?: { [key: string]: boolean };
      cleanupKeyboard?: () => void;
    }
    const self = this as BrickBreakerWithKeyState;
    self.keyState = keyState;
    self.cleanupKeyboard = () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };

    // Create bricks (this will set world bounds based on level grid)
    this.createBricks();

    // Create death zone at bottom (positioned after world bounds are set)
    const worldBounds = this.physics.world.bounds;
    this.deathZone = this.add.zone(
      worldBounds.centerX,
      worldBounds.bottom,
      worldBounds.width,
      10
    );
    this.physics.world.enable(this.deathZone);
    (this.deathZone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Setup collisions
    // Ball collides with shield arc, not the ship
    this.physics.add.collider(
      this.ball,
      this.shieldArc,
      this.hitPaddle as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    // Use collider instead of overlap so ball bounces off bricks
    this.physics.add.collider(
      this.ball,
      this.bricks,
      this.hitBrick as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.ball,
      this.deathZone,
      (_ball, _zone) => {
        // Check if we should move blocks down in endless mode
        if (this.isEndlessMode && this.endlessModeManager) {
          const lostBricks = this.endlessModeManager.checkAndMoveBlocksDown(
            0,
            true
          );
          if (lostBricks > 0) {
            // Lose a heart for each brick that reached bottom
            this.gameState.lives -= lostBricks;
            this.updateUI();

            if (this.gameState.lives <= 0) {
              this.scene.start("GameOver", { gameState: this.gameState });
              return;
            }
          }
        }

        handleBallMissed({
          scene: this,
          gameState: this.gameState,
          updateUI: () => this.updateUI(),
          resetBall: () => {
            resetBall({
              ball: this.ball,
              shieldArc: this.shieldArc,
              ballLaunched: this.ballLaunched,
            });
            // Reset hit tracking for new shot
            if (this.isEndlessMode && this.endlessModeManager) {
              this.endlessModeManager.resetHitTracking();
            }
          },
        });
      },
      undefined,
      this
    );

    // Create UI
    this.createUI();

    // Set up mouse input for launching ball and focus canvas
    this.input.on("pointerdown", () => {
      // Focus canvas for keyboard input
      if (this.game.canvas) {
        this.game.canvas.setAttribute("tabindex", "0");
        this.game.canvas.focus();
      }

      // Launch ball if not already launched
      if (!this.ballLaunched.value) {
        this.launchBall();
      }
    });

    // Ensure canvas has focus on scene start
    if (this.game.canvas) {
      this.game.canvas.setAttribute("tabindex", "0");
      this.game.canvas.focus();
    }

    EventBus.emit("current-scene-ready", this);
  }

  update(_time: number, delta: number) {
    // Update animated background
    if (this.backgroundManager) {
      this.backgroundManager.update(_time, delta);
    }

    // Store ball velocity before collisions (for portal teleportation)
    // Only update if ball exists and has velocity (optimization)
    if (this.ball?.body) {
      const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
      if (ballBody.velocity.x !== 0 || ballBody.velocity.y !== 0) {
        this.prevBallVelocity.x = ballBody.velocity.x;
        this.prevBallVelocity.y = ballBody.velocity.y;
      }
    }

    // Shield arc movement (left/right) with acceleration
    // Cache world bounds (they don't change during gameplay)
    if (!this.cachedWorldBounds) {
      this.cachedWorldBounds = this.physics.world.bounds;
    }
    const worldBounds = this.cachedWorldBounds;
    const deltaTime = this.game.loop.delta;
    // Clamp deltaTime to prevent huge jumps when frame rate drops (max 50ms = 20fps minimum)
    const clampedDeltaTime = Math.min(deltaTime, 50);
    const deltaTimeSeconds = clampedDeltaTime / 1000;

    // Check Phaser keyboard first, then fallback to native keyState
    // Optimize: cache keyState reference
    interface BrickBreakerWithKeyState extends BrickBreaker {
      keyState?: { [key: string]: boolean };
    }
    const self = this as BrickBreakerWithKeyState;
    const keyState = self.keyState || {};

    // Optimize: reduce redundant checks by checking Phaser keys first (faster)
    const leftPressed =
      this.cursors?.left?.isDown ||
      this.wasdKeys?.A?.isDown ||
      keyState["a"] ||
      keyState["arrowleft"] ||
      keyState["keya"];
    const rightPressed =
      this.cursors?.right?.isDown ||
      this.wasdKeys?.D?.isDown ||
      keyState["d"] ||
      keyState["arrowright"] ||
      keyState["keyd"];

    // Apply acceleration or deceleration
    if (leftPressed) {
      // Accelerate left (negative velocity)
      this.paddleVelocity -= this.paddleAcceleration * deltaTimeSeconds;
      this.paddleVelocity = Math.max(-this.paddleSpeed, this.paddleVelocity);
    } else if (rightPressed) {
      // Accelerate right (positive velocity)
      this.paddleVelocity += this.paddleAcceleration * deltaTimeSeconds;
      this.paddleVelocity = Math.min(this.paddleSpeed, this.paddleVelocity);
    } else {
      // Decelerate when no keys pressed (only if there's velocity to decelerate)
      if (Math.abs(this.paddleVelocity) > 0.1) {
        if (this.paddleVelocity > 0) {
          this.paddleVelocity -= this.paddleDeceleration * deltaTimeSeconds;
          this.paddleVelocity = Math.max(0, this.paddleVelocity);
        } else {
          this.paddleVelocity += this.paddleDeceleration * deltaTimeSeconds;
          this.paddleVelocity = Math.min(0, this.paddleVelocity);
        }
      } else {
        // Snap to zero if velocity is very small
        this.paddleVelocity = 0;
      }
    }

    // Apply velocity to position
    const moveDistance = this.paddleVelocity * deltaTimeSeconds;
    if (Math.abs(moveDistance) > 0.1) {
      // Only move if velocity is significant
      const newX = Math.max(
        worldBounds.x + this.paddleWidth / 2,
        Math.min(
          worldBounds.right - this.paddleWidth / 2,
          this.shieldArc.x + moveDistance
        )
      );
      this.shieldArc.setX(newX);

      // Update ship position to follow shield
      this.playerShip.setX(newX);
      // Fire positions will be updated below based on rotation
    }

    // Calculate rotation based on velocity (tilt when moving)
    // Max rotation: 15 degrees (about 0.26 radians) at max speed
    const maxRotation = 15 * (Math.PI / 180); // Convert to radians
    const normalizedVelocity = this.paddleVelocity / this.paddleSpeed; // -1 to 1
    const targetRotation = normalizedVelocity * maxRotation;

    // Smoothly interpolate rotation for a more natural feel
    const rotationSpeed = 8; // How fast rotation changes (higher = faster)
    const currentShipRotation = this.playerShip.rotation;
    const rotationDiff = targetRotation - currentShipRotation;
    const newRotation =
      currentShipRotation +
      rotationDiff * Math.min(1, rotationSpeed * deltaTimeSeconds);

    // Apply rotation to ship, shield arc, and fires
    this.playerShip.setRotation(newRotation);
    this.shieldArc.setRotation(newRotation);

    // Update fire positions to account for ship rotation
    // Calculate fire positions relative to ship center with rotation
    const shipX = this.shieldArc.x;
    const shipY = this.shieldArc.y + 20; // Ship is 20px below shield
    const fireOffsetX = 10; // Distance from center to wing
    const fireOffsetY = 20; // Distance from ship center to fire (fire is 20px below ship)
    const cosRot = Math.cos(newRotation);
    const sinRot = Math.sin(newRotation);

    // Left fire position (rotated around ship center)
    const leftFireX = shipX + (-fireOffsetX * cosRot - fireOffsetY * sinRot);
    const leftFireY = shipY + (-fireOffsetX * sinRot + fireOffsetY * cosRot);

    // Right fire position (rotated around ship center)
    const rightFireX = shipX + (fireOffsetX * cosRot - fireOffsetY * sinRot);
    const rightFireY = shipY + (fireOffsetX * sinRot + fireOffsetY * cosRot);

    this.shipFireLeft.setPosition(leftFireX, leftFireY);
    this.shipFireLeft.setRotation(Math.PI + newRotation); // Fire rotation (180 degrees) + ship rotation

    this.shipFireRight.setPosition(rightFireX, rightFireY);
    this.shipFireRight.setRotation(Math.PI + newRotation); // Fire rotation (180 degrees) + ship rotation

    // Motion blur trail effect
    const currentShipX = this.shieldArc.x;
    const currentShipY = this.shieldArc.y + 20;
    const shipMoved =
      Math.abs(currentShipX - this.previousShipX) > 0.5 ||
      Math.abs(currentShipY - this.previousShipY) > 0.5;

    if (shipMoved) {
      this.trailTimer += deltaTime;
      // Create a trail sprite every 16ms (60fps) when moving
      if (this.trailTimer >= 16) {
        this.trailTimer = 0;

        // Create a semi-transparent copy of the ship at previous position
        const trailSprite = this.add.sprite(
          this.previousShipX,
          this.previousShipY,
          "playerShip2_blue"
        );
        trailSprite.setDepth(4); // Below ship but above background
        trailSprite.setOrigin(0.5, 0.5);
        trailSprite.setScale(0.5);
        trailSprite.setRotation(this.playerShip.rotation);
        trailSprite.setAlpha(0.1); // Much more subtle - very low opacity
        trailSprite.setTint(0x88aaff); // Subtle blue tint for blur effect

        this.shipTrail.push(trailSprite);

        // Fade out and remove trail sprites
        this.tweens.add({
          targets: trailSprite,
          alpha: 0,
          duration: 200, // Fade out over 200ms
          ease: "Power2",
          onComplete: () => {
            trailSprite.destroy();
            const index = this.shipTrail.indexOf(trailSprite);
            if (index > -1) {
              this.shipTrail.splice(index, 1);
            }
          },
        });
      }
    }

    // Update previous position
    this.previousShipX = currentShipX;
    this.previousShipY = currentShipY;

    // Motion blur trail effect for fires
    const fireLeftMoved =
      Math.abs(leftFireX - this.previousFireLeftX) > 0.5 ||
      Math.abs(leftFireY - this.previousFireLeftY) > 0.5;
    const fireRightMoved =
      Math.abs(rightFireX - this.previousFireRightX) > 0.5 ||
      Math.abs(rightFireY - this.previousFireRightY) > 0.5;

    if (fireLeftMoved && this.trailTimer >= 16) {
      // Create trail for left fire
      const fireTrailSprite = this.add.sprite(
        this.previousFireLeftX,
        this.previousFireLeftY,
        `fire${this.fireFrameIndex === 0 ? "06" : "07"}`
      );
      fireTrailSprite.setDepth(3); // Below fire but above background
      fireTrailSprite.setOrigin(0.5, 0.5);
      fireTrailSprite.setScale(0.6);
      fireTrailSprite.setRotation(Math.PI + this.playerShip.rotation);
      fireTrailSprite.setAlpha(0.12); // Much more subtle - very low opacity
      fireTrailSprite.setTint(0xffaa88); // Orange/red tint for fire blur

      this.fireTrailLeft.push(fireTrailSprite);

      this.tweens.add({
        targets: fireTrailSprite,
        alpha: 0,
        duration: 150, // Fade out faster than ship trail
        ease: "Power2",
        onComplete: () => {
          fireTrailSprite.destroy();
          const index = this.fireTrailLeft.indexOf(fireTrailSprite);
          if (index > -1) {
            this.fireTrailLeft.splice(index, 1);
          }
        },
      });
    }

    if (fireRightMoved && this.trailTimer >= 16) {
      // Create trail for right fire
      const fireTrailSprite = this.add.sprite(
        this.previousFireRightX,
        this.previousFireRightY,
        `fire${this.fireFrameIndex === 0 ? "06" : "07"}`
      );
      fireTrailSprite.setDepth(3); // Below fire but above background
      fireTrailSprite.setOrigin(0.5, 0.5);
      fireTrailSprite.setScale(0.6);
      fireTrailSprite.setRotation(Math.PI + this.playerShip.rotation);
      fireTrailSprite.setAlpha(0.12); // Much more subtle - very low opacity
      fireTrailSprite.setTint(0xffaa88); // Orange/red tint for fire blur

      this.fireTrailRight.push(fireTrailSprite);

      this.tweens.add({
        targets: fireTrailSprite,
        alpha: 0,
        duration: 150, // Fade out faster than ship trail
        ease: "Power2",
        onComplete: () => {
          fireTrailSprite.destroy();
          const index = this.fireTrailRight.indexOf(fireTrailSprite);
          if (index > -1) {
            this.fireTrailRight.splice(index, 1);
          }
        },
      });
    }

    // Update previous fire positions
    this.previousFireLeftX = leftFireX;
    this.previousFireLeftY = leftFireY;
    this.previousFireRightX = rightFireX;
    this.previousFireRightY = rightFireY;

    // Ball motion blur trail effect (longer than ship trail)
    const ballMoved =
      Math.abs(this.ball.x - this.previousBallX) > 0.5 ||
      Math.abs(this.ball.y - this.previousBallY) > 0.5;

    if (ballMoved && this.ballLaunched.value) {
      this.ballTrailTimer += deltaTime;
      // Create a trail sprite every 8ms (120fps) for smoother, longer trail
      if (this.ballTrailTimer >= 8) {
        this.ballTrailTimer = 0;

        // Create a subtle blue trail sprite at previous position
        const ballTrailSprite = this.add.sprite(
          this.previousBallX,
          this.previousBallY,
          "ball"
        );
        ballTrailSprite.setDepth(2); // Below ball but above background
        ballTrailSprite.setOrigin(0.5, 0.5);
        ballTrailSprite.setAlpha(0.08); // Much more subtle - very low opacity
        ballTrailSprite.setTint(0x88aaff); // Subtle blue tint

        this.ballTrail.push(ballTrailSprite);

        // Fade out and remove trail sprites (longer duration than ship)
        this.tweens.add({
          targets: ballTrailSprite,
          alpha: 0,
          scale: 0.7, // Slightly shrink as it fades
          duration: 400, // Longer fade out (400ms vs 200ms for ship)
          ease: "Power2",
          onComplete: () => {
            ballTrailSprite.destroy();
            const index = this.ballTrail.indexOf(ballTrailSprite);
            if (index > -1) {
              this.ballTrail.splice(index, 1);
            }
          },
        });
      }
    }

    // Update previous ball position
    this.previousBallX = this.ball.x;
    this.previousBallY = this.ball.y;

    // If ball is not launched, keep it connected to the shield arc
    if (!this.ballLaunched.value) {
      this.ball.setX(this.shieldArc.x);
      this.ball.setY(this.shieldArc.y - 15); // Position above the shield arc
      this.ball.setVelocity(0, 0); // Keep it stationary
      // Reset trail position when ball is not launched
      this.previousBallX = this.ball.x;
      this.previousBallY = this.ball.y;
    }

    // Animate shield arc - pulsating energy force field
    animateShield({
      shieldArc: this.shieldArc,
      shieldGraphics: this.shieldGraphics,
    });

    // Animate fire effect - rotate between fire06 and fire07
    this.fireFrameTimer += deltaTime;
    const fireFrameDuration = 100; // 100ms per frame (10 fps for smoother alternation)
    if (this.fireFrameTimer >= fireFrameDuration) {
      this.fireFrameTimer = 0;
      this.fireFrameIndex = (this.fireFrameIndex + 1) % 2; // Cycle 0-1 (fire06 and fire07)
      const fireNum = this.fireFrameIndex === 0 ? "06" : "07";
      this.shipFireLeft.setTexture(`fire${fireNum}`);
      this.shipFireRight.setTexture(`fire${fireNum}`);
    }

    // Launch ball with spacebar or W
    // Only check if ball hasn't been launched yet (optimization)
    if (!this.ballLaunched.value) {
      const spacePressed =
        this.cursors?.space?.isDown ||
        this.wasdKeys?.W?.isDown ||
        keyState[" "] ||
        keyState["space"] ||
        keyState["w"] ||
        keyState["keyw"];
      if (spacePressed) {
        this.launchBall();
      }
    }
  }

  private animateShield() {
    interface ShieldWithProps extends Phaser.Physics.Arcade.Sprite {
      shieldWidth?: number;
      shieldHeight?: number;
      shieldRadius?: number;
      pulsePhase?: number;
    }
    const shield = this.shieldArc as ShieldWithProps;
    if (!shield.shieldWidth || !shield.shieldHeight || !shield.shieldRadius)
      return;

    shield.pulsePhase = (shield.pulsePhase || 0) + 0.05; // Animation speed
    if (shield.pulsePhase > Math.PI * 2) shield.pulsePhase = 0;

    const shieldWidth = shield.shieldWidth;
    const shieldHeight = shield.shieldHeight;
    const pulseIntensity = Math.sin(shield.pulsePhase);
    const baseThickness = 2;
    const pulseThickness = baseThickness + pulseIntensity * 0.5; // Subtle pulse between 1.5-2.5px
    const glowIntensity = 0.85 + pulseIntensity * 0.15; // Subtle pulse opacity 0.85-1.0 (humming, not fading)

    // Clear and redraw shield with current pulse state
    this.shieldGraphics.clear();

    // Position graphics at shield arc position (sprite origin is center by default)
    const shieldX = this.shieldArc.x;
    const shieldY = this.shieldArc.y;

    // Draw a subtle arc that fits within the 10px height bounds
    // The arc should be drawn from left edge to right edge, curving slightly upward
    const leftX = shieldX - shieldWidth / 2;
    const rightX = shieldX + shieldWidth / 2;
    const bottomY = shieldY + shieldHeight / 2; // Bottom of sprite

    // Use thinner lines for a subtle effect with gentle humming pulse
    const lineThickness = Math.max(1.5, pulseThickness); // Subtle pulse (1.5-2.5px)

    // Draw the arc as a curved line using multiple segments to create a subtle curve
    // Create a simple arc using line segments that fits within 10px height
    const segments = 20;
    // Outer glow (very subtle, always visible)
    this.shieldGraphics.lineStyle(
      lineThickness + 0.5,
      0x4ecdc4,
      glowIntensity * 0.4
    );
    this.shieldGraphics.beginPath();
    this.shieldGraphics.moveTo(leftX, bottomY);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = leftX + (rightX - leftX) * t;
      // Simple quadratic curve: y = bottomY - (shieldHeight * 4 * t * (1 - t))
      const curveHeight = shieldHeight * 0.8 + pulseIntensity * 0.5; // Very subtle pulse
      const y = bottomY - curveHeight * 4 * t * (1 - t);
      this.shieldGraphics.lineTo(x, y);
    }
    this.shieldGraphics.strokePath();

    // Main shield arc (brightest, with humming glow)
    this.shieldGraphics.lineStyle(lineThickness, 0x4ecdc4, glowIntensity);
    this.shieldGraphics.beginPath();
    this.shieldGraphics.moveTo(leftX, bottomY);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = leftX + (rightX - leftX) * t;
      const curveHeight = shieldHeight * 0.7;
      const y = bottomY - curveHeight * 4 * t * (1 - t);
      this.shieldGraphics.lineTo(x, y);
    }
    this.shieldGraphics.strokePath();

    // Inner core (brightest center, always visible)
    this.shieldGraphics.lineStyle(
      lineThickness * 0.7,
      0xffffff,
      Math.max(0.9, glowIntensity)
    );
    this.shieldGraphics.beginPath();
    this.shieldGraphics.moveTo(leftX + 2, bottomY - 1);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = leftX + 2 + (rightX - leftX - 4) * t;
      const curveHeight = shieldHeight * 0.6;
      const y = bottomY - 1 - curveHeight * 4 * t * (1 - t);
      this.shieldGraphics.lineTo(x, y);
    }
    this.shieldGraphics.strokePath();

    // Add subtle energy particles/sparks along the arc (smaller and fewer)
    const particleCount = 4; // Fewer particles
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount; // 0 to 1 along the arc
      const particleX = leftX + (rightX - leftX) * t;
      // Calculate Y position along the curve
      const curveHeight = shieldHeight * 0.7;
      const particleY = bottomY - curveHeight * 4 * t * (1 - t);
      const particlePhase = shield.pulsePhase + i * 0.5;
      // More subtle particle glow - stays visible, just gently pulses
      const particleGlow = 0.7 + Math.sin(particlePhase) * 0.3; // Pulse between 0.4-1.0, but we'll keep it higher

      this.shieldGraphics.fillStyle(
        0xffffff,
        Math.max(0.5, particleGlow * 0.8)
      );
      this.shieldGraphics.fillCircle(particleX, particleY, 1); // Smaller particles
    }
  }

  private launchBall() {
    if (this.ballLaunched.value) return;
    launchBall({
      ball: this.ball,
      shieldArc: this.shieldArc,
      physics: this.physics,
      ballSpeed: this.ballSpeed,
    });
    this.ballLaunched.value = true;
  }

  private hitPaddle(
    ball: Phaser.Physics.Arcade.Sprite,
    shield: Phaser.Physics.Arcade.Sprite
  ) {
    // Throttle collision handler to prevent multiple calls per frame
    const now = this.time.now;
    if (now - this.lastPaddleHitTime < 50) {
      return; // Ignore if called within 50ms of last call
    }

    // Check if we should move blocks down in endless mode
    if (this.isEndlessMode && this.endlessModeManager) {
      const lostBricks = this.endlessModeManager.checkAndMoveBlocksDown(
        now,
        false
      );
      if (lostBricks > 0) {
        // Lose a heart for each brick that reached bottom
        this.gameState.lives -= lostBricks;
        this.updateUI();

        if (this.gameState.lives <= 0) {
          this.scene.start("GameOver", { gameState: this.gameState });
          return;
        }
      }
    }

    this.lastPaddleHitTime = now;

    handlePaddleHit(ball, shield, {
      ball: this.ball,
      shieldArc: this.shieldArc,
      ballSpeed: this.ballSpeed,
      scene: this,
    });
  }

  private hitBrick(
    _ball: Phaser.GameObjects.GameObject,
    brick: Phaser.GameObjects.GameObject
  ) {
    // Throttle collision handler per brick to prevent multiple rapid hits
    const now = this.time.now;
    const lastHitTime = this.lastBrickHits.get(brick);
    if (lastHitTime && now - lastHitTime < 50) {
      return; // Ignore if same brick hit within 50ms
    }
    this.lastBrickHits.set(brick, now);

    // Clean up old entries (older than 1 second) to prevent memory leak
    if (this.lastBrickHits.size > 100) {
      for (const [b, time] of this.lastBrickHits.entries()) {
        if (now - time > 1000) {
          this.lastBrickHits.delete(b);
        }
      }
    }

    // Track brick hit for endless mode
    if (this.isEndlessMode && this.endlessModeManager) {
      this.endlessModeManager.onBrickHit();
    }

    handleBrickHit(brick, {
      scene: this,
      gameState: this.gameState,
      ball: this.ball,
      prevBallVelocity: this.prevBallVelocity,
      explodeTNT: (b, d) => this.explodeTNT(b, d),
      explodeFuse: (b, d) => this.explodeFuse(b, d),
      teleportBall: (b, d) =>
        teleportBall(b, d, {
          scene: this,
          ball: this.ball,
          bricks: this.bricks,
          prevBallVelocity: this.prevBallVelocity,
        }),
      randomizeBallDirection: () =>
        randomizeBallDirection({
          ball: this.ball,
        }),
      updateMetalBrickAppearance: (b, d) => updateMetalBrickAppearance(b, d),
      destroyBrick: (b, d) => this.destroyBrick(b, d),
    });
  }

  private explodeTNT(brick: BrickSprite, brickData: BrickData) {
    explodeTNT(brick, brickData, {
      scene: this,
      bricks: this.bricks,
      destroyBrick: (b, d) => this.destroyBrick(b, d),
      updateMetalBrickAppearance: (b, d) => updateMetalBrickAppearance(b, d),
    });
  }

  private explodeFuse(brick: BrickSprite, brickData: BrickData) {
    explodeFuse(brick, brickData, {
      scene: this,
      bricks: this.bricks,
      time: this.time,
      destroyBrick: (b, d) => this.destroyBrick(b, d),
      damageNeighbors: (b, d, m) => this.damageNeighbors(b, d, m),
    });
  }

  private damageNeighbors(
    _brick: BrickSprite,
    brickData: BrickData,
    gridMap: Map<string, BrickSprite>
  ) {
    damageNeighbors(_brick, brickData, gridMap, {
      scene: this,
      updateMetalBrickAppearance: (b, d) => updateMetalBrickAppearance(b, d),
      explodeFuse: (b, d) => this.explodeFuse(b, d),
      explodeTNT: (b, d) => this.explodeTNT(b, d),
      destroyBrick: (b, d) => this.destroyBrick(b, d),
    });
  }

  private destroyBrick(brick: BrickSprite, brickData: BrickData) {
    destroyBrick(brick, brickData, {
      scene: this,
      gameState: this.gameState,
      coinMultiplier: this.coinMultiplier,
      dropChanceBonus: this.dropChanceBonus,
      breakableBrickCount: this.breakableBrickCount,
      shieldArc: this.shieldArc,
      updateUI: () => this.updateUI(),
      dropItem: (x, y) => this.dropItem(x, y),
      levelComplete: () => this.levelComplete(),
    });
  }

  private dropItem(x: number, y: number) {
    dropItem(x, y, {
      scene: this,
      gameState: this.gameState,
      shieldArc: this.shieldArc,
      deathZone: this.deathZone,
      physics: this.physics,
      updateUI: () => this.updateUI(),
    });
  }

  private createBricks() {
    this.bricks = this.physics.add.staticGroup();
    this.breakableBrickCount.value = 0;

    // Always set world bounds to screen size (never based on level size)
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

    if (this.isEndlessMode) {
      // Calculate brick dimensions for 16x16 grid
      const gridWidth = 16;
      const availableWidth = this.scale.width;

      const paddingRatio = 0.055;
      const brickWidth =
        availableWidth / (gridWidth + (gridWidth - 1) * paddingRatio);
      const padding = brickWidth * paddingRatio;
      const brickHeight = brickWidth / 3;

      // Initialize endless mode manager
      this.endlessModeManager = new EndlessModeManager({
        scene: this,
        bricks: this.bricks,
        breakableBrickCount: this.breakableBrickCount,
        level: this.gameState.level,
        brickWidth,
        brickHeight,
        padding,
        createBrickFromData,
      });

      this.endlessModeManager.initialize();
    } else if (this.levelData && this.levelData.bricks.length > 0) {
      createBricksFromLevel({
        scene: this,
        levelData: this.levelData,
        bricks: this.bricks,
        breakableBrickCount: this.breakableBrickCount,
        shieldArc: this.shieldArc,
        ball: this.ball,
      });
    } else {
      createDefaultLevel({
        scene: this,
        levelData: { name: "Default", width: 10, height: 8, bricks: [] },
        bricks: this.bricks,
        breakableBrickCount: this.breakableBrickCount,
        shieldArc: this.shieldArc,
        ball: this.ball,
      });
    }
  }

  private createUI() {
    this.uiText = {
      coins: this.add.text(20, 20, `Coins: ${this.gameState.coins}`, {
        fontSize: "24px",
        color: "#ffd700",
        fontFamily: "Arial",
      }),
      lives: this.add.text(20, 50, `Lives: ${this.gameState.lives}`, {
        fontSize: "24px",
        color: "#ff6b6b",
        fontFamily: "Arial",
      }),
      level: this.add.text(20, 80, `Level: ${this.gameState.level}`, {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
      }),
      score: this.add.text(20, 110, `Score: ${this.gameState.score}`, {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial",
      }),
    };
  }

  private updateUI() {
    this.uiText.coins.setText(`Coins: ${this.gameState.coins}`);
    this.uiText.lives.setText(`Lives: ${this.gameState.lives}`);
    this.uiText.level.setText(`Level: ${this.gameState.level}`);
    this.uiText.score.setText(`Score: ${this.gameState.score}`);
  }

  private levelComplete() {
    levelComplete({
      scene: this,
      gameState: this.gameState,
      isTestMode: this.isTestMode,
    });
  }
}
