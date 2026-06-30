// Tiny Farm Village - Main Game Launcher & Scene Setup

import { MapManager } from './map.js';
import { Player }     from './player.js';
import { NpcManager } from './npc.js';
import { FarmManager } from './farm.js';
import { UIController } from './ui.js';
import { SaveSystem }   from './save.js';
import { inventoryInstance } from './inventory.js';
import { CROPS }        from './crop.js';
import { dialogueInstance } from './dialogue.js';
import { shopInstance }  from './shop.js';
import { LotteryManager } from './lotteryNPC.js';
import { lotteryInstance } from './lottery.js';
import { lotteryUIInstance } from './lotteryUI.js';
import { soundManager } from './audio.js';

// Helper to check if grid position is adjacent to water (tile type 2)
const isAdjacentToWater = (gx, gy, grid) => {
    const checkCoords = [
        {x: gx - 1, y: gy},
        {x: gx + 1, y: gy},
        {x: gx, y: gy - 1},
        {x: gx, y: gy + 1},
        {x: gx, y: gy}
    ];
    for (const c of checkCoords) {
        if (c.y >= 0 && c.y < grid.length && c.x >= 0 && c.x < grid[0].length) {
            if (grid[c.y][c.x] === 2) return true; // 2 = water
        }
    }
    return false;
};

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // 1. Queue loading of AI-generated PNG images
        MapManager.preloadAssets(this);

        // 2. Generate canvas-based tiles & fallback sprites
        //    (called after Phaser boot, before AI images are needed)
        MapManager.generateTextures(this);
    }

    create() {
        // ── 1. Tile-based map (sprite grid, no tilemap) ──
        const mapData = MapManager.createMapLayout(this);
        this.mapData  = mapData;

        // ── 2. Physics collision group for solid objects ──
        this.obstacles = this.physics.add.staticGroup();

        // ── 3. Village decorations (fences, trees, well, sign) ──
        this.createDecorations();

        // ── 4. NPCs + stalls ──
        const spawnData = NpcManager.spawnNPCs(this);
        this.npcs = spawnData.npcs;
        spawnData.collidables.forEach(s => this.obstacles.add(s));

        // Spawn Lottery NPC & Stall
        const lottoSpawn = LotteryManager.spawnLotteryNPC(this);
        this.npcs.push(lottoSpawn.npc);
        this.obstacles.add(lottoSpawn.collidable);

        // ── 5. Player ──
        this.player = new Player(this, 400, 320);
        this.player.setDepth(10);

        // ── 6. Collisions ──
        this.createWaterColliders();
        this.physics.add.collider(this.player, this.obstacles);

        // ── 7. Farm plots ──
        this.farm = new FarmManager(this, mapData.plotCoords);

        // ── 8. Selection highlight (sleek corner brackets) ──
        this.selectorGraphic = this.add.graphics().setDepth(20);
        this.drawSelectorCorners(this.selectorGraphic);
        this.selectorGraphic.setVisible(false);

        // ── 9. Camera ──
        this.cameras.main.setBounds(0, 0, mapData.width, mapData.height);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        
        // Auto zoom-in on mobile to make sprites and text larger and easier to see
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isTouch) {
            this.cameras.main.setZoom(1.85);
        }
        
        this.cameras.main.setBackgroundColor('#3a6e22'); // Fill gaps between tiles

        // ── 10. HTML overlay UI ──
        this.ui = new UIController(this);

        // Hook and adjust input coordinates for Phaser if CSS orientation rotation is active
        const inputManager = this.input.manager;
        const originalTransform = inputManager.transformPointer;
        const isCSSRotated = () => {
            return window.innerWidth < window.innerHeight && 
                   (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
        };

        inputManager.transformPointer = function (pointer, pageX, pageY, wasMove) {
            if (isCSSRotated()) {
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // Rotated input: X maps to pageY, Y maps to viewportWidth - pageX
                const rotPageX = pageY;
                const rotPageY = viewportWidth - pageX;

                // Scale relative to canvas visual dimensions (which are swapped)
                const x = rotPageX * (inputManager.game.scale.width / viewportHeight);
                const y = rotPageY * (inputManager.game.scale.height / viewportWidth);

                pointer.prevPosition.copy(pointer.position);
                pointer.position.set(x, y);
                pointer.x = x;
                pointer.y = y;

                if (wasMove && pointer.event) {
                    pointer.velocity.set(pointer.event.movementY, -pointer.event.movementX);
                }

                return pointer;
            } else {
                return originalTransform.call(inputManager, pointer, pageX, pageY, wasMove);
            }
        };

        // Re-scale bounds and refresh scale manager on screen resizing / orientation change
        const adjustAppContainerSize = () => {
            const appContainer = document.getElementById('app-container');
            if (!appContainer) return;

            const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            const isPortrait = window.innerWidth < window.innerHeight;

            if (isMobile && isPortrait) {
                appContainer.style.width = `${window.innerHeight}px`;
                appContainer.style.height = `${window.innerWidth}px`;
                appContainer.style.left = `${window.innerWidth}px`;
                appContainer.style.top = '0px';
                appContainer.style.transform = 'rotate(90deg)';
                appContainer.style.transformOrigin = 'top left';
            } else {
                appContainer.style.width = '';
                appContainer.style.height = '';
                appContainer.style.left = '';
                appContainer.style.top = '';
                appContainer.style.transform = '';
                appContainer.style.transformOrigin = '';
            }
        };

        // Run immediately to fit the app container
        adjustAppContainerSize();

        const handleResize = () => {
            adjustAppContainerSize();
            if (this.scale) {
                this.scale.updateBounds();
                this.scale.refresh();
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        // Initialize BGM and Mute Control
        const btnToggleMusic = document.getElementById('btn-toggle-music');
        if (btnToggleMusic) {
            btnToggleMusic.addEventListener('click', () => {
                const muted = soundManager.toggleMute();
                btnToggleMusic.classList.toggle('muted', muted);
                btnToggleMusic.innerText = muted ? '🔇 Tắt Nhạc' : '🎵 Nhạc';
                btnToggleMusic.blur();
            });
        }

        // BGM Autoplay initialization on first user interaction (browser restriction bypass)
        const startMusicOnInteraction = () => {
            soundManager.initBGM();
            // Remove listeners once BGM is initialized
            document.removeEventListener('click', startMusicOnInteraction);
            document.removeEventListener('keydown', startMusicOnInteraction);
        };
        document.addEventListener('click', startMusicOnInteraction);
        document.addEventListener('keydown', startMusicOnInteraction);

        // Initialize Lottery System & UI
        lotteryInstance.init();
        lotteryUIInstance.update();

        // Expose scene globally so dialogue.js can pause/resume keyboard
        window._phaserScene = this;

        // ── 11. Interaction key E ──
        this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        // ── 12. Ctrl+S → Save ──
        this.input.keyboard.on('keydown', (e) => {
            if ((e.key === 's' || e.key === 'S') && e.ctrlKey) {
                e.preventDefault();
                SaveSystem.saveGame(this.player, this.farm);
            }
        });

        // ── 13. Auto-load saved state & character naming ──
        let showNaming = true;
        if (SaveSystem.hasSave()) {
            const success = SaveSystem.loadGame(this.player, this.farm);
            if (success && this.player.playerName) {
                showNaming = false;
            }
        }

        const namingOverlay = document.getElementById('naming-overlay');
        const inputName = document.getElementById('input-player-name');
        const btnSubmit = document.getElementById('btn-naming-submit');
        const virtualKeyboard = document.getElementById('naming-virtual-keyboard');
        const namingBox = document.querySelector('.naming-box');

        const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        if (showNaming) {
            if (namingOverlay) namingOverlay.classList.remove('hidden');
            this.input.keyboard.enabled = false;
            if (isMobile) {
                if (inputName) {
                    inputName.setAttribute('readonly', 'readonly');
                }
                if (virtualKeyboard) {
                    virtualKeyboard.classList.remove('hidden');
                }
                if (namingBox) {
                    namingBox.classList.add('has-keyboard');
                }
            } else {
                if (inputName) {
                    setTimeout(() => inputName.focus(), 100);
                }
            }
        } else {
            if (namingOverlay) namingOverlay.classList.add('hidden');
            this.input.keyboard.enabled = true;
        }

        // Handle Virtual Keyboard Key Presses
        if (virtualKeyboard && inputName) {
            const keyButtons = virtualKeyboard.querySelectorAll('.key-btn');
            keyButtons.forEach(btn => {
                btn.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    soundManager.playSFX('click');
                    const key = btn.getAttribute('data-key');
                    const currentVal = inputName.value;

                    if (key === 'Backspace') {
                        inputName.value = currentVal.substring(0, currentVal.length - 1);
                    } else {
                        // Max length 14 check
                        if (currentVal.length < 14) {
                            inputName.value = currentVal + key;
                        }
                    }
                });
            });
        }

        const guideOverlay = document.getElementById('guide-overlay');
        const btnOpenGuide = document.getElementById('btn-open-guide');
        const btnCloseGuide = document.getElementById('btn-close-guide');
        const btnGuideStart = document.getElementById('btn-guide-start-playing');

        const openGuide = () => {
            // Close other overlays to avoid overlapping screens
            const overlayIds = ['inventory-overlay', 'shop-overlay', 'sell-overlay', 'auth-overlay', 'lottery-overlay'];
            overlayIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            if (window._phaserScene && window._phaserScene.ui) {
                window._phaserScene.ui.closeInventory();
            }

            if (guideOverlay) guideOverlay.classList.remove('hidden');
            this.input.keyboard.enabled = false;
        };

        const closeGuide = () => {
            if (guideOverlay) guideOverlay.classList.add('hidden');
            // Re-enable keyboard only if naming overlay is also closed
            const namingActive = namingOverlay && !namingOverlay.classList.contains('hidden');
            if (!namingActive) {
                this.input.keyboard.enabled = true;
            }
            if (this.scale) {
                this.scale.refresh();
            }
        };

        if (btnOpenGuide) btnOpenGuide.addEventListener('click', openGuide);
        if (btnCloseGuide) btnCloseGuide.addEventListener('click', closeGuide);
        if (btnGuideStart) btnGuideStart.addEventListener('click', closeGuide);

        // Bind keyboard shortcuts
        this.input.keyboard.on('keydown', (e) => {
            const namingActive = namingOverlay && !namingOverlay.classList.contains('hidden');
            const guideActive = guideOverlay && !guideOverlay.classList.contains('hidden');
            
            // Ignore key hotkeys when typing in any input/textarea or naming overlay
            if (namingActive || guideActive || (document.activeElement && 
               (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA'))) {
                return;
            }

            if (e.key === 'h' || e.key === 'H') {
                openGuide();
            } else if (e.key === '1') {
                inventoryInstance.setActiveSlot('carrot');
                soundManager.playSFX('click');
            } else if (e.key === '2') {
                inventoryInstance.setActiveSlot('tomato');
                soundManager.playSFX('click');
            } else if (e.key === '3') {
                inventoryInstance.setActiveSlot('pumpkin');
                soundManager.playSFX('click');
            } else if (e.key === '4') {
                inventoryInstance.setActiveSlot('water_can');
                soundManager.playSFX('click');
            }
        });

        const submitName = () => {
            const val = inputName ? inputName.value.trim() : '';
            if (val.length > 0) {
                this.player.setName(val);
                if (namingOverlay) namingOverlay.classList.add('hidden');
                
                // Show Guide Overlay immediately after naming
                openGuide();

                // Save immediately to save name
                SaveSystem.saveGame(this.player, this.farm);
            } else {
                SaveSystem.showToast('Vui lòng nhập tên hợp lệ! ⚠️');
            }
        };

        if (btnSubmit) {
            btnSubmit.addEventListener('click', submitName);
        }
        if (inputName) {
            inputName.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitName();
                }
            });
        }

        // ── 14. Auto-save every 30 s ──
        this.time.addEvent({
            delay: 30000,
            callback: () => SaveSystem.saveGame(this.player, this.farm),
            loop: true
        });
    }

    update() {
        this.player.update();
        this.farm.update();
        this.handleInteractions();

        // Depth-sort player vs world objects each frame (Y-sorting)
        this.player.setDepth(this.player.y);
    }

    createDecorations() {
        // Top fence row (cols 4→24, row 1)
        for (let col = 4; col < 25; col++) {
            const fenceKey = MapManager.getTexKey(this, 'img_fence', 'obj_fence');
            const fence = this.physics.add.staticSprite(col * 32 + 16, 1 * 32 + 16, fenceKey);
            if (fenceKey === 'img_fence') {
                fence.setScale(0.03125); // 1024px → 32px
                fence.refreshBody();
            }
            // World-pixel hitbox (same size regardless of AI or canvas texture)
            fence.body.setSize(32, 14).setOffset(0, 9);
            fence.setDepth(1 * 32 + 16);
            this.obstacles.add(fence);
        }

        // Left fence column (skip row 10)
        for (let row = 0; row < 19; row++) {
            if (row === 10) continue;
            const fenceKey = MapManager.getTexKey(this, 'img_fence', 'obj_fence');
            const fence = this.physics.add.staticSprite(3 * 32 + 16, row * 32 + 16, fenceKey);
            if (fenceKey === 'img_fence') {
                fence.setScale(0.03125); // 1024px → 32px
                fence.refreshBody();
            }
            // World-pixel hitbox (same regardless of texture)
            fence.body.setSize(32, 14).setOffset(0, 9);
            fence.setDepth(row * 32 + 16);
            this.obstacles.add(fence);
        }





        // Sign near farm entrance (col 8, row 11)
        const sign = this.physics.add.staticSprite(8 * 32 + 16, 11 * 32 + 16, 'obj_sign');
        sign.body.setSize(24, 14).setOffset(4, 18);
        sign.setDepth(11 * 32 + 16);
        this.obstacles.add(sign);

        // Signboard label for Farming Area (mounted directly onto the signpost)
        MapManager.createWoodenSign(this, sign.x, sign.y - 8, '🌾 TRỒNG TRỌT', 'board');

        // Trees
        const treeCoords = [
            { c: 5,  r: 2 }, { c: 9,  r: 2 }, { c: 14, r: 2 },
            { c: 20, r: 2 }, { c: 23, r: 2 },
            { c: 23, r: 6 }, { c: 23, r: 10 }, { c: 23, r: 14 }, { c: 23, r: 17 }
        ];
        const treeKey = MapManager.getTexKey(this, 'img_tree', 'obj_tree');
        treeCoords.forEach(({ c, r }) => {
            const tx = c * 32 + 16;
            const ty = r * 32 + 16;
            const tree = this.physics.add.staticSprite(tx, ty + 16, treeKey);
            tree.setOrigin(0.5, 0.83);
            if (treeKey === 'img_tree') {
                tree.setScale(0.08); // 1024px → ~82px
                // refreshBody() resets body to sprite frame×scale, then set world-space hitbox
                tree.refreshBody();
                tree.body.setSize(24, 20).setOffset(-12, 30);
            } else {
                tree.body.setSize(24, 20).setOffset(20, 72);
            }
            tree.setDepth(ty + 16);
            this.obstacles.add(tree);
        });
    }

    // ── Water collision zones ─────────────────────────────────────────────────
    createWaterColliders() {
        const grid = this.mapData.grid;
        for (let r = 0; r < 19; r++) {
            for (let c = 0; c < 25; c++) {
                if (grid[r][c] === 2) { // 2 = water
                    // Create an invisible static sprite with a 32x32 texture to auto-initialize physics body size
                    const block = this.physics.add.staticSprite(c * 32 + 16, r * 32 + 16, 'tile_grass');
                    block.setVisible(false);
                    this.obstacles.add(block);
                }
            }
        }
        this.obstacles.refresh(); // Sync group children with static physics world!
    }

    // ── Interaction scanning every frame ─────────────────────────────────────
    handleInteractions() {
        if (this.ui.isAnyPanelOpen()) {
            this.ui.hidePrompt();
            this.selectorGraphic.setVisible(false);
            return;
        }

        const playerGridX = Math.floor(this.player.x / 32);
        const playerGridY = Math.floor(this.player.y / 32);
        const isNearWater = isAdjacentToWater(playerGridX, playerGridY, this.mapData.grid);
        const activeSlot = inventoryInstance.getActiveSlot();

        // 1. Nearby NPC check (range = 50 px)
        let nearNpc = null;
        this.npcs.forEach(npc => {
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y) < 50)
                nearNpc = npc;
        });

        if (nearNpc) {
            this.selectorGraphic.setPosition(nearNpc.x - 16, nearNpc.y - 16);
            this.selectorGraphic.setVisible(true);
            this.ui.showPrompt(`Trò chuyện với ${nearNpc.npcName}`);
            if (Phaser.Input.Keyboard.JustDown(this.keyE)) nearNpc.interact();
            return;
        }

        // 2. Water refill prompt
        if (isNearWater && activeSlot === 'water_can') {
            this.selectorGraphic.setPosition(playerGridX * 32, playerGridY * 32);
            this.selectorGraphic.setVisible(true);
            const waterAmt = inventoryInstance.getWaterAmount();
            if (waterAmt < 3) {
                this.ui.showPrompt(`múc nước vào Bình tưới 💧`, true);
                if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
                    inventoryInstance.refillWater();
                    soundManager.playSFX('water');
                    SaveSystem.showToast("Đã múc đầy nước vào bình tưới! 💧");
                }
            } else {
                this.ui.showPrompt(`Bình tưới đã đầy nước 💧`, false);
            }
            return;
        }

        // 3. Farm plot check
        const target = this.player.getFacingGridPos();
        const plot = this.farm.getPlotAt(target.gridX, target.gridY);
        if (plot) {
            this.selectorGraphic.setPosition(plot.pixelX, plot.pixelY);
            this.selectorGraphic.setVisible(true);

            if (plot.locked) {
                const nextLockedPlot = this.farm.plots.find(p => p.locked);
                const unlockedCount = this.farm.plots.filter(p => !p.locked).length;
                if (nextLockedPlot && nextLockedPlot.id === plot.id) {
                    const cost = (Math.max(0, unlockedCount - 8) + 1) * 1000;
                    this.ui.showPrompt(`Khu đất khóa: mở rộng tại Cửa hàng (Giá: 🪙${cost}) 🔒`, false);
                } else {
                    this.ui.showPrompt('Khu đất chưa khai hoang 🔒', false);
                }
                return;
            }

            if (plot.cropId === null) {
                if (activeSlot === 'water_can') {
                    this.ui.showPrompt('Hãy chọn hạt giống để gieo trồng 🌱', false);
                } else {
                    const crop = CROPS[activeSlot];
                    const qty  = inventoryInstance.getItemQty(`${activeSlot}_seed`);
                    if (qty > 0) {
                        this.ui.showPrompt(`gieo hạt ${crop.name} ${crop.icon}`, true);
                        if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
                            plot.plant(activeSlot);
                        }
                    } else {
                        this.ui.showPrompt(`gieo hạt ${crop.name} (thiếu hạt giống ❌)`, false);
                    }
                }
            } else if (plot.isDead) {
                const deadElapsed = Math.max(0, Math.ceil(10 - (Date.now() - plot.deadTime) / 1000));
                this.ui.showPrompt(`Cây đã chết 💀 (sẽ biến mất sau ${deadElapsed}s)`, false);
            } else if (plot.stage === 4) {
                const crop = CROPS[plot.cropId];
                this.ui.showPrompt(`thu hoạch ${crop.name} ${crop.icon}`, true);
                if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
                    plot.harvest();
                }
            } else if (!plot.watered) {
                const crop = CROPS[plot.cropId];
                if (activeSlot === 'water_can') {
                    const waterAmt = inventoryInstance.getWaterAmount();
                    if (waterAmt > 0) {
                        this.ui.showPrompt(`tưới nước cho ${crop.name} 💧`, true);
                        if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
                            const success = plot.water();
                            if (success) {
                                inventoryInstance.useWater();
                            }
                        }
                    } else {
                        this.ui.showPrompt(`Bình tưới hết nước (Hãy đi múc nước) ❌`, false);
                    }
                } else {
                    const deadRemaining = Math.max(0, Math.ceil((plot.waterDeadline - Date.now()) / 1000));
                    this.ui.showPrompt(`Cây khô: cần tưới nước gấp! 💧 (Còn ${deadRemaining}s)`, false);
                }
            } else {
                const crop = CROPS[plot.cropId];
                const elapsed = (Date.now() - plot.plantedTime) / 1000;
                const remaining = Math.max(0, Math.ceil(crop.growTime - elapsed));
                this.ui.showPrompt(`${crop.name} đang lớn: còn ${remaining}s ⏳`, false);
            }
            return;
        }

        this.ui.hidePrompt();
        this.selectorGraphic.setVisible(false);
    }

    drawSelectorCorners(graphics) {
        graphics.clear();
        graphics.lineStyle(1.5, 0xfbbd08, 0.9);
        const len = 6;
        
        // Top-left
        graphics.beginPath();
        graphics.moveTo(1, len);
        graphics.lineTo(1, 1);
        graphics.lineTo(len, 1);
        graphics.strokePath();
        
        // Top-right
        graphics.beginPath();
        graphics.moveTo(31 - len, 1);
        graphics.lineTo(31, 1);
        graphics.lineTo(31, len);
        graphics.strokePath();
        
        // Bottom-left
        graphics.beginPath();
        graphics.moveTo(1, 31 - len);
        graphics.lineTo(1, 31);
        graphics.lineTo(len, 31);
        graphics.strokePath();
        
        // Bottom-right
        graphics.beginPath();
        graphics.moveTo(31 - len, 31);
        graphics.lineTo(31, 31);
        graphics.lineTo(31, 31 - len);
        graphics.strokePath();
    }

    triggerMobileInteraction() {
        if (dialogueInstance.isOpen()) {
            dialogueInstance.handleNext();
            return;
        }

        let nearNpc = null;
        this.npcs.forEach(npc => {
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y) < 50)
                nearNpc = npc;
        });

        if (nearNpc) {
            nearNpc.interact();
            return;
        }

        const playerGridX = Math.floor(this.player.x / 32);
        const playerGridY = Math.floor(this.player.y / 32);
        const isNearWater = isAdjacentToWater(playerGridX, playerGridY, this.mapData.grid);
        const activeSlot = inventoryInstance.getActiveSlot();

        // 1. If near water and holding watering can, refill!
        if (isNearWater && activeSlot === 'water_can') {
            const waterAmt = inventoryInstance.getWaterAmount();
            if (waterAmt < 3) {
                inventoryInstance.refillWater();
                soundManager.playSFX('water');
                SaveSystem.showToast("Đã múc đầy nước vào bình tưới! 💧");
            }
            return;
        }

        // 2. Interacting with farm plot
        const target = this.player.getFacingGridPos();
        const plot = this.farm.getPlotAt(target.gridX, target.gridY);
        if (plot && !plot.locked) {
            if (plot.cropId === null) {
                if (activeSlot !== 'water_can') {
                    plot.plant(activeSlot);
                }
            } else if (plot.isDead) {
                // Do nothing for dead crop
            } else if (plot.stage === 4) {
                plot.harvest();
            } else if (!plot.watered && activeSlot === 'water_can') {
                const waterAmt = inventoryInstance.getWaterAmount();
                if (waterAmt > 0) {
                    const success = plot.water();
                    if (success) {
                        inventoryInstance.useWater();
                    }
                } else {
                    SaveSystem.showToast("Bình tưới hết nước! Hãy đi múc nước 💧");
                }
            }
        }
    }
}

// ── Phaser config ─────────────────────────────────────────────────────────────
const isMobileDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

const config = {
    type:   Phaser.AUTO,
    width:  800,
    height: 608,
    parent: 'game-container',
    backgroundColor: '#4a7a2a',   // Rich grass green - fills transparent areas
    pixelArt: true,
    roundPixels: true,
    scale: {
        mode:       isMobileDevice ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width:      800,
        height:     608
    },
    physics: {
        default: 'arcade',
        arcade:  { gravity: { y: 0 }, debug: false }
    },
    scene: [MainScene]
};

const game = new Phaser.Game(config);
export default game;

