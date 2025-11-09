import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем переменные окружения
dotenv.config({ path: join(__dirname, '../../.env') });

// Демо-данные материалов
const materials = [
  {
    sku: 'MAT-001',
    name: 'Цемент М500',
    image: 'https://via.placeholder.com/100x100?text=Cement',
    unit: 'т',
    price: 7500.00,
    supplier: 'ООО "СтройМатериалы+"',
    weight: 1000,
    category: 'Цемент и бетон',
    product_url: 'https://example.com/cement-m500',
    show_image: true
  },
  {
    sku: 'MAT-002',
    name: 'Бетон М300',
    image: 'https://via.placeholder.com/100x100?text=Concrete',
    unit: 'м³',
    price: 4200.00,
    supplier: 'ЗАО "БетонСервис"',
    weight: 2400,
    category: 'Цемент и бетон',
    product_url: 'https://example.com/concrete-m300',
    show_image: true
  },
  {
    sku: 'MAT-003',
    name: 'Кирпич керамический',
    image: 'https://via.placeholder.com/100x100?text=Brick',
    unit: 'шт',
    price: 18.50,
    supplier: 'ПАО "Керамика"',
    weight: 3.5,
    category: 'Кирпич и блоки',
    product_url: 'https://example.com/brick',
    show_image: true
  },
  {
    sku: 'MAT-004',
    name: 'Блок газобетонный D500',
    image: 'https://via.placeholder.com/100x100?text=Block',
    unit: 'м³',
    price: 3800.00,
    supplier: 'ООО "ГазоблокПром"',
    weight: 500,
    category: 'Кирпич и блоки',
    product_url: 'https://example.com/gas-block',
    show_image: true
  },
  {
    sku: 'MAT-005',
    name: 'Арматура А500С d12',
    image: '',
    unit: 'т',
    price: 52000.00,
    supplier: 'ТД "МеталлПрофиль"',
    weight: 1000,
    category: 'Металлопрокат',
    product_url: 'https://example.com/rebar',
    show_image: false
  },
  {
    sku: 'MAT-006',
    name: 'Доска обрезная 50x150',
    image: 'https://via.placeholder.com/100x100?text=Wood',
    unit: 'м³',
    price: 8500.00,
    supplier: 'ИП "ЛесПром"',
    weight: 550,
    category: 'Пиломатериалы',
    product_url: 'https://example.com/lumber',
    show_image: true
  },
  {
    sku: 'MAT-007',
    name: 'Плитка керамическая',
    image: 'https://via.placeholder.com/100x100?text=Tile',
    unit: 'м²',
    price: 650.00,
    supplier: 'ООО "КерамТорг"',
    weight: 18,
    category: 'Отделочные материалы',
    product_url: 'https://example.com/ceramic-tile',
    show_image: true
  },
  {
    sku: 'MAT-008',
    name: 'Гипсокартон ГКЛ',
    image: 'https://via.placeholder.com/100x100?text=Drywall',
    unit: 'шт',
    price: 320.00,
    supplier: 'ЗАО "Гипсум"',
    weight: 29,
    category: 'Отделочные материалы',
    product_url: 'https://example.com/drywall',
    show_image: true
  },
  {
    sku: 'MAT-009',
    name: 'Металлочерепица',
    image: 'https://via.placeholder.com/100x100?text=Roof',
    unit: 'м²',
    price: 450.00,
    supplier: 'ООО "КровляПро"',
    weight: 5,
    category: 'Кровельные материалы',
    product_url: 'https://example.com/metal-roof',
    show_image: true
  },
  {
    sku: 'MAT-010',
    name: 'Утеплитель Rockwool',
    image: 'https://via.placeholder.com/100x100?text=Insulation',
    unit: 'м³',
    price: 3200.00,
    supplier: 'ТД "ТеплоДом"',
    weight: 50,
    category: 'Изоляционные материалы',
    product_url: 'https://example.com/rockwool',
    show_image: true
  },
  {
    sku: 'MAT-011',
    name: 'Кабель ВВГ 3х2,5',
    image: '',
    unit: 'м',
    price: 85.00,
    supplier: 'ООО "ЭлектроСнаб"',
    weight: 0.2,
    category: 'Электрика',
    product_url: 'https://example.com/cable',
    show_image: false
  },
  {
    sku: 'MAT-012',
    name: 'Труба полипропиленовая d32',
    image: 'https://via.placeholder.com/100x100?text=Pipe',
    unit: 'м',
    price: 120.00,
    supplier: 'ЗАО "СантехМонтаж"',
    weight: 0.35,
    category: 'Сантехника',
    product_url: 'https://example.com/pipe',
    show_image: true
  }
];

