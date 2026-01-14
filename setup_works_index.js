import db from './server/config/database.js';

async function setupWorksIndex() {
    try {
        console.log('Adding unique index to works...');
        // Удаляем дубликаты
        await db.query(`
      DELETE FROM works a USING works b
      WHERE a.id < b.id 
      AND a.code = b.code 
      AND a.is_global = b.is_global 
      AND (a.tenant_id = b.tenant_id OR (a.tenant_id IS NULL AND b.tenant_id IS NULL));
    `);

        await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS works_code_scope_upsert_idx 
      ON works (code, is_global, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'));
    `);
        console.log('Unique index for works added successfully.');
    } catch (err) {
        console.error('Error setting up unique index for works:', err);
    } finally {
        process.exit();
    }
}

setupWorksIndex();
