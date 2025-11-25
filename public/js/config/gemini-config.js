import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

const GEMINI_API_KEY = 'AIzaSyBU6pN9kIyTFVjm1buKSsyvRM4Z51XU8Fw';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // Increased to 2 seconds

export async function getGeminiResponse(prompt) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Attempt ${attempt} of ${MAX_RETRIES}`);
            
            const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 800,
                        topK: 40,
                        topP: 0.95
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            console.warn(`Attempt ${attempt} failed:`, error.message);
            
            if (attempt === MAX_RETRIES) {
                console.error('All attempts failed, using fallback response');
                return getFallbackResponse(prompt);
            }

            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
    }
}

function getFallbackResponse(prompt) {
    const promptLower = prompt.toLowerCase();

    // Check the type of request and return appropriate fallback
    if (promptLower.includes('injury') || promptLower.includes('pain')) {
        return `## Injury Assessment
* **Rest Required**: Take immediate rest and avoid strain
* **Apply RICE Protocol**: Rest, Ice, Compression, Elevation
* **Consult Professional**: See a sports physician for proper diagnosis

## Recovery Steps
* Avoid high-impact activities
* Focus on gentle stretching
* Monitor pain levels`;
    }

    if (promptLower.includes('diet') || promptLower.includes('nutrition')) {
        return `## Nutrition Plan
* **Balanced Diet**: Focus on whole foods
* **Hydration**: 2-3 liters of water daily
* **Recovery**: Protein-rich foods post-workout

## Meal Timing
* Pre-workout: Light carbs
* Post-workout: Protein & carbs
* Throughout day: Regular meals`;
    }

    // Default response for mental health/motivation
    return `## Recommendations
* **Stay Focused**: Set clear, achievable goals
* **Track Progress**: Monitor your improvements
* **Rest & Recover**: Balance training with rest

## Action Steps
* Set one small goal for tomorrow
* Review your recent achievements
* Connect with teammates for support`;
}

export function markdownToHtml(markdown) {
    return markdown
        .replace(/## (.*$)/gm, '<h2>$1</h2>')
        .replace(/\* (.*$)/gm, '<li>$1</li>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
}
