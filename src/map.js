// Tiny Farm Village - Procedural Pixel Art Generator & Map Builder (Hybrid: real images + canvas fallback)

export class MapManager {

    // ── STEP 1: Preload all real PNG assets into Phaser ──────────────────────
    static preloadAssets(scene) {
        // Tile images - individual canvas-generated tiles (always reliable)
        // We'll generate canvas tiles for the ground to guarantee crisp rendering

        // Real AI-generated images for objects & characters
        scene.load.image('img_stall_seeds', 'assets/objects/stall_seeds.png');
        scene.load.image('img_stall_crops', 'assets/objects/stall_crops.png');
        scene.load.image('img_well',        'assets/objects/well.png');
        scene.load.image('img_tree',        'assets/objects/tree.png');
        scene.load.image('img_fence',       'assets/objects/fence.png');
        scene.load.image('img_seller',      'assets/npc/seller.png');
        scene.load.image('img_buyer',       'assets/npc/buyer.png');
        scene.load.image('img_stall_lottery', 'assets/objects/stall_lottery.png?v=' + Date.now());
        scene.load.image('img_lottery',       'assets/npc/lottery.png?v=' + Date.now());

        // Player spritesheet: AI generated 1024x1024 with 4 cols x 4 rows → 256x256 per frame
        // Down=col0, Left=col1, Right=col2, Up=col3 | rows=animation frames
        scene.load.spritesheet('img_player', 'assets/player/player.png', {
            frameWidth:  256,
            frameHeight: 256
        });

        // Crops spritesheet: 1024x1024 image → 4 cols × 4 rows of 256×256 frames (16 total)
        // Row 0=Carrot, Row 1=Tomato, Row 2=Pumpkin | Col 0-3 = stage1(seed)→stage4(ready)
        scene.load.spritesheet('img_crops', 'assets/crops/crops.png', {
            frameWidth:  256,
            frameHeight: 256
        });
    }

    // ── STEP 2: Generate canvas-based ground tile textures ──────────────────
    static generateTextures(scene) {

        const tileCfg = [
            { key: 'tile_grass',        w: 32, h: 32, fn: MapManager.drawGrassTile     },
            { key: 'tile_path',         w: 32, h: 32, fn: MapManager.drawPathTile      },
            { key: 'tile_water',        w: 32, h: 32, fn: MapManager.drawWaterTile     },
            { key: 'tile_bridge',       w: 32, h: 32, fn: MapManager.drawBridgeTile    },
            { key: 'tile_plot_empty',   w: 32, h: 32, fn: MapManager.drawPlotEmptyTile },
            { key: 'tile_grass2',       w: 32, h: 32, fn: MapManager.drawGrass2Tile    },
            { key: 'tile_water2',       w: 32, h: 32, fn: MapManager.drawWater2Tile    },
        ];

        // Always regenerate canvas tiles (needed for ground rendering)
        tileCfg.forEach(({ key, w, h, fn }) => {
            const canvas = document.createElement('canvas');
            canvas.width  = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            fn(ctx, w, h);
            if (scene.textures.exists(key)) scene.textures.remove(key);
            scene.textures.addCanvas(key, canvas);
        });

        // Generate player canvas frames as fallback (used if spritesheet failed to load or is wrong size)
        const dirs     = ['down', 'left', 'right', 'up'];
        const numFrames = 4;
        dirs.forEach(dir => {
            for (let f = 0; f < numFrames; f++) {
                const key = `player_${dir}_${f}`;
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 32;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                MapManager.drawPlayerFrame(ctx, dir, f);
                if (scene.textures.exists(key)) scene.textures.remove(key);
                scene.textures.addCanvas(key, canvas);
            }
        });

        // Canvas fallback NPC sprites (used if image failed)
        ['seller', 'buyer', 'lottery'].forEach(type => {
            const key = `char_${type}_canvas`;
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 32;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            MapManager.drawNPC(ctx, type);
            if (scene.textures.exists(key)) scene.textures.remove(key);
            scene.textures.addCanvas(key, canvas);
        });

        // Canvas stall fallbacks
        ['seeds', 'crops', 'lottery'].forEach(type => {
            const key = `stall_${type}_canvas`;
            const canvas = document.createElement('canvas');
            canvas.width  = 96;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            const label = type === 'seeds' ? 'HAT GIONG' : (type === 'crops' ? 'NONG SAN' : 'XO SO');
            const color = type === 'seeds' ? '#f8b436' : (type === 'crops' ? '#3682f8' : '#b91c1c');
            MapManager.drawStall(ctx, color, '#9c5a14', label);
            if (scene.textures.exists(key)) scene.textures.remove(key);
            scene.textures.addCanvas(key, canvas);
        });

        // Canvas crop fallbacks (individual frames)
        const cropCanvasMap = {
            'crop_seed':      (ctx) => MapManager.drawCropSeed(ctx),
            'crop_sprout':    (ctx) => MapManager.drawCropSprout(ctx),
            'carrot_growing': (ctx) => MapManager.drawCarrotGrowing(ctx),
            'carrot_ready':   (ctx) => MapManager.drawCarrotReady(ctx),
            'tomato_growing': (ctx) => MapManager.drawTomatoGrowing(ctx),
            'tomato_ready':   (ctx) => MapManager.drawTomatoReady(ctx),
            'pumpkin_growing':(ctx) => MapManager.drawPumpkinGrowing(ctx),
            'pumpkin_ready':  (ctx) => MapManager.drawPumpkinReady(ctx),
            'tile_plot_seed': (ctx) => MapManager.drawCropSeed(ctx),
        };
        Object.entries(cropCanvasMap).forEach(([key, fn]) => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 32;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            fn(ctx);
            if (scene.textures.exists(key)) scene.textures.remove(key);
            scene.textures.addCanvas(key, canvas);
        });

