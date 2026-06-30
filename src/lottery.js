// Tiny Farm Village - Core Lottery System Logic & Audio Synthesis

import { inventoryInstance } from './inventory.js';
import { SaveSystem } from './save.js';
import { soundManager } from './audio.js';

const LOTTERY_SAVE_KEY = 'tiny_farm_lottery';
const CYCLE_DURATION = 180; // 3 minutes cycle

// Seeded PRNG based on round ID to make draws identical for all players in that round
function getWinningNumbersForRound(roundId) {
    let seed = roundId * 1234567;
    const nextRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
    const generateWinningNumber = () => {
        const val = Math.floor(nextRandom() * 100);
        return val.toString().padStart(2, '0');
    };
    return {
        bet: generateWinningNumber(),
        ba: generateWinningNumber(),
        nhi: generateWinningNumber(),
        nhat: generateWinningNumber(),
        dacbiet: generateWinningNumber()
    };
}

export class LotterySystem {
    constructor() {
        this.timeLeft = CYCLE_DURATION; // Count down in seconds
        this.tickets = []; // Current round tickets (array of strings, e.g. ["07", "12"])
        this.history = []; // History of previous draws (max 5)
        this.lastDraw = null; // Last draw details
        this.isDrawing = false;
        
        this.roundId = 0; // Current global round ID based on time
        this.ticketRoundId = null; // Round ID for which current tickets were bought

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
            
            // Only play lottery sounds if the lottery panel is open
            if (window._lotteryUI && !window._lotteryUI.isOpen()) {
                return;
            }

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
    syncTimer() {
        const nowMs = Date.now();
        const cycleMs = CYCLE_DURATION * 1000;
        this.roundId = Math.floor(nowMs / cycleMs);
        const elapsedMs = nowMs % cycleMs;
        this.timeLeft = Math.ceil((cycleMs - elapsedMs) / 1000);
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.syncTimer();
        this.triggerUIUpdate();

        this.timerInterval = setInterval(() => {
            const nowMs = Date.now();
            const cycleMs = CYCLE_DURATION * 1000;
            const currentRoundId = Math.floor(nowMs / cycleMs);
            const elapsedMs = nowMs % cycleMs;
            this.timeLeft = Math.ceil((cycleMs - elapsedMs) / 1000);

            // Play tick sound in the final 5 seconds
            if (this.timeLeft > 0 && this.timeLeft <= 5 && !this.isDrawing) {
                this.playSound('tick');
            }

            if (currentRoundId > this.roundId) {
                // Round changed! Trigger draw for the round that just ended
                const drawRoundId = this.roundId;
                this.roundId = currentRoundId;
                this.startDraw(drawRoundId);
            } else {
                this.triggerUIUpdate();
            }
        }, 1000);
    }

    // --- Ticket buying ---
    buyTicket(numStr) {
        if (this.isDrawing) {
            SaveSystem.showToast('Đang mở thưởng, không thể mua vé! 🎰');
            return false;
        }

        if (this.timeLeft <= 5) {
            SaveSystem.showToast('Kỳ quay số sắp bắt đầu, không thể mua vé! 🎰');
            this.playSound('error');
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
            
            // Set ticket validation round ID if this is the first ticket bought
            if (this.tickets.length === 0) {
                this.ticketRoundId = this.roundId;
            }

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
        
        if (this.tickets.length === 0) {
            this.ticketRoundId = null;
        }

        this.saveState();
        this.triggerUIUpdate();
        
        // Force game save immediately to write new coin balance to disk
        if (window._phaserScene) {
            SaveSystem.saveGame(window._phaserScene.player, window._phaserScene.farm);
        }
    }

    // --- Drawing numbers ---
    startDraw(drawRoundId) {
        this.isDrawing = true;
        this.triggerUIUpdate();

        // 1. Generate winning numbers deterministically for this specific round ID
        const winningNumbers = getWinningNumbersForRound(drawRoundId);

        // Check if player had tickets in this drawn round
        const hadTickets = this.ticketRoundId === drawRoundId && this.tickets.length > 0;

        // 2. Delegate animation trigger to UI if the panel is open
        if (window._lotteryUI && window._lotteryUI.isOpen()) {
            window._lotteryUI.animateDraw(winningNumbers, (matches, rewards) => {
                this.completeDraw(drawRoundId, winningNumbers, matches, rewards);
            });
        } else {
            // Fallback: draw instantly if panel is closed or UI is not bound
            const check = hadTickets ? this.checkTickets(winningNumbers) : { matches: [], rewards: 0 };
            this.completeDraw(drawRoundId, winningNumbers, check.matches, check.rewards);

            // Display background completion toast notification immediately
            if (hadTickets) {
                if (check.rewards > 0) {
                    SaveSystem.showToast(`Xổ số kết thúc! Bạn đã trúng thưởng 🪙${check.rewards} vàng! 🎉`, 5000);
                } else {
                    SaveSystem.showToast(`Xổ số kết thúc! Vé của bạn không trúng giải kỳ này. 🎟️💨`, 4000);
                }
            } else {
                SaveSystem.showToast(`Xổ số kết thúc! Giải Đặc Biệt kỳ này là số ${winningNumbers.dacbiet} 👑`, 4000);
            }
        }
    }

    completeDraw(drawRoundId, winningNumbers, matches, rewards) {
        const hadTickets = this.ticketRoundId === drawRoundId && this.tickets.length > 0;

        // Build last draw object
        this.lastDraw = {
            winningNumbers,
            tickets: hadTickets ? [...this.tickets] : [],
            matches: matches || [],
            rewards: rewards || 0,
            claimed: false
        };

        // Append to history
        const drawTimeMs = (drawRoundId + 1) * CYCLE_DURATION * 1000;
        const timestamp = new Date(drawTimeMs).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateStr = new Date(drawTimeMs).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        
        this.history.unshift({
            time: timestamp,
            date: dateStr,
            numbers: winningNumbers
        });

        // Cap history at 5 items
        if (this.history.length > 5) {
            this.history.pop();
        }

        // Auto-claim rewards
        if (hadTickets && rewards > 0) {
            inventoryInstance.addCoins(rewards);
        }

        // Reset tickets since they are spent
        this.tickets = [];
        this.ticketRoundId = null;

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
                roundId: this.roundId,
                ticketRoundId: this.ticketRoundId,
                tickets: this.tickets,
                history: this.history,
                lastDraw: this.lastDraw
            };
            localStorage.setItem(LOTTERY_SAVE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving lottery state:', e);
        }
    }

    loadState() {
        try {
            const raw = localStorage.getItem(LOTTERY_SAVE_KEY);
            const currentRoundId = Math.floor(Date.now() / (CYCLE_DURATION * 1000));
            this.roundId = currentRoundId;

            if (!raw) {
                this.tickets = [];
                this.ticketRoundId = null;
                this.history = [];
                this.lastDraw = null;
                return;
            }

            const data = JSON.parse(raw);
            if (!data) return;

            this.tickets = data.tickets || [];
            this.ticketRoundId = data.ticketRoundId !== undefined ? data.ticketRoundId : null;
            this.history = data.history || [];
            this.lastDraw = data.lastDraw || null;
            const savedRoundId = data.roundId || currentRoundId;

            // Offline missed draws checking
            if (this.ticketRoundId !== null && this.ticketRoundId < currentRoundId) {
                const drawRoundId = this.ticketRoundId;
                const winningNumbers = getWinningNumbersForRound(drawRoundId);
                const check = this.checkTickets(winningNumbers);

                if (check.rewards > 0) {
                    inventoryInstance.addCoins(check.rewards);
                    
                    setTimeout(() => {
                        if (window.SaveSystem) {
                            window.SaveSystem.showToast(`Kỳ quay số vắng mặt (Kỳ #${drawRoundId}) đã diễn ra! Bạn trúng thưởng 🪙${check.rewards} vàng! 🎉`, 5000);
                        }
                    }, 1500);
                } else {
                    setTimeout(() => {
                        if (window.SaveSystem) {
                            window.SaveSystem.showToast(`Kỳ quay số vắng mặt (Kỳ #${drawRoundId}) đã diễn ra nhưng vé của bạn không trúng giải. 🎟️`, 4000);
                        }
                    }, 1500);
                }

                this.lastDraw = {
                    winningNumbers,
                    tickets: [...this.tickets],
                    matches: check.matches,
                    rewards: check.rewards,
                    claimed: true
                };

                const drawTimeMs = (drawRoundId + 1) * CYCLE_DURATION * 1000;
                const missedTimeStr = new Date(drawTimeMs).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const missedDateStr = new Date(drawTimeMs).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                this.history.unshift({
                     time: missedTimeStr,
                     date: missedDateStr,
                     numbers: winningNumbers
                });
                if (this.history.length > 5) this.history.pop();

                this.tickets = [];
                this.ticketRoundId = null;
            }

            // Populate some default history if blank to look cozy
            if (this.history.length === 0) {
                for (let i = 1; i <= 3; i++) {
                    const rId = currentRoundId - i;
                    const winNums = getWinningNumbersForRound(rId);
                    const drawTimeMs = (rId + 1) * CYCLE_DURATION * 1000;
                    this.history.push({
                        time: new Date(drawTimeMs).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        date: new Date(drawTimeMs).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                        numbers: winNums
                    });
                }
            }

            this.syncTimer();
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
            this.ticketRoundId = null;
            this.roundId = Math.floor(Date.now() / (CYCLE_DURATION * 1000));
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
