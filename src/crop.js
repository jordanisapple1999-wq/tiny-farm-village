// Tiny Farm Village - Crops Configuration

export const CROPS = {
    carrot: {
        id: 'carrot',
        name: 'Cà rốt',
        englishName: 'Carrot',
        seedCost: 5,
        growTime: 10, // seconds
        sellPrice: 12,
        icon: '🥕',
        growthStages: [
            { stage: 0, label: 'Đất trống', key: 'plot_empty' },
            { stage: 1, label: 'Hạt giống', key: 'crop_seed' },
            { stage: 2, label: 'Mầm cây', key: 'crop_sprout' },
            { stage: 3, label: 'Lớn dần', key: 'carrot_growing' },
            { stage: 4, label: 'Sẵn sàng thu hoạch', key: 'carrot_ready' }
        ],
        colors: {
            primary: '#fb923c', // Orange
            secondary: '#4ade80' // Green stem
        }
    },
    tomato: {
        id: 'tomato',
        name: 'Cà chua',
        englishName: 'Tomato',
        seedCost: 10,
        growTime: 20, // seconds
        sellPrice: 25,
        icon: '🍅',
        growthStages: [
            { stage: 0, label: 'Đất trống', key: 'plot_empty' },
            { stage: 1, label: 'Hạt giống', key: 'crop_seed' },
            { stage: 2, label: 'Mầm cây', key: 'crop_sprout' },
            { stage: 3, label: 'Lớn dần', key: 'tomato_growing' },
            { stage: 4, label: 'Sẵn sàng thu hoạch', key: 'tomato_ready' }
        ],
        colors: {
            primary: '#ef4444', // Red
            secondary: '#22c55e' // Green stem
        }
    },
    pumpkin: {
        id: 'pumpkin',
        name: 'Bí ngô',
        englishName: 'Pumpkin',
        seedCost: 20,
        growTime: 35, // seconds
        sellPrice: 55,
        icon: '🎃',
        growthStages: [
            { stage: 0, label: 'Đất trống', key: 'plot_empty' },
            { stage: 1, label: 'Hạt giống', key: 'crop_seed' },
            { stage: 2, label: 'Mầm cây', key: 'crop_sprout' },
            { stage: 3, label: 'Lớn dần', key: 'pumpkin_growing' },
            { stage: 4, label: 'Sẵn sàng thu hoạch', key: 'pumpkin_ready' }
        ],
        colors: {
            primary: '#f97316', // Dark Orange
            secondary: '#854d0e' // Brown stem
        }
    }
};

export const CROP_TYPES = Object.keys(CROPS);
