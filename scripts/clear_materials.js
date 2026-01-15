import db from '../server/config/database.js';

async function clearMaterials() {
    try {
        console.log('🗑️ Starting materials catalog cleanup...');

        // Count before
        const beforeRes = await db.query('SELECT COUNT(*) FROM materials');
        const countBefore = beforeRes.rows[0].count;
        console.log(`Current materials count: ${countBefore}`);

        if (countBefore === '0') {
            console.log('Catalog is already empty.');
            return;
        }

        // We use TRUNCATE for speed and to reset IDs if needed. 
        // CASCADE will handle work_materials (which is empty anyway).
        // RESTART IDENTITY resets the serial sequence.
        console.log('Executing TRUNCATE materials RESTART IDENTITY CASCADE...');
        await db.query('TRUNCATE materials RESTART IDENTITY CASCADE');

        // Count after
        const afterRes = await db.query('SELECT COUNT(*) FROM materials');
        console.log(`Cleanup complete. Current materials count: ${afterRes.rows[0].count}`);
        console.log('✅ Materials catalog is now empty and IDs are reset.');

    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
    } finally {
        await db.pool.end();
    }
}

clearMaterials();
