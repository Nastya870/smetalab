/**
 * Pinecone Sync CLI Runner
 * 
 * Usage:
 *   node scripts/pinecone-sync-cron.mjs global [--limit=5]
 *   node scripts/pinecone-sync-cron.mjs tenant <tenant-id> [--limit=5]
 *   node scripts/pinecone-sync-cron.mjs tenants [--limit=5]
 *   node scripts/pinecone-sync-cron.mjs all [--limit=5]
 * 
 * Examples:
 *   node scripts/pinecone-sync-cron.mjs global --limit=5  # Test с 5 документами
 *   node scripts/pinecone-sync-cron.mjs all                # Полная синхронизация
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });

// Dynamic import для синхронизации с ESM
const syncWorkerPath = join(__dirname, '..', 'server', 'services', 'pineconeSyncWorker.js');
const { syncGlobal, syncTenant, syncAllTenants, syncAll } = await import(
  `file:///${syncWorkerPath.replace(/\\/g, '/')}`
);

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args[0] || 'global'; // global|tenant|tenants|all
const tenantId = mode === 'tenant' ? args[1] : null;

// Parse --limit flag
const limitArg = args.find(arg => arg.startsWith('--limit='));
const testLimit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

async function main() {
  console.log('\n🚀 Pinecone Sync CLI');
  console.log(`Mode: ${mode}`);
  if (tenantId) {
    console.log(`Tenant ID: ${tenantId}`);
  }
  if (testLimit) {
    console.log(`⚠️ TEST MODE - Limit: ${testLimit} documents`);
  }
  console.log('');
  
  const startTime = Date.now();
  
  try {
    let result;
    
    switch (mode) {
      case 'global':
        result = await syncGlobal({ testLimit });
        break;
        
      case 'tenant':
        if (!tenantId) {
          console.error('❌ Error: tenant mode requires tenant-id');
          console.log('Usage: node scripts/pinecone-sync-cron.mjs tenant <tenant-id>');
          process.exit(1);
        }
        result = await syncTenant(tenantId, { testLimit });
        break;
        
      case 'tenants':
        result = await syncAllTenants({ testLimit });
        break;
        
      case 'all':
        result = await syncAll({ testLimit });
        break;
        
      default:
        console.error(`❌ Error: unknown mode "${mode}"`);
        console.log('Valid modes: global, tenant, tenants, all');
        process.exit(1);
    }
    
    const duration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SYNC COMPLETE');
    console.log('='.repeat(60));
    console.log(JSON.stringify(result, null, 2));
    console.log(`\nTotal duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ SYNC FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(60) + '\n');
    
    process.exit(1);
  }
}

main();
