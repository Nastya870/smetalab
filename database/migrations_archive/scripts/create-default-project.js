import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function createDefaultProject() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Подключение к базе данных успешно\n');

    const defaultProjectId = '00000000-0000-0000-0000-000000000001';
    const tenantId = '00000000-0000-0000-0000-000000000000';
    const userId = '00000000-0000-0000-0000-000000000000';

    // Проверяем, существует ли проект
    const checkResult = await client.query(
      'SELECT id, name FROM projects WHERE id = $1',
      [defaultProjectId]
    );

    if (checkResult.rows.length > 0) {
      console.log('✅ Тестовый проект уже существует:');
      console.log(`   ID: ${checkResult.rows[0].id}`);
      console.log(`   Name: ${checkResult.rows[0].name}`);
      return;
    }

    // Создаем тестовый проект
    console.log('🔨 Создаю тестовый проект...\n');

    const insertResult = await client.query(
      `INSERT INTO projects (
        id,
        tenant_id,
        name,
        object_name,
        description,
        client,
        contractor,
        address,
        status,
        progress,
        start_date,
        end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        defaultProjectId,
        tenantId,
        'Тестовый проект для конструктора смет',
        'Объект по умолчанию',
        'Проект создан автоматически для тестирования конструктора смет',
        'Тестовый заказчик',
        'Тестовый подрядчик',
        'г. Тестовый, ул. Тестовая, д. 1',
        'active',
        0,
        new Date(),
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // +1 год
      ]
    );

    console.log('✅ Тестовый проект успешно создан!');
    console.log(`   ID: ${insertResult.rows[0].id}`);
    console.log(`   Name: ${insertResult.rows[0].name}`);
    console.log(`   Status: ${insertResult.rows[0].status}`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('   Детали:', error.detail || error.hint || '');
  } finally {
    await client.end();
  }
}

createDefaultProject();
