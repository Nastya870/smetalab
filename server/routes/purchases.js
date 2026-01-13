import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import * as purchasesController from '../controllers/purchasesController.js';
import {
  exportToCSV,
  importFromCSV
} from '../controllers/purchasesImportExportController.js';


const router = express.Router();

// Настройка multer для загрузки файлов в память
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый формат файла. Используйте JPG, PNG, WebP, PDF или CSV'), false);
    }

  }
});

// Все роуты требуют авторизации
router.use(authenticateToken);

/**
 * Сформировать закупки из сметы
 * @route POST /api/purchases/generate
 * @body { estimateId, projectId }
 */
router.post('/generate', purchasesController.generatePurchases);

/**
 * Получить закупки по ID сметы
 * @route GET /api/purchases/estimate/:estimateId
 */
router.get('/estimate/:estimateId', purchasesController.getPurchasesByEstimate);

/**
 * Удалить закупки
 * @route DELETE /api/purchases/estimate/:estimateId
 */
router.delete('/estimate/:estimateId', purchasesController.deletePurchases);

/**
 * @route GET /api/purchases/estimate/:estimateId/export
 * @desc Экспорт закупок в CSV
 * @access Private
 */
router.get('/estimate/:estimateId/export', exportToCSV);

/**
 * @route POST /api/purchases/estimate/:estimateId/import
 * @desc Импорт закупок из CSV
 * @access Private
 */
router.post('/estimate/:estimateId/import', upload.single('file'), importFromCSV);


/**
 * Добавить материал О/Ч в закупки проекта
 * @route POST /api/purchases/extra-charge
 * @body { estimateId, projectId, materialId, quantity, price, isExtraCharge }
 */
router.post('/extra-charge', purchasesController.createExtraCharge);

/**
 * Распознать накладную с помощью OCR (OpenAI Vision)
 * @route POST /api/purchases/analyze-receipt
 * @formdata { image: File }
 */
router.post('/analyze-receipt', upload.single('image'), purchasesController.analyzeReceiptOCR);

export default router;
