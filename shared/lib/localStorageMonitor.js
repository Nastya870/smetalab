// ============================================
// Утилита для мониторинга localStorage
// ============================================

/**
 * Получить размер данных в localStorage
 * @returns {Object} Информация об использовании
 */
export const getLocalStorageSize = () => {
  let total = 0;
  const items = {};

  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const value = localStorage.getItem(key);
      const size = new Blob([value]).size;
      total += size;
      items[key] = {
        size: size,
        sizeFormatted: formatBytes(size),
        preview: value.substring(0, 50) + (value.length > 50 ? '...' : '')
      };
    }
  }

  return {
    totalBytes: total,
    totalFormatted: formatBytes(total),
    totalMB: (total / 1024 / 1024).toFixed(2),
    percentUsed: ((total / (5 * 1024 * 1024)) * 100).toFixed(2), // 5MB limit
    items: items,
    itemCount: Object.keys(items).length
  };
};

/**
 * Форматировать байты в читаемый формат
 * @param {number} bytes 
 * @returns {string}
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Проверить, достаточно ли места
 * @param {number} requiredBytes - Сколько байт нужно
 * @returns {boolean}
 */
export const hasEnoughSpace = (requiredBytes = 0) => {
  const limit = 5 * 1024 * 1024; // 5MB
  const current = getLocalStorageSize().totalBytes;
  return (current + requiredBytes) < limit;
};

/**
 * Очистить старые сметы (кроме текущей)
 * @param {string} currentEstimateId - ID текущей сметы
 */
export const cleanupOldEstimates = (currentEstimateId) => {
  const keysToRemove = [];
  
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      // Удаляем старые сметы (кроме текущей)
      if (key.startsWith('estimate_') && key !== `estimate_${currentEstimateId}`) {
        keysToRemove.push(key);
      }
      // Удаляем устаревшие ключи
      if (key === 'currentEstimate' && currentEstimateId) {
        keysToRemove.push(key);
      }
    }
  }

  keysToRemove.forEach(key => {
    console.log(`🗑️ Удалён старый ключ: ${key}`);
    localStorage.removeItem(key);
  });

  return keysToRemove.length;
};

/**
 * Вывести отчёт в консоль
 */
export const logStorageReport = () => {
  const info = getLocalStorageSize();
  
  console.group('📦 localStorage Monitor');
  console.log(`📊 Использовано: ${info.totalFormatted} (${info.percentUsed}% из 5MB)`);
  console.log(`📝 Количество ключей: ${info.itemCount}`);
  console.log(`\n📋 Детали:`);
  
  Object.entries(info.items).forEach(([key, data]) => {
    console.log(`  ${key}: ${data.sizeFormatted}`);
    console.log(`    └─ "${data.preview}"`);
  });
  
  console.groupEnd();

  // Предупреждение если больше 80%
  if (parseFloat(info.percentUsed) > 80) {
    console.warn('⚠️ ВНИМАНИЕ: localStorage заполнен более чем на 80%!');
    console.log('💡 Рекомендуется очистка старых данных');
  }

  return info;
};

/**
 * Экспортировать данные localStorage в JSON файл
 */
export const exportLocalStorage = () => {
  const data = {};
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      data[key] = localStorage.getItem(key);
    }
  }
  
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `localStorage-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  console.log('✅ localStorage экспортирован');
};

/**
 * Импортировать данные из JSON файла
 * @param {File} file 
 */
export const importLocalStorage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
        
        console.log('✅ localStorage импортирован');
        resolve(Object.keys(data).length);
      } catch (error) {
        console.error('❌ Ошибка импорта:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Ошибка чтения файла'));
    };
    
    reader.readAsText(file);
  });
};

// ============================================
// Автоматический мониторинг (опционально)
// ============================================

/**
 * Включить автоматический мониторинг
 * Выводит предупреждение если localStorage заполнен > 80%
 */
export const enableAutoMonitoring = () => {
  // Проверка при загрузке
  const info = getLocalStorageSize();
  if (parseFloat(info.percentUsed) > 80) {
    console.warn('⚠️ localStorage заполнен более чем на 80%');
    console.log('💡 Используйте cleanupOldEstimates() для очистки');
  }

  // Проверка каждые 5 минут
  setInterval(() => {
    const info = getLocalStorageSize();
    if (parseFloat(info.percentUsed) > 90) {
      console.error('🚨 КРИТИЧНО: localStorage заполнен более чем на 90%!');
      console.log('⚠️ Данные могут не сохраняться!');
    }
  }, 5 * 60 * 1000); // 5 минут
};

export default {
  getLocalStorageSize,
  formatBytes,
  hasEnoughSpace,
  cleanupOldEstimates,
  logStorageReport,
  exportLocalStorage,
  importLocalStorage,
  enableAutoMonitoring
};
