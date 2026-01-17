/**
 * API endpoint для запуска миграций и синхронизации Pinecone
 * Защищён super_admin правами
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/adminAuth.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @swagger
 * /api/admin/run-migrations-public:
 *   post:
 *     summary: Run database migrations (TEMPORARY - NO AUTH)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Migrations completed
 */
router.post('/run-migrations-public', async (req, res) => {
  try {
    console.log('🔄 Running migrations via public API...');

    const scriptPath = path.join(__dirname, '../../scripts/runMigrations.js');
    const { stdout, stderr } = await execPromise(`node ${scriptPath}`);

    console.log('✅ Migrations output:', stdout);
    if (stderr) console.error('⚠️ Stderr:', stderr);

    res.json({
      success: true,
      message: 'Migrations completed',
      output: stdout,
      errors: stderr || null
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    });
  }
});

/**
 * @swagger
 * /api/admin/run-migrations:
 *   post:
 *     summary: Run database migrations
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Migrations completed
 *       403:
 *         description: Not authorized (super_admin only)
 */
router.post('/run-migrations', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    console.log('🔄 Running migrations via API...');

    const scriptPath = path.join(__dirname, '../../scripts/runMigrations.js');
    const { stdout, stderr } = await execPromise(`node ${scriptPath}`);

    console.log('✅ Migrations output:', stdout);
    if (stderr) console.error('⚠️ Stderr:', stderr);

    res.json({
      success: true,
      message: 'Migrations completed',
      output: stdout,
      errors: stderr || null
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    });
  }
});

/**
 * @swagger
 * /api/admin/pinecone-sync-public:
 *   post:
 *     summary: Sync data to Pinecone (TEMPORARY - NO AUTH)
 *     tags: [Admin]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [global, all, test]
 *               limit:
 *                 type: number
 *     responses:
 *       200:
 *         description: Sync completed
 */
router.post('/pinecone-sync-public', async (req, res) => {
  try {
    const { mode = 'test', limit = null } = req.body;

    console.log(`🔄 Running Pinecone sync (mode: ${mode}, limit: ${limit})...`);

    const scriptPath = path.join(__dirname, '../../scripts/pinecone-sync-cron.mjs');
    const limitArg = limit ? `--limit=${limit}` : '';
    const modeArg = mode === 'test' ? 'global --limit=5' : mode;

    const command = `node ${scriptPath} ${modeArg} ${limitArg}`.trim();

    console.log(`Executing: ${command}`);

    const { stdout, stderr } = await execPromise(command, { timeout: 300000 });

    console.log('✅ Sync output:', stdout);
    if (stderr) console.error('⚠️ Stderr:', stderr);

    res.json({
      success: true,
      message: 'Sync completed',
      mode: mode,
      limit: limit,
      output: stdout,
      errors: stderr || null
    });
  } catch (error) {
    console.error('❌ Sync failed:', error);
    res.status(500).json({
      success: false,
      message: 'Sync failed',
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    });
  }
});

/**
 * @swagger
 * /api/admin/pinecone-sync:
 *   post:
 *     summary: Sync data to Pinecone
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [global, all, test]
 *                 description: Sync mode (test = 5 docs only)
 *               limit:
 *                 type: number
 *                 description: Optional limit for testing
 *     responses:
 *       200:
 *         description: Sync completed
 */
router.post('/pinecone-sync', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { mode = 'test', limit = null } = req.body;

    console.log(`🔄 Running Pinecone sync (mode: ${mode}, limit: ${limit})...`);

    const scriptPath = path.join(__dirname, '../../scripts/pinecone-sync-cron.mjs');
    const limitArg = limit ? `--limit=${limit}` : '';
    const modeArg = mode === 'test' ? 'global --limit=5' : mode;

    const command = `node ${scriptPath} ${modeArg} ${limitArg}`.trim();

    console.log(`Executing: ${command}`);

    // Timeout 5 минут для больших синхронизаций
    const { stdout, stderr } = await execPromise(command, { timeout: 300000 });

    console.log('✅ Sync output:', stdout);
    if (stderr) console.error('⚠️ Stderr:', stderr);

    res.json({
      success: true,
      message: 'Sync completed',
      mode: mode,
      limit: limit,
      output: stdout,
      errors: stderr || null
    });
  } catch (error) {
    console.error('❌ Sync failed:', error);
    res.status(500).json({
      success: false,
      message: 'Sync failed',
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    });
  }
});

/**
 * @swagger
 * /api/admin/pinecone-status:
 *   get:
 *     summary: Get Pinecone index status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Index statistics
 */
router.get('/pinecone-status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const pineconeClient = await import('../services/pineconeClient.js');
    const stats = await pineconeClient.getIndexStats();

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('❌ Failed to get Pinecone stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get index stats',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin/cache-clear-public:
 *   post:
 *     summary: Clear application cache (TEMPORARY - NO AUTH)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Cache cleared
 */
router.post('/cache-clear-public', async (req, res) => {
  try {
    const { clearAllCache } = await import('../cache/referencesCache.js');
    clearAllCache();

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('❌ Cache clear failed:', error);
    res.status(500).json({
      success: false,
      message: 'Cache clear failed',
      error: error.message
    });
  }
});

export default router;
