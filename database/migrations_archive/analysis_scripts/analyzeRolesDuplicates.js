import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function analyzeRolesDuplicates() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('=== АНАЛИЗ ДУБЛЕЙ РОЛЕЙ ===\n');

    // 1. Роли по тенантам
    const byTenant = await client.query(`
    SELECT tenant_id, COUNT(*) as cnt 
    FROM roles 
    GROUP BY tenant_id 
    ORDER BY cnt DESC 
    LIMIT 10
  `);
    console.log('Роли по тенантам (TOP 10):');
    byTenant.rows.forEach(r => console.log('  ', r.tenant_id || 'NULL', ':', r.cnt, 'ролей'));

    // 2. Уникальные ключи ролей
    const uniqueKeys = await client.query('SELECT DISTINCT key FROM roles');
    console.log('\nУникальных ключей ролей:', uniqueKeys.rows.length);
    console.log('Ключи:', uniqueKeys.rows.map(r => r.key).join(', '));

    // 3. Теоретически правильное количество
    const tenantsCount = await client.query('SELECT COUNT(*) FROM tenants');
    const rolesCount = await client.query('SELECT COUNT(*) FROM roles');
    const expected = uniqueKeys.rows.length * parseInt(tenantsCount.rows[0].count);
    const actual = parseInt(rolesCount.rows[0].count);

    console.log('\nТенантов:', tenantsCount.rows[0].count);
    console.log('Ожидаемое количество ролей (ключи × тенанты):', expected);
    console.log('Фактическое количество:', actual);

    if (actual > expected) {
        console.log('⚠️ Аномалия:', actual - expected, 'лишних записей');
    }

    // 4. Проверяем дубли
    const duplicates = await client.query(`
    SELECT key, tenant_id, COUNT(*) as cnt
    FROM roles
    GROUP BY key, tenant_id
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 10
  `);

    if (duplicates.rows.length > 0) {
        console.log('\n⚠️ ДУБЛИ НАЙДЕНЫ:');
        console.log('(key, tenant_id, количество)');
        duplicates.rows.forEach(r => {
            console.log('  ', r.key, '|', r.tenant_id || 'NULL', '|', r.cnt, 'дублей');
        });
    } else {
        console.log('\n✅ Дублей (key + tenant_id) не обнаружено');
    }

    // 5. Проверяем связь с role_permissions
    const rpStats = await client.query(`
    SELECT 
      COUNT(DISTINCT role_id) as unique_roles,
      COUNT(*) as total_records
    FROM role_permissions
  `);
    console.log('\n=== role_permissions ===');
    console.log('Уникальных role_id:', rpStats.rows[0].unique_roles);
    console.log('Всего записей:', rpStats.rows[0].total_records);

    const avgPerms = (parseInt(rpStats.rows[0].total_records) / parseInt(rpStats.rows[0].unique_roles)).toFixed(1);
    console.log('Среднее разрешений на роль:', avgPerms);

    // 6. Есть ли осиротевшие role_permissions?
    const orphaned = await client.query(`
    SELECT COUNT(*) as cnt
    FROM role_permissions rp
    LEFT JOIN roles r ON rp.role_id = r.id
    WHERE r.id IS NULL
  `);
    console.log('Осиротевших role_permissions:', orphaned.rows[0].cnt);

    // 7. Рекомендация по очистке
    console.log('\n=== РЕКОМЕНДАЦИИ ===');

    if (duplicates.rows.length > 0) {
        console.log('1. Удалить дубликаты ролей:');
        console.log(`   DELETE FROM roles WHERE id NOT IN (
     SELECT MIN(id) FROM roles GROUP BY key, tenant_id
   );`);
    }

    if (parseInt(orphaned.rows[0].cnt) > 0) {
        console.log('2. Удалить осиротевшие role_permissions:');
        console.log(`   DELETE FROM role_permissions 
   WHERE role_id NOT IN (SELECT id FROM roles);`);
    }

    await client.end();
    console.log('\n✅ Анализ завершён');
}

analyzeRolesDuplicates().catch(err => {
    console.error('Ошибка:', err);
    process.exit(1);
});
