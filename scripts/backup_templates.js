import db from '../server/config/database.js';
import fs from 'fs';
import path from 'path';

async function backupTemplates() {
    try {
        console.log('🚀 Starting templates backup...');

        const backupDir = path.join(process.cwd(), 'exports', 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `templates_backup_${timestamp}.json`);

        // 1. Get all templates
        const templatesRes = await db.query('SELECT * FROM estimate_templates');
        const templates = templatesRes.rows;
        console.log(`Found ${templates.length} templates.`);

        const fullBackup = [];

        for (const template of templates) {
            console.log(`Backing up template: ${template.name} (${template.id})`);

            // 2. Get template works
            const worksRes = await db.query('SELECT * FROM estimate_template_works WHERE template_id = $1', [template.id]);

            // 3. Get template materials
            const materialsRes = await db.query(`
                SELECT etm.*, m.sku as original_material_sku, m.name as original_material_name 
                FROM estimate_template_materials etm
                LEFT JOIN materials m ON etm.material_id = m.id
                WHERE etm.template_id = $1
            `, [template.id]);

            fullBackup.push({
                template,
                works: worksRes.rows,
                materials: materialsRes.rows
            });
        }

        fs.writeFileSync(backupFile, JSON.stringify(fullBackup, null, 2));
        console.log(`✅ Backup successfully saved to: ${backupFile}`);

    } catch (error) {
        console.error('❌ Backup failed:', error.message);
    } finally {
        await db.pool.end();
    }
}

backupTemplates();
