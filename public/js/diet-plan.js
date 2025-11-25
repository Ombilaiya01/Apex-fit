import { auth, db } from './config/firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getGeminiResponse } from './config/gemini-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize UI elements
    const elements = {
        userBmi: document.getElementById('userBmi'),
        dailyCalories: document.getElementById('dailyCalories'),
        nutritionGoals: document.getElementById('nutritionGoals'),
        mealSchedule: document.getElementById('mealSchedule'),
        waterLevel: document.getElementById('waterLevel'),
        waterAmount: document.getElementById('waterAmount')
    };

    // Define showError function early
    function showError(message, containers = ['nutritionGoals', 'mealSchedule']) {
        const errorHtml = `
            <div class="error-message">
                <p>${message}</p>
                <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
            </div>
        `;
        
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) container.innerHTML = errorHtml;
        });
    }

    // Add loading state management
    function showLoading() {
        document.querySelectorAll('.skeleton-loader').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('#userBmi, #dailyCalories, #userName').forEach(el => el.classList.add('hidden'));
    }

    function hideLoading() {
        document.querySelectorAll('.skeleton-loader').forEach(element => element.classList.add('hidden'));
        document.querySelectorAll('#userBmi, #dailyCalories, #userName').forEach(element => {
            element.classList.remove('hidden');
        });
    }

    showLoading();

    // Water tracking state
    let waterIntake = 0;
    const DAILY_WATER_GOAL = 4000; // 3L in ml

    // Add water tracking function to window scope
    window.updateWater = (amount) => {
        waterIntake = Math.max(0, waterIntake + amount);
        elements.waterAmount.textContent = waterIntake;
        const percentage = (waterIntake / DAILY_WATER_GOAL) * 100;
        elements.waterLevel.style.width = `${Math.min(100, percentage)}%`;

        // Save to localStorage
        localStorage.setItem('waterIntake', waterIntake);
        localStorage.setItem('waterDate', new Date().toDateString());
    };

    // Load saved water intake
    const loadWaterIntake = () => {
        const savedDate = localStorage.getItem('waterDate');
        if (savedDate === new Date().toDateString()) {
            waterIntake = parseInt(localStorage.getItem('waterIntake') || '0');
            updateWater(0); // Update UI without changing value
        }
    };

    // Initialize water tracking
    loadWaterIntake();

    // Update the auth state handler to immediately set a default name
    auth.onAuthStateChanged(async user => {
        if (!user) {
            window.location.href = '/index.html';
            return;
        }

        // Set default name immediately
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = user.displayName || 'Athlete';
        }

        try {
            // Get user data and assessment data
            const [userDoc, assessmentDoc] = await Promise.all([
                getDoc(doc(db, 'users', user.uid)),
                getDoc(doc(db, 'assessments', user.uid))
            ]);

            if (!userDoc.exists() || !assessmentDoc.exists()) {
                showError('Please complete your assessment first');
                return;
            }

            const userData = userDoc.data();
            const assessmentData = assessmentDoc.data();

            // Update metrics display
            if (elements.userBmi) elements.userBmi.textContent = userData.bmi || 'Not available';
            if (elements.dailyCalories) {
                const calories = calculateDailyCalories(userData.bmi, assessmentData.weight, userData.lastYoyoTest?.level);
                elements.dailyCalories.textContent = `${calories} kcal`;
            }

            // Display nutrition goals and meal schedule
            await displayNutritionPlan(user.uid, userData, assessmentData);

            hideLoading();

        } catch (error) {
            console.error('Diet Plan Error:', error);
            showError('Error loading your diet plan');
            hideLoading();
        }
    });
});

function calculateDailyCalories(bmi, weight, level) {
    const baseCalories = weight * 24;
    const levelMultiplier = {
        'Elite': 1.8,
        'Advanced': 1.6,
        'Intermediate': 1.4,
        'Beginner': 1.2
    }[level] || 1.2;

    return Math.round(baseCalories * levelMultiplier);
}

async function displayNutritionPlan(userId, userData, assessmentData) {
    try {
        // Check for existing plan
        const dietPlanDoc = await getDoc(doc(db, 'diet_plans', userId));
        
        if (dietPlanDoc.exists()) {
            const plan = dietPlanDoc.data();
            displayPlan(plan);
        } else {
            // Generate new plan
            const plan = await generateDietPlan(userData, assessmentData);
            await setDoc(doc(db, 'diet_plans', userId), plan);
            displayPlan(plan);
        }
    } catch (error) {
        console.error('Error displaying nutrition plan:', error);
        showError('Unable to load nutrition plan');
    }
}

