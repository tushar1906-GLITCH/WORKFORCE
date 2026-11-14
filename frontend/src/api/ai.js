import apiClient from './client';

export const aiApi = {
  sendMessage: (message, conversationId) =>
    apiClient.post('/ai/chat', { message, conversationId }),

  getConversations: () =>
    apiClient.get('/ai/conversations'),

  getConversation: (id) =>
    apiClient.get(`/ai/conversations/${id}`),

  deleteConversation: (id) =>
    apiClient.delete(`/ai/conversations/${id}`),

  getCommandCenterInsights: () =>
    apiClient.get('/ai/command-center-insights'),
};

export default aiApi;
