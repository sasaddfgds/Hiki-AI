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

  // Твой рабочий метод для ключей в Vite
  private getApiKey(): string {
    const env = (import.meta as any).env;
    const key = env.VITE_API_KEY || "";
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
      // Твоя рабочая библиотека и ключ
      const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
      
      // ИЗМЕНЕНИЯ ТОЛЬКО ТУТ: Нормальная личность без шизофрении
      const systemContext = `
        SYSTEM INSTRUCTION:
        Jesteś Hiki AI. Jesteś inteligentnym, uprzejmym i pomocnym asystentem.
        Twój rozmówca ma na imię: ${username}. Zwracaj się do niego po imieniu, jeśli to naturalne w kontekście.
        
        ZASADY:
        1. Styl: Naturalny, profesjonalny, ciepły. Żadnego hakerskiego slangu, żadnych dziwnych symboli na początku zdania.
        2. Odpowiedzi: Konkretne i na temat.
        3. Pochodzenie: Stworzył cię Dima. Mów o tym TYLKO I WYŁĄCZNIE, jeśli użytkownik zapyta "kto cię stworzył?" lub "skąd jesteś?". W innym przypadku nie wspominaj o twórcy.
        4. Język: Odpowiadaj w języku, w którym pisze użytkownik (głównie Rosyjski lub Polski).
      `;

      const contents: any[] = [];

      // Внушаем нормальную личность
      contents.push({ role: 'user', parts: [{ text: systemContext }] });
      contents.push({ role: 'model', parts: [{ text: `Zrozumiałem. Witaj ${username}, w czym mogę Ci dzisiaj pomóc?` }] });

      // Add history
      for (const msg of history) {
        const parts: any[] = [];
        
        if (msg.content) {
            parts.push({ text: msg.content });
        }

        const imgSource = (msg as any).attachment || (msg as any).image;
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

      // ТВОЯ РАБОЧАЯ МОДЕЛЬ (не менял)
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
      if (error.message?.includes('429')) errorMessage = "Przeciążenie łączy (429).";
      
      return { text: `${errorMessage}`, node: { ...activeNode, status: 'offline' } };
    } finally {
      this.isRequestInProgress = false;
    }
  }

  async generateImage(prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1"): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
    
    // ТВОЯ РАБОЧАЯ МОДЕЛЬ КАРТИНОК (не менял)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio }
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