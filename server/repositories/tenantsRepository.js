import db from '../config/database.js';

/**
 * Найти компанию по ID
 */
export async function findById(id) {
  const client = await db.getClient();
  
  try {
    const result = await client.query(
      `SELECT id, name, plan, status,
              company_full_name, inn, ogrn, kpp,
              legal_address, actual_address,
              bank_account, correspondent_account, bank_bik, bank_name,
              director_name, accountant_name, logo_url,
              created_at, updated_at
       FROM tenants
       WHERE id = $1`,
      [id]
    );
    
    return result.rows[0] || null;
    
  } finally {
    client.release();
  }
}

/**
 * Обновить данные компании
 */
export async function update(id, data, userId) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Подготовка данных для обновления
    const updates = [];
    const values = [];
    let paramCount = 0;
    
    if (data.companyFullName !== undefined) {
      paramCount++;
      updates.push(`company_full_name = $${paramCount}`);
      values.push(data.companyFullName);
    }
    
    if (data.inn !== undefined) {
      paramCount++;
      updates.push(`inn = $${paramCount}`);
      values.push(data.inn);
    }
    
    if (data.ogrn !== undefined) {
      paramCount++;
      updates.push(`ogrn = $${paramCount}`);
      values.push(data.ogrn);
    }
    
    if (data.kpp !== undefined) {
      paramCount++;
      updates.push(`kpp = $${paramCount}`);
      values.push(data.kpp);
    }
    
    if (data.legalAddress !== undefined) {
      paramCount++;
      updates.push(`legal_address = $${paramCount}`);
      values.push(data.legalAddress);
    }
    
    if (data.actualAddress !== undefined) {
      paramCount++;
      updates.push(`actual_address = $${paramCount}`);
      values.push(data.actualAddress);
    }
    
    if (data.bankAccount !== undefined) {
      paramCount++;
      updates.push(`bank_account = $${paramCount}`);
      values.push(data.bankAccount);
    }
    
    if (data.correspondentAccount !== undefined) {
      paramCount++;
      updates.push(`correspondent_account = $${paramCount}`);
      values.push(data.correspondentAccount);
    }
    
    if (data.bankBik !== undefined) {
      paramCount++;
      updates.push(`bank_bik = $${paramCount}`);
      values.push(data.bankBik);
    }
    
    if (data.bankName !== undefined) {
      paramCount++;
      updates.push(`bank_name = $${paramCount}`);
      values.push(data.bankName);
    }
    
    if (data.directorName !== undefined) {
      paramCount++;
      updates.push(`director_name = $${paramCount}`);
      values.push(data.directorName);
    }
    
    if (data.accountantName !== undefined) {
      paramCount++;
      updates.push(`accountant_name = $${paramCount}`);
      values.push(data.accountantName);
    }
    
    if (data.logoUrl !== undefined) {
      paramCount++;
      updates.push(`logo_url = $${paramCount}`);
      values.push(data.logoUrl);
    }
    
    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    
    // Добавляем updated_at (без параметра, используем NOW())
    updates.push(`updated_at = NOW()`);
    
    // Добавляем ID в конец
    paramCount++;
    values.push(id);
    
    const query = `
      UPDATE tenants
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, plan, status,
                company_full_name, inn, ogrn, kpp,
                legal_address, actual_address,
                bank_account, correspondent_account, bank_bik, bank_name,
                director_name, accountant_name, logo_url,
                created_at, updated_at
    `;
    
    console.log('[TENANTS REPO] Executing update:', {
      paramCount,
      valuesCount: values.length,
      updates: updates.length
    });
    
    const result = await client.query(query, values);
    
    await client.query('COMMIT');
    
    return result.rows[0] || null;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[TENANTS REPO] Update error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });
    throw error;
  } finally {
    client.release();
  }
}

export default {
  findById,
  update
};
