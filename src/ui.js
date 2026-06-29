// Tiny Farm Village - UI Overlay Binder & Controller

import { CROPS } from './crop.js';
import { inventoryInstance } from './inventory.js';
import { SaveSystem } from './save.js';
import { dialogueInstance } from './dialogue.js';
import { shopInstance } from './shop.js';
import { lotteryUIInstance } from './lotteryUI.js';
import { 
    auth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    initializeFirebase
} from './firebase.js';
import { isFirebaseConfigured, getFirebaseConfig } from './firebaseConfig.js';

export class UIController {
    constructor(scene) {
        this.scene = scene;

        // HUD Elements
        this.hudCoins = document.getElementById('hud-coins-value');
        this.hudSeedName = document.getElementById('hud-selected-seed-name');
        this.hudSeedCount = document.getElementById('hud-selected-seed-count');
        this.hudToolName = document.getElementById('hud-selected-tool-name');

        // Interaction Prompt
        this.interactionPrompt = document.getElementById('interaction-prompt');

        // Modals / Panels
        this.inventoryOverlay = document.getElementById('inventory-overlay');
        this.btnOpenInventory = document.getElementById('btn-open-inventory');
        this.btnCloseInventory = document.getElementById('btn-close-inventory');
        this.inventoryGrid = document.getElementById('inventory-grid-container');

        this.btnSave = document.getElementById('btn-save-game');
        this.btnReset = document.getElementById('btn-reset-game');

        // Auth Overlay Panels
        this.btnOpenAuth = document.getElementById('btn-open-auth');
        this.btnCloseAuth = document.getElementById('btn-close-auth');
        this.authOverlay = document.getElementById('auth-overlay');

        this.initEvents();
        this.initAuth();
        this.syncHUD();
        this.renderInventory();

        // Register inventory updates listener
        inventoryInstance.registerUpdateCallback(() => {
            this.syncHUD();
            this.renderInventory();
        });
    }

