
import { User, UserData, ChatMessage, ChatSession, Notification } from '../types';

/**
 * StorageService - централизованное "ядро" данных приложения (имитация БД).
 */
class StorageService {
  private static instance: StorageService;

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // --- УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ---

  getUsers(): User[] {
    return JSON.parse(localStorage.getItem('hiki_sys_db_users') || '[]');
  }

  registerUser(username: string, password: string): User {
    const users = this.getUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('Пользователь с таким именем уже существует');
    }
    const newUser: User = { id: `u_${Date.now()}`, username, password };
    users.push(newUser);
    localStorage.setItem('hiki_sys_db_users', JSON.stringify(users));
    return newUser;
  }

  loginUser(username: string, password: string): User {
    const users = this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) throw new Error('Неверный логин или пароль');
    return user;
  }

  // --- УПРАВЛЕНИЕ УВЕДОМЛЕНИЯМИ ---

  getNotifications(userId: string): Notification[] {
    const key = `hiki_notifications_${userId}`;
    let notifications = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Инициализация стандартных уведомлений, если пусто
    if (notifications.length === 0) {
      notifications = [
        {
          id: 'n_update_3.1',
          title: 'NOTIF_UPDATE_3_1_TITLE',
          message: 'NOTIF_UPDATE_3_1_MSG',
          timestamp: Date.now(),
          isRead: false,
          type: 'update'
        }
      ];
      localStorage.setItem(key, JSON.stringify(notifications));
    }
    return notifications;
  }

  markAllNotificationsRead(userId: string) {
    const key = `hiki_notifications_${userId}`;
    const notifications = this.getNotifications(userId).map(n => ({ ...n, isRead: true }));
    localStorage.setItem(key, JSON.stringify(notifications));
  }

  // --- УПРАВЛЕНИЕ СЕССИЯМИ ЧАТА ---

  getChatSessions(userId: string): ChatSession[] {
    const sessions = JSON.parse(localStorage.getItem(`hiki_sessions_${userId}`) || '[]');
    return sessions.sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt);
  }

  createChatSession(userId: string, title: string = 'Новый чат'): ChatSession {
    const sessions = this.getChatSessions(userId);
    const newSession: ChatSession = {
      id: `s_${Date.now()}`,
      title,
      userId,
      updatedAt: Date.now()
    };
    sessions.push(newSession);
    localStorage.setItem(`hiki_sessions_${userId}`, JSON.stringify(sessions));
    return newSession;
  }

  updateSessionTitle(userId: string, sessionId: string, title: string) {
    const sessions = this.getChatSessions(userId);
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      session.title = title.length > 30 ? title.substring(0, 30) + '...' : title;
      session.updatedAt = Date.now();
      localStorage.setItem(`hiki_sessions_${userId}`, JSON.stringify(sessions));
    }
  }

  deleteChatSession(userId: string, sessionId: string) {
    const sessions = this.getChatSessions(userId);
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(`hiki_sessions_${userId}`, JSON.stringify(filtered));
    localStorage.removeItem(`hiki_chat_log_${sessionId}`);
  }

  getChatHistory(sessionId: string): ChatMessage[] {
    return JSON.parse(localStorage.getItem(`hiki_chat_log_${sessionId}`) || '[]');
  }

  saveChatHistory(sessionId: string, messages: ChatMessage[]) {
    localStorage.setItem(`hiki_chat_log_${sessionId}`, JSON.stringify(messages));
  }

  // --- УПРАВЛЕНИЕ БАЗОЙ ДАННЫХ (ЗАПИСИ) ---

  getUserData(userId: string): UserData[] {
    return JSON.parse(localStorage.getItem(`hiki_user_records_${userId}`) || '[]');
  }

  saveUserData(userId: string, data: UserData[]) {
    localStorage.setItem(`hiki_user_records_${userId}`, JSON.stringify(data));
  }
}

export const DB = StorageService.getInstance();
