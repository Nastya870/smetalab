import { toCamelCase } from '../utils/helpers.js';
import * as tenantsRepository from '../repositories/tenantsRepository.js';

/**
 * @swagger
 * /tenants/{id}:
 *   put:
 *     tags: [Tenants]
 *     summary: Обновить данные компании
 *     description: |
 *       Обновляет реквизиты компании (тенанта).
 *       Пользователь может обновлять только свою компанию.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID компании (должен совпадать с tenantId пользователя)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyFullName:
 *                 type: string
 *                 example: "ООО \"Строительная компания\""
 *               inn:
 *                 type: string
 *                 example: "7700123456"
 *               ogrn:
 *                 type: string
 *                 example: "1234567890123"
 *               kpp:
 *                 type: string
 *                 example: "770001001"
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
 *     responses:
 *       200:
 *         description: Данные компании успешно обновлены
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Нет прав для обновления этой компании
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function updateTenant(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    // Проверка прав: можно обновлять только свою компанию
    if (id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Нет прав для обновления этой компании'
      });
    }

    const {
      companyFullName,
      inn,
      ogrn,
      kpp,
      legalAddress,
      actualAddress,
      bankAccount,
      correspondentAccount,
      bankBik,
      bankName,
      directorName,
      accountantName
    } = req.body;

    const updateData = {
      companyFullName,
      inn,
      ogrn,
      kpp,
      legalAddress,
      actualAddress,
      bankAccount,
      correspondentAccount,
      bankBik,
      bankName,
      directorName,
      accountantName
    };

    console.log('[TENANTS] Update request:', {
      requestId: id,
      userTenantId: tenantId,
      userId,
      bodyKeys: Object.keys(req.body)
    });
    console.log('[TENANTS] Update data:', updateData);

    // Получаем текущие данные ДО обновления
    const tenantBefore = await tenantsRepository.findById(id);
    console.log('[TENANTS] Current tenant data BEFORE update:', {
      id: tenantBefore?.id,
      name: tenantBefore?.name,
      companyFullName: tenantBefore?.company_full_name,
      inn: tenantBefore?.inn
    });

    const updatedTenant = await tenantsRepository.update(id, updateData, userId);

    if (!updatedTenant) {
      return res.status(404).json({
        success: false,
        message: 'Компания не найдена'
      });
    }

    console.log('[TENANTS] Update successful:', { 
      tenantId: updatedTenant.id,
      companyFullName: updatedTenant.company_full_name,
      inn: updatedTenant.inn
    });

    res.json({
      success: true,
      message: 'Данные компании обновлены',
      data: { tenant: toCamelCase(updatedTenant) }
    });

  } catch (error) {
    console.error('[TENANTS] Error updating tenant:', {
      error: error.message,
      stack: error.stack,
      tenantId: id,
      userId,
      data: updateData
    });
    console.error('[TENANTS] PostgreSQL Error Code:', error.code);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении данных компании',
      error: error.message
    });
  }
}

/**
 * @swagger
 * /tenants/{id}:
 *   get:
 *     tags: [Tenants]
 *     summary: Получить данные компании
 *     description: |
 *       Возвращает полную информацию о компании (реквизиты, контакты).
 *       Пользователь может просматривать только свою компанию.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID компании
 *     responses:
 *       200:
 *         description: Данные компании успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     tenant:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         companyFullName:
 *                           type: string
 *                         inn:
 *                           type: string
 *                         ogrn:
 *                           type: string
 *                         kpp:
 *                           type: string
 *                         legalAddress:
 *                           type: string
 *                         logoUrl:
 *                           type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Нет прав для просмотра этой компании
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function getTenant(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // Проверка прав
    if (id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Нет прав для просмотра этой компании'
      });
    }

    const tenant = await tenantsRepository.findById(id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Компания не найдена'
      });
    }

    res.json({
      success: true,
      data: { tenant: toCamelCase(tenant) }
    });

  } catch (error) {
    console.error('[TENANTS] Error fetching tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении данных компании',
      error: error.message
    });
  }
}

/**
 * @swagger
 * /tenants/{id}/logo:
 *   post:
 *     tags: [Tenants]
 *     summary: Загрузить логотип компании
 *     description: |
 *       Загружает логотип компании.
 *       Изображение конвертируется в base64 и сохраняется в БД.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID компании
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Файл изображения (PNG, JPG)
 *     responses:
 *       200:
 *         description: Логотип успешно загружен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 logoUrl:
 *                   type: string
 *                   description: Base64 данные изображения
 *       400:
 *         description: Файл не предоставлен
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Нет прав для обновления логотипа
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function uploadLogo(req, res) {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    // Проверка прав
    if (id !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Нет прав для обновления логотипа этой компании'
      });
    }

    // Получаем файл из req.file (multer)
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Файл не предоставлен'
      });
    }

    // Конвертируем в base64 для хранения
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Обновляем logo_url в базе данных
    const updatedTenant = await tenantsRepository.update(id, { logoUrl: base64Image }, userId);

    if (!updatedTenant) {
      return res.status(404).json({
        success: false,
        message: 'Компания не найдена'
      });
    }

    res.json({
      success: true,
      message: 'Логотип успешно загружен',
      logoUrl: base64Image
    });

  } catch (error) {
    console.error('[TENANTS] Error uploading logo:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при загрузке логотипа',
      error: error.message
    });
  }
}

export default {
  updateTenant,
  getTenant,
  uploadLogo
};
