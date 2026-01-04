/**
 * Mixedbread Store API Integration
 * 
 * Отправка документов в Mixedbread Stores для semantic search
 */

import axios from 'axios';

const MIXEDBREAD_API_URL = 'https://api.mixedbread.ai/v1';
const MIXEDBREAD_API_KEY = process.env.MIXEDBREAD_API_KEY;

if (!MIXEDBREAD_API_KEY) {
  console.warn('⚠️ [Mixedbread] MIXEDBREAD_API_KEY не установлен в .env');
}

/**
 * Отправляет документы в Mixedbread Store
 * @param {string} storeId - ID хранилища в Mixedbread
 * @param {Array} documents - Массив документов в формате { id, text, metadata }
 * @returns {Promise<Object>} - Результат операции
 */
export async function uploadDocumentsToStore(storeId, documents) {
  if (!MIXEDBREAD_API_KEY) {
    throw new Error('MIXEDBREAD_API_KEY не настроен');
  }

  if (!documents || documents.length === 0) {
    return { success: true, uploaded: 0 };
  }

  console.log(`📤 [Mixedbread] Отправка ${documents.length} документов в Store: ${storeId}`);

  try {
    const response = await axios.post(
      `${MIXEDBREAD_API_URL}/stores/${storeId}/documents`,
      {
        documents: documents
      },
      {
        headers: {
          'Authorization': `Bearer ${MIXEDBREAD_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 секунд
      }
    );

    console.log(`✅ [Mixedbread] Успешно загружено ${documents.length} документов`);
    
    return {
      success: true,
      uploaded: documents.length,
      response: response.data
    };
  } catch (error) {
    console.error('❌ [Mixedbread] Ошибка отправки документов:', error.message);
    
    if (error.response) {
      console.error('📋 [Mixedbread] Детали ошибки:', error.response.data);
      throw new Error(`Mixedbread API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    
    throw error;
  }
}

/**
 * Удаляет документы из Mixedbread Store
 * @param {string} storeId - ID хранилища
 * @param {Array<string>} documentIds - Массив ID документов для удаления
 * @returns {Promise<Object>}
 */
export async function deleteDocumentsFromStore(storeId, documentIds) {
  if (!MIXEDBREAD_API_KEY) {
    throw new Error('MIXEDBREAD_API_KEY не настроен');
  }

  if (!documentIds || documentIds.length === 0) {
    return { success: true, deleted: 0 };
  }

  console.log(`🗑️ [Mixedbread] Удаление ${documentIds.length} документов из Store: ${storeId}`);

  try {
    const response = await axios.delete(
      `${MIXEDBREAD_API_URL}/stores/${storeId}/documents`,
      {
        data: {
          ids: documentIds
        },
        headers: {
          'Authorization': `Bearer ${MIXEDBREAD_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ [Mixedbread] Успешно удалено ${documentIds.length} документов`);
    
    return {
      success: true,
      deleted: documentIds.length,
      response: response.data
    };
  } catch (error) {
    console.error('❌ [Mixedbread] Ошибка удаления документов:', error.message);
    throw error;
  }
}

/**
 * Синхронизирует все документы tenant в Mixedbread Store (батчами)
 * @param {string} storeId - ID хранилища
 * @param {Array} documents - Все документы для синхронизации
 * @param {number} batchSize - Размер батча (по умолчанию 100)
 * @returns {Promise<Object>}
 */
export async function syncDocumentsToStore(storeId, documents, batchSize = 100) {
  console.log(`🔄 [Mixedbread] Синхронизация ${documents.length} документов в Store: ${storeId} (батчами по ${batchSize})`);

  let totalUploaded = 0;
  const errors = [];

  // Разбиваем на батчи
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(documents.length / batchSize);

    console.log(`  📦 Батч ${batchNumber}/${totalBatches}: ${batch.length} документов`);

    try {
      const result = await uploadDocumentsToStore(storeId, batch);
      totalUploaded += result.uploaded;
      
      // Пауза между батчами (избегаем rate limit)
      if (i + batchSize < documents.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 секунда
      }
    } catch (error) {
      console.error(`❌ Ошибка в батче ${batchNumber}:`, error.message);
      errors.push({
        batch: batchNumber,
        error: error.message
      });
    }
  }

  console.log(`✅ [Mixedbread] Синхронизация завершена: ${totalUploaded}/${documents.length} документов`);

  return {
    success: errors.length === 0,
    total: documents.length,
    uploaded: totalUploaded,
    failed: documents.length - totalUploaded,
    errors: errors
  };
}

export default {
  uploadDocumentsToStore,
  deleteDocumentsFromStore,
  syncDocumentsToStore
};
