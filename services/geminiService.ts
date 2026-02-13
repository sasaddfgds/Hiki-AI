
import { GoogleGenAI, Chat } from "@google/genai";

export class GeminiService {
  private static instance: GeminiService;

  private constructor() {}

  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateText(prompt: string, username: string = 'Guest'): Promise<string> {
    const ai = this.getClient();
    const chat: Chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are Hiki, a high-performance AI operating system. Be concise, professional, and efficient. Current user: ${username}. Always emphasize speed and security.`
      }
    });

    const response = await chat.sendMessage({ message: prompt });
    return response.text || "Ошибка генерации.";
  }

  // Fix: Implement missing generateImage method using the gemini-2.5-flash-image model
  async generateImage(prompt: string, aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1"): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio,
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new Error("No content in response candidates");
    }

    // Iterate through parts to find the image part
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");
  }
}
