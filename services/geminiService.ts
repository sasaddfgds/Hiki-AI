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
    { id: 'node-alpha', name: 'Alpha-1', status: 'online', latency: 42, load: 12 },
    { id: 'node-beta', name: 'Beta-2', status: 'online', latency: 38, load: 8 },
    { id: 'node-gamma', name: 'Gamma-3', status: 'online', latency: 51, load: 15 }
  ];
  private currentNodeIndex = 0;

  private constructor() {}

  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  private getKeys(): string[] {
    // Кастуем к any, чтобы TS не ругался на отсутствие типов Vite
    const env = (import.meta as any).env;
    const rawKeys = env.VITE_API_KEY || "";
    return rawKeys.split(',').map((k: string) => k.replace(/\s/g, '')).filter(Boolean);
  }

  public getAllNodes(): NodeStatus[] {
    return this.nodes;
  }

  private rotateNode() {
    this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
  }

  async generateText(prompt: string, username: string = 'Guest', history: ChatMessage[] = []): Promise<{ text: string; node: NodeStatus }> {
    const startTime = Date.now();
    const activeNode = this.nodes[this.currentNodeIndex];
    const keys = this.getKeys();
    const currentKey = keys[this.currentNodeIndex % keys.length] || keys[0];
    
    if (!currentKey) throw new Error("API Key missing");

    const genAI = new GoogleGenerativeAI(currentKey);
    // Пробуем базовое имя модели без суффиксов
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
      const contents: Content[] = history.map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: msg.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const result = await model.generateContent({ contents });
      const response = await result.response;
      
      this.rotateNode();
      return { text: response.text(), node: activeNode };
    } catch (error: any) {
      this.rotateNode();
      throw error;
    }
  }
}