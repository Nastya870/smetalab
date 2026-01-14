import db from './server/config/database.js';

async function setupUniqueIndex() {
    try {
        console.log('Adding unique index to materials...');
        // Удаляем возможные дубликаты перед созданием индекса
        await db.query(`
      DELETE FROM materials a USING materials b
      WHERE a.id < b.id 
      AND a.sku = b.sku 
      AND a.is_global = b.is_global 
      AND (a.tenant_id = b.tenant_id OR (a.tenant_id IS NULL AND b.tenant_id IS NULL));
    `);

        await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS materials_sku_scope_unique 
      ON materials (sku, is_global, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'));
    `);
        console.log('Unique index added successfully.');
    } catch (err) {
        console.error('Error setting up unique index:', err);
    } finally {
        process.exit();
    }
}

setupUniqueIndex();
