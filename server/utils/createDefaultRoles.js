/**
 * Создание базовых ролей для нового тенанта
 * Вызывается при регистрации новой компании
 * 
 * ВАЖНО: Admin роль копирует разрешения из глобального шаблона (tenant_id = NULL)
 */
export async function createDefaultRolesForTenant(client, tenantId) {
  const defaultRoles = [
    {
      key: 'admin',
      name: 'Администратор',
      description: 'Полный доступ к управлению компанией'
    },
    {
      key: 'manager',
      name: 'Менеджер',
      description: 'Управление проектами и сметами'
    },
    {
      key: 'estimator',
      name: 'Сметчик',
      description: 'Создание и редактирование смет'
    },
    {
      key: 'worker',
      name: 'Работник',
      description: 'Просмотр назначенных работ'
    }
  ];

  const createdRoles = [];

  // 1. Получаем глобальную шаблонную admin роль
  const globalAdminTemplate = await client.query(
    `SELECT id FROM roles WHERE key = 'admin' AND tenant_id IS NULL`
  );

  for (const role of defaultRoles) {
    // 2. Создаем роль для тенанта
    const result = await client.query(
      `INSERT INTO roles (key, name, description, tenant_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, key, name`,
      [role.key, role.name, role.description, tenantId]
    );
    
    const createdRole = result.rows[0];
    createdRoles.push(createdRole);
    
    // 3. Если это admin роль и есть глобальный шаблон - копируем разрешения
    if (role.key === 'admin' && globalAdminTemplate.rows.length > 0) {
      const templateId = globalAdminTemplate.rows[0].id;
      
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id, is_hidden)
         SELECT $1, permission_id, is_hidden
         FROM role_permissions
         WHERE role_id = $2`,
        [createdRole.id, templateId]
      );
      
      const permCount = await client.query(
        `SELECT COUNT(*) FROM role_permissions WHERE role_id = $1`,
        [createdRole.id]
      );
      
      console.log(`✅ Admin роль создана с ${permCount.rows[0].count} разрешениями из глобального шаблона`);
    }
  }

  console.log(`✅ Создано ${createdRoles.length} базовых ролей для тенанта ${tenantId}`);
  
  return createdRoles;
}
