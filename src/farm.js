// Tiny Farm Village - Farming Plots, Planting, and Growth Logic

import { CROPS } from './crop.js';
import { inventoryInstance } from './inventory.js';
import { SaveSystem } from './save.js';
import { soundManager } from './audio.js';

export class FarmPlot {
    constructor(scene, plotData) {
        this.scene = scene;
        this.id = plotData.id;
        this.gridX = plotData.gridX;
        this.gridY = plotData.gridY;
        this.pixelX = plotData.pixelX;
        this.pixelY = plotData.pixelY;

        // Plot state
        this.cropId = null;            // 'carrot', 'tomato', 'pumpkin' or null
        this.plantedTime = null;       // Timestamp when planted
        this.stage = 0;                // 0: Empty, 1: Seed, 2: Sprout, 3: Growing, 4: Ready
        this.locked = plotData.locked ?? false; // Locked status

        this.watered = plotData.watered ?? false;
        this.isDead = plotData.isDead ?? false;
        this.deadTime = plotData.deadTime ?? null;
        this.waterDeadline = plotData.waterDeadline ?? null;

        // Sprite overlay representing the crop
        // Align sprite perfectly with the 32x32 dirt tile center
        this.sprite = scene.add.sprite(this.pixelX + 16, this.pixelY + 16, 'crop_seed');
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setVisible(false); // Hidden when empty

        // Bouncing water drop indicator
        this.waterDropIcon = scene.add.text(this.pixelX + 16, this.pixelY - 4, '💧', {
            fontSize: '11px',
            align: 'center'
        });
        this.waterDropIcon.setOrigin(0.5, 0.5);
        this.waterDropIcon.setDepth(this.pixelY + 30);
        this.waterDropIcon.setVisible(false);

        // Draw lock overlay and lock icon on top of the dirt tile if locked
        this.lockOverlay = scene.add.graphics();
        this.lockOverlay.fillStyle(0x000000, 0.45); // Darken by 45% for uncultivated look
        this.lockOverlay.fillRect(this.pixelX, this.pixelY, 32, 32);
        this.lockOverlay.setDepth(1);
        this.lockOverlay.setVisible(this.locked);

        this.lockIcon = scene.add.text(this.pixelX + 16, this.pixelY + 16, '🔒', {
            fontSize: '11px',
            align: 'center'
        });
        this.lockIcon.setOrigin(0.5, 0.5);
        this.lockIcon.setDepth(2);
        this.lockIcon.setVisible(this.locked);
    }

    plant(cropId) {
        if (this.cropId !== null) return false;

        const seedKey = `${cropId}_seed`;
        if (inventoryInstance.getItemQty(seedKey) > 0) {
            // Deduct seed
            inventoryInstance.removeItem(seedKey, 1);
            
            // Plant
            this.cropId = cropId;
            this.plantedTime = Date.now();
            this.stage = 1;
            this.watered = false;
            this.isDead = false;
            this.deadTime = null;
            this.waterDeadline = Date.now() + 60000; // 1 minute to water it
            
            this.updateVisual();
            soundManager.playSFX('plant');
            SaveSystem.showToast(`Đã gieo Hạt giống ${CROPS[cropId].name}! Hãy tưới nước ngay! 💧`);
            return true;
        } else {
            soundManager.playSFX('error');
            SaveSystem.showToast(`Bạn không có hạt giống ${CROPS[cropId].name} để gieo! ❌`);
            return false;
        }
    }

    water() {
        if (this.cropId === null || this.isDead || this.watered) return false;

        this.watered = true;
        this.waterDeadline = null;
        this.plantedTime = Date.now(); // Growth timer restarts from watering moment!
        
        this.updateVisual();
        soundManager.playSFX('water');
        SaveSystem.showToast(`Đã tưới nước cho ${CROPS[this.cropId].name}! Cây bắt đầu lớn 🌱`);
        return true;
    }

    harvest() {
        if (this.cropId === null || this.stage !== 4 || this.isDead) return false;

        const crop = CROPS[this.cropId];
        if (crop) {
            // Add crop to inventory
            const cropKey = `${this.cropId}_harvested`;
            inventoryInstance.addItem(cropKey, 1);
            soundManager.playSFX('harvest');
            SaveSystem.showToast(`Thu hoạch: ${crop.icon} ${crop.name}! +1`);

            // Floating reward text at the plot
            this._spawnFloatText(crop.icon + ' +1');

            // Reset plot
            this.cropId = null;
            this.plantedTime = null;
            this.stage = 0;
            this.watered = false;
            this.isDead = false;
            this.deadTime = null;
            this.waterDeadline = null;
            this.updateVisual();
            return true;
        }
        return false;
    }