    initEvents() {
        // Toggle Inventory Button
        if (this.btnOpenInventory) {
            this.btnOpenInventory.addEventListener('click', () => this.toggleInventory());
        }
        if (this.btnCloseInventory) {
            this.btnCloseInventory.addEventListener('click', () => this.closeInventory());
        }

        // Toggle Auth Modal Button
        if (this.btnOpenAuth) {
            this.btnOpenAuth.addEventListener('click', () => this.toggleAuth());
        }
        if (this.btnCloseAuth) {
            this.btnCloseAuth.addEventListener('click', () => this.closeAuth());
        }

        // Save Button
        if (this.btnSave) {
            this.btnSave.addEventListener('click', () => {
                if (this.scene) {
                    SaveSystem.saveGame(this.scene.player, this.scene.farm);
                }
                this.btnSave.blur();
            });
        }

        // Reset Button
        if (this.btnReset) {
            this.btnReset.addEventListener('click', () => {
                const conf = confirm('Bạn có chắc muốn xóa tiến trình và chơi lại từ đầu không?');
                if (conf) {
                    SaveSystem.resetGame();
                }
                this.btnReset.blur();
            });
        }

        // Key listen to toggle panels inside browser window
        window.addEventListener('keydown', (e) => {
            // Ignore keystrokes when typing in inputs to prevent triggering game keyboard hotkeys
            if (document.activeElement && 
               (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                return;
            }

            if (e.key === 'i' || e.key === 'I') {
                // Toggle inventory if dialogue, shops, or lottery are not open
                if (!dialogueInstance.isOpen() && !shopInstance.isOpen() && !lotteryUIInstance.isOpen() && this.authOverlay.classList.contains('hidden')) {
                    this.toggleInventory();
                }
            } else if (e.key === 'c' || e.key === 'C') {
                // Press C to toggle Cloud Save panel
                if (!dialogueInstance.isOpen() && !shopInstance.isOpen() && !lotteryUIInstance.isOpen() && this.inventoryOverlay.classList.contains('hidden')) {
                    this.toggleAuth();
                }
            } else if (e.key === 'Escape') {
                // Close inventory if open
                if (!this.inventoryOverlay.classList.contains('hidden')) {
                    this.closeInventory();
                }
                // Close auth if open
                if (!this.authOverlay.classList.contains('hidden')) {
                    this.closeAuth();
                }
                // Close shop or sell overlay if open
                if (shopInstance.isOpen()) {
                    if (!shopInstance.shopOverlay.classList.contains('hidden')) {
                        shopInstance.closeShop();
                    }
                    if (!shopInstance.sellOverlay.classList.contains('hidden')) {
                        shopInstance.closeSell();
                    }
                }
                // Close lottery overlay if open
                if (lotteryUIInstance.isOpen()) {
                    lotteryUIInstance.closeLottery();
                }
            }
        });
    }

    // --- HUD LOGIC ---
    syncHUD() {
        if (this.hudCoins) {
            this.hudCoins.innerText = inventoryInstance.getCoins();
        }

        const selectedCropId = inventoryInstance.getSelectedSeed();
        const crop = CROPS[selectedCropId];
        const seedQty = inventoryInstance.getItemQty(`${selectedCropId}_seed`);

        if (this.hudSeedName) {
            this.hudSeedName.innerText = crop ? crop.name : 'Không có';
        }
        if (this.hudSeedCount) {
            this.hudSeedCount.innerText = `(${seedQty})`;
        }
        if (this.hudToolName) {
            // Context display depending on seed quantity
            if (seedQty > 0) {
                this.hudToolName.innerText = `Gieo hạt ${crop.name}`;
            } else {
                this.hudToolName.innerText = 'Cuốc đất / Tay không';
            }
        }
    }

    // --- INVENTORY MODAL LOGIC ---
    toggleInventory() {
        if (this.inventoryOverlay.classList.contains('hidden')) {
            this.openInventory();
        } else {
            this.closeInventory();
        }
    }

    openInventory() {
        this.inventoryOverlay.classList.remove('hidden');
        this.renderInventory();
        // Disable scene input keyboard listeners to prevent player from moving while typing
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.enabled = false;
        }
    }

