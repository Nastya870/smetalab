import db from '../config/database.js';
import { catchAsync, BadRequestError, NotFoundError } from '../utils/errors.js';

/**
 * Получить договор по ID сметы
 * @route GET /api/contracts/estimate/:estimateId
 */
export const getContractByEstimate = catchAsync(async (req, res) => {
  const { estimateId } = req.params;

  const result = await db.query(
    `SELECT 
      c.*,
      row_to_json(customer.*) as customer,
      row_to_json(contractor.*) as contractor,
      p.name as project_name,
      p.address as project_address,
      e.name as estimate_name
    FROM contracts c
    LEFT JOIN counterparties customer ON c.customer_id = customer.id
    LEFT JOIN counterparties contractor ON c.contractor_id = contractor.id
    LEFT JOIN projects p ON c.project_id = p.id
    LEFT JOIN estimates e ON c.estimate_id = e.id
    WHERE c.estimate_id = $1`,
    [estimateId]
  );

  if (result.rows.length === 0) {
    // Не выбрасываем 404 ошибку, если договора нет,
    // просто возвращаем null, чтобы клиент мог предложить создать его
    return res.json({
      success: true,
      contract: null
    });
  }

  res.json({
    success: true,
    contract: result.rows[0]
  });
});

/**
 * Получить договор по ID
 * @route GET /api/contracts/:id
 */
export const getById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT 
      c.*,
      row_to_json(customer.*) as customer,
      row_to_json(contractor.*) as contractor,
      p.name as project_name,
      p.address as project_address,
      e.name as estimate_name
    FROM contracts c
    LEFT JOIN counterparties customer ON c.customer_id = customer.id
    LEFT JOIN counterparties contractor ON c.contractor_id = contractor.id
    LEFT JOIN projects p ON c.project_id = p.id
    LEFT JOIN estimates e ON c.estimate_id = e.id
    WHERE c.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Договор не найден');
  }

  res.json({
    success: true,
    contract: result.rows[0]
  });
});

/**
 * Сгенерировать договор с автозаполнением
 * @route POST /api/contracts/generate
 */
