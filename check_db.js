import db from './server/config/database.js';

async function checkSchema() {
    try {
        console.log('--- Materials Unique Indexes ---');
        const materials = await db.query(`
      SELECT
          indexname,
          indexdef
      FROM
          pg_indexes
      WHERE
          tablename = 'materials' AND indexdef LIKE '%UNIQUE%';
    `);
        materials.rows.forEach(r => console.log(r.indexname, ':', r.indexdef));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSchema();
