// Tiny Farm Village - Firebase SDK Initializer (modular ES6 imports from CDN)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    deleteDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getFirebaseConfig, isFirebaseConfigured } from './firebaseConfig.js';

let app = null;
let auth = null;
let db = null;

export function initializeFirebase() {
    if (isFirebaseConfigured()) {
        try {
            const config = getFirebaseConfig();
            // In Firebase Web SDK v9/v10, initializeApp can be called multiple times 
            // if we reuse or replace, but to be clean we initialize once.
            app = initializeApp(config);
            auth = getAuth(app);
            db = getFirestore(app);
            console.log('Firebase initialized successfully.');
            return true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            return false;
        }
    } else {
        console.warn('Firebase is not configured yet. Set keys in firebaseConfig.js or in the Game UI.');
        return false;
    }
}

// Initialise on load
initializeFirebase();

export { 
    auth, 
    db, 
    app,
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    serverTimestamp
};
