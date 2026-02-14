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
    const env = (import.meta as any).env;
    const rawKeys = env.VITE_API_KEY || "";
    return rawKeys.split(',').map((k: string) => k.replace(/\s/g, '')).filter(Boolean);
  }

  private rotateNode() {
    this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
  }

  public getActiveNode(): NodeStatus {
    return this.nodes[this.currentNodeIndex];
  }

  public getAllNodes(): NodeStatus[] {
    return this.nodes;
  }

  private updateNodeStats(nodeId: string, latency: number) {
    this.nodes = this.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          latency,
          load: Math.min(100, node.load + Math.floor(Math.random() * 10)),
          status: 'online' as const
        };
      }
      return {
        ...node,
        load: Math.max(5, node.load - Math.floor(Math.random() * 5))
      };
    });
  }

  async generateText(
    prompt: string, 
    username: string = 'Guest', 
    history: ChatMessage[] = []
  ): Promise<{ text: string; node: NodeStatus }> {
    const startTime = Date.now();
    const activeNode = this.getActiveNode();
    const keys = this.getKeys();
    const currentKey = keys[this.currentNodeIndex % keys.length] || keys[0];
    
    if (!currentKey) throw new Error("API Key missing!");

    const genAI = new GoogleGenerativeAI(currentKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash"
    });
    
    this.nodes = this.nodes.map(n => n.id === activeNode.id ? { ...n, status: 'busy' as const } : n);

    try {
      const contents: Content[] = history.map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: msg.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const result = await model.generateContent({ contents });
      const response = await result.response;
      const text = response.text();

      const latency = Date.now() - startTime;
      this.updateNodeStats(activeNode.id, latency);
      this.rotateNode();

      return { text, node: activeNode };
    } catch (error: any) {
      this.nodes = this.nodes.map(n => n.id === activeNode.id ? { ...n, status: 'offline' as const } : n);
      this.rotateNode();
      throw error;
    }
  }
}