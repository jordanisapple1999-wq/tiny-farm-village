// Tiny Farm Village - Lottery System UI Overlay Binder & Animations
import { lotteryInstance } from './lottery.js';
import { SaveSystem } from './save.js';

export class LotteryUI {
    constructor() {
        this.overlay = document.getElementById('lottery-overlay');
        this.btnClose = document.getElementById('btn-close-lottery');
        
        // Spinner & Buy
        this.btnDec = document.getElementById('btn-lotto-dec');
        this.btnInc = document.getElementById('btn-lotto-inc');
        this.numDisplay = document.getElementById('lotto-num-display');
        this.btnRandom = document.getElementById('btn-lotto-random');
        this.btnBuy = document.getElementById('btn-lotto-buy');
        
        // Lists & Text Info
        this.boughtList = document.getElementById('bought-tickets-list');
        this.totalCount = document.getElementById('lotto-total-count');
        this.recentResultsList = document.getElementById('recent-results-list');
        this.myTicketsCheckList = document.getElementById('my-tickets-check-list');
        this.myRewardValue = document.getElementById('lotto-my-reward-value');
        this.countdownSign = document.getElementById('lotto-countdown');
        
        // HUD
        this.hudBadge = document.getElementById('lottery-hud');
        this.hudTimer = document.getElementById('lotto-hud-timer');
        this.hudTickets = document.getElementById('lotto-hud-tickets');
        
        // Drawing Animation
        this.balls = {
            bet: document.getElementById('ball-bet'),
            ba: document.getElementById('ball-ba'),
            nhi: document.getElementById('ball-nhi'),
            nhat: document.getElementById('ball-nhat'),
            dacbiet: document.getElementById('ball-dacbiet')
        };
        this.feedbackBanner = document.getElementById('draw-feedback-banner');
        this.feedbackText = document.getElementById('draw-feedback-text');
        this.btnClaim = document.getElementById('btn-lotto-claim');
        
        this.selectedNumber = 0; // default 0
        this.typingBuffer = "";
        this.isDrawingAnimation = false;
        this.confetti = null;

        this.initEvents();
    }

