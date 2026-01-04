import axios from 'axios';

const BATCH_SIZE = 1000;
const TOTAL_DOCS = 50347;
const ENDPOINT = 'https://smetalab-backend.onrender.com/api/run-migration-temp';

async function syncBatch(offset, limit) {
  try {
    console.log(`\n📦 Batch ${Math.floor(offset/BATCH_SIZE) + 1}/${Math.ceil(TOTAL_DOCS/BATCH_SIZE)}: offset ${offset}, limit ${limit}`);
    
    const response = await axios.post(
      ENDPOINT,
      { 
        action: 'sync', 
        mode: 'global',  // Только global scope
        offset: offset,
        limit: limit
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 180000 // 3 минуты на batch
      }
    );
    
    if (response.data.success) {
      const output = response.data.output;
      const upsertedMatch = output.match(/Upserted: (\d+)/);
      const upserted = upsertedMatch ? parseInt(upsertedMatch[1]) : 0;
      console.log(`✅ Batch completed: ${upserted} documents upserted`);
      return upserted;
    } else {
      console.error(`❌ Batch failed:`, response.data.error);
      return 0;
    }
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Timeout on batch');
    } else {
      console.error('❌ Error:', error.message);
    }
    return 0;
  }
}

async function fullSync() {
  console.log('🚀 Starting BATCH Pinecone sync...\n');
  console.log(`Total documents: ${TOTAL_DOCS}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Total batches: ${Math.ceil(TOTAL_DOCS/BATCH_SIZE)}\n`);
  console.log('This will take ~30-40 minutes. You can stop and resume anytime.\n');
  console.log('='.\repeat(70));
  
  let totalUpserted = 0;
  const startTime = Date.now();
  
  for (let offset = 0; offset < TOTAL_DOCS; offset += BATCH_SIZE) {
    const limit = Math.min(BATCH_SIZE, TOTAL_DOCS - offset);
    
    const upserted = await syncBatch(offset, limit);
    totalUpserted += upserted;
    
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const progress = ((offset + limit) / TOTAL_DOCS * 100).toFixed(1);
    
    console.log(`📊 Progress: ${progress}% | Total upserted: ${totalUpserted} | Elapsed: ${elapsed}min`);
    
    // Пауза между батчами (не перегружать Render)
    if (offset + BATCH_SIZE < TOTAL_DOCS) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 сек пауза
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n' + '='.\repeat(70));
  console.log('\n✅ FULL SYNC COMPLETED!\n');
  console.log(`Total documents upserted: ${totalUpserted}/${TOTAL_DOCS}`);
  console.log(`Total time: ${totalTime} minutes`);
  console.log('\n' + '='.\repeat(70));
}

fullSync();
