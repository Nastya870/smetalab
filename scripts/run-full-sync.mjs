import axios from 'axios';

async function fullSync() {
  try {
    console.log('🚀 Starting FULL Pinecone sync (50K+ documents)...\n');
    console.log('This may take 10-15 minutes. Please wait...\n');
    
    const response = await axios.post(
      'https://smetalab-backend.onrender.com/api/run-migration-temp',
      { action: 'sync', mode: 'all' }, // Полная синхронизация
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 900000 // 15 минут
      }
    );
    
    console.log('\n✅ FULL SYNC COMPLETED!\n');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Timeout - sync takes longer than 15 min. Check Pinecone console.');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
}

fullSync();
