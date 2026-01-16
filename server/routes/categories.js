import express from 'express';
import categoriesController from '../controllers/categoriesController.js';
import { optionalAuth } from '../middleware/auth.js';
// import { protect } from '../middleware/auth.js'; // Если нужна авторизация

const router = express.Router();

// Публичный доступ (для справочников) или защищенный?
// Материалы могут смотреть все (глобальные), а свои только авторизованные.
// Repository уже фильтрует по tenantId из опций.
// Оставим middleware проверки токена опциональным на уровне app, 
// но лучше явно достать юзера если он есть.
// В index.js уже есть cookieParser, но авторизация обычно в роутах.
// Предположим, что справочник доступен всем (как и материалы), но тенанты увидят свои.

router.get('/', optionalAuth, categoriesController.getAllCategories);

export default router;