async function seedMaterials() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Подключено к базе данных NEON');

    // Получаем реальный tenant_id и user_id
    const userQuery = await client.query(`
      SELECT u.id as user_id, ut.tenant_id
      FROM users u
      JOIN user_tenants ut ON u.id = ut.user_id
      WHERE u.email = 'kiy026@yandex.ru'
      LIMIT 1
    `);

    if (userQuery.rows.length === 0) {
      throw new Error('Пользователь kiy026@yandex.ru не найден');
    }

    const { user_id, tenant_id } = userQuery.rows[0];
    console.log(`👤 Используем пользователя: ${user_id}`);
    console.log(`🏢 Используем компанию: ${tenant_id}`);

    // Очищаем таблицу materials перед вставкой (опционально)
    await client.query('DELETE FROM materials WHERE tenant_id = $1', [tenant_id]);
    console.log('🗑️  Таблица materials очищена');

    // Сбрасываем последовательность ID
    await client.query('ALTER SEQUENCE materials_id_seq RESTART WITH 1');

    // Вставляем материалы
    for (const material of materials) {
      const query = `
        INSERT INTO materials (
          sku, name, image, unit, price, supplier, weight, 
          category, product_url, show_image, tenant_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, sku, name, category, price
      `;

      const values = [
        material.sku,
        material.name,
        material.image,
        material.unit,
        material.price,
        material.supplier,
        material.weight,
        material.category,
        material.product_url,
        material.show_image,
        tenant_id,
        user_id
      ];

      const result = await client.query(query, values);
      console.log(`✅ Добавлен: ${result.rows[0].name} (${result.rows[0].sku})`);
    }

    // Получаем статистику
    const statsQuery = `
      SELECT 
        COUNT(*) as total_materials,
        COUNT(DISTINCT category) as total_categories,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price)::numeric(10,2) as avg_price,
        SUM(CASE WHEN show_image THEN 1 ELSE 0 END) as with_images
      FROM materials
    `;

    const stats = await client.query(statsQuery);
    const s = stats.rows[0];

    console.log('\n📊 Статистика материалов:');
    console.log(`   Всего материалов: ${s.total_materials}`);
    console.log(`   Категорий: ${s.total_categories}`);
    console.log(`   С изображениями: ${s.with_images}`);
    console.log(`   Цена (мин/макс/средняя): ${s.min_price}₽ / ${s.max_price}₽ / ${s.avg_price}₽`);

    // Получаем список категорий
    const categoriesQuery = `
      SELECT category, COUNT(*) as count
      FROM materials
      GROUP BY category
      ORDER BY count DESC
    `;
    const categories = await client.query(categoriesQuery);
    
    console.log('\n📁 Категории:');
    categories.rows.forEach(cat => {
      console.log(`   - ${cat.category}: ${cat.count} материал(ов)`);
    });

    console.log('\n✅ Seed успешно выполнен!');

  } catch (error) {
    console.error('❌ Ошибка при выполнении seed:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Соединение с базой данных закрыто');
  }
}

// Запускаем seed
seedMaterials().catch(console.error);
