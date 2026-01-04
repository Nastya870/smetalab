/**
 * Универсальный endpoint для Semantic Search
 */

import express from 'express';
import { universalSemanticSearch } from '../controllers/searchController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import * as pineconeClient from '../services/pineconeClient.js';
import * as hybridSearchService from '../services/hybridSearchService.js';

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
 * @route   GET /api/search/pinecone/stats
 * @desc    Get Pinecone index statistics
 * @access  Private (requires JWT)
 */
router.get('/pinecone/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await pineconeClient.getIndexStats();
    res.json({
      success: true,
      stats: {
        totalVectors: stats.totalVectorCount,
        dimension: stats.dimension,
        namespaces: stats.namespaces
      }
    });
  } catch (error) {
    console.error('❌ [Search] Stats error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get index stats',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/search/pinecone
 * @desc    Hybrid search (keyword + semantic) or pure semantic search
 * @access  Private
 * @body    {
 *            query: string,
 *            limit: number (default: 10),
 *            type: 'material' | 'work' | 'all' (default: 'all'),
 *            scope: 'global' | 'tenant' | 'all' (default: 'all'),
 *            mode: 'hybrid' | 'semantic' (default: 'auto')
 *          }
 */
router.post('/pinecone', authenticateToken, async (req, res) => {
  try {
    const { query, limit = 10, type = 'all', scope = 'all', mode = 'auto', debug = false } = req.body;
    const { tenantId } = req.user;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    let searchResults;
    let searchMode;

    // Определяем режим поиска
    if (mode === 'auto') {
      const strategy = hybridSearchService.getSearchStrategy(query);
      searchMode = strategy.mode;
    } else {
      searchMode = mode;
    }

    console.log(`🔍 [Search] Mode: ${searchMode} | Query: "${query}" | Debug: ${debug}`);

    // Hybrid или semantic поиск
    if (searchMode === 'hybrid') {
      searchResults = await hybridSearchService.hybridSearch(query, {
        type,
        scope,
        tenantId,
        limit,
        debug
      });
    } else {
      // Pure semantic (старый путь)
      const filter = {};
      
      if (type !== 'all') {
        filter.type = type;
      }
      
      if (scope === 'tenant') {
        filter.tenantId = tenantId;
      } else if (scope === 'global') {
        filter.scope = 'global';
      }

      const pineconeResults = await pineconeClient.search(query, {
        topK: limit,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });

      searchResults = pineconeResults.map(result => ({
        id: result.id,
        score: result.score,
        type: result.metadata.type,
        dbId: result.metadata.dbId,
        text: result.metadata.text,
        source: 'semantic',
        metadata: {
          category: result.metadata.category || null,
          supplier: result.metadata.supplier || null,
          unit: result.metadata.unit || null,
          isGlobal: result.metadata.isGlobal,
          scope: result.metadata.scope
        }
      }));
    }

    // Форматируем ответ
    const results = searchResults.map(result => ({
      id: result.id,
      score: result.score,
      type: result.type,
      dbId: result.dbId,
      text: result.text,
      category: result.metadata?.category || result.category || null,
      supplier: result.metadata?.supplier || result.supplier || null,
      unit: result.metadata?.unit || result.unit || null,
      source: result.source || result.sources?.join('+') || 'semantic'
    }));

    res.json({
      success: true,
      query,
      mode: searchMode,
      count: results.length,
      results
    });

  } catch (error) {
    console.error('❌ [Search] Search failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/search/pinecone/test-keyword
 * @desc    Test keyword search directly (DEBUG endpoint)
 * @access  Private
 */
router.get('/pinecone/test-keyword', authenticateToken, async (req, res) => {
  try {
    const { query = 'цемент', type = 'material', limit = 5 } = req.query;
    const { tenantId } = req.user;
    
    console.log(`🧪 [TEST] Testing keyword search: "${query}"`);
    
    const results = await hybridSearchService.keywordSearch(query, {
      type,
      scope: 'all',
      tenantId,
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      query,
      count: results.length,
      results: results.map(r => ({
        type: r.type,
        dbId: r.dbId,
        score: r.score,
        text: r.text.substring(0, 100)
      }))
    });
  } catch (error) {
    console.error('❌ [TEST] Keyword search test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;
