import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { StatusCodes } from 'http-status-codes';
import * as worksRepository from '../repositories/worksRepository.js';

/**
 * Экспорт работ в CSV
 * GET /api/works/export
 */
export async function exportToCSV(req, res) {
  try {
    const { tenantId } = req.user;
    const { isGlobal } = req.query;

    // Получаем работы
    const params = {};
    if (isGlobal === 'true') params.isGlobal = 'true';
    if (isGlobal === 'false') params.isGlobal = 'false';

    const works = await worksRepository.findAll(params, tenantId);

    // Формируем CSV
    const csvHeader = 'Код,Наименование,Категория,Ед. изм.,Базовая цена,Фаза,Раздел,Подраздел\n';
    
    const csvRows = works.map(work => {
      return [
        escapeCsvField(work.code),
        escapeCsvField(work.name),
        escapeCsvField(work.category),
        escapeCsvField(work.unit),
        work.basePrice || 0,
        escapeCsvField(work.phase || ''),
        escapeCsvField(work.section || ''),
        escapeCsvField(work.subsection || '')
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    // Отправляем файл
    const filename = isGlobal === 'true' 
      ? 'works_global_template.csv' 
      : `works_tenant_${tenantId}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));
    
    // Добавляем BOM для корректного отображения кириллицы в Excel
    res.write('\ufeff');
    res.write(csv);
    res.end();

  } catch (error) {
    console.error('Export works error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Ошибка при экспорте работ',
      error: error.message
    });
  }
}

/**
 * Экспорт шаблона CSV (пустой файл с заголовками)
 * GET /api/works/export/template
 */
export async function exportTemplate(req, res) {
  try {
    const csvHeader = 'Код,Наименование,Категория,Ед. изм.,Базовая цена,Фаза,Раздел,Подраздел\n';
    
    // Примеры строк для шаблона
    const examples = [
      '01-001,Разработка грунта экскаватором,Земляные работы,м³,450,Подготовительные работы,Земляные работы,Разработка грунта',
      '02-001,Устройство бетонной подготовки,Бетонные работы,м³,3200,Основные строительные работы,Бетонные работы,Бетонная подготовка',
      '03-001,Кладка стен из кирпича,Кирпичная кладка,м³,4500,Основные строительные работы,Каменные работы,Кладка стен'
    ].join('\n');

    const csv = csvHeader + examples;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="works_import_template.csv"');
    res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));
    
    res.write('\ufeff'); // BOM для Excel
    res.write(csv);
    res.end();

  } catch (error) {
    console.error('Export template error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Ошибка при создании шаблона',
      error: error.message
    });
  }
}

/**
 * Импорт работ из CSV
 * POST /api/works/import
 */
export async function importFromCSV(req, res) {
  try {
    const { tenantId, isSuperAdmin } = req.user;
    const { file } = req;
    const { mode = 'add', isGlobal = false } = req.body; // mode: 'add' | 'replace'

    if (!file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Файл не загружен'
      });
    }

    // Проверка прав для глобальных работ
    if (isGlobal && !isSuperAdmin) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: 'Только суперадмин может импортировать глобальные работы'
      });
    }

    // Парсим CSV
    const results = [];
    const errors = [];
    let lineNumber = 1;

    const stream = Readable.from(file.buffer.toString('utf8'));
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser({
          mapHeaders: ({ header }) => header.trim(),
          skipEmptyLines: true
        }))
        .on('data', (row) => {
          lineNumber++;
          
          // Валидация обязательных полей
          if (!row['Код'] || !row['Наименование']) {
            errors.push({
              line: lineNumber,
              message: 'Отсутствуют обязательные поля: Код, Наименование',
              data: row
            });
            return;
          }

          // Валидация базовой цены
          const basePrice = parseFloat(row['Базовая цена']) || 0;
          if (basePrice < 0) {
            errors.push({
              line: lineNumber,
              message: 'Базовая цена не может быть отрицательной',
              data: row
            });
            return;
          }

          results.push({
            code: row['Код'].trim(),
            name: row['Наименование'].trim(),
            category: row['Категория']?.trim() || '',
            unit: row['Ед. изм.']?.trim() || '',
            basePrice: basePrice,
            phase: row['Фаза']?.trim() || null,
            section: row['Раздел']?.trim() || null,
            subsection: row['Подраздел']?.trim() || null,
            isGlobal: isGlobal
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Если есть ошибки валидации, возвращаем их
    if (errors.length > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Обнаружены ошибки в CSV файле',
        errors: errors,
        successCount: 0,
        errorCount: errors.length
      });
    }

    // Если нет данных
    if (results.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'CSV файл пустой или не содержит корректных данных'
      });
    }

    // Если режим "replace" - удаляем существующие работы
    if (mode === 'replace') {
      const deleteParams = isGlobal ? { isGlobal: 'true' } : { isGlobal: 'false' };
      const existingWorks = await worksRepository.findAll(deleteParams, tenantId);
      
      for (const work of existingWorks) {
        await worksRepository.deleteWork(work.id, tenantId);
      }
    }

    // Импортируем работы
    const imported = [];
    const importErrors = [];

    for (const workData of results) {
      try {
        const created = await worksRepository.create(workData, tenantId);
        imported.push(created);
      } catch (error) {
        importErrors.push({
          work: workData,
          error: error.message
        });
      }
    }

    res.status(StatusCodes.OK).json({
      message: 'Импорт завершен',
      successCount: imported.length,
      errorCount: importErrors.length,
      errors: importErrors.length > 0 ? importErrors : undefined,
      mode: mode
    });

  } catch (error) {
    console.error('Import works error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Ошибка при импорте работ',
      error: error.message
    });
  }
}

/**
 * Экранирование полей CSV (обработка запятых, кавычек, переносов строк)
 */
function escapeCsvField(field) {
  if (field == null) return '';
  
  const str = String(field);
  
  // Если есть запятая, кавычка или перенос строки - оборачиваем в кавычки
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    // Экранируем кавычки удвоением
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}