    closeInventory() {
        this.inventoryOverlay.classList.add('hidden');
        this.btnCloseInventory.blur();
        if (this.btnOpenInventory) this.btnOpenInventory.blur();
        
        // Re-enable Phaser input
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.enabled = true;
        }
    }

    renderInventory() {
        if (!this.inventoryGrid) return;
        this.inventoryGrid.innerHTML = '';

        const slots = inventoryInstance.getSlots();
        const activeSeed = inventoryInstance.getSelectedSeed();

        slots.forEach((slot, index) => {
            const el = document.createElement('div');
            
            if (slot.empty) {
                el.className = 'inventory-slot empty';
                el.innerHTML = '';
            } else {
                const isSelectedSeed = slot.type === 'seed' && slot.cropId === activeSeed;
                el.className = `inventory-slot ${isSelectedSeed ? 'selected' : ''}`;
                el.innerHTML = `
                    <span class="item-icon">${slot.icon}</span>
                    <span class="item-name">${slot.name}</span>
                    <span class="item-qty">${slot.qty}</span>
                `;

                // If seed slot is clicked, select it as active seed
                if (slot.type === 'seed') {
                    el.addEventListener('click', () => {
                        inventoryInstance.setSelectedSeed(slot.cropId);
                        SaveSystem.showToast(`Đã chọn hạt giống: ${slot.name} 🌱`);
                    });
                }
            }

            this.inventoryGrid.appendChild(el);
        });
    }

    // --- INTERACTION PROMPT HINTS ---
    showPrompt(actionText, showKey = true) {
        if (this.interactionPrompt) {
            if (showKey) {
                this.interactionPrompt.innerHTML = `Nhấn <span class="key-hint">E</span> để <span>${actionText}</span>`;
            } else {
                this.interactionPrompt.innerHTML = `<span>${actionText}</span>`;
            }
            this.interactionPrompt.classList.remove('hidden');
            // Apply golden harvest glow when the action is harvest
            const isHarvest = actionText.includes('Thu hoạch') || actionText.includes('thu hoạch');
            this.interactionPrompt.classList.toggle('prompt-harvest', isHarvest);
        }
    }

    hidePrompt() {
        if (this.interactionPrompt) {
            this.interactionPrompt.classList.add('hidden');
            this.interactionPrompt.classList.remove('prompt-harvest');
            this.interactionPrompt.innerHTML = '';
        }
    }

    // --- CLOUD SAVE & AUTH MODAL LOGIC ---
    toggleAuth() {
        if (this.authOverlay.classList.contains('hidden')) {
            this.openAuth();
        } else {
            this.closeAuth();
        }
    }

    openAuth() {
        this.authOverlay.classList.remove('hidden');
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.enabled = false;
        }
        // Force refresh config override status on open
        this.updateConfigWarningState();
        if (isFirebaseConfigured() && auth && auth.currentUser) {
            this.updateAuthStateUI(auth.currentUser);
        }
    }

    closeAuth() {
        this.authOverlay.classList.add('hidden');
        this.btnCloseAuth.blur();
        if (this.btnOpenAuth) this.btnOpenAuth.blur();
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.enabled = true;
        }
    }

    initAuth() {
        // Find form sections
        this.authLoginForm = document.getElementById('auth-login-form');
        this.authRegisterForm = document.getElementById('auth-register-form');
        this.authProfileSection = document.getElementById('auth-profile-section');
        this.authConfigForm = document.getElementById('auth-config-form');
        
        this.warningBanner = document.getElementById('firebase-unconfigured-warning');
        
        // Tab buttons
        this.tabLoginBtn = document.getElementById('tab-login-btn');
        this.tabRegisterBtn = document.getElementById('tab-register-btn');
        this.tabConfigBtn = document.getElementById('tab-config-btn');
        
        // Config text and buttons
        this.inputConfigJson = document.getElementById('input-firebase-config-json');
        this.btnSaveConfig = document.getElementById('btn-save-config');
        this.btnClearConfig = document.getElementById('btn-clear-config');
        
        // Sync buttons
        this.btnSyncUp = document.getElementById('btn-cloud-sync-up');
        this.btnSyncDown = document.getElementById('btn-cloud-sync-down');
        
        // Input fields
        this.loginEmailInput = document.getElementById('login-email');
        this.loginPasswordInput = document.getElementById('login-password');
        this.registerEmailInput = document.getElementById('register-email');
        this.registerPasswordInput = document.getElementById('register-password');
        
        // Action buttons
        this.btnSubmitLogin = document.getElementById('btn-submit-login');
        this.btnSubmitRegister = document.getElementById('btn-submit-register');
        this.btnSubmitLogout = document.getElementById('btn-submit-logout');
        
        this.profileEmailSpan = document.getElementById('auth-profile-email');

        // Check configured warning
        this.updateConfigWarningState();

        // 1. Tab Navigation Events
        if (this.tabLoginBtn) {
            this.tabLoginBtn.addEventListener('click', () => this.switchAuthTab('login'));
        }
        if (this.tabRegisterBtn) {
            this.tabRegisterBtn.addEventListener('click', () => this.switchAuthTab('register'));
        }
        if (this.tabConfigBtn) {
            this.tabConfigBtn.addEventListener('click', () => {
                this.switchAuthTab('config');
                // Fill configuration if override exists
                const existing = localStorage.getItem('tf_firebase_config_override');
                if (existing && this.inputConfigJson) {
                    this.inputConfigJson.value = existing;
                }
            });
        }

        // 2. Auth State Changed callback
        if (isFirebaseConfigured() && auth) {
            onAuthStateChanged(auth, (user) => {
                this.updateAuthStateUI(user);
            });
        } else {
            this.updateAuthStateUI(null);
        }

        // 3. Submit login
        if (this.btnSubmitLogin) {
            this.btnSubmitLogin.addEventListener('click', async () => {
                const email = this.loginEmailInput.value.trim();
                const password = this.loginPasswordInput.value;
                if (!email || !password) {
                    SaveSystem.showToast('Vui lòng nhập đầy đủ email và mật khẩu! ⚠️');
                    return;
                }
                this.btnSubmitLogin.disabled = true;
                this.btnSubmitLogin.innerText = 'Đang đăng nhập... ⏳';
                try {
                    await signInWithEmailAndPassword(auth, email, password);
                    SaveSystem.showToast('Đăng nhập thành công! 🔓☁️');
                } catch (err) {
                    console.error(err);
                    SaveSystem.showToast('Lỗi: Email hoặc mật khẩu không đúng! ❌');
                } finally {
                    this.btnSubmitLogin.disabled = false;
                    this.btnSubmitLogin.innerText = 'Đăng Nhập 🔓';
                }
            });
        }

        // 4. Submit register
        if (this.btnSubmitRegister) {
            this.btnSubmitRegister.addEventListener('click', async () => {
                const email = this.registerEmailInput.value.trim();
                const password = this.registerPasswordInput.value;
                if (!email || !password || password.length < 6) {
                    SaveSystem.showToast('Email/Mật khẩu không hợp lệ (tối thiểu 6 ký tự)! ⚠️');
                    return;
                }
                this.btnSubmitRegister.disabled = true;
                this.btnSubmitRegister.innerText = 'Đang đăng ký... ⏳';
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    SaveSystem.showToast('Tạo tài khoản thành công! 🎉☁️');
                } catch (err) {
                    console.error(err);
                    SaveSystem.showToast('Lỗi đăng ký tài khoản! ❌');
                } finally {
                    this.btnSubmitRegister.disabled = false;
                    this.btnSubmitRegister.innerText = 'Đăng Ký Tài Khoản 📝';
                }
            });
        }

        // 5. Submit logout
        if (this.btnSubmitLogout) {
            this.btnSubmitLogout.addEventListener('click', async () => {
                try {
                    await signOut(auth);
                    SaveSystem.showToast('Đã đăng xuất tài khoản! 🚪');
                } catch (err) {
                    console.error(err);
                    SaveSystem.showToast('Không thể đăng xuất! ❌');
                }
            });
        }

        // 6. Manual Sync buttons
        if (this.btnSyncUp) {
            this.btnSyncUp.addEventListener('click', () => {
                if (this.scene) {
                    SaveSystem.saveGame(this.scene.player, this.scene.farm);
                }
            });
        }
        if (this.btnSyncDown) {
            this.btnSyncDown.addEventListener('click', async () => {
                if (this.scene) {
                    const confirmLoad = confirm('Tải game từ đám mây sẽ ghi đè lên nông trại hiện tại của bạn. Bạn có muốn tiếp tục?');
                    if (confirmLoad) {
                        const success = await SaveSystem.loadFromCloud(this.scene.player, this.scene.farm);
                        if (success) {
                            this.closeAuth();
                        }
                    }
                }
            });
        }

        // 7. Config controls
        if (this.btnSaveConfig) {
            this.btnSaveConfig.addEventListener('click', () => {
                const rawJson = this.inputConfigJson.value.trim();
                if (!rawJson) {
                    SaveSystem.showToast('Vui lòng nhập JSON cấu hình! ⚠️');
                    return;
                }
                try {
                    const parsed = JSON.parse(rawJson);
                    if (!parsed.apiKey || !parsed.projectId) {
                        SaveSystem.showToast('Cấu hình thiếu apiKey hoặc projectId! ⚠️');
                        return;
                    }
                    localStorage.setItem('tf_firebase_config_override', JSON.stringify(parsed));
                    
                    // Reinitialize
                    const success = initializeFirebase();
                    if (success) {
                        SaveSystem.showToast('Lưu cấu hình thành công! Hãy tải lại trang để áp dụng. ⚙️', 3000);
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        SaveSystem.showToast('Không thể kết nối Firebase! Kiểm tra JSON. ❌');
                    }
                } catch (e) {
                    SaveSystem.showToast('JSON không hợp lệ! Vui lòng kiểm tra lại cú pháp. ❌');
                }
            });
        }

        if (this.btnClearConfig) {
            this.btnClearConfig.addEventListener('click', () => {
                const confirmClear = confirm('Bạn có chắc muốn xóa cấu hình Firebase tùy chỉnh không?');
                if (confirmClear) {
                    localStorage.removeItem('tf_firebase_config_override');
                    SaveSystem.showToast('Đã xóa cấu hình tùy chỉnh! Đang tải lại...', 1500);
                    setTimeout(() => window.location.reload(), 1000);
                }
            });
        }
    }

    updateConfigWarningState() {
        const configured = isFirebaseConfigured();
        if (this.warningBanner) {
            this.warningBanner.classList.toggle('hidden', configured);
        }
        if (this.tabLoginBtn) this.tabLoginBtn.disabled = !configured;
        if (this.tabRegisterBtn) this.tabRegisterBtn.disabled = !configured;
        
        if (!configured && this.tabConfigBtn) {
            // Force select config tab
            this.switchAuthTab('config');
        }
    }

    switchAuthTab(tabName) {
        // Toggle active tab buttons
        if (this.tabLoginBtn) this.tabLoginBtn.classList.toggle('active', tabName === 'login');
        if (this.tabRegisterBtn) this.tabRegisterBtn.classList.toggle('active', tabName === 'register');
        if (this.tabConfigBtn) this.tabConfigBtn.classList.toggle('active', tabName === 'config');

        // Toggle visibility of panels
        if (this.authLoginForm) this.authLoginForm.classList.toggle('hidden', tabName !== 'login');
        if (this.authRegisterForm) this.authRegisterForm.classList.toggle('hidden', tabName !== 'register');
        if (this.authProfileSection) this.authProfileSection.classList.toggle('hidden', tabName !== 'profile');
        if (this.authConfigForm) this.authConfigForm.classList.toggle('hidden', tabName !== 'config');
    }

    updateAuthStateUI(user) {
        if (user) {
            // Connected
            if (this.btnOpenAuth) {
                this.btnOpenAuth.classList.add('connected');
                this.btnOpenAuth.innerText = '☁️ Trực Tuyến';
            }
            if (this.profileEmailSpan) {
                this.profileEmailSpan.innerText = user.email;
            }
            this.switchAuthTab('profile');
            if (this.tabLoginBtn) this.tabLoginBtn.classList.add('hidden');
            if (this.tabRegisterBtn) this.tabRegisterBtn.classList.add('hidden');
            
            // Auto sync down on initial login if local save is empty/new
            if (!SaveSystem.hasSave()) {
                SaveSystem.loadFromCloud(this.scene?.player, this.scene?.farm);
            }
        } else {
            // Not connected
            if (this.btnOpenAuth) {
                this.btnOpenAuth.classList.remove('connected');
                this.btnOpenAuth.innerText = '☁️ Đám mây';
            }
            if (this.tabLoginBtn) this.tabLoginBtn.classList.remove('hidden');
            if (this.tabRegisterBtn) this.tabRegisterBtn.classList.remove('hidden');
            
            if (isFirebaseConfigured()) {
                this.switchAuthTab('login');
            } else {
                this.switchAuthTab('config');
            }
        }
    }

    isAnyPanelOpen() {
        return !this.inventoryOverlay.classList.contains('hidden') || 
               !this.authOverlay.classList.contains('hidden') ||
               dialogueInstance.isOpen() || 
               shopInstance.isOpen() ||
               lotteryUIInstance.isOpen();
    }
}
