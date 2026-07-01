// Tiny Farm Village - Non-Player Characters (NPCs)

import { dialogueInstance } from './dialogue.js';
import { shopInstance } from './shop.js';
import { MapManager } from './map.js';
import { CROPS } from './crop.js';

export class NPC extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, textureKey, type) {
        super(scene, x, y, textureKey);
        
        this.type = type; // 'seller' or 'buyer'
        this.scene = scene;

        // Add to scene and physics
        scene.add.existing(this);
        scene.physics.add.existing(this, true); // Static body

        this.body.setSize(30, 30);
        
        // Custom name and dialogue nodes
        if (type === 'seller') {
            this.npcName = 'Người bán hạt giống';
            this.npcAvatar = '👨‍🌾';
            this.dialogueNodes = [
                {
                    speaker: this.npcName,
                    avatar: this.npcAvatar,
                    text: 'Xin chào nhà nông! Bạn cần tìm hạt giống rau củ tươi ngon à?'
                },
                {
                    speaker: this.npcName,
                    avatar: this.npcAvatar,
                    text: 'Tôi có hạt giống Cà rốt ngọt, Cà chua mọng nước và cả Bí ngô khổng lồ nữa đấy!',
                    action: () => shopInstance.openSeedShop()
                }
            ];
        } else if (type === 'buyer') {
            this.npcName = 'Người mua nông sản';
            this.npcAvatar = '🤠';
            this.dialogueNodes = [
                {
                    speaker: this.npcName,
                    avatar: this.npcAvatar,
                    text: 'Ồ chào cậu! Hôm nay thu hoạch có khá khẩm không?'
                },
                {
                    speaker: this.npcName,
                    avatar: this.npcAvatar,
                    text: 'Hãy đem nông sản đã thu hoạch đến đây, tôi sẽ thu mua lại với giá cực kỳ sòng phẳng!',
                    action: () => shopInstance.openSellMenu()
                }
            ];
        } else if (type === 'helper') {
            this.npcName = 'Nê lộ';
            this.npcAvatar = '🤖';
            this.state = 'idle'; // 'idle', 'walking_to_plot', 'working', 'walking_home'
            this.homeX = x;
            this.homeY = y;

            this.dialogueNodes = [
                {
                    speaker: this.npcName,
                    avatar: this.npcAvatar,
                    text: 'Xin chào chủ nhân! Tôi là Nê lộ, người giúp việc nông trại.'
                },
                {
                    speaker: this.npcName,
                    avatar: this.npcAvatar,
                    text: 'Tôi có thể tự động mua hạt giống, trồng trọt, tưới nước và thu hoạch nông sản giúp bạn. Bạn có muốn thuê tôi không?',
                    action: () => window._uiController.openHelperModal()
                }
            ];

            // Permanent warm golden name tag above head
            this.nameLabel = scene.add.text(x, y - 26, '🤖 Nê Lộ', {
                fontFamily: "'Nunito', 'Be Vietnam Pro', sans-serif",
                fontSize: '9px',
                fontStyle: 'bold',
                color: '#ffd875',
                stroke: '#3a2212',
                strokeThickness: 3,
                align: 'center'
            });
            this.nameLabel.setOrigin(0.5);
            this.nameLabel.setDepth(y + 10);

            // Shouting bubble speech every 15s
            scene.time.addEvent({
                delay: 15000,
                callback: () => {
                    if (dialogueInstance && !dialogueInstance.isOpen()) {
                        const helperOverlay = document.getElementById('helper-overlay');
                        if (helperOverlay && helperOverlay.classList.contains('hidden')) {
                            this.showSpeechBubble("Việc gì khó có Nê Lộ tui đây lo!");
                        }
                    }
                },
                loop: true
            });
        }
    }

    interact() {
        // Start conversation overlay
        dialogueInstance.startDialogue(this.dialogueNodes, () => {
            // Callback when dialogue completes
            const lastNode = this.dialogueNodes[this.dialogueNodes.length - 1];
            if (lastNode && lastNode.action) {
                lastNode.action();
            }
        });
    }

    update() {
        if (this.nameLabel) {
            this.nameLabel.setPosition(this.x, this.y - 26);
        }
        if (this.bubble) {
            this.bubble.setPosition(this.x, this.y - 36);
        }
        if (this.bubblePointer) {
            this.bubblePointer.setPosition(this.x, this.y - 36);
        }
    }

    executeTask(task) {
        this.state = 'walking_to_plot';
        const targetX = task.plot.pixelX + 16;
        const targetY = task.plot.pixelY + 16;

        this.walkTo(targetX, targetY, () => {
            this.state = 'working';
            // Play mechanical squishing animation
            this.workTween = this.scene.tweens.add({
                targets: this,
                scaleX: 0.055,
                scaleY: 0.038,
                yoyo: true,
                duration: 100,
                repeat: 1,
                onComplete: () => {
                    // Execute action
                    if (task.action === 'harvest') {
                        task.plot.harvest(true);
                    } else if (task.action === 'water') {
                        task.plot.water(true);
                    } else if (task.action === 'plant') {
                        task.plot.plant(task.cropId, true);
                    }

                    // Look if there are other tasks immediately (with 100ms async delay to prevent thread freezing)
                    const nextTask = this.scene.findNextHelperTask();
                    if (nextTask) {
                        this.scene.time.delayedCall(100, () => {
                            if (this.active && this.scene) {
                                this.executeTask(nextTask);
                            }
                        });
                    } else {
                        this.walkHome();
                    }
                }
            });
        });
    }

    walkTo(targetX, targetY, onComplete) {
        this.stopAnimations();
        
        // Calculate duration based on distance (speed = 350 px/sec)
        const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
        const duration = (dist / 350) * 1000;

        // Walk bobbing animation
        this.walkTween = this.scene.tweens.add({
            targets: this,
            scaleY: 0.042,
            yoyo: true,
            duration: 85,
            repeat: -1
        });

        // Move tween
        this.moveTween = this.scene.tweens.add({
            targets: this,
            x: targetX,
            y: targetY,
            duration: duration,
            onUpdate: () => {
                this.setDepth(this.y);
            },
            onComplete: () => {
                this.stopAnimations();
                if (onComplete) onComplete();
            }
        });
    }

    walkHome() {
        this.state = 'walking_home';
        this.walkTo(this.homeX, this.homeY, () => {
            this.state = 'idle';
        });
    }

    stopAnimations() {
        if (this.walkTween) {
            this.walkTween.stop();
            this.walkTween = null;
        }
        if (this.workTween) {
            this.workTween.stop();
            this.workTween = null;
        }
        if (this.moveTween) {
            this.moveTween.stop();
            this.moveTween = null;
        }
        this.setScale(0.047);
    }

    showSpeechBubble(text) {
        if (this.bubble) {
            this.bubble.destroy();
        }
        if (this.bubblePointer) {
            this.bubblePointer.destroy();
        }

        const bx = this.x;
        const by = this.y - 36;

        this.bubble = this.scene.add.text(bx, by, text, {
            fontFamily: "'Nunito', 'Be Vietnam Pro', sans-serif",
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#fff6eb',
            backgroundColor: '#8d5c38',
            stroke: '#3a2212',
            strokeThickness: 2,
            padding: { x: 5, y: 3 },
            align: 'center',
            wordWrap: { width: 140 }
        });
        this.bubble.setOrigin(0.5, 1);
        this.bubble.setDepth(this.y + 20);

        this.bubblePointer = this.scene.add.graphics();
        this.bubblePointer.fillStyle(0x8d5c38, 1);
        this.bubblePointer.lineStyle(1.5, 0x3a2212, 1);
        this.bubblePointer.beginPath();
        this.bubblePointer.moveTo(-4, 0);
        this.bubblePointer.lineTo(4, 0);
        this.bubblePointer.lineTo(0, 4);
        this.bubblePointer.closePath();
        this.bubblePointer.fillPath();
        this.bubblePointer.strokePath();
        this.bubblePointer.setDepth(this.y + 21);
        this.bubblePointer.setPosition(bx, by);

        this.bubble.setScale(0.8);
        this.scene.tweens.add({
            targets: this.bubble,
            scaleX: 1,
            scaleY: 1,
            duration: 150,
            ease: 'Back.easeOut'
        });

        this.scene.time.delayedCall(4000, () => {
            if (this.bubble && this.bubble.active) {
                this.scene.tweens.add({
                    targets: [this.bubble, this.bubblePointer],
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        if (this.bubble) this.bubble.destroy();
                        if (this.bubblePointer) this.bubblePointer.destroy();
                    }
                });
            } else {
                if (this.bubblePointer) this.bubblePointer.destroy();
            }
        });
    }
}

