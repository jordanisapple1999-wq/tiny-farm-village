// Tiny Farm Village - Dynamic Audio System (BGM via YouTube & Procedural SFX Synthesis)

class SoundManager {
    constructor() {
        this.audioCtx = null;
        this.isMuted = false;
        this.bgmVolume = 0.15; // Relaxing, low BGM volume
        this.sfxVolume = 0.1;  // Crisp, pleasant SFX volume
        this.ytPlayer = null;
        this.ytReady = false;
        this.bgmShouldPlay = false;

        this.initYoutubeAPI();
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

    // Load the YouTube Iframe Player API code asynchronously
    initYoutubeAPI() {
        // Expose callback globally so YouTube API can call it when ready
        window.onYouTubeIframeAPIReady = () => {
            this.initYoutubePlayer();
        };

        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
            document.head.appendChild(tag);
        }
    }

    // Create the YouTube player object
    initYoutubePlayer() {
        try {
            this.ytPlayer = new YT.Player('youtube-bgm-container', {
                height: '1',
                width: '1',
                videoId: '5mxT40MnNi0',
                playerVars: {
                    'autoplay': 0,
                    'loop': 1,
                    'playlist': '5mxT40MnNi0', // Required for looping single video in YT player
                    'controls': 0,
                    'disablekb': 1,
                    'fs': 0,
                    'modestbranding': 1,
                    'rel': 0,
                    'showinfo': 0
                },
                events: {
                    'onReady': (event) => {
                        this.ytReady = true;
                        // YouTube volume range is 0 to 100
                        event.target.setVolume(this.isMuted ? 0 : this.bgmVolume * 100);
                        if (this.bgmShouldPlay && !this.isMuted) {
                            event.target.playVideo();
                        }
                    },
                    'onStateChange': (event) => {
                        // Fallback loop handling
                        if (event.data === YT.PlayerState.ENDED) {
                            event.target.playVideo();
                        }
                    }
                }
            });
        } catch (e) {
            console.warn("YouTube Player initialization failed:", e);
        }
    }

    // Initialize and play background music
    initBGM() {
        this.initAudioContext();
        this.bgmShouldPlay = true;
        this.playBGM();
    }

    playBGM() {
        if (this.ytReady && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
            if (!this.isMuted) {
                this.ytPlayer.unMute();
                this.ytPlayer.setVolume(this.bgmVolume * 100);
                this.ytPlayer.playVideo();
            }
        }
    }

    // Toggle BGM mute status
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.ytReady && this.ytPlayer) {
            if (this.isMuted) {
                if (typeof this.ytPlayer.mute === 'function') this.ytPlayer.mute();
                if (typeof this.ytPlayer.pauseVideo === 'function') this.ytPlayer.pauseVideo();
            } else {
                if (typeof this.ytPlayer.unMute === 'function') this.ytPlayer.unMute();
                if (typeof this.ytPlayer.setVolume === 'function') this.ytPlayer.setVolume(this.bgmVolume * 100);
                this.bgmShouldPlay = true;
                this.playBGM();
            }
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
