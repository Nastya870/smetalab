import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import { swaggerUIConfig } from './config/swagger-ui-config.js';

// Получаем путь к текущему файлу и директории
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем .env ТОЛЬКО в development (на production используются Render env vars)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: join(__dirname, '..', '.env') });
}
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/email.js';
import passwordRoutes from './routes/password.js';
import estimateRoutes from './routes/estimates.js';
import worksRoutes from './routes/works.js';
import materialsRoutes from './routes/materials.js';
import projectsRoutes from './routes/projects.js';
import workMaterialsRoutes from './routes/workMaterials.js';
import schedulesRoutes from './routes/schedules.js';
import purchasesRoutes from './routes/purchases.js';
import workCompletionsRoutes from './routes/workCompletions.js';
import workCompletionActsRoutes from './routes/workCompletionActs.js';
import counterpartiesRoutes from './routes/counterparties.js';
import objectParametersRoutes from './routes/objectParameters.js';
import usersRoutes from './routes/users.js';
import rolesRoutes from './routes/roles.js';
import globalPurchasesRoutes from './routes/globalPurchases.js';
import contractsRoutes from './routes/contracts.js';
import tenantsRoutes from './routes/tenants.js';
import estimateTemplatesRoutes from './routes/estimateTemplates.js';
import permissionsRoutes from './routes/permissions.js';
import searchRoutes from './routes/search.js'; // 🧠 Semantic Search
import { apiLimiter, heavyOperationsLimiter } from './middleware/rateLimiter.js';
import { sanitizeErrorMessage } from './utils/sanitize.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4173',
  /\.vercel\.app$/,
  /\.onrender\.com$/,
  'https://smeta-lab.ru',
  'https://www.smeta-lab.ru'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    })) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 204
}));
app.use(express.json({ limit: '10mb' })); // Увеличен лимит для загрузки изображений в base64
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// ==================== Swagger API Documentation ====================
// Доступ: /api-docs для интерактивной документации
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Smeta Pro API Documentation v1.9.0',
  customCss: swaggerUIConfig.customCss,
  swaggerOptions: {
    ...swaggerUIConfig,
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    docExpansion: 'list',
    deepLinking: true,
    displayOperationId: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha'
  },
}));

// JSON схема OpenAPI (для Postman импорта)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check (должен быть ДО всех роутов с авторизацией)
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// ==================== Rate Limiting ====================
// Общий лимит: 100 запросов в минуту на все API endpoints
app.use('/api', apiLimiter);

// ==================== API Routes ====================
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api', estimateRoutes); // Changed to /api for flexible routing (projects/:id/estimates and estimates/:id)
app.use('/api/works', worksRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/work-materials', workMaterialsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api', workCompletionsRoutes); // /estimates/:estimateId/work-completions
app.use('/api/work-completion-acts', workCompletionActsRoutes);
app.use('/api/counterparties', counterpartiesRoutes);
app.use('/api', objectParametersRoutes); // /estimates/:estimateId/parameters
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/global-purchases', globalPurchasesRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/estimate-templates', estimateTemplatesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/search', searchRoutes); // 🧠 Universal Semantic Search

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// ==================== Unified Error Handler ====================
// MUST be last middleware (after all routes and 404)
app.use(errorHandler);

// Start server (only in development, not in Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Express API server running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`�📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
    console.log(`📋 Works endpoints: http://localhost:${PORT}/api/works`);
    console.log(`🔧 Materials endpoints: http://localhost:${PORT}/api/materials`);
    console.log(`🔗 Work-Materials endpoints: http://localhost:${PORT}/api/work-materials`);
    console.log(`🏗️  Projects endpoints: http://localhost:${PORT}/api/projects\n`);
  });
}

export default app;
