// Tiny Farm Village - Dialogue System

export class DialogueSystem {
    constructor() {
        this.overlay = document.getElementById('dialogue-overlay');
        this.speakerName = document.getElementById('dialogue-speaker-name');
        this.avatar = document.getElementById('dialogue-avatar-img');
        this.textContainer = document.getElementById('dialogue-text');
        this.btnNext = document.getElementById('btn-dialogue-next');
        this.btnClose = document.getElementById('btn-dialogue-close');

        this.dialogues = [];
        this.currentIndex = 0;
        this.typingInterval = null;
        this.isTyping = false;
        this.currentText = '';
        this.typedText = '';
        this.onCompleteCallback = null;

        this.initEvents();
    }

    initEvents() {
        if (!this.btnNext || !this.btnClose) return;

        this.btnNext.addEventListener('click', () => {
            this.handleNext();
        });

        this.btnClose.addEventListener('click', () => {
            this.close();
        });

        // Keyboard listener to advance dialogue (Space, Enter, E) or close (Escape)
        window.addEventListener('keydown', (e) => {
            if (!this.isOpen()) return;

            if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
                e.preventDefault();
                this.handleNext();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }
        });
    }

    startDialogue(dialogueArray, onComplete = null) {
        this.dialogues = dialogueArray;
        this.currentIndex = 0;
        this.onCompleteCallback = onComplete;

        this.overlay.classList.remove('hidden');
        // Pause Phaser keyboard so E key doesn't bleed into the game
        if (window._phaserScene && window._phaserScene.input) {
            window._phaserScene.input.keyboard.enabled = false;
        }
        this.showCurrentDialogue();
    }

    showCurrentDialogue() {
        if (this.currentIndex >= this.dialogues.length) {
            this.complete();
            return;
        }

        const current = this.dialogues[this.currentIndex];
        this.speakerName.innerText = current.speaker || 'Người lạ';
        this.avatar.innerText = current.avatar || '👤';
        this.currentText = current.text || '';
        
        // Setup buttons
        if (this.currentIndex === this.dialogues.length - 1) {
            this.btnNext.innerText = 'Bắt đầu giao dịch ➜';
        } else {
            this.btnNext.innerText = 'Tiếp theo ➜';
        }

        this.startTypewriter();
    }

    startTypewriter() {
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
        }

        this.isTyping = true;
        this.typedText = '';
        this.textContainer.innerText = '';
        
        let charIndex = 0;
        const typingSpeed = 25; // ms per character

        this.typingInterval = setInterval(() => {
            if (charIndex < this.currentText.length) {
                this.typedText += this.currentText[charIndex];
                this.textContainer.innerText = this.typedText;
                charIndex++;
            } else {
                this.finishTyping();
            }
        }, typingSpeed);
    }

    finishTyping() {
        clearInterval(this.typingInterval);
        this.textContainer.innerText = this.currentText;
        this.isTyping = false;
    }

    handleNext() {
        if (this.isTyping) {
            // If typing, show all text instantly
            this.finishTyping();
        } else {
            // Otherwise, advance to next dialogue block
            this.currentIndex++;
            this.showCurrentDialogue();
        }
    }

    complete() {
        this.close();
        if (this.onCompleteCallback) {
            this.onCompleteCallback();
        }
    }

    close() {
        if (this.typingInterval) clearInterval(this.typingInterval);
        this.overlay.classList.add('hidden');
        this.isTyping = false;
        this.btnClose.blur();
        this.btnNext.blur();
        // Re-enable Phaser keyboard
        if (window._phaserScene && window._phaserScene.input) {
            window._phaserScene.input.keyboard.enabled = true;
        }
    }

    isOpen() {
        return !this.overlay.classList.contains('hidden');
    }
}

export const dialogueInstance = new DialogueSystem();
