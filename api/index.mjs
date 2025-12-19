// Vercel Serverless Function для API
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerSpec from '../server/config/swagger.js';
import { register, login, logout, refresh, getMe } from '../server/controllers/authController.js';
import { sendVerificationEmail, verifyEmail, getVerificationStatus } from '../server/controllers/emailController.js';
import { forgotPassword, resetPassword, validateResetToken } from '../server/controllers/passwordResetController.js';
import { getEstimatesByProject, getEstimateById, createEstimate, updateEstimate, deleteEstimate, getEstimateStatistics, getEstimateFullDetails, createEstimateWithDetails } from '../server/controllers/estimatesController.js';
import { getEstimateItems, getEstimateItemById, createEstimateItem, updateEstimateItem, deleteEstimateItem, bulkAddFromWorks, reorderEstimateItems, bulkCreateItems, deleteAllEstimateItems, replaceAllEstimateItems } from '../server/controllers/estimateItemsController.js';
import { getParametersByEstimate, getParameterById, saveParameters, updateParameter, deleteParameter, getStatistics as getParametersStatistics } from '../server/controllers/objectParametersController.js';
import { getAllWorks, getWorkById, createWork, updateWork, deleteWork, getWorksStats, getWorkCategories } from '../server/controllers/worksController.js';
// import { bulkCreateWorks } from '../server/controllers/worksBulkController.js'; // TEMPORARY DISABLED
import { getHierarchyByLevel, getHierarchyTree, getHierarchyItemById, createHierarchyItem, updateHierarchyItem, deleteHierarchyItem, getAutocomplete, getHierarchyStatistics } from '../server/controllers/workHierarchyController.js';
import { getAllMaterials, getMaterialById, createMaterial, updateMaterial, deleteMaterial, getMaterialsStats, getMaterialCategories, getMaterialSuppliers } from '../server/controllers/materialsController.js';
import { getAllWorkMaterials, getMaterialsByWork, getWorksByMaterial, createWorkMaterial, updateWorkMaterial, deleteWorkMaterial, getMaterialsForMultipleWorks } from '../server/controllers/workMaterialsController.js';
import { generateSchedule, getScheduleByEstimate, deleteSchedule } from '../server/controllers/schedulesController.js';
import { generatePurchases, getPurchasesByEstimate, deletePurchases, createExtraCharge } from '../server/controllers/purchasesController.js';
import { createGlobalPurchase, getAllGlobalPurchases, getGlobalPurchaseById, updateGlobalPurchase, deleteGlobalPurchase, getCalendarDates, getStatistics as getGlobalPurchasesStatistics } from '../server/controllers/globalPurchasesController.js';
import { getAllProjects, getProjectStats, getTotalProfit, getTotalIncomeWorks, getTotalIncomeMaterials, getProjectsProfitData, getMonthlyGrowthData, getProjectsChartData, getProjectById, createProject, updateProject, updateProjectStatus, deleteProject, getProjectTeam, addTeamMember, updateTeamMember, removeTeamMember, calculateProjectProgress, getDashboardSummary, getProjectFullDashboard } from '../server/controllers/projectsController.js';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, assignRoles, deactivateUser, activateUser, uploadAvatar, getAllRoles } from '../server/controllers/usersController.js';
import { getAllPermissions, getRolePermissions, updateRolePermissions, getUserPermissions, checkUIVisibility } from '../server/controllers/permissionsController.js';
import { getAllRoles as getRoles, getRoleById, createRole, updateRole, deleteRole } from '../server/controllers/rolesController.js';
import { getWorkCompletions, upsertWorkCompletion, batchUpsertWorkCompletions, deleteWorkCompletion } from '../server/controllers/workCompletionsController.js';
import { generateAct, getActsByEstimate, getActById, deleteAct, updateActStatus, getFormKS2, getFormKS3, updateActDetails, updateSignatories } from '../server/controllers/workCompletionActsController.js';
import { getAllCounterparties, getCounterpartyById, createCounterparty, updateCounterparty, deleteCounterparty } from '../server/controllers/counterpartiesController.js';
import { getContractByEstimate, getById, generateContract, updateContract, deleteContract, getContractDOCX, updateStatus, getContractsByProject } from '../server/controllers/contractsController.js';
import { updateTenant, getTenant, uploadLogo } from '../server/controllers/tenantsController.js';
import { getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate, applyTemplate } from '../server/controllers/estimateTemplatesController.js';
import { authenticateToken, optionalAuth } from '../server/middleware/auth.js';
import db from '../server/config/database.js';
import multer from 'multer';

