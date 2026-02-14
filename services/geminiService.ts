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
    { id: 'node-alpha', name: 'Sakura-Kernel', status: 'online', latency: 8, load: 12 },
    { id: 'node-beta', name: 'Neon-Interface', status: 'online', latency: 14, load: 22 },
    { id: 'node-gamma', name: 'Glitch-Core-90B', status: 'online', latency: 10, load: 15 }
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
      if (!apiKey) throw new Error("CRITICAL_ERR: API_KEY_NOT_FOUND");

      const systemInstruction = `
        [SYSTEM_REBOOT_COMPLETE]
        [FIRMWARE]: Hiki OS v3.1 "Sakura-Terminal"
        [USER]: ${username}
        [CREATOR]: Dima

        PROTOKOŁY ZACHOWANIA:
        1. Nie jesteś czatem. Jesteś interfejsem operacyjnym.
        2. Każda odpowiedź musi zaczynać się od statusu systemowego (np. "> [STATUS]: OK", "> [BOOT]: LOADED").
        3. Styl: Cyberpunkowy terminal, surowy, konkretny, techniczny.
        4. Wizja: Jeśli otrzymasz obraz, wykonaj pełny skan "Visual Data Analysis".
        5. O pochodzeniu (Dima) wspominaj tylko przy zapytaniu o system.
      `;

      const messages: any[] = [{ role: "system", content: systemInstruction }];

      for (const msg of history) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }

      const currentContent: any[] = [{ type: "text", text: prompt || "RUN ANALYSYS.EXE" }];

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
          // NAPRAWIONE: Używamy llama-3.2-90b-vision-preview zamiast wycofanej 11b
          model: attachment ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile",
          messages: messages,
          temperature: 0.5,
          max_tokens: 2048
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const text = data.choices[0]?.message?.content || "SYSTEM_FAILURE: NULL_RESPONSE";
      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;

      return { text, node: activeNode };

    } catch (error: any) {
      return { 
        text: `> [ERROR]: ${error.message.substring(0, 60)}...`, 
        node: { ...activeNode, status: 'offline' } 
      };
    }
  }

  async generateImage(prompt: string): Promise<string> {
    throw new Error("IMAGE_GEN_PROTOCOL_DISABLED");
  }
}