// Tiny Farm Village - Shop Transactions & UI binding

import { CROPS } from './crop.js';
import { inventoryInstance } from './inventory.js';
import { SaveSystem } from './save.js';
import { soundManager } from './audio.js';

export class ShopController {
    constructor() {
        this.shopOverlay = document.getElementById('shop-overlay');
        this.sellOverlay = document.getElementById('sell-overlay');
        
        this.shopItemsContainer = document.getElementById('shop-items-container');
        this.sellItemsContainer = document.getElementById('sell-items-container');

        this.btnCloseShop = document.getElementById('btn-close-shop');
        this.btnCloseSell = document.getElementById('btn-close-sell');
        this.btnSellAll = document.getElementById('btn-sell-all');

        this.shopCoinsIndicator = document.getElementById('shop-player-coins');
        this.sellCoinsIndicator = document.getElementById('sell-player-coins');

        this.initEvents();
    }

    initEvents() {
        if (this.btnCloseShop) {
            this.btnCloseShop.addEventListener('click', () => this.closeShop());
        }
        if (this.btnCloseSell) {
            this.btnCloseSell.addEventListener('click', () => this.closeSell());
        }
        if (this.btnSellAll) {
            this.btnSellAll.addEventListener('click', () => this.sellAllCrops());
        }
        this.initNumpad();
    }

    initNumpad() {
        this.numpadOverlay = document.getElementById('numpad-overlay');
        this.numpadDisplayVal = document.getElementById('numpad-display-val');
        this.btnNumpadCancel = document.getElementById('btn-numpad-cancel');
        this.btnNumpadOk = document.getElementById('btn-numpad-ok');
        this.activeNumpadTarget = null;

        if (!this.numpadOverlay) return;

        // Bind keyboard button clicks
        const keys = this.numpadOverlay.querySelectorAll('.numpad-key');
        keys.forEach(key => {
            key.addEventListener('click', () => {
                soundManager.playSFX('click');
                const val = key.getAttribute('data-val');
                const action = key.getAttribute('data-action');

                let current = this.numpadDisplayVal.innerText;

                if (val !== null) {
                    if (current === '0' || current === '') {
                        current = val;
                    } else if (current.length < 2) {
                        current += val;
                    }
                } else if (action === 'clear') {
                    current = '0';
                } else if (action === 'backspace') {
                    if (current.length > 1) {
                        current = current.slice(0, -1);
                    } else {
                        current = '0';
                    }
                }

                // Keep it between 0 and 99 visually
                let num = parseInt(current, 10) || 0;
                if (num > 99) num = 99;
                
                this.numpadDisplayVal.innerText = num.toString();
            });
        });

        // Cancel button
        if (this.btnNumpadCancel) {
            this.btnNumpadCancel.addEventListener('click', () => {
                soundManager.playSFX('click');
                this.numpadOverlay.classList.add('hidden');
            });
        }

        // Confirm button
        if (this.btnNumpadOk) {
            this.btnNumpadOk.addEventListener('click', () => {
                soundManager.playSFX('click');
                let finalVal = parseInt(this.numpadDisplayVal.innerText, 10) || 1;
                if (finalVal < 1) finalVal = 1;
                if (finalVal > 99) finalVal = 99;

                if (this.activeNumpadTarget) {
                    this.activeNumpadTarget.innerText = finalVal.toString();
                    
                    // Update total price display on confirm
                    const idParts = this.activeNumpadTarget.id.split('-');
                    const cropId = idParts[idParts.length - 1];
                    const crop = CROPS[cropId];
                    if (crop) {
                        const priceSpan = document.getElementById(`price-val-${cropId}`);
                        if (priceSpan) {
                            priceSpan.innerHTML = `<span class="gold-coin-icon"></span>${finalVal * crop.seedCost}`;
                        }
                    }
                }
                this.numpadOverlay.classList.add('hidden');
            });
        }
    }

