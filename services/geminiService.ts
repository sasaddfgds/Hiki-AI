import { GoogleGenerativeAI, Content, Part } from "@google/generative-ai";
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

  private getKeys(): string[] {
    const env = (import.meta as any).env;
    const rawKeys = env.VITE_API_KEY || "";
    return rawKeys.split(',').map((k: string) => k.replace(/\s/g, '')).filter(Boolean);
  }

  public getActiveNode(): NodeStatus {
    return this.nodes[this.currentNodeIndex];
  }

  public getAllNodes(): NodeStatus[] {
    return this.nodes;
  }

  // Helper do konwersji obrazu na format zrozumiały dla Gemini
  private async processImage(imageData: string): Promise<Part | null> {
    try {
      // Jeśli to Blob URL (np. blob:http://localhost...)
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
      
      // Jeśli to czyste Base64 (data:image/...)
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

  async generateText(prompt: string, username: string = 'User', history: ChatMessage[] = []): Promise<{ text: string; node: NodeStatus }> {
    if (this.isRequestInProgress) {
       this.isRequestInProgress = false; 
    }

    this.isRequestInProgress = true;
    const activeNode = this.getActiveNode();
    const keys = this.getKeys();
    const currentKey = keys[this.currentNodeIndex % keys.length] || keys[0];

    try {
      const genAI = new GoogleGenerativeAI(currentKey);
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest", 
      });

      const systemContext = `
        SYSTEM: Ty jesteś Hiki AI.
        Twórca: Дима (Dima). To jest twój stwórca i administrator.
        Styl: Hakerski, zwięzły, cyberpunk, neon.
        Zadanie: Analiza danych i pomoc Dima.
        Nie jesteś produktem Google.
      `;

      const contents: Content[] = [];

      contents.push({ role: 'user', parts: [{ text: systemContext }] });
      contents.push({ role: 'model', parts: [{ text: "Zrozumiałem. Hiki AI online. Czekam na polecenia, Dima." }] });

      // Przetwarzamy historię asynchronicznie, żeby wyciągnąć obrazki
      for (const msg of history) {
        const parts: Part[] = [];
        
        if (msg.content) {
            parts.push({ text: msg.content });
        }

        // Sprawdzamy różne możliwe nazwy pól z obrazkiem
        const imgSource = (msg as any).image || (msg as any).attachment || (msg as any).img;
        
        if (imgSource && typeof imgSource === 'string') {
            const imagePart = await this.processImage(imgSource);
            if (imagePart) {
                parts.push(imagePart);
            }
        }

        if (parts.length > 0) {
            contents.push({
              role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
              parts: parts
            });
        }
      }
      
      if (prompt && prompt.trim() !== '') {
           contents.push({ role: 'user', parts: [{ text: prompt }] });
      }

      const result = await model.generateContent({ contents });
      const response = await result.response;
      const text = response.text();

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
}