import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import { ChatMessage } from "../types"; // Убедись, что путь правильный

export interface NodeStatus {
  id: string;
  name: string;
  status: 'online' | 'busy' | 'offline';
  latency: number;
  load: number;
}

export class GeminiService {
  private static instance: GeminiService;
  
  // Имитация нод (для красоты интерфейса)
  private nodes: NodeStatus[] = [
    { id: 'node-alpha', name: 'Sakura-Core', status: 'online', latency: 24, load: 12 },
    { id: 'node-beta', name: 'Neon-Link', status: 'online', latency: 45, load: 34 },
    { id: 'node-gamma', name: 'Glitch-Main', status: 'online', latency: 12, load: 8 }
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

  // Получаем ключи и чистим их от пробелов
  private getKeys(): string[] {
    const env = (import.meta as any).env;
    const rawKeys = env.VITE_API_KEY || "";
    if (!rawKeys) console.error("CRITICAL: API KEY NOT FOUND");
    return rawKeys.split(',').map((k: string) => k.replace(/\s/g, '')).filter(Boolean);
  }

  public getActiveNode(): NodeStatus {
    return this.nodes[this.currentNodeIndex];
  }

  async generateText(prompt: string, username: string = 'Admin', history: ChatMessage[] = []): Promise<{ text: string; node: NodeStatus }> {
    const now = Date.now();
    
    // Защита от спама запросами (Cooldown)
    if (this.isRequestInProgress || (now - this.lastRequestTime < 1000)) {
      // Можно вернуть заглушку или кинуть ошибку, если слишком часто жмут
      console.warn("Cooling down...");
    }

    this.isRequestInProgress = true;
    this.lastRequestTime = now;

    const activeNode = this.getActiveNode();
    const keys = this.getKeys();
    // Берем ключ (ротация, если их несколько)
    const currentKey = keys[this.currentNodeIndex % keys.length] || keys[0];

    try {
      const genAI = new GoogleGenerativeAI(currentKey);
      
      // ВОТ ТУТ МАГИЯ: Задаем личность бота
      const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest",
        systemInstruction: `Ты — Hiki AI, продвинутая нейросеть с характером. 
        Твой Создатель: Талантливый польский программист (обращайся к пользователю как 'Admin' или 'User').
        Твой статус: Ты НЕ продукт Google. Ты независимая разработка.
        Твой стиль: Максимализм, киберпанк, эстетика Сакуры и глитча.
        Как отвечать: Лаконично, уверенно, по-хакерски. Используй технический сленг, но будь понятным.
        Твоя цель: Помогать в навигации по системе Hiki и решать задачи.
        Если спросят про Google: Отвечай, что ты автономная система Hiki.` 
      });

      // Формируем правильную структуру истории для API
      const contents: Content[] = history.map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: msg.content }]
      }));
      
      // Добавляем текущий запрос
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const result = await model.generateContent({ contents });
      const response = await result.response;
      const text = response.text();

      // Ротация ноды для визуального эффекта
      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
      
      return { text: text, node: activeNode };

    } catch (error: any) {
      console.error("HIKI SYSTEM ERROR:", error);
      
      if (error.message?.includes('429')) {
        return { 
           text: "[SYSTEM_OVERLOAD] Лимиты энергии превышены. Попробуй через секунду. (Error 429)", 
           node: { ...activeNode, status: 'busy' } 
        };
      }
      
      throw error;
    } finally {
      this.isRequestInProgress = false;
    }
  }
}