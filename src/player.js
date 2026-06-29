// Tiny Farm Village - Player Controller & Input Handling
// Uses AI-generated spritesheet if loaded, canvas fallback otherwise

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        // Determine which texture to use (AI spritesheet vs canvas fallback)
        const useAI = Player.hasAISheet(scene);
        const startTex = useAI ? 'img_player' : 'player_down_0';
        const startFrame = useAI ? 0 : undefined;

        super(scene, x, y, startTex, startFrame);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Scale AI sprites (256px frames) down to game scale (~52px on screen)
        if (useAI) this.setScale(0.2);

        this.body.setSize(20, 8); // Slim 8px height feet hitbox for smooth navigation
        // Offsets are in WORLD pixels (not sprite pixels)
        // AI sprite: 256px frame × scale 0.2 → 51.2px displayed
        //   offsetX: center body horizontally → (51.2 - 20) / 2 ≈ 15
        //   offsetY: place body at feet → 51.2 - 8 = 43.2 → use 43
        // Canvas sprite: 32px frame × scale 1.0 → 32px displayed
        //   offsetX: (32 - 20) / 2 = 6
        //   offsetY: 32 - 8 = 24
        this.body.setOffset(useAI ? 15 : 6, useAI ? 43 : 24);
        this.body.setCollideWorldBounds(true);

        this.scene      = scene;
        this.playerName = '';
        this.nameTag = scene.add.text(x, y, '', {
            fontFamily: "'Outfit', 'Be Vietnam Pro', 'Arial', sans-serif",
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#1e1b4b',
            strokeThickness: 3.5,
            align: 'center'
        }).setOrigin(0.5);
        this.nameTag.setDepth(20000);

        this.on('destroy', () => {
            if (this.nameTag) {
                this.nameTag.destroy();
                this.nameTag = null;
            }
        });
        this.speed      = 120;
        this.facingDir  = 'down';
        this._useAI     = useAI;
        this.touchVelocity = { x: 0, y: 0 };

        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wasd    = scene.input.keyboard.addKeys({
            up:    Phaser.Input.Keyboard.KeyCodes.W,
            left:  Phaser.Input.Keyboard.KeyCodes.A,
            down:  Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        this.initAnimations();
    }

    static hasAISheet(scene) {
        if (!scene.textures.exists('img_player')) return false;
        const tex = scene.textures.get('img_player');
        return tex && tex.source && tex.source[0] && tex.source[0].width > 32;
    }

    initAnimations() {
        const anims = this.scene.anims;
        const dirs  = ['down', 'left', 'right', 'up'];

        if (this._useAI) {
            // AI spritesheet: 4 cols (directions) x 4 rows (frames)
            // Frame index = row * 4 + col
            // Col: 0=down, 1=left, 2=right, 3=up
            // Rows 0-1: idle, Rows 2-3: walk
            dirs.forEach((dir, colIdx) => {
                const idleKey  = `player_idle_${dir}`;
                const walkKey  = `player_walk_${dir}`;

                if (!anims.exists(idleKey)) {
                    anims.create({
                        key: idleKey,
                        frames: [
                            { key: 'img_player', frame: 0 * 4 + colIdx },
                            { key: 'img_player', frame: 1 * 4 + colIdx }
                        ],
                        frameRate: 2,
                        repeat: -1
                    });
                }

                if (!anims.exists(walkKey)) {
                    anims.create({
                        key: walkKey,
                        frames: [
                            { key: 'img_player', frame: 0 * 4 + colIdx },
                            { key: 'img_player', frame: 2 * 4 + colIdx },
                            { key: 'img_player', frame: 1 * 4 + colIdx },
                            { key: 'img_player', frame: 3 * 4 + colIdx },
                        ],
                        frameRate: 8,
                        repeat: -1
                    });
                }
            });
        } else {
            // Canvas fallback: individual textures per frame
            dirs.forEach(dir => {
                const walkKey = `player_walk_${dir}`;
                const idleKey = `player_idle_${dir}`;
                if (!anims.exists(walkKey)) {
                    anims.create({
                        key: walkKey,
                        frames: [
                            { key: `player_${dir}_0` },
                            { key: `player_${dir}_1` },
                            { key: `player_${dir}_2` },
                            { key: `player_${dir}_3` }
                        ],
                        frameRate: 8,
                        repeat: -1
                    });
                }
                if (!anims.exists(idleKey)) {
                    anims.create({
                        key: idleKey,
                        frames: [{ key: `player_${dir}_0` }],
                        frameRate: 1
                    });
                }
            });
        }
    }

    update() {
        if (!this.body) return;

        // Position name tag perfectly aligned above the player's head
        if (this.nameTag) {
            this.nameTag.x = this.x;
            this.nameTag.y = this.y - (this._useAI ? 30 : 18);
            this.nameTag.setText(this.playerName || '');
        }

        this.body.setVelocity(0);

        let vx = 0, vy = 0;

        if      (this.cursors.left.isDown  || this.wasd.left.isDown)  { vx = -this.speed; this.facingDir = 'left';  }
        else if (this.cursors.right.isDown || this.wasd.right.isDown) { vx =  this.speed; this.facingDir = 'right'; }

        if      (this.cursors.up.isDown    || this.wasd.up.isDown)    { vy = -this.speed; this.facingDir = 'up';    }
        else if (this.cursors.down.isDown  || this.wasd.down.isDown)  { vy =  this.speed; this.facingDir = 'down';  }

        // Touch virtual joystick override if no keyboard input is active
        if (vx === 0 && vy === 0 && (this.touchVelocity.x !== 0 || this.touchVelocity.y !== 0)) {
            vx = this.touchVelocity.x;
            vy = this.touchVelocity.y;
            
            // Set facing direction based on stronger vector component
            if (Math.abs(vy) > Math.abs(vx)) {
                this.facingDir = vy < 0 ? 'up' : 'down';
            } else {
                this.facingDir = vx < 0 ? 'left' : 'right';
            }
        }

        // Diagonal normalization (only for keyboard, joystick is pre-normalized)
        if (vx !== 0 && vy !== 0 && (this.cursors.up.isDown || this.cursors.down.isDown || this.wasd.up.isDown || this.wasd.down.isDown)) { 
            vx *= 0.7071; 
            vy *= 0.7071; 
        }
        
        this.body.setVelocity(vx, vy);

        const isMoving = vx !== 0 || vy !== 0;
        let animDir = this.facingDir;
        if (isMoving) {
            if (Math.abs(vy) > Math.abs(vx)) animDir = vy < 0 ? 'up' : 'down';
            else                              animDir = vx < 0 ? 'left' : 'right';
            this.play(`player_walk_${animDir}`, true);
        } else {
            this.play(`player_idle_${this.facingDir}`, true);
        }
    }

    getFacingGridPos() {
        let ox = 0, oy = 0;
        const d = 28;
        if (this.facingDir === 'up')    oy = -d;
        if (this.facingDir === 'down')  oy =  d;
        if (this.facingDir === 'left')  ox = -d;
        if (this.facingDir === 'right') ox =  d;
        const qx = this.x + ox;
        const qy = this.y + oy + 8;
        return { gridX: Math.floor(qx / 32), gridY: Math.floor(qy / 32), pixelX: qx, pixelY: qy };
    }

    // Expose facingDirection alias used by game.js
    get facingDirection() { return this.facingDir; }

    setName(name) {
        this.playerName = name;
        if (this.nameTag) {
            this.nameTag.setText(name);
            this.nameTag.x = this.x;
            this.nameTag.y = this.y - (this._useAI ? 30 : 18);
        }
    }
}

export default Player;
