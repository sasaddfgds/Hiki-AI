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
    { id: 'node-alpha', name: 'Sakura-Groq', status: 'online', latency: 15, load: 5 },
    { id: 'node-beta', name: 'Neon-Llama', status: 'online', latency: 20, load: 8 },
    { id: 'node-gamma', name: 'Glitch-Vision', status: 'online', latency: 18, load: 4 }
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
    history: ChatMessage[] = [], 
    attachment?: { data: string; mimeType: string }
  ): Promise<{ text: string; node: NodeStatus }> {
    const activeNode = this.getActiveNode();
    const apiKey = this.getApiKey();

    try {
      if (!apiKey) {
        throw new Error("Brak klucza API w systemie.");
      }

      const messages: any[] = [
        {
          role: "system",
          content: `Jesteś Hiki AI. Twórca: Dima. Użytkownik: ${username}. Twoim zadaniem jest pomagać i analizować dane.`
        }
      ];

      for (const msg of history) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }

      const currentContent: any[] = [{ type: "text", text: prompt || "Analizuj obraz." }];

      if (attachment?.data) {
        const base64Data = attachment.data.includes(',') ? attachment.data.split(',')[1] : attachment.data;
        currentContent.push({
          type: "image_url",
          image_url: { url: `data:${attachment.mimeType || 'image/jpeg'};base64,${base64Data}` }
        });
      }

      messages.push({ role: "user", content: currentContent });

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: attachment ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const text = data.choices[0]?.message?.content || "Błąd odpowiedzi.";
      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;

      return { text, node: activeNode };

    } catch (error: any) {
      return { 
        text: `Błąd: ${error.message}`, 
        node: { ...activeNode, status: 'offline' } 
      };
    }
  }

  async generateImage(prompt: string): Promise<string> {
    throw new Error("Generowanie obrazów tymczasowo niedostępne.");
  }
}