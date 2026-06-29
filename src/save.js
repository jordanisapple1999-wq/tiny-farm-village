// Tiny Farm Village - Save & Load System

import { inventoryInstance } from './inventory.js';
import { lotteryInstance } from './lottery.js';
import { auth, db, doc, getDoc, setDoc, serverTimestamp } from './firebase.js';
import { isFirebaseConfigured } from './firebaseConfig.js';
import { soundManager } from './audio.js';

const SAVE_KEY = 'tiny_farm_village_save';

export class SaveSystem {
    static saveGame(player, farm) {
        try {
            const saveData = {
                timestamp: Date.now(),
                inventory: inventoryInstance.toJSON(),
                player: {
                    x: player ? player.x : 400,
                    y: player ? player.y : 300,
                    name: player ? player.playerName : ''
                },
                farm: farm ? farm.toJSON() : []
            };

            // 1. Save locally as fallback/cache
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
            
            // Save lottery state locally
            lotteryInstance.saveState();

            soundManager.playSFX('save');
            this.showToast('Đã lưu game tự động! 💾');

            // 2. Async save to Firebase Cloud if logged in
            if (isFirebaseConfigured() && auth && auth.currentUser) {
                const userId = auth.currentUser.uid;
                setDoc(doc(db, "saves", userId), {
                    saveData: saveData,
                    updatedAt: serverTimestamp()
                }).then(() => {
                    console.log('Progress synced to Firebase Cloud.');
                    const lastSyncEl = document.getElementById('auth-last-sync');
                    if (lastSyncEl) {
                        lastSyncEl.innerText = new Date().toLocaleTimeString();
                    }
                }).catch(err => {
                    console.error('Failed to sync save to cloud:', err);
                });
            }

            return true;
        } catch (e) {
            console.error('Error saving game:', e);
            soundManager.playSFX('error');
            this.showToast('Không thể lưu game! ❌');
            return false;
        }
    }

    static loadGame(player, farm) {
        try {
            const rawData = localStorage.getItem(SAVE_KEY);
            if (!rawData) return false;

            const saveData = JSON.parse(rawData);
            if (!saveData) return false;

            // Load Inventory
            if (saveData.inventory) {
                inventoryInstance.fromJSON(saveData.inventory);
            }

            // Load Player Position
            if (player && saveData.player) {
                player.x = saveData.player.x;
                player.y = saveData.player.y;
                if (saveData.player.name) {
                    player.setName(saveData.player.name);
                }
                if (player.body) {
                    player.body.reset(player.x, player.y);
                }
            }

            // Load Farm Plots
            if (farm && saveData.farm) {
                farm.fromJSON(saveData.farm);
            }

            // Load lottery state
            lotteryInstance.loadState();

            soundManager.playSFX('save');
            this.showToast('Đã tải lại tiến trình! 🌾');
            return true;
        } catch (e) {
            console.error('Error loading game:', e);
            return false;
        }
    }

    static async loadFromCloud(player, farm) {
        if (!isFirebaseConfigured() || !auth || !auth.currentUser) return false;
        try {
            const userId = auth.currentUser.uid;
            const docRef = doc(db, "saves", userId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const cloudData = docSnap.data().saveData;
                if (cloudData) {
                    // Update local storage
                    localStorage.setItem(SAVE_KEY, JSON.stringify(cloudData));
                    
                    // Apply to current game structures
                    this.loadGame(player, farm);
                    
                    // Update Last Sync element text
                    const lastSyncEl = document.getElementById('auth-last-sync');
                    if (lastSyncEl) {
                        lastSyncEl.innerText = new Date(docSnap.data().updatedAt?.seconds * 1000 || Date.now()).toLocaleTimeString();
                    }
                    this.showToast('Đã tải tiến trình từ đám mây! 📥☁️');
                    soundManager.playSFX('save');
                    return true;
                }
            }
            this.showToast('Không có dữ liệu trên đám mây! ☁️');
            soundManager.playSFX('error');
            return false;
        } catch (e) {
            console.error('Error loading from Firebase Cloud:', e);
            this.showToast('Lỗi khi tải từ đám mây! ❌');
            soundManager.playSFX('error');
            return false;
        }
    }

    static async uploadLocalToCloud() {
        if (!isFirebaseConfigured() || !auth || !auth.currentUser) return false;
        try {
            const rawData = localStorage.getItem(SAVE_KEY);
            if (!rawData) {
                this.showToast('Không có lưu cục bộ để tải lên! ❌');
                soundManager.playSFX('error');
                return false;
            }
            
            const saveData = JSON.parse(rawData);
            const userId = auth.currentUser.uid;
            
            await setDoc(doc(db, "saves", userId), {
                saveData: saveData,
                updatedAt: serverTimestamp()
            });

            const lastSyncEl = document.getElementById('auth-last-sync');
            if (lastSyncEl) {
                lastSyncEl.innerText = new Date().toLocaleTimeString();
            }
            
            this.showToast('Đã tải tiến trình lên đám mây! 📤☁️');
            soundManager.playSFX('save');
            return true;
        } catch (e) {
            console.error('Error uploading to Firebase Cloud:', e);
            this.showToast('Không thể đồng bộ lên đám mây! ❌');
            soundManager.playSFX('error');
            return false;
        }
    }

    static hasSave() {
        return localStorage.getItem(SAVE_KEY) !== null;
    }

    static resetGame() {
        try {
            localStorage.removeItem(SAVE_KEY);
            lotteryInstance.resetState();
            
            soundManager.playSFX('save');
            this.showToast('Đã xóa dữ liệu lưu! Game sẽ tải lại...', 1500);
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            return true;
        } catch (e) {
            console.error('Error resetting game:', e);
            soundManager.playSFX('error');
            return false;
        }
    }


    static showToast(message, duration = 2500) {
        const toast = document.getElementById('toast-notification');
        if (!toast) return;

        toast.textContent = message;

        // Auto-detect toast type for accent color
        toast.classList.remove('toast-harvest', 'toast-error', 'toast-save');
        if (message.includes('Thu hoạch') || message.includes('thu hoạch') || message.includes('🥕') || message.includes('🍅') || message.includes('🎃')) {
            toast.classList.add('toast-harvest');
        } else if (message.includes('❌') || message.includes('Không') || message.includes('không thể') || message.includes('lỗi')) {
            toast.classList.add('toast-error');
        } else if (message.includes('💾') || message.includes('lưu') || message.includes('Lưu') || message.includes('tải')) {
            toast.classList.add('toast-save');
        }

        toast.classList.remove('toast-hidden');

        // Clear existing timeout if any
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }

        this.toastTimeout = setTimeout(() => {
            toast.classList.add('toast-hidden');
        }, duration);
    }
}
