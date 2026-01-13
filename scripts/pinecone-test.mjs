/**
 * Тестовый скрипт для Pinecone интеграции
 * 
 * Тестирует:
 * 1. Export материалов/работ
 * 2. Создание embeddings
 * 3. Upsert в Pinecone
 * 4. Semantic search
 * 
 * Usage:
 *   node scripts/pinecone-test.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Dynamic imports
const exportServicePath = join(__dirname, '..', 'server', 'services', 'pineconeExportService.js');
const pineconeClientPath = join(__dirname, '..', 'server', 'services', 'pineconeClient.js');

const exportService = await import(`file:///${exportServicePath.replace(/\\/g, '/')}`);
const pineconeClient = await import(`file:///${pineconeClientPath.replace(/\\/g, '/')}`);

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 PINECONE INTEGRATION TEST');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Step 1: Export test documents
    console.log('📦 Step 1: Export test documents (limit 5)...');
    const documents = await exportService.exportAll({ scope: 'global', limit: 5 });
    
    if (documents.length === 0) {
      console.log('⚠️ No documents found. Make sure you have global materials/works in DB.');
      return;
    }
    
    console.log(`✅ Exported ${documents.length} documents:\n`);
    documents.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.id}`);
      console.log(`   Text: ${doc.text.substring(0, 80)}...`);
      console.log(`   Metadata: ${JSON.stringify(doc.metadata)}\n`);
    });
    
    // Step 2: Get index stats (before)
    console.log('\n📊 Step 2: Get index stats (before)...');
    const statsBefore = await pineconeClient.getIndexStats();
    console.log(JSON.stringify(statsBefore, null, 2));
    
    // Step 3: Upsert documents
    console.log('\n📤 Step 3: Upsert documents to Pinecone...');
    const upsertResult = await pineconeClient.upsertDocumentsBatch(documents);
    
    console.log(`\n${upsertResult.success ? '✅' : '⚠️'} Upsert result:`);
    console.log(`   Total: ${upsertResult.total}`);
    console.log(`   Uploaded: ${upsertResult.uploaded}`);
    console.log(`   Failed: ${upsertResult.failed}`);
    
    if (upsertResult.errors.length > 0) {
      console.log(`   Errors: ${JSON.stringify(upsertResult.errors, null, 2)}`);
    }
    
    // Wait for indexing
    console.log('\n⏳ Waiting 5 seconds for indexing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 4: Get index stats (after)
    console.log('\n📊 Step 4: Get index stats (after)...');
    const statsAfter = await pineconeClient.getIndexStats();
    console.log(JSON.stringify(statsAfter, null, 2));
    
    // Step 5: Semantic search test
    console.log('\n🔍 Step 5: Semantic search test...');
    
    // Используем текст первого документа для поиска
    const testQuery = documents[0].text.split('.')[0]; // Первое слово из названия
    console.log(`Query: "${testQuery}"\n`);
    
    const searchResults = await pineconeClient.search(testQuery, {
      topK: 5,
      filter: { scope: 'global' }
    });
    
    console.log(`Found ${searchResults.length} results:\n`);
    searchResults.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.id} (score: ${result.score.toFixed(4)})`);
      console.log(`   Text: ${result.metadata.text?.substring(0, 80)}...`);
      console.log(`   Type: ${result.metadata.type}`);
      console.log(`   DB ID: ${result.metadata.dbId}\n`);
    });
    
    // Step 6: Cleanup test (delete)
    console.log('\n🗑️ Step 6: Cleanup test (delete documents)...');
    const documentIds = documents.map(doc => doc.id);
    const deleteResult = await pineconeClient.deleteDocumentsBatch(documentIds);
    
    console.log(`\n${deleteResult.success ? '✅' : '⚠️'} Delete result:`);
    console.log(`   Total: ${deleteResult.total}`);
    console.log(`   Deleted: ${deleteResult.deleted}`);
    console.log(`   Failed: ${deleteResult.failed}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
}

main();
