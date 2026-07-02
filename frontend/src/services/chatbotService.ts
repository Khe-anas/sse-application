import api from './api';

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  response: string;
  suggestions: string[];
  sessionId: string;
}

export const chatbotService = {
  sendMessage: async (data: ChatRequest): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/chatbot/message', data);
    return response.data;
  },
};
