import Papa from 'papaparse';
import axiosInstance from 'utils/axiosInstance';

/**
 * API клиент для импорта/экспорта работ (с поддержкой PapaParse)
 */

const worksImportExportAPI = {
  /**
   * Скачать шаблон CSV (генерируется на фронтенде)
   */
  downloadTemplate: async () => {
    // Генерируем шаблон CSV на фронтенде
    const templateData = [
      {
        'Код': '01-001',
        'Наименование': 'Разработка грунта экскаватором',
        'Категория': 'Земляные работы',
        'Ед. изм.': 'м³',
        'Базовая цена': 450,
        'Фаза': 'Подготовительные работы',
        'Раздел': 'Земляные работы',
        'Подраздел': 'Разработка грунта'
      },
      {
        'Код': '02-001',
        'Наименование': 'Устройство бетонной подготовки',
        'Категория': 'Бетонные работы',
        'Ед. изм.': 'м³',
        'Базовая цена': 3200,
        'Фаза': 'Основные строительные работы',
        'Раздел': 'Бетонные работы',
        'Подраздел': 'Бетонная подготовка'
      },
      {
        'Код': '03-001',
        'Наименование': 'Кладка стен из кирпича',
        'Категория': 'Кирпичная кладка',
        'Ед. изм.': 'м³',
        'Базовая цена': 4500,
        'Фаза': 'Основные строительные работы',
        'Раздел': 'Каменные работы',
        'Подраздел': 'Кладка стен'
      }
    ];

    // Генерируем CSV с помощью PapaParse
    const csv = '\ufeff' + Papa.unparse(templateData, {
      quotes: true,
      delimiter: ',',
      header: true
    });

    // Создаем Blob и скачиваем
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'works_import_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Экспортировать работы в CSV (генерируется на фронтенде)
   * @param {Array} works - Массив работ для экспорта
   * @param {Object} params - Параметры { isGlobal: 'true' | 'false' }
   */
  exportWorks: async (works, params = {}) => {
    // Преобразуем данные в формат для CSV
    const exportData = works.map(work => ({
      'Код': work.code,
      'Наименование': work.name,
      'Категория': work.category,
      'Ед. изм.': work.unit,
      'Базовая цена': work.basePrice,
      'Фаза': work.phase || '',
      'Раздел': work.section || '',
      'Подраздел': work.subsection || ''
    }));

    // Генерируем CSV с BOM для Excel
    const csv = '\ufeff' + Papa.unparse(exportData, {
      quotes: true,
      delimiter: ',',
      header: true
    });

    // Создаем Blob и скачиваем
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Определяем имя файла
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = params.isGlobal === 'true' 
      ? `works_global_${timestamp}.csv` 
      : `works_tenant_${timestamp}.csv`;
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Импортировать работы (отправка JSON массива пакетами)
   * @param {Array} works - Массив работ (уже распарсенный из CSV)
   * @param {Object} options - Опции { mode: 'add' | 'replace', isGlobal: boolean }
   */
  importWorks: async (works, options = {}) => {
    const BATCH_SIZE = 50; // Размер пакета для предотвращения таймаута
    const batches = [];
    
    // Разбиваем на пакеты по 50 работ
    for (let i = 0; i < works.length; i += BATCH_SIZE) {
      batches.push(works.slice(i, i + BATCH_SIZE));
    }

    let totalSuccess = 0;
    let totalErrors = 0;
    let allErrors = [];

    // Отправляем каждый пакет последовательно
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNum = i + 1;
      
      console.log(`Отправка пакета ${batchNum}/${batches.length}: ${batch.length} работ...`);
      
      try {
        const response = await axiosInstance.post('/works/bulk', {
          works: batch,
          mode: options.mode || 'add',
          isGlobal: options.isGlobal || false
        });

        const data = response.data?.data || response.data;
        totalSuccess += data.successCount || 0;
        totalErrors += data.errorCount || 0;
        
        if (data.errors && data.errors.length > 0) {
          allErrors = allErrors.concat(data.errors);
        }

        // Небольшая задержка между пакетами (500ms)
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.error(`Ошибка в пакете ${batchNum}:`, err);
        totalErrors += batch.length;
        allErrors.push({
          batch: batchNum,
          error: err.response?.data?.message || err.message
        });
        // Продолжаем со следующим пакетом
      }
    }

    // Возвращаем общую статистику
    return {
      success: totalErrors === 0,
      data: {
        successCount: totalSuccess,
        errorCount: totalErrors,
        errors: allErrors
      },
      message: `Импортировано ${totalSuccess} работ, ошибок: ${totalErrors}`
    };
  }
};

export default worksImportExportAPI;
