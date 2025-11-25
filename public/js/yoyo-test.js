import { auth, db } from './config/firebase-config.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getGeminiResponse, markdownToHtml } from './config/gemini-config.js';

document.addEventListener('DOMContentLoaded', () => {
    let currentQuestion = 1;
    const totalQuestions = 6; // Updated total questions
    const form = document.getElementById('yoyoTestForm');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const progressBar = document.getElementById('progressBar');

    // Navigation functions with error handling
    const showQuestion = (questionNumber) => {
        // Hide all questions first
        document.querySelectorAll('.question-container').forEach(q => q.classList.add('hidden'));
        
        // Show current question
        const currentQuestionElement = document.getElementById(`question${questionNumber}`);
        if (currentQuestionElement) {
            currentQuestionElement.classList.remove('hidden');
        }

        // Update progress tracker
        document.querySelectorAll('.progress-step').forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            if (stepNum === questionNumber) {
                step.classList.add('active');
            } else if (stepNum < questionNumber) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else {
                step.classList.remove('active', 'completed');
            }
        });
        
        // Update button visibility
        if (prevBtn) prevBtn.disabled = questionNumber === 1;
        
        if (nextBtn && submitBtn) {
            if (questionNumber === totalQuestions) {
                nextBtn.classList.add('hidden'); // Change display:none to hidden class
                submitBtn.classList.remove('hidden');
            } else {
                nextBtn.classList.remove('hidden');
                submitBtn.classList.add('hidden');
            }
        }
    };

    // Add validation before allowing next question
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const currentSelect = document.querySelector(`#question${currentQuestion} select`);
            if (!currentSelect?.value) {
                alert('Please select an option before proceeding');
                return;
            }
            
            if (currentQuestion < totalQuestions) {
                currentQuestion++;
                showQuestion(currentQuestion);
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentQuestion > 1) {
                currentQuestion--;
                showQuestion(currentQuestion);
            }
        });
    }

    // Calculate Yo-Yo test score with additional parameters
    const calculateScore = (responses) => {
        const scores = {
            elite: 4,
            advanced: 3,
            intermediate: 2,
            beginner: 1
        };

        const sprintScore = scores[responses.sprintTime];
        const enduranceScore = scores[responses.enduranceTime];
        const recoveryScore = scores[responses.recoveryTime];
        const trainingScore = scores[responses.trainingFrequency];
        const fatigueScore = scores[responses.fatigueRate];
        const recoveryRateScore = scores[responses.recoveryRate];

        // Calculate total score (out of 20)
        const totalScore = ((sprintScore + enduranceScore + recoveryScore + 
            trainingScore + fatigueScore + recoveryRateScore) / 24) * 20;

        // Calculate individual performance metrics
        const speedMetric = ((sprintScore + fatigueScore) / 8) * 100;
        const enduranceMetric = ((enduranceScore + trainingScore) / 8) * 100;
        const recoveryMetric = ((recoveryScore + recoveryRateScore) / 8) * 100;

        // Get performance level and recommendations
        let level = 'Beginner';
        let recommendations = [];

        if (totalScore >= 18) {
            level = 'Elite';
            recommendations = [
                "Focus on maintaining peak performance",
                "Consider advanced interval training",
                "Add sport-specific drills"
            ];
        } else if (totalScore >= 15) {
            level = 'Advanced';
            recommendations = [
                "Increase training intensity",
                "Add more recovery exercises",
                "Work on speed and agility"
            ];
        } else if (totalScore >= 12) {
            level = 'Intermediate';
            recommendations = [
                "Build endurance with longer sessions",
                "Improve sprint technique",
                "Focus on consistent training"
            ];
        } else {
            recommendations = [
                "Start with basic endurance training",
                "Focus on proper form and technique",
                "Gradually increase training frequency"
            ];
        }

        return {
            score: totalScore.toFixed(1),
            level,
            recommendations,
            metrics: {
                speed: speedMetric.toFixed(1),
                endurance: enduranceMetric.toFixed(1),
                recovery: recoveryMetric.toFixed(1)
            }
        };
    };

    // Update getGeminiRecommendations function
    async function getGeminiRecommendations(userData) {
        try {
            const prompt = `As an expert sports coach, analyze this athlete's performance and provide 3 specific, actionable training recommendations. Consider:
            - Current Level: ${userData.level} (Score: ${userData.score}/20)
            - Speed Rating: ${userData.metrics.speed}/100
            - Endurance Rating: ${userData.metrics.endurance}/100
            - Recovery Rating: ${userData.metrics.recovery}/100

            Focus on their weakest areas and provide motivational, practical advice for improvement.
            Format your response as a numbered list with exactly 3 recommendations.`;

            const response = await getGeminiResponse(prompt);
            
            // Extract recommendations from AI response
            const recommendations = response.split('\n')
                .filter(line => line.trim() && line.match(/^\d+\.|[-•]/))
                .map(line => line.replace(/^\d+\.|-|•|\s+/, '').trim())
                .slice(0, 3);

            return recommendations.length ? recommendations : getDefaultRecommendations(userData.level);
        } catch (error) {
            console.error('Error getting Gemini recommendations:', error);
            return getDefaultRecommendations(userData.level);
        }
    }

    function getDefaultRecommendations(level) {
        const recommendations = {
            'Elite': [
                "Maintain peak performance with advanced HIIT sessions",
                "Focus on recovery optimization techniques",
                "Add sport-specific power training"
            ],
            'Advanced': [
                "Increase training intensity gradually",
                "Incorporate interval training",
                "Focus on technique refinement"
            ],
            'Intermediate': [
                "Build endurance with progressive overload",
                "Add strength training 3x per week",
                "Improve recovery protocols"
            ],
            'Beginner': [
                "Start with foundational exercises",
                "Focus on proper form and technique",
                "Build consistent training routine"
            ]
        };
        return recommendations[level] || recommendations['Beginner'];
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validation checks
        const allSelects = form.querySelectorAll('select');
        let allAnswered = true;
        allSelects.forEach(select => {
            if (!select.value) {
                allAnswered = false;
            }
        });

        if (!allAnswered) {
            alert('Please answer all questions before calculating your score');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            window.location.href = '/index.html';
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Analyzing Performance...';

            const responses = {
                sprintTime: document.getElementById('sprintTime').value,
                enduranceTime: document.getElementById('enduranceTime').value,
                recoveryTime: document.getElementById('recoveryTime').value,
                trainingFrequency: document.getElementById('trainingFrequency').value,
                fatigueRate: document.getElementById('fatigueRate').value,
                recoveryRate: document.getElementById('recoveryRate').value
            };

            const result = calculateScore(responses);

            try {
                const prompt = `As a sports coach, analyze this athlete's metrics and provide recommendations:

Athlete Level: ${result.level}
Overall Score: ${result.score}/20
Speed: ${result.metrics.speed}/100
Endurance: ${result.metrics.endurance}/100
Recovery: ${result.metrics.recovery}/100

Provide 4 clear recommendations in exactly this format:
0. General: [Overall focus area and main goal]
1. Speed Work: [Specific speed training exercise]
2. Endurance: [Specific endurance workout]
3. Recovery: [Specific recovery method]

Keep each recommendation clear and actionable.`;

                const aiResponse = await getGeminiResponse(prompt);
                
                // Improved response processing
                const recommendations = aiResponse
                    .split('\n')
                    .filter(line => /^\d+\./.test(line))  // Only get numbered lines
                    .map(line => {
                        const [, area, advice] = line.match(/^\d+\.\s*([^:]+):\s*(.+)$/);
                        return `${area.trim()}: ${advice.trim()}`;
                    });

                if (recommendations.length < 4) {
                    throw new Error('Incomplete AI response');
                }

                // Save to Firestore
                const testData = {
                    ...responses,
                    score: result.score,
                    level: result.level,
                    recommendations: recommendations,
                    metrics: result.metrics,
                    userId: user.uid,
                    timestamp: new Date().toISOString()
                };

                await Promise.all([
                    setDoc(doc(db, 'yoyo_tests', user.uid), testData),
                    setDoc(doc(db, 'users', user.uid), {
                        lastYoyoTest: {
                            score: result.score,
                            level: result.level,
                            recommendations: recommendations,
                            metrics: result.metrics,
                            timestamp: new Date().toISOString()
                        }
                    }, { merge: true })
                ]);

                sessionStorage.setItem('yoyoTestResult', JSON.stringify({
                    ...result,
                    recommendations
                }));
                window.location.href = '/pages/dashboard.html';

            } catch (error) {
                console.error('AI Error:', error);
                alert('Unable to generate recommendations. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Calculate Score';
            }

        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Calculate Score';
        }
    });

    // Initialize first question only if elements exist
    if (form && nextBtn && prevBtn && submitBtn) {
        showQuestion(1);
    } else {
        console.error('Required elements not found in the DOM');
    }
});
