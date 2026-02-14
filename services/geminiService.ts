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
    { id: 'node-alpha', name: 'Sakura-Text-Core', status: 'online', latency: 5, load: 10 },
    { id: 'node-beta', name: 'Neon-Link-Stable', status: 'online', latency: 8, load: 15 }
  ];
  
  private currentNodeIndex = 0;

  private constructor() {}

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  public getActiveNode(): NodeStatus {
    return this.nodes[this.currentNodeIndex];
  }

  public getAllNodes(): NodeStatus[] {
    return this.nodes;
  }

  private getApiKey(): string {
    const env = (import.meta as any).env;
    return (env.VITE_GROQ_API_KEY || "").trim();
  }

  async generateText(
    prompt: string, 
    username: string = 'User', 
    history: ChatMessage[] = []
  ): Promise<{ text: string; node: NodeStatus }> {
    const activeNode = this.getActiveNode();
    const apiKey = this.getApiKey();

    try {
      if (!apiKey) throw new Error("API_KEY_NOT_FOUND");

      const messages: any[] = [
        {
          role: "system",
          content: `Jesteś Hiki AI, inteligentny i naturalny asystent. Twoim stwórcą jest Dima. Rozmawiasz z ${username}. Odpowiadaj bezpośrednio i pomocnie w języku użytkownika.`
        }
      ];

      for (const msg of history) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }

      messages.push({ role: "user", content: prompt || "Cześć!" });

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: messages,
          temperature: 0.7,
          max_tokens: 2048
        })
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error.message);

      const text = result.choices[0]?.message?.content || "Brak odpowiedzi.";
      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;

      return { text, node: activeNode };

    } catch (error: any) {
      return { 
        text: `Błąd komunikacji: ${error.message}`, 
        node: { ...activeNode, status: 'offline' } 
      };
    }
  }

  async generateImage(prompt: string): Promise<string> {
    throw new Error("Funkcja obrazów jest obecnie wyłączona.");
  }
}