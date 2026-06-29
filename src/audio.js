// Tiny Farm Village - Dynamic Audio System (BGM & Procedural SFX Synthesis)

class SoundManager {
    constructor() {
        this.audioCtx = null;
        this.bgm = null;
        this.bgmUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3';
        this.isMuted = false;
        this.bgmStarted = false;
        this.bgmVolume = 0.15; // Relaxing, low BGM volume
        this.sfxVolume = 0.1;  // Crisp, pleasant SFX volume
    }

    // Initialize Web Audio Context on first user action
    initAudioContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    // Initialize and play background music
    initBGM() {
        if (this.bgmStarted) return;
        this.initAudioContext();

        try {
            this.bgm = new Audio(this.bgmUrl);
            this.bgm.loop = true;
            this.bgm.volume = this.isMuted ? 0 : this.bgmVolume;
            
            // Handle play promise
            const playPromise = this.bgm.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.bgmStarted = true;
                    console.log("BGM started successfully.");
                }).catch(err => {
                    console.log("Autoplay blocked or BGM failed to load. Will retry on next interaction.", err);
                });
            }
        } catch (e) {
            console.warn("BGM initialization failed:", e);
        }
    }

    // Toggle BGM mute status
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.bgm) {
            this.bgm.volume = this.isMuted ? 0 : this.bgmVolume;
        }
        return this.isMuted;
    }

    // Play procedural pixel sound effects using Web Audio API
    playSFX(type) {
        try {
            this.initAudioContext();
            if (!this.audioCtx || this.isMuted) return;

            const ctx = this.audioCtx;
            const now = ctx.currentTime;

            if (type === 'click') {
                // Short retro beep
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

                gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.08);
            }
            else if (type === 'plant') {
                // Soft organic rustle / downward glide
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.15);

                gain.gain.setValueAtTime(this.sfxVolume * 0.8, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
            }
            else if (type === 'water') {
                // Splish-splash bubbly sound
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
                
                // Add rapid vibrato/frequency wobble for bubbling effect
                const mod = ctx.createOscillator();
                const modGain = ctx.createGain();
                mod.frequency.value = 35; // 35Hz wobble
                modGain.gain.value = 80;  // 80Hz amplitude of wobble
                
                mod.connect(modGain);
                modGain.connect(osc.frequency);
                
                gain.gain.setValueAtTime(this.sfxVolume * 0.6, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                osc.connect(gain);
                gain.connect(ctx.destination);
                
                mod.start(now);
                osc.start(now);
                mod.stop(now + 0.15);
                osc.stop(now + 0.15);
            }
            else if (type === 'harvest') {
                // Sparkling golden chime (rising major arpeggio)
                const freqs = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G5, C6, E6, G6, C7
                freqs.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.05);
                    
                    gain.gain.setValueAtTime(this.sfxVolume * 0.4, now + idx * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.05);
                    osc.stop(now + idx * 0.05 + 0.26);
                });
            }
            else if (type === 'coin') {
                // Classic double-tone coin sound (Buy/Sell)
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(987.77, now); // B5
                osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

                gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
                gain.gain.setValueAtTime(this.sfxVolume * 0.5, now + 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.35);
            }
            else if (type === 'save') {
                // Success fan-fare sound (three quick notes)
                const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
                freqs.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.07);
                    
                    gain.gain.setValueAtTime(this.sfxVolume * 0.6, now + idx * 0.07);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.07);
                    osc.stop(now + idx * 0.07 + 0.26);
                });
            }
            else if (type === 'error' || type === 'lock') {
                // Low buzzer (double buzz)
                [0, 0.1].forEach((delay) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(120, now + delay);
                    
                    gain.gain.setValueAtTime(this.sfxVolume * 0.5, now + delay);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + delay);
                    osc.stop(now + delay + 0.12);
                });
            }
            else if (type === 'dialogue_next') {
                // Soft retro pop
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.exponentialRampToValueAtTime(250, now + 0.05);

                gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.05);
            }
        } catch (e) {
            console.warn("SFX play failed:", e);
        }
    }
}

export const soundManager = new SoundManager();
window._soundManager = soundManager; // Expose to window for easier global access if needed
