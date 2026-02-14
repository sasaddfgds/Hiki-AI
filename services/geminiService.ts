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
  private isRequestInProgress = false;
  private lastRequestTime = 0;

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

  async generateText(prompt: string, username: string = 'Guest', history: ChatMessage[] = []): Promise<{ text: string; node: NodeStatus }> {
    const now = Date.now();
    
    if (this.isRequestInProgress || (now - this.lastRequestTime < 2000)) {
      throw new Error("System cooling down. Wait a moment.");
    }

    this.isRequestInProgress = true;
    this.lastRequestTime = now;

    const startTime = Date.now();
    const activeNode = this.getActiveNode();
    const keys = this.getKeys();
    const currentKey = keys[this.currentNodeIndex % keys.length] || keys[0];

    try {
      const genAI = new GoogleGenerativeAI(currentKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const contents: Content[] = history.map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: msg.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const result = await model.generateContent({ contents });
      const response = await result.response;

      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
      return { text: response.text(), node: activeNode };
    } catch (error: any) {
      if (error.message?.includes('429')) {
        this.currentNodeIndex = (this.currentNodeIndex + 1) % keys.length;
      }
      throw error;
    } finally {
      this.isRequestInProgress = false;
    }
  }
}