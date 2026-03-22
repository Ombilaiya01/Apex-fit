import { auth, db } from './config/firebase-config.js';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

document.addEventListener('DOMContentLoaded', () => {
    // Inject Modal HTML
    const modalHTML = `
        <div id="profileModal" class="modal profile-modal" style="display: none;">
            <div class="modal-content profile-content">
                <div class="modal-header">
                    <h2 id="profileModalTitle">My Profile</h2>
                    <button id="closeProfileBtn" class="close-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div id="profileView" class="profile-view">
                        <div class="profile-stat-grid">
                            <div class="profile-stat"><span class="stat-label">Full Name</span><span id="viewName" class="stat-value"></span></div>
                            <div class="profile-stat"><span class="stat-label">Age</span><span id="viewAge" class="stat-value"></span></div>
                            <div class="profile-stat"><span class="stat-label">Weight</span><span class="stat-value"><span id="viewWeight"></span> kg</span></div>
                            <div class="profile-stat"><span class="stat-label">Height</span><span class="stat-value"><span id="viewHeight"></span> cm</span></div>
                            <div class="profile-stat"><span class="stat-label">Primary Sport</span><span id="viewSport" class="stat-value"></span></div>
                        </div>
                        <div class="form-actions">
                            <button type="button" id="editProfileBtn" class="btn-primary">Edit Profile</button>
                        </div>
                    </div>
                    <form id="profileForm" class="profile-form" style="display: none;">
                        <div class="form-group">
                            <label for="profileName">Full Name</label>
                            <input type="text" id="profileName" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="profileAge">Age</label>
                                <input type="number" id="profileAge" min="1" max="120" required>
                            </div>
                            <div class="form-group">
                                <label for="profileWeight">Weight (kg)</label>
                                <input type="number" id="profileWeight" step="0.1" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="profileHeight">Height (cm)</label>
                                <input type="number" id="profileHeight" required>
                            </div>
                            <div class="form-group">
                                <label for="profileSport">Primary Sport</label>
                                <select id="profileSport" required>
                                    <option value="">Select a sport</option>
                                    <option value="Running">Running</option>
                                    <option value="Cycling">Cycling</option>
                                    <option value="Swimming">Swimming</option>
                                    <option value="Weightlifting">Weightlifting</option>
                                    <option value="Football">Football / Soccer</option>
                                    <option value="Cricket">Cricket</option>
                                    <option value="Basketball">Basketball</option>
                                    <option value="Tennis">Tennis</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" id="cancelProfileBtn" class="btn-secondary">Cancel</button>
                            <button type="submit" id="saveProfileBtn" class="btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const profileModal = document.getElementById('profileModal');
    const closeBtn = document.getElementById('closeProfileBtn');
    const cancelBtn = document.getElementById('cancelProfileBtn');
    const editBtn = document.getElementById('editProfileBtn');
    const form = document.getElementById('profileForm');
    const profileView = document.getElementById('profileView');
    const profileModalTitle = document.getElementById('profileModalTitle');

    const showViewMode = () => {
        profileView.style.display = 'block';
        form.style.display = 'none';
        profileModalTitle.textContent = 'My Profile';
    };

    const showEditMode = () => {
        profileView.style.display = 'none';
        form.style.display = 'block';
        profileModalTitle.textContent = 'Edit Profile';
    };

    // UI Elements that trigger the modal
    const userInfoElements = document.querySelectorAll('#userInfo, #userName');

    let currentUser = null;

    // Listen to Auth State
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
        }
    });

    const openProfile = async () => {
        if (!currentUser) return;

        // Fetch User and Assessment Data
        try {
            const [userDoc, assessmentDoc] = await Promise.all([
                getDoc(doc(db, 'users', currentUser.uid)),
                getDoc(doc(db, 'assessments', currentUser.uid))
            ]);

            const userData = userDoc.data() || {};
            const assessmentData = assessmentDoc.data() || {};

            // Populate View
            const nameToDisplay = userData.name || currentUser.displayName || '';
            document.getElementById('viewName').textContent = nameToDisplay;
            document.getElementById('viewAge').textContent = assessmentData.age || '--';
            document.getElementById('viewWeight').textContent = assessmentData.weight || '--';
            document.getElementById('viewHeight').textContent = assessmentData.height || '--';
            document.getElementById('viewSport').textContent = assessmentData.sport || '--';

            // Populate Form
            document.getElementById('profileName').value = nameToDisplay;
            document.getElementById('profileAge').value = assessmentData.age || '';
            document.getElementById('profileWeight').value = assessmentData.weight || '';
            document.getElementById('profileHeight').value = assessmentData.height || '';

            // Set Sport correctly and handle "Other" if completely custom, but assuming standard list
            const sportSelect = document.getElementById('profileSport');
            const sportValue = assessmentData.sport || '';
            let optionFound = false;
            for (let option of sportSelect.options) {
                if (option.value === sportValue) {
                    option.selected = true;
                    optionFound = true;
                    break;
                }
            }
            if (!optionFound && sportValue !== '') {
                // If it's a custom sport not in the list, just append it temporarily
                const newOption = new Option(sportValue, sportValue, true, true);
                sportSelect.add(newOption);
            }

            showViewMode();
            profileModal.style.display = 'flex';
        } catch (error) {
            console.error('Error fetching profile data:', error);
            alert('Failed to load profile data.');
        }
    };

    const closeProfile = () => {
        profileModal.style.display = 'none';
    };

    // Attach click event to all userInfo and userName elements
    // Note: To ensure it doesn't conflict with dropdown toggles, we check target
    userInfoElements.forEach(el => {
        el.addEventListener('click', (e) => {
            // We only want to open profile if they clicked the name specifically, 
            // or we could add a dedicated Profile button in the dropdown.
            // But user requested "clicking name in the right top corner"
            const clickedName = e.target.id === 'userName' || e.target.closest('#userName');
            if (clickedName) {
                e.preventDefault();
                e.stopPropagation();
                openProfile();
            }
        });
    });

    closeBtn.addEventListener('click', closeProfile);
    cancelBtn.addEventListener('click', showViewMode);
    editBtn.addEventListener('click', showEditMode);

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === profileModal) {
            closeProfile();
        }
    });

    // Save Profile
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const saveBtn = document.getElementById('saveProfileBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const newName = document.getElementById('profileName').value;
            const newAge = parseInt(document.getElementById('profileAge').value);
            const newWeight = parseFloat(document.getElementById('profileWeight').value);
            const newHeight = parseInt(document.getElementById('profileHeight').value);
            const newSport = document.getElementById('profileSport').value;

            // Recalculate BMI
            const heightInMeters = newHeight / 100;
            const newBmi = (newWeight / (heightInMeters * heightInMeters)).toFixed(2);

            // Update Users collection
            await updateDoc(doc(db, 'users', currentUser.uid), {
                name: newName,
                bmi: newBmi
            });

            // Update Assessments collection
            await updateDoc(doc(db, 'assessments', currentUser.uid), {
                age: newAge,
                weight: newWeight,
                height: newHeight,
                sport: newSport
            });

            // Update UI
            document.querySelectorAll('#userName').forEach(el => {
                el.textContent = newName;
            });
            const bmiElement = document.getElementById('userBmi');
            if (bmiElement) {
                // If the user is on diet-plan page, re-update BMI display
                // (assuming it's displayed, diet-plan.js might do this, but just in case)
                if (bmiElement.textContent.includes('BMI')) {
                    bmiElement.innerHTML = `<span>BMI:</span> <strong>${newBmi}</strong>`;
                }
            }

            // Update View
            document.getElementById('viewName').textContent = newName;
            document.getElementById('viewAge').textContent = newAge;
            document.getElementById('viewWeight').textContent = newWeight;
            document.getElementById('viewHeight').textContent = newHeight;
            document.getElementById('viewSport').textContent = newSport;

            showViewMode();
        } catch (error) {
            console.error('Error saving profile data:', error);
            alert('Failed to save profile changes.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    });
});
