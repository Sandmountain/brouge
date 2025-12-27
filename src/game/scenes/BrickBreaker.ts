import { EventBus } from "../EventBus";
import { Scene } from "phaser";
import { GameState, LevelData } from "../types";
import {
  createAnimatedBackground,
  BackgroundManager,
} from "../utils/backgroundUtils";
import { createPlayerManager, PlayerManager } from "../utils/playerManager";
import { createBallManager, BallManager } from "../utils/ballManager";
import { createBrickManager, BrickManager } from "../utils/brickManager";
// Game logic modules
import { handlePaddleHit } from "../logics/ballPhysics/paddleHit";
import { handleBallMissed } from "../logics/ballPhysics/ballMissed";
import { dropItem } from "../logics/gameState/itemDrops";
import { levelComplete } from "../logics/gameState/winCondition";

export class BrickBreaker extends Scene {
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
  private deathZone!: Phaser.GameObjects.Zone;
  private coinMultiplier: number = 1;
  private dropChanceBonus: number = 0;
  private isTestMode: boolean = false;
  private isEndlessMode: boolean = false;
  private endlessModeManager: any = null; // Will be EndlessModeManager
  private isPaused: boolean = false;
  private pauseMenuContainer?: Phaser.GameObjects.Container;
  private pauseMenuLayer?: Phaser.GameObjects.Layer;
  private escKey?: Phaser.Input.Keyboard.Key;

  // Background manager
  private backgroundManager?: BackgroundManager;
  // Player manager
  private playerManager?: PlayerManager;
  // Ball manager
  private ballManager?: BallManager;
  // Brick manager
  private brickManager?: BrickManager;

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

    // Create brick manager
    this.brickManager = createBrickManager({
      scene: this,
      levelData: this.levelData,
      isEndlessMode: this.isEndlessMode,
      gameState: this.gameState,
      shieldArc: this.playerManager!.shieldArc,
      ball: this.ballManager!.ball,
      coinMultiplier: this.coinMultiplier,
      dropChanceBonus: this.dropChanceBonus,
      onDestroyBrick: () => {
        // Additional cleanup if needed
      },
      onDropItem: (x, y) => this.dropItem(x, y),
      onLevelComplete: () => this.levelComplete(),
      updateUI: () => this.updateUI(),
    });

    // Store endless mode manager reference
    if (this.brickManager.endlessModeManager) {
      this.endlessModeManager = this.brickManager.endlessModeManager;
    }

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
      this.brickManager.bricks,
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

