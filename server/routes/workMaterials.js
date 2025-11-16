/**
 * Work Materials Routes
 * API endpoints для управления связями работ и материалов
 */

import express from 'express';
import {
  getAllWorkMaterials,
  getMaterialsByWork,
  getWorksByMaterial,
  createWorkMaterial,
  updateWorkMaterial,
  deleteWorkMaterial,
  getMaterialsForMultipleWorks
} from '../controllers/workMaterialsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Все маршруты требуют авторизации
router.use(authenticateToken);

// POST /api/work-materials/batch - получить материалы для нескольких работ (batch)
router.post('/batch', getMaterialsForMultipleWorks);

// GET /api/work-materials - получить все связи
router.get('/', getAllWorkMaterials);

// GET /api/work-materials/by-work/:workId - получить материалы для работы
router.get('/by-work/:workId', getMaterialsByWork);

// GET /api/work-materials/by-material/:materialId - получить работы для материала
router.get('/by-material/:materialId', getWorksByMaterial);

// POST /api/work-materials - создать связь
router.post('/', createWorkMaterial);

// PUT /api/work-materials/:id - обновить связь
router.put('/:id', updateWorkMaterial);

// DELETE /api/work-materials/:id - удалить связь
router.delete('/:id', deleteWorkMaterial);

export default router;
