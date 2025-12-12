import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.background = this.add.image(512, 384, 'background');

        this.logo = this.add.image(512, 300, 'logo').setDepth(100);

        this.title = this.add.text(512, 460, 'Brick Breaker', {
            fontFamily: 'Arial Black', fontSize: 48, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Start button with enhanced styling
        const startBtn = this.add.rectangle(512, 550, 250, 70, 0x4ecdc4);
        startBtn.setStrokeStyle(4, 0xffffff);
        startBtn.setInteractive({ useHandCursor: true });
        startBtn.setDepth(100);

        const startText = this.add.text(512, 550, 'START GAME', {
            fontSize: '32px',
            color: '#ffffff',
            align: 'center',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(101);

        // Button click handler
        startBtn.on('pointerdown', () => {
            // Visual feedback on click
            this.tweens.add({
                targets: startBtn,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    this.changeScene();
                }
            });
        });

        // Hover effects
        startBtn.on('pointerover', () => {
            startBtn.setFillStyle(0x5edcd4);
            this.tweens.add({
                targets: startBtn,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 150
            });
        });

        startBtn.on('pointerout', () => {
            startBtn.setFillStyle(0x4ecdc4);
            this.tweens.add({
                targets: startBtn,
                scaleX: 1,
                scaleY: 1,
                duration: 150
            });
        });

        // Instructions
        this.add.text(512, 630, 'Click the button above to start', {
            fontSize: '18px',
            color: '#cccccc',
            align: 'center',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(100);

        // Controls hint
        this.add.text(512, 660, 'Controls: A/D or Arrow Keys to move, Space/W to launch ball', {
            fontSize: '14px',
            color: '#999999',
            align: 'center',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(100);

        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {
        if (this.logoTween)
        {
            this.logoTween.stop();
            this.logoTween = null;
        }

        // Start brick breaker game
        this.scene.start('BrickBreaker', { 
            gameState: { 
                coins: 0, 
                lives: 3, 
                level: 1, 
                score: 0,
                talents: []
            } 
        });
    }

    moveLogo (vueCallback: ({ x, y }: { x: number, y: number }) => void)
    {
        if (this.logoTween)
        {
            if (this.logoTween.isPlaying())
            {
                this.logoTween.pause();
            }
            else
            {
                this.logoTween.play();
            }
        } 
        else
        {
            this.logoTween = this.tweens.add({
                targets: this.logo,
                x: { value: 750, duration: 3000, ease: 'Back.easeInOut' },
                y: { value: 80, duration: 1500, ease: 'Sine.easeOut' },
                yoyo: true,
                repeat: -1,
                onUpdate: () => {
                    if (vueCallback)
                    {
                        vueCallback({
                            x: Math.floor(this.logo.x),
                            y: Math.floor(this.logo.y)
                        });
                    }
                }
            });
        }
    }
}