    initEvents() {
        // Close overlay
        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => this.closeLottery());
        }

        // HUD Click opens lottery
        if (this.hudBadge) {
            this.hudBadge.addEventListener('click', () => {
                lotteryInstance.initAudio();
                this.openLottery();
            });
        }

        // Spinner Decrement
        if (this.btnDec) {
            this.btnDec.addEventListener('click', () => {
                lotteryInstance.playSound('tick');
                this.typingBuffer = "";
                this.selectedNumber = (this.selectedNumber - 1 + 100) % 100;
                this.updateSpinner();
            });
        }

        // Spinner Increment
        if (this.btnInc) {
            this.btnInc.addEventListener('click', () => {
                lotteryInstance.playSound('tick');
                this.typingBuffer = "";
                this.selectedNumber = (this.selectedNumber + 1) % 100;
                this.updateSpinner();
            });
        }

        // Random Number selector
        if (this.btnRandom) {
            this.btnRandom.addEventListener('click', () => {
                lotteryInstance.playSound('buy');
                this.typingBuffer = "";
                this.selectedNumber = Math.floor(Math.random() * 100);
                this.updateSpinner();
            });
        }

        // Buy button
        if (this.btnBuy) {
            this.btnBuy.addEventListener('click', () => {
                if (this.isDrawingAnimation) return;
                const numStr = this.selectedNumber.toString().padStart(2, '0');
                const success = lotteryInstance.buyTicket(numStr);
                if (success) {
                    this.update();
                }
            });
        }

        // Claim button
        if (this.btnClaim) {
            this.btnClaim.addEventListener('click', () => {
                if (this.confetti) {
                    this.confetti.stop();
                    this.confetti = null;
                }
                if (this.countdownInterval) {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                }
                this.feedbackBanner.classList.add('hidden');
                this.typingBuffer = "";
                
                // Mark claimed
                if (lotteryInstance.lastDraw) {
                    lotteryInstance.lastDraw.claimed = true;
                    lotteryInstance.saveState();
                }

                // Reset slot balls visual
                Object.values(this.balls).forEach(ball => {
                    ball.innerText = '--';
                    ball.classList.remove('revealed', 'draw-glow-flash', 'dacbiet-rainbow-glow');
                    if (ball.parentElement) {
                        ball.parentElement.classList.remove('active-spin');
                    }
                });

                this.update();
            });
        }

        // Window Keyboard Typing Listener
        window.addEventListener('keydown', (e) => {
            if (!this.isOpen()) return;
            if (this.isDrawingAnimation) return;

            // Handle numbers 0-9
            if (e.key >= '0' && e.key <= '9') {
                this.typingBuffer += e.key;
                if (this.typingBuffer.length > 2) {
                    this.typingBuffer = e.key; // Reset to the newly pressed digit
                }
                this.selectedNumber = parseInt(this.typingBuffer, 10);
                this.updateSpinner();
                lotteryInstance.playSound('tick');
            } 
            // Handle backspace to delete/reset
            else if (e.key === 'Backspace') {
                e.preventDefault();
                if (this.typingBuffer.length > 0) {
                    this.typingBuffer = this.typingBuffer.slice(0, -1);
                    this.selectedNumber = this.typingBuffer.length > 0 ? parseInt(this.typingBuffer, 10) : 0;
                    this.updateSpinner();
                    lotteryInstance.playSound('tick');
                }
            }
            // Handle Enter to buy ticket
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.btnBuy && !this.btnBuy.disabled) {
                    this.btnBuy.click();
                }
            }
        });
    }

    isOpen() {
        return this.overlay && !this.overlay.classList.contains('hidden');
    }

    openLottery() {
        if (this.overlay) {
            // Close other UI overlays to avoid overlap
            const overlays = ['inventory-overlay', 'shop-overlay', 'sell-overlay'];
            overlays.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            if (window._phaserScene && window._phaserScene.ui) {
                window._phaserScene.ui.closeInventory();
            }

            this.overlay.classList.remove('remove'); // safety
            this.overlay.classList.remove('hidden');
            this.typingBuffer = "";

            // Restore slot balls visual and show results feedback banner if lastDraw is unclaimed
            if (lotteryInstance.lastDraw && !lotteryInstance.lastDraw.claimed) {
                const win = lotteryInstance.lastDraw.winningNumbers;
                
                this.balls.bet.innerText = win.bet;
                this.balls.bet.classList.add('revealed', 'draw-glow-flash');
                
                this.balls.ba.innerText = win.ba;
                this.balls.ba.classList.add('revealed', 'draw-glow-flash');
                
                this.balls.nhi.innerText = win.nhi;
                this.balls.nhi.classList.add('revealed', 'draw-glow-flash');
                
                this.balls.nhat.innerText = win.nhat;
                this.balls.nhat.classList.add('revealed', 'draw-glow-flash');
                
                this.balls.dacbiet.innerText = win.dacbiet;
                this.balls.dacbiet.classList.add('revealed', 'draw-glow-flash', 'dacbiet-rainbow-glow');

                this.showDrawFeedback(lotteryInstance.lastDraw.rewards, lotteryInstance.lastDraw.matches);
            } else {
                // Ensure the feedback banner is hidden and balls reset if there's no pending claim
                if (this.feedbackBanner) this.feedbackBanner.classList.add('hidden');
                Object.values(this.balls).forEach(ball => {
                    ball.innerText = '--';
                    ball.classList.remove('revealed', 'draw-glow-flash', 'dacbiet-rainbow-glow');
                    if (ball.parentElement) {
                        ball.parentElement.classList.remove('active-spin');
                    }
                });
            }

            this.update();

            // Disable scene keys in Phaser
            if (window._phaserScene && window._phaserScene.input && window._phaserScene.input.keyboard) {
                window._phaserScene.input.keyboard.enabled = false;
            }
        }
    }

    closeLottery() {
        if (this.isDrawingAnimation) return;

        if (this.overlay) {
            this.overlay.classList.add('hidden');
            if (this.btnClose) this.btnClose.blur();

            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }

            // Re-enable scene keys in Phaser
            if (window._phaserScene && window._phaserScene.input && window._phaserScene.input.keyboard) {
                window._phaserScene.input.keyboard.enabled = true;
            }
        }
    }

    updateSpinner() {
        if (this.numDisplay) {
            this.numDisplay.innerText = this.selectedNumber.toString().padStart(2, '0');
        }
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    update() {
        // 1. Timer Update
        const timeStr = this.formatTime(lotteryInstance.timeLeft);
        if (this.countdownSign) {
            this.countdownSign.innerText = timeStr;
        }
        if (this.hudTimer) {
            this.hudTimer.innerText = timeStr;
        }

        // 2. Tickets Badge & HUD Tickets count
        const ticketCount = lotteryInstance.tickets.length;
        if (this.hudTickets) {
            this.hudTickets.innerText = `${ticketCount} vé`;
        }
        if (this.totalCount) {
            this.totalCount.innerText = ticketCount;
        }

        // 3. Render Bought Tickets list
        if (this.boughtList) {
            this.boughtList.innerHTML = '';
            if (lotteryInstance.tickets.length === 0) {
                this.boughtList.innerHTML = '<div class="no-tickets-msg">Chưa mua vé nào</div>';
            } else {
                lotteryInstance.tickets.forEach((ticket, idx) => {
                    const el = document.createElement('div');
                    el.className = 'ticket-item';
                    el.innerHTML = `
                        <span class="ticket-icon">🎟️</span>
                        <span class="ticket-number">${ticket}</span>
                        <button class="btn-ticket-delete" title="Hủy & Hoàn tiền">✕</button>
                    `;
                    
                    const refundBtn = el.querySelector('.btn-ticket-delete');
                    if (this.isDrawingAnimation) {
                        refundBtn.style.display = 'none';
                    } else {
                        refundBtn.addEventListener('click', () => {
                            lotteryInstance.refundTicket(idx);
                        });
                    }
                    this.boughtList.appendChild(el);
                });
            }
        }

        // 4. Render History
        if (this.recentResultsList) {
            this.recentResultsList.innerHTML = '';
            if (lotteryInstance.history.length === 0) {
                this.recentResultsList.innerHTML = '<div class="no-history-msg">Chưa có kỳ quay nào</div>';
            } else {
                lotteryInstance.history.forEach(item => {
                    const el = document.createElement('div');
                    el.className = 'history-item';
                    el.innerHTML = `
                        <div class="history-time-meta">
                            <span class="hist-time">${item.time}</span>
                            <span>${item.date}</span>
                        </div>
                        <div class="history-balls">
                            <span class="hist-ball" title="Giải Bét">${item.numbers.bet}</span>
                            <span class="hist-ball" title="Giải Ba">${item.numbers.ba}</span>
                            <span class="hist-ball" title="Giải Nhì">${item.numbers.nhi}</span>
                            <span class="hist-ball" title="Giải Nhất">${item.numbers.nhat}</span>
                            <span class="hist-ball special" title="Giải Đặc Biệt">${item.numbers.dacbiet}</span>
                        </div>
                    `;
                    this.recentResultsList.appendChild(el);
                });
            }
        }

        // 5. Render Player Checked Results from Last Draw
        if (this.myTicketsCheckList) {
            this.myTicketsCheckList.innerHTML = '';
            
            if (!lotteryInstance.lastDraw || lotteryInstance.lastDraw.tickets.length === 0) {
                this.myTicketsCheckList.innerHTML = '<div class="no-tickets-check-msg">Chưa mua vé trong kỳ trước</div>';
                if (this.myRewardValue) this.myRewardValue.innerText = '🪙 0';
            } else {
                const draw = lotteryInstance.lastDraw;
                if (this.myRewardValue) this.myRewardValue.innerText = `🪙 ${draw.rewards}`;

                draw.matches.forEach(match => {
                    const el = document.createElement('div');
                    el.className = `my-check-item ${match.prize ? 'won' : 'lost'}`;
                    el.innerHTML = `
                        <span class="check-ticket-num">🎟️ ${match.ticket}</span>
                        <span class="check-ticket-status">${match.prize ? match.prize : 'Không trúng'}</span>
                        ${match.prize ? `<span class="check-ticket-reward">+🪙${match.reward} 🎉</span>` : ''}
                    `;
                    this.myTicketsCheckList.appendChild(el);
                });
            }
        }
    }

    // --- Raffle Wheel Scrolling animation ---
    animateDraw(winningNumbers, callback) {
        this.isDrawingAnimation = true;
        
        // Notify player via toast that draw is starting, showing a friendly prompt
        SaveSystem.showToast("Kỳ quay số bắt đầu! Nhấp vào 🎟️ ở góc trên để theo dõi 🎰", 4000);

        // Add glow to HUD badge
        if (this.hudBadge) {
            this.hudBadge.classList.add('drawing-hud-glow');
        }

        // Disable close button and buy actions if the panel is open
        if (this.btnClose) this.btnClose.style.pointerEvents = 'none';
        if (this.btnBuy) this.btnBuy.disabled = true;

        // Sequence of stops (staggered delay times in ms)
        const sequence = [
            { key: 'bet', number: winningNumbers.bet, delay: 1500 },
            { key: 'ba', number: winningNumbers.ba, delay: 2500 },
            { key: 'nhi', number: winningNumbers.nhi, delay: 3500 },
            { key: 'nhat', number: winningNumbers.nhat, delay: 4500 },
            { key: 'dacbiet', number: winningNumbers.dacbiet, delay: 5500 }
        ];

        // Start spinning intervals for all slots
        const intervals = {};
        Object.keys(this.balls).forEach(key => {
            const ball = this.balls[key];
            const slot = ball.parentElement;
            
            if (slot) {
                slot.classList.add('active-spin');
            }
            ball.classList.remove('revealed', 'draw-glow-flash', 'dacbiet-rainbow-glow');
            
            intervals[key] = setInterval(() => {
                ball.innerText = Math.floor(Math.random() * 100).toString().padStart(2, '0');
                lotteryInstance.playSound('roll');
            }, 60);
        });

        // Staggered stop logic
        sequence.forEach(item => {
            setTimeout(() => {
                // Clear the scroll interval
                clearInterval(intervals[item.key]);
                
                // Set final exact number
                const ball = this.balls[item.key];
                const slot = ball.parentElement;
                
                if (slot) {
                    slot.classList.remove('active-spin');
                }
                ball.innerText = item.number;
                ball.classList.add('revealed', 'draw-glow-flash');
                if (item.key === 'dacbiet') {
                    ball.classList.add('dacbiet-rainbow-glow');
                }
                lotteryInstance.playSound('tick');

                // If this is the last one (dacbiet), check results
                if (item.key === 'dacbiet') {
                    this.isDrawingAnimation = false;
                    if (this.btnClose) this.btnClose.style.pointerEvents = 'auto';
                    if (this.btnBuy) this.btnBuy.disabled = false;
                    
                    // Remove glow from HUD
                    if (this.hudBadge) {
                        this.hudBadge.classList.remove('drawing-hud-glow');
                    }

                    // Evaluate results
                    const checkResult = lotteryInstance.checkTickets(winningNumbers);
                    
                    // Call callback to store and reset in core
                    callback(checkResult.matches, checkResult.rewards);

                    // Mark claimed immediately if player lost, to avoid pending draw state on next open
                    if (checkResult.rewards === 0 && lotteryInstance.lastDraw) {
                        lotteryInstance.lastDraw.claimed = true;
                        lotteryInstance.saveState();
                    }

                    // Show visual feedback
                    if (this.isOpen()) {
                        this.showDrawFeedback(checkResult.rewards, checkResult.matches);
                    } else {
                        // Background completion toast notification
                        if (checkResult.rewards > 0) {
                            SaveSystem.showToast(`Xổ số kết thúc! Bạn đã trúng thưởng 🪙${checkResult.rewards} vàng! 🎉`, 5000);
                        } else if (checkResult.matches.length > 0) {
                            SaveSystem.showToast(`Xổ số kết thúc! Vé của bạn không trúng giải kỳ này. 🎟️💨`, 4000);
                        } else {
                            SaveSystem.showToast(`Xổ số kết thúc! Giải Đặc Biệt kỳ này là số ${winningNumbers.dacbiet} 👑`, 4000);
                        }
                    }
                }
            }, item.delay);
        });
    }

    showDrawFeedback(rewards, matches) {
        if (!this.feedbackBanner) return;

        this.feedbackBanner.classList.remove('hidden');
        
        if (rewards > 0) {
            // Show the claim button for winning draws
            if (this.btnClaim) this.btnClaim.style.display = 'inline-flex';

            const hasJackpot = matches.some(m => m.prize === 'Giải Đặc Biệt');
            lotteryInstance.playSound(hasJackpot ? 'special_win' : 'win');
            
            // Build won text list
            const wonDetails = matches
                .filter(m => m.prize !== null)
                .map(m => `Vé ${m.ticket} trúng ${m.prize}`)
                .join(', ');
            
            this.feedbackText.innerHTML = `🎉 <strong>Chúc mừng!</strong> Bạn đã trúng thưởng tổng cộng <strong>🪙 ${rewards} vàng</strong>! <br> <span style="font-size:0.75rem; opacity:0.85;">(${wonDetails})</span>`;
            
            // Launch confetti canvas overlay
            this.confetti = new ConfettiEffect();
        } else {
            // Hide the claim button for losing draws
            if (this.btnClaim) this.btnClaim.style.display = 'none';

            lotteryInstance.playSound('error');
            
            // Start live countdown from 3 to 0
            let secondsLeft = 3;
            this.feedbackText.innerHTML = `Chúc bạn may mắn lần sau! 🎟️💨 <span style="font-size:0.75rem; color:#cbd5e1; margin-left:8px; font-weight:normal;">(thông báo tự tắt sau <strong id="lotto-dismiss-sec" style="color:#f87171; font-weight:800;">3</strong> giây)</span>`;
            
            if (this.countdownInterval) clearInterval(this.countdownInterval);
            this.countdownInterval = setInterval(() => {
                secondsLeft--;
                const numSpan = document.getElementById('lotto-dismiss-sec');
                if (numSpan) {
                    numSpan.innerText = secondsLeft;
                }
                if (secondsLeft <= 0) {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                    if (this.btnClaim) {
                        this.btnClaim.click();
                    }
                }
            }, 1000);
        }
    }
}

