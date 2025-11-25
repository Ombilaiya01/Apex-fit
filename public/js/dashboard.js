import { auth, db } from './config/firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getGeminiResponse } from './config/gemini-config.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements with only the elements that exist in our new mobile design
    const elements = {
        userName: document.getElementById('userName'),
        yoyoScore: document.getElementById('yoyoScore'),
        performanceLevel: document.getElementById('performanceLevel'),
        motivationQuote: document.getElementById('motivationQuote'),
        takeTestBtn: document.getElementById('takeTestBtn')
    };

    // Validate essential elements exist
    const validateElements = () => {
        const missingElements = Object.entries(elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.error('Missing DOM elements:', missingElements);
            return false;
        }
        return true;
    };

    // Add click handler for user info dropdown
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.addEventListener('click', () => {
            const dropdown = userInfo.querySelector('.user-dropdown');
            dropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userInfo.contains(e.target)) {
                const dropdown = userInfo.querySelector('.user-dropdown');
                dropdown.classList.remove('active');
            }
        });
    }

    // Check authentication state
    auth.onAuthStateChanged(async user => {
        if (!user) {
            window.location.href = '/index.html';
            return;
        }

        if (!validateElements()) return;

        // Update UI with user info - simplified for mobile
        elements.userName.textContent = user.displayName || 'Athlete';

        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                if (data.lastYoyoTest) {
                    // Update score and level
                    elements.yoyoScore.textContent = data.lastYoyoTest.score;
                    elements.performanceLevel.textContent = data.lastYoyoTest.level;
                    
                    // Generate motivation based on score
                    setMotivationalQuote(data.lastYoyoTest.level, data.lastYoyoTest.score);
                    
                    // Initialize simplified bar chart
                    initializeBarChart(data.lastYoyoTest.metrics);
                    
                    // Display recommendations
                    if (data.lastYoyoTest.recommendations?.length > 0) {
                        displayRecommendations(data.lastYoyoTest.recommendations);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    });

    // Handle Take Test button click if it exists
    if (elements.takeTestBtn) {
        elements.takeTestBtn.addEventListener('click', () => {
            window.location.href = '/pages/yoyo-test.html';
        });
    }

    // Add logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                window.location.href = '/index.html';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });
    }

    // Add click handlers for mobile navigation
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Remove active class from all items
            document.querySelectorAll('.bottom-nav .nav-item').forEach(navItem => {
                navItem.classList.remove('active');
            });
            // Add active class to clicked item
            e.currentTarget.classList.add('active');
        });
    });
});

// New function to display motivational quotes based on level
function setMotivationalQuote(level, score) {
    const quotes = {
        'Beginner': [
            "Every champion was once a beginner!",
            "Your journey starts now. Keep going!",
            "Small steps lead to big achievements"
        ],
        'Intermediate': [
            "You're making great progress!",
            "Keep pushing your limits!",
            "Consistency is key to success"
        ],
        'Advanced': [
            "Excellence becomes a habit!",
            "Your dedication is paying off!",
            "Pushing boundaries every day"
        ],
        'Elite': [
            "Peak performance achieved!",
            "True champions never rest!",
            "Setting the standard for others"
        ]
    };
    
    // Select a quote based on level
    const levelQuotes = quotes[level] || quotes['Beginner'];
    const randomIndex = Math.floor(Math.random() * levelQuotes.length);
    document.getElementById('motivationQuote').textContent = levelQuotes[randomIndex];
}

// Simpler bar chart implementation instead of radar chart
function initializeBarChart(metrics) {
    const barCtx = document.getElementById('performanceBar');
    if (!barCtx) return;

    const ctx = barCtx.getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.performanceChart) {
        window.performanceChart.destroy();
    }

    // Create new bar chart - simpler and more mobile friendly
    window.performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Speed', 'Endurance', 'Recovery'],
            datasets: [{
                label: 'Your Performance',
                data: [
                    metrics.speed || 0, 
                    metrics.endurance || 0, 
                    metrics.recovery || 0
                ],
                backgroundColor: [
                    'rgba(66, 133, 244, 0.7)',  // Blue
                    'rgba(52, 168, 83, 0.7)',   // Green
                    'rgba(251, 188, 5, 0.7)'    // Yellow
                ],
                borderColor: [
                    'rgba(66, 133, 244, 1)',
                    'rgba(52, 168, 83, 1)',
                    'rgba(251, 188, 5, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true
                }
            }
        }
    });
}

// Improved recommendations display for mobile
function displayRecommendations(recommendations) {
    const recommendationsContainer = document.getElementById('recommendations');
    let html = '';

    recommendations.forEach(rec => {
        let area, advice;
        
        if (rec.includes(':')) {
            [area, advice] = rec.split(':').map(part => part.trim());
        } else {
            area = 'Tip';
            advice = rec;
        }
        
        html += `
            <div class="recommendation-item">
                <strong>${area}</strong>
                <p>${advice}</p>
            </div>
        `;
    });
    
    recommendationsContainer.innerHTML = html;
}

// Helper functions
async function loadUserData(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            document.getElementById('yoyoScore').textContent = data.yoyoScore || 'Not Taken';
            document.getElementById('performanceLevel').textContent = data.performanceLevel || 'Beginner';
            document.getElementById('nextTraining').textContent = data.nextTraining || 'No training scheduled';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function startYoYoTest() {
    window.location.href = '/src/pages/yoyo-test.html';
}

function updateRecommendations(recommendations) {
    const recommendationsHtml = recommendations
        .map(rec => `<li class="recommendation-item">
            <strong>${rec.split(':')[0]}:</strong> 
            ${rec.split(':')[1]}
        </li>`)
        .join('');
    document.getElementById('recommendations').innerHTML = 
        `<ul class="recommendations-list">${recommendationsHtml}</ul>`;
}
