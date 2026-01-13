/**
 * Создание Pinecone индекса
 * 
 * Usage:
 *   node scripts/pinecone-create-index.mjs
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
  console.log('\n🚀 Pinecone Index Creation\n');
  console.log(`Index name: ${PINECONE_INDEX_NAME}`);
  console.log(`API Key: ${PINECONE_API_KEY?.substring(0, 20)}...`);
  
  try {
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    
    // Проверяем существующие индексы
    console.log('\n📋 Checking existing indexes...');
    const indexes = await pinecone.listIndexes();
    
    console.log(`Found ${indexes.indexes?.length || 0} indexes:`);
    indexes.indexes?.forEach(idx => {
      console.log(`  - ${idx.name} (${idx.dimension}d, ${idx.metric})`);
    });
    
    // Проверяем существует ли наш индекс
    const existingIndex = indexes.indexes?.find(idx => idx.name === PINECONE_INDEX_NAME);
    
    if (existingIndex) {
      console.log(`\n✅ Index "${PINECONE_INDEX_NAME}" already exists!`);
      console.log(`   Dimension: ${existingIndex.dimension}`);
      console.log(`   Metric: ${existingIndex.metric}`);
      console.log(`   Spec: ${JSON.stringify(existingIndex.spec)}`);
      return;
    }
    
    // Создаём новый индекс
    console.log(`\n📝 Creating index "${PINECONE_INDEX_NAME}"...`);
    
    await pinecone.createIndex({
      name: PINECONE_INDEX_NAME,
      dimension: 1536, // OpenAI text-embedding-3-small
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1' // Free tier регион
        }
      }
    });
    
    console.log('✅ Index created successfully!');
    console.log('\n⏳ Waiting for index to be ready (может занять ~1 минуту)...');
    
    // Ждём готовности индекса
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updatedIndexes = await pinecone.listIndexes();
      const targetIndex = updatedIndexes.indexes?.find(idx => idx.name === PINECONE_INDEX_NAME);
      
      if (targetIndex && targetIndex.status?.ready) {
        console.log('\n✅ Index is ready!');
        console.log(JSON.stringify(targetIndex, null, 2));
        return;
      }
      
      attempts++;
      process.stdout.write('.');
    }
    
    console.log('\n⚠️ Index creation timeout. Check Pinecone console manually.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();