// Confetti Effect Helper
class ConfettiEffect {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '999';
        
        const parent = document.getElementById('lottery-overlay') || document.body;
        parent.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.active = true;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        const colors = ['#f59e0b', '#dc2626', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
        for (let i = 0; i < 80; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * -this.canvas.height - 20,
                r: Math.random() * 6 + 4,
                d: Math.random() * this.canvas.height,
                color: colors[Math.floor(Math.random() * colors.length)],
                tilt: Math.random() * 10 - 5,
                tiltAngleIncremental: Math.random() * 0.07 + 0.02,
                tiltAngle: 0,
                vx: Math.random() * 2 - 1,
                vy: Math.random() * 3 + 2
            });
        }
        
        this.animate();
    }
    
    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth || window.innerWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight || window.innerHeight;
    }
    
    animate() {
        if (!this.active) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        let stillActive = false;
        this.particles.forEach(p => {
            p.tiltAngle += p.tiltAngleIncremental;
            p.y += p.vy;
            p.x += p.vx;
            p.tilt = Math.sin(p.tiltAngle - (p.r / 2)) * 10;
            
            if (p.y < this.canvas.height) {
                stillActive = true;
            }
            
            this.ctx.beginPath();
            this.ctx.lineWidth = p.r;
            this.ctx.strokeStyle = p.color;
            this.ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
            this.ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
            this.ctx.stroke();
        });
        
        if (stillActive) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.stop();
        }
    }
    
    stop() {
        this.active = false;
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

export const lotteryUIInstance = new LotteryUI();
window._lotteryUI = lotteryUIInstance; // Global reference
