/**
 * Pinecone Vector Database Client
 * 
 * - Upsert vectors с embeddings от OpenAI
 * - Delete по ID
 * - Query с фильтрами по metadata
 * - Batch operations с concurrency control
 */

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import pLimit from 'p-limit';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'smetalab-search';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Инициализация клиентов (опционально для тестов)
const pinecone = PINECONE_API_KEY ? new Pinecone({ apiKey: PINECONE_API_KEY }) : null;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Конфигурация
const CONFIG = {
  embeddingModel: 'text-embedding-3-small',
  embeddingDimension: 1536,
  batchSize: 100, // Pinecone рекомендует до 100
  concurrency: 5, // Параллельных операций
  retryAttempts: 3,
  retryDelay: 2000
};

let indexInstance = null;

/**
 * Получает индекс Pinecone (lazy init)
 */
async function getIndex() {
  if (!pinecone) {
    throw new Error('Pinecone client not initialized (missing API key)');
  }
  if (!indexInstance) {
    indexInstance = pinecone.index(PINECONE_INDEX_NAME);
  }
  return indexInstance;
}

/**
 * Создаёт embedding через OpenAI
 * @param {string} text - Текст для embedding
 * @returns {Promise<number[]>} - Вектор 1536 размерности
 */
export async function createEmbedding(text) {
  if (!openai) {
    console.warn('⚠️  OpenAI client not initialized, returning zero vector');
    return Array(CONFIG.embeddingDimension).fill(0);
  }

  try {
    const response = await openai.embeddings.create({
      model: CONFIG.embeddingModel,
      input: text,
      encoding_format: 'float'
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ [Pinecone] Embedding failed:', error.message);
    throw error;
  }
}

/**
 * Создаёт embeddings для массива текстов (батчинг)
 * @param {string[]} texts - Массив текстов
 * @returns {Promise<number[][]>} - Массив векторов
 */
export async function createEmbeddings(texts) {
  if (!texts || texts.length === 0) {
    return [];
  }

  if (!openai) {
    console.warn('⚠️  OpenAI client not initialized, returning zero vectors');
    return texts.map(() => Array(CONFIG.embeddingDimension).fill(0));
  }

  try {
    const response = await openai.embeddings.create({
      model: CONFIG.embeddingModel,
      input: texts,
      encoding_format: 'float'
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('❌ [Pinecone] Batch embeddings failed:', error.message);
    throw error;
  }
}

/**
 * Upsert одного документа в Pinecone
 * @param {Object} document - { id, text, metadata }
 * @returns {Promise<void>}
 */
export async function upsertDocument(document) {
  console.log(`📤 [Pinecone] Upsert document ${document.id}`);

  try {
    const index = await getIndex();

    // Создаём embedding
    const embedding = await createEmbedding(document.text);

    // Очищаем metadata от null/undefined/empty strings
    const cleanMetadata = Object.fromEntries(
      Object.entries({ ...document.metadata, text: document.text })
        .filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );

    // Upsert в Pinecone
    await index.upsert([{
      id: document.id,
      values: embedding,
      metadata: cleanMetadata
    }]);

    console.log(`✅ [Pinecone] Upserted ${document.id}`);
  } catch (error) {
    console.error(`❌ [Pinecone] Failed to upsert ${document.id}:`, error.message);
    throw error;
  }
}

/**
 * Batch upsert документов (с embeddings batching)
 * @param {Array} documents - Массив { id, text, metadata }
 * @param {number} concurrency - Параллельных операций
 * @returns {Promise<Object>} - { success, total, uploaded, failed, errors }
 */
export async function upsertDocumentsBatch(documents, concurrency = CONFIG.concurrency) {
  if (!documents || documents.length === 0) {
    return { success: true, total: 0, uploaded: 0, failed: 0, errors: [] };
  }

  console.log(`📦 [Pinecone] Batch upsert ${documents.length} documents (concurrency: ${concurrency})`);

  const index = await getIndex();
  const errors = [];
  let uploaded = 0;

  // Батчинг для embeddings (экономим API calls)
  const embeddingBatchSize = 100; // OpenAI лимит
  const allEmbeddings = [];

  console.log(`🔄 [Pinecone] Creating embeddings...`);

  for (let i = 0; i < documents.length; i += embeddingBatchSize) {
    const batch = documents.slice(i, i + embeddingBatchSize);
    const texts = batch.map(doc => doc.text);

    try {
      const embeddings = await createEmbeddings(texts);
      allEmbeddings.push(...embeddings);

      if ((i + batch.length) % 500 === 0 || i + batch.length === documents.length) {
        console.log(`  📊 Embeddings progress: ${allEmbeddings.length}/${documents.length}`);
      }
    } catch (error) {
      console.error(`❌ [Pinecone] Embeddings batch ${i}-${i + batch.length} failed:`, error.message);
      errors.push({ batch: `embeddings-${i}`, error: error.message });
      // Пропускаем этот batch
      allEmbeddings.push(...Array(batch.length).fill(null));
    }
  }

  console.log(`✅ [Pinecone] Embeddings created: ${allEmbeddings.filter(e => e !== null).length}/${documents.length}`);

  // Upsert в Pinecone (батчами по 100)
  console.log(`📤 [Pinecone] Upserting to index...`);

  for (let i = 0; i < documents.length; i += CONFIG.batchSize) {
    const batch = documents.slice(i, i + CONFIG.batchSize);
    const batchEmbeddings = allEmbeddings.slice(i, i + CONFIG.batchSize);

    // Фильтруем документы с валидными embeddings
    const validVectors = batch
      .map((doc, idx) => {
        if (!batchEmbeddings[idx]) {
          return null;
        }

        // Очищаем metadata от null/undefined/empty strings
        const cleanMetadata = Object.fromEntries(
          Object.entries({ ...doc.metadata, text: doc.text })
            .filter(([_, v]) => v !== null && v !== undefined && v !== '')
        );

        return {
          id: doc.id,
          values: batchEmbeddings[idx],
          metadata: cleanMetadata
        };
      })
      .filter(Boolean);

    if (validVectors.length === 0) {
      continue;
    }

    try {
      await index.upsert(validVectors);
      uploaded += validVectors.length;

      if ((i + batch.length) % 500 === 0 || i + batch.length === documents.length) {
        console.log(`  📊 Upsert progress: ${uploaded}/${documents.length}`);
      }
    } catch (error) {
      console.error(`❌ [Pinecone] Upsert batch ${i}-${i + batch.length} failed:`, error.message);
      errors.push({
        batch: `upsert-${i}`,
        count: validVectors.length,
        error: error.message
      });
    }
  }

  const failed = documents.length - uploaded;

  console.log(`${failed === 0 ? '✅' : '⚠️'} [Pinecone] Batch upsert complete: ${uploaded}/${documents.length} uploaded (${failed} failed)`);

  return {
    success: failed === 0,
    total: documents.length,
    uploaded: uploaded,
    failed: failed,
    errors: errors
  };
}

/**
 * Удаляет документ по ID
 * @param {string} documentId - ID документа
 * @returns {Promise<void>}
 */
export async function deleteDocument(documentId) {
  console.log(`🗑️ [Pinecone] Delete document ${documentId}`);

  try {
    const index = await getIndex();
    await index.deleteOne(documentId);
    console.log(`✅ [Pinecone] Deleted ${documentId}`);
  } catch (error) {
    console.error(`❌ [Pinecone] Failed to delete ${documentId}:`, error.message);
    throw error;
  }
}

/**
 * Batch delete документов
 * @param {Array<string>} documentIds - Массив ID
 * @param {number} concurrency - Параллельных операций
 * @returns {Promise<Object>} - { success, total, deleted, failed, errors }
 */
export async function deleteDocumentsBatch(documentIds, concurrency = CONFIG.concurrency) {
  if (!documentIds || documentIds.length === 0) {
    return { success: true, total: 0, deleted: 0, failed: 0, errors: [] };
  }

  console.log(`🗑️ [Pinecone] Batch delete ${documentIds.length} documents`);

  const index = await getIndex();
  const errors = [];
  let deleted = 0;

  // Pinecone поддерживает batch delete
  try {
    await index.deleteMany(documentIds);
    deleted = documentIds.length;
    console.log(`✅ [Pinecone] Deleted ${deleted} documents`);
  } catch (error) {
    console.error(`❌ [Pinecone] Batch delete failed:`, error.message);
    errors.push({ error: error.message });
  }

  const failed = documentIds.length - deleted;

  return {
    success: failed === 0,
    total: documentIds.length,
    deleted: deleted,
    failed: failed,
    errors: errors
  };
}

/**
 * Semantic search в индексе
 * @param {string} query - Поисковый запрос
 * @param {Object} options - { topK, filter }
 * @returns {Promise<Array>} - Результаты поиска
 */
export async function search(query, options = {}) {
  const { topK = 10, filter = {} } = options;

  console.log(`🔍 [Pinecone] Search: "${query}" (topK: ${topK})`);

  try {
    const index = await getIndex();

    // Создаём embedding для запроса
    const queryEmbedding = await createEmbedding(query);

    // Поиск в Pinecone
    const results = await index.query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true,
      filter: filter
    });

    console.log(`✅ [Pinecone] Found ${results.matches.length} results`);

    return results.matches.map(match => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata
    }));
  } catch (error) {
    console.error(`❌ [Pinecone] Search failed:`, error.message);
    throw error;
  }
}

/**
 * Получает статистику индекса
 */
export async function getIndexStats() {
  try {
    const index = await getIndex();
    const stats = await index.describeIndexStats();
    return stats;
  } catch (error) {
    console.error(`❌ [Pinecone] Get stats failed:`, error.message);
    throw error;
  }
}

export default {
  createEmbedding,
  createEmbeddings,
  upsertDocument,
  upsertDocumentsBatch,
  deleteDocument,
  deleteDocumentsBatch,
  search,
  getIndexStats
};
