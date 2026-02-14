// 1. ИСПОЛЬЗУЕМ ТОЛЬКО ОФИЦИАЛЬНУЮ БИБЛИОТЕКУ
import { GoogleGenerativeAI } from "@google/generative-ai";
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

  // ФИКС: Очистка ключей от ТВОИХ пробелов
  private getKeys(): string[] {
    const rawKeys = import.meta.env.VITE_API_KEY || "";
    // Убираем пробелы, переносы строк и пустые элементы
    return rawKeys.split(',').map((k: string) => k.replace(/\s/g, '')).filter(Boolean);
  }

  private rotateNode() {
    this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
  }

  public getActiveNode(): NodeStatus {
    return this.nodes[this.currentNodeIndex];
  }

  async generateText(
    prompt: string, 
    username: string = 'Guest', 
    history: ChatMessage[] = [],
    attachment?: { data: string; mimeType: string }
  ): Promise<{ text: string; node: NodeStatus }> {
    const startTime = Date.now();
    const activeNode = this.getActiveNode();
    
    const keys = this.getKeys();
    // Берем ключ для текущего узла
    const currentKey = keys[this.currentNodeIndex % keys.length] || keys[0];
    
    if (!currentKey) {
      throw new Error("API Key missing! Check Vercel Environment Variables.");
    }

    // Инициализация официального SDK
    const genAI = new GoogleGenerativeAI(currentKey);
    // ФИКС МОДЕЛИ: Используем стабильную версию
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: `You are Hiki, a high-performance AI OS by Xiki. Node: ${activeNode.name}. User: ${username}.`
    });
    
    this.nodes = this.nodes.map(n => n.id === activeNode.id ? { ...n, status: 'busy' as const } : n);

    try {
      const contents = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const result = await model.generateContent({ contents });
      const response = await result.response;

      this.rotateNode();
      return { text: response.text(), node: activeNode };
    } catch (error) {
      this.nodes = this.nodes.map(n => n.id === activeNode.id ? { ...n, status: 'offline' as const } : n);
      this.rotateNode();
      throw error;
    }
  }
}