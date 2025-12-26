import { GameObjects, Scene } from "phaser";

import { EventBus } from "../EventBus";
import { createAnimatedBackground, BackgroundManager } from "../utils/backgroundUtils";

export class MainMenu extends Scene {
  background: GameObjects.Image;
  title: GameObjects.Text;
  private backgroundManager?: BackgroundManager;

  constructor() {
    super("MainMenu");
  }

  create() {
    // Create animated background (reusable function)
    this.backgroundManager = createAnimatedBackground(this);

    // Get screen center
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Create animated title with letter-by-letter effect
    this.createAnimatedTitle();

    // Start button with beveled styling - using cyan/teal to match title
    const startBtn = this.createBeveledButton(
      centerX,
      centerY - 70,
      200,
      50,
      0x4ecdc4,
      0x3ab5ad
    );
    startBtn.setInteractive({ useHandCursor: true });
    startBtn.setDepth(100);

    const startText = this.add
      .text(centerX, centerY - 70, "START GAME", {
        fontSize: "22px",
        color: "#ffffff",
        align: "center",
        fontFamily: "Arial Black",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(101);

    // Button click handler
    startBtn.on("pointerdown", () => {
      // Visual feedback on click
      this.tweens.add({
        targets: startBtn,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          this.changeScene();
        },
      });
    });

    // Hover effects
    startBtn.on("pointerover", () => {
      this.updateBeveledButton(startBtn, 0x6eddd4, 0x4ecdc4);
      this.tweens.add({
        targets: startBtn,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
      });
    });

    startBtn.on("pointerout", () => {
      this.updateBeveledButton(startBtn, 0x4ecdc4, 0x3ab5ad);
      this.tweens.add({
        targets: startBtn,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
      });
    });

    // Endless Mode button - using purple to match title
    const endlessBtn = this.createBeveledButton(
      centerX,
      centerY + 20,
      200,
      50,
      0xbb8fce,
      0x9b6fae
    );
    endlessBtn.setInteractive({ useHandCursor: true });
    endlessBtn.setDepth(100);

    const endlessText = this.add
      .text(centerX, centerY + 20, "ENDLESS MODE", {
        fontSize: "20px",
        color: "#ffffff",
        align: "center",
        fontFamily: "Arial Black",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(101);

    // Button click handler
    endlessBtn.on("pointerdown", () => {
      // Visual feedback on click
      this.tweens.add({
        targets: endlessBtn,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          this.startEndlessMode();
        },
      });
    });

    // Hover effects
    endlessBtn.on("pointerover", () => {
      this.updateBeveledButton(endlessBtn, 0xc9a5d9, 0xbb8fce);
      this.tweens.add({
        targets: endlessBtn,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
      });
    });

    endlessBtn.on("pointerout", () => {
      this.updateBeveledButton(endlessBtn, 0xbb8fce, 0x9b6fae);
      this.tweens.add({
        targets: endlessBtn,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
      });
    });

    // Level Editor button - using yellow/gold to match title
    const editorBtn = this.createBeveledButton(
      centerX,
      centerY + 110,
      200,
      50,
      0xf7dc6f,
      0xd7bc4f
    );
    editorBtn.setStrokeStyle(2, 0xffd700);
    editorBtn.setInteractive({ useHandCursor: true });
    editorBtn.setDepth(100);

    const editorText = this.add
      .text(centerX, centerY + 110, "LEVEL EDITOR", {
        fontSize: "20px",
        color: "#ffffff",
        align: "center",
        fontFamily: "Arial Black",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(101);

    // Button click handler
    editorBtn.on("pointerdown", () => {
      // Visual feedback on click
      this.tweens.add({
        targets: editorBtn,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          this.openLevelEditor();
        },
      });
    });

    // Hover effects
    editorBtn.on("pointerover", () => {
      this.updateBeveledButton(editorBtn, 0xffe44d, 0xf7dc6f);
      editorBtn.setStrokeStyle(2, 0xffeb6e);
      this.tweens.add({
        targets: editorBtn,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
      });
    });

    editorBtn.on("pointerout", () => {
      this.updateBeveledButton(editorBtn, 0xf7dc6f, 0xd7bc4f);
      editorBtn.setStrokeStyle(2, 0xffd700);
      this.tweens.add({
        targets: editorBtn,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
      });
    });

    // Instructions
    this.add
      .text(centerX, centerY + 170, "Click a button above to start", {
        fontSize: "18px",
        color: "#cccccc",
        align: "center",
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setDepth(100);

    // Controls hint
    this.add
      .text(
        centerX,
        centerY + 200,
        "Controls: A/D or Arrow Keys to move, Space/W to launch ball",
        {
          fontSize: "14px",
          color: "#999999",
          align: "center",
          fontFamily: "Arial",
        }
      )
      .setOrigin(0.5)
      .setDepth(100);

    EventBus.emit("current-scene-ready", this);
  }

  changeScene() {
    // Start brick breaker game
    this.scene.start("BrickBreaker", {
      gameState: {
        coins: 0,
        lives: 3,
        level: 1,
        score: 0,
        talents: [],
      },
    });
  }

  startEndlessMode() {
    // Start brick breaker game in endless mode
    this.scene.start("BrickBreaker", {
      gameState: {
        coins: 0,
        lives: 3,
        level: 1,
        score: 0,
        talents: [],
      },
      isEndlessMode: true,
    });
  }

  openLevelEditor() {
    // Emit event to open level editor
    EventBus.emit("open-level-editor");
  }


  private createAnimatedTitle() {
    const titleText = "BROUGE";
    const centerX = this.scale.width / 2;
    const startY = this.scale.height / 2 - 180;
    const letterSpacing = 60;
    const startX = centerX - ((titleText.length - 1) * letterSpacing) / 2;

    // Create each letter as a separate DOM element for CSS font-palette support
    const letters: Phaser.GameObjects.DOMElement[] = [];

    titleText.split("").forEach((letter, index) => {
      const letterX = startX + index * letterSpacing;

      // Create main letter using DOM element with CSS font-palette
      const letterElement = document.createElement("div");
      letterElement.textContent = letter;
      // Add letter-specific class for color palette
      const letterClass = `brouge-title letter-${letter.toLowerCase()}`;
      letterElement.className = letterClass;
      letterElement.style.fontFamily = '"Nabla", sans-serif';
      letterElement.style.fontSize = "80px";
      letterElement.style.fontVariationSettings = '"EDPT" 100, "EHLT" 12';
      letterElement.style.textShadow = "3px 3px 6px rgba(0, 0, 0, 0.8)";
      letterElement.style.position = "relative";
      letterElement.style.left = "0";
      letterElement.style.top = "0";
      letterElement.style.pointerEvents = "none";

      // Wrap in a container
      const container = document.createElement("div");
      container.style.position = "relative";
      container.style.display = "inline-block";
      container.style.pointerEvents = "none";
      container.appendChild(letterElement);

      // Create Phaser DOM element
      const letterDOM = this.add.dom(letterX, startY, container);
      letterDOM.setOrigin(0.5);
      letterDOM.setDepth(100);
      letterDOM.setAlpha(0);
      letterDOM.setScale(0);

      letters.push(letterDOM);

      // Staggered entrance animation
      this.tweens.add({
        targets: letterDOM,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 400,
        delay: index * 100,
        ease: "Back.easeOut",
      });

      // Continuous pulsing glow effect
      this.tweens.add({
        targets: letterDOM,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 1500,
        delay: index * 100 + 400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });
  }

  private createBeveledButton(
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number,
    borderColor: number
  ): Phaser.GameObjects.Rectangle {
    const button = this.add.rectangle(x, y, width, height, fillColor);
    button.setStrokeStyle(2, borderColor);

    // Create bevel effect using graphics overlay
    const graphics = this.add.graphics();
    graphics.setDepth(button.depth + 1);

    // Top and left highlights (light)
    graphics.lineStyle(2, 0xffffff, 0.2);
    graphics.strokeRect(x - width / 2, y - height / 2, width, height);

    // Bottom and right shadows (dark)
    graphics.lineStyle(2, 0x000000, 0.3);
    graphics.beginPath();
    graphics.moveTo(x - width / 2, y + height / 2);
    graphics.lineTo(x + width / 2, y + height / 2);
    graphics.lineTo(x + width / 2, y - height / 2);
    graphics.strokePath();

    // Store graphics reference for cleanup
    (button as any).bevelGraphics = graphics;

    return button;
  }

  private updateBeveledButton(
    button: Phaser.GameObjects.Rectangle,
    fillColor: number,
    borderColor: number
  ) {
    button.setFillStyle(fillColor);
    button.setStrokeStyle(2, borderColor);
  }

  update(time: number, delta: number) {
    // Update animated background
    if (this.backgroundManager) {
      this.backgroundManager.update(time, delta);
    }
  }
}