    openNumpad(targetSpan) {
        this.activeNumpadTarget = targetSpan;
        if (this.numpadDisplayVal) {
            this.numpadDisplayVal.innerText = targetSpan.innerText;
        }
        if (this.numpadOverlay) {
            this.numpadOverlay.classList.remove('hidden');
        }
    }

    // --- SEED SHOP ---
    openSeedShop() {
        this.shopOverlay.classList.remove('hidden');
        this.renderSeedShop();
        if (window._phaserScene && window._phaserScene.input && window._phaserScene.input.keyboard) {
            window._phaserScene.input.keyboard.enabled = false;
        }
    }

    closeShop() {
        this.shopOverlay.classList.add('hidden');
        this.btnCloseShop.blur();
        if (window._phaserScene && window._phaserScene.input && window._phaserScene.input.keyboard) {
            window._phaserScene.input.keyboard.enabled = true;
        }
    }

    renderSeedShop() {
        this.shopCoinsIndicator.innerText = inventoryInstance.getCoins();
        this.shopItemsContainer.innerHTML = '';

        Object.values(CROPS).forEach(crop => {
            const row = document.createElement('div');
            row.className = 'shop-item-row';
            
            const ownedQty = inventoryInstance.getItemQty(`${crop.id}_seed`);

            row.innerHTML = `
                <div class="shop-item-info">
                    <span class="shop-item-icon">${crop.icon}</span>
                    <div class="shop-item-details">
                        <span class="shop-item-name">Hạt giống ${crop.name}</span>
                        <span class="shop-item-sub">Thu hoạch sau: ${crop.growTime} giây | Bán lại: <span class="gold-coin-icon"></span>${crop.sellPrice}</span>
                        <span class="shop-item-owned">Đang có trong túi: <strong>${ownedQty}</strong> hạt</span>
                    </div>
                </div>
                <div class="shop-item-actions">
                    <div class="shop-qty-selector">
                        <button class="qty-btn dec-btn" data-crop-id="${crop.id}">-</button>
                        <span class="shop-qty-value" id="qty-val-${crop.id}">1</span>
                        <button class="qty-btn inc-btn" data-crop-id="${crop.id}">+</button>
                    </div>
                    <span class="shop-item-price" id="price-val-${crop.id}"><span class="gold-coin-icon"></span>${crop.seedCost}</span>
                    <button class="cozy-btn buy-btn" data-crop-id="${crop.id}">Mua</button>
                </div>
            `;

            // Bind click handler for Buy Button
            const btn = row.querySelector('.buy-btn');
            const decBtn = row.querySelector('.dec-btn');
            const incBtn = row.querySelector('.inc-btn');
            const qtyVal = row.querySelector('.shop-qty-value');

            // Total price helper
            const updateTotalPrice = (qty) => {
                const total = qty * crop.seedCost;
                const priceSpan = row.querySelector(`#price-val-${crop.id}`);
                if (priceSpan) {
                    priceSpan.innerHTML = `<span class="gold-coin-icon"></span>${total}`;
                }
            };

            // Make the number clickable to open virtual numpad
            qtyVal.style.cursor = 'pointer';
            qtyVal.addEventListener('click', () => {
                this.openNumpad(qtyVal);
            });

            decBtn.addEventListener('click', () => {
                let current = parseInt(qtyVal.innerText, 10) || 1;
                if (current > 1) {
                    qtyVal.innerText = current - 1;
                    updateTotalPrice(current - 1);
                    soundManager.playSFX('click');
                }
            });

            incBtn.addEventListener('click', () => {
                let current = parseInt(qtyVal.innerText, 10) || 1;
                if (current < 99) {
                    qtyVal.innerText = current + 1;
                    updateTotalPrice(current + 1);
                    soundManager.playSFX('click');
                }
            });

            btn.addEventListener('click', () => {
                const qty = parseInt(qtyVal.innerText, 10) || 1;
                this.buySeed(crop.id, qty);
                qtyVal.innerText = 1;
                updateTotalPrice(1);
            });

            this.shopItemsContainer.appendChild(row);
        });

        // Add land expansion purchase option if there are locked plots
        const farm = window._phaserScene ? window._phaserScene.farm : null;
        if (farm) {
            const unlockedCount = farm.plots.filter(p => !p.locked).length;
            const nextLocked = farm.plots.find(p => p.locked);
            if (nextLocked) {
                const cost = (Math.max(0, unlockedCount - 8) + 1) * 1000;
                
                const row = document.createElement('div');
                row.className = 'shop-item-row';
                row.style.border = '2px dashed var(--wood-accent)';
                row.innerHTML = `
                    <div class="shop-item-info">
                        <span class="shop-item-icon">🌾</span>
                        <div class="shop-item-details">
                            <span class="shop-item-name">Mở rộng đất trồng (Ô thứ ${Math.max(0, unlockedCount - 8) + 1})</span>
                            <span class="shop-item-sub">Khai hoang thêm đất để trồng trọt nhiều hơn!</span>
                        </div>
                    </div>
                    <div class="shop-item-actions">
                        <span class="shop-item-price"><span class="gold-coin-icon"></span>${cost}</span>
                        <button class="cozy-btn green-btn buy-expansion-btn">Khai hoang</button>
                    </div>
                `;

                const btn = row.querySelector('.buy-expansion-btn');
                btn.addEventListener('click', () => this.buyPlotExpansion(cost));
                this.shopItemsContainer.appendChild(row);
            }
        }
    }

