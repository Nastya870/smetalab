import pkg from 'pg';
const { Client } = pkg;

const RENDER_URL = 'postgresql://smetalab_user:KJPh8y7plWvVIK2xiTeu9ROpUEk0QFSh@dpg-d51t19f6s9ss73eui8k0-a.frankfurt-postgres.render.com/smetalab_yay5';

const client = new Client({ 
  connectionString: RENDER_URL,
  ssl: { rejectUnauthorized: false }
});

async function createMissingTables() {
  try {
    await client.connect();
    console.log('✅ Подключено к Render\n');
    
    // 1. CREATE SEQUENCE для works
    console.log('📦 Создание sequence works_id_seq...');
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS works_id_seq;
    `);
    console.log('✅ Sequence создан\n');
    
    // 2. CREATE TABLE works
    console.log('📦 Создание таблицы works...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "works" (
        "id" integer NOT NULL DEFAULT nextval('works_id_seq'::regclass),
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "unit" character varying(50) NOT NULL,
        "base_price" numeric NOT NULL DEFAULT 0.00,
        "tenant_id" uuid,
        "created_by" uuid,
        "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        "is_global" boolean DEFAULT false,
        "phase" character varying(100),
        "section" character varying(100),
        "subsection" character varying(100),
        PRIMARY KEY (id)
      );
    `);
    console.log('✅ Таблица works создана\n');
    
    // 3. CREATE SEQUENCE для materials
    console.log('📦 Создание sequence materials_id_seq...');
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS materials_id_seq;
    `);
    console.log('✅ Sequence создан\n');
    
    // 4. CREATE TABLE materials
    console.log('📦 Создание таблицы materials...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "materials" (
        "id" integer NOT NULL DEFAULT nextval('materials_id_seq'::regclass),
        "sku_number" character varying(50),
        "name" character varying(255) NOT NULL,
        "unit" character varying(50) NOT NULL,
        "price" numeric NOT NULL DEFAULT 0.00,
        "tenant_id" uuid,
        "created_by" uuid,
        "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        "is_global" boolean DEFAULT false,
        "category" character varying(100),
        "auto_calculate" boolean DEFAULT false,
        "consumption_unit" character varying(50),
        PRIMARY KEY (id)
      );
    `);
    console.log('✅ Таблица materials создана\n');
    
    // 5. CREATE TABLE work_hierarchy
    console.log('📦 Создание таблицы work_hierarchy...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "work_hierarchy" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "work_id" integer NOT NULL,
        "parent_id" integer,
        "tenant_id" uuid,
        "level" integer DEFAULT 0,
        "path" character varying(255),
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now(),
        PRIMARY KEY (id)
      );
    `);
    console.log('✅ Таблица work_hierarchy создана\n');
    
    // 6. CREATE TABLE work_materials
    console.log('📦 Создание таблицы work_materials...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "work_materials" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "work_id" integer NOT NULL,
        "material_id" integer NOT NULL,
        "quantity" numeric NOT NULL DEFAULT 1,
        "tenant_id" uuid,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now(),
        PRIMARY KEY (id)
      );
    `);
    console.log('✅ Таблица work_materials создана\n');
    
    // 7. Добавление foreign keys
    console.log('🔗 Добавление foreign keys...');
    try {
      await client.query(`
        ALTER TABLE works ADD CONSTRAINT works_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
      `);
      console.log('   ✅ works → tenants');
    } catch (e) {
      console.log('   ⏭️  works → tenants: уже есть');
    }
    
    try {
      await client.query(`
        ALTER TABLE materials ADD CONSTRAINT materials_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
      `);
      console.log('   ✅ materials → tenants');
    } catch (e) {
      console.log('   ⏭️  materials → tenants: уже есть');
    }
    
    try {
      await client.query(`
        ALTER TABLE work_materials ADD CONSTRAINT work_materials_work_id_fkey 
        FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE;
      `);
      console.log('   ✅ work_materials → works');
    } catch (e) {
      console.log('   ⏭️  work_materials → works: уже есть');
    }
    
    try {
      await client.query(`
        ALTER TABLE work_materials ADD CONSTRAINT work_materials_material_id_fkey 
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE;
      `);
      console.log('   ✅ work_materials → materials');
    } catch (e) {
      console.log('   ⏭️  work_materials → materials: уже есть');
    }
    
    console.log('\n✅ Все таблицы созданы!');
    
    // Проверка
    const { rows } = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log(`\n📊 Всего таблиц в Render: ${rows.length}\n`);
    
    await client.end();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

createMissingTables();
