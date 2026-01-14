import db from '../server/config/database.js';

async function checkTables() {
    try {
        const tables = ['work_materials', 'estimate_template_materials', 'estimate_item_materials'];
        for (const table of tables) {
            const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`Total records in ${table}: ${result.rows[0].count}`);
        }
    } catch (error) {
        console.error('Error checking tables:', error.message);
    } finally {
        await db.pool.end();
    }
}

checkTables();