export const generateContract = catchAsync(async (req, res) => {
  const { estimateId, projectId, customerId, contractorId } = req.body;

  // Валидация входных данных
  if (!estimateId || !projectId || !customerId || !contractorId) {
    throw new BadRequestError('Все поля обязательны: estimateId, projectId, customerId, contractorId');
  }

  // Получаем данные сметы
  const estimateResult = await db.query(
    'SELECT * FROM estimates WHERE id = $1',
    [estimateId]
  );

  if (estimateResult.rows.length === 0) {
    throw new NotFoundError('Смета не найдена');
  }

  const estimate = estimateResult.rows[0];

  // Получаем данные проекта
  const projectResult = await db.query(
    'SELECT * FROM projects WHERE id = $1',
    [projectId]
  );

  if (projectResult.rows.length === 0) {
    throw new NotFoundError('Проект не найден');
  }

  const project = projectResult.rows[0];

  // Получаем данные заказчика
  const customerResult = await db.query(
    'SELECT * FROM counterparties WHERE id = $1 AND entity_type = $2',
    [customerId, 'individual']
  );

  if (customerResult.rows.length === 0) {
    throw new NotFoundError('Заказчик не найден или не является физическим лицом');
  }

  const customer = customerResult.rows[0];

  // Получаем данные подрядчика
  const contractorResult = await db.query(
    'SELECT * FROM counterparties WHERE id = $1 AND entity_type = $2',
    [contractorId, 'legal']
  );

  if (contractorResult.rows.length === 0) {
    throw new NotFoundError('Подрядчик не найден или не является юридическим лицом');
  }

  const contractor = contractorResult.rows[0];

  // Генерация номера договора (формат: Д-YYYY-NNN)
  const year = new Date().getFullYear();

  // Находим максимальный номер договора для этого tenant в текущем году
  const maxNumberResult = await db.query(
    `SELECT contract_number 
     FROM contracts 
     WHERE tenant_id = $1 
       AND EXTRACT(YEAR FROM contract_date) = $2
       AND contract_number LIKE $3
     ORDER BY contract_number DESC
     LIMIT 1`,
    [req.user.tenantId, year, `Д-${year}-%`]
  );

  let nextNumber = 1;
  if (maxNumberResult.rows.length > 0) {
    const lastNumber = maxNumberResult.rows[0].contract_number;
    const match = lastNumber.match(/Д-\d{4}-(\d{3})/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  const contractNumber = `Д-${year}-${String(nextNumber).padStart(3, '0')}`;

  // Получаем стоимость сметы
  const totalAmount = estimate.total_cost || 0;

  // Формируем template_data с автозаполненными полями
  const templateData = {
    // Данные договора
    contractNumber,
    contractDate: new Date().toISOString().split('T')[0],
    totalAmount,

    // Данные заказчика (физ. лицо)
    customer: {
      fullName: customer.full_name,
      passportSeries: customer.passport_series_number?.split(' ')[0] || '',
      passportNumber: customer.passport_series_number?.split(' ')[1] || '',
      passportIssuedBy: customer.passport_issued_by || '',
      passportIssueDate: customer.passport_issue_date || '',
      registrationAddress: customer.registration_address || '',
      phone: customer.phone || '',
      email: customer.email || ''
    },

    // Данные подрядчика (юр. лицо)
    contractor: {
      companyName: contractor.company_name,
      inn: contractor.inn,
      ogrn: contractor.ogrn,
      legalAddress: contractor.legal_address || '',
      actualAddress: contractor.actual_address || '',
      phone: contractor.phone || '',
      email: contractor.email || '',
      bankName: contractor.bank_name || '',
      bik: contractor.bik || '',
      correspondentAccount: contractor.correspondent_account || '',
      settlementAccount: contractor.settlement_account || '',
      directorName: contractor.director_name || '',
      directorPosition: contractor.director_position || 'Генеральный директор'
    },

    // Данные проекта
    project: {
      name: project.name,
      address: project.address,
      objectName: project.object_name || project.name,
      description: project.description || ''
    },

    // Данные сметы
    estimate: {
      name: estimate.name,
      totalCost: totalAmount,
      worksCost: estimate.works_cost || 0,
      materialsCost: estimate.materials_cost || 0,
      overheadPercent: estimate.overhead_percent || 0,
      profitPercent: estimate.profit_percent || 0
    }
  };

  // Проверяем, нет ли уже договора для этой сметы
  const existingContract = await db.query(
    'SELECT id FROM contracts WHERE estimate_id = $1',
    [estimateId]
  );

  if (existingContract.rows.length > 0) {
    throw new BadRequestError('Договор для этой сметы уже существует');
  }

  // Создаем договор
  const result = await db.query(
    `INSERT INTO contracts (
      tenant_id, estimate_id, project_id, customer_id, contractor_id,
      contract_number, contract_date, total_amount, status, template_data
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      req.user.tenantId,
      estimateId,
      projectId,
      customerId,
      contractorId,
      contractNumber,
      new Date(),
      totalAmount,
      'draft',
      JSON.stringify(templateData)
    ]
  );

  // Обновляем номер договора в проекте
  await db.query(
    `UPDATE projects SET contract_number = $1 WHERE id = $2`,
    [contractNumber, projectId]
  );

  // Получаем полную информацию о созданном договоре
  const fullContractResult = await db.query(
    `SELECT 
      c.*,
      row_to_json(customer.*) as customer,
      row_to_json(contractor.*) as contractor
    FROM contracts c
    LEFT JOIN counterparties customer ON c.customer_id = customer.id
    LEFT JOIN counterparties contractor ON c.contractor_id = contractor.id
    WHERE c.id = $1`,
    [result.rows[0].id]
  );

  res.status(201).json({
    success: true,
    message: 'Договор успешно создан',
    contract: fullContractResult.rows[0]
  });
});

/**
 * Обновить договор
 * @route PUT /api/contracts/:id
 */
export const updateContract = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { contractDate, totalAmount, status, templateData } = req.body;

  const updates = [];
  const values = [];
  let paramCount = 1;

  if (contractDate) {
    updates.push(`contract_date = $${paramCount++}`);
    values.push(contractDate);
  }

  if (totalAmount !== undefined) {
    updates.push(`total_amount = $${paramCount++}`);
    values.push(totalAmount);
  }

  if (status) {
    updates.push(`status = $${paramCount++}`);
    values.push(status);
  }

  if (templateData) {
    updates.push(`template_data = $${paramCount++}`);
    values.push(JSON.stringify(templateData));
  }

  if (updates.length === 0) {
    throw new BadRequestError('Нет данных для обновления');
  }

  values.push(id);

  const result = await db.query(
    `UPDATE contracts 
     SET ${updates.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Договор не найден');
  }

  res.json({
    success: true,
    message: 'Договор успешно обновлен',
    contract: result.rows[0]
  });
});

/**
 * Удалить договор
 * @route DELETE /api/contracts/:id
 */
export const deleteContract = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await db.query(
    'DELETE FROM contracts WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Договор не найден');
  }

  res.json({
    success: true,
    message: 'Договор успешно удален'
  });
});