    // Set up ESC key for pause menu
    this.escKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );
    this.escKey?.on("down", () => {
      this.togglePause();
    });

    EventBus.emit("current-scene-ready", this);
  }

  update(_time: number, delta: number) {
    // Don't update game logic if paused
    if (this.isPaused) {
      return;
    }

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
    if (!this.brickManager || !this.ballManager) return;

    this.brickManager.hitBrick(_ball, brick, {
      scene: this,
      gameState: this.gameState,
      ballSprite: this.ballManager.ball,
      prevBallVelocity: this.ballManager.prevBallVelocity,
      isEndlessMode: this.isEndlessMode,
      endlessModeManager: this.endlessModeManager,
      onBrickHit: () => {
        // Track brick hit for endless mode
        if (this.isEndlessMode && this.endlessModeManager) {
          this.endlessModeManager.onBrickHit();
        }
      },
      onDestroyBrick: () => {
        // Additional cleanup if needed
      },
      onDropItem: (x, y) => this.dropItem(x, y),
      onLevelComplete: () => this.levelComplete(),
      updateUI: () => this.updateUI(),
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

  private togglePause() {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  private pauseGame() {
    if (this.isPaused) return;

    this.isPaused = true;
    // Pause physics to stop ball movement
    this.physics.world.pause();

    // Create pause menu overlay
    this.createPauseMenu();
  }

  private resumeGame() {
    if (!this.isPaused) return;

    this.isPaused = false;
    // Resume physics to allow ball movement
    this.physics.world.resume();

    // Remove pause menu - destroy all stored references
    if (this.pauseMenuContainer) {
      const container = this.pauseMenuContainer as any;
      if (container.overlayDOM) {
        container.overlayDOM.destroy();
      }
      this.pauseMenuContainer.destroy();
      this.pauseMenuContainer = undefined;
    }
    // Destroy layer
    if (this.pauseMenuLayer) {
      this.pauseMenuLayer.destroy();
      this.pauseMenuLayer = undefined;
    }
  }

  private createPauseMenu() {
    // Create pause menu as DOM elements to ensure they render above brick DOM elements
    // Create overlay div
    const overlayDiv = document.createElement("div");
    overlayDiv.style.position = "absolute";
    overlayDiv.style.left = "0";
    overlayDiv.style.top = "0";
    overlayDiv.style.width = `${this.scale.width}px`;
    overlayDiv.style.height = `${this.scale.height}px`;
    overlayDiv.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    overlayDiv.style.zIndex = "10000";
    overlayDiv.style.pointerEvents = "auto";

    // Create menu container div
    const menuDiv = document.createElement("div");
    menuDiv.style.position = "absolute";
    menuDiv.style.left = "50%";
    menuDiv.style.top = "50%";
    menuDiv.style.transform = "translate(-50%, -50%)";
    menuDiv.style.zIndex = "10001";
    menuDiv.style.pointerEvents = "auto";
    menuDiv.style.display = "flex";
    menuDiv.style.flexDirection = "column";
    menuDiv.style.alignItems = "center";
    menuDiv.style.gap = "20px";

    // Create pause title
    const titleDiv = document.createElement("div");
    titleDiv.textContent = "PAUSED";
    titleDiv.style.fontSize = "48px";
    titleDiv.style.color = "#ffffff";
    titleDiv.style.fontFamily = "Arial Black";
    titleDiv.style.textShadow = "2px 2px 4px rgba(0, 0, 0, 0.8)";
    titleDiv.style.marginBottom = "20px";
    menuDiv.appendChild(titleDiv);

    // Create buttons container
    const buttonsDiv = document.createElement("div");
    buttonsDiv.style.display = "flex";
    buttonsDiv.style.flexDirection = "column";
    buttonsDiv.style.gap = "10px";
    buttonsDiv.style.pointerEvents = "auto";
    menuDiv.appendChild(buttonsDiv);

    overlayDiv.appendChild(menuDiv);

    // Create button helper function
    const createButton = (
      text: string,
      bgColor: string,
      hoverColor: string,
      onClick: () => void
    ) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.style.width = "200px";
      btn.style.height = "50px";
      btn.style.backgroundColor = bgColor;
      btn.style.color = "#ffffff";
      btn.style.fontSize = "22px";
      btn.style.fontFamily = "Arial Black";
      btn.style.border = "2px solid rgba(0, 0, 0, 0.3)";
      btn.style.borderRadius = "4px";
      btn.style.cursor = "pointer";
      btn.style.textShadow = "1px 1px 2px rgba(0, 0, 0, 0.8)";
      btn.style.boxShadow =
        "inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.4)";
      btn.style.transition = "all 0.15s";
      btn.style.pointerEvents = "auto";

      btn.onmouseenter = () => {
        btn.style.backgroundColor = hoverColor;
        btn.style.transform = "scale(1.05)";
      };
      btn.onmouseleave = () => {
        btn.style.backgroundColor = bgColor;
        btn.style.transform = "scale(1)";
      };
      btn.onmousedown = () => {
        btn.style.transform = "scale(0.95)";
      };
      btn.onmouseup = () => {
        btn.style.transform = "scale(1.05)";
        onClick();
      };

      return btn;
    };

    // Create buttons
    const resumeBtn = createButton("RESUME", "#4ecdc4", "#6eddd4", () => {
      this.resumeGame();
    });
    buttonsDiv.appendChild(resumeBtn);

    const settingsBtn = createButton("SETTINGS", "#888888", "#aaaaaa", () => {
      console.log("Settings clicked");
    });
    buttonsDiv.appendChild(settingsBtn);

    const quitBtn = createButton("QUIT", "#cc4444", "#ee6666", () => {
      this.scene.start("MainMenu");
    });
    buttonsDiv.appendChild(quitBtn);

    // Create Phaser DOM element for overlay
    const overlayDOM = this.add.dom(0, 0, overlayDiv);
    overlayDOM.setOrigin(0, 0);
    overlayDOM.setDepth(10000);

    // Store reference in container for cleanup
    this.pauseMenuContainer = this.add.container(0, 0);
    (this.pauseMenuContainer as any).overlayDOM = overlayDOM;
  }
}
