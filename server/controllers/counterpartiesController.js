import { StatusCodes } from 'http-status-codes';
import * as counterpartiesRepository from '../repositories/counterpartiesRepository.js';
import { catchAsync, BadRequestError, NotFoundError, ConflictError } from '../utils/errors.js';

// Helper: snake_case → camelCase
const toCamelCase = (counterparty) => ({
  id: counterparty.id,
  tenantId: counterparty.tenant_id,
  entityType: counterparty.entity_type,
  fullName: counterparty.full_name,
  birthDate: counterparty.birth_date,
  birthPlace: counterparty.birth_place,
  passportSeriesNumber: counterparty.passport_series_number,
  passportIssuedBy: counterparty.passport_issued_by,
  passportIssueDate: counterparty.passport_issue_date,
  registrationAddress: counterparty.registration_address,
  companyName: counterparty.company_name,
  inn: counterparty.inn,
  ogrn: counterparty.ogrn,
  kpp: counterparty.kpp,
  legalAddress: counterparty.legal_address,
  actualAddress: counterparty.actual_address,
  bankAccount: counterparty.bank_account,
  correspondentAccount: counterparty.correspondent_account,
  bankBik: counterparty.bank_bik,
  bankName: counterparty.bank_name,
  directorName: counterparty.director_name,
  accountantName: counterparty.accountant_name,
  phone: counterparty.phone,
  email: counterparty.email,
  createdAt: counterparty.created_at,
  createdBy: counterparty.created_by,
  updatedAt: counterparty.updated_at,
  updatedBy: counterparty.updated_by
});

// Helper: camelCase → snake_case
const toSnakeCase = (data) => ({
  entityType: data.entityType,
  fullName: data.fullName,
  birthDate: data.birthDate,
  birthPlace: data.birthPlace,
  passportSeriesNumber: data.passportSeriesNumber,
  passportIssuedBy: data.passportIssuedBy,
  passportIssueDate: data.passportIssueDate,
  registrationAddress: data.registrationAddress,
  companyName: data.companyName,
  inn: data.inn,
  ogrn: data.ogrn,
  kpp: data.kpp,
  legalAddress: data.legalAddress,
  actualAddress: data.actualAddress,
  bankAccount: data.bankAccount,
  correspondentAccount: data.correspondentAccount,
  bankBik: data.bankBik,
  bankName: data.bankName,
  directorName: data.directorName,
  accountantName: data.accountantName,
  phone: data.phone,
  email: data.email
});

