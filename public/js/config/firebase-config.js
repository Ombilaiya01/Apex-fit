// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
// Use environment variable for API key for security
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAUH6fUPWSN3NNe1_ealxv8jnuvrWHe0YM",
    authDomain: "apex-2789f.firebaseapp.com",
    projectId: "apex-2789f",
    storageBucket: "apex-2789f.firebasestorage.app",
    messagingSenderId: "111701376788",
    appId: "1:111701376788:web:8f9da099a2df3b0dd68c01",
    measurementId: "G-3ZV6WWBFKT"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export services
export const auth = getAuth(app);
export const db = getFirestore(app);
