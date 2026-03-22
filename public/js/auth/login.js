import { auth, db } from '../config/firebase-config.js';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

document.addEventListener('DOMContentLoaded', async () => {
    const loginBtn = document.getElementById('loginBtn');
    const getStartedBtn = document.getElementById('getStarted');
    const messageDiv = document.getElementById('message');

    const showMessage = (msg, isError = false) => {
        if (!messageDiv) return;
        messageDiv.textContent = msg;
        messageDiv.className = `message ${isError ? 'error' : 'success'}`;
        setTimeout(() => messageDiv.textContent = '', 3000);
    };

    const postLogin = async (user) => {
        if (!user) return;
        console.log("Login successful for user:", user.email);

        const [userDoc, assessmentDoc] = await Promise.all([
            getDoc(doc(db, 'users', user.uid)),
            getDoc(doc(db, 'assessments', user.uid))
        ]);

        // First time user - no user doc or assessment
        if (!userDoc.exists() || !assessmentDoc.exists()) {
            console.log("First time user, redirecting to assessment...");
            window.location.href = '/pages/assessment.html';
            return;
        }

        // Has assessment but no Yo-Yo test
        if (!userDoc.data()?.lastYoyoTest) {
            console.log("User missing Yo-Yo test, redirecting...");
            window.location.href = '/pages/yoyo-test.html';
            return;
        }

        // Has everything - go to dashboard
        console.log("User fully set up, redirecting to dashboard.");
        window.location.href = '/pages/dashboard.html';
    };

    const handleSignIn = async (button) => {
        if (!button) return;
        button.classList.add('loading');
        console.log("Attempting sign in with popup...");
        try {
            const provider = new GoogleAuthProvider();
            auth.languageCode = navigator.language;

            const result = await signInWithPopup(auth, provider);
            console.log("Sign in with popup succeeded", result);
            await postLogin(result.user);

        } catch (error) {
            console.error('Login error full detail:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);

            let userMessage = 'Login failed: ' + error.message;
            if (error.code === 'auth/invalid-continue-uri') {
                userMessage = 'Auth redirectURI not configured. Check Firebase Console → Authentication → Authorized domains.';
            } else if (error.code === 'auth/operation-not-allowed') {
                userMessage = 'Google Sign-in is not enabled. Check Firebase Console.';
            } else if (error.code === 'auth/popup-blocked') {
                userMessage = 'Please allow popups to login with Google.';
            } else if (error.code === 'auth/popup-closed-by-user') {
                userMessage = 'Login was cancelled.';
            }

            showMessage(userMessage, true);
        } finally {
            button.classList.remove('loading');
        }
    };

    loginBtn?.addEventListener('click', (e) => handleSignIn(e.currentTarget));
    getStartedBtn?.addEventListener('click', (e) => handleSignIn(e.currentTarget));

    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("Auth state changed: User is logged in", user.email);
        } else {
            console.log("Auth state changed: No user logged in");
        }
    });
});
