import db from '../server/config/database.js';

async function checkTable() {
    try {
        console.log('Checking work_materials table...');
        const result = await db.query('SELECT COUNT(*) as count FROM work_materials');
        const count = result.rows[0].count;
        console.log(`Total records in work_materials: ${count}`);

        if (count > 0) {
            console.log('Sample records:');
            const samples = await db.query('SELECT * FROM work_materials LIMIT 5');
            console.table(samples.rows);
        }
    } catch (error) {
        console.error('Error checking table:', error.message);
    } finally {
        await db.pool.end();
    }
}

checkTable();
