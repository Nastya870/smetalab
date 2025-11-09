/**
 * Controller для экспорта сметы в Excel
 */

import exportHandler from '../../api/export-estimate-excel.js';

/**
 * @route   POST /api/export-estimate-excel
 * @desc    Экспорт сметы в Excel
 * @access  Private
 */
export async function exportEstimateToExcel(req, res) {
  try {
    console.log('🔐 Export controller - User:', req.user);
    console.log('📦 Export controller - Body:', req.body?.estimate?.id);
    
    // Вызываем оригинальный handler, который уже работает с req/res
    await exportHandler(req, res);
  } catch (error) {
    console.error('❌ Error in export controller:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Ошибка при экспорте сметы в Excel',
        message: error.message
      });
    }
  }
}
