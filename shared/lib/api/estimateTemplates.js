/**
 * API клиент для работы с шаблонами смет
 * Prefix: /estimate-templates (baseURL /api уже в axiosInstance)
 */

import axiosInstance from 'utils/axiosInstance';

const estimateTemplatesAPI = {
  /**
   * Получить список шаблонов пользователя
   */
  getTemplates: async () => {
    const response = await axiosInstance.get('/estimate-templates');
    return response.data;
  },

  /**
   * Получить шаблон по ID с работами и материалами
   */
  getTemplateById: async (templateId) => {
    const response = await axiosInstance.get(`/estimate-templates/${templateId}`);
    return response.data;
  },

  /**
   * Создать новый шаблон
   */
  createTemplate: async (data) => {
    const response = await axiosInstance.post('/estimate-templates', data);
    return response.data;
  },

  /**
   * Обновить шаблон (только метаданные: name, description, category)
   */
  updateTemplate: async (templateId, data) => {
    const response = await axiosInstance.put(`/estimate-templates/${templateId}`, data);
    return response.data;
  },

  /**
   * Удалить шаблон
   */
  deleteTemplate: async (templateId) => {
    const response = await axiosInstance.delete(`/estimate-templates/${templateId}`);
    return response.data;
  },

  /**
   * Применить шаблон к смете (копировать работы и материалы с текущими ценами)
   */
  applyTemplate: async (templateId, estimateId) => {
    console.log('🔍 [Frontend] applyTemplate called with:', { templateId, estimateId });
    console.log('🔍 [Frontend] typeof templateId:', typeof templateId);
    console.log('🔍 [Frontend] typeof estimateId:', typeof estimateId);
    
    const payload = { estimateId };
    console.log('🔍 [Frontend] payload:', payload);
    console.log('🔍 [Frontend] JSON.stringify(payload):', JSON.stringify(payload));
    
    const response = await axiosInstance.post(
      `/estimate-templates/${templateId}/apply`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }
};

export default estimateTemplatesAPI;
