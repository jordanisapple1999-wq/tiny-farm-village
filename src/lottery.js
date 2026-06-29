// Tiny Farm Village - Core Lottery System Logic & Audio Synthesis

import { inventoryInstance } from './inventory.js';
import { SaveSystem } from './save.js';
import { soundManager } from './audio.js';

const LOTTERY_SAVE_KEY = 'tiny_farm_lottery';
const CYCLE_DURATION = 180; // 3 minutes cycle

export class LotterySystem {
    constructor() {
        this.timeLeft = CYCLE_DURATION; // Count down in seconds
        this.tickets = []; // Current round tickets (array of strings, e.g. ["07", "12"])
        this.history = []; // History of previous draws (max 5)
        this.lastDraw = null; // Last draw details: { winningNumbers: { bet, ba, nhi, nhat, dacbiet }, tickets: [], matches: [], rewards: 0 }
        this.isDrawing = false;
        
        // Web Audio Context (created on first sound)
        this.audioCtx = null;

        // Timer interval reference
        this.timerInterval = null;
    }

    init() {
        this.loadState();
        this.startTimer();
    }

    // Initialize Web Audio Context on first interaction
    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    // --- Web Audio SFX Synthesis ---
    playSound(type) {
        try {
            if (soundManager.isMuted) return; // Muted globally
            this.initAudio();
            if (!this.audioCtx) return;

            const ctx = this.audioCtx;
            const now = ctx.currentTime;

            if (type === 'buy') {
                // Short coin-like chime
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, now); // D5
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
                
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.3);
            } 
            else if (type === 'error') {
                // Low double buzz
                [0, 0.12].forEach((delay) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(110, now + delay); // A2
                    
                    gain.gain.setValueAtTime(0.1, now + delay);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.1);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + delay);
                    osc.stop(now + delay + 0.1);
                });
            } 
            else if (type === 'tick') {
                // Crisp wood block / clock tick
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(1000, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);

                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.05);
            } 
            else if (type === 'roll') {
                // White noise or rapid pitch clicks
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150 + Math.random() * 200, now);
                
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.08);
            } 
            else if (type === 'win') {
                // Happy arpeggio
                const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
                notes.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                    
                    gain.gain.setValueAtTime(0.12, now + idx * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.3);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.1);
                    osc.stop(now + idx * 0.1 + 0.35);
                });
            } 
            else if (type === 'special_win') {
                // Triumphant jackpot theme!
                const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Up to C6
                notes.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                    
                    gain.gain.setValueAtTime(0.15, now + idx * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.4);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.08);
                    osc.stop(now + idx * 0.08 + 0.45);
                });

                // Triumphant chord at the end
                setTimeout(() => {
                    const chord = [523.25, 659.25, 783.99, 1046.50];
                    const chordNow = ctx.currentTime;
                    chord.forEach((freq) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(freq, chordNow);
                        
                        gain.gain.setValueAtTime(0.08, chordNow);
                        gain.gain.exponentialRampToValueAtTime(0.001, chordNow + 0.8);
                        
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(chordNow);
                        osc.stop(chordNow + 0.8);
                    });
                }, 560);
            }
        } catch (e) {
            console.warn('Sound play error (User might need to interact first):', e);
        }
    }

    // --- Core Timer ---
    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.timerInterval = setInterval(() => {
            if (this.isDrawing) return;

            if (this.timeLeft > 0) {
                this.timeLeft--;

                // Play tick sound in the final 5 seconds
                if (this.timeLeft > 0 && this.timeLeft <= 5) {
                    this.playSound('tick');
                }

                this.triggerUIUpdate();
            } else {
                // Time's up! Trigger draw
                this.startDraw();
            }
        }, 1000);
    }

    // --- Ticket buying ---
    buyTicket(numStr) {
        if (this.isDrawing) {
            SaveSystem.showToast('Đang mở thưởng, không thể mua vé! 🎰');
            return false;
        }

        // Validate number
        const val = parseInt(numStr, 10);
        if (isNaN(val) || val < 0 || val > 99) {
            SaveSystem.showToast('Số vé không hợp lệ (00-99)! ❌');
            this.playSound('error');
            return false;
        }

        // Pad number string (e.g. "7" -> "07")
        const paddedNum = numStr.padStart(2, '0');

        // Check if number already bought in this round
        if (this.tickets.includes(paddedNum)) {
            SaveSystem.showToast(`Bạn đã mua số ${paddedNum} rồi! Hãy chọn số khác. ❌`);
            this.playSound('error');
            return false;
        }

        // Check if player has enough money (100 coins)
        if (inventoryInstance.getCoins() >= 100) {
            inventoryInstance.spendCoins(100);
            this.tickets.push(paddedNum);
            this.playSound('buy');
            SaveSystem.showToast(`Mua thành công vé số ${paddedNum} 🎟️`);
            
            this.saveState();
            this.triggerUIUpdate();
            
            // Force game save immediately to write new coin balance to disk
            if (window._phaserScene) {
                SaveSystem.saveGame(window._phaserScene.player, window._phaserScene.farm);
            }
            return true;
        } else {
            SaveSystem.showToast('Bạn không đủ vàng. 🪙❌');
            this.playSound('error');
            return false;
        }
    }

    // Refund / Delete ticket before draw
    refundTicket(index) {
        if (this.isDrawing) return;
        if (index < 0 || index >= this.tickets.length) return;

        const num = this.tickets[index];
        this.tickets.splice(index, 1);
        inventoryInstance.addCoins(100);
        this.playSound('buy');
        SaveSystem.showToast(`Đã hủy vé số ${num} (Hoàn lại 🪙100)`);
        this.saveState();
        this.triggerUIUpdate();
        
        // Force game save immediately to write new coin balance to disk
        if (window._phaserScene) {
            SaveSystem.saveGame(window._phaserScene.player, window._phaserScene.farm);
        }
    }

    // --- Drawing numbers ---
    startDraw() {
        this.isDrawing = true;
        this.triggerUIUpdate();

        // 1. Generate winning numbers (completely random 00-99, independent)
        const generateWinningNumber = () => {
            const num = Math.floor(Math.random() * 100);
            return num.toString().padStart(2, '0');
        };

        const winningNumbers = {
            bet: generateWinningNumber(),
            ba: generateWinningNumber(),
            nhi: generateWinningNumber(),
            nhat: generateWinningNumber(),
            dacbiet: generateWinningNumber()
        };

        // 2. Delegate animation trigger to UI (which takes ~6 seconds)
        if (window._lotteryUI) {
            window._lotteryUI.animateDraw(winningNumbers, (matches, rewards) => {
                this.completeDraw(winningNumbers, matches, rewards);
            });
        } else {
            // Fallback if no UI bound (e.g. offline simulation)
            const check = this.checkTickets(winningNumbers);
            this.completeDraw(winningNumbers, check.matches, check.rewards);
        }
    }

    completeDraw(winningNumbers, matches, rewards) {
        // Build last draw object
        this.lastDraw = {
            winningNumbers,
            tickets: [...this.tickets],
            matches,
            rewards,
            claimed: false
        };

        // Append to history
        const timestamp = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateStr = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        
        this.history.unshift({
            time: timestamp,
            date: dateStr,
            numbers: winningNumbers
        });

        // Cap history at 5 items
        if (this.history.length > 5) {
            this.history.pop();
        }

        // Auto-claim rewards or keep them pending?
        // To make it fully automated but matching the mockup:
        // Let's add money automatically to comply with: "Tiền thưởng cộng tự động"
        // But also let the "Nhận thưởng" button exist to clear the modal screen.
        // Wait, if it auto-credits:
        if (rewards > 0) {
            inventoryInstance.addCoins(rewards);
        }

        // Reset tickets for next round
        this.tickets = [];
        this.timeLeft = CYCLE_DURATION;
        this.isDrawing = false;

        this.saveState();
        this.triggerUIUpdate();

        // Force Phaser save to disk immediately
        if (window._phaserScene) {
            SaveSystem.saveGame(window._phaserScene.player, window._phaserScene.farm);
        }
    }

    // Check bought tickets against winning numbers
    checkTickets(winningNumbers) {
        const matches = [];
        let rewards = 0;

        this.tickets.forEach(ticket => {
            let matchedPrize = null;
            let ticketReward = 0;

            if (ticket === winningNumbers.dacbiet) {
                matchedPrize = 'Giải Đặc Biệt';
                ticketReward = 10000;
            } else if (ticket === winningNumbers.nhat) {
                matchedPrize = 'Giải Nhất';
                ticketReward = 500;
            } else if (ticket === winningNumbers.nhi) {
                matchedPrize = 'Giải Nhì';
                ticketReward = 400;
            } else if (ticket === winningNumbers.ba) {
                matchedPrize = 'Giải Ba';
                ticketReward = 300;
            } else if (ticket === winningNumbers.bet) {
                matchedPrize = 'Giải Bét';
                ticketReward = 200;
            }

            if (matchedPrize) {
                matches.push({ ticket, prize: matchedPrize, reward: ticketReward });
                rewards += ticketReward;
            } else {
                matches.push({ ticket, prize: null, reward: 0 });
            }
        });

        return { matches, rewards };
    }

    // --- Save / Load & Offline Time Calculation ---
    saveState() {
        try {
            const data = {
                timeLeft: this.timeLeft,
                tickets: this.tickets,
                history: this.history,
                lastDraw: this.lastDraw,
                saveTimestamp: Date.now()
            };
            localStorage.setItem(LOTTERY_SAVE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving lottery state:', e);
        }
    }

    loadState() {
        try {
            const raw = localStorage.getItem(LOTTERY_SAVE_KEY);
            if (!raw) return;

            const data = JSON.parse(raw);
            if (!data) return;

            this.tickets = data.tickets || [];
            this.history = data.history || [];
            this.lastDraw = data.lastDraw || null;

            // Offline time calculation
            const savedTime = data.saveTimestamp || Date.now();
            const elapsedSeconds = Math.floor((Date.now() - savedTime) / 1000);

            if (elapsedSeconds > 0) {
                const storedTimeLeft = data.timeLeft !== undefined ? data.timeLeft : CYCLE_DURATION;
                
                if (elapsedSeconds >= storedTimeLeft) {
                    // At least one draw cycle was missed!
                    // Let's check if they had tickets in the missed draw
                    if (this.tickets.length > 0) {
                        // Simulate one draw for their tickets
                        const generateWinningNumber = () => Math.floor(Math.random() * 100).toString().padStart(2, '0');
                        const winningNumbers = {
                            bet: generateWinningNumber(),
                            ba: generateWinningNumber(),
                            nhi: generateWinningNumber(),
                            nhat: generateWinningNumber(),
                            dacbiet: generateWinningNumber()
                        };

                        const check = this.checkTickets(winningNumbers);
                        
                        // Add rewards automatically
                        if (check.rewards > 0) {
                            inventoryInstance.addCoins(check.rewards);
                            
                            // Delay toast slightly so scene is initialized
                            setTimeout(() => {
                                SaveSystem.showToast(`Kỳ quay số vắng mặt đã diễn ra! Bạn trúng thưởng 🪙${check.rewards} vàng! 🎉`, 5000);
                            }, 1500);
                        } else {
                            setTimeout(() => {
                                SaveSystem.showToast('Kỳ quay số vắng mặt đã diễn ra nhưng vé của bạn không trúng giải. 🎟️', 4000);
                            }, 1500);
                        }

                        // Store this simulated draw as the last draw
                        this.lastDraw = {
                            winningNumbers,
                            tickets: [...this.tickets],
                            matches: check.matches,
                            rewards: check.rewards,
                            claimed: true
                        };

                        // Add to history
                        const missedTimeStr = new Date(savedTime + storedTimeLeft * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                        const missedDateStr = new Date(savedTime + storedTimeLeft * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                        this.history.unshift({
                            time: missedTimeStr,
                            date: missedDateStr,
                            numbers: winningNumbers
                        });
                        if (this.history.length > 5) this.history.pop();
                    }

                    // Remaining time in the current cycle
                    const remainingElapsed = elapsedSeconds - storedTimeLeft;
                    this.timeLeft = CYCLE_DURATION - (remainingElapsed % CYCLE_DURATION);
                    this.tickets = []; // Clear tickets since they are spent
                } else {
                    // No draw was missed, just reduce timer
                    this.timeLeft = storedTimeLeft - elapsedSeconds;
                }
            } else {
                this.timeLeft = data.timeLeft !== undefined ? data.timeLeft : CYCLE_DURATION;
            }
        } catch (e) {
            console.error('Error loading lottery state:', e);
        }
    }

    resetState() {
        try {
            localStorage.removeItem(LOTTERY_SAVE_KEY);
            this.timeLeft = CYCLE_DURATION;
            this.tickets = [];
            this.history = [];
            this.lastDraw = null;
            this.isDrawing = false;
        } catch (e) {
            console.error('Error resetting lottery state:', e);
        }
    }

    // Bind state changes to the UI
    triggerUIUpdate() {
        if (window._lotteryUI) {
            window._lotteryUI.update();
        }
    }
}

export const lotteryInstance = new LotterySystem();
window._lotterySystem = lotteryInstance; // Global reference for debugging and UI bindings
