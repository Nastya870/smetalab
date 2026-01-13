import Papa from 'papaparse';
import axiosInstance from 'utils/axiosInstance';

/**
 * API для импорта/экспорта материалов через CSV
 */

const materialsImportExportAPI = {
  /**
   * Скачать шаблон CSV для импорта материалов с сервера
   */
  downloadTemplate: async () => {
    const response = await axiosInstance.get('/materials/export-template', {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Шаблон_импорта_материалов.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Экспортировать материалы в CSV (запрос к серверу)
   * @param {Object} params - параметры экспорта (category, isGlobal, supplier)
   */
  exportMaterials: async (params = {}) => {
    const response = await axiosInstance.get('/materials/export', {
      params,
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    let filename = 'Материалы';
    if (params.category) filename += `_${params.category}`;
    if (params.isGlobal === true) filename += '_глобальные';
    if (params.isGlobal === false) filename += '_мои';
    filename += `_${new Date().toISOString().split('T')[0]}.csv`;

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Импортировать материалы из CSV (отправка файла на сервер)
   * @param {File} file - CSV файл
   * @param {Object} options - опции импорта { mode: 'add' | 'replace', isGlobal: boolean }
   */
  importMaterials: async (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', options.mode || 'add');
    if (options.isGlobal) {
      formData.append('isGlobal', 'true');
    }

    const response = await axiosInstance.post('/materials/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  }
};

export default materialsImportExportAPI;
