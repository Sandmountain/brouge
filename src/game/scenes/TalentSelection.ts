import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { GameState, Talent } from '../types';
import { createGradientBackground } from '../utils/backgroundUtils';

export class TalentSelection extends Scene {
  private gameState!: GameState;
  private talents: Talent[] = [
    { id: 'paddle-size', name: 'Bigger Paddle', description: 'Increases paddle width by 20%' },
    { id: 'ball-speed', name: 'Faster Ball', description: 'Increases ball speed by 15%' },
    { id: 'extra-life', name: 'Extra Life', description: 'Gain an additional life' },
    { id: 'coin-multiplier', name: 'Coin Multiplier', description: 'Earn 50% more coins' },
    { id: 'drop-rate', name: 'Better Drops', description: 'Increase drop chance by 10%' },
    { id: 'brick-breaker', name: 'Brick Breaker', description: 'Bricks take 1 less hit to destroy' }
  ];
  
  private selectedTalents: string[] = [];

  init(data: { gameState: GameState }) {
    this.gameState = data.gameState;
    this.selectedTalents = [...this.gameState.talents];
  }

  create() {
    // Create gradient background
    createGradientBackground(this);
    
    // Title
    this.add.text(this.scale.width / 2, 50, 'Choose a Talent', {
      fontSize: '48px',
      color: '#ffffff',
      align: 'center',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    
    // Instructions
    this.add.text(this.scale.width / 2, 100, 'Level Complete! Select one talent to continue:', {
      fontSize: '20px',
      color: '#cccccc',
      align: 'center',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Show 3 random talents (excluding already selected ones)
    const availableTalents = this.talents.filter(t => !this.selectedTalents.includes(t.id));
    const randomTalents = Phaser.Utils.Array.Shuffle([...availableTalents]).slice(0, 3);
    
    // If we have less than 3 available, fill with already selected ones (can't select again but shows progress)
    while (randomTalents.length < 3 && this.talents.length > randomTalents.length) {
      const remaining = this.talents.filter(t => !randomTalents.includes(t));
      if (remaining.length > 0) {
        randomTalents.push(remaining[0]);
      } else {
        break;
      }
    }
    
    randomTalents.forEach((talent, index) => {
      const y = 200 + index * 150;
      const x = this.scale.width / 2;
      
      const isSelected = this.selectedTalents.includes(talent.id);
      
      // Talent card background
      const card = this.add.rectangle(x, y, 600, 120, isSelected ? 0x3a3a4e : 0x2a2a3e);
      card.setStrokeStyle(2, isSelected ? 0x888888 : 0x4ecdc4);
      
      // Talent name
      const nameText = this.add.text(x, y - 20, talent.name, {
        fontSize: '32px',
        color: isSelected ? '#888888' : '#4ecdc4',
        align: 'center',
        fontFamily: 'Arial Black'
      }).setOrigin(0.5);
      
      // Talent description
      const descText = this.add.text(x, y + 20, talent.description, {
        fontSize: '18px',
        color: isSelected ? '#666666' : '#ffffff',
        align: 'center',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      
      // Selected indicator
      if (isSelected) {
        this.add.text(x + 250, y - 40, '✓', {
          fontSize: '24px',
          color: '#4ecdc4',
          fontFamily: 'Arial'
        });
      }
      
      // Make clickable only if not already selected
      if (!isSelected) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerdown', () => {
          this.selectTalent(talent);
        });
        
        // Hover effect
        card.on('pointerover', () => {
          card.setFillStyle(0x3a3a4e);
        });
        card.on('pointerout', () => {
          card.setFillStyle(0x2a2a3e);
        });
      }
    });
    
    // Continue button (in case player wants to skip or has all talents)
    const continueBtn = this.add.rectangle(this.scale.width / 2, 650, 200, 50, 0x4ecdc4);
    continueBtn.setStrokeStyle(2, 0xffffff);
    continueBtn.setInteractive({ useHandCursor: true });
    
    const continueText = this.add.text(this.scale.width / 2, 650, 'Continue', {
      fontSize: '24px',
      color: '#ffffff',
      align: 'center',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);
    
    continueBtn.on('pointerdown', () => {
      this.continueToNextLevel();
    });
    
    continueBtn.on('pointerover', () => {
      continueBtn.setFillStyle(0x5edcd4);
    });
    
    continueBtn.on('pointerout', () => {
      continueBtn.setFillStyle(0x4ecdc4);
    });
    
    EventBus.emit('current-scene-ready', this);
  }

  private selectTalent(talent: Talent) {
    if (this.selectedTalents.includes(talent.id)) return;
    
    this.selectedTalents.push(talent.id);
    this.gameState.talents = [...this.selectedTalents];
    
    // Apply immediate effects if applicable
    if (talent.id === 'extra-life') {
      this.gameState.lives++;
    }
    
    // Continue to next level after a brief delay
    this.time.delayedCall(500, () => {
      this.continueToNextLevel();
    });
  }

  private continueToNextLevel() {
    this.scene.start('BrickBreaker', { gameState: this.gameState });
  }
}





