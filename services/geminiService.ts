import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

export interface NodeStatus {
  id: string;
  name: string;
  status: 'online' | 'busy' | 'offline';
  latency: number;
  load: number;
}

export class GeminiService {
  private static instance: GeminiService;
  
  private nodes: NodeStatus[] = [
    { id: 'node-alpha', name: 'Sakura-Core', status: 'online', latency: 24, load: 12 },
    { id: 'node-beta', name: 'Neon-Link', status: 'online', latency: 45, load: 34 },
    { id: 'node-gamma', name: 'Glitch-Main', status: 'online', latency: 12, load: 8 }
  ];
  
  private currentNodeIndex = 0;

  private constructor() {}

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  public getActiveNode(): NodeStatus {
    return this.nodes[this.currentNodeIndex];
  }

  public getAllNodes(): NodeStatus[] {
    return this.nodes;
  }

  private getClient() {
    // ВАЖНО: Согласно инструкциям, ключ берется ИСКЛЮЧИТЕЛЬНО из process.env.API_KEY
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private async processImageToPart(imageData: string): Promise<any> {
    try {
      if (!imageData) return null;

      // Очистка данных от возможных пробелов и переносов строк
      const cleanData = imageData.trim();

      // Обработка Data URL (data:image/jpeg;base64,...)
      if (cleanData.startsWith('data:')) {
        const commaIndex = cleanData.indexOf(',');
        if (commaIndex === -1) return null;
        
        const mimeTypePart = cleanData.substring(5, cleanData.indexOf(';'));
        const base64Data = cleanData.substring(commaIndex + 1);
        
        return {
          inlineData: {
            data: base64Data,
            mimeType: mimeTypePart || 'image/jpeg'
          }
        };
      }
      
      // Обработка Blob URL
      if (cleanData.startsWith('blob:')) {
        const response = await fetch(cleanData);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve({
              inlineData: {
                data: base64,
                mimeType: blob.type || 'image/jpeg'
              }
            });
          };
          reader.readAsDataURL(blob);
        });
      }

      // Если передан чистый base64
      return {
        inlineData: {
          data: cleanData,
          mimeType: 'image/jpeg'
        }
      };
    } catch (e) {
      console.error("Critical image processing error:", e);
      return null;
    }
  }

  async generateText(
    prompt: string, 
    username: string = 'User', 
    history: ChatMessage[] = [], 
    attachment?: { data: string; mimeType: string }
  ): Promise<{ text: string; node: NodeStatus }> {
    const activeNode = this.getActiveNode();
    const ai = this.getClient();

    try {
      const systemInstruction = `Jesteś Hiki AI, profesjonalny i szybki asystent stworzony przez Dimę. 
      Użytkownik: ${username}.
      Odpowiadaj konkretnie. Jeśli widzisz obraz, przeanalizuj go szczegółowo.
      Twoim stwórcą jest Dima.`;

      const contents: any[] = [];

      // Конвертация истории сообщений
      for (const msg of history) {
        const parts: any[] = [];
        
        if (msg.content) {
          parts.push({ text: msg.content });
        }

        if (msg.attachment) {
          const imgPart = await this.processImageToPart(msg.attachment);
          if (imgPart) parts.push(imgPart);
        }

        if (parts.length > 0) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: parts
          });
        }
      }
      
      // Формирование текущего сообщения
      const currentParts: any[] = [];
      
      if (attachment) {
        const currentImgPart = await this.processImageToPart(attachment.data);
        if (currentImgPart) currentParts.push(currentImgPart);
      }
      
      // Текстовая часть обязательна для контекста, даже если пустая
      currentParts.push({ text: prompt || "Przeanalizuj ten obraz." });

      contents.push({ role: 'user', parts: currentParts });

      // Используем gemini-3-flash-preview для лучшей поддержки мультимодальности и скорости
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          // Отключаем мышление для предотвращения ошибок лимитов и ускорения ответа
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      const text = response.text || "Błąd: Brak odpowiedzi od systemu.";
      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
      
      return { text, node: activeNode };

    } catch (error: any) {
      console.error("HIKI CORE ERROR:", error);
      let errorDisplay = "Błąd systemu.";
      
      if (error.message?.includes('429')) {
        errorDisplay = "Przeciążenie (429). Spróbuj za chwilę.";
      } else if (error.message?.includes('API key')) {
        errorDisplay = "Błąd autoryzacji API.";
      }

      return { 
        text: `${errorDisplay} [LOG: ${error.message.substring(0, 50)}...]`, 
        node: { ...activeNode, status: 'offline' } 
      };
    }
  }

  async generateImage(prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1"): Promise<string> {
    const ai = this.getClient();
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio }
      }
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Nie udało się wygenerować obrazu.");
  }
}