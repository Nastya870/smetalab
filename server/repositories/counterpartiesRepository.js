import db from '../config/database.js';

/**
 * Helper: преобразует пустые строки в null для полей дат и необязательных полей
 */
const sanitizeValue = (value) => {
  if (value === '' || value === undefined) return null;
  return value;
};

/**
 * Создать контрагента
 */
export async function create(data, tenantId, userId) {
  const client = await db.getClient();
  
  try {
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    
    const query = `
      INSERT INTO counterparties (
        tenant_id, entity_type,
        full_name, birth_date, birth_place, passport_series, passport_number, passport_issued_by_code, passport_issued_by, passport_issue_date, registration_address,
        company_name, inn, ogrn, kpp, legal_address, actual_address,
        bank_account, correspondent_account, bank_bik, bank_name, director_name, accountant_name,
        phone, email, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $26
      )
      RETURNING *
    `;
    
    const values = [
      tenantId, 
      data.entityType,
      sanitizeValue(data.fullName), 
      sanitizeValue(data.birthDate), 
      sanitizeValue(data.birthPlace), 
      sanitizeValue(data.passportSeries), 
      sanitizeValue(data.passportNumber), 
      sanitizeValue(data.passportIssuedByCode), 
      sanitizeValue(data.passportIssuedBy), 
      sanitizeValue(data.passportIssueDate), 
      sanitizeValue(data.registrationAddress),
      sanitizeValue(data.companyName), 
      sanitizeValue(data.inn), 
      sanitizeValue(data.ogrn), 
      sanitizeValue(data.kpp), 
      sanitizeValue(data.legalAddress), 
      sanitizeValue(data.actualAddress),
      sanitizeValue(data.bankAccount), 
      sanitizeValue(data.correspondentAccount), 
      sanitizeValue(data.bankBik), 
      sanitizeValue(data.bankName), 
      sanitizeValue(data.directorName), 
      sanitizeValue(data.accountantName),
      sanitizeValue(data.phone), 
      sanitizeValue(data.email), 
      userId
    ];
    
    const result = await client.query(query, values);
    return result.rows[0];
    
  } finally {
    client.release();
  }
}

/**
 * Получить всех контрагентов
 */
export async function findAll(tenantId, userId, filters = {}) {
  const client = await db.getClient();
  
  try {
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    
    let query = `SELECT * FROM counterparties WHERE tenant_id = $1`;
    const params = [tenantId];
    let paramCount = 1;
    
    if (filters.entityType) {
      paramCount++;
      query += ` AND entity_type = $${paramCount}`;
      params.push(filters.entityType);
    }
    
    if (filters.search) {
      paramCount++;
      query += ` AND (
        full_name ILIKE $${paramCount} OR 
        company_name ILIKE $${paramCount} OR 
        inn ILIKE $${paramCount} OR 
        phone ILIKE $${paramCount} OR 
        email ILIKE $${paramCount}
      )`;
      params.push(`%${filters.search}%`);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const result = await client.query(query, params);
    return result.rows;
    
  } finally {
    client.release();
  }
}

/**
 * Получить контрагента по ID
 */
export async function findById(id, tenantId, userId) {
  const client = await db.getClient();
  
  try {
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    
    const result = await client.query(
      `SELECT * FROM counterparties WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    
    return result.rows[0] || null;
    
  } finally {
    client.release();
  }
}

/**
 * Обновить контрагента
 */
export async function update(id, data, tenantId, userId) {
  const client = await db.getClient();
  
  try {
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    
    const query = `
      UPDATE counterparties SET
        entity_type = $1,
        full_name = $2, birth_date = $3, birth_place = $4, passport_series = $5, passport_number = $6, passport_issued_by_code = $7, passport_issued_by = $8, 
        passport_issue_date = $9, registration_address = $10,
        company_name = $11, inn = $12, ogrn = $13, kpp = $14, legal_address = $15, actual_address = $16,
        bank_account = $17, correspondent_account = $18, bank_bik = $19, bank_name = $20, director_name = $21, accountant_name = $22,
        phone = $23, email = $24, updated_at = NOW(), updated_by = $25
      WHERE id = $26 AND tenant_id = $27
      RETURNING *
    `;
    
    const values = [
      data.entityType,
      sanitizeValue(data.fullName), 
      sanitizeValue(data.birthDate), 
      sanitizeValue(data.birthPlace), 
      sanitizeValue(data.passportSeries), 
      sanitizeValue(data.passportNumber), 
      sanitizeValue(data.passportIssuedByCode), 
      sanitizeValue(data.passportIssuedBy), 
      sanitizeValue(data.passportIssueDate), 
      sanitizeValue(data.registrationAddress),
      sanitizeValue(data.companyName), 
      sanitizeValue(data.inn), 
      sanitizeValue(data.ogrn), 
      sanitizeValue(data.kpp), 
      sanitizeValue(data.legalAddress), 
      sanitizeValue(data.actualAddress),
      sanitizeValue(data.bankAccount), 
      sanitizeValue(data.correspondentAccount), 
      sanitizeValue(data.bankBik), 
      sanitizeValue(data.bankName), 
      sanitizeValue(data.directorName), 
      sanitizeValue(data.accountantName),
      sanitizeValue(data.phone), 
      sanitizeValue(data.email), 
      userId, 
      id, 
      tenantId
    ];
    
    const result = await client.query(query, values);
    return result.rows[0] || null;
    
  } finally {
    client.release();
  }
}

/**
 * Удалить контрагента
 */
export async function deleteById(id, tenantId, userId) {
  const client = await db.getClient();
  
  try {
    await client.query(`
      SELECT set_config('app.current_user_id', $1, false),
             set_config('app.current_tenant_id', $2, false)
    `, [userId, tenantId]);
    
    const result = await client.query(
      `DELETE FROM counterparties WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );
    
    return result.rows.length > 0;
    
  } finally {
    client.release();
  }
}

export default { create, findAll, findById, update, deleteById };