/**
 * @swagger
 * /counterparties:
 *   get:
 *     tags: [Counterparties]
 *     summary: Получить список контрагентов
 *     description: |
 *       Возвращает всех контрагентов тенанта с возможностью фильтрации.
 *       Контрагенты могут быть физическими лицами (individual) или юридическими лицами (legal).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [individual, legal]
 *         description: Фильтр по типу контрагента
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по наименованию, ИНН, ОГРН
 *     responses:
 *       200:
 *         description: Список контрагентов успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 counterparties:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Counterparty'
 *                 count:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getAllCounterparties = catchAsync(async (req, res) => {
  const { entityType, search } = req.query;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  const counterparties = await counterpartiesRepository.findAll(
    tenantId,
    userId,
    { entityType, search }
  );

  const formatted = counterparties.map(toCamelCase);

  res.status(StatusCodes.OK).json({
    counterparties: formatted,
    count: formatted.length
  });
});

/**
 * @swagger
 * /counterparties/{id}:
 *   get:
 *     tags: [Counterparties]
 *     summary: Получить контрагента по ID
 *     description: Возвращает детальную информацию о контрагенте
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Контрагент найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Counterparty'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const getCounterpartyById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  const counterparty = await counterpartiesRepository.findById(id, tenantId, userId);

  if (!counterparty) {
    throw new NotFoundError('Контрагент не найден');
  }

  res.status(StatusCodes.OK).json(toCamelCase(counterparty));
});

/**
 * @swagger
 * /counterparties:
 *   post:
 *     tags: [Counterparties]
 *     summary: Создать контрагента
 *     description: |
 *       Создаёт нового контрагента (физическое или юридическое лицо).
 *       Для физ. лица обязательны: ФИО, дата рождения, паспортные данные.
 *       Для юр. лица обязательны: наименование, ИНН, ОГРН, КПП.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityType
 *             properties:
 *               entityType:
 *                 type: string
 *                 enum: [individual, legal]
 *                 description: Тип контрагента
 *               fullName:
 *                 type: string
 *                 description: ФИО (для физ. лица)
 *               birthDate:
 *                 type: string
 *                 format: date
 *               birthPlace:
 *                 type: string
 *               passportSeriesNumber:
 *                 type: string
 *               passportIssuedBy:
 *                 type: string
 *               passportIssueDate:
 *                 type: string
 *                 format: date
 *               registrationAddress:
 *                 type: string
 *               companyName:
 *                 type: string
 *                 description: Наименование (для юр. лица)
 *               inn:
 *                 type: string
 *               ogrn:
 *                 type: string
 *               kpp:
 *                 type: string
 *               legalAddress:
 *                 type: string
 *               actualAddress:
 *                 type: string
 *               bankAccount:
 *                 type: string
 *               correspondentAccount:
 *                 type: string
 *               bankBik:
 *                 type: string
 *               bankName:
 *                 type: string
 *               directorName:
 *                 type: string
 *               accountantName:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Контрагент успешно создан
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Контрагент с такими данными уже существует
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const createCounterparty = catchAsync(async (req, res) => {
  const data = toSnakeCase(req.body);
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  // Валидация обязательных полей
  if (!data.entityType || !['individual', 'legal'].includes(data.entityType)) {
    throw new BadRequestError('Необходимо указать тип контрагента: individual или legal');
  }

  if (data.entityType === 'individual') {
    if (!data.fullName || !data.birthDate || !data.birthPlace || !data.passportSeriesNumber || 
        !data.passportIssuedBy || !data.passportIssueDate || !data.registrationAddress) {
      throw new BadRequestError('Для физического лица обязательны поля: ФИО, дата рождения, место рождения, паспортные данные, адрес регистрации');
    }
  }

  if (data.entityType === 'legal') {
    if (!data.companyName || !data.inn || !data.ogrn || !data.kpp || !data.legalAddress) {
      throw new BadRequestError('Для юридического лица обязательны поля: наименование, ИНН, ОГРН, КПП, юридический адрес');
    }
  }

  try {
    const counterparty = await counterpartiesRepository.create(data, tenantId, userId);

    res.status(StatusCodes.CREATED).json({
      message: 'Контрагент успешно создан',
      counterparty: toCamelCase(counterparty)
    });
  } catch (error) {
    if (error.code === '23505') {
      throw new ConflictError('Контрагент с такими данными уже существует');
    }
    throw error;
  }
});

/**
 * @swagger
 * /counterparties/{id}:
 *   put:
 *     tags: [Counterparties]
 *     summary: Обновить контрагента
 *     description: Обновляет данные контрагента
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               companyName:
 *                 type: string
 *               inn:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Контрагент успешно обновлён
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const updateCounterparty = catchAsync(async (req, res) => {
  const { id } = req.params;
  const data = toSnakeCase(req.body);
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  const counterparty = await counterpartiesRepository.update(id, data, tenantId, userId);

  if (!counterparty) {
    throw new NotFoundError('Контрагент не найден');
  }

  res.status(StatusCodes.OK).json({
    message: 'Контрагент успешно обновлен',
    counterparty: toCamelCase(counterparty)
  });
});

/**
 * @swagger
 * /counterparties/{id}:
 *   delete:
 *     tags: [Counterparties]
 *     summary: Удалить контрагента
 *     description: Удаляет контрагента из системы
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Контрагент успешно удалён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export const deleteCounterparty = catchAsync(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.userId;

  const deleted = await counterpartiesRepository.deleteById(id, tenantId, userId);

  if (!deleted) {
    throw new NotFoundError('Контрагент не найден');
  }

  res.status(StatusCodes.OK).json({
    message: 'Контрагент успешно удален'
  });
});

export default {
  getAllCounterparties,
  getCounterpartyById,
  createCounterparty,
  updateCounterparty,
  deleteCounterparty
};
