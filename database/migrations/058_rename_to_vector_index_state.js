/**
 * Migration: Rename mixedbread_index_state to vector_index_state
 * 
 * Универсальная таблица для tracking состояния векторной индексации
 * (Pinecone, Mixedbread, etc.)
 */

export async function up(db) {
  console.log('📝 [Migration] Renaming mixedbread_index_state → vector_index_state...');
  
  // Проверяем существует ли старая таблица
  const checkOldTable = await db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'mixedbread_index_state'
    );
  `);
  
  const oldTableExists = checkOldTable.rows[0].exists;
  
  // Проверяем существует ли новая таблица
  const checkNewTable = await db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'vector_index_state'
    );
  `);
  
  const newTableExists = checkNewTable.rows[0].exists;
  
  if (newTableExists) {
    console.log('⚠️ [Migration] Table vector_index_state already exists, skipping...');
    return;
  }
  
  if (!oldTableExists) {
    console.log('⚠️ [Migration] Table mixedbread_index_state does not exist, creating new table...');
    
    // Создаём новую таблицу (структура из migration 056)
    await db.query(`
      CREATE TABLE IF NOT EXISTS vector_index_state (
        document_id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        tenant_id UUID,
        entity_type TEXT NOT NULL,
        db_id TEXT NOT NULL,
        last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_vector_index_state_scope ON vector_index_state(scope);
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_vector_index_state_tenant ON vector_index_state(tenant_id);
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_vector_index_state_entity ON vector_index_state(entity_type, db_id);
    `);
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_vector_index_state_last_seen ON vector_index_state(last_seen_at);
    `);
    
    console.log('✅ [Migration] Created vector_index_state table');
  } else {
    // Переименовываем существующую таблицу
    await db.query('ALTER TABLE mixedbread_index_state RENAME TO vector_index_state;');
    
    // Переименовываем индексы
    const renameIndexes = [
      ['idx_mixedbread_index_state_scope', 'idx_vector_index_state_scope'],
      ['idx_mixedbread_index_state_tenant', 'idx_vector_index_state_tenant'],
      ['idx_mixedbread_index_state_entity', 'idx_vector_index_state_entity'],
      ['idx_mixedbread_index_state_last_seen', 'idx_vector_index_state_last_seen']
    ];
    
    for (const [oldName, newName] of renameIndexes) {
      try {
        await db.query(`ALTER INDEX ${oldName} RENAME TO ${newName};`);
      } catch (error) {
        console.log(`⚠️ [Migration] Index ${oldName} not found, skipping...`);
      }
    }
    
    console.log('✅ [Migration] Renamed mixedbread_index_state → vector_index_state');
  }
}

export async function down(db) {
  console.log('📝 [Migration] Renaming vector_index_state → mixedbread_index_state...');
  
  await db.query('ALTER TABLE vector_index_state RENAME TO mixedbread_index_state;');
  
  // Переименовываем индексы обратно
  const renameIndexes = [
    ['idx_vector_index_state_scope', 'idx_mixedbread_index_state_scope'],
    ['idx_vector_index_state_tenant', 'idx_mixedbread_index_state_tenant'],
    ['idx_vector_index_state_entity', 'idx_mixedbread_index_state_entity'],
    ['idx_vector_index_state_last_seen', 'idx_mixedbread_index_state_last_seen']
  ];
  
  for (const [oldName, newName] of renameIndexes) {
    try {
      await db.query(`ALTER INDEX ${oldName} RENAME TO ${newName};`);
    } catch (error) {
      console.log(`⚠️ [Migration] Index ${oldName} not found, skipping...`);
    }
  }
  
  console.log('✅ [Migration] Renamed vector_index_state → mixedbread_index_state');
}
