/**
 * Простой тест Pinecone клиента (без БД)
 * 
 * Тестирует только работу с Pinecone:
 * 1. Создание embeddings
 * 2. Upsert vectors
 * 3. Semantic search
 * 4. Delete vectors
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Dynamic import
const pineconeClientPath = join(__dirname, '..', 'server', 'services', 'pineconeClient.js');
const pineconeClient = await import(`file:///${pineconeClientPath.replace(/\\/g, '/')}`);

// Test documents (fake)
const testDocuments = [
  {
    id: 'test-material-1',
    text: 'Цемент портландский М500 ГОСТ 10178-85. Строительные материалы. SKU12345. ООО СтройБаза. мешок',
    metadata: {
      tenantId: null,
      type: 'material',
      dbId: '1',
      categoryId: '100',
      supplierId: '200',
      unit: 'мешок',
      isGlobal: true,
      scope: 'global'
    }
  },
  {
    id: 'test-material-2',
    text: 'Кирпич керамический одинарный М150. Керамические изделия. SKU67890. ООО КирпичТорг. штука',
    metadata: {
      tenantId: null,
      type: 'material',
      dbId: '2',
      categoryId: '101',
      supplierId: '201',
      unit: 'штука',
      isGlobal: true,
      scope: 'global'
    }
  },
  {
    id: 'test-work-1',
    text: 'Кладка кирпича рядового. Каменные работы. W001. метр кубический',
    metadata: {
      tenantId: null,
      type: 'work',
      dbId: '1',
      categoryId: '300',
      unit: 'м³',
      isGlobal: true,
      scope: 'global'
    }
  }
];

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 PINECONE CLIENT TEST (NO DATABASE)');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Step 1: Get index stats (before)
    console.log('📊 Step 1: Get index stats (before)...\n');
    const statsBefore = await pineconeClient.getIndexStats();
    console.log(JSON.stringify(statsBefore, null, 2));
    
    // Step 2: Test single embedding
    console.log('\n🔢 Step 2: Test single embedding...\n');
    const embedding = await pineconeClient.createEmbedding(testDocuments[0].text);
    console.log(`✅ Embedding created: dimension ${embedding.length}`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    
    // Step 3: Upsert documents
    console.log('\n📤 Step 3: Upsert test documents...\n');
    const upsertResult = await pineconeClient.upsertDocumentsBatch(testDocuments);
    
    console.log(`${upsertResult.success ? '✅' : '⚠️'} Upsert result:`);
    console.log(`   Total: ${upsertResult.total}`);
    console.log(`   Uploaded: ${upsertResult.uploaded}`);
    console.log(`   Failed: ${upsertResult.failed}`);
    
    if (upsertResult.errors.length > 0) {
      console.log(`   Errors:\n${JSON.stringify(upsertResult.errors, null, 2)}`);
    }
    
    // Wait for indexing
    console.log('\n⏳ Waiting 5 seconds for indexing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 4: Get index stats (after)
    console.log('\n📊 Step 4: Get index stats (after)...\n');
    const statsAfter = await pineconeClient.getIndexStats();
    console.log(JSON.stringify(statsAfter, null, 2));
    
    // Step 5: Semantic search tests
    console.log('\n🔍 Step 5: Semantic search tests...\n');
    
    const searchQueries = [
      'цемент',
      'кирпич',
      'кладка',
      'строительные материалы',
      'каменные работы'
    ];
    
    for (const query of searchQueries) {
      console.log(`Query: "${query}"`);
      
      const searchResults = await pineconeClient.search(query, {
        topK: 3,
        filter: { scope: 'global' }
      });
      
      console.log(`Found ${searchResults.length} results:`);
      searchResults.forEach((result, idx) => {
        console.log(`  ${idx + 1}. ${result.id} (score: ${result.score.toFixed(4)})`);
        console.log(`     Text: ${result.metadata.text?.substring(0, 60)}...`);
      });
      console.log('');
    }
    
    // Step 6: Cleanup (delete)
    console.log('🗑️ Step 6: Cleanup test (delete documents)...\n');
    const documentIds = testDocuments.map(doc => doc.id);
    const deleteResult = await pineconeClient.deleteDocumentsBatch(documentIds);
    
    console.log(`${deleteResult.success ? '✅' : '⚠️'} Delete result:`);
    console.log(`   Total: ${deleteResult.total}`);
    console.log(`   Deleted: ${deleteResult.deleted}`);
    console.log(`   Failed: ${deleteResult.failed}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE - All operations successful!');
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
