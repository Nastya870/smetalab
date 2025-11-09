import Papa from 'papaparse';
import axiosInstance from 'utils/axiosInstance';

/**
 * API для импорта/экспорта материалов через CSV
 */

const materialsImportExportAPI = {
  /**
   * Скачать шаблон CSV для импорта материалов
   */
  downloadTemplate: async () => {
    // ✅ Данные с русскими заголовками (как будет в Excel)
    const templateData = [
      {
        'Артикул': 'MAT-001',
        'Наименование': 'Бетон М300',
        'Категория': 'Строительные материалы',
        'Единица измерения': 'м³',
        'Цена': 4200.00,
        'Поставщик': 'ООО "СтройМатериалы"',
        'Вес (кг)': 2400.0,
        'Автоматический расчёт': 'да', // ✅ да/нет вместо true/false
        'Расход на единицу': 1.05,
        'URL изображения': 'https://example.com/beton.jpg',
        'URL товара': 'https://example.com/products/beton-m300',
        'Показывать изображение': 'да'
      },
      {
        'Артикул': 'MAT-002',
        'Наименование': 'Клей универсальный',
        'Категория': 'Клеи и герметики',
        'Единица измерения': 'кг',
        'Цена': 350.00,
        'Поставщик': 'ООО "КлейХим"',
        'Вес (кг)': 25.0,
        'Автоматический расчёт': 'нет', // ✅ Ручной ввод
        'Расход на единицу': 0,
        'URL изображения': '',
        'URL товара': '',
        'Показывать изображение': 'нет'
      },
      {
        'Артикул': 'MAT-003',
        'Наименование': 'Арматура А500С Ø12',
        'Категория': 'Металлопрокат',
        'Единица измерения': 'м',
        'Цена': 85.00,
        'Поставщик': 'Металлобаза №1',
        'Вес (кг)': 0.888,
        'Автоматический расчёт': 'да',
        'Расход на единицу': 15.5,
        'URL изображения': '',
        'URL товара': '',
        'Показывать изображение': 'нет'
      }
    ];

    // ✅ Конфигурация Papa.unparse для корректного CSV
    const csv = '\ufeff' + Papa.unparse(templateData, {
      quotes: false, // Убираем кавычки (Excel лучше понимает)
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ',', // ✅ Явно указываем запятую
      header: true,
      newline: '\r\n', // ✅ Windows-style перенос строки для Excel
      skipEmptyLines: false,
      columns: [
        'Артикул', 
        'Наименование', 
        'Категория', 
        'Единица измерения', 
        'Цена', 
        'Поставщик', 
        'Вес (кг)', 
        'Автоматический расчёт', 
        'Расход на единицу', 
        'URL изображения', 
        'URL товара', 
        'Показывать изображение'
      ]
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'materials_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Экспортировать материалы в CSV
   * @param {Array} materials - массив материалов для экспорта
   * @param {Object} params - параметры экспорта (category, isGlobal, supplier)
   */
  exportMaterials: async (materials, params = {}) => {
    if (!materials || materials.length === 0) {
      throw new Error('Нет материалов для экспорта');
    }

    // ✅ Преобразуем данные с русскими заголовками
    const exportData = materials.map(material => {
      const autoCalc = material.autoCalculate !== undefined 
        ? material.autoCalculate 
        : material.auto_calculate !== undefined 
        ? material.auto_calculate 
        : true;
      
      const showImg = material.showImage !== undefined 
        ? material.showImage 
        : material.show_image || false;

      return {
        'Артикул': material.sku || '',
        'Наименование': material.name || '',
        'Категория': material.category || '',
        'Единица измерения': material.unit || 'шт',
        'Цена': material.price || 0,
        'Поставщик': material.supplier || '',
        'Вес (кг)': material.weight || 0,
        'Автоматический расчёт': autoCalc ? 'да' : 'нет',
        'Расход на единицу': material.consumption || 0,
        'URL изображения': material.image || '',
        'URL товара': material.productUrl || material.product_url || '',
        'Показывать изображение': showImg ? 'да' : 'нет'
      };
    });

    const csv = '\ufeff' + Papa.unparse(exportData, {
      quotes: false,
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ',', // ✅ Запятая
      header: true,
      newline: '\r\n', // ✅ Windows перенос
      skipEmptyLines: false,
      columns: [
        'Артикул', 
        'Наименование', 
        'Категория', 
        'Единица измерения', 
        'Цена', 
        'Поставщик', 
        'Вес (кг)', 
        'Автоматический расчёт', 
        'Расход на единицу', 
        'URL изображения', 
        'URL товара', 
        'Показывать изображение'
      ]
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Формирование имени файла с параметрами
    let filename = 'materials';
    if (params.category) filename += `_${params.category}`;
    if (params.isGlobal === true) filename += '_global';
    if (params.isGlobal === false) filename += '_my';
    filename += `_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Импортировать материалы из CSV (пакетная отправка)
   * @param {Array} materials - массив материалов для импорта
   * @param {Object} options - опции импорта { mode: 'add' | 'replace', isGlobal: boolean }
   */
  importMaterials: async (materials, options = {}) => {
    const { mode = 'add', isGlobal = false } = options;

    if (!materials || materials.length === 0) {
      throw new Error('Нет материалов для импорта');
    }

    const BATCH_SIZE = 50; // Размер пакета для предотвращения таймаута
    const batches = [];
    
    // Разбиваем на пакеты по 50 материалов
    for (let i = 0; i < materials.length; i += BATCH_SIZE) {
      batches.push(materials.slice(i, i + BATCH_SIZE));
    }

    let totalSuccess = 0;
    let totalErrors = 0;
    let allErrors = [];

    // Отправляем каждый пакет последовательно
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNum = i + 1;
      
      console.log(`Отправка пакета материалов ${batchNum}/${batches.length}: ${batch.length} материалов...`);
      
      try {
        const response = await axiosInstance.post('/materials/bulk', {
          materials: batch,
          mode,
          isGlobal
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
      } catch (error) {
        console.error(`Ошибка в пакете ${batchNum}:`, error);
        totalErrors += batch.length;
        allErrors.push({
          batch: batchNum,
          error: error.response?.data?.message || error.message
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
      message: `Импортировано ${totalSuccess} материалов, ошибок: ${totalErrors}`
    };
  }
};

export default materialsImportExportAPI;
