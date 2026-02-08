// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
// Use environment variable for API key for security
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBwI-pYxtvBnHI3SzEbr3Pa81sbsGqSZFM",
    authDomain: "athelete-management-c991a.firebaseapp.com",
    projectId: "athelete-management-c991a",
    storageBucket: "athelete-management-c991a.firebasestorage.app",
    messagingSenderId: "1095205765222",
    appId: "1:1095205765222:web:8651aa1ee1341254452da7",
    measurementId: "G-J2Y006DEYM"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export services
export const auth = getAuth(app);
export const db = getFirestore(app);
