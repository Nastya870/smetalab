import Papa from 'papaparse';
import axiosInstance from 'utils/axiosInstance';

/**
 * API клиент для импорта/экспорта работ (с поддержкой PapaParse)
 */

const worksImportExportAPI = {
  /**
   * Скачать шаблон CSV с сервера
   */
  downloadTemplate: async () => {
    const response = await axiosInstance.get('/works/export-template', {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Шаблон_импорта_работ.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Экспортировать работы в CSV (запрос к серверу)
   * @param {Object} params - Параметры { isGlobal: 'true' | 'false' }
   */
  exportWorks: async (params = {}) => {
    const response = await axiosInstance.get('/works/export', {
      params,
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = params.isGlobal === 'true'
      ? `Работы_глобальные_${timestamp}.csv`
      : `Работы_экспорт_${timestamp}.csv`;

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Импортировать работы (отправка файла на сервер)
   * @param {File} file - CSV файл
   * @param {Object} options - Опции { mode: 'add' | 'replace', isGlobal: boolean }
   */
  importWorks: async (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', options.mode || 'add');
    if (options.isGlobal) {
      formData.append('isGlobal', 'true');
    }

    const response = await axiosInstance.post('/works/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  }
};

export default worksImportExportAPI;
