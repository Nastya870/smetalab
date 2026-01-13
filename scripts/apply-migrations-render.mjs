import pkg from 'pg';
const { Client } = pkg;
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RENDER_URL = 'postgresql://smetalab_user:KJPh8y7plWvVIK2xiTeu9ROpUEk0QFSh@dpg-d51t19f6s9ss73eui8k0-a.frankfurt-postgres.render.com/smetalab_yay5';

// Миграции в ПРАВИЛЬНОМ порядке
const MIGRATIONS = [
  '001_create_auth_tables.sql',
  '003_setup_rls.sql',  // СНАЧАЛА RLS (создаёт current_tenant_id)
  '003_create_works_table.sql',
  '004_create_estimates.sql',
  '004_create_materials_table.sql',
  '005_add_global_references_support.sql',
  '006_add_performance_indexes.sql',
  '007_create_projects_tables.sql',
  '008_create_estimates_tables.sql',
  '009_add_composite_indexes.sql',
  '009_create_object_parameters_tables.sql',
  '010_add_source_type_to_estimate_items.sql',
  '011_add_hierarchy_to_works.sql',
  '011_add_work_hierarchy.sql',
  '012_additional_updates.sql',
  '012_create_work_materials_table.sql',
  '012_populate_work_hierarchy_demo_data.sql',
  '013_create_estimate_item_materials.sql',
  '014_add_auto_calculate_to_materials.sql',
  '014_add_work_id_to_estimate_items.sql',
  '015_create_schedules_table.sql',
  '019_add_consumption_unit_to_materials.sql',
  '020_add_auto_calculate_to_estimate_materials.sql',
  '020_add_sku_number_for_sorting.sql',
  '021_create_purchases_table.sql',
  '022_add_image_to_purchases.sql',
  '023_create_global_purchases.sql',
  '024_add_purchased_quantity.sql',
  '028_remove_purchased_quantity_constraint.sql',
  '029_update_project_statuses.sql',
  '030_create_work_completion_table.sql',
  '031_create_work_completion_acts.sql',
  '032_add_last_act_to_work_completions.sql',
  '032_update_act_statuses.sql',
  '033_create_counterparties.sql',
  '034_add_ks2_ks3_fields.sql',
  '035_add_tenant_details.sql',
  '036_add_contract_number.sql',
  '037_create_contracts.sql',
  '037_make_project_dates_nullable.sql',
  '038_add_logo_to_tenants.sql',
  '038_update_counterparties_passport_fields.sql',
  '040_create_contracts_table.sql',
  '041_optimize_materials_query.sql',
  '042_fix_works_code_uniqueness.sql',
  '043_create_estimate_templates.sql',
  '044_add_work_link_to_template_materials.sql',
  '050_add_partial_indexes_for_fast_filtering.sql',
  '050_manual_category_index.sql',
  '051_add_ui_visibility_to_permissions.sql'
];

const SEEDS = ['002_seed_roles_permissions.sql'];

async function applyMigrations() {
  const client = new Client({ 
    connectionString: RENDER_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000,
    query_timeout: 120000
  });

  try {
    console.log('\n🔌 Подключение к Render PostgreSQL...');
    await client.connect();
    console.log('✅ Подключено\n');

    let success = 0;
    let failed = 0;

    for (const file of MIGRATIONS) {
      const migrationClient = new Client({ 
        connectionString: RENDER_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 60000,
        query_timeout: 120000
      });
      
      try {
        await migrationClient.connect();
        console.log(`📄 Применение: ${file}...`);
        const sql = await readFile(join(__dirname, '..', 'database', 'migrations', file), 'utf-8');
        await migrationClient.query(sql);
        console.log(`✅ ${file}\n`);
        success++;
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`⏭️  ${file}: уже применен\n`);
          success++;
        } else {
          console.error(`❌ ${file}: ${error.message}\n`);
          failed++;
        }
      } finally {
        await migrationClient.end();
      }
    }

    console.log('\n🌱 Применение seeds...\n');
    for (const file of SEEDS) {
      const seedClient = new Client({ 
        connectionString: RENDER_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 60000,
        query_timeout: 120000
      });
      
      try {
        await seedClient.connect();
        console.log(`📄 Применение: ${file}...`);
        const sql = await readFile(join(__dirname, '..', 'database', 'seeds', file), 'utf-8');
        await seedClient.query(sql);
        console.log(`✅ ${file}\n`);
        success++;
      } catch (error) {
        console.error(`❌ ${file}: ${error.message}\n`);
        failed++;
      } finally {
        await seedClient.end();
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Успешно: ${success}`);
    console.log(`❌ Ошибок: ${failed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await client.end();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    await client.end();
    process.exit(1);
  }
}

applyMigrations();
