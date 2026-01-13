/**
 * Удаление Pinecone индекса
 * 
 * Usage:
 *   node scripts/pinecone-delete-index.mjs
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'smetalab-search';

async function main() {
  console.log('\n🗑️ Pinecone Index Deletion\n');
  console.log(`Index name: ${PINECONE_INDEX_NAME}`);
  
  try {
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    
    // Проверяем существующие индексы
    console.log('\n📋 Checking existing indexes...');
    const indexes = await pinecone.listIndexes();
    
    const existingIndex = indexes.indexes?.find(idx => idx.name === PINECONE_INDEX_NAME);
    
    if (!existingIndex) {
      console.log(`\n⚠️ Index "${PINECONE_INDEX_NAME}" not found!`);
      return;
    }
    
    console.log(`\nFound index: ${existingIndex.name} (${existingIndex.dimension}d, ${existingIndex.metric})`);
    
    // Удаляем индекс
    console.log(`\n🗑️ Deleting index "${PINECONE_INDEX_NAME}"...`);
    await pinecone.deleteIndex(PINECONE_INDEX_NAME);
    
    console.log('✅ Index deleted successfully!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();
