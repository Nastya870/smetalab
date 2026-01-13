/**
 * Routes для управления параметрами объектов
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getParametersByEstimate,
  getParameterById,
  saveParameters,
  updateParameter,
  deleteParameter,
  getStatistics
} from '../controllers/objectParametersController.js';

const router = express.Router();

// Все routes требуют аутентификации
router.use(authenticateToken);

// Routes для параметров сметы
router.get('/estimates/:estimateId/parameters', getParametersByEstimate);
router.post('/estimates/:estimateId/parameters', saveParameters);
router.get('/estimates/:estimateId/parameters/statistics', getStatistics);

// Routes для отдельных параметров
router.get('/parameters/:id', getParameterById);
router.put('/parameters/:id', updateParameter);
router.delete('/parameters/:id', deleteParameter);

export default router;
