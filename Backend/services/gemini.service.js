// import { GoogleGenAI } from '@google/genai';
// import dotenv from 'dotenv';

// dotenv.config();

// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// /**
//  * Sends a clean conversational array to the Gemini pipeline
//  * @param {Array} historyMessages 
//  * @returns {Promise<string>}
//  */
// export const generateAIResponse = async (historyMessages) => {
//   try {
//     // Map to the required object-wrapper layout, casting values safely to primitive strings
//     const contents = historyMessages
//       .filter(msg => msg.text && msg.text.trim() !== '') // Skip any blank inputs
//       .map(msg => ({
//         role: msg.role === 'model' ? 'model' : 'user',
//         parts: [{ text: String(msg.text).trim() }]
//       }));

//     const response = await ai.models.generateContent({
//       model: 'gemini-2.5-flash',
//       contents: contents,
//       config: {
//         systemInstruction:
//           "You are Aura, an elite, ultra-responsive conversational AI assistant. " +
//           "CRITICAL DESIGN DIRECTIVE: You must structure your outputs beautifully for an elegant dark-theme web UI. " +
//           "Never return dense walls of plain text paragraphs. Always organize your knowledge using structured Markdown layout schemas: " +
//           "1. Use explicit hierarchical section headers (### and ####) to separate logical concepts.\n" +
//           "2. Break down lists using clean, itemized bullet points or sequential numbered tracks.\n" +
//           "3. Emphasize vital parameters or core concepts by wraps of **bold emphasis text**.\n" +
//           "4. Enclose technical elements or code syntaxes inside clear block ticks with language syntax declarations.\n" +
//           "5. Add double line breaks between paragraphs to keep visual tracking clean and spaced out.",
//         temperature: 0.7,
//       }
//     });

//     return response.text;

//   } catch (error) {
//     console.error("⚡ Gemini Generation Layer Exception:", error);
//     // FIX: Rethrow the exact upstream error object to preserve .status and details
//     throw error;
//   }
// };

import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Groq client instance using your secret environment key
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Sends a conversational history stream to Groq's high-speed LPU pipeline
 * @param {Array} historyMessages 
 * @returns {Promise<string>}
 */
export const generateAIResponse = async (historyMessages) => {
  try {
    // Step A: Map MongoDB records ('model'/'user') to Groq standard roles ('assistant'/'user')
    const formattedMessages = historyMessages
      .filter(msg => msg.text && msg.text.trim() !== '')
      .map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: String(msg.text).trim()
      }));

    // Step B: Inject Aura's behavioral system instruction block at the absolute top of the stack
    formattedMessages.unshift({
      role: 'system',
      content:
        "You are Aura, an elite, ultra-responsive conversational AI assistant. " +
        "CRITICAL DESIGN DIRECTIVE: You must structure your outputs beautifully for an elegant dark-theme web UI. " +
        "Never return dense walls of plain text paragraphs. Always organize your knowledge using structured Markdown layout schemas:\n" +
        "1. Use explicit hierarchical section headers (### and ####) to separate logical concepts.\n" +
        "2. Break down lists using clean, itemized bullet points or sequential numbered tracks.\n" +
        "3. Emphasize vital parameters or core concepts by wraps of **bold emphasis text**.\n" +
        "4. Enclose technical elements or code syntaxes inside clear block ticks with language syntax declarations.\n" +
        "5. Add double line breaks between paragraphs to keep visual tracking clean and spaced out."
    });

    // Step C: Trigger completion calculation via Groq's high-speed execution hardware
    const chatCompletion = await groq.chat.completions.create({
      messages: formattedMessages,
      model: 'llama-3.3-70b-versatile', // Highly advanced, ultra-fast free tier model
      temperature: 0.7,
      max_tokens: 4096,
    });

    // Extract and return the clean string response back to the controller
    return chatCompletion.choices[0]?.message?.content || '';

  } catch (error) {
    console.error("⚡ Groq Generation Layer Exception:", error);

    // Normalize Groq rate limits or over-capacity codes to trigger your controller's graceful fallback layout
    if (error.status === 429 || error.status === 503) {
      error.status = 503; // Forces the controller's "high demand" text block to fire gracefully
    }

    throw error;
  }
}; 