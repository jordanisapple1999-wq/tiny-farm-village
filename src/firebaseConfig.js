// Tiny Farm Village - Firebase Configuration

// Default config placeholder. You can paste your own credentials here directly
// before deploying, or paste them into the Setup Helper in the game UI.
export const firebaseConfig = {
    apiKey: "AIzaSyDbsUqQOB5Zkq_H1Y81CL051IxnXMHbsfs",
    authDomain: "tiny-farm-village.firebaseapp.com",
    projectId: "tiny-farm-village",
    storageBucket: "tiny-farm-village.firebasestorage.app",
    messagingSenderId: "250399407122",
    appId: "1:250399407122:web:2bd3d66484b5b0656beccb",
    measurementId: "G-02MMQ7JQML"
};

// Retrieve configuration, prioritising browser local storage override
export function getFirebaseConfig() {
    const localConfigRaw = localStorage.getItem('tf_firebase_config_override');
    if (localConfigRaw) {
        try {
            const parsed = JSON.parse(localConfigRaw);
            if (parsed && parsed.apiKey) {
                return parsed;
            }
        } catch (e) {
            console.error('Failed to parse firebase config override:', e);
        }
    }
    return firebaseConfig;
}

// Verify if a valid config (non-placeholder) exists
export function isFirebaseConfigured() {
    const config = getFirebaseConfig();
    return config && 
           config.apiKey && 
           config.apiKey !== "YOUR_API_KEY" && 
           config.projectId && 
           config.projectId !== "YOUR_PROJECT_ID";
}
