import pkg from 'pg';
const { Client } = pkg;

const RENDER_URL = 'postgresql://smetalab_user:KJPh8y7plWvVIK2xiTeu9ROpUEk0QFSh@dpg-d51t19f6s9ss73eui8k0-a.frankfurt-postgres.render.com/smetalab_yay5';

const client = new Client({ 
  connectionString: RENDER_URL,
  ssl: { rejectUnauthorized: false }
});

async function recreateTables() {
  try {
    await client.connect();
    console.log('✅ Подключено\n');
    
    // 1. Удаляем старые таблицы
    console.log('🗑️  Удаление старых таблиц...');
    await client.query('DROP TABLE IF EXISTS work_hierarchy CASCADE;');
    await client.query('DROP TABLE IF EXISTS work_materials CASCADE;');
    await client.query('DROP TABLE IF EXISTS materials CASCADE;');
    console.log('✅ Старые таблицы удалены\n');
    
    // 2. Создаем sequences
    console.log('📦 Создание sequences...');
    await client.query('CREATE SEQUENCE IF NOT EXISTS work_hierarchy_id_seq;');
    await client.query('CREATE SEQUENCE IF NOT EXISTS work_materials_id_seq;');
    console.log('✅ Sequences созданы\n');
    
    // 3. CREATE TABLE work_hierarchy (ПРАВИЛЬНАЯ СТРУКТУРА)
    console.log('📦 Создание work_hierarchy...');
    await client.query(`
      CREATE TABLE "work_hierarchy" (
        "id" integer NOT NULL DEFAULT nextval('work_hierarchy_id_seq'::regclass),
        "level" character varying(20) NOT NULL,
        "parent_value" character varying(100),
        "value" character varying(100) NOT NULL,
        "code" character varying(50),
        "sort_order" integer DEFAULT 0,
        "is_global" boolean DEFAULT false,
        "tenant_id" uuid,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now(),
        PRIMARY KEY (id)
      );
    `);
    console.log('✅ work_hierarchy создана\n');
    
    // 4. CREATE TABLE materials (ПОЛНАЯ СТРУКТУРА)
    console.log('📦 Создание materials...');
    await client.query(`
      CREATE TABLE "materials" (
        "id" integer NOT NULL DEFAULT nextval('materials_id_seq'::regclass),
        "sku" character varying(100) NOT NULL,
        "name" character varying(255) NOT NULL,
        "image" text,
        "unit" character varying(50) NOT NULL,
        "price" numeric NOT NULL DEFAULT 0.00,
        "supplier" character varying(255),
        "weight" numeric,
        "category" character varying(100) NOT NULL,
        "product_url" text,
        "show_image" boolean DEFAULT true,
        "tenant_id" uuid,
        "created_by" uuid,
        "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        "is_global" boolean DEFAULT false,
        "auto_calculate" boolean DEFAULT true,
        "consumption" numeric DEFAULT 0,
        "consumption_unit" character varying(50),
        "sku_number" integer,
        PRIMARY KEY (id)
      );
    `);
    console.log('✅ materials создана\n');
    
    // 5. CREATE TABLE work_materials (ПРАВИЛЬНАЯ СТРУКТУРА)
    console.log('📦 Создание work_materials...');
    await client.query(`
      CREATE TABLE "work_materials" (
        "id" integer NOT NULL DEFAULT nextval('work_materials_id_seq'::regclass),
        "work_id" integer NOT NULL,
        "material_id" integer NOT NULL,
        "consumption" numeric NOT NULL DEFAULT 1.0,
        "is_required" boolean DEFAULT true,
        "notes" text,
        "tenant_id" uuid NOT NULL,
        "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        "created_by" uuid,
        "updated_by" uuid,
        PRIMARY KEY (id)
      );
    `);
    console.log('✅ work_materials создана\n');
    
    // 6. Добавление foreign keys
    console.log('🔗 Добавление foreign keys...');
    await client.query(`
      ALTER TABLE materials ADD CONSTRAINT materials_tenant_id_fkey 
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    `);
    await client.query(`
      ALTER TABLE work_materials ADD CONSTRAINT work_materials_work_id_fkey 
      FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE;
    `);
    await client.query(`
      ALTER TABLE work_materials ADD CONSTRAINT work_materials_material_id_fkey 
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE;
    `);
    console.log('✅ Foreign keys добавлены\n');
    
    console.log('✅ ВСЕ ТАБЛИЦЫ ПЕРЕСОЗДАНЫ!\n');
    
    await client.end();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await client.end();
    process.exit(1);
  }
}

recreateTables();
