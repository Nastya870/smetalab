import express from 'express';
import {
  getContractByEstimate,
  getById,
  generateContract,
  updateContract,
  deleteContract,
  getContractDOCX,
  updateStatus,
  getContractsByProject
} from '../controllers/contractsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Contracts
 *   description: API для управления договорами
 */

/**
 * @swagger
 * /api/contracts/estimate/{estimateId}:
 *   get:
 *     summary: Получить договор по ID сметы
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estimateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Договор успешно получен
 *       404:
 *         description: Договор не найден
 */
router.get('/estimate/:estimateId', authenticateToken, getContractByEstimate);

/**
 * @swagger
 * /api/contracts/project/{projectId}:
 *   get:
 *     summary: Получить все договоры проекта
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список договоров проекта
 */
router.get('/project/:projectId', authenticateToken, getContractsByProject);

/**
 * @swagger
 * /api/contracts/generate:
 *   post:
 *     summary: Сгенерировать договор с автозаполнением
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estimateId
 *               - projectId
 *               - customerId
 *               - contractorId
 *             properties:
 *               estimateId:
 *                 type: string
 *                 description: ID сметы
 *               projectId:
 *                 type: string
 *                 description: ID проекта
 *               customerId:
 *                 type: string
 *                 description: ID заказчика (физ. лицо)
 *               contractorId:
 *                 type: string
 *                 description: ID подрядчика (юр. лицо)
 *     responses:
 *       201:
 *         description: Договор успешно создан
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Смета, проект или контрагент не найден
 */
router.post('/generate', authenticateToken, generateContract);

/**
 * @swagger
 * /api/contracts/{id}:
 *   get:
 *     summary: Получить договор по ID
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Договор успешно получен
 *       404:
 *         description: Договор не найден
 */
router.get('/:id', authenticateToken, getById);

/**
 * @swagger
 * /api/contracts/{id}:
 *   put:
 *     summary: Обновить договор
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contractDate:
 *                 type: string
 *                 format: date
 *               totalAmount:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [draft, active, completed, cancelled]
 *               templateData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Договор успешно обновлен
 *       404:
 *         description: Договор не найден
 */
router.put('/:id', authenticateToken, updateContract);

/**
 * @swagger
 * /api/contracts/{id}:
 *   delete:
 *     summary: Удалить договор
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Договор успешно удален
 *       404:
 *         description: Договор не найден
 */
router.delete('/:id', authenticateToken, deleteContract);

/**
 * @swagger
 * /api/contracts/{id}/docx:
 *   get:
 *     summary: Скачать договор в формате DOCX
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: DOCX файл договора
 *         content:
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Договор не найден
 */
router.get('/:id/docx', authenticateToken, getContractDOCX);

/**
 * @swagger
 * /api/contracts/{id}/status:
 *   patch:
 *     summary: Изменить статус договора
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, active, completed, cancelled]
 *     responses:
 *       200:
 *         description: Статус успешно обновлен
 *       400:
 *         description: Недопустимый статус
 *       404:
 *         description: Договор не найден
 */
router.patch('/:id/status', authenticateToken, updateStatus);

export default router;
