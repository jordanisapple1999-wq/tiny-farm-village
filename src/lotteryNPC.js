// Tiny Farm Village - Lottery NPC & Stall
import { NPC } from './npc.js';
import { MapManager } from './map.js';

export class LotteryNPC extends NPC {
    constructor(scene, x, y, textureKey) {
        super(scene, x, y, textureKey, 'lottery');
        
        this.npcName = 'Người bán vé số';
        this.npcAvatar = '🎟️';
        this.dialogueNodes = [
            {
                speaker: this.npcName,
                avatar: this.npcAvatar,
                text: 'Chào cháu! Hôm nay cháu có muốn thử vận may với trò chơi Xổ số Kiến thiết không?'
            },
            {
                speaker: this.npcName,
                avatar: this.npcAvatar,
                text: 'Một tấm vé chỉ 100 vàng nhưng cơ hội trúng Giải Đặc Biệt lên đến 10.000 vàng! Hệ thống quay số tự động 3 phút một lần.',
                action: () => {
                    if (window._lotteryUI) {
                        window._lotteryUI.openLottery();
                    }
                }
            }
        ];
    }
}

export class LotteryManager {
    static spawnLotteryNPC(scene) {
        // Helper to pick AI image or canvas fallback
        const texKey = (ai, fb) => MapManager.getTexKey(scene, ai, fb);

        // ── Lottery Stall (replacing the well, centered at col 12 row 4 center) ──
        // Col 11: 352, Col 13: 416, Center is 400.
        // Y = 128 (row 4 center)
        const stallLotteryKey = texKey('img_stall_lottery', 'stall_lottery_canvas');
        const stallLottery = scene.physics.add.staticSprite(400, 128, stallLotteryKey);

        if (stallLotteryKey === 'img_stall_lottery') {
            stallLottery.setScale(0.094); // consistent with other stalls
            stallLottery.refreshBody();
        }
        
        // World-pixel hitbox: counter/table base of the stall
        stallLottery.body.setSize(88, 32).setOffset(4, 32);
        stallLottery.refreshBody();
        stallLottery.setDepth(128);

        // NPC in front of stall (y = 168)
        const lotteryNPCKey = texKey('img_lottery', 'char_lottery_canvas');
        const npc = new LotteryNPC(scene, 400, 168, lotteryNPCKey);
        
        if (lotteryNPCKey === 'img_lottery') {
            npc.setScale(0.096);
        }
        npc.setDepth(168);

        // Signboard label for Lottery NPC
        const sign = MapManager.createWoodenSign(scene, 400, 104, '🎟️ XỔ SỐ', 'board');
        sign.setDepth(stallLottery.depth + 1);

        return { npc, collidable: stallLottery };
    }
}
