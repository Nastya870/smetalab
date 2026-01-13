#!/usr/bin/env node
/**
 * Скрипт для применения миграции 059: рефакторинг работ в древовидную структуру (categories)
 * 
 * Запуск: node utils-scripts/apply-migration-059.mjs
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройки подключения к базе данных из .env
// Note: We should ideally load dotenv, but copying the string logic from other scripts works for now if ENV not set
// Check package.json, other scripts rely on dotenv usually.
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_z9nkcaAxB6ju@ep-polished-forest-agj7s875-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function applyMigration() {
    const client = new Client({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔌 Подключение к базе данных...');
        await client.connect();
        console.log('✅ Подключение установлено');

        // Читаем файл миграции
        const migrationPath = path.join(__dirname, '../database/migrations/059_refactor_works_tree.sql');
        console.log(`📖 Чтение файла миграции: ${migrationPath}`);

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 Применение миграции 059...');
        await client.query(migrationSQL);
        console.log('✅ Миграция 059 успешно применена!');

        // Проверяем созданные таблицы
        console.log('\n🔍 Проверка...');

        // Check categories
        const countRes = await client.query('SELECT COUNT(*) FROM categories');
        console.log(`   - Категорий создано: ${countRes.rows[0].count}`);

        // Check works linked
        const worksRes = await client.query('SELECT COUNT(*) FROM works WHERE category_id IS NOT NULL');
        console.log(`   - Работ привязано к категориям: ${worksRes.rows[0].count}`);

        const worksTotal = await client.query('SELECT COUNT(*) FROM works');
        console.log(`   - Всего работ: ${worksTotal.rows[0].count}`);

    } catch (error) {
        console.error('❌ Ошибка при применении миграции:', error.message);
        console.error('Детали:', error);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n🔌 Соединение с базой данных закрыто');
    }
}

// Запуск миграции
applyMigration();
