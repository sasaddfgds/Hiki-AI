
export enum ToolType {
  CHAT = 'CHAT',
  FLOWS = 'FLOWS',
  DATABASE = 'DATABASE'
}

export interface User {
  id: string;
  username: string;
  password?: string;
}

export interface UserData {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  updatedAt: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  id: string;
  type: 'text';
  userId: string;
  sessionId: string;
}

export interface Project {
  id: string;
  name: string;
  updatedAt: Date;
}
