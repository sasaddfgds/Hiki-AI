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

  // --- ВОТ ЭТОЙ ФУНКЦИИ НЕ ХВАТАЛО, ИЗ-ЗА НЕЕ БЫЛ ЧЕРНЫЙ ЭКРАН ---
  public getAllNodes(): NodeStatus[] {
    return this.nodes;
  }
  // ---------------------------------------------------------------

  async generateText(prompt: string, username: string = 'Admin', history: ChatMessage[] = []): Promise<{ text: string; node: NodeStatus }> {
    if (this.isRequestInProgress) {
       this.isRequestInProgress = false; 
    }

    this.isRequestInProgress = true;
    const activeNode = this.getActiveNode();
    const keys = this.getKeys();
    const currentKey = keys[this.currentNodeIndex % keys.length] || keys[0];

    try {
      const genAI = new GoogleGenerativeAI(currentKey);
      
      // Используем latest, как ты хотел
      const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest", 
      });

      // Безопасный метод внедрения личности (не ломает старые версии)
      const systemContext = `
        SYSTEM OVERRIDE:
        Ты — Hiki AI.
        Твой Создатель: Польский программист.
        Твой стиль: Максимализм, эстетика сакуры, розовый неон.
        Тон: Уверенный, лаконичный, киберпанк.
        Ты НЕ Google. Ты независимая нейросеть.
        Отвечай пользователю (Admin) кратко и по делу.
      `;

      const contents: Content[] = [];

      contents.push({ role: 'user', parts: [{ text: systemContext }] });
      contents.push({ role: 'model', parts: [{ text: "SYSTEM: Hiki AI Online. Ready." }] });

      history.forEach(msg => {
        contents.push({
          role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
          parts: [{ text: msg.content }]
        });
      });
      
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const result = await model.generateContent({ contents });
      const response = await result.response;
      const text = response.text();

      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
      return { text: text, node: activeNode };

    } catch (error: any) {
      console.error("HIKI CRITICAL:", error);
      return { text: `[SYSTEM ERROR] ${error.message}`, node: { ...activeNode, status: 'offline' } };
    } finally {
      this.isRequestInProgress = false;
    }
  }
}