/**
 * Скачать договор в формате DOCX
 * @route GET /api/contracts/:id/docx
 */
export const getContractDOCX = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Получаем данные договора с полной информацией
  const result = await db.query(
    `SELECT 
      c.*,
      row_to_json(customer.*) as customer,
      row_to_json(contractor.*) as contractor,
      row_to_json(p.*) as project,
      row_to_json(e.*) as estimate
    FROM contracts c
    LEFT JOIN counterparties customer ON c.customer_id = customer.id
    LEFT JOIN counterparties contractor ON c.contractor_id = contractor.id
    LEFT JOIN projects p ON c.project_id = p.id
    LEFT JOIN estimates e ON c.estimate_id = e.id
    WHERE c.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Договор не найден');
  }

  const contract = result.rows[0];

  // Получаем данные графика (фазы работ)
  let schedulePhases = [];
  if (contract.estimate_id) {
    const scheduleResult = await db.query(
      `SELECT 
        phase,
        SUM(total_price) as phase_total
      FROM schedules
      WHERE estimate_id = $1
      GROUP BY phase
      ORDER BY MIN(position_number)`,
      [contract.estimate_id]
    );

    schedulePhases = scheduleResult.rows.map(row => ({
      phase: row.phase,
      amount: parseFloat(row.phase_total)
    }));
  }

  // Импортируем генератор DOCX
  const { generateContractDOCX } = await import('../utils/contractDocxGenerator.js');

  // Генерируем DOCX с данными графика
  const buffer = await generateContractDOCX(contract, schedulePhases);

  // Кодируем имя файла для корректной работы с кириллицей
  const filename = `Договор_${contract.contract_number}.docx`;
  const encodedFilename = encodeURIComponent(filename);

  // Отправляем файл
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
  res.send(buffer);
});

/**
 * Изменить статус договора
 * @route PATCH /api/contracts/:id/status
 */
export const updateStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    throw new BadRequestError('Статус обязателен');
  }

  const allowedStatuses = ['draft', 'active', 'completed', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    throw new BadRequestError(`Недопустимый статус. Допустимые значения: ${allowedStatuses.join(', ')}`);
  }

  const result = await db.query(
    'UPDATE contracts SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Договор не найден');
  }

  res.json({
    success: true,
    message: 'Статус успешно обновлен',
    contract: result.rows[0]
  });
});

/**
 * Получить все договоры проекта
 * @route GET /api/contracts/project/:projectId
 */
export const getContractsByProject = catchAsync(async (req, res) => {
  const { projectId } = req.params;

  const result = await db.query(
    `SELECT 
      c.*,
      row_to_json(customer.*) as customer,
      row_to_json(contractor.*) as contractor,
      e.name as estimate_name
    FROM contracts c
    LEFT JOIN counterparties customer ON c.customer_id = customer.id
    LEFT JOIN counterparties contractor ON c.contractor_id = contractor.id
    LEFT JOIN estimates e ON c.estimate_id = e.id
    WHERE c.project_id = $1
    ORDER BY c.created_at DESC`,
    [projectId]
  );

  res.json({
    success: true,
    contracts: result.rows
  });
});