    buySeed(cropId, quantity = 1) {
        const crop = CROPS[cropId];
        if (!crop) return;

        const totalCost = crop.seedCost * quantity;
        if (inventoryInstance.getCoins() >= totalCost) {
            inventoryInstance.spendCoins(totalCost);
            inventoryInstance.addItem(`${cropId}_seed`, quantity);
            soundManager.playSFX('coin');
            SaveSystem.showToast(`Đã mua ${quantity} Hạt giống ${crop.name}! 🥕`);
            this.renderSeedShop();
        } else {
            soundManager.playSFX('error');
            SaveSystem.showToast(`Bạn không đủ tiền để mua hạt giống! 🪙❌`);
        }
    }

    buyPlotExpansion(cost) {
        if (inventoryInstance.getCoins() >= cost) {
            const farm = window._phaserScene ? window._phaserScene.farm : null;
            if (farm && farm.unlockNextPlot()) {
                inventoryInstance.spendCoins(cost);
                soundManager.playSFX('save');
                SaveSystem.showToast(`Khai hoang đất thành công! 🌾🎉`);
                this.renderSeedShop();
                if (window._phaserScene.ui) {
                    window._phaserScene.ui.syncHUD();
                }
                // Save game immediately to persist the newly unlocked land
                SaveSystem.saveGame(window._phaserScene.player, farm);
            } else {
                soundManager.playSFX('error');
                SaveSystem.showToast(`Có lỗi xảy ra hoặc đã mở khóa hết đất! ❌`);
            }
        } else {
            soundManager.playSFX('error');
            SaveSystem.showToast(`Bạn không đủ tiền vàng để mở rộng đất! 🪙❌`);
        }
    }

    // --- CROP SELL MENU ---
    openSellMenu() {
        this.sellOverlay.classList.remove('hidden');
        this.renderSellMenu();
        if (window._phaserScene && window._phaserScene.input && window._phaserScene.input.keyboard) {
            window._phaserScene.input.keyboard.enabled = false;
        }
    }

    closeSell() {
        this.sellOverlay.classList.add('hidden');
        this.btnCloseSell.blur();
        if (window._phaserScene && window._phaserScene.input && window._phaserScene.input.keyboard) {
            window._phaserScene.input.keyboard.enabled = true;
        }
    }