    // Spawn a small floating text that rises and fades — harvest feedback
    _spawnFloatText(text) {
        const cx = this.pixelX + 16;
        const cy = this.pixelY + 8;

        const floatText = this.scene.add.text(cx, cy, text, {
            fontFamily: "'Nunito', 'Be Vietnam Pro', sans-serif",
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#1a0f00',
            strokeThickness: 3,
            shadow: { offsetX: 0, offsetY: 1, color: '#000', blur: 4, fill: true }
        });
        floatText.setOrigin(0.5, 1);
        floatText.setDepth(500);
        floatText.setAlpha(1);

        this.scene.tweens.add({
            targets: floatText,
            y: cy - 36,
            alpha: 0,
            scaleX: 0.85,
            scaleY: 0.85,
            duration: 900,
            ease: 'Cubic.easeOut',
            onComplete: () => floatText.destroy()
        });
    }

    update() {
        if (this.cropId === null) return;

        // Handle dead crop automatic removal
        if (this.isDead) {
            const deadElapsed = (Date.now() - this.deadTime) / 1000;
            if (deadElapsed >= 10) {
                // Auto-clear
                this.cropId = null;
                this.plantedTime = null;
                this.stage = 0;
                this.watered = false;
                this.isDead = false;
                this.deadTime = null;
                this.waterDeadline = null;
                this.sprite.clearTint();
                this.sprite.setAngle(0);
                this.updateVisual();
                
                // Save game state
                if (window._phaserScene) {
                    SaveSystem.saveGame(window._phaserScene.player, window._phaserScene.farm);
                }
            }
            return;
        }

        const crop = CROPS[this.cropId];
        if (!crop) return;

        // Check dry/watered conditions
        if (!this.watered) {
            // Sinusoidal bounce on water drop text indicator
            if (this.waterDropIcon) {
                this.waterDropIcon.setY(this.pixelY - 4 + Math.sin(Date.now() * 0.006) * 3);
            }

            if (Date.now() >= this.waterDeadline) {
                // Crop dies!
                this.isDead = true;
                this.deadTime = Date.now();
                this.stage = 0;
                this.watered = false;
                this.waterDeadline = null;
                this.updateVisual();
                soundManager.playSFX('error');
                SaveSystem.showToast(`Cây đã chết do không được tưới nước kịp thời! 💀`);

                // Save game state
                if (window._phaserScene) {
                    SaveSystem.saveGame(window._phaserScene.player, window._phaserScene.farm);
                }
            }
            return;
        }

        // Standard growth loop (runs only when watered)
        if (this.stage === 4) return;

        const elapsedSeconds = (Date.now() - this.plantedTime) / 1000;
        const totalGrowTime = crop.growTime;

        let currentStage = 1; // Seed
        if (elapsedSeconds >= totalGrowTime) {
            currentStage = 4; // Ready
        } else if (elapsedSeconds >= totalGrowTime * 0.5) {
            currentStage = 3; // Growing
        } else if (elapsedSeconds >= totalGrowTime * 0.1) {
            currentStage = 2; // Sprout
        }

        if (currentStage !== this.stage) {
            this.stage = currentStage;
            this.updateVisual();
            
            if (this.stage === 4) {
                // Flash animation or particle when crop is ready
                const currentScale = this.sprite.scaleX;
                this.scene.tweens.add({
                    targets: this.sprite,
                    scale: currentScale * 1.15, // Scale up slightly and cleanly relative to current scale
                    duration: 180,
                    yoyo: true,
                    repeat: 1
                });
            }
        }
    }

