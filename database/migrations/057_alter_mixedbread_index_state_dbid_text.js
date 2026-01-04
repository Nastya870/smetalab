export async function up(db) {
  await db.query(`
    ALTER TABLE mixedbread_index_state
    ALTER COLUMN db_id TYPE TEXT;
  `);
}

export async function down(db) {
  await db.query(`
    ALTER TABLE mixedbread_index_state
    ALTER COLUMN db_id TYPE UUID;
  `);
}
