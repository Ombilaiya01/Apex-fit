import { auth, db } from '../config/firebase-config.js';
import { GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const getStartedBtn = document.getElementById('getStarted');
    const messageDiv = document.getElementById('message');

    const showMessage = (msg, isError = false) => {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${isError ? 'error' : 'success'}`;
        setTimeout(() => messageDiv.textContent = '', 3000);
    };

    const handleSignIn = async (button) => {
        button.classList.add('loading');
        try {
            const provider = new GoogleAuthProvider();
            // Set language to device language
            auth.languageCode = navigator.language;
            
            const result = await signInWithPopup(auth, provider);
            
            if (result.user) {
                // Check user's assessment and test status
                const [userDoc, assessmentDoc] = await Promise.all([
                    getDoc(doc(db, 'users', result.user.uid)),
                    getDoc(doc(db, 'assessments', result.user.uid))
                ]);

                // First time user - no user doc or assessment
                if (!userDoc.exists() || !assessmentDoc.exists()) {
                    window.location.href = '/pages/assessment.html';
                    return;
                }

                // Has assessment but no Yo-Yo test
                if (!userDoc.data().lastYoyoTest) {
                    window.location.href = '/pages/yoyo-test.html';
                    return;
                }

                // Has everything - go to dashboard
                window.location.href = '/pages/dashboard.html';
            }
        } catch (error) {
            console.error('Login error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            // Provide user-friendly error messages
            let userMessage = 'Login failed: ' + error.message;
            if (error.code === 'auth/invalid-continue-uri') {
                userMessage = 'Auth redirectURI not configured. Check Firebase Console → Authentication → Authorized domains.';
            } else if (error.code === 'auth/operation-not-allowed') {
                userMessage = 'Google Sign-in is not enabled. Check Firebase Console.';
            } else if (error.code === 'auth/popup-blocked') {
                userMessage = 'Please allow popups to login with Google.';
            }
            
            showMessage(userMessage, true);
        } finally {
            button.classList.remove('loading');
        }
    };

    loginBtn?.addEventListener('click', (e) => handleSignIn(e.target));
    getStartedBtn?.addEventListener('click', (e) => handleSignIn(e.target));

    // Remove or modify the onAuthStateChanged handler to prevent automatic redirection
    auth.onAuthStateChanged(user => {
        if (user) {
            // Don't redirect automatically - let handleSignIn handle it
            return;
        }
    });
});
