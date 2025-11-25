import { auth, db } from './config/firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getGeminiResponse, markdownToHtml } from './config/gemini-config.js';

// Add conversation memory
let conversationHistory = [];
let userData = null;

// Update chatbot personality
const AI_PERSONA = {
    name: "AthleteMind Coach",
    style: "empathetic, action-oriented, and contextual"
};

// Add feature-based conversation topics
const FEATURES = {
    performance: "Your Yo-Yo test score and performance metrics",
    diet: "Your personalized nutrition plan",
    injury: "Injury prevention and recovery guidance",
    mental: "Mental wellness and motivation support"
};

// Define specific response templates
const RESPONSE_TEMPLATES = {
    motivation: {
        steps: [
            "1️⃣ Set a small, achievable goal for tomorrow's training",
            "2️⃣ Track your progress in the performance dashboard",
            "3️⃣ Reward yourself after completing each milestone",
            "4️⃣ Connect with training partners or teammates",
            "5️⃣ Visualize your success for 5 minutes before training"
        ],
        actionLinks: {
            performance: "/pages/dashboard.html",
            training: "/pages/yoyo-test.html"
        }
    },
    diet: {
        steps: [
            "1️⃣ Calculate your daily calorie needs",
            "2️⃣ Plan your pre and post-workout meals",
            "3️⃣ Track your water intake",
            "4️⃣ Balance your macronutrients",
            "5️⃣ Time your meals around training"
        ],
        actionLinks: {
            dietPlan: "/pages/diet-plan.html",
            nutrition: "/pages/nutrition-calculator.html"
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const userNameElement = document.getElementById('userName');

    // Auth check and data loading
    auth.onAuthStateChanged(async user => {
        if (!user) {
            window.location.href = '/index.html';
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            userData = userDoc.data();
            
            // Update UI with user data
            userNameElement.textContent = user.displayName || 'Athlete';
            document.getElementById('userLevel').textContent = userData.lastYoyoTest?.level || 'N/A';
            document.getElementById('yoyoScore').textContent = userData.lastYoyoTest?.score || 'N/A';
            
            // Get daily motivation
            getDailyMotivation(userData);
        } catch (error) {
            console.error('Error loading user data:', error);
            userNameElement.textContent = 'Athlete';
        }
    });

    // Handle chat form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;

        // Show user message
        addMessage('user', message);
        userInput.value = '';

        try {
            const response = await getGeminiResponse(getChatPrompt(message, userData));
            
            // Process response before displaying
            const processedResponse = processResponse(response, message);
            addMessage('bot', processedResponse);

        } catch (error) {
            console.error('Chat Error:', error);
            addMessage('bot', '**Sorry!** I had trouble processing that. Please try again.');
        }
    });

    // Enhanced quick topics
    const topicPrompts = {
        stress: {
            message: "I'm feeling stressed about my upcoming game",
            context: "competition_anxiety"
        },
        confidence: {
            message: "How can I build more confidence in my performance?",
            context: "self_belief"
        },
        motivation: {
            message: "I'm struggling to stay motivated in training",
            context: "training_motivation"
        },
        pressure: {
            message: "I feel a lot of pressure to perform well",
            context: "performance_pressure"
        }
    };

    document.querySelectorAll('.topic-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const topic = btn.dataset.topic;
            userInput.value = topicPrompts[topic].message;
            chatForm.dispatchEvent(new Event('submit'));
        });
    });
});

function addMessage(type, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;

    // Format the content
    const formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="feature-link">$1</a>')
        .replace(/\n/g, '<br>');

    messageDiv.innerHTML = formattedContent;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Remove quick replies after user selects one
    if (type === 'user') {
        const quickReplies = document.querySelector('.quick-replies');
        if (quickReplies) {
            quickReplies.remove();
        }
    }
}

// Format message with better styling
function formatMessage(content) {
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong class="highlight">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="emphasis">$1</em>')
        .replace(/(\d️⃣)/g, '<span class="step-number">$1</span>');
}

