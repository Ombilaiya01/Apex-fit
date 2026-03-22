const key = "YOUR_API_KEY_HERE";

async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.models) {
            console.log("Available models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("Error:", data);
        }
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

listModels();