    renderSellMenu() {
        this.sellCoinsIndicator.innerText = inventoryInstance.getCoins();
        this.sellItemsContainer.innerHTML = '';

        let totalCropsToSell = 0;

        Object.values(CROPS).forEach(crop => {
            const cropKey = `${crop.id}_harvested`;
            const quantity = inventoryInstance.getItemQty(cropKey);
            totalCropsToSell += quantity;

            const row = document.createElement('div');
            row.className = 'shop-item-row';
            row.innerHTML = `
                <div class="shop-item-info">
                    <span class="shop-item-icon">${crop.icon}</span>
                    <div class="shop-item-details">
                        <span class="shop-item-name">${crop.name} tươi</span>
                        <span class="shop-item-sub">Bạn có: ${quantity} đơn vị</span>
                    </div>
                </div>
                <div class="shop-item-actions">
                    <span class="shop-item-price"><span class="gold-coin-icon"></span>${crop.sellPrice} / cái</span>
                    <button class="cozy-btn green-btn sell-btn" ${quantity <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} data-crop-id="${crop.id}">Bán (1)</button>
                    <button class="cozy-btn orange-btn sell-all-type-btn" ${quantity <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} data-crop-id="${crop.id}">Bán hết</button>
                </div>
            `;

            // Bind click handlers
            const btn = row.querySelector('.sell-btn');
            const btnAll = row.querySelector('.sell-all-type-btn');
            if (quantity > 0) {
                btn.addEventListener('click', () => this.sellCrop(crop.id));
                btnAll.addEventListener('click', () => this.sellAllOfType(crop.id));
            }

            this.sellItemsContainer.appendChild(row);
        });

        // Toggle Sell All Button
        if (totalCropsToSell <= 0) {
            this.btnSellAll.setAttribute('disabled', 'true');
            this.btnSellAll.style.opacity = '0.5';
            this.btnSellAll.style.cursor = 'not-allowed';
        } else {
            this.btnSellAll.removeAttribute('disabled');
            this.btnSellAll.style.opacity = '1';
            this.btnSellAll.style.cursor = 'pointer';
        }
    }

    sellCrop(cropId) {
        const crop = CROPS[cropId];
        if (!crop) return;

        const cropKey = `${crop.id}_harvested`;
        if (inventoryInstance.getItemQty(cropKey) > 0) {
            inventoryInstance.removeItem(cropKey, 1);
            inventoryInstance.addCoins(crop.sellPrice);
            soundManager.playSFX('coin');
            SaveSystem.showToast(`Đã bán 1 ${crop.name}! Thu về 🪙${crop.sellPrice}`);
            this.renderSellMenu();
        }
    }

    sellAllOfType(cropId) {
        const crop = CROPS[cropId];
        if (!crop) return;

        const cropKey = `${crop.id}_harvested`;
        const quantity = inventoryInstance.getItemQty(cropKey);
        if (quantity > 0) {
            inventoryInstance.removeItem(cropKey, quantity);
            const earn = crop.sellPrice * quantity;
            inventoryInstance.addCoins(earn);
            soundManager.playSFX('coin');
            SaveSystem.showToast(`Đã bán toàn bộ ${quantity} ${crop.name} tươi! Thu về 🪙${earn}`);
            this.renderSellMenu();
        }
    }

    sellAllCrops() {
        let totalEarned = 0;
        let soldAny = false;

        Object.values(CROPS).forEach(crop => {
            const cropKey = `${crop.id}_harvested`;
            const quantity = inventoryInstance.getItemQty(cropKey);
            if (quantity > 0) {
                inventoryInstance.removeItem(cropKey, quantity);
                const earn = crop.sellPrice * quantity;
                inventoryInstance.addCoins(earn);
                totalEarned += earn;
                soldAny = true;
            }
        });

        if (soldAny) {
            soundManager.playSFX('coin');
            SaveSystem.showToast(`Đã bán toàn bộ nông sản! Kiếm được 🪙${totalEarned}`);
            this.renderSellMenu();
        } else {
            soundManager.playSFX('error');
            SaveSystem.showToast(`Bạn không có nông sản nào để bán! 🌾❌`);
        }
    }

    isOpen() {
        return !this.shopOverlay.classList.contains('hidden') || !this.sellOverlay.classList.contains('hidden');
    }
}

export const shopInstance = new ShopController();