// Update the chat prompt to be more focused and structured
const getChatPrompt = (message, userData) => `
You are an AI Mental Fitness Coach. The athlete has this profile:
Sport: ${userData?.sport || 'General'}
Level: ${userData?.lastYoyoTest?.level || 'Beginner'}
Recent Score: ${userData?.lastYoyoTest?.score || 'N/A'}/20

Their message: "${message}"

Rules for your response:
1. Keep it under 3 sentences
2. Be motivational but practical
3. Reference their sport/level when relevant
4. Use ** for important words
5. If they mention specific features (diet, training, injury), provide a direct link to that feature

Respond in a way that shows you understand their concern and provide ONE clear action step.`;

async function getDailyMotivation(userData) {
    try {
        const prompt = `Create a short, powerful motivational message for a ${userData?.sport || 'sports'} athlete at ${userData?.lastYoyoTest?.level || 'beginner'} level. Keep it under 30 words.`;
        const motivation = await getGeminiResponse(prompt);
        document.getElementById('dailyQuote').textContent = motivation;
    } catch (error) {
        console.error('Error getting motivation:', error);
        document.getElementById('dailyQuote').textContent = "Champions aren't made in the gym. Champions are made from something deep inside them – a desire, a dream, a vision.";
    }
}

// Helper function for emergency responses
function getEmergencyResponse() {
    const responses = [
        "I understand this is a challenging moment. Remember, your mental health is paramount. Consider checking your performance dashboard for positive progress markers, or review your successful training history. Would you like to explore some quick mental wellness exercises?",
        
        "As your mental wellness coach, I want to ensure you're supported. We can look at your progress together, review your nutrition plan for mood-boosting foods, or practice some confidence-building exercises. What would be most helpful right now?",
        
        "Every champion faces moments of doubt. Let's focus on your strengths - your dedication to training, your improving Yo-Yo test scores, and your commitment to mental wellness. Shall we review your achievements together?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// Save conversations for context
async function saveConversation(userMessage, botResponse) {
    try {
        const conversationRef = doc(db, 'mental_health_chats', auth.currentUser.uid);
        const timestamp = new Date().toISOString();
        
        await setDoc(conversationRef, {
            [`conversations.${timestamp}`]: {
                user: userMessage,
                bot: botResponse,
                context: {
                    performance_level: userData?.lastYoyoTest?.level,
                    recent_score: userData?.lastYoyoTest?.score,
                    sport: userData?.sport
                }
            }
        }, { merge: true });
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
}

// Add feature detection and UI updates
function handleFeatureReference(userMessage, botResponse) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('diet') || message.includes('nutrition') || message.includes('food')) {
        showFeaturePrompt('pages/diet-plan', 'Would you like to see your personalized diet plan?');
    } else if (message.includes('injury') || message.includes('pain')) {
        showFeaturePrompt('injury-prevention', 'Shall we check your injury prevention plan?');
    } else if (message.includes('performance') || message.includes('score')) {
        showFeaturePrompt('dashboard', 'Would you like to review your performance metrics?');
    }
}

function showFeaturePrompt(feature, message) {
    const promptHtml = `
        <div class="feature-prompt">
            <p>${message}</p>
            <a href="/${feature}.html" class="btn btn-primary">View ${feature.replace('-', ' ')}</a>
        </div>
    `;
    addMessage('bot', promptHtml);
}

// Add new function to process responses
function processResponse(response, userMessage) {
    let processedResponse = response;
    
    // Check for feature references
    if (userMessage.toLowerCase().includes('diet')) {
        processedResponse += '\n\n[View Your Diet Plan](/pages/diet-plan.html)';
    } else if (userMessage.toLowerCase().includes('injury')) {
        processedResponse += '\n\n[Check Injury Prevention](/pages/injury-prevention.html)';
    } else if (userMessage.toLowerCase().includes('performance')) {
        processedResponse += '\n\n[View Performance Dashboard](/pages/dashboard.html)';
    }

    return processedResponse;
}

// Add this function to handle quick replies
window.handleQuickReply = async function(message) {
    // Display user message
    addMessage('user', message);

    try {
        const response = await getGeminiResponse(
            `The athlete says: "${message}". 
             Provide a brief, empathetic response and a specific action step.
             Keep it under 3 sentences and focus on motivation and mental wellness.`
        );
        addMessage('bot', response);
    } catch (error) {
        console.error('Chat Error:', error);
        addMessage('bot', 'I understand. Let\'s work together to improve your mindset and performance.');
    }
}