export class NpcManager {
    static spawnNPCs(scene) {
        const npcs = [];

        // Helper to pick AI image or canvas fallback
        const texKey = (ai, fb) => MapManager.getTexKey(scene, ai, fb);

        // ── Seed Seller Stall (cols 6-8, row 2-4, centred at col 7 row 3) ──
        const stallSeedsKey = texKey('img_stall_seeds', 'stall_seeds_canvas');
        const stallSeeds = scene.physics.add.staticSprite(240, 128, stallSeedsKey);
        // Scale AI stall (1024px) to about 96px wide, and adjust physics body
        if (stallSeedsKey === 'img_stall_seeds') {
            stallSeeds.setScale(0.094);
            stallSeeds.refreshBody();
        }
        // World-pixel hitbox: counter/table base of the stall
        stallSeeds.body.setSize(88, 32).setOffset(4, 32);
        stallSeeds.refreshBody();
        stallSeeds.setDepth(128);

        // Seller NPC in front of stall counter
        const sellerKey = texKey('img_seller', 'char_seller_canvas');
        const seller = new NPC(scene, 240, 168, sellerKey, 'seller');
        if (sellerKey === 'img_seller') seller.setScale(0.047);
        seller.setDepth(168);
        npcs.push(seller);

        // ── Crop Buyer Stall (cols 16-18, row 2-4, centred at col 17 row 3) ──
        const stallCropsKey = texKey('img_stall_crops', 'stall_crops_canvas');
        const stallCrops = scene.physics.add.staticSprite(560, 128, stallCropsKey);
        // Scale AI stall to about 96px wide (scale = 0.192), and adjust physics body
        if (stallCropsKey === 'img_stall_crops') {
            stallCrops.setScale(0.192);
            stallCrops.refreshBody();
        }
        // World-pixel hitbox: counter/table base of the stall
        stallCrops.body.setSize(88, 32).setOffset(4, 32);
        stallCrops.refreshBody();
        stallCrops.setDepth(128);

        // Buyer NPC in front of stall counter
        const buyerKey = texKey('img_buyer', 'char_buyer_canvas');
        const buyer = new NPC(scene, 560, 168, buyerKey, 'buyer');
        if (buyerKey === 'img_buyer') buyer.setScale(0.047);
        buyer.setDepth(168);
        npcs.push(buyer);

        // Helper NPC next to Farming Signboard (col 10, row 11)
        const helperKey = texKey('img_helper', 'char_helper_canvas');
        const helper = new NPC(scene, 10 * 32 + 16, 11 * 32 + 16, helperKey, 'helper');
        if (helperKey === 'img_helper') helper.setScale(0.047);
        helper.setDepth(11 * 32 + 16);
        npcs.push(helper);

        // ── Signboard name labels for NPCs/stalls ──
        // Mount them as flat wooden banners directly on the stall headers (Y = 104)
        // Set depth to stall.depth + 1 (129) so they overlay the stall sprites correctly
        const seedSign = MapManager.createWoodenSign(scene, 240, 104, '🏪 HẠT GIỐNG', 'board');
        seedSign.setDepth(stallSeeds.depth + 1);

        const cropSign = MapManager.createWoodenSign(scene, 560, 104, '⚖️ THU MUA', 'board');
        cropSign.setDepth(stallCrops.depth + 1);

        return { npcs, collidables: [stallSeeds, stallCrops] };
    }
}
