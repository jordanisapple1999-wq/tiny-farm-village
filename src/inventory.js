// Tiny Farm Village - Inventory Management

import { CROPS } from './crop.js';

export class Inventory {
    constructor() {
        this.coins = 500; // Start with 500 coins as requested
        
        // Items map: key -> quantity (Start with 2 seeds of each type)
        this.items = {
            'carrot_seed': 2,
            'tomato_seed': 2,
            'pumpkin_seed': 2,
            'carrot_harvested': 0,
            'tomato_harvested': 0,
            'pumpkin_harvested': 0
        };

        // Track selected seed type for planting (default: carrot)
        this.selectedSeed = 'carrot';

        // Watering can charges (0 to 3)
        this.waterAmount = 0;

        // Active hotbar slot: 'carrot', 'tomato', 'pumpkin', 'water_can'
        this.activeHotbarSlot = 'carrot';
    }

    getCoins() {
        return this.coins;
    }

    addCoins(amount) {
        this.coins += amount;
        this.triggerUpdate();
    }

    spendCoins(amount) {
        if (this.coins >= amount) {
            this.coins -= amount;
            this.triggerUpdate();
            return true;
        }
        return false;
    }

    getItemQty(itemKey) {
        return this.items[itemKey] || 0;
    }

    addItem(itemKey, qty = 1) {
        if (!this.items[itemKey]) {
            this.items[itemKey] = 0;
        }
        this.items[itemKey] += qty;
        this.triggerUpdate();
    }

    removeItem(itemKey, qty = 1) {
        const current = this.getItemQty(itemKey);
        if (current >= qty) {
            this.items[itemKey] -= qty;
            this.triggerUpdate();
            return true;
        }
        return false;
    }

    getSelectedSeed() {
        return this.selectedSeed;
    }

    setSelectedSeed(cropId) {
        if (CROPS[cropId]) {
            this.selectedSeed = cropId;
            this.activeHotbarSlot = cropId;
            this.triggerUpdate();
        }
    }

    getActiveSlot() {
        return this.activeHotbarSlot;
    }

    setActiveSlot(slot) {
        this.activeHotbarSlot = slot;
        if (slot === 'carrot' || slot === 'tomato' || slot === 'pumpkin') {
            this.selectedSeed = slot;
        }
        this.triggerUpdate();
    }

    getWaterAmount() {
        return this.waterAmount || 0;
    }

    useWater() {
        if (this.waterAmount > 0) {
            this.waterAmount--;
            this.triggerUpdate();
            return true;
        }
        return false;
    }

    refillWater() {
        this.waterAmount = 3;
        this.triggerUpdate();
    }

    // Helper to format inventory for 16 slots UI display
    getSlots() {
        const slots = [];
        
        // Define display list order
        const displayItems = [
            { key: 'carrot_seed', name: 'Hạt Cà rốt', icon: '🥕🌱', type: 'seed', cropId: 'carrot' },
            { key: 'tomato_seed', name: 'Hạt Cà chua', icon: '🍅🌱', type: 'seed', cropId: 'tomato' },
            { key: 'pumpkin_seed', name: 'Hạt Bí ngô', icon: '🎃🌱', type: 'seed', cropId: 'pumpkin' },
            { key: 'carrot_harvested', name: 'Củ Cà rốt', icon: '🥕', type: 'crop', cropId: 'carrot' },
            { key: 'tomato_harvested', name: 'Quả Cà chua', icon: '🍅', type: 'crop', cropId: 'tomato' },
            { key: 'pumpkin_harvested', name: 'Quả Bí ngô', icon: '🎃', type: 'crop', cropId: 'pumpkin' }
        ];

        // Add items with positive quantity
        displayItems.forEach(item => {
            const qty = this.getItemQty(item.key);
            if (qty > 0) {
                slots.push({
                    ...item,
                    qty
                });
            }
        });

        // Fill remaining slots up to 16
        while (slots.length < 16) {
            slots.push({ empty: true });
        }

        return slots;
    }

    // Connect to external listener (like UI updates)
    registerUpdateCallback(callback) {
        this.updateCallback = callback;
    }

    triggerUpdate() {
        if (this.updateCallback) {
            this.updateCallback(this);
        }
    }

    // State Serialization
    toJSON() {
        return {
            coins: this.coins,
            items: this.items,
            selectedSeed: this.selectedSeed,
            waterAmount: this.waterAmount,
            activeHotbarSlot: this.activeHotbarSlot
        };
    }

    fromJSON(data) {
        if (!data) return;
        if (typeof data.coins === 'number') this.coins = data.coins;
        if (data.items) this.items = { ...this.items, ...data.items };
        if (data.selectedSeed) this.selectedSeed = data.selectedSeed;
        if (data.waterAmount !== undefined) this.waterAmount = data.waterAmount;
        if (data.activeHotbarSlot !== undefined) this.activeHotbarSlot = data.activeHotbarSlot;
        this.triggerUpdate();
    }
}
export const inventoryInstance = new Inventory();
window._inventory = inventoryInstance;
