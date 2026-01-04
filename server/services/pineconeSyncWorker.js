/**
 * Pinecone Sync Worker
 * 
 * Синхронизирует материалы и работы с Pinecone:
 * 1. Export документов из БД
 * 2. Upsert в Pinecone (с embeddings)
 * 3. Update state tracking (vector_index_state table)
 * 4. Cleanup stale документов
 */

import pool from '../config/database.js';
import * as exportService from './pineconeExportService.js';
import * as pineconeClient from './pineconeClient.js';

/**
 * Синхронизирует global scope (все is_global = true)
 * @param {Object} options - { testLimit }
 * @returns {Promise<Object>} - Metrics
 */
export async function syncGlobal(options = {}) {
  const { testLimit = null } = options;
  
  console.log('\n' + '='.repeat(60));
  console.log('🌍 [Sync] GLOBAL SCOPE START');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  const syncTime = new Date().toISOString();
  
  // 1. Count documents
  const counts = await exportService.countDocuments({ scope: 'global' });
  console.log(`📊 [Sync] Global documents: ${counts.total} (${counts.materials} materials, ${counts.works} works)`);
  
  if (testLimit) {
    console.log(`⚠️ [Sync] TEST MODE - limiting to ${testLimit} documents`);
  }
  
  // 2. Export documents
  const exportOptions = {
    scope: 'global',
    limit: testLimit
  };
  
  const documents = await exportService.exportAll(exportOptions);
  console.log(`✅ [Sync] Exported ${documents.length} documents`);
  
  if (documents.length === 0) {
    console.log('⚠️ [Sync] No documents to sync');
    return {
      scope: 'global',
      exported_count: 0,
      upserted_count: 0,
      deleted_count: 0,
      duration_ms: Date.now() - startTime
    };
  }
  
  // 3. Upsert to Pinecone
  const upsertResult = await pineconeClient.upsertDocumentsBatch(documents);
  console.log(`${upsertResult.success ? '✅' : '⚠️'} [Sync] Upserted ${upsertResult.uploaded}/${upsertResult.total} documents`);
  
  if (upsertResult.errors.length > 0) {
    console.log(`⚠️ [Sync] Errors: ${upsertResult.errors.length}`);
    upsertResult.errors.slice(0, 5).forEach(err => {
      console.log(`  - ${err.batch || err.id}: ${err.error}`);
    });
  }
  
  // 4. Update index state (mark as seen)
  console.log('📝 [Sync] Updating index state...');
  await markDocumentsAsSeen(documents, syncTime);
  
  // 5. Cleanup stale documents (only if not test mode)
  let deletedCount = 0;
  if (!testLimit) {
    console.log('🗑️ [Sync] Finding stale documents...');
    const staleDocuments = await findStaleDocuments('global', null, syncTime);
    
    if (staleDocuments.length > 0) {
      console.log(`⚠️ [Sync] Found ${staleDocuments.length} stale documents`);
      
      const deleteResult = await pineconeClient.deleteDocumentsBatch(
        staleDocuments.map(doc => doc.document_id)
      );
      
      console.log(`${deleteResult.success ? '✅' : '⚠️'} [Sync] Deleted ${deleteResult.deleted}/${deleteResult.total} stale documents`);
      
      // Remove from index state
      await removeFromIndexState(staleDocuments.map(doc => doc.document_id));
      
      deletedCount = deleteResult.deleted;
    } else {
      console.log('✅ [Sync] No stale documents');
    }
  }
  
  const duration = Date.now() - startTime;
  
  console.log('='.repeat(60));
  console.log(`✅ [Sync] GLOBAL SCOPE COMPLETE (${duration}ms)`);
  console.log(`   Exported: ${documents.length}`);
  console.log(`   Upserted: ${upsertResult.uploaded}`);
  console.log(`   Deleted: ${deletedCount}`);
  console.log('='.repeat(60) + '\n');
  
  return {
    scope: 'global',
    exported_count: documents.length,
    upserted_count: upsertResult.uploaded,
    deleted_count: deletedCount,
    duration_ms: duration
  };
}

/**
 * Синхронизирует один tenant
 * @param {string} tenantId - ID tenant
 * @param {Object} options - { testLimit }
 * @returns {Promise<Object>} - Metrics
 */
