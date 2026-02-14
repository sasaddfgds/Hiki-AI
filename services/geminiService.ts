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

  // Хелпер для получения ключа в Vite
  private getApiKey(): string {
    // В Vite доступ к env идет через import.meta.env
    const env = (import.meta as any).env;
    const key = env.VITE_API_KEY || "";
    // Чистим от пробелов и берем первый, если их несколько
    return key.split(',')[0].trim();
  }

  private async processImageToPart(imageData: string): Promise<any> {
    try {
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

      return null;
    } catch (e) {
      console.error("Image processing failed:", e);
      return null;
    }
  }

  async generateText(prompt: string, username: string = 'User', history: ChatMessage[] = [], attachment?: { data: string; mimeType: string }): Promise<{ text: string; node: NodeStatus }> {
    this.isRequestInProgress = true;
    const activeNode = this.getActiveNode();

    try {
      // ИСПРАВЛЕНО: Используем правильный метод получения ключа для Vite
      const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
      
      const systemContext = `
        SYSTEM: Ty jesteś Hiki AI.
        Twórca: Дима (Dima). To jest twój stwórca i administrator.
        Styl: Hakerski, zwięzły, cyberpunk, neon.
        Zadanie: Analiza danych i pomoc Dima.
        Nie jesteś produktem Google.
      `;

      const contents: any[] = [];

      // Initial system-like dialogue
      contents.push({ role: 'user', parts: [{ text: systemContext }] });
      contents.push({ role: 'model', parts: [{ text: "Zrozumiałem. Hiki AI online. Czekam na polecenia, Dima." }] });

      // Add history
      for (const msg of history) {
        const parts: any[] = [];
        
        if (msg.content) {
            parts.push({ text: msg.content });
        }

        const imgSource = (msg as any).attachment || (msg as any).image; // Добавил проверку обоих полей
        if (imgSource && typeof imgSource === 'string') {
            const imagePart = await this.processImageToPart(imgSource);
            if (imagePart) {
                parts.push(imagePart);
            }
        }

        if (parts.length > 0) {
            contents.push({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: parts
            });
        }
      }
      
      // Current message parts
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

      // Твои модели сохранены
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents
      });

      const text = response.text || "Błąd generowania tekstu.";

      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
      return { text: text, node: activeNode };

    } catch (error: any) {
      console.error("HIKI CRITICAL:", error);
      let errorMessage = "Błąd systemu.";
      if (error.message?.includes('429')) errorMessage = "Przeciążenie łączy. (429)";
      
      return { text: `${errorMessage} [${error.message}]`, node: { ...activeNode, status: 'offline' } };
    } finally {
      this.isRequestInProgress = false;
    }
  }

  async generateImage(prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1"): Promise<string> {
    // ИСПРАВЛЕНО: Используем правильный метод получения ключа для Vite
    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
    
    // Твои модели сохранены
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio } // Проверь, поддерживает ли SDK config в таком виде
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