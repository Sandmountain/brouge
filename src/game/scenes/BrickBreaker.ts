import { EventBus } from "../EventBus";
import { Scene } from "phaser";
import { GameState, BrickData, LevelData } from "../types";
import {
  createAnimatedBackground,
  BackgroundManager,
} from "../utils/backgroundUtils";
import { createPlayerManager, PlayerManager } from "../utils/playerManager";
import { createBallManager, BallManager } from "../utils/ballManager";
// Game logic modules
import { explodeTNT } from "../logics/explosions/tntExplosion";
import { explodeFuse } from "../logics/explosions/fuseExplosion";
import { damageNeighbors } from "../logics/explosions/damageNeighbors";
import { handleBrickHit } from "../logics/brickInteractions/brickHitHandler";
import { teleportBall } from "../logics/brickInteractions/portalTeleport";
import { randomizeBallDirection } from "../logics/brickInteractions/chaosEffect";
import { updateMetalBrickAppearance } from "../logics/brickInteractions/metalBrickAppearance";
import { handlePaddleHit } from "../logics/ballPhysics/paddleHit";
import { handleBallMissed } from "../logics/ballPhysics/ballMissed";
import {
  createBricksFromLevel,
  createDefaultLevel,
} from "../logics/brickCreation/brickGrid";
import { destroyBrick } from "../logics/gameState/brickDestruction";
import { dropItem } from "../logics/gameState/itemDrops";
import { levelComplete } from "../logics/gameState/winCondition";
import { EndlessModeManager } from "../logics/endlessMode/endlessModeManager";
import { createBrickFromData } from "../logics/brickCreation/brickFactory";

type BrickSprite = Phaser.GameObjects.DOMElement & { brickData?: BrickData };

export class BrickBreaker extends Scene {
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
  private paddleWidth: number = 120;
  private ballLaunched: { value: boolean } = { value: false };
  private cachedWorldBounds?: Phaser.Geom.Rectangle;
  private lastPaddleHitTime: number = 0;
  private lastBrickHits: Map<Phaser.GameObjects.GameObject, number> = new Map();
  private deathZone!: Phaser.GameObjects.Zone;
  private coinMultiplier: number = 1;
  private dropChanceBonus: number = 0;
  private breakableBrickCount: { value: number } = { value: 0 };
  private isTestMode: boolean = false;
  private isEndlessMode: boolean = false;
  private endlessModeManager: any = null; // Will be EndlessModeManager

  // Background manager
  private backgroundManager?: BackgroundManager;
  // Player manager
  private playerManager?: PlayerManager;
  // Ball manager
  private ballManager?: BallManager;

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

    // Create player manager (handles shield, ship, fire, trails)
    this.playerManager = createPlayerManager(this, {
      paddleWidth: this.paddleWidth,
      paddleSpeed: this.paddleSpeed,
      paddleAcceleration: this.paddleAcceleration,
      paddleDeceleration: this.paddleDeceleration,
      initialX: this.scale.width / 2,
      initialY: this.scale.height - 50,
    });

    // Create ball manager
    this.ballManager = createBallManager(this, {
      initialX: this.scale.width / 2,
      initialY: this.scale.height - 50 - 15, // Position above the shield arc
    });

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
      this.ballManager.ball,
      this.playerManager.shieldArc,
      this.hitPaddle as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    // Use collider instead of overlap so ball bounces off bricks
    this.physics.add.collider(
      this.ballManager.ball,
      this.bricks,
      this.hitBrick as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.ballManager.ball,
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
            this.ballManager!.reset(
              this.playerManager!.shieldArc,
              this.ballLaunched
            );
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
      if (!this.ballLaunched.value && this.ballManager) {
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

    // Cache world bounds
    if (!this.cachedWorldBounds) {
      this.cachedWorldBounds = this.physics.world.bounds;
    }
    const worldBounds = this.cachedWorldBounds;

    // Get keyboard state
    interface BrickBreakerWithKeyState extends BrickBreaker {
      keyState?: { [key: string]: boolean };
    }
    const self = this as BrickBreakerWithKeyState;
    const keyState = self.keyState || {};

    // Update player manager (handles shield, ship, fire, trails, movement)
    if (this.playerManager) {
      this.playerManager.update(
        delta,
        {
          cursors: this.cursors,
          wasdKeys: this.wasdKeys,
          keyState,
        },
        worldBounds,
        this.ballLaunched,
        this.ballManager?.ball
      );
    }

    // Update ball manager (handles ball trail, velocity tracking, connection to shield)
    if (this.ballManager) {
      this.ballManager.update(
        delta,
        this.ballLaunched,
        this.playerManager!.shieldArc
      );
    }

    // Launch ball with spacebar or W
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

  private launchBall() {
    if (this.ballLaunched.value || !this.ballManager) return;
    this.ballManager.launch(
      this.playerManager!.shieldArc,
      this.physics,
      this.ballSpeed
    );
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
      ball: this.ballManager!.ball,
      shieldArc: this.playerManager!.shieldArc,
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
      ball: this.ballManager!.ball,
      prevBallVelocity: this.ballManager!.prevBallVelocity,
      explodeTNT: (b, d) => this.explodeTNT(b, d),
      explodeFuse: (b, d) => this.explodeFuse(b, d),
      teleportBall: (b, d) =>
        teleportBall(b, d, {
          scene: this,
          ball: this.ballManager!.ball,
          bricks: this.bricks,
          prevBallVelocity: this.ballManager!.prevBallVelocity,
        }),
      randomizeBallDirection: () =>
        randomizeBallDirection({
          ball: this.ballManager!.ball,
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
      shieldArc: this.playerManager!.shieldArc,
      updateUI: () => this.updateUI(),
      dropItem: (x, y) => this.dropItem(x, y),
      levelComplete: () => this.levelComplete(),
    });
  }

  private dropItem(x: number, y: number) {
    dropItem(x, y, {
      scene: this,
      gameState: this.gameState,
      shieldArc: this.playerManager!.shieldArc,
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
        shieldArc: this.playerManager!.shieldArc,
        ball: this.ballManager!.ball,
      });
    } else {
      createDefaultLevel({
        scene: this,
        levelData: { name: "Default", width: 10, height: 8, bricks: [] },
        bricks: this.bricks,
        breakableBrickCount: this.breakableBrickCount,
        shieldArc: this.playerManager!.shieldArc,
        ball: this.ballManager!.ball,
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
