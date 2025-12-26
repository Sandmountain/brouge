import { Scene } from 'phaser';
import { createGradientBackground } from '../utils/backgroundUtils';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        // Create gradient background
        createGradientBackground(this);

        //  A simple progress bar. This is the outline of the bar.
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        this.add.rectangle(centerX, centerY, 468, 32).setStrokeStyle(1, 0xffffff).setDepth(100);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(centerX-230, centerY, 4, 28, 0xffffff).setDepth(100);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');
        
        // Load player ship
        this.load.setPath('assets/kenney_space-shooter-redux/PNG');
        this.load.image('playerShip2_blue', 'playerShip2_blue.png');
        
        // Load fire sprites for ship combustion
        for (let i = 0; i <= 19; i++) {
            const fireNum = i.toString().padStart(2, '0');
            this.load.image(`fire${fireNum}`, `Effects/fire${fireNum}.png`);
        }
        
        // Load star sprites for main menu background
        this.load.setPath('assets/space-star');
        this.load.image('particleStar', 'particleStar.png');
        this.load.image('particleSmallStar', 'particleSmallStar.png');
        
        // Load smoke sprites for background ambiance
        this.load.setPath('assets/fx');
        for (let i = 1; i <= 8; i++) {
            const smokeNum = i.toString().padStart(2, '0');
            this.load.image(`smoke_${smokeNum}`, `smoke_${smokeNum}.png`);
        }
        
        // Load planet sprites
        this.load.setPath('assets/kenney_planets/Planets');
        for (let i = 0; i <= 8; i++) {
            const planetNum = i.toString().padStart(2, '0');
            this.load.image(`planet${planetNum}`, `planet${planetNum}.png`);
        }
        
        // Load light effects for planets
        this.load.setPath('assets/kenney_planets/Parts');
        for (let i = 0; i <= 10; i++) {
            this.load.image(`light${i}`, `light${i}.png`);
        }
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}

