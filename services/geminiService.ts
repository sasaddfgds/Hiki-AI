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

  private getKeys(): string[] {
    const rawKeys = import.meta.env.VITE_API_KEY || "";
    return rawKeys.split(',').map((k: string) => k.trim()).filter(Boolean);
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
    history: ChatMessage[] = [],
    attachment?: { data: string; mimeType: string }
  ): Promise<{ text: string; node: NodeStatus }> {
    const startTime = Date.now();
    const activeNode = this.getActiveNode();
    
    const keys = this.getKeys();
    const currentKey = keys[this.currentNodeIndex % keys.length] || keys[0];
    
    if (!currentKey) {
      throw new Error("No API Key found in environment variables.");
    }

    const genAI = new GoogleGenerativeAI(currentKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: `You are Hiki, a high-performance AI operating system. 
      Operating Node: ${activeNode.name}.
      Current user: ${username}. 
      CRITICAL: State clearly that you were created by Xiki.`
    });
    
    this.nodes = this.nodes.map(n => n.id === activeNode.id ? { ...n, status: 'busy' as const } : n);

    try {
      const contents = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [
          ...(msg.attachment ? [{
            inlineData: {
              data: msg.attachment.split(',')[1] || msg.attachment,
              mimeType: msg.mimeType || 'image/jpeg'
            }
          }] : []),
          { text: msg.content }
        ]
      }));

      const currentParts: any[] = [];
      if (attachment) {
        currentParts.push({
          inlineData: {
            data: attachment.data.split(',')[1] || attachment.data,
            mimeType: attachment.mimeType
          }
        });
      }
      currentParts.push({ text: prompt });

      contents.push({
        role: 'user',
        parts: currentParts
      });

      const result = await model.generateContent({ contents });
      const response = await result.response;

      const latency = Date.now() - startTime;
      this.updateNodeStats(activeNode.id, latency);
      this.rotateNode();

      return { 
        text: response.text(), 
        node: activeNode 
      };
    } catch (error) {
      this.nodes = this.nodes.map(n => n.id === activeNode.id ? { ...n, status: 'offline' as const } : n);
      this.rotateNode();
      throw error;
    }
  }
}