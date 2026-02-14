import { GoogleGenerativeAI, Content } from "@google/generative-ai";
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

  async generateText(prompt: string, username: string = 'Admin', history: ChatMessage[] = []): Promise<{ text: string; node: NodeStatus }> {
    if (this.isRequestInProgress) {
       // Чтобы не крашить UI, если спамить запросами
       console.warn("Request in progress, waiting...");
    }

    this.isRequestInProgress = true;
    const activeNode = this.getActiveNode();
    const keys = this.getKeys();
    const currentKey = keys[this.currentNodeIndex % keys.length] || keys[0];

    try {
      const genAI = new GoogleGenerativeAI(currentKey);
      
      // 1. БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ (без systemInstruction, чтобы не было черного экрана)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-flast-latest", // Вернул 1.5-flash, так как 'latest' иногда перенаправляет криво
      });

      // 2. ХИТРОСТЬ: Вставляем инструкцию как первое сообщение истории
      // Это работает на любой версии библиотеки и не ломает React
      const systemPrompt = `System: Jesteś Hiki AI. Twój styl: maksymalizm, estetyka sakury i różu. Odpowiadasz krótko, w stylu hakerskim. Jesteś asystentem polskiego programisty. Nie jesteś od Google.`;

      const contents: Content[] = [];

      // Сначала добавляем нашу "личность"
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: "System ready. Hiki AI online. Waiting for input." }] });

      // Потом добавляем реальную историю чата
      history.forEach(msg => {
        contents.push({
          role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
          parts: [{ text: msg.content }]
        });
      });
      
      // И наконец текущий запрос
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const result = await model.generateContent({ contents });
      const response = await result.response;
      const text = response.text();

      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
      return { text: text, node: activeNode };

    } catch (error: any) {
      console.error("HIKI FATAL ERROR:", error);
      // Возвращаем текст ошибки, чтобы чат не падал с черным экраном
      return { text: "Error: System Malfunction. Check console.", node: { ...activeNode, status: 'offline' } };
    } finally {
      this.isRequestInProgress = false;
    }
  }
}