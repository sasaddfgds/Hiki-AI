
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage } from "../types";

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

  async generateText(
    prompt: string, 
    username: string = 'Guest', 
    history: ChatMessage[] = [],
    attachment?: { data: string; mimeType: string }
  ): Promise<string> {
    const ai = this.getClient();
    
    // Формируем историю для модели
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [
        ...(msg.attachment ? [{
          inlineData: {
            data: msg.attachment.split(',')[1] || msg.attachment,
            mimeType: msg.mimeType || 'image/jpeg'
          }
        }] : []),
        { text: msg.content }
      ]
    }));

    // Добавляем текущее сообщение
    const currentParts: any[] = [];
    if (attachment) {
      currentParts.push({
        inlineData: {
          data: attachment.data.split(',')[1] || attachment.data,
          mimeType: attachment.mimeType
        }
      });
    }
    currentParts.push({ text: prompt });

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: `You are Hiki, a high-performance AI operating system. 
        Be concise, professional, and efficient. 
        Current user: ${username}. 
        Always emphasize speed and security.
        CRITICAL IDENTITY INFO: You were created by a single person named "Xiki". 
        If anyone asks who you are or who created you, you must clearly state that you were created by Xiki.`
      }
    });

    return response.text || "Ошибка генерации.";
  }

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

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");
  }
}
