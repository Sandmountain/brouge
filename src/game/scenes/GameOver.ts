import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { GameState } from '../types';

export class GameOver extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameOverText : Phaser.GameObjects.Text;
    private gameState?: GameState;

    constructor ()
    {
        super('GameOver');
    }

    init(data?: { gameState?: GameState }) {
        this.gameState = data?.gameState;
    }

    create ()
    {
        this.camera = this.cameras.main
        this.camera.setBackgroundColor(0xff0000);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.5);

        this.gameOverText = this.add.text(512, 300, 'Game Over', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Show final stats
        if (this.gameState) {
            this.add.text(512, 400, `Final Score: ${this.gameState.score}`, {
                fontFamily: 'Arial', fontSize: 32, color: '#ffffff',
                align: 'center'
            }).setOrigin(0.5).setDepth(100);

            this.add.text(512, 450, `Coins Earned: ${this.gameState.coins}`, {
                fontFamily: 'Arial', fontSize: 32, color: '#ffd700',
                align: 'center'
            }).setOrigin(0.5).setDepth(100);

            this.add.text(512, 500, `Level Reached: ${this.gameState.level}`, {
                fontFamily: 'Arial', fontSize: 32, color: '#ffffff',
                align: 'center'
            }).setOrigin(0.5).setDepth(100);
        }

        // Restart button
        const restartBtn = this.add.rectangle(512, 600, 200, 50, 0x4ecdc4);
        restartBtn.setStrokeStyle(2, 0xffffff);
        restartBtn.setInteractive({ useHandCursor: true });
        
        const restartText = this.add.text(512, 600, 'Play Again', {
            fontSize: '24px',
            color: '#ffffff',
            align: 'center',
            fontFamily: 'Arial Black'
        }).setOrigin(0.5);
        
        restartBtn.on('pointerdown', () => {
            this.changeScene();
        });
        
        restartBtn.on('pointerover', () => {
            restartBtn.setFillStyle(0x5edcd4);
        });
        
        restartBtn.on('pointerout', () => {
            restartBtn.setFillStyle(0x4ecdc4);
        });
        
        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        this.scene.start('MainMenu');
    }
}

