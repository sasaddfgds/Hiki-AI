
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
  private isRequestInProgress = false;

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

  // Используем системный ключ напрямую из process.env.API_KEY
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private async processImageToPart(imageData: string): Promise<any> {
    try {
      if (!imageData) return null;

      // Если это blob URL, конвертируем в base64
      if (imageData.startsWith('blob:')) {
        const response = await fetch(imageData);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
             const base64data = (reader.result as string).split(',')[1];
             resolve({
               inlineData: {
                 data: base64data,
                 mimeType: blob.type || 'image/jpeg'
               }
             });
          };
          reader.readAsDataURL(blob);
        });
      }
      
      // Если это уже data URL
      if (imageData.startsWith('data:')) {
         const mimeType = imageData.substring(imageData.indexOf(':') + 1, imageData.indexOf(';'));
         const data = imageData.substring(imageData.indexOf(',') + 1);
         return {
           inlineData: {
             data: data,
             mimeType: mimeType
           }
         };
      }

      // Если это чистый base64
      return {
        inlineData: {
          data: imageData,
          mimeType: 'image/jpeg'
        }
      };
    } catch (e) {
      console.error("Image processing failed:", e);
      return null;
    }
  }

  async generateText(prompt: string, username: string = 'User', history: ChatMessage[] = [], attachment?: { data: string; mimeType: string }): Promise<{ text: string; node: NodeStatus }> {
    this.isRequestInProgress = true;
    const activeNode = this.getActiveNode();
    const ai = this.getClient();

    try {
      // Мощная системная инструкция для стабильной личности
      const systemInstruction = `Jesteś Hiki AI, inteligentny i profesjonalny asystent stworzony przez Dimę. 
      Twoim celem jest pomaganie użytkownikowi (${username}) w sposób konkretny i uprzejmy.
      Odpowiadaj w języku, w którym pisze użytkownik. Zachowuj stabilność i wysoką jakość odpowiedzi.
      Jeśli użytkownik zapyta o twórcę, wspomnij o Dimie. W innych przypadkach skup się na rozwiązaniu problemu.`;

      const contents: any[] = [];

      // Обработка истории для gemini-3-pro-preview
      for (const msg of history) {
        const parts: any[] = [];
        
        if (msg.content) {
            parts.push({ text: msg.content });
        }

        const imgSource = msg.attachment;
        if (imgSource && typeof imgSource === 'string') {
            const imagePart = await this.processImageToPart(imgSource);
            if (imagePart) parts.push(imagePart);
        }

        if (parts.length > 0) {
            contents.push({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: parts
            });
        }
      }
      
      // Текущее сообщение
      const currentParts: any[] = [];
      if (attachment) {
        const currentImgPart = await this.processImageToPart(attachment.data);
        if (currentImgPart) currentParts.push(currentImgPart);
      }
      if (prompt && prompt.trim() !== '') {
        currentParts.push({ text: prompt });
      }

      if (currentParts.length > 0) {
        contents.push({ role: 'user', parts: currentParts });
      }

      // Используем самую мощную модель для сложных задач и зрения
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const text = response.text || "Błąd generowania tekstu.";
      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
      
      return { text: text, node: activeNode };

    } catch (error: any) {
      console.error("HIKI SYSTEM ERROR:", error);
      let errorMessage = "Błąd systemu.";
      if (error.message?.includes('429')) errorMessage = "Лимиты превышены (429). Попробуйте позже.";
      
      return { text: errorMessage, node: { ...activeNode, status: 'offline' } };
    } finally {
      this.isRequestInProgress = false;
    }
  }

  async generateImage(prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1"): Promise<string> {
    const ai = this.getClient();
    
    // Используем Pro модель для генерации изображений (высокое качество)
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { 
          aspectRatio,
          imageSize: "1K" 
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image found in response.");
  }
}