const app = express();

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://smeta-lab.ru',
  'https://www.smeta-lab.ru',
  'https://vite-brh3woujs-ilyas-projects-8ff82073.vercel.app',
  'https://vite-1ndrsgc2s-ilyas-projects-8ff82073.vercel.app',
  /\.vercel\.app$/,
  /\.onrender\.com$/
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Увеличен лимит для загрузки изображений в base64
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Multer для загрузки файлов (в память)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены'));
    }
  }
});

// ==================== Swagger API Documentation ====================
// Для Vercel serverless используем custom HTML вместо swagger-ui-express
app.get('/api/api-docs', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smeta Pro API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.10.0/swagger-ui.css" />
    <style>
      body { margin: 0; padding: 0; }
      .topbar { display: none !important; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.10.0/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.10.0/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function() {
        window.ui = SwaggerUIBundle({
          url: '/api/api-docs.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "StandaloneLayout",
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
          tryItOutEnabled: true,
        });
      };
    </script>
</body>
</html>
  `;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// JSON схема OpenAPI (для Postman импорта)
app.get('/api/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ==================== Auth Routes ====================
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);
app.post('/api/auth/refresh', refresh);
app.get('/api/auth/me', authenticateToken, getMe);

// ==================== Email Verification Routes ====================
app.post('/api/email/send-verification', authenticateToken, sendVerificationEmail);
app.post('/api/email/verify', verifyEmail);
app.get('/api/email/verification-status', authenticateToken, getVerificationStatus);

// ==================== Password Reset Routes ====================
app.post('/api/password/forgot', forgotPassword);
app.post('/api/password/reset', resetPassword);
app.post('/api/password/validate-reset-token', validateResetToken);

// Estimates Routes
app.get('/api/projects/:projectId/estimates', authenticateToken, getEstimatesByProject);
app.post('/api/projects/:projectId/estimates', authenticateToken, createEstimate);
app.get('/api/estimates/:id', authenticateToken, getEstimateById);
app.get('/api/estimates/:id/full', optionalAuth, getEstimateFullDetails);
app.put('/api/estimates/:id', authenticateToken, updateEstimate);
app.delete('/api/estimates/:id', authenticateToken, deleteEstimate);
app.get('/api/estimates/:id/statistics', authenticateToken, getEstimateStatistics);
app.post('/api/estimates/full', optionalAuth, createEstimateWithDetails);

// Estimate Items Routes (позиции смет)
// ВАЖНО: Специфичные роуты ПЕРЕД общими!
app.post('/api/estimates/:estimateId/items/bulk-from-works', authenticateToken, bulkAddFromWorks);
app.post('/api/estimates/:estimateId/items/bulk', authenticateToken, bulkCreateItems);
app.delete('/api/estimates/:estimateId/items/all', authenticateToken, deleteAllEstimateItems);
app.put('/api/estimates/:estimateId/items/replace', authenticateToken, replaceAllEstimateItems);
app.put('/api/estimates/:estimateId/items/reorder', authenticateToken, reorderEstimateItems);
app.get('/api/estimates/:estimateId/items', authenticateToken, getEstimateItems);
app.post('/api/estimates/:estimateId/items', authenticateToken, createEstimateItem);
app.get('/api/estimates/items/:id', authenticateToken, getEstimateItemById);
app.put('/api/estimates/items/:id', authenticateToken, updateEstimateItem);
app.delete('/api/estimates/items/:id', authenticateToken, deleteEstimateItem);

// Object Parameters Routes
app.get('/api/estimates/:estimateId/parameters/statistics', authenticateToken, getParametersStatistics);
app.get('/api/estimates/:estimateId/parameters', authenticateToken, getParametersByEstimate);
app.post('/api/estimates/:estimateId/parameters', authenticateToken, saveParameters);
app.get('/api/parameters/:id', authenticateToken, getParameterById);
app.put('/api/parameters/:id', authenticateToken, updateParameter);
app.delete('/api/parameters/:id', authenticateToken, deleteParameter);

// Work Hierarchy Routes
app.get('/api/works/hierarchy/tree', optionalAuth, getHierarchyTree);
app.get('/api/works/hierarchy/autocomplete', optionalAuth, getAutocomplete);
app.get('/api/works/hierarchy/statistics', optionalAuth, getHierarchyStatistics);
app.get('/api/works/hierarchy/:id', optionalAuth, getHierarchyItemById);
app.get('/api/works/hierarchy', optionalAuth, getHierarchyByLevel);
app.post('/api/works/hierarchy', authenticateToken, createHierarchyItem);
app.put('/api/works/hierarchy/:id', authenticateToken, updateHierarchyItem);
app.delete('/api/works/hierarchy/:id', authenticateToken, deleteHierarchyItem);

// Works Routes
app.get('/api/works/stats', getWorksStats);
app.get('/api/works/categories', getWorkCategories);

// Bulk Import (inline endpoint - no separate controller to avoid serverless issues)
app.post('/api/works/bulk', authenticateToken, async (req, res) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { works, mode = 'add', isGlobal = false } = req.body;

    // Валидация данных
    if (!works || !Array.isArray(works)) {
      return res.status(400).json({
        success: false,
        message: 'Неверный формат данных. Ожидается массив работ.'
      });
    }

    if (works.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Массив работ пустой'
      });
    }

    // Валидация прав на создание глобальных справочников
    if (isGlobal && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Только суперадминистратор может создавать глобальные справочники'
      });
    }

    const results = {
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    // Режим замены: сначала удаляем существующие работы
    if (mode === 'replace') {
      try {
        const deleteQuery = isGlobal
          ? 'DELETE FROM works WHERE is_global = TRUE'
          : 'DELETE FROM works WHERE tenant_id = $1 AND is_global = FALSE';
        
        const deleteParams = isGlobal ? [] : [tenantId];
        await db.query(deleteQuery, deleteParams);
        
        console.log(`[BULK IMPORT] Удалены существующие ${isGlobal ? 'глобальные' : 'тенантные'} работы`);
      } catch (deleteError) {
        return res.status(500).json({
          success: false,
          message: 'Ошибка при удалении существующих работ',
          error: deleteError.message
        });
      }
    }

    // Импорт работ по одной (с обработкой ошибок для каждой)
    for (let i = 0; i < works.length; i++) {
      const work = works[i];
      
      try {
        // Валидация обязательных полей
        if (!work.code || !work.name) {
          results.errorCount++;
          results.errors.push({
            row: i + 1,
            code: work.code || 'N/A',
            error: 'Отсутствует код или наименование'
          });
          continue;
        }

        // Проверка уникальности кода
        const existingCheck = await db.query(
          'SELECT id FROM works WHERE code = $1',
          [work.code]
        );

        if (existingCheck.rows.length > 0 && mode === 'add') {
          results.errorCount++;
          results.errors.push({
            row: i + 1,
            code: work.code,
            error: 'Работа с таким кодом уже существует'
          });
          continue;
        }

        // Создание или обновление работы
        const query = `
          INSERT INTO works (code, name, category, unit, base_price, is_global, tenant_id, phase, section, subsection)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (code) 
          DO UPDATE SET 
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            unit = EXCLUDED.unit,
            base_price = EXCLUDED.base_price,
            phase = EXCLUDED.phase,
            section = EXCLUDED.section,
            subsection = EXCLUDED.subsection,
            updated_at = NOW()
          RETURNING *
        `;

        const params = [
          work.code,
          work.name,
          work.category || null,
          work.unit || 'шт.',
          work.basePrice || work.base_price || 0,
          isGlobal,
          isGlobal ? null : tenantId,
          work.phase || null,
          work.section || null,
          work.subsection || null
        ];

        await db.query(query, params);
        results.successCount++;

      } catch (error) {
        results.errorCount++;
        results.errors.push({
          row: i + 1,
          code: work.code,
          error: error.message
        });
        console.error(`[BULK IMPORT] Ошибка для работы ${work.code}:`, error);
      }
    }

    // Инвалидация кеша после успешного импорта
    if (results.successCount > 0) {
      try {
        const { invalidateWorksCache } = await import('../server/cache/referencesCache.js');
        await invalidateWorksCache();
        console.log('[BULK IMPORT] Кеш работ инвалидирован');
      } catch (cacheError) {
        console.error('[BULK IMPORT] Ошибка инвалидации кеша:', cacheError);
      }
    }

    // Ответ
    const responseMessage = results.errorCount > 0
      ? `Импортировано: ${results.successCount}, Ошибок: ${results.errorCount}`
      : `Успешно импортировано ${results.successCount} работ`;

    res.status(results.errorCount > 0 ? 207 : 200).json({
      success: results.successCount > 0,
      message: responseMessage,
      data: results
    });

  } catch (error) {
    console.error('[BULK IMPORT] Критическая ошибка:', error);
    res.status(500).json({
      success: false,
      message: 'Критическая ошибка при импорте',
      error: error.message
    });
  }
});

app.get('/api/works', optionalAuth, getAllWorks);
app.get('/api/works/:id', getWorkById);
app.post('/api/works', authenticateToken, createWork);
app.put('/api/works/:id', authenticateToken, updateWork);
app.delete('/api/works/:id', authenticateToken, deleteWork);

// Materials Routes
app.get('/api/materials/stats', getMaterialsStats);
app.get('/api/materials/categories', getMaterialCategories);
app.get('/api/materials/suppliers', getMaterialSuppliers);

// Bulk Import Materials (inline endpoint - no separate controller)
app.post('/api/materials/bulk', authenticateToken, async (req, res) => {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { materials, mode = 'add', isGlobal = false } = req.body;

    // Валидация данных
    if (!materials || !Array.isArray(materials)) {
      return res.status(400).json({
        success: false,
        message: 'Неверный формат данных. Ожидается массив материалов.'
      });
    }

    if (materials.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Массив материалов пустой'
      });
    }

    // Валидация прав на создание глобальных справочников
    if (isGlobal && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Только суперадминистратор может создавать глобальные справочники'
      });
    }

    const results = {
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    // Режим замены: сначала удаляем существующие материалы
    if (mode === 'replace') {
      try {
        const deleteQuery = isGlobal
          ? 'DELETE FROM materials WHERE is_global = TRUE'
          : 'DELETE FROM materials WHERE tenant_id = $1 AND is_global = FALSE';
        
        const deleteParams = isGlobal ? [] : [tenantId];
        await db.query(deleteQuery, deleteParams);
        
        console.log(`[BULK IMPORT MATERIALS] Удалены существующие ${isGlobal ? 'глобальные' : 'тенантные'} материалы`);
      } catch (deleteError) {
        return res.status(500).json({
          success: false,
          message: 'Ошибка при удалении существующих материалов',
          error: deleteError.message
        });
      }
    }

    // Импорт материалов по одному (с обработкой ошибок для каждого)
    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      
      try {
        // Валидация обязательных полей
        if (!material.sku || !material.name || !material.unit || !material.supplier || !material.category) {
          results.errorCount++;
          results.errors.push({
            row: i + 1,
            sku: material.sku || 'N/A',
            error: 'Отсутствуют обязательные поля (sku, name, unit, supplier, category)'
          });
          continue;
        }

        // Проверка уникальности SKU
        const existingCheck = await db.query(
          'SELECT id FROM materials WHERE sku = $1',
          [material.sku]
        );

        if (existingCheck.rows.length > 0 && mode === 'add') {
          results.errorCount++;
          results.errors.push({
            row: i + 1,
            sku: material.sku,
            error: 'Материал с таким SKU уже существует'
          });
          continue;
        }

        // Создание или обновление материала
        const query = `
          INSERT INTO materials (
            sku, name, category, unit, price, supplier, weight, 
            image, product_url, show_image, is_global, tenant_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (sku) 
          DO UPDATE SET 
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            unit = EXCLUDED.unit,
            price = EXCLUDED.price,
            supplier = EXCLUDED.supplier,
            weight = EXCLUDED.weight,
            image = EXCLUDED.image,
            product_url = EXCLUDED.product_url,
            show_image = EXCLUDED.show_image,
            updated_at = NOW()
          RETURNING *
        `;

        const params = [
          material.sku,
          material.name,
          material.category,
          material.unit || 'шт',
          material.price || 0,
          material.supplier,
          material.weight || 0,
          material.image || null,
          material.productUrl || null,
          material.showImage !== undefined ? material.showImage : false,
          isGlobal,
          isGlobal ? null : tenantId
        ];

        await db.query(query, params);
        results.successCount++;

      } catch (error) {
        results.errorCount++;
        results.errors.push({
          row: i + 1,
          sku: material.sku,
          error: error.message
        });
        console.error(`[BULK IMPORT MATERIALS] Ошибка для материала ${material.sku}:`, error);
      }
    }

    // Инвалидация кеша после успешного импорта
    if (results.successCount > 0) {
      try {
        const { invalidateMaterialsCache } = await import('../server/cache/referencesCache.js');
        await invalidateMaterialsCache();
        console.log('[BULK IMPORT MATERIALS] Кеш материалов инвалидирован');
      } catch (cacheError) {
        console.error('[BULK IMPORT MATERIALS] Ошибка инвалидации кеша:', cacheError);
      }
    }

    // Ответ
    const responseMessage = results.errorCount > 0
      ? `Импортировано: ${results.successCount}, Ошибок: ${results.errorCount}`
      : `Успешно импортировано ${results.successCount} материалов`;

    res.status(results.errorCount > 0 ? 207 : 200).json({
      success: results.successCount > 0,
      message: responseMessage,
      data: results
    });

  } catch (error) {
    console.error('[BULK IMPORT MATERIALS] Критическая ошибка:', error);
    res.status(500).json({
      success: false,
      message: 'Критическая ошибка при импорте',
      error: error.message
    });
  }
});

app.get('/api/materials', optionalAuth, getAllMaterials);
app.get('/api/materials/:id', getMaterialById);
app.post('/api/materials', authenticateToken, createMaterial);
app.put('/api/materials/:id', authenticateToken, updateMaterial);
app.delete('/api/materials/:id', authenticateToken, deleteMaterial);

// Work-Materials Routes (связи работ и материалов)
app.post('/api/work-materials/batch', optionalAuth, getMaterialsForMultipleWorks); // ⚡ Batch endpoint
app.get('/api/work-materials/by-work/:workId', optionalAuth, getMaterialsByWork);
app.get('/api/work-materials/by-material/:materialId', optionalAuth, getWorksByMaterial);
app.get('/api/work-materials', optionalAuth, getAllWorkMaterials);
app.post('/api/work-materials', authenticateToken, createWorkMaterial);
app.put('/api/work-materials/:id', authenticateToken, updateWorkMaterial);
app.delete('/api/work-materials/:id', authenticateToken, deleteWorkMaterial);

// Schedules Routes (графики производства работ)
app.post('/api/schedules/generate', authenticateToken, generateSchedule);
app.get('/api/schedules/estimate/:estimateId', authenticateToken, getScheduleByEstimate);
app.delete('/api/schedules/estimate/:estimateId', authenticateToken, deleteSchedule);

// Purchases Routes (закупки материалов)
app.post('/api/purchases/generate', authenticateToken, generatePurchases);
app.post('/api/purchases/extra-charge', authenticateToken, createExtraCharge);
app.get('/api/purchases/estimate/:estimateId', authenticateToken, getPurchasesByEstimate);
app.delete('/api/purchases/estimate/:estimateId', authenticateToken, deletePurchases);

// Global Purchases Routes (фактические закупки по всем проектам)
app.get('/api/global-purchases/calendar', authenticateToken, getCalendarDates);
app.get('/api/global-purchases/statistics', authenticateToken, getGlobalPurchasesStatistics);
app.post('/api/global-purchases', authenticateToken, createGlobalPurchase);
app.get('/api/global-purchases', authenticateToken, getAllGlobalPurchases);
app.get('/api/global-purchases/:id', authenticateToken, getGlobalPurchaseById);
app.put('/api/global-purchases/:id', authenticateToken, updateGlobalPurchase);
app.delete('/api/global-purchases/:id', authenticateToken, deleteGlobalPurchase);

// Projects Routes
app.get('/api/projects/stats', authenticateToken, getProjectStats);
app.get('/api/projects/dashboard-summary', authenticateToken, getDashboardSummary);
app.get('/api/projects/total-profit', authenticateToken, getTotalProfit);
app.get('/api/projects/total-income-works', authenticateToken, getTotalIncomeWorks);
app.get('/api/projects/total-income-materials', authenticateToken, getTotalIncomeMaterials);
app.get('/api/projects/profit-data', authenticateToken, getProjectsProfitData);
app.get('/api/projects/monthly-growth-data', authenticateToken, getMonthlyGrowthData);
app.get('/api/projects/chart-data', authenticateToken, getProjectsChartData);
app.get('/api/projects/:id/team', authenticateToken, getProjectTeam);
app.post('/api/projects/:id/team', authenticateToken, addTeamMember);
app.put('/api/projects/:id/team/:memberId', authenticateToken, updateTeamMember);
app.delete('/api/projects/:id/team/:memberId', authenticateToken, removeTeamMember);
app.post('/api/projects/:id/calculate-progress', authenticateToken, calculateProjectProgress);
app.get('/api/projects/:id/full-dashboard', authenticateToken, getProjectFullDashboard);
app.get('/api/projects/:id', optionalAuth, getProjectById);
app.get('/api/projects', optionalAuth, getAllProjects);
app.post('/api/projects', authenticateToken, createProject);
app.patch('/api/projects/:id/status', authenticateToken, updateProjectStatus);
app.put('/api/projects/:id', authenticateToken, updateProject);
app.delete('/api/projects/:id', authenticateToken, deleteProject);

// Users Routes (Admin only)
app.get('/api/users', authenticateToken, getAllUsers);
app.get('/api/users/:id', authenticateToken, getUserById);
app.post('/api/users', authenticateToken, createUser);
app.put('/api/users/:id', authenticateToken, updateUser);
app.delete('/api/users/:id', authenticateToken, deleteUser);
app.post('/api/users/:id/roles', authenticateToken, assignRoles);
app.post('/api/users/:id/avatar', authenticateToken, upload.single('avatar'), uploadAvatar);
app.patch('/api/users/:id/deactivate', authenticateToken, deactivateUser);
app.patch('/api/users/:id/activate', authenticateToken, activateUser);

// Roles Routes (from usersController - for user management)
app.get('/api/users/roles', authenticateToken, getAllRoles);

// Roles CRUD Routes (from rolesController - for RBAC management)
app.get('/api/roles', authenticateToken, getRoles);
app.get('/api/roles/:id', authenticateToken, getRoleById);
app.post('/api/roles', authenticateToken, createRole);
app.put('/api/roles/:id', authenticateToken, updateRole);
app.delete('/api/roles/:id', authenticateToken, deleteRole);

// Permissions Routes (RBAC system)
app.get('/api/permissions', authenticateToken, getAllPermissions);
app.get('/api/permissions/roles/:roleId', authenticateToken, getRolePermissions);
app.put('/api/permissions/roles/:roleId', authenticateToken, updateRolePermissions);
app.get('/api/permissions/users/:userId', authenticateToken, getUserPermissions);
app.get('/api/permissions/check-visibility', authenticateToken, checkUIVisibility);

// Work Completions Routes
app.get('/api/estimates/:estimateId/work-completions', authenticateToken, getWorkCompletions);
app.post('/api/estimates/:estimateId/work-completions', authenticateToken, upsertWorkCompletion);
app.post('/api/estimates/:estimateId/work-completions/batch', authenticateToken, batchUpsertWorkCompletions);
app.delete('/api/estimates/:estimateId/work-completions/:estimateItemId', authenticateToken, deleteWorkCompletion);

// Work Completion Acts Routes
app.post('/api/work-completion-acts/generate', authenticateToken, generateAct);
app.get('/api/work-completion-acts/estimate/:estimateId', authenticateToken, getActsByEstimate);
// КС-2 и КС-3 routes (должны быть ВЫШЕ общего /:actId)
app.get('/api/work-completion-acts/:actId/ks2', authenticateToken, getFormKS2);
app.get('/api/work-completion-acts/:actId/ks3', authenticateToken, getFormKS3);
app.patch('/api/work-completion-acts/:actId/details', authenticateToken, updateActDetails);
app.post('/api/work-completion-acts/:actId/signatories', authenticateToken, updateSignatories);
app.patch('/api/work-completion-acts/:actId/status', authenticateToken, updateActStatus);
// Общие routes
app.get('/api/work-completion-acts/:actId', authenticateToken, getActById);
app.delete('/api/work-completion-acts/:actId', authenticateToken, deleteAct);

// Counterparties Routes
app.get('/api/counterparties', authenticateToken, getAllCounterparties);
app.get('/api/counterparties/:id', authenticateToken, getCounterpartyById);
app.post('/api/counterparties', authenticateToken, createCounterparty);
app.put('/api/counterparties/:id', authenticateToken, updateCounterparty);
app.delete('/api/counterparties/:id', authenticateToken, deleteCounterparty);

// Contracts Routes
app.get('/api/contracts/estimate/:estimateId', authenticateToken, getContractByEstimate);
app.get('/api/contracts/project/:projectId', authenticateToken, getContractsByProject);
app.post('/api/contracts/generate', authenticateToken, generateContract);
app.get('/api/contracts/:id', authenticateToken, getById);
app.put('/api/contracts/:id', authenticateToken, updateContract);
app.delete('/api/contracts/:id', authenticateToken, deleteContract);
app.get('/api/contracts/:id/docx', authenticateToken, getContractDOCX);
app.patch('/api/contracts/:id/status', authenticateToken, updateStatus);

// Tenants Routes
app.get('/api/tenants/:id', authenticateToken, getTenant);
app.put('/api/tenants/:id', authenticateToken, updateTenant);
app.post('/api/tenants/:id/logo', authenticateToken, upload.single('logo'), uploadLogo);

// Estimate Templates Routes
app.get('/api/estimate-templates', authenticateToken, getTemplates);
app.get('/api/estimate-templates/:id', authenticateToken, getTemplateById);
app.post('/api/estimate-templates', authenticateToken, createTemplate);
app.put('/api/estimate-templates/:id', authenticateToken, updateTemplate);
app.delete('/api/estimate-templates/:id', authenticateToken, deleteTemplate);
app.post('/api/estimate-templates/:id/apply', authenticateToken, applyTemplate);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running on Vercel',
    timestamp: new Date().toISOString(),
    environment: 'vercel',
    hasDatabase: !!process.env.DATABASE_URL
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

export default app;
