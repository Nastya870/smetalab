/**
 * Универсальный endpoint для Semantic Search
 */

import express from 'express';
import { universalSemanticSearch } from '../controllers/searchController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/search
 * @desc    Универсальный semantic search по всем справочникам (AI-powered)
 * @access  Public/Private (optionalAuth)
 * @body    {
 *            entity: "materials" | "works" | "counterparties" | "estimate_items",
 *            query: "поисковый запрос",
 *            threshold: 0.5,  // опционально
 *            limit: 50        // опционально
 *          }
 */
router.post('/', optionalAuth, universalSemanticSearch);

export default router;
