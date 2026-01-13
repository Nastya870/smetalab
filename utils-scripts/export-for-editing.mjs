import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stringify } from 'csv-stringify/sync';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function exportForEditing() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    const exportDir = path.join(__dirname, '../export-for-edit');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    console.log('📦 Экспорт работ для редактирования...');
    // Выгружаем работы с восстановленной текстовой иерархией
    const worksQuery = `
      SELECT 
        name, 
        code, 
        phase, 
        section, 
        subsection, 
        unit, 
        base_price as price
      FROM works 
      ORDER BY id ASC
    `;
    const worksResult = await client.query(worksQuery);
    const worksCsv = stringify(worksResult.rows, { header: true });
    fs.writeFileSync(path.join(exportDir, 'full_works_export.csv'), worksCsv);

    console.log('📦 Экспорт всех материалов для редактирования...');
    const materialsQuery = `
      SELECT 
        name, 
        sku, 
        category, 
        unit, 
        price, 
        supplier
      FROM materials 
      ORDER BY id ASC
    `;
    const materialsResult = await client.query(materialsQuery);
    const materialsCsv = stringify(materialsResult.rows, { header: true });
    fs.writeFileSync(path.join(exportDir, 'full_materials_export.csv'), materialsCsv);

    console.log('\n✅ Файлы готовы в папке export-for-edit/');

  } catch (err) {
    console.error('❌ Ошибка:', err);
  } finally {
    await client.end();
  }
}

exportForEditing();