    updateVisual() {
        if (this.lockOverlay) {
            this.lockOverlay.setVisible(this.locked);
        }
        if (this.lockIcon) {
            this.lockIcon.setVisible(this.locked);
        }

        if (this.locked) {
            this.sprite.setVisible(false);
            if (this.waterDropIcon) this.waterDropIcon.setVisible(false);
            return;
        }

        // Toggle water warning icon visibility
        if (this.waterDropIcon) {
            const needsWaterPrompt = this.cropId !== null && !this.watered && !this.isDead;
            this.waterDropIcon.setVisible(needsWaterPrompt);
        }

        if (this.cropId === null || (this.stage === 0 && !this.isDead)) {
            this.sprite.setVisible(false);
            this.sprite.clearTint();
            this.sprite.setAngle(0);
            return;
        }

        this.sprite.setVisible(true);

        // Apply dead crop visual style (brown tint and tilted angle)
        if (this.isDead) {
            this.sprite.setTint(0x78350f); // Withered brown color
            this.sprite.setAngle(90);       // Rotated/knocked over
        } else {
            this.sprite.clearTint();
            this.sprite.setAngle(0);
        }

        const useAICrops = this._checkAICropsReady();

        if (useAICrops) {
            // Row mapping based on actual spritesheet visual layout:
            // Row 0=Carrot, Row 1=Tomato, Row 2=Watermelon(unused), Row 3=Pumpkin
            const cropRows = { carrot: 0, tomato: 1, pumpkin: 3 };
            const row = cropRows[this.cropId] ?? 0;
            // Column mapping: if dead show stage 3 (withered plant), otherwise active stage
            const col = this.isDead ? 2 : (this.stage - 1);
            const totalCols = 4;
            const frameIndex = row * totalCols + col;

            this.sprite.setTexture('img_crops', frameIndex);

            // Apply size scaling and depth offsets based on growth stage
            this.sprite.setScale(0.125);
            this.sprite.setX(this.pixelX + 16);

            if (this.isDead || this.stage === 3 || this.stage === 4) {
                this.sprite.setY(this.pixelY + 12); // Shifted 4px up
                this.sprite.setDepth(this.pixelY + 20);
            } else {
                this.sprite.setY(this.pixelY + 16); // Centered on tile
                this.sprite.setDepth(this.pixelY + 16);
            }
        } else {
            // Fallback to canvas textures (32×32 each)
            this.sprite.setScale(1.0);
            this.sprite.setX(this.pixelX + 16);
            this.sprite.setY(this.pixelY + 16);
            this.sprite.setDepth(this.pixelY + 16);

            if (this.isDead) {
                this.sprite.setTexture(`${this.cropId}_growing`);
            } else {
                switch (this.stage) {
                    case 1:
                        this.sprite.setTexture('crop_seed');
                        break;
                    case 2:
                        this.sprite.setTexture('crop_sprout');
                        break;
                    case 3:
                        this.sprite.setTexture(`${this.cropId}_growing`);
                        break;
                    case 4:
                        this.sprite.setTexture(`${this.cropId}_ready`);
                        break;
                }
            }
        }
    }

    // Validate that the AI crops spritesheet is properly loaded with correct dimensions
    _checkAICropsReady() {
        if (!this.scene.textures.exists('img_crops')) return false;
        const tex = this.scene.textures.get('img_crops');
        if (!tex || !tex.source || !tex.source[0]) return false;
        const src = tex.source[0];
        if (src.width < 256 || src.height < 256) return false;
        const frameCount = tex.frameTotal - 1;
        return frameCount >= 16;
    }

    getGrowthHint() {
        if (this.cropId === null) return 'Đất trống (Trồng hạt)';
        if (this.isDead) return 'Cây đã chết do thiếu nước! 💀';
        if (this.stage === 4) return `${CROPS[this.cropId].name} đã sẵn sàng thu hoạch!`;

        const crop = CROPS[this.cropId];
        if (!this.watered) return `${crop.name} (Khô héo, cần tưới nước gấp! 💧)`;

        const elapsed = (Date.now() - this.plantedTime) / 1000;
        const remaining = Math.max(0, Math.ceil(crop.growTime - elapsed));
        
        return `${crop.name} (${remaining} giây nữa)`;
    }

    toJSON() {
        return {
            id: this.id,
            cropId: this.cropId,
            plantedTime: this.plantedTime,
            stage: this.stage,
            locked: this.locked,
            watered: this.watered,
            isDead: this.isDead,
            deadTime: this.deadTime,
            waterDeadline: this.waterDeadline
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.cropId = data.cropId;
        this.plantedTime = data.plantedTime;
        this.stage = data.stage;
        this.locked = data.locked ?? false;
        this.watered = data.watered ?? false;
        this.isDead = data.isDead ?? false;
        this.deadTime = data.deadTime ?? null;
        this.waterDeadline = data.waterDeadline ?? null;
        this.updateVisual();
    }
}

export class FarmManager {
    constructor(scene, plotCoords) {
        this.scene = scene;
        this.plots = [];

        // Build plots array
        plotCoords.forEach(coord => {
            this.plots.push(new FarmPlot(scene, coord));
        });
    }

    update() {
        this.plots.forEach(plot => plot.update());
    }

    getPlotAt(gridX, gridY) {
        return this.plots.find(plot => plot.gridX === gridX && plot.gridY === gridY);
    }

    toJSON() {
        return this.plots.map(plot => plot.toJSON());
    }

    fromJSON(dataArray) {
        if (!Array.isArray(dataArray)) return;
        dataArray.forEach(data => {
            const plot = this.plots.find(p => p.id === data.id);
            if (plot) {
                plot.fromJSON(data);
            }
        });
    }

    // Unlock the next locked plot and return true if successful
    unlockNextPlot() {
        const nextPlot = this.plots.find(plot => plot.locked);
        if (nextPlot) {
            nextPlot.locked = false;
            nextPlot.updateVisual();
            return true;
        }
        return false;
    }
}
