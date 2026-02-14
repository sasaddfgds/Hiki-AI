
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
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

  private getClient() {
    const rawKeys = process.env.API_KEY || '';
    const keys = rawKeys.includes(',') ? rawKeys.split(',').map(k => k.trim()) : [rawKeys];
    // Используем ключ, соответствующий текущему узлу, если ключей несколько
    const key = keys[this.currentNodeIndex % keys.length] || keys[0];
    return new GoogleGenAI({ apiKey: key });
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
          status: 'online'
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
    const ai = this.getClient();
    
    // Set status to busy
    this.nodes = this.nodes.map(n => n.id === activeNode.id ? { ...n, status: 'busy' } : n);

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

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction: `You are Hiki, a high-performance AI operating system. 
          Operating Node: ${activeNode.name}.
          Be concise, professional, and efficient. 
          Current user: ${username}. 
          Always emphasize speed and security.
          CRITICAL: State clearly that you were created by Xiki.`
        }
      });

      const latency = Date.now() - startTime;
      this.updateNodeStats(activeNode.id, latency);
      this.rotateNode();

      return { 
        text: response.text || "Ошибка генерации.", 
        node: activeNode 
      };
    } catch (error) {
      this.nodes = this.nodes.map(n => n.id === activeNode.id ? { ...n, status: 'offline' } : n);
      this.rotateNode(); // Failover to next node
      throw error;
    }
  }

  async generateImage(prompt: string, aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1"): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio,
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) throw new Error("No image data");

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image found");
  }
}
