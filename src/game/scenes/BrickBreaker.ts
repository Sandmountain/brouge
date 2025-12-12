import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { GameState, BrickData, LevelData, BrickType } from '../types';
import { createBrickDOM } from '../../bricks/createBrickDOM';

// Helper function to check if a brick type is a fuse type
function isFuseType(type: BrickType): boolean {
  return type === 'fuse-horizontal' || 
         type === 'fuse-left-up' || 
         type === 'fuse-right-up' || 
         type === 'fuse-left-down' || 
         type === 'fuse-right-down' || 
         type === 'fuse-vertical';
}

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
    talents: []
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
  private paddleWidth: number = 120;
  private ballLaunched: boolean = false;
  private prevBallVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private shieldArc!: Phaser.Physics.Arcade.Sprite; // Shield arc that bounces the ball
  private shieldGraphics!: Phaser.GameObjects.Graphics; // Graphics object for drawing the shield
  private deathZone!: Phaser.GameObjects.Zone;
  private coinMultiplier: number = 1;
  private dropChanceBonus: number = 0;
  private breakableBrickCount: number = 0;
  private isTestMode: boolean = false;

  constructor() {
    super('BrickBreaker');
  }

  init(data?: { gameState?: GameState; levelData?: LevelData; isTestMode?: boolean }) {
    if (data?.gameState) {
      this.gameState = { ...data.gameState };
    }
    if (data?.levelData) {
      this.levelData = data.levelData;
    }
    if (data?.isTestMode) {
      this.isTestMode = data.isTestMode;
    }
    
    // Apply talent effects
    if (this.gameState.talents.includes('paddle-size')) {
      this.paddleWidth = 144; // 20% increase
    }
    if (this.gameState.talents.includes('ball-speed')) {
      this.ballSpeed = 460; // 15% increase
    }
    if (this.gameState.talents.includes('coin-multiplier')) {
      this.coinMultiplier = 1.5;
    }
    if (this.gameState.talents.includes('drop-rate')) {
      this.dropChanceBonus = 0.1;
    }
  }

  create() {
    // Set background
    const bgColor = this.levelData?.backgroundColor || 0x1a1a2e;
    this.cameras.main.setBackgroundColor(bgColor);
    
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
    shieldGraphics.generateTexture('shield', shieldWidth, shieldHeight);
    shieldGraphics.destroy();
    
    // Create shield arc sprite
    this.shieldArc = this.physics.add.sprite(
      this.scale.width / 2,
      this.scale.height - 50,
      'shield'
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
    
    // Create ball
    const ballGraphics = this.add.graphics();
    ballGraphics.fillStyle(0xffffff);
    ballGraphics.fillCircle(10, 10, 10);
    ballGraphics.generateTexture('ball', 20, 20);
    ballGraphics.destroy();
    
    // Create ball - start it connected to the shield arc
    this.ball = this.physics.add.sprite(
      this.scale.width / 2,
      this.scale.height - 50 - 15, // Position above the shield arc
      'ball'
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
    this.wasdKeys = keyboard.addKeys('W,S,A,D') as {
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
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Store keyState and cleanup function
    interface BrickBreakerWithKeyState extends BrickBreaker {
      keyState?: { [key: string]: boolean };
      cleanupKeyboard?: () => void;
    }
    const self = this as BrickBreakerWithKeyState;
    self.keyState = keyState;
    self.cleanupKeyboard = () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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
    this.physics.add.collider(this.ball, this.shieldArc, this.hitPaddle as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    // Use collider instead of overlap so ball bounces off bricks
    this.physics.add.collider(this.ball, this.bricks, this.hitBrick as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    this.physics.add.overlap(this.ball, this.deathZone, this.ballMissed as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
    
    // Create UI
    this.createUI();
    
    // Set up mouse input for launching ball and focus canvas
    this.input.on('pointerdown', () => {
      // Focus canvas for keyboard input
      if (this.game.canvas) {
        this.game.canvas.setAttribute('tabindex', '0');
        this.game.canvas.focus();
      }
      
      // Launch ball if not already launched
      if (!this.ballLaunched) {
        this.launchBall();
      }
    });
    
    // Ensure canvas has focus on scene start
    if (this.game.canvas) {
      this.game.canvas.setAttribute('tabindex', '0');
      this.game.canvas.focus();
    }
    
    EventBus.emit('current-scene-ready', this);
  }

  update() {
    // Store ball velocity before collisions (for portal teleportation)
    if (this.ball && this.ball.body) {
      const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
      this.prevBallVelocity.x = ballBody.velocity.x;
      this.prevBallVelocity.y = ballBody.velocity.y;
    }
    
    // Shield arc movement (left/right)
    // Use direct position updates since shield is immovable
    const worldBounds = this.physics.world.bounds;
    const deltaTime = this.game.loop.delta;
    const moveDistance = (this.paddleSpeed * deltaTime) / 1000; // Convert to pixels per frame
    
    // Check Phaser keyboard first, then fallback to native keyState
    interface BrickBreakerWithKeyState extends BrickBreaker {
      keyState?: { [key: string]: boolean };
    }
    const self = this as BrickBreakerWithKeyState;
    const keyState = self.keyState || {};
    
    // Check if keys exist before checking isDown, including native keyState fallback
    const leftPressed = 
      (this.cursors && this.cursors.left && this.cursors.left.isDown) || 
      (this.wasdKeys && this.wasdKeys.A && this.wasdKeys.A.isDown) ||
      keyState['a'] || keyState['arrowleft'] || keyState['keya'];
    const rightPressed = 
      (this.cursors && this.cursors.right && this.cursors.right.isDown) || 
      (this.wasdKeys && this.wasdKeys.D && this.wasdKeys.D.isDown) ||
      keyState['d'] || keyState['arrowright'] || keyState['keyd'];
    
    if (leftPressed) {
      const newX = Math.max(worldBounds.x + this.paddleWidth / 2, this.shieldArc.x - moveDistance);
      this.shieldArc.setX(newX);
    } else if (rightPressed) {
      const newX = Math.min(worldBounds.right - this.paddleWidth / 2, this.shieldArc.x + moveDistance);
      this.shieldArc.setX(newX);
    }
    
    // If ball is not launched, keep it connected to the shield arc
    if (!this.ballLaunched) {
      this.ball.setX(this.shieldArc.x);
      this.ball.setY(this.shieldArc.y - 15); // Position above the shield arc
      this.ball.setVelocity(0, 0); // Keep it stationary
    }
    
    // Animate shield arc - pulsating energy force field
    this.animateShield();
    
    // Launch ball with spacebar or W
    const spacePressed = 
      (this.cursors && this.cursors.space && this.cursors.space.isDown) ||
      (this.wasdKeys && this.wasdKeys.W && this.wasdKeys.W.isDown) ||
      keyState[' '] || keyState['space'] || keyState['w'] || keyState['keyw'];
    if (!this.ballLaunched && spacePressed) {
      this.launchBall();
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
    if (!shield.shieldWidth || !shield.shieldHeight || !shield.shieldRadius) return;
    
    shield.pulsePhase = (shield.pulsePhase || 0) + 0.05; // Animation speed
    if (shield.pulsePhase > Math.PI * 2) shield.pulsePhase = 0;
    
    const shieldWidth = shield.shieldWidth;
    const shieldHeight = shield.shieldHeight;
    const pulseIntensity = Math.sin(shield.pulsePhase);
    const baseThickness = 2;
    const pulseThickness = baseThickness + (pulseIntensity * 0.5); // Subtle pulse between 1.5-2.5px
    const glowIntensity = 0.85 + (pulseIntensity * 0.15); // Subtle pulse opacity 0.85-1.0 (humming, not fading)
    
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
    this.shieldGraphics.lineStyle(lineThickness + 0.5, 0x4ecdc4, glowIntensity * 0.4);
    this.shieldGraphics.beginPath();
    this.shieldGraphics.moveTo(leftX, bottomY);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = leftX + (rightX - leftX) * t;
      // Simple quadratic curve: y = bottomY - (shieldHeight * 4 * t * (1 - t))
      const curveHeight = shieldHeight * 0.8 + (pulseIntensity * 0.5); // Very subtle pulse
      const y = bottomY - (curveHeight * 4 * t * (1 - t));
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
      const y = bottomY - (curveHeight * 4 * t * (1 - t));
      this.shieldGraphics.lineTo(x, y);
    }
    this.shieldGraphics.strokePath();
    
    // Inner core (brightest center, always visible)
    this.shieldGraphics.lineStyle(lineThickness * 0.7, 0xffffff, Math.max(0.9, glowIntensity));
    this.shieldGraphics.beginPath();
    this.shieldGraphics.moveTo(leftX + 2, bottomY - 1);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = leftX + 2 + (rightX - leftX - 4) * t;
      const curveHeight = shieldHeight * 0.6;
      const y = bottomY - 1 - (curveHeight * 4 * t * (1 - t));
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
      const particleY = bottomY - (curveHeight * 4 * t * (1 - t));
      const particlePhase = shield.pulsePhase + (i * 0.5);
      // More subtle particle glow - stays visible, just gently pulses
      const particleGlow = 0.7 + (Math.sin(particlePhase) * 0.3); // Pulse between 0.4-1.0, but we'll keep it higher
      
      this.shieldGraphics.fillStyle(0xffffff, Math.max(0.5, particleGlow * 0.8));
      this.shieldGraphics.fillCircle(particleX, particleY, 1); // Smaller particles
    }
  }

  private launchBall() {
    if (this.ballLaunched) return;
    
    // Calculate launch angle based on shield's X position
    // Use world bounds to get the actual range the shield can move
    const worldBounds = this.physics.world.bounds;
    const shieldX = this.shieldArc.x;
    
    // Normalize shield position relative to world bounds (0 = left edge, 1 = right edge)
    const normalizedX = Phaser.Math.Clamp(
      (shieldX - worldBounds.x) / worldBounds.width,
      0,
      1
    );
    
    // Map to angle: 10 degrees (left edge, fires right) to 170 degrees (right edge, fires left)
    // Center (0.5) = 90 degrees (straight up)
    const launchAngle = 10 + (normalizedX * 160); // Maps to 10-170 degrees
    
    // Convert angle to radians and calculate velocity
    // In standard math: 0° = right, 90° = up, 180° = left
    // velocityX = cos(angle) * speed (positive = right, negative = left)
    // velocityY = -sin(angle) * speed (negative = up, positive = down)
    const angleRad = Phaser.Math.DegToRad(launchAngle);
    const velocityX = Math.cos(angleRad) * this.ballSpeed;
    const velocityY = -Math.sin(angleRad) * this.ballSpeed; // Negative because Y increases downward
    
    console.log('[Launch] Shield X:', shieldX.toFixed(0), 'World bounds:', worldBounds.x, worldBounds.width, 'Normalized:', normalizedX.toFixed(2), 'Angle:', launchAngle.toFixed(1), 'deg', 'Velocity:', velocityX.toFixed(0), velocityY.toFixed(0));
    
    this.ball.setVelocity(velocityX, velocityY);
    this.ballLaunched = true;
  }

  private hitPaddle(
    ball: Phaser.Physics.Arcade.Sprite,
    shield: Phaser.Physics.Arcade.Sprite
  ) {
    // Calculate hit position on shield arc (-1 to 1, where 0 is center)
    const shieldWidth = this.paddleWidth;
    const hitPosition = (ball.x - shield.x) / (shieldWidth / 2);
    
    // Clamp hit position
    const clampedHit = Phaser.Math.Clamp(hitPosition, -1, 1);
    
    // Calculate new angle based on hit position on the arc
    // Center hit = straight up, edges = more angle
    // Arc shape naturally creates angle variation
    const maxAngle = 75; // degrees
    const angle = clampedHit * maxAngle;
    
    // Calculate new velocity
    const speed = this.ballSpeed;
    const angleRad = Phaser.Math.DegToRad(angle);
    const velocityX = Math.sin(angleRad) * speed;
    const velocityY = -Math.abs(Math.cos(angleRad) * speed); // Always upward
    
    // Set ball velocity (always bounce upward)
    ball.setVelocity(velocityX, velocityY);
    
    // Visual feedback on shield
    this.tweens.add({
      targets: this.shieldArc,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 100,
      yoyo: true
    });
  }

  private hitBrick(
    _ball: Phaser.GameObjects.GameObject,
    brick: Phaser.GameObjects.GameObject
  ) {
    const brickElement = brick as Phaser.GameObjects.DOMElement & { brickData?: BrickData };
    if (!brickElement.brickData) return;
    
    const brickData = brickElement.brickData;
    
    // Handle unbreakable bricks - just bounce, no damage
    if (brickData.type === 'unbreakable') {
      // Can only be destroyed with special talent/powerup
      if (!this.gameState.talents.includes('unbreakable-breaker')) {
        // Visual feedback but no damage - ball will bounce automatically via collider
        this.tweens.add({
          targets: brickElement,
          scaleX: 0.9,
          scaleY: 0.9,
          duration: 100,
          yoyo: true
        });
        return; // Ball bounces automatically, just return
      }
    }
    
    // Handle TNT bricks
    if (brickData.type === 'tnt') {
      this.explodeTNT(brickElement, brickData);
      // Ball bounces automatically via collider
      return;
    }
    
    // Handle portal bricks - teleport to paired portal
    if (brickData.type === 'portal' && brickData.id) {
      this.teleportBall(brickElement, brickData);
      return; // Don't apply damage, just teleport
    }
    
    // Handle chaos bricks - randomize ball direction
    if (brickData.type === 'chaos') {
      this.randomizeBallDirection();
      // Visual feedback
      this.tweens.add({
        targets: brickElement,
        scaleX: 1.2,
        scaleY: 1.2,
        rotation: Phaser.Math.Between(-0.3, 0.3),
        duration: 200,
        yoyo: true
      });
      // Ball bounces automatically via collider
      // Apply damage and continue with normal logic
    }
    
    // Handle boost bricks (random buff/debuff)
    if (brickData.type === 'boost') {
      // TODO: Implement random buff/debuff system
      // For now, just visual feedback
      this.tweens.add({
        targets: brickElement,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        yoyo: true
      });
      // Ball bounces automatically via collider
      // Apply damage and continue with normal logic
    }
    
    // Reduce brick health (apply brick-breaker talent if active)
    const damage = this.gameState.talents.includes('brick-breaker') ? 2 : 1;
    brickData.health -= damage;
    
    // Update visual appearance for metal bricks
    if (brickData.type === 'metal') {
      this.updateMetalBrickAppearance(brickElement, brickData);
    }
    
    // Update health badge if it exists
    const element = brickElement.node as HTMLElement;
    if (element) {
      const healthBadge = element.querySelector('.health-badge') as HTMLElement;
      if (healthBadge && brickData.health > 1 && brickData.health < 999) {
        healthBadge.textContent = brickData.health.toString();
      } else if (healthBadge && (brickData.health <= 1 || brickData.health >= 999)) {
        healthBadge.remove();
      }
    }
    
    // Visual feedback - use scale for DOM elements
    this.tweens.add({
      targets: brickElement,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 50,
      yoyo: true
    });
    
    // Add burning class to fuse bricks when hit
    if (isFuseType(brickData.type)) {
      const element = brickElement.node as HTMLElement;
      if (element) {
        element.classList.add('burning');
      }
    }
    
    // Destroy brick if health is 0
    if (brickData.health <= 0) {
      // Handle fuse bricks - burn connected blocks
      if (isFuseType(brickData.type)) {
        this.explodeFuse(brickElement, brickData);
      } else {
        this.destroyBrick(brickElement, brickData);
      }
    }
    // Ball bounces automatically via collider - no need to manually handle bounce
  }

  private teleportBall(
    brick: Phaser.GameObjects.DOMElement & { brickData?: BrickData },
    brickData: BrickData
  ) {
    if (!brickData.id) return;
    
    // Find the paired portal
    let pairedPortal: (Phaser.GameObjects.DOMElement & { brickData?: BrickData }) | null = null;
    
    this.bricks.children.entries.forEach((b) => {
      const brickSprite = b as Phaser.GameObjects.DOMElement & { brickData?: BrickData };
      if (brickSprite.brickData && 
          brickSprite.brickData.type === 'portal' && 
          brickSprite.brickData.id === brickData.id &&
          brickSprite !== brick) {
        pairedPortal = brickSprite;
      }
    });
    
    if (!pairedPortal) return;
    const portalWithData = pairedPortal as Phaser.GameObjects.DOMElement & { brickData: BrickData };
    if (!portalWithData.brickData) return;
    
    // Teleport ball to paired portal position
    const portalX = (pairedPortal as Phaser.GameObjects.DOMElement).x;
    const portalY = (pairedPortal as Phaser.GameObjects.DOMElement).y;
    this.ball.setPosition(portalX, portalY);
    
    // Restore pre-collision velocity (preserve momentum and direction)
    this.ball.setVelocity(this.prevBallVelocity.x, this.prevBallVelocity.y);
    
    // Visual feedback on both portals
    this.tweens.add({
      targets: [brick, pairedPortal],
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 150,
      yoyo: true,
      ease: 'Power2'
    });
    
    // Add particle effect or visual indicator
    this.cameras.main.flash(100, 155, 89, 189, false); // Purple flash
  }

  private randomizeBallDirection() {
    // Get current ball speed
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    const currentSpeed = Math.sqrt(ballBody.velocity.x ** 2 + ballBody.velocity.y ** 2);
    
    // Generate completely random angle (0 to 360 degrees)
    // In standard math: 0° = right, 90° = up, 180° = left, 270° = down
    // We want to ensure it goes upward, so use angles from -90 to 90 degrees from vertical
    // This gives us -90° (left) to 90° (right), with 0° being straight up
    const randomAngle = Phaser.Math.Between(-90, 90);
    const angleRad = Phaser.Math.DegToRad(randomAngle);
    
    // Calculate new velocity with random direction
    // Keep speed constant but randomize direction
    // velocityX = sin(angle) * speed (for -90° = -1, 0° = 0, 90° = 1)
    // velocityY = -cos(angle) * speed (always negative/upward)
    const velocityX = Math.sin(angleRad) * currentSpeed;
    const velocityY = -Math.abs(Math.cos(angleRad) * currentSpeed); // Always upward
    
    this.ball.setVelocity(velocityX, velocityY);
    
    // Visual feedback - flash effect
    this.cameras.main.flash(100, 255, 0, 255, false); // Magenta flash for chaos
  }

  private updateMetalBrickAppearance(
    brick: Phaser.GameObjects.DOMElement & { brickData?: BrickData },
    brickData: BrickData
  ) {
    const healthPercent = brickData.health / brickData.maxHealth;
    const stages = 4;
    const currentStage = Math.floor((1 - healthPercent) * stages);
    
    // Metal colors from light to dark (matching CSS)
    const metalColors = ['#a0a0a0', '#888888', '#666666', '#444444', '#222222'];
    const color = metalColors[Math.min(currentStage, metalColors.length - 1)];
    
    // Update the DOM element's background gradient
    const element = brick.node as HTMLElement;
    if (element) {
      element.style.background = `linear-gradient(135deg, ${color} 0%, ${color} 25%, ${color}80 50%, ${color} 75%, ${color} 100%)`;
    }
  }

  private explodeTNT(brick: Phaser.GameObjects.DOMElement, brickData: BrickData) {
    const explosionRadius = 150;
    const explosionBricks: (Phaser.GameObjects.DOMElement & { brickData?: BrickData })[] = [];
    
      // Find all bricks within explosion radius
      this.bricks.children.entries.forEach((b) => {
        const brickSprite = b as Phaser.GameObjects.DOMElement & { brickData?: BrickData };
        if (brickSprite.brickData && brickSprite.brickData.type !== 'unbreakable') {
          const distance = Phaser.Math.Distance.Between(brick.x, brick.y, brickSprite.x, brickSprite.y);
          if (distance <= explosionRadius) {
            explosionBricks.push(brickSprite);
          }
        }
      });
    
    // Create explosion effect
    const explosion = this.add.circle(brick.x, brick.y, explosionRadius, 0xff0000, 0.5);
    this.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => explosion.destroy()
    });
    
    // Destroy all bricks in explosion
    explosionBricks.forEach(b => {
      if (b.brickData) {
        this.destroyBrick(b, b.brickData);
      }
    });
    
    // Destroy the TNT brick itself
    this.destroyBrick(brick, brickData);
  }

  private explodeFuse(
    brick: Phaser.GameObjects.DOMElement,
    brickData: BrickData
  ) {
    const brickElement = brick as Phaser.GameObjects.DOMElement & { brickData?: BrickData };
    if (!brickElement.brickData) return;
    
    // Add burning class to the initial fuse brick
    const element = brickElement.node as HTMLElement;
    if (element) {
      element.classList.add('burning');
    }
    
    // Create explosion effect - orange/yellow for fuse
    const explosion = this.add.circle(brick.x, brick.y, 60, 0xff8800, 0.6);
    this.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      ease: 'Power2',
      onComplete: () => explosion.destroy()
    });
    
    // Create spark particles
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spark = this.add.circle(
        brick.x,
        brick.y,
        3,
        0xffaa00,
        1
      );
      this.tweens.add({
        targets: spark,
        x: brick.x + Math.cos(angle) * 60 * 0.8,
        y: brick.y + Math.sin(angle) * 60 * 0.8,
        alpha: 0,
        scale: 0,
        duration: 150,
        ease: 'Power2',
        onComplete: () => spark.destroy()
      });
    }
    
    // Need grid coordinates to find connected fuse bricks and neighbors
    if (brickData.col !== undefined && brickData.row !== undefined) {
      // Build a map of grid positions to bricks for efficient lookup
      const gridMap = new Map<string, Phaser.GameObjects.DOMElement & { brickData?: BrickData }>();
      this.bricks.children.entries.forEach((b) => {
        const brickSprite = b as Phaser.GameObjects.DOMElement & { brickData?: BrickData };
        if (brickSprite.brickData && 
            brickSprite.brickData.col !== undefined && 
            brickSprite.brickData.row !== undefined) {
          const key = `${brickSprite.brickData.col},${brickSprite.brickData.row}`;
          gridMap.set(key, brickSprite);
        }
      });
      
      // Flood fill to find all connected fuse bricks
      const visited = new Set<string>();
      const fuseBricks: (Phaser.GameObjects.DOMElement & { brickData?: BrickData })[] = [];
      const queue: Array<{ col: number; row: number }> = [{ col: brickData.col, row: brickData.row }];
      
      const directions = [
        { col: 0, row: -1 }, // up
        { col: 0, row: 1 },  // down
        { col: -1, row: 0 }, // left
        { col: 1, row: 0 }   // right
      ];
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        const key = `${current.col},${current.row}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        const currentBrick = gridMap.get(key);
        if (currentBrick && currentBrick.brickData && isFuseType(currentBrick.brickData.type)) {
          fuseBricks.push(currentBrick);
          
          // Check neighbors for more fuse bricks
          directions.forEach(dir => {
            const neighborCol = current.col + dir.col;
            const neighborRow = current.row + dir.row;
            const neighborKey = `${neighborCol},${neighborRow}`;
            
            if (!visited.has(neighborKey)) {
              queue.push({ col: neighborCol, row: neighborRow });
            }
          });
        }
      }
      
      // Cascade explosion of connected fuse bricks with delays
      fuseBricks.forEach((fuseBrick, index) => {
        const delay = index * 100; // 100ms delay between each explosion
        
        // Add burning class immediately when fuse is triggered
        const fuseElement = fuseBrick.node as HTMLElement;
        if (fuseElement) {
          fuseElement.classList.add('burning');
        }
        
        this.time.delayedCall(delay, () => {
          if (fuseBrick.active && fuseBrick.brickData) {
            // Apply damage to 4 cardinal neighbors of this fuse brick
            this.damageNeighbors(fuseBrick, fuseBrick.brickData, gridMap);
            
            // Create explosion effect for this fuse brick
            const explosion = this.add.circle(fuseBrick.x, fuseBrick.y, 60, 0xff8800, 0.6);
            this.tweens.add({
              targets: explosion,
              alpha: 0,
              scale: 1.5,
              duration: 200,
              ease: 'Power2',
              onComplete: () => explosion.destroy()
            });
            
            // Destroy this fuse brick
            this.destroyBrick(fuseBrick, fuseBrick.brickData);
          }
        });
      });
      
      // Apply damage to 4 cardinal neighbors of the initial fuse brick
      this.damageNeighbors(brickElement, brickData, gridMap);
    }
    
    // Destroy this fuse brick
    this.destroyBrick(brickElement, brickData);
  }
  
  private damageNeighbors(
    _brick: Phaser.GameObjects.DOMElement & { brickData?: BrickData },
    brickData: BrickData,
    gridMap: Map<string, Phaser.GameObjects.DOMElement & { brickData?: BrickData }>
  ) {
    if (brickData.col === undefined || brickData.row === undefined) return;
    
    const directions = [
      { col: 0, row: -1 }, // up
      { col: 0, row: 1 },  // down
      { col: -1, row: 0 }, // left
      { col: 1, row: 0 }   // right
    ];
    
    directions.forEach(dir => {
      const neighborCol = brickData.col! + dir.col;
      const neighborRow = brickData.row! + dir.row;
      const neighborKey = `${neighborCol},${neighborRow}`;
      
      const neighborBrick = gridMap.get(neighborKey);
      if (neighborBrick && neighborBrick.brickData && !isFuseType(neighborBrick.brickData.type) && neighborBrick.brickData.type !== 'unbreakable') {
        // Apply 1 damage to non-fuse neighbors
        neighborBrick.brickData.health -= 1;
        
        // Update visual appearance for metal bricks
        if (neighborBrick.brickData.type === 'metal') {
          this.updateMetalBrickAppearance(neighborBrick, neighborBrick.brickData);
        }
        
        // Update health badge if it exists
        const element = neighborBrick.node as HTMLElement;
        if (element) {
          const healthBadge = element.querySelector('.health-badge') as HTMLElement;
          if (healthBadge && neighborBrick.brickData.health > 1 && neighborBrick.brickData.health < 999) {
            healthBadge.textContent = neighborBrick.brickData.health.toString();
          } else if (healthBadge && (neighborBrick.brickData.health <= 1 || neighborBrick.brickData.health >= 999)) {
            healthBadge.remove();
          }
        }
        
        // Visual feedback
        this.tweens.add({
          targets: neighborBrick,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 50,
          yoyo: true
        });
        
        // Destroy brick if health is 0
        if (neighborBrick.brickData.health <= 0) {
          // Handle special brick types
          if (isFuseType(neighborBrick.brickData.type)) {
            this.explodeFuse(neighborBrick, neighborBrick.brickData);
          } else if (neighborBrick.brickData.type === 'tnt') {
            this.explodeTNT(neighborBrick, neighborBrick.brickData);
          } else {
            this.destroyBrick(neighborBrick, neighborBrick.brickData);
          }
        }
      }
    });
  }

  private destroyBrick(
    brick: Phaser.GameObjects.DOMElement,
    brickData: BrickData
  ) {
    // Award coins
    const coinsEarned = Math.floor(brickData.coinValue * this.coinMultiplier);
    this.gameState.coins += coinsEarned;
    this.gameState.score += brickData.coinValue * 10;
    
    // Check for drop
    const dropChance = Math.min(brickData.dropChance + this.dropChanceBonus, 1);
    if (Math.random() < dropChance) {
      this.dropItem(brick.x, brick.y);
    }
    
    brick.destroy();
    this.updateUI();
    
    // Check if level is complete (only count breakable bricks)
    if (brickData.type !== 'unbreakable') {
      this.breakableBrickCount--;
      if (this.breakableBrickCount <= 0) {
        this.levelComplete();
      }
    }
  }

  private dropItem(x: number, y: number) {
    // Create a coin that falls
    const coinGraphics = this.add.graphics();
    coinGraphics.fillStyle(0xffd700);
    coinGraphics.fillCircle(15, 15, 15);
    coinGraphics.lineStyle(2, 0xffed4e);
    coinGraphics.strokeCircle(15, 15, 15);
    coinGraphics.generateTexture('coin', 30, 30);
    coinGraphics.destroy();
    
    const item = this.physics.add.sprite(x, y, 'coin');
    item.setVelocityY(200);
    item.setCircle(15);
    
    // Collect when it hits the shield or bottom
    this.physics.add.overlap(item, this.shieldArc, () => {
      this.gameState.coins += 5; // Bonus coins from drops
      this.updateUI();
      item.destroy();
    });
    
    // Remove if it falls off screen
    this.physics.add.overlap(item, this.deathZone, () => {
      item.destroy();
    });
  }

  private ballMissed() {
    this.gameState.lives--;
    this.updateUI();
    
    if (this.gameState.lives <= 0) {
      // Game over
      this.scene.start('GameOver', { gameState: this.gameState });
    } else {
      // Reset ball
      this.resetBall();
    }
  }

  private resetBall() {
    // Reset ball to connected state on shield arc
    this.ball.setPosition(this.shieldArc.x, this.shieldArc.y - 15);
    this.ball.setVelocity(0, 0);
    this.ballLaunched = false;
    // Ball will launch when user presses space or clicks mouse
  }

  private createBricks() {
    this.bricks = this.physics.add.staticGroup();
    this.breakableBrickCount = 0;
    
    // Always set world bounds to screen size (never based on level size)
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);
    
    if (this.levelData && this.levelData.bricks.length > 0) {
      // Load custom level - scale bricks to fit screen
      const gridWidth = this.levelData.width;
      const gridHeight = this.levelData.height;
      
      // Calculate available screen space for the level
      // Use full screen width - no padding since bounding box is at screen edges
      // Leave space for paddle area at bottom (100px)
      const availableWidth = this.scale.width; // Full width, no padding
      const availableHeight = this.scale.height - 100; // Leave space for paddle at bottom
      
      // Always scale to fill full width exactly
      // Formula: (gridWidth - 1) * (brickWidth + padding) + brickWidth = availableWidth
      // We'll use a padding ratio to maintain proportions, then solve for exact fit
      const paddingRatio = 0.055; // padding is ~5.5% of brick width
      
      // Solve for brickWidth: gridWidth * brickWidth + (gridWidth - 1) * padding = availableWidth
      // With padding = brickWidth * paddingRatio:
      // gridWidth * brickWidth + (gridWidth - 1) * brickWidth * paddingRatio = availableWidth
      // brickWidth * (gridWidth + (gridWidth - 1) * paddingRatio) = availableWidth
      const brickWidth = availableWidth / (gridWidth + (gridWidth - 1) * paddingRatio);
      const padding = brickWidth * paddingRatio;
      const brickHeight = brickWidth / 3; // Maintain 3:1 aspect ratio
      
      // Verify the calculation - should equal availableWidth exactly
      const levelPixelWidth = (gridWidth - 1) * (brickWidth + padding) + brickWidth;
      const levelPixelHeight = (gridHeight - 1) * (brickHeight + padding) + brickHeight;
      
      // Always use full width - align to left edge (no padding)
      // Align to top
      const offsetX = 0; // No padding - start at screen edge
      const offsetY = 0; // Align to top
      
      console.log('[BrickBreaker] Level scaled to fill width:', {
        gridWidth, gridHeight,
        availableWidth, availableHeight,
        brickWidth, brickHeight, padding,
        calculatedWidth: levelPixelWidth,
        calculatedHeight: levelPixelHeight,
        widthMatches: Math.abs(levelPixelWidth - availableWidth) < 0.1
      });
      
      console.log('[BrickBreaker] Scaled level to fit screen:', {
        gridWidth, gridHeight,
        availableWidth, availableHeight,
        brickWidth, brickHeight, padding,
        levelPixelWidth, levelPixelHeight,
        offsetX, offsetY
      });
      
      // Recalculate positions from grid coordinates using stored dimensions
      // This ensures positions are always correct regardless of screen size
      this.levelData.bricks.forEach((brickData, brickIndex) => {
        let col: number;
        let row: number;
        
        // If brick has grid coordinates, use them directly
        if (brickData.col !== undefined && brickData.row !== undefined) {
          col = brickData.col;
          row = brickData.row;
        } else {
          // Migrate old bricks: calculate grid coordinates from pixel positions
          // We need to reverse-engineer the grid position from the stored pixel position
          // The stored position was calculated as: col * (oldWidth + padding) + oldWidth/2
          // So: col = (x - oldWidth/2) / (oldWidth + padding)
          // But we don't know the old dimensions, so we'll use the current stored dimensions
          // and round to nearest grid cell
          col = Math.round((brickData.x - brickWidth / 2) / (brickWidth + padding));
          row = Math.round((brickData.y - brickHeight / 2) / (brickHeight + padding));
          
          // Clamp to valid grid bounds
          const levelWidth = this.levelData?.width || 10;
          const levelHeight = this.levelData?.height || 8;
          col = Math.max(0, Math.min(levelWidth - 1, col));
          row = Math.max(0, Math.min(levelHeight - 1, row));
          
          if (brickIndex < 3) {
            console.log(`[BrickBreaker] Brick ${brickIndex} (migrated from pixels):`, {
              originalPixel: { x: brickData.x, y: brickData.y },
              calculatedGrid: { col, row },
              dimensions: { brickWidth, brickHeight, padding }
            });
          }
        }
        
        // Always recalculate position from grid coordinates using stored dimensions
        const gridX = col * (brickWidth + padding) + brickWidth / 2;
        const gridY = row * (brickHeight + padding) + brickHeight / 2;
        const finalX = gridX + offsetX;
        const finalY = gridY + offsetY;
        
        if (brickIndex < 3) {
          console.log(`[BrickBreaker] Brick ${brickIndex} final position:`, {
            grid: { col, row },
            calculated: { x: gridX, y: gridY },
            adjusted: { x: finalX, y: finalY },
            dimensions: { brickWidth, brickHeight, padding }
          });
        }
        
        const adjustedBrickData = {
          ...brickData,
          x: finalX,
          y: finalY,
          col: col,
          row: row
        };
        
        const brick = this.createBrickFromData(adjustedBrickData, brickWidth, brickHeight);
        if (brick && brick.brickData) {
          this.bricks.add(brick);
          // Boost and portal blocks are optional (don't count towards breakable bricks)
          if (brick.brickData.type !== 'unbreakable' && brick.brickData.type !== 'boost' && brick.brickData.type !== 'portal') {
            this.breakableBrickCount++;
          }
        }
      });
      
      // Fuse connections are now handled manually by the user selecting specific fuse brick types
      // No automatic connection logic needed
      
      // Center shield and ball with level
      const levelCenterX = offsetX + levelPixelWidth / 2;
      this.shieldArc.setX(levelCenterX);
      this.ball.setX(levelCenterX);
    } else {
      // Create default level
      const rows = 8;
      const cols = 10;
      
      // Calculate available screen space
      // Use full screen width - no padding since bounding box is at screen edges
      const availableWidth = this.scale.width; // Full width, no padding
      
      // Always scale to fill full width exactly
      const paddingRatio = 0.055;
      const brickWidth = availableWidth / (cols + (cols - 1) * paddingRatio);
      const padding = brickWidth * paddingRatio;
      const brickHeight = brickWidth / 3; // Maintain 3:1 aspect ratio
      
      // Calculate level dimensions
      const levelPixelWidth = (cols - 1) * (brickWidth + padding) + brickWidth;
      const levelPixelHeight = (rows - 1) * (brickHeight + padding) + brickHeight;
      
      // Always use full width - align to left edge (no padding)
      // Align to top
      const offsetX = 0; // No padding - start at screen edge
      const offsetY = 0; // Align to top
      
      console.log('[BrickBreaker] Default level scaled:', {
        gridWidth: cols, gridHeight: rows,
        brickWidth, brickHeight, padding,
        levelPixelWidth, levelPixelHeight,
        offsetX, offsetY
      });
      
      const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xffa07a, 0x98d8c8, 0xf7dc6f, 0xbb8fce, 0x85c1e2];
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = offsetX + col * (brickWidth + padding) + brickWidth / 2;
          const y = offsetY + row * (brickHeight + padding) + brickHeight / 2;
          
          const color = colors[row % colors.length];
          
          const brickData: BrickData = {
            x,
            y,
            col,
            row,
            health: Math.floor(row / 2) + 1,
            maxHealth: Math.floor(row / 2) + 1,
            color: color,
            dropChance: 0.15 + (row * 0.05),
            coinValue: (row + 1) * 2,
            type: 'default'
          };
          
          const brick = this.createBrickFromData(brickData, brickWidth, brickHeight);
          if (brick && brick.brickData) {
            this.bricks.add(brick);
            // Boost and portal blocks are optional (don't count towards breakable bricks)
            if (brick.brickData.type !== 'unbreakable' && brick.brickData.type !== 'boost' && brick.brickData.type !== 'portal') {
              this.breakableBrickCount++;
            }
          }
        }
      }
      
      // Fuse connections are now handled manually by the user selecting specific fuse brick types
      // No automatic connection logic needed
    }
  }
  
  // Removed updateFuseConnections() - fuse connections are now handled manually
  // by the user selecting specific fuse brick types in the editor.
  // No automatic connection logic is needed.

  private createBrickFromData(
    brickData: BrickData,
    brickWidth: number,
    brickHeight: number
  ): (Phaser.GameObjects.DOMElement & { brickData?: BrickData }) | null {
    // Use the centralized brick DOM creation utility
    const element = createBrickDOM(brickData, brickWidth, brickHeight);
    
    // Debug log for TNT blocks
    if (brickData.type === 'tnt') {
      console.log('[BrickBreaker] Creating TNT brick at:', {
        x: brickData.x,
        y: brickData.y,
        col: brickData.col,
        row: brickData.row,
        brickWidth,
        brickHeight
      });
    }
    
    // Create Phaser DOM element
    const domElement = this.add.dom(brickData.x, brickData.y, element);
    domElement.setOrigin(0.5, 0.5);
    
    // Explicitly set position to ensure it's correct (Phaser DOM elements can have positioning issues)
    domElement.setPosition(brickData.x, brickData.y);
    
    // Make it a physics body
    const physicsBrick = this.physics.add.existing(domElement, true) as Phaser.GameObjects.DOMElement & { 
      brickData?: BrickData;
    };
    physicsBrick.brickData = brickData;
    
    // Set size for physics
    (physicsBrick.body as Phaser.Physics.Arcade.Body).setSize(brickWidth, brickHeight);
    
    // Debug: Verify position for TNT blocks
    if (brickData.type === 'tnt') {
      console.log('[BrickBreaker] TNT brick created:', {
        phaserX: domElement.x,
        phaserY: domElement.y,
        brickDataX: brickData.x,
        brickDataY: brickData.y,
        col: brickData.col,
        row: brickData.row
      });
    }
    
    return physicsBrick;
  }

  private createUI() {
    this.uiText = {
      coins: this.add.text(20, 20, `Coins: ${this.gameState.coins}`, {
        fontSize: '24px',
        color: '#ffd700',
        fontFamily: 'Arial'
      }),
      lives: this.add.text(20, 50, `Lives: ${this.gameState.lives}`, {
        fontSize: '24px',
        color: '#ff6b6b',
        fontFamily: 'Arial'
      }),
      level: this.add.text(20, 80, `Level: ${this.gameState.level}`, {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }),
      score: this.add.text(20, 110, `Score: ${this.gameState.score}`, {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial'
      })
    };
  }

  private updateUI() {
    this.uiText.coins.setText(`Coins: ${this.gameState.coins}`);
    this.uiText.lives.setText(`Lives: ${this.gameState.lives}`);
    this.uiText.level.setText(`Level: ${this.gameState.level}`);
    this.uiText.score.setText(`Score: ${this.gameState.score}`);
  }

  private levelComplete() {
    // If in test mode, emit event to return to editor instead of going to talent selection
    if (this.isTestMode) {
      EventBus.emit('test-level-complete', { gameState: this.gameState });
      // Show completion message briefly, then return to editor
      this.add.text(
        this.scale.width / 2,
        this.scale.height / 2,
        'Level Complete!\nReturning to editor...',
        {
          fontSize: '48px',
          color: '#4ecdc4',
          fontFamily: 'Arial Black',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 4
        }
      ).setOrigin(0.5).setDepth(1000);
      
      this.time.delayedCall(2000, () => {
        EventBus.emit('return-to-editor');
      });
      return;
    }
    
    // Increment level
    this.gameState.level++;
    
    // Save game state
    EventBus.emit('level-complete', this.gameState);
    
    // Go to talent selection
    this.scene.start('TalentSelection', { gameState: this.gameState });
  }
}
