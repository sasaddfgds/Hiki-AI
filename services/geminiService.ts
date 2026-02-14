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
      
      // Используем модель, которая поддерживает и текст, и картинки
      const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest", 
      });

      // 1. Простая и понятная личность
      const systemContext = `
        SYSTEM: Ty jesteś Hiki AI. Stworzył cię Дима (Dima). Jesteś pomocnym i naturalnym asystentem. Odpowiadaj normalnie.
      `;

      const contents: Content[] = [];

      // Внушаем личность (безопасный метод)
      contents.push({ role: 'user', parts: [{ text: systemContext }] });
      contents.push({ role: 'model', parts: [{ text: "Zrozumiałem. Jestem Hiki AI, stworzył mnie Dima. W czym mogę pomóc?" }] });

      // 2. ВОТ ТУТ БЫЛА ОШИБКА. Теперь мы обрабатываем И текст, И картинki.
      history.forEach(msg => {
        const parts: Part[] = [];
        
        // Если у сообщения есть текст, добавляем его
        if (msg.content) {
            parts.push({ text: msg.content });
        }

        // --- ФИКС ДЛЯ КАРТИНОК ---
        // Проверяем, есть ли свойство image (предполагаем, что это base64 строка)
        // Мы используем (msg as any), потому что я nie вижу твой интерфейс ChatMessage,
        // но обычно картинки хранятся так.
        if ((msg as any).image && typeof (msg as any).image === 'string') {
            try {
                const base64String = (msg as any).image;
                // Ожидаем формат: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
                const base64Data = base64String.split(',')[1]; // Берем часть после запятой
                const mimeType = base64String.split(';')[0].split(':')[1] || 'image/jpeg'; // Пытаемся достать тип, или ставим дефолт

                if (base64Data) {
                    parts.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    });
                }
            } catch (e) {
                console.error("Error processing image data:", e);
            }
        }
        // -------------------------

        if (parts.length > 0) {
            contents.push({
              role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
              parts: parts
            });
        }
      });
      
      // Добавляем текущий промпт, если он есть и не пустой (иногда он уже в истории)
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
      // Мягкая обработка ошибки, чтобы не крашить весь чат
      let errorMessage = "Przepraszam, coś poszło nie tak.";
      if (error.message?.includes('429')) errorMessage = "Zbyt wiele zapytań. Daj mi chwilę odpocząć.";
      if (error.message?.includes('SAFETY')) errorMessage = "Nie mogę odpowiedzieć na to pytanie ze względów bezpieczeństwa.";

      return { text: errorMessage + ` (Code: ${error.status || 'Error'})`, node: { ...activeNode, status: 'offline' } };
    } finally {
      this.isRequestInProgress = false;
    }
  }
}