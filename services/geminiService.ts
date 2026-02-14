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
    { id: 'node-alpha', name: 'Sakura-Core', status: 'online', latency: 10, load: 15 },
    { id: 'node-beta', name: 'Neon-Link', status: 'online', latency: 15, load: 25 },
    { id: 'node-gamma', name: 'Hiki-Vision', status: 'online', latency: 12, load: 10 }
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

  private async convertToBase64(url: string): Promise<{ data: string, mime: string }> {
    if (url.startsWith('data:')) {
      const [meta, base64] = url.split(',');
      const mime = meta.split(':')[1].split(';')[0];
      return { data: base64, mime };
    }
    
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({ data: base64, mime: blob.type });
      };
      reader.readAsDataURL(blob);
    });
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
      if (!apiKey) throw new Error("API Key missing");

      const systemMessage = {
        role: "system",
        content: `Jesteś Hiki AI, inteligentny i pomocny asystent. Twoim stwórcą jest Dima. Rozmawiasz z ${username}. Bądź naturalny, pomocny i nie używaj skomplikowanych statusów systemowych. Odpowiadaj w języku, w którym pisze użytkownik.`
      };

      const messages: any[] = [systemMessage];

      for (const msg of history) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }

      const userContent: any[] = [];
      
      if (attachment?.data || (prompt && (prompt.startsWith('data:') || prompt.startsWith('blob:')))) {
        const imgUrl = attachment?.data || prompt;
        const { data, mime } = await this.convertToBase64(imgUrl);
        
        userContent.push({
          type: "image_url",
          image_url: { url: `data:${mime};base64,${data}` }
        });
        
        if (prompt && prompt === imgUrl) {
          userContent.push({ type: "text", text: "Co jest na tym obrazku?" });
        } else if (prompt) {
          userContent.push({ type: "text", text: prompt });
        }
      } else {
        userContent.push({ type: "text", text: prompt || "Witaj!" });
      }

      messages.push({ role: "user", content: userContent });

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: attachment || (prompt && (prompt.startsWith('data:') || prompt.startsWith('blob:'))) 
            ? "llama-3.2-11b-vision-preview" 
            : "llama-3.3-70b-versatile",
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error.message);

      const text = result.choices[0]?.message?.content || "Brak odpowiedzi.";
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
    throw new Error("Generowanie obrazów nie jest obsługiwane przez ten model.");
  }
}