        // Well, tree, fence, sign and stall canvas fallbacks
        ['obj_well', 'obj_tree', 'obj_fence', 'obj_sign', 'obj_stall_seeds', 'obj_stall_crops', 'obj_stall_lottery'].forEach(key => {
            if (!scene.textures.exists(key)) {
                const w = key.includes('stall') ? 96 : key === 'obj_tree' ? 64 : key === 'obj_well' ? 64 : key === 'obj_fence' ? 64 : 32;
                const h = key.includes('stall') ? 64 : key === 'obj_tree' ? 96 : key === 'obj_well' ? 64 : key === 'obj_fence' ? 64 : 32;
                const canvas = document.createElement('canvas');
                canvas.width  = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                if (key === 'obj_well')  MapManager.drawWell(ctx, w, h);
                else if (key === 'obj_tree') MapManager.drawTree(ctx, w, h);
                else if (key === 'obj_fence') MapManager.drawFence(ctx);
                else if (key === 'obj_sign') MapManager.drawSign(ctx);
                else if (key === 'obj_stall_seeds') MapManager.drawStall(ctx, '#f8b436', '#9c5a14', 'HAT GIONG');
                else if (key === 'obj_stall_crops') MapManager.drawStall(ctx, '#3682f8', '#9c5a14', 'NONG SAN');
                else MapManager.drawStall(ctx, '#b91c1c', '#9c5a14', 'XO SO');
                scene.textures.addCanvas(key, canvas);
            }
        });
    }

    // ── STEP 3: Resolve which texture key to use (AI image or canvas fallback) ─
    static getTexKey(scene, aiKey, fallbackKey) {
        // Use AI image if it was loaded successfully
        if (scene.textures.exists(aiKey)) {
            const tex = scene.textures.get(aiKey);
            // Check if the texture has actual pixel data (not empty)
            if (tex && tex.source && tex.source[0] && tex.source[0].width > 1) {
                return aiKey;
            }
        }
        return fallbackKey;
    }

    // ── STEP 4: Build the world map ──────────────────────────────────────────
    static createMapLayout(scene) {
        const COLS = 25;
        const ROWS = 19;

        // 0=grass  1=path  2=water  3=bridge  4=plot
        const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

        // Water lake (left 4 columns)
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < 4; c++)
                grid[r][c] = 2;

        // Bridge at row 10 (spans from left edge of screen to land)
        grid[10][0] = 3; grid[10][1] = 3; grid[10][2] = 3; grid[10][3] = 3; grid[10][4] = 3;

        // Main horizontal path (row 10, cols 4→21)
        for (let c = 4; c < 22; c++) grid[10][c] = 1;

        // Vertical paths to shops
        for (let r = 5; r <= 9; r++) { grid[r][7] = 1; grid[r][17] = 1; }

        // Shop fronts
        for (let c = 6; c <= 8; c++) grid[5][c] = 1;
        for (let c = 16; c <= 18; c++) grid[5][c] = 1;

        // Path to well/farm (col 12)
        for (let r = 5; r <= 15; r++) grid[r][12] = 1;

        // Farm plots (80 plots grid: left 8x5, right 8x5)
        const plotCoords = [];
        const plotRows = [12, 13, 14, 15, 16]; // 5 rows
        const leftCols = [4, 5, 6, 7, 8, 9, 10, 11]; // 8 cols left of vertical path
        const rightCols = [13, 14, 15, 16, 17, 18, 19, 20]; // 8 cols right of vertical path

        let plotId = 0;
        plotRows.forEach((r, ri) => {
            // Left side
            leftCols.forEach((c, ci) => {
                grid[r][c] = 4;
                // Symmetrical starting plots: first 4 plots on top-left row are unlocked
                const isUnlocked = (ri === 0 && ci < 4);
                plotCoords.push({ 
                    id: plotId, 
                    gridX: c, 
                    gridY: r, 
                    pixelX: c * 32, 
                    pixelY: r * 32,
                    locked: !isUnlocked
                });
                plotId++;
            });
            // Right side
            rightCols.forEach((c, ci) => {
                grid[r][c] = 4;
                // Symmetrical starting plots: first 4 plots on top-right row are unlocked
                const isUnlocked = (ri === 0 && ci < 4);
                plotCoords.push({ 
                    id: plotId, 
                    gridX: c, 
                    gridY: r, 
                    pixelX: c * 32, 
                    pixelY: r * 32,
                    locked: !isUnlocked
                });
                plotId++;
            });
        });

        // Alternate grass tiles for visual variety
        const tileKeys = ['tile_grass', 'tile_path', 'tile_water', 'tile_bridge', 'tile_plot_empty'];

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const t = grid[r][c];
                let key = tileKeys[t] || 'tile_grass';

                // Add water variant for visual interest
                if (t === 2 && (r + c) % 3 === 0) key = 'tile_water2';
                // Add grass variant
                if (t === 0 && (r * 7 + c * 3) % 5 === 0) key = 'tile_grass2';

                scene.add.image(c * 32 + 16, r * 32 + 16, key).setDepth(0);
            }
        }

        // World physics bounds
        scene.physics.world.setBounds(0, 0, COLS * 32, ROWS * 32);

        return { grid, plotCoords, width: COLS * 32, height: ROWS * 32 };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  TILE DRAWING FUNCTIONS (Canvas fallback)
    // ═══════════════════════════════════════════════════════════════════════════

    static drawGrassTile(ctx) {
        // Rich base green
        ctx.fillStyle = '#5a8a3c';
        ctx.fillRect(0, 0, 32, 32);
        // Light patches
        ctx.fillStyle = '#6aa84f';
        ctx.fillRect(2, 2, 6, 4);
        ctx.fillRect(18, 14, 8, 5);
        ctx.fillRect(10, 24, 7, 4);
        // Darker patches
        ctx.fillStyle = '#4a7030';
        ctx.fillRect(24, 4, 6, 6);
        ctx.fillRect(8, 18, 5, 5);
        // Tiny flowers
        ctx.fillStyle = '#f8e86a';
        ctx.fillRect(5, 8, 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(21, 26, 2, 2);
        ctx.fillStyle = '#ff99cc';
        ctx.fillRect(27, 15, 2, 2);
        // Edge shadow
        ctx.fillStyle = 'rgba(0,0,0,0.07)';
        ctx.fillRect(0, 30, 32, 2);
        ctx.fillRect(30, 0, 2, 32);
    }

    static drawGrass2Tile(ctx) {
        ctx.fillStyle = '#4e7f38';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#62934a';
        ctx.fillRect(4, 4, 10, 6);
        ctx.fillRect(20, 18, 9, 6);
        ctx.fillStyle = '#3d6128';
        ctx.fillRect(14, 10, 6, 6);
        // Clover
        ctx.fillStyle = '#5aaa3a';
        ctx.fillRect(6, 22, 3, 3);
        ctx.fillRect(8, 20, 3, 3);
        ctx.fillRect(5, 20, 3, 3);
        // Small flower
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(25, 6, 2, 2);
    }

    static drawPathTile(ctx) {
        ctx.fillStyle = '#d4a85c';
        ctx.fillRect(0, 0, 32, 32);
        // Texture variation
        ctx.fillStyle = '#c49a4a';
        ctx.fillRect(3, 5, 5, 3);
        ctx.fillRect(20, 15, 7, 4);
        ctx.fillRect(12, 25, 6, 4);
        ctx.fillStyle = '#e4bc78';
        ctx.fillRect(8, 14, 4, 3);
        ctx.fillRect(24, 4, 5, 4);
        // Small pebbles
        ctx.fillStyle = '#b08040';
        ctx.fillRect(16, 8, 2, 2);
        ctx.fillRect(6, 20, 2, 2);
        ctx.fillRect(28, 22, 2, 2);
    }

    static drawWaterTile(ctx) {
        ctx.fillStyle = '#2a78cc';
        ctx.fillRect(0, 0, 32, 32);
        // Wave lines
        ctx.fillStyle = '#3a92e8';
        ctx.fillRect(4, 6, 14, 2);
        ctx.fillRect(18, 16, 10, 2);
        ctx.fillRect(6, 24, 12, 2);
        ctx.fillStyle = '#1a5ca0';
        ctx.fillRect(3, 9, 16, 1);
        ctx.fillRect(17, 19, 12, 1);
        // Highlight sparkle
        ctx.fillStyle = '#8cd4ff';
        ctx.fillRect(10, 5, 2, 1);
        ctx.fillRect(24, 15, 2, 1);
    }

    static drawWater2Tile(ctx) {
        ctx.fillStyle = '#1e6ab8';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#2e84d8';
        ctx.fillRect(2, 10, 18, 2);
        ctx.fillRect(22, 20, 8, 2);
        ctx.fillStyle = '#164e8a';
        ctx.fillRect(1, 13, 20, 1);
        ctx.fillRect(21, 23, 10, 1);
        ctx.fillStyle = '#6ec8f8';
        ctx.fillRect(14, 7, 3, 2);
        ctx.fillRect(5, 22, 3, 2);
    }

    static drawBridgeTile(ctx) {
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(2, 2, 28, 6);
        ctx.fillRect(2, 10, 28, 6);
        ctx.fillRect(2, 18, 28, 6);
        ctx.fillRect(2, 26, 28, 4);
        ctx.fillStyle = '#2c1a0e';
        [[4,4],[26,4],[4,12],[26,12],[4,20],[26,20],[4,28],[26,28]].forEach(([x,y]) =>
            ctx.fillRect(x, y, 2, 2)
        );
        // Wood grain
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(10, 2, 1, 28);
        ctx.fillRect(20, 2, 1, 28);
    }

    static drawPlotEmptyTile(ctx) {
        ctx.fillStyle = '#3a2010';
        ctx.fillRect(0, 0, 32, 32);
        // Soil texture
        ctx.fillStyle = '#4a2c18';
        ctx.fillRect(2, 2, 28, 28);
        // Plow ridges
        ctx.fillStyle = '#2a1608';
        ctx.fillRect(3, 8, 26, 2);
        ctx.fillRect(3, 16, 26, 2);
        ctx.fillRect(3, 24, 26, 2);
        // Highlight ridges
        ctx.fillStyle = '#5c3a20';
        ctx.fillRect(3, 6, 26, 2);
        ctx.fillRect(3, 14, 26, 2);
        ctx.fillRect(3, 22, 26, 2);
        // Border
        ctx.fillStyle = '#2a1208';
        ctx.fillRect(0, 0, 32, 2);
        ctx.fillRect(0, 0, 2, 32);
        ctx.fillRect(30, 0, 2, 32);
        ctx.fillRect(0, 30, 32, 2);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  CROP DRAWING FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    static drawCropSeed(ctx) {
        MapManager.drawPlotEmptyTile(ctx);
        ctx.fillStyle = '#c8a060';
        ctx.fillRect(13, 14, 6, 4);
        ctx.fillRect(15, 12, 2, 2);
    }

    static drawCropSprout(ctx) {
        MapManager.drawPlotEmptyTile(ctx);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(15, 10, 2, 12);
        ctx.fillRect(11, 12, 4, 2);
        ctx.fillRect(17, 10, 5, 2);
    }

    static drawCarrotGrowing(ctx) {
        MapManager.drawPlotEmptyTile(ctx);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(14, 8, 4, 8);
        ctx.fillRect(10, 12, 12, 2);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(13, 16, 6, 5);
    }

    static drawCarrotReady(ctx) {
        MapManager.drawPlotEmptyTile(ctx);
        ctx.fillStyle = '#15803d';
        ctx.fillRect(12, 4, 8, 8);
        ctx.fillRect(8, 8, 16, 2);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(11, 12, 10, 10);
        ctx.fillRect(13, 22, 6, 4);
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(13, 13, 2, 1);
    }

    static drawTomatoGrowing(ctx) {
        MapManager.drawPlotEmptyTile(ctx);
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(15, 4, 2, 24);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(11, 12, 10, 4);
        ctx.fillRect(10, 20, 12, 3);
        ctx.fillStyle = '#84cc16';
        ctx.fillRect(9, 14, 3, 3);
        ctx.fillRect(20, 21, 3, 3);
    }

    static drawTomatoReady(ctx) {
        MapManager.drawPlotEmptyTile(ctx);
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(15, 4, 2, 24);
        ctx.fillStyle = '#15803d';
        ctx.fillRect(9, 8, 14, 14);
        ctx.fillRect(7, 12, 18, 8);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(9, 13, 5, 5);
        ctx.fillRect(18, 11, 5, 5);
        ctx.fillRect(13, 19, 5, 5);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(10, 14, 1, 1);
        ctx.fillRect(19, 12, 1, 1);
    }

    static drawPumpkinGrowing(ctx) {
        MapManager.drawPlotEmptyTile(ctx);
        ctx.fillStyle = '#15803d';
        ctx.fillRect(4, 15, 24, 2);
        ctx.fillRect(8, 10, 4, 8);
        ctx.fillRect(20, 12, 4, 6);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(19, 9, 3, 3);
    }

    static drawPumpkinReady(ctx) {
        MapManager.drawPlotEmptyTile(ctx);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(7, 10, 18, 14);
        ctx.fillRect(5, 12, 22, 10);
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(12, 10, 2, 14);
        ctx.fillRect(18, 10, 2, 14);
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(15, 6, 2, 4);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(17, 7, 4, 3);
        // Highlight
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(8, 12, 3, 4);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  OBJECT CANVAS FALLBACKS
    // ═══════════════════════════════════════════════════════════════════════════

    static drawTree(ctx, w, h) {
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(28, 60, 8, h - 60);
        ctx.fillStyle = '#3a2212';
        ctx.fillRect(28, 60, 3, h - 60);
        ctx.fillRect(24, h - 8, 16, 8);
        ctx.fillStyle = '#2d4c1e';
        ctx.beginPath(); ctx.arc(32, 56, 26, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#3c5a31';
        ctx.beginPath(); ctx.arc(32, 42, 22, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#557a46';
        ctx.beginPath(); ctx.arc(32, 26, 16, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#7a9e64';
        ctx.beginPath(); ctx.arc(28, 20, 8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(24, 38, 10, 0, Math.PI*2); ctx.fill();
    }

    static drawWell(ctx, w, h) {
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(12, 44, 40, 20);
        ctx.fillStyle = '#374151';
        for (let i = 12; i < 52; i += 8) ctx.fillRect(i, 44, 1, 20);
        ctx.fillRect(12, 54, 40, 2);
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(20, 20, 4, 24);
        ctx.fillRect(40, 20, 4, 24);
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(28, 24, 8, 2);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(30, 30, 4, 6);
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.moveTo(8, 20); ctx.lineTo(32, 4); ctx.lineTo(56, 20);
        ctx.closePath(); ctx.fill();
    }

    static drawFence(ctx) {
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(6, 4, 4, 28);
        ctx.fillRect(22, 4, 4, 28);
        ctx.fillStyle = '#a67b5b';
        ctx.fillRect(7, 2, 2, 2);
        ctx.fillRect(23, 2, 2, 2);
        ctx.fillStyle = '#734a26';
        ctx.fillRect(0, 10, 32, 4);
        ctx.fillRect(0, 22, 32, 4);
    }

    static drawSign(ctx) {
        // Brown wood color
        ctx.fillStyle = '#8b5a2b';
        // Post
        ctx.fillRect(14, 16, 4, 16);
        // Board
        ctx.fillStyle = '#cd853f';
        ctx.fillRect(4, 4, 24, 12);
        // Border for board
        ctx.strokeStyle = '#5c3a21';
        ctx.lineWidth = 1;
        ctx.strokeRect(4, 4, 24, 12);
        // Some tiny text lines on sign
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(7, 7, 18, 1);
        ctx.fillRect(9, 11, 14, 1);
    }

    static drawStall(ctx, roofColor, poleColor, label) {
        ctx.fillStyle = poleColor;
        ctx.fillRect(18, 12, 4, 52);
        ctx.fillRect(74, 12, 4, 52);
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(12, 40, 72, 24);
        ctx.fillStyle = '#3a2212';
        ctx.fillRect(12, 40, 72, 2);
        ctx.fillStyle = roofColor;
        ctx.fillRect(10, 2, 76, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(22, 2, 12, 12);
        ctx.fillRect(46, 2, 12, 12);
        ctx.fillRect(70, 2, 12, 12);
        ctx.fillStyle = '#3a2212';
        ctx.fillRect(24, 18, 48, 10);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 48, 23);
    }

    // ── Player frame drawing ─────────────────────────────────────────────────
    static drawPlayerFrame(ctx, dir, frame) {
        const hat      = '#f59e0b';
        const overalls = '#1d4ed8';
        const skin     = '#ffedd5';
        const boots    = '#451a03';

        ctx.fillStyle = overalls;
        ctx.fillRect(10, 16, 12, 10);
        ctx.fillStyle = skin;
        ctx.fillRect(12, 8, 8, 8);
        ctx.fillStyle = hat;
        ctx.fillRect(6, 8, 20, 3);
        ctx.fillRect(10, 4, 12, 4);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(10, 7, 12, 1);
        ctx.fillStyle = '#000';
        if (dir === 'down')  { ctx.fillRect(13, 11, 1, 2); ctx.fillRect(18, 11, 1, 2); }
        else if (dir === 'left')  ctx.fillRect(11, 11, 1, 2);
        else if (dir === 'right') ctx.fillRect(20, 11, 1, 2);
        ctx.fillStyle = boots;
        const isStep = frame === 1 || frame === 3;
        const altFoot = frame === 3;
        if (dir === 'down' || dir === 'up') {
            ctx.fillRect(10, 26, 3, isStep && !altFoot ? 5 : isStep ? 3 : 4);
            ctx.fillRect(18, 26, 3, isStep && altFoot  ? 5 : isStep ? 3 : 4);
        } else {
            if (isStep) {
                ctx.fillRect(11, 26, 4, altFoot ? 3 : 5);
                ctx.fillRect(17, 26, 4, altFoot ? 5 : 3);
            } else {
                ctx.fillRect(11, 26, 10, 4);
            }
        }
    }

    static drawNPC(ctx, type) {
        if (type === 'lottery') {
            // Draw Straw Hat & Overalls Lottery Seller (Based on Reference Image)
            const skin = '#fed7aa';
            const purpleShirt = '#6b21a8';
            const brownOveralls = '#78350f';
            const strawHat = '#d9a05b';
            const hatBand = '#451a03';
            const mustache = '#1a0c00';
            const boots = '#1a0c00';

            // 1. Draw Body/Clothes (purple shirt first)
            ctx.fillStyle = purpleShirt;
            ctx.fillRect(10, 16, 12, 10);

            // 2. Draw Overalls over the shirt
            ctx.fillStyle = brownOveralls;
            ctx.fillRect(12, 18, 8, 8); // center chest and trousers
            ctx.fillRect(12, 16, 1, 2); // left strap
            ctx.fillRect(19, 16, 1, 2); // right strap

            // 3. Draw Head (skin tone)
            ctx.fillStyle = skin;
            ctx.fillRect(12, 9, 8, 8);

            // 4. Draw Mustache & Face features
            ctx.fillStyle = mustache;
            ctx.fillRect(12, 14, 8, 2); // mustache
            ctx.fillStyle = '#000000';
            ctx.fillRect(13, 11, 1, 1); // left eye
            ctx.fillRect(18, 11, 1, 1); // right eye

            // 5. Draw Straw Hat
            ctx.fillStyle = strawHat;
            ctx.fillRect(8, 7, 16, 2); // wide brim
            ctx.fillRect(11, 3, 10, 4); // hat crown
            ctx.fillStyle = hatBand;
            ctx.fillRect(11, 6, 10, 1); // hat band

            // 6. Draw Boots
            ctx.fillStyle = boots;
            ctx.fillRect(10, 26, 3, 3);
            ctx.fillRect(19, 26, 3, 3);
        } else {
            // Standard blocky NPCs (seller / buyer)
            let clothes, hat, skin, beardColor;
            if (type === 'seller') {
                clothes = '#047857'; // green coat
                hat     = '#78350f'; // brown hat
                skin    = '#fed7aa';
                beardColor = '#451a03';
            } else { // buyer
                clothes = '#b91c1c'; // red coat
                hat     = '#1e3a8a'; // blue hat
                skin    = '#fed7aa';
                beardColor = '#451a03';
            }
            
            ctx.fillStyle = clothes;
            ctx.fillRect(10, 16, 12, 10);
            ctx.fillStyle = skin;
            ctx.fillRect(12, 8, 8, 8);
            ctx.fillStyle = beardColor;
            ctx.fillRect(12, 13, 8, 2);
            ctx.fillStyle = '#000000';
            ctx.fillRect(13, 10, 1, 1);
            ctx.fillRect(18, 10, 1, 1);
            ctx.fillStyle = hat;
            ctx.fillRect(10, 6, 12, 3);
            ctx.fillRect(11, 4, 10, 2);
            ctx.fillStyle = '#000000';
            ctx.fillRect(10, 26, 3, 3);
            ctx.fillRect(19, 26, 3, 3);
        }
    }

    // Dynamic wooden signboard generator (supports 'hanging' for stalls and 'board' for posts/placards)
    static createWoodenSign(scene, x, y, text, styleType = 'hanging') {
        const textStyle = {
            fontFamily: "'Nunito', 'Be Vietnam Pro', sans-serif",
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#fff6eb',
            align: 'center'
        };
        
        // Measure text size
        const tempText = scene.make.text({ text: text, style: textStyle });
        const textWidth = tempText.width;
        const textHeight = tempText.height;
        tempText.destroy();
        
        const paddingX = 8;
        const paddingY = 4;
        const w = textWidth + paddingX * 2;
        const h = textHeight + paddingY * 2;
        
        // Create container
        const container = scene.add.container(x, y);
        container.setDepth(y + 10);
        
        // Draw sign graphic
        const g = scene.add.graphics();
        
        // Ropes/chains (only for hanging signs)
        if (styleType === 'hanging') {
            g.lineStyle(1.5, 0x3a2212, 1);
            g.lineBetween(-w/3, -h/2, -w/3, -h/2 - 8);
            g.lineBetween(w/3, -h/2, w/3, -h/2 - 8);
        }
        
        // Outer drop shadow
        g.fillStyle(0x000000, 0.25);
        g.fillRoundedRect(-w/2 + 2, -h/2 + 2, w, h, 4);
        
        // Dark wood border
        g.fillStyle(0x3a2212, 1);
        g.fillRoundedRect(-w/2, -h/2, w, h, 4);
        
        // Warm wood center
        g.fillStyle(0x8d5c38, 1);
        g.fillRoundedRect(-w/2 + 1.5, -h/2 + 1.5, w - 3, h - 3, 3);
        
        // Gold accent frame
        g.lineStyle(1, 0xe5a65d, 0.4);
        g.strokeRoundedRect(-w/2 + 3, -h/2 + 3, w - 6, h - 6, 2);
        
        // Corner gold nails
        g.fillStyle(0xffdd99, 0.8);
        g.fillRect(-w/2 + 3, -h/2 + 3, 1, 1);
        g.fillRect(w/2 - 4, -h/2 + 3, 1, 1);
        g.fillRect(-w/2 + 3, h/2 - 4, 1, 1);
        g.fillRect(w/2 - 4, h/2 - 4, 1, 1);
        
        container.add(g);
        
        // Actual text
        const textObj = scene.add.text(0, 0, text, textStyle);
        textObj.setOrigin(0.5, 0.5);
        textObj.setShadow(0, 1, 'rgba(0, 0, 0, 0.65)', 2);
        container.add(textObj);
        
        return container;
    }
}
