/**
 * Универсальный endpoint для Semantic Search
 */

import express from 'express';
import { universalSemanticSearch } from '../controllers/searchController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import * as pineconeClient from '../services/pineconeClient.js';

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

/**
 * @route   POST /api/search/pinecone
 * @desc    Pinecone semantic search (materials & works)
 * @access  Private
 */
router.post('/pinecone', authenticateToken, async (req, res) => {
  try {
    const { query, limit = 10, type = 'all', scope = 'all' } = req.body;
    const { tenantId } = req.user;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    // Build filter
    const filter = {};
    
    if (type !== 'all') {
      filter.type = type;
    }
    
    if (scope === 'tenant') {
      filter.tenantId = tenantId;
    } else if (scope === 'global') {
      filter.scope = 'global';
    }

    // Search
    const searchResults = await pineconeClient.search(query, {
      topK: limit,
      filter: Object.keys(filter).length > 0 ? filter : undefined
    });

    // Format results
    const results = searchResults.map(result => ({
      id: result.id,
      score: result.score,
      type: result.metadata.type,
      dbId: result.metadata.dbId,
      text: result.metadata.text,
      category: result.metadata.category || null,
      supplier: result.metadata.supplier || null,
      unit: result.metadata.unit || null,
      isGlobal: result.metadata.isGlobal,
      scope: result.metadata.scope
    }));

    res.json({
      success: true,
      query,
      count: results.length,
      results
    });

  } catch (error) {
    console.error('❌ [Search] Pinecone search failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
});

export default router;
