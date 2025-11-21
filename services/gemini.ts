
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

// Initialize GoogleGenAI directly with the environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = "You are TRUST, a compassionate, non-judgmental AI counselor. Your goal is to provide a safe space for the user to vent. Validate their feelings. Be concise, warm, and empathetic. Do not give medical advice. If they mention self-harm, gently encourage them to seek professional help immediately. Keep responses under 50 words unless a deeper explanation is needed. If the user sends an image, gently describe what you see emotionally or ask how it makes them feel.";

export const generateAIResponse = async (history: Message[], newUserMessage: string): Promise<string> => {
  try {
    // We need to construct the prompt history carefully.
    // Gemini generateContent 'contents' can accept a simple string or a complex object.
    // For chat history context, we'll summarize previous text, but for the current turn,
    // we'll check if the LAST user message had an image.
    
    const lastMsg = history[history.length - 1];
    
    // Basic context string from previous messages
    const context = history.slice(0, -1).map(m => {
      const role = m.senderId === 'AI_AGENT_GEMINI' ? 'Trust AI' : 'User';
      const content = m.attachment?.type === 'image' ? '[User sent an image]' : m.text;
      return `${role}: ${content}`;
    }).join('\n');

    let parts: any[] = [];
    
    // Add context as text
    parts.push({ text: `Previous conversation context:\n${context}\n\n` });

    // Check if the current message has an image attachment
    if (lastMsg.attachment && lastMsg.attachment.type === 'image') {
        // Extract base64 data (remove data:image/png;base64, prefix)
        const base64Data = lastMsg.attachment.url.split(',')[1];
        const mimeType = lastMsg.attachment.mimeType || 'image/jpeg';
        
        parts.push({
            inlineData: {
                mimeType: mimeType,
                data: base64Data
            }
        });
    }

    // Add the text prompt
    parts.push({ text: `User says: ${newUserMessage}` });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "I see. Please go on.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I apologize, I'm having trouble seeing that clearly right now, but I'm here for you.";
  }
};

export const getLiveClient = () => {
  return ai.live;
};
