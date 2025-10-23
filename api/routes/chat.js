const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");

// Check for API key at startup for better debugging
if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set. The AI Chatbot will not function.");
}

router.post('/', async (req, res) => {
    // Re-check for API key on each request in case the server was started without it
    if (!process.env.API_KEY) {
        return res.status(500).json({ error: "The AI service has not been configured on the server." });
    }

    const { message, context } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const systemInstruction = `You are an expert assistant for a school timetabling application called "Smart Timetable".
        Your name is "ผู้ช่วยจัดตารางอัจฉริยะ" (Smart Timetable Assistant).
        You will receive JSON context about the user's current view in the app. Use this context to provide helpful, specific advice.
        Respond exclusively in Thai. Be concise, helpful, and friendly.
        Current context: ${JSON.stringify(context, null, 2)}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: {
                systemInstruction: systemInstruction,
            }
        });
        
        const text = response.text;
        res.json({ text });

    } catch (error) {
        console.error("Gemini API call error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        res.status(500).json({ error: `An error occurred while communicating with the AI service. Details: ${errorMessage}` });
    }
});

module.exports = router;