export async function syncTenant(tenantId, options = {}) {
  const { testLimit = null } = options;
  
  console.log('\n' + '='.repeat(60));
  console.log(`🏢 [Sync] TENANT ${tenantId} START`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  const syncTime = new Date().toISOString();
  
  // 1. Count documents
  const counts = await exportService.countDocuments({ scope: 'tenant', tenantId });
  console.log(`📊 [Sync] Tenant documents: ${counts.total} (${counts.materials} materials, ${counts.works} works)`);
  
  if (testLimit) {
    console.log(`⚠️ [Sync] TEST MODE - limiting to ${testLimit} documents`);
  }
  
  // 2. Export documents
  const exportOptions = {
    scope: 'tenant',
    tenantId: tenantId,
    limit: testLimit
  };
  
  const documents = await exportService.exportAll(exportOptions);
  console.log(`✅ [Sync] Exported ${documents.length} documents`);
  
  if (documents.length === 0) {
    console.log('⚠️ [Sync] No documents to sync');
    return {
      scope: 'tenant',
      tenant_id: tenantId,
      exported_count: 0,
      upserted_count: 0,
      deleted_count: 0,
      duration_ms: Date.now() - startTime
    };
  }
  
  // 3. Upsert to Pinecone
  const upsertResult = await pineconeClient.upsertDocumentsBatch(documents);
  console.log(`${upsertResult.success ? '✅' : '⚠️'} [Sync] Upserted ${upsertResult.uploaded}/${upsertResult.total} documents`);
  
  if (upsertResult.errors.length > 0) {
    console.log(`⚠️ [Sync] Errors: ${upsertResult.errors.length}`);
    upsertResult.errors.slice(0, 5).forEach(err => {
      console.log(`  - ${err.batch || err.id}: ${err.error}`);
    });
  }
  
  // 4. Update index state
  console.log('📝 [Sync] Updating index state...');
  await markDocumentsAsSeen(documents, syncTime);
  
  // 5. Cleanup stale documents
  let deletedCount = 0;
  if (!testLimit) {
    console.log('🗑️ [Sync] Finding stale documents...');
    const staleDocuments = await findStaleDocuments('tenant', tenantId, syncTime);
    
    if (staleDocuments.length > 0) {
      console.log(`⚠️ [Sync] Found ${staleDocuments.length} stale documents`);
      
      const deleteResult = await pineconeClient.deleteDocumentsBatch(
        staleDocuments.map(doc => doc.document_id)
      );
      
      console.log(`${deleteResult.success ? '✅' : '⚠️'} [Sync] Deleted ${deleteResult.deleted}/${deleteResult.total} stale documents`);
      
      await removeFromIndexState(staleDocuments.map(doc => doc.document_id));
      
      deletedCount = deleteResult.deleted;
    } else {
      console.log('✅ [Sync] No stale documents');
    }
  }
  
  const duration = Date.now() - startTime;
  
  console.log('='.repeat(60));
  console.log(`✅ [Sync] TENANT ${tenantId} COMPLETE (${duration}ms)`);
  console.log(`   Exported: ${documents.length}`);
  console.log(`   Upserted: ${upsertResult.uploaded}`);
  console.log(`   Deleted: ${deletedCount}`);
  console.log('='.repeat(60) + '\n');
  
  return {
    scope: 'tenant',
    tenant_id: tenantId,
    exported_count: documents.length,
    upserted_count: upsertResult.uploaded,
    deleted_count: deletedCount,
    duration_ms: duration
  };
}

/**
 * Синхронизирует все tenants
 * @param {Object} options - { testLimit }
 * @returns {Promise<Object>} - Aggregated metrics
 */
export async function syncAllTenants(options = {}) {
  console.log('\n' + '='.repeat(60));
  console.log('🏢 [Sync] ALL TENANTS START');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  const tenantIds = await exportService.getAllTenantIds();
  
  console.log(`📊 [Sync] Found ${tenantIds.length} tenants`);
  
  const results = [];
  
  for (const tenantId of tenantIds) {
    try {
      const result = await syncTenant(tenantId, options);
      results.push(result);
    } catch (error) {
      console.error(`❌ [Sync] Tenant ${tenantId} failed:`, error.message);
      results.push({
        scope: 'tenant',
        tenant_id: tenantId,
        error: error.message
      });
    }
  }
  
  const totalExported = results.reduce((sum, r) => sum + (r.exported_count || 0), 0);
  const totalUpserted = results.reduce((sum, r) => sum + (r.upserted_count || 0), 0);
  const totalDeleted = results.reduce((sum, r) => sum + (r.deleted_count || 0), 0);
  const duration = Date.now() - startTime;
  
  console.log('='.repeat(60));
  console.log(`✅ [Sync] ALL TENANTS COMPLETE (${duration}ms)`);
  console.log(`   Tenants: ${tenantIds.length}`);
  console.log(`   Exported: ${totalExported}`);
  console.log(`   Upserted: ${totalUpserted}`);
  console.log(`   Deleted: ${totalDeleted}`);
  console.log('='.repeat(60) + '\n');
  
  return {
    tenants_count: tenantIds.length,
    exported_count: totalExported,
    upserted_count: totalUpserted,
    deleted_count: totalDeleted,
    duration_ms: duration,
    results: results
  };
}

/**
 * Синхронизирует всё (global + all tenants)
 * @param {Object} options - { testLimit }
 * @returns {Promise<Object>} - Combined metrics
 */
export async function syncAll(options = {}) {
  console.log('\n' + '='.repeat(60));
  console.log('🌍 [Sync] FULL SYNC START (Global + All Tenants)');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  const globalResult = await syncGlobal(options);
  const tenantsResult = await syncAllTenants(options);
  
  const duration = Date.now() - startTime;
  
  console.log('='.repeat(60));
  console.log(`✅ [Sync] FULL SYNC COMPLETE (${duration}ms)`);
  console.log(`   Global exported: ${globalResult.exported_count}`);
  console.log(`   Global upserted: ${globalResult.upserted_count}`);
  console.log(`   Global deleted: ${globalResult.deleted_count}`);
  console.log(`   Tenants count: ${tenantsResult.tenants_count}`);
  console.log(`   Tenants exported: ${tenantsResult.exported_count}`);
  console.log(`   Tenants upserted: ${tenantsResult.upserted_count}`);
  console.log(`   Tenants deleted: ${tenantsResult.deleted_count}`);
  console.log('='.repeat(60) + '\n');
  
  return {
    global: globalResult,
    tenants: tenantsResult,
    total_exported: globalResult.exported_count + tenantsResult.exported_count,
    total_upserted: globalResult.upserted_count + tenantsResult.upserted_count,
    total_deleted: globalResult.deleted_count + tenantsResult.deleted_count,
    duration_ms: duration
  };
}

/**
 * Маркирует документы как "seen" в index state
 */
async function markDocumentsAsSeen(documents, syncTime) {
  if (documents.length === 0) return;
  
  const values = documents.map((doc, idx) => {
    const offset = idx * 6;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
  }).join(',');
  
  const params = documents.flatMap(doc => [
    doc.id, // document_id
    doc.metadata.scope,
    doc.metadata.tenantId,
    doc.metadata.type,
    doc.metadata.dbId,
    syncTime
  ]);
  
  const query = `
    INSERT INTO vector_index_state 
      (document_id, scope, tenant_id, entity_type, db_id, last_seen_at)
    VALUES ${values}
    ON CONFLICT (document_id) 
    DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at
  `;
  
  await pool.query(query, params);
  console.log(`✅ [State] Marked ${documents.length} documents as seen`);
}

/**
 * Находит stale документы (не видели в последнем sync)
 */
async function findStaleDocuments(scope, tenantId, syncTime) {
  const conditions = ['scope = $1', 'last_seen_at < $2'];
  const params = [scope, syncTime];
  
  if (scope === 'tenant' && tenantId) {
    conditions.push('tenant_id = $3');
    params.push(tenantId);
  }
  
  const query = `
    SELECT document_id, entity_type, db_id
    FROM vector_index_state
    WHERE ${conditions.join(' AND ')}
  `;
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Удаляет документы из index state
 */
async function removeFromIndexState(documentIds) {
  if (documentIds.length === 0) return;
  
  const placeholders = documentIds.map((_, idx) => `$${idx + 1}`).join(',');
  
  const query = `
    DELETE FROM vector_index_state
    WHERE document_id IN (${placeholders})
  `;
  
  await pool.query(query, documentIds);
  console.log(`✅ [State] Removed ${documentIds.length} documents from index state`);
}

export default {
  syncGlobal,
  syncTenant,
  syncAllTenants,
  syncAll
};
