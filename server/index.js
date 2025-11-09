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

// Загружаем .env из корня проекта (vite/)
dotenv.config({ path: join(__dirname, '..', '.env') });
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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://vite-brh3woujs-ilyas-projects-8ff82073.vercel.app',
  /\.vercel\.app$/
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
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

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.path.includes('/ks2') || req.path.includes('/ks3')) {
    console.log('🔵 [SERVER] КС-2/КС-3 request detected:', req.method, req.path);
  }
  next();
});

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

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.path}`);
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

// Start server (only in development, not in Vercel)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
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
