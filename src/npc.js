// Tiny Farm Village - Non-Player Characters (NPCs)

import { dialogueInstance } from './dialogue.js';
import { shopInstance } from './shop.js';
import { MapManager } from './map.js';

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
        } else {
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
