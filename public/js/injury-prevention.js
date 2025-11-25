import { auth, db } from './config/firebase-config.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getGeminiResponse } from './config/gemini-config.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const elements = {
        form: document.getElementById('injuryAssessmentForm'),
        userName: document.getElementById('userName'),
        activityLevel: document.getElementById('activityLevel'),
        riskLevel: document.getElementById('riskLevel'),
        painDetails: document.getElementById('painDetails'),
        preventionPlan: document.getElementById('preventionPlan')
    };

    // Show/hide pain details based on radio selection
    document.querySelectorAll('input[name="pain"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (elements.painDetails) {
                elements.painDetails.classList.toggle('hidden', e.target.value === 'no');
            }
        });
    });

    // Handle body part selection
    document.querySelectorAll('.body-part').forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove selected class from all buttons
            document.querySelectorAll('.body-part').forEach(btn => 
                btn.classList.remove('selected'));
            // Add selected class to clicked button
            e.target.classList.add('selected');
        });
    });

    // Auth state change handler
    auth.onAuthStateChanged(async user => {
        if (!user) {
            window.location.href = '/index.html';
            return;
        }

        try {
            // Load user data
            const [userDoc, assessmentDoc] = await Promise.all([
                getDoc(doc(db, 'users', user.uid)),
                getDoc(doc(db, 'assessments', user.uid))
            ]);

            if (userDoc.exists() && assessmentDoc.exists()) {
                const userData = userDoc.data();
                const assessmentData = assessmentDoc.data();

                // Update UI with user info
                if (elements.userName) {
                    elements.userName.textContent = userData.displayName || 'Athlete';
                }
                if (elements.activityLevel) {
                    elements.activityLevel.textContent = 
                        `${assessmentData.trainingHours || '0-5'} hrs/week`;
                }
                if (elements.riskLevel) {
                    elements.riskLevel.textContent = calculateRiskLevel(userData, assessmentData);
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    });

    // Form submission handler
    if (elements.form) {
        elements.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

            try {
                const formData = new FormData(e.target);
                const data = {
                    pain: formData.get('pain'),
                    painLocation: document.querySelector('.body-part.selected')?.dataset.part,
                    trainingHours: formData.get('trainingHours'),
                    recentInjuries: [...formData.getAll('recentInjuries')]
                };

                const plan = await generatePreventionPlan(data);
                displayPreventionPlan(plan);

                // Save to database
                await savePlanToDatabase(data, plan);

            } catch (error) {
                console.error('Error:', error);
                showError('Unable to generate prevention plan. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Get Prevention Plan <i class="fas fa-arrow-right"></i>';
            }
        });
    }
});

function calculateRiskLevel(userData, assessmentData) {
    let riskScore = 0;
    
    // Consider training hours
    const trainingHours = {
        '0-5': 1,
        '5-10': 2,
        '10-15': 3,
        '15+': 4
    }[assessmentData.trainingHours] || 1;
    
    // Consider YoYo test level
    const performanceLevel = {
        'Beginner': 3,
        'Intermediate': 2,
        'Advanced': 1,
        'Elite': 1
    }[userData.lastYoyoTest?.level] || 3;

    riskScore = (trainingHours + performanceLevel) / 2;

    if (riskScore >= 2.5) return 'High';
    if (riskScore >= 1.5) return 'Medium';
    return 'Low';
}

async function generatePreventionPlan(data) {
    const prompt = `Create a concise injury prevention plan for an athlete:
Pain: ${data.pain || 'No'}
Location: ${data.painLocation || 'None'}
Training: ${data.trainingHours || '0'} hours/week
Recent Injuries: ${data.recentInjuries?.length ? data.recentInjuries.join(', ') : 'None'}

Format the response exactly like this (keep each section SHORT - max 3 bullet points):
## Risk Level
* Current risk status
* Main concern

## Quick Actions
* Most important exercise
* Key modification

## Recovery Tips
* Main recovery focus
* Treatment advice`;

    try {
        const response = await getGeminiResponse(prompt);
        return response;
    } catch (error) {
        console.error('AI Error:', error);
        return getFallbackPlan(data);
    }
}

function displayPreventionPlan(plan) {
    if (!plan) return;

    const preventionPlan = document.getElementById('preventionPlan');
    if (!preventionPlan) return;

    const sections = plan.split('##').filter(section => section.trim());
    const formattedPlan = sections.map(section => {
        const [title, ...content] = section.trim().split('\n');
        return `
            <div class="plan-section">
                <h2 class="plan-title">
                    ${getSectionIcon(title)} ${title.trim()}
                </h2>
                <ul class="plan-list">
                    ${content
                        .filter(line => line.trim().startsWith('*'))
                        .map(line => `
                            <li class="plan-item">
                                ${line
                                    .replace('*', '')
                                    .trim()
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                }
                            </li>
                        `)
                        .join('')}
                </ul>
            </div>
        `;
    }).join('');

    preventionPlan.querySelector('.markdown-content').innerHTML = formattedPlan;
    preventionPlan.classList.remove('hidden');
    preventionPlan.scrollIntoView({ behavior: 'smooth' });
}

async function savePlanToDatabase(data, plan) {
    try {
        // Clean and validate data before saving
        const cleanData = {
            pain: data.pain || 'No',
            painLocation: data.painLocation || 'None',
            trainingHours: data.trainingHours || '0-5',
            recentInjuries: data.recentInjuries || [],
            plan: plan || '',
            timestamp: new Date().toISOString()
        };

        await setDoc(doc(db, 'injury_assessments', auth.currentUser.uid), cleanData);
    } catch (error) {
        console.error('Error saving to database:', error);
    }
}

function showError(message) {
    const preventionPlan = document.getElementById('preventionPlan');
    if (preventionPlan) {
        preventionPlan.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <button onclick="window.location.reload()" class="btn btn-primary">Try Again</button>
            </div>
        `;
        preventionPlan.classList.remove('hidden');
    }
}

function getFallbackPlan(data) {
    return `## Risk Assessment
* Current risk level: Moderate
* Contributing factors: Training load, previous injuries
* Immediate concerns: Monitor pain levels

## Prevention Strategy
* Key exercises: Dynamic stretching, core stability work
* Form guidance: Focus on proper technique
* Training modifications: Reduce intensity as needed

## Recovery Protocol
* Rest recommendations: 48-hour recovery between intense sessions
* Treatment options: Ice/heat therapy, gentle stretching
* Progress monitoring: Daily pain and mobility checks`;
}

function formatText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="highlight">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="emphasis">$1</em>')
        .replace(/\[(.*?)\]/g, '<span class="note">$1</span>');
}

// Update getSectionIcon function to handle more section types
function getSectionIcon(title) {
    const titleLower = title.toLowerCase();
    const icons = {
        'injury risk assessment': '🔍',
        'risk assessment': '🔍',
        'immediate recovery': '🏥',
        'recovery steps': '🏥',
        'prevention': '💪',
        'exercises': '💪',
        'medical help': '⚕️',
        'training modifications': '⚡',
        'recommendations': '📋',
        'summary': '📝'
    };

    // Find the first matching icon
    for (const [key, icon] of Object.entries(icons)) {
        if (titleLower.includes(key)) {
            return icon;
        }
    }
    return '📋'; // Default icon
}
