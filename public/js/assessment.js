import { auth, db } from './config/firebase-config.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('initialAssessment');
    let currentUser = null;

    // Check if user is authenticated
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '/index.html';
            return;
        }
        currentUser = user;
        
        // Check if assessment already exists
        try {
            const assessmentDoc = await getDoc(doc(db, 'assessments', user.uid));
            if (assessmentDoc.exists()) {
                window.location.href = '/pages/yoyo-test.html';
            }
        } catch (error) {
            console.error('Error checking assessment:', error);
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('Please login first');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            // Create user profile first
            await setDoc(doc(db, 'users', currentUser.uid), {
                email: currentUser.email,
                name: currentUser.displayName,
                photoURL: currentUser.photoURL,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            // Then save assessment data
            const assessmentData = {
                age: parseInt(document.getElementById('age').value),
                weight: parseFloat(document.getElementById('weight').value),
                height: parseInt(document.getElementById('height').value),
                sport: document.getElementById('sport').value,
                createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'assessments', currentUser.uid), assessmentData);

            // Calculate and save BMI
            const heightInMeters = assessmentData.height / 100;
            const bmi = assessmentData.weight / (heightInMeters * heightInMeters);

            await setDoc(doc(db, 'users', currentUser.uid), {
                bmi: bmi.toFixed(2),
                lastAssessment: new Date().toISOString()
            }, { merge: true });

            window.location.href = '/pages/yoyo-test.html';

        } catch (error) {
            console.error('Error saving assessment:', error);
            alert('Error saving your assessment. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Continue';
        }
    });
});
