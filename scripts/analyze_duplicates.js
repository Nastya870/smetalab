import fs from 'fs';

const csvFile = 'petrovich_for_import.csv';

console.log('📊 Анализ дубликатов в CSV файле...\n');

const csvContent = fs.readFileSync(csvFile, 'utf-8');
const lines = csvContent.split('\n');
const headerLine = lines[0].replace(/\uFEFF/, ''); // Remove BOM

// Автоматически определяем разделитель
let separator = ';';
if (headerLine.includes('\t')) separator = '\t';
else if (headerLine.includes(';')) separator = ';';
else if (headerLine.includes(',')) separator = ',';

console.log(`📡 Используемый разделитель: [${separator === '\t' ? 'TAB' : separator}]`);

const headers = headerLine.split(separator).map(h => h.trim());

console.log('📋 Обнаружены столбцы:', headers.join(', '));
console.log('');

const rows = lines.slice(1).filter(line => line.trim()).map((line, index) => {
    const values = line.split(separator);
    const row = {};
    headers.forEach((header, i) => {
        row[header] = values[i] ? values[i].trim() : '';
    });
    row._lineNumber = index + 2; // +2 for header and 1-indexed
    return row;
});

console.log(`📄 Всего строк в файле: ${rows.length}`);

// Группируем по артикулу
const skuGroups = {};
rows.forEach((row) => {
    const sku = row['Артикул'] || '';
    if (!sku) return;

    if (!skuGroups[sku]) {
        skuGroups[sku] = [];
    }
    skuGroups[sku].push(row);
});

// Находим дубликаты
const duplicates = Object.entries(skuGroups).filter(([sku, items]) => items.length > 1);
const uniqueSkus = Object.keys(skuGroups).length;

console.log(`\n🔑 Уникальных артикулов: ${uniqueSkus}`);
console.log(`⚠️  Артикулов с дубликатами: ${duplicates.length}`);
console.log(`📉 Потерянных записей при импорте: ${rows.length - uniqueSkus}`);

let identicalDuplicates = 0;
let differentDuplicates = 0;

if (duplicates.length > 0) {
    console.log('\n📋 Примеры дубликатов (первые 10):\n');

    duplicates.slice(0, 10).forEach(([sku, items]) => {
        // Проверяем, идентичны ли записи
        const first = items[0];

        const areIdentical = items.every(item =>
            item['Название'] === first['Название'] &&
            item['Цена'] === first['Цена'] &&
            item['Подкатегория'] === first['Подкатегория']
        );

        if (areIdentical) {
            identicalDuplicates++;
        } else {
            differentDuplicates++;
        }

        console.log(`${areIdentical ? '🟢' : '🔴'} SKU: ${sku} (${items.length} записей)`);
        items.forEach((item, idx) => {
            console.log(`   ${idx + 1}. [Строка ${item._lineNumber}] ${item['Название']} | ${item['Цена']} ₽ | ${item['Подкатегория']}`);
        });
        console.log('');
    });

    // Подсчитываем общую статистику для всех дубликатов
    duplicates.forEach(([sku, items]) => {
        const first = items[0];
        const areIdentical = items.every(item =>
            item['Название'] === first['Название'] &&
            item['Цена'] === first['Цена'] &&
            item['Подкатегория'] === first['Подкатегория']
        );

        if (areIdentical) {
            identicalDuplicates++;
        } else {
            differentDuplicates++;
        }
    });
}

console.log('\n═══════════════════════════════════════════════');
console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
console.log('═══════════════════════════════════════════════');
console.log(`Всего строк в CSV:           ${rows.length}`);
console.log(`Уникальных артикулов:        ${uniqueSkus}`);
console.log(`Потерянных записей:          ${rows.length - uniqueSkus}`);
console.log('');
console.log(`🟢 Идентичных дубликатов:    ${identicalDuplicates} артикулов`);
console.log(`   (можно безопасно удалить)`);
console.log(`🔴 Разных товаров с одним SKU: ${differentDuplicates} артикулов`);
console.log(`   (требуют ручной проверки)`);
console.log('═══════════════════════════════════════════════');

if (differentDuplicates > 0) {
    console.log('\n⚠️  ВНИМАНИЕ: Найдены разные товары с одинаковыми артикулами!');
    console.log('   Это может быть проблемой парсера или данных поставщика.');
    console.log('   Рекомендуется проверить эти записи вручную.');
}