function displayPlan({ recommendations, meals }) {
    // Display nutrition goals
    const nutritionGoals = document.getElementById('nutritionGoals');
    if (nutritionGoals) {
        const goalsHtml = recommendations.map(rec => `
            <div class="nutrition-item">
                <div class="nutrition-icon">${getNutritionIcon(rec.type)}</div>
                <div class="nutrition-details">
                    <strong>${rec.type}</strong>
                    <span>${rec.value}</span>
                </div>
            </div>
        `).join('');
        nutritionGoals.innerHTML = goalsHtml;
    }

    // Display meal schedule
    const mealSchedule = document.getElementById('mealSchedule');
    if (mealSchedule) {
        const mealsHtml = meals.map(meal => `
            <div class="meal-card">
                <div class="meal-icon">
                    <i class="fas ${getMealIcon(meal.type)}"></i>
                </div>
                <div class="meal-details">
                    <h4>${meal.type}</h4>
                    <p class="meal-time">${meal.time}</p>
                    <div class="meal-foods">
                        ${meal.foods.map(food => `<p>${food}</p>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');
        mealSchedule.innerHTML = mealsHtml;
    }
}

function getNutritionIcon(type) {
    const icons = {
        'Calories': '🔥',
        'Protein': '🥩',
        'Carbs': '🌾',
        'Fats': '🥑'
    };
    return icons[type] || '📊';
}

function getMealIcon(mealType) {
    const icons = {
        'Breakfast': 'fa-coffee',
        'Lunch': 'fa-utensils',
        'Dinner': 'fa-moon',
        'Pre-Workout': 'fa-dumbbell',
        'Post-Workout': 'fa-heartbeat'
    };
    return icons[mealType] || 'fa-utensils';
}

async function generateDietPlan(userData, assessmentData) {
    try {
        const prompt = `Create a personalized diet plan for an athlete.
Profile:
- Sport: ${assessmentData.sport || 'General'}
- Level: ${userData.lastYoyoTest?.level || 'Beginner'}
- BMI: ${userData.bmi || '22'}
- Weight: ${assessmentData.weight || '70'}kg

Format the response EXACTLY like this:
MACROS
* Calories: [number] kcal
* Protein: [number]g
* Carbs: [number]g
* Fats: [number]g

DAILY MEALS
1. Breakfast (7:00 AM)
- [food item 1]
- [food item 2]
- [food item 3]

2. Pre-Workout (10:00 AM)
- [food item 1]
- [food item 2]

3. Post-Workout (2:00 PM)
- [food item 1]
- [food item 2]
- [food item 3]

4. Dinner (7:00 PM)
- [food item 1]
- [food item 2]
- [food item 3]`;

        const response = await getGeminiResponse(prompt);
        return processDietPlanResponse(response);

    } catch (error) {
        console.error('Error generating diet plan:', error);
        return getDietPlanFallback();
    }
}

function processDietPlanResponse(response) {
    try {
        const [macrosSection, mealsSection] = response.split('DAILY MEALS');
        
        // Process macros
        const macros = macrosSection.split('\n')
            .filter(line => line.includes(':'))
            .map(line => {
                const [type, value] = line.split(':').map(s => s.trim());
                return {
                    type: type.replace('*', '').trim(),
                    value: value.trim()
                };
            });

        // Process meals
        const meals = mealsSection.split('\n')
            .filter(line => /^\d+\./.test(line) || line.trim().startsWith('-'))
            .reduce((acc, line) => {
                if (/^\d+\./.test(line)) {
                    // This is a new meal title
                    const [title, time] = line.split('(').map(s => s.trim());
                    acc.push({
                        type: title.replace(/^\d+\.\s*/, ''),
                        time: time?.replace(')', '') || '',
                        foods: []
                    });
                } else if (line.trim().startsWith('-')) {
                    // This is a food item
                    if (acc.length > 0) {
                        acc[acc.length - 1].foods.push(
                            line.replace('-', '').trim()
                        );
                    }
                }
                return acc;
            }, []);

        return { 
            recommendations: macros,
            meals: meals
        };
    } catch (error) {
        console.error('Error processing diet plan response:', error);
        return getDietPlanFallback();
    }
}

function getDietPlanFallback() {
    return {
        recommendations: [
            { type: 'Calories', value: '2500 kcal' },
            { type: 'Protein', value: '150g' },
            { type: 'Carbs', value: '300g' },
            { type: 'Fats', value: '70g' }
        ],
        meals: [
            {
                type: 'Breakfast',
                time: '7:00 AM',
                foods: ['Oatmeal with banana', 'Eggs', 'Greek yogurt']
            },
            {
                type: 'Pre-Workout',
                time: '10:00 AM',
                foods: ['Protein shake', 'Apple', 'Almonds']
            },
            {
                type: 'Post-Workout',
                time: '2:00 PM',
                foods: ['Grilled chicken breast', 'Brown rice', 'Mixed vegetables']
            },
            {
                type: 'Dinner',
                time: '7:00 PM',
                foods: ['Salmon fillet', 'Sweet potato', 'Broccoli']
            }
        ]
    };
}

function displayDietPlan({ recommendations, meals }) {
    const getMealIcon = (mealType) => {
        const icons = {
            'Breakfast': '🍳',
            'Pre-Workout': '🏃',
            'Post-Workout': '💪',
            'Dinner': '🍽️'
        };
        return icons[mealType] || '🍴';
    };

    const getNutritionIcon = (type) => {
        const icons = {
            'Calories': '🔥',
            'Protein': '🥩',
            'Carbs': '🌾',
            'Fats': '🥑',
            'Water': '💧'
        };
        return icons[type] || '📊';
    };

    // Display recommendations with icons
    const recsHtml = `
        <div class="nutrition-plan">
            <h3>Daily Nutrition Targets</h3>
            ${recommendations.map(rec => `
                <div class="nutrition-item">
                    <span class="nutrition-icon">${getNutritionIcon(rec.title)}</span>
                    <strong>${rec.title}</strong>
                    <span>${rec.value}</span>
                </div>
            `).join('')}
        </div>`;
    
    // Display meals with icons
    const mealsHtml = `
        <div class="meals-grid">
            ${meals.map(meal => `
                <div class="meal-card">
                    <div class="meal-icon">${getMealIcon(meal.title)}</div>
                    <div>
                        <h4>${meal.title}</h4>
                        <p>${meal.content}</p>
                    </div>
                </div>
            `).join('')}
        </div>`;

    document.getElementById('dietRecommendations').innerHTML = recsHtml;
    document.getElementById('mealSchedule').innerHTML = mealsHtml;